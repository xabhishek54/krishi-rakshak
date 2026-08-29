import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_voice_status():
    response = client.get("/api/v1/voice/status")
    assert response.status_code == 200
    data = response.json()
    assert "piper_binary" in data
    assert "vosk_model_path" in data

def test_voice_speak_hindi():
    response = client.post("/api/v1/voice/speak", json={"text": "आज का कृषि सारांश।", "language": "hindi"})
    assert response.status_code == 200
    assert response.headers["content-type"] in ["audio/mp3", "audio/wav"]
    assert len(response.content) > 100

def test_voice_speak_english():
    response = client.post("/api/v1/voice/speak", json={"text": "Today farm summary.", "language": "english"})
    assert response.status_code == 200
    assert len(response.content) > 100
