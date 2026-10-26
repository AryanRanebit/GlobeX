import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:8000/api/v1/agents/market-research',
    data=b'{"product": "Organic Spices"}',
    headers={'Content-Type': 'application/json'}
)
response = urllib.request.urlopen(req).read().decode()
print(response)
