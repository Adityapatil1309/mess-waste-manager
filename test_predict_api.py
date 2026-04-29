import requests
import json

base_url = "http://localhost:8000/api"

# 1. Login to get token
login_data = {
    "email": "demo@example.com",
    "password": "password123"
}

print("Logging in...")
try:
    res = requests.post(f"{base_url}/auth/login", json=login_data)
    res.raise_for_status()
    token = res.json()["access_token"]
    print("Login successful.")
except Exception as e:
    print(f"Login failed: {e}")
    # Let's try social login mock
    social_data = {
        "provider": "google",
        "token": "mock_google_token",
        "role": "mess_manager"
    }
    res = requests.post(f"{base_url}/auth/social-login", json=social_data)
    token = res.json()["access_token"]
    print("Social login mock successful.")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 2. Test prediction endpoint
pred_data = {
    "date": "2026-04-26",
    "meal": "lunch"
}

print("Fetching prediction...")
res = requests.post(f"{base_url}/prediction/predict", json=pred_data, headers=headers)
print(f"Status Code: {res.status_code}")
try:
    print(json.dumps(res.json(), indent=2))
except Exception:
    print(res.text)
