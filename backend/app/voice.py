import json
import os
import subprocess
import tempfile
import wave
from pathlib import Path

from vosk import Model, KaldiRecognizer


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


def get_voice_status() -> dict:
    return {
        "piper_binary": bool(PIPER_BINARY),
        "piper_model_path": PIPER_MODEL_PATH,
        "piper_ready": bool(PIPER_MODEL_PATH and os.path.exists(PIPER_MODEL_PATH)),
        "vosk_model_path": VOSK_MODEL_PATH,
        "vosk_ready": bool(VOSK_MODEL_PATH and os.path.exists(VOSK_MODEL_PATH)),
    }


def _resolve_piper_model(language: str, explicit_model: str | None = None) -> str:
    if explicit_model:
        return explicit_model
    model_name = LANGUAGE_TO_MODEL.get(language.lower(), LANGUAGE_TO_MODEL["english"])
    candidates = [
        os.getenv("PIPER_MODEL_PATH"),
        str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx"),
        str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx.json"),
        str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx"),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return str(Path(PIPER_DATA_DIR) / f"{model_name}.onnx")


def synthesize_text_to_wav(text: str, language: str = "english") -> tuple[str, str]:
    """
    Synthesize text to audio file.
    Returns (file_path, media_type).
    1. Uses Piper TTS CLI if PIPER_BINARY and model exist.
    2. Falls back to gTTS (Google Text-to-Speech) for high-quality regional voice (Hindi, Marathi, Bengali, Odia, English).
    """
    if not text or not text.strip():
        raise ValueError("Text is empty")

    cleaned_text = text.strip()

    # 1. Try Piper TTS if CLI and model are configured
    model_path = _resolve_piper_model(language)
    if PIPER_BINARY and os.path.exists(model_path):
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                output_path = tmp.name

            cmd = [
                PIPER_BINARY,
                "--model", model_path,
                "--output_file", output_path,
            ]
            subprocess.run(
                cmd,
                input=cleaned_text,
                text=True,
                capture_output=True,
                check=True,
                timeout=15,
            )
            return output_path, "audio/wav"
        except Exception as e:
            print(f"[voice] Piper TTS execution warning: {e}. Falling back to gTTS.")

    # 2. High-Quality Regional Fallback via gTTS
    lang_map = {
        "english": "en",
        "hindi": "hi",
        "marathi": "mr",
        "bengali": "bn",
        "odia": "or",
    }
    target_lang = lang_map.get(language.lower(), "en")

    try:
        from gtts import gTTS
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            output_path = tmp.name

        tts = gTTS(text=cleaned_text, lang=target_lang, slow=False)
        tts.save(output_path)
        return output_path, "audio/mp3"
    except Exception as exc:
        raise RuntimeError(f"Voice synthesis failed for language '{language}': {exc}") from exc


def transcribe_wav_file(file_path: str) -> str:
    if not VOSK_MODEL_PATH or not os.path.exists(VOSK_MODEL_PATH):
        raise FileNotFoundError(
            "VOSK_MODEL_PATH is not configured or the model directory does not exist."
        )

    model = Model(model_path=VOSK_MODEL_PATH)
    wf = wave.open(file_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
        raise ValueError("Audio must be a 16-bit mono WAV file")

    rec = KaldiRecognizer(model, wf.getframerate())
    data = wf.readframes(wf.getnframes())
    rec.AcceptWaveform(data)
    result = json.loads(rec.FinalResult())
    return result.get("text", "").strip()
