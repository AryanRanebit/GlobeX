import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

class MockAgentHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/v1/agents/market-research':
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            product = body.get('product', 'Unknown Product')
            
            response_data = {
                "product": product,
                "analyzedAt": datetime.now().isoformat(),
                "summary": "Mocked analysis from Python AI Agent: " + product + " shows strong export potential in European and North American markets.",
                "recommendedCountries": [
                    {
                        "country": "Germany",
                        "countryCode": "DE",
                        "demandScore": 92,
                        "growthRate": "19%",
                        "competition": "Medium",
                        "marketSize": "$2.5B",
                        "trend": "Growing",
                        "insights": "High demand for organic variants."
                    },
                    {
                        "country": "United States",
                        "countryCode": "US",
                        "demandScore": 89,
                        "growthRate": "21%",
                        "competition": "High",
                        "marketSize": "$8.2B",
                        "trend": "Accelerating",
                        "insights": "Strong diaspora presence and health food trends."
                    }
                ]
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), MockAgentHandler)
    print("Mock Agent Server running on port 8000...")
    server.serve_forever()
