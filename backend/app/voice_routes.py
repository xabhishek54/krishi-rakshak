import os
import tempfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import Response, StreamingResponse

from app.voice import synthesize_to_bytes, transcribe_wav_file, get_voice_status

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])


@router.get("/status")
def voice_status():
    return get_voice_status()


@router.post("/speak")
def speak_text(payload: dict):
    """
    Synthesises text to audio and streams it back immediately.
    Uses an in-memory cache – cache hits return in < 1 ms.
    """
    text = payload.get("text", "")
    language = payload.get("language", "english")
    if not text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    try:
        audio_bytes, media_type = synthesize_to_bytes(text, language)
        filename = "speech.mp3" if media_type == "audio/mp3" else "speech.wav"
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f"inline; filename={filename}"},
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/listen")
async def listen_audio(file: UploadFile = File(...)):
    if not file.filename.endswith((".wav", ".WAV")):
        raise HTTPException(status_code=400, detail="Only WAV files are supported")

    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        text = transcribe_wav_file(tmp_path)
        os.unlink(tmp_path)
        return {"text": text}
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc
