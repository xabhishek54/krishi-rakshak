"""
Translation API using Argos Translate (offline, unlimited, no rate limits).

Supported offline: English → Hindi, English → Bengali
Fallback for unsupported pairs: returns original text (frontend dictionary handles Marathi/Odia).

Download language packages once on startup via _ensure_packages().
"""

import threading
from functools import lru_cache

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/translate", tags=["translate"])

# Languages where Argos has good models (en → target)
ARGOS_SUPPORTED = {"hindi": "hi", "bengali": "bn"}

_packages_loaded = False
_load_lock = threading.Lock()


def _ensure_packages():
    """Download Argos language packages on first use (runs once)."""
    global _packages_loaded
    if _packages_loaded:
        return
    with _load_lock:
        if _packages_loaded:
            return
        try:
            import argostranslate.package
            import argostranslate.translate

            argostranslate.package.update_package_index()
            available = argostranslate.package.get_available_packages()

            needed = [("en", "hi"), ("en", "bn")]
            for src, tgt in needed:
                installed = argostranslate.translate.get_installed_languages()
                installed_codes = {l.code for l in installed}
                if src in installed_codes and tgt in installed_codes:
                    # Check if the pair is actually installed
                    src_lang = next((l for l in installed if l.code == src), None)
                    if src_lang:
                        tgt_lang = src_lang.get_translation(
                            next((l for l in installed if l.code == tgt), None)
                        )
                        if tgt_lang:
                            continue  # already installed

                # Find and install package
                pkg = next(
                    (p for p in available if p.from_code == src and p.to_code == tgt),
                    None,
                )
                if pkg:
                    print(f"[translate] Downloading Argos package {src}→{tgt}…")
                    argostranslate.package.install_from_path(pkg.download())
                    print(f"[translate] Installed {src}→{tgt}")
        except Exception as e:
            print(f"[translate] Argos package setup warning: {e}")
        _packages_loaded = True


@lru_cache(maxsize=512)
def _translate_cached(text: str, target_code: str) -> str:
    """Cached Argos translation. LRU(512) means common UI strings cost 0 after first call."""
    try:
        import argostranslate.translate
        installed = argostranslate.translate.get_installed_languages()
        src_lang = next((l for l in installed if l.code == "en"), None)
        tgt_lang = next((l for l in installed if l.code == target_code), None)
        if not src_lang or not tgt_lang:
            return text
        translation = src_lang.get_translation(tgt_lang)
        if not translation:
            return text
        return translation.translate(text)
    except Exception:
        return text


@router.post("")
def translate(payload: dict):
    """
    POST /api/v1/translate
    Body: { "text": "...", "language": "hindi" | "bengali" | "marathi" | "odia" }
    Returns: { "translated": "..." }
    """
    text = payload.get("text", "").strip()
    language = payload.get("language", "english").lower()

    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # English → return as-is
    if language == "english":
        return {"translated": text}

    target_code = ARGOS_SUPPORTED.get(language)
    if not target_code:
        # Marathi / Odia — Argos has no reliable model; return original and let
        # the frontend dictionary handle known phrases.
        return {"translated": text}

    _ensure_packages()
    translated = _translate_cached(text, target_code)
    return {"translated": translated}


@router.get("/status")
def translate_status():
    try:
        import argostranslate.translate
        installed = [l.code for l in argostranslate.translate.get_installed_languages()]
    except Exception:
        installed = []
    return {
        "argos_installed_languages": installed,
        "supported_pairs": list(ARGOS_SUPPORTED.keys()),
        "cache_info": _translate_cached.cache_info()._asdict(),
    }
