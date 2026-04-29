import requests
import json

base_url = "http://localhost:8000/api"

# Login
social_data = {
    "provider": "google",
    "token": "mock_google_token",
    "role": "mess_manager"
}
res = requests.post(f"{base_url}/auth/social-login", json=social_data)
token = res.json()["access_token"]

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

meals = ["breakfast", "lunch", "dinner"]
for meal in meals:
    pred_data = {
        "date": "2026-04-26",
        "meal": meal
    }
    res = requests.post(f"{base_url}/prediction/predict", json=pred_data, headers=headers)
    print(f"Meal: {meal}, Status Code: {res.status_code}")
