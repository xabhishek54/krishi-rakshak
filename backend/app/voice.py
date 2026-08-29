"""
Voice synthesis and recognition module.

Speed optimisations applied:
  1. In-memory LRU audio cache  – identical (text, language) pairs skip
     synthesis entirely and are served straight from RAM.
  2. gTTS byte-stream in RAM – no disk I/O for the happy path; the mp3
     bytes are stored in a BytesIO buffer and returned directly.
  3. Short-circuit for empty text – avoids unnecessary processing.
  4. Piper TTS (if installed + model present) – WAV synthesis is faster than
     gTTS because it is fully local with no network round-trip.
"""

import hashlib
import io
import json
import os
import subprocess
import tempfile
import wave
from functools import lru_cache
from pathlib import Path
from typing import Tuple

PIPER_BINARY = os.getenv("PIPER_BINARY", "piper")
PIPER_MODEL_PATH = os.getenv("PIPER_MODEL_PATH")
VOSK_MODEL_PATH = os.getenv("VOSK_MODEL_PATH")
PIPER_DATA_DIR = os.getenv("PIPER_DATA_DIR", "/usr/share/piper")

LANGUAGE_TO_MODEL = {
    "english": "en_US-lessac-medium",
    "hindi": "hi_IN-hemant-medium",
    "marathi": "mr_IN-hemant-medium",
    "bengali": "bn_IN-ambika-medium",
    "odia": "or_IN-odisha-medium",
}

GTTS_LANG_MAP = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
    "bengali": "bn",
    "odia": "or",
}

# ── In-memory audio cache ────────────────────────────────────────────────────
# Keyed by (text_hash, language). Max 64 entries (~64 × avg 80 kB ≈ 5 MB RAM).
_AUDIO_CACHE: dict[str, Tuple[bytes, str]] = {}
_CACHE_ORDER: list[str] = []
_CACHE_MAX = 64


def _cache_key(text: str, language: str) -> str:
    return hashlib.md5(f"{language}:{text}".encode()).hexdigest()


def _get_cached_audio(text: str, language: str):
    key = _cache_key(text, language)
    return _AUDIO_CACHE.get(key)


def _put_cached_audio(text: str, language: str, data: bytes, media_type: str):
    key = _cache_key(text, language)
    if key not in _AUDIO_CACHE:
        if len(_CACHE_ORDER) >= _CACHE_MAX:
            evict = _CACHE_ORDER.pop(0)
            _AUDIO_CACHE.pop(evict, None)
        _CACHE_ORDER.append(key)
    _AUDIO_CACHE[key] = (data, media_type)


# ── Status ───────────────────────────────────────────────────────────────────

def get_voice_status() -> dict:
    return {
        "piper_binary": bool(PIPER_BINARY),
        "piper_model_path": PIPER_MODEL_PATH,
        "piper_ready": bool(PIPER_MODEL_PATH and os.path.exists(PIPER_MODEL_PATH)),
        "vosk_model_path": VOSK_MODEL_PATH,
        "vosk_ready": bool(VOSK_MODEL_PATH and os.path.exists(VOSK_MODEL_PATH)),
        "cache_entries": len(_AUDIO_CACHE),
    }


# ── Piper helper ─────────────────────────────────────────────────────────────

def _resolve_piper_model(language: str) -> str:
    model_name = LANGUAGE_TO_MODEL.get(language.lower(), LANGUAGE_TO_MODEL["english"])
    candidates = [
        os.getenv("PIPER_MODEL_PATH"),
        str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx")


# ── Main synthesis ────────────────────────────────────────────────────────────

def synthesize_to_bytes(text: str, language: str = "english") -> Tuple[bytes, str]:
    """
    Returns (audio_bytes, media_type).
    Checks the in-memory cache first; falls back to Piper → gTTS.
    """
    if not text or not text.strip():
        raise ValueError("Text is empty")

    cleaned = text.strip()

    # 1. Cache hit → instant return
    cached = _get_cached_audio(cleaned, language)
    if cached:
        return cached

    audio_bytes: bytes
    media_type: str

    # 2. Piper TTS (local, fast, no network)
    model_path = _resolve_piper_model(language)
    if PIPER_BINARY and os.path.exists(model_path):
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                output_path = tmp.name
            subprocess.run(
                [PIPER_BINARY, "--model", model_path, "--output_file", output_path],
                input=cleaned,
                text=True,
                capture_output=True,
                check=True,
                timeout=10,
            )
            with open(output_path, "rb") as f:
                audio_bytes = f.read()
            os.unlink(output_path)
            media_type = "audio/wav"
            _put_cached_audio(cleaned, language, audio_bytes, media_type)
            return audio_bytes, media_type
        except Exception as e:
            print(f"[voice] Piper fallback: {e}")

    # 3. gTTS (in-memory, no temp file)
    target_lang = GTTS_LANG_MAP.get(language.lower(), "en")
    try:
        from gtts import gTTS
        buf = io.BytesIO()
        try:
            tts = gTTS(text=cleaned, lang=target_lang, slow=False)
        except ValueError:
            # If language is not supported natively by gTTS (e.g. Odia 'or'), fallback to Hindi 'hi'
            tts = gTTS(text=cleaned, lang="hi", slow=False)
        tts.write_to_fp(buf)
        audio_bytes = buf.getvalue()
        media_type = "audio/mp3"
        _put_cached_audio(cleaned, language, audio_bytes, media_type)
        return audio_bytes, media_type
    except Exception as exc:
        raise RuntimeError(f"Voice synthesis failed for '{language}': {exc}") from exc


# Keep backward compat: voice_routes.py may call this
def synthesize_text_to_wav(text: str, language: str = "english") -> tuple[str, str]:
    """
    Legacy helper: writes audio to a temp file and returns (path, media_type).
    Prefer synthesize_to_bytes() for new callers.
    """
    audio_bytes, media_type = synthesize_to_bytes(text, language)
    suffix = ".mp3" if media_type == "audio/mp3" else ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        return tmp.name, media_type


# ── STT ───────────────────────────────────────────────────────────────────────

def transcribe_wav_file(file_path: str) -> str:
    if not VOSK_MODEL_PATH or not os.path.exists(VOSK_MODEL_PATH):
        raise FileNotFoundError(
            "VOSK_MODEL_PATH is not configured or the model directory does not exist."
        )
    from vosk import Model, KaldiRecognizer
    model = Model(model_path=VOSK_MODEL_PATH)
    wf = wave.open(file_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
        raise ValueError("Audio must be a 16-bit mono WAV file")
    rec = KaldiRecognizer(model, wf.getframerate())
    data = wf.readframes(wf.getnframes())
    rec.AcceptWaveform(data)
    result = json.loads(rec.FinalResult())
    return result.get("text", "").strip()
