import requests
import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth import create_access_token
access_token = create_access_token(data={"sub": "chvanraj9545@gmail.com", "role": "mess_manager"})
headers = {"Authorization": f"Bearer {access_token}"}

endpoints = [
    "/analytics/dashboard",
    "/analytics/attendance-trend?days=30",
    "/analytics/waste-trend?days=30",
    "/analytics/food-vs-waste?days=30"
]

for ep in endpoints:
    print("Testing:", ep)
    r = requests.get(f"http://localhost:8000/api{ep}", headers=headers)
    print("  ->", r.status_code)
    if r.status_code != 200:
        print("  ->", r.text)
