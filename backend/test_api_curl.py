import subprocess
import time

# Start server
server = subprocess.Popen(["uvicorn", "main:app", "--port", "8000"])
time.sleep(3)

# Test without auth (should return 401)
res = subprocess.run(["curl", "-s", "-w", "%{http_code}", "http://localhost:8000/api/prediction/predict", "-H", "Content-Type: application/json", "-d", '{"date":"2026-04-26","meal":"lunch"}'], capture_output=True, text=True)
print("Auth Test:", res.stdout)

server.terminate()
