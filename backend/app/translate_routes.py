"""
Translation API using server-side Google Translate / MyMemory with Argos fallback.
Unlimited, zero browser CORS errors, server-side caching.
"""

import json
import urllib.parse
import urllib.request
from functools import lru_cache
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/translate", tags=["translate"])

LANG_CODES = {
    "hindi": "hi",
    "marathi": "mr",
    "bengali": "bn",
    "odia": "or",
}

@lru_cache(maxsize=1024)
def _translate_server_side(text: str, target_code: str) -> str:
    """Translate text using server-side Google GTX with MyMemory fallback."""
    if not text or not text.strip():
        return text

    # 1. Primary: Server-side Google GTX (No CORS issues from backend)
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_code}&dt=t&q={urllib.parse.quote(text)}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data and isinstance(data, list) and len(data) > 0 and data[0]:
                    parts = [chunk[0] for chunk in data[0] if chunk and isinstance(chunk, list) and chunk[0]]
                    res = "".join(parts).strip()
                    if res:
                        return res
    except Exception as e:
        print(f"[translate_backend] Google GTX error for {target_code}: {e}")

    # 2. Secondary Fallback: MyMemory API server-side
    try:
        mm_url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair=en|{target_code}"
        req_mm = urllib.request.Request(mm_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_mm, timeout=4) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                res = data.get("responseData", {}).get("translatedText")
                if res and res != text:
                    return res
    except Exception as e:
        print(f"[translate_backend] MyMemory error: {e}")

    # 3. Argos Translate fallback for supported pairs (hi, bn)
    if target_code in ("hi", "bn"):
        try:
            import argostranslate.translate
            installed = argostranslate.translate.get_installed_languages()
            src_lang = next((l for l in installed if l.code == "en"), None)
            tgt_lang = next((l for l in installed if l.code == target_code), None)
            if src_lang and tgt_lang:
                trans = src_lang.get_translation(tgt_lang)
                if trans:
                    return trans.translate(text)
        except Exception:
            pass

    return text


@router.post("")
def translate(payload: dict):
    """
    POST /api/v1/translate
    Body: { "text": "...", "language": "hindi" | "marathi" | "bengali" | "odia" }
    Returns: { "translated": "..." }
    """
    text = payload.get("text", "").strip()
    language = payload.get("language", "english").lower()

    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    if language == "english":
        return {"translated": text}

    target_code = LANG_CODES.get(language)
    if not target_code:
        return {"translated": text}

    translated = _translate_server_side(text, target_code)
    return {"translated": translated}


@router.get("/status")
def translate_status():
    return {
        "supported_languages": list(LANG_CODES.keys()),
        "cache_info": _translate_server_side.cache_info()._asdict(),
    }
