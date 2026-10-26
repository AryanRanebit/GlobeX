import urllib.request
import json
import urllib.error

import os

url = "https://generativelanguage.googleapis.com/v1beta/models"
api_key = os.environ.get("GOOGLE_API_KEY", "")
headers = {
    "x-goog-api-key": api_key
}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        print("Success! Key is valid.")
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()}")
