from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)
response = client.post("/api/prediction/predict", json={"date": "2026-04-26", "meal": "lunch"})
print("Status:", response.status_code)
print("Response:", response.json())
