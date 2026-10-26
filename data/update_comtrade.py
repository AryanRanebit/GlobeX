#!/usr/bin/env python3
"""
Reproducible UN Comtrade Data Extractor for GlobeX
Source: UN Comtrade, United Nations Statistics Division (UNSD)
"""
import os
import sys
import json
import urllib.request
import urllib.parse
import argparse

API_BASE_PUBLIC = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
API_BASE_DATA = "https://comtradeapi.un.org/data/v1/get/C/A/HS"

def fetch_comtrade(period="2025", cmd_code="TOTAL", api_key=None):
    params = {
        "reporterCode": "699",
        "period": period,
        "cmdCode": cmd_code,
        "flowCode": "X",
        "partner2Code": "0",
        "customsCode": "C00",
        "motCode": "0",
        "maxRecords": "500",
        "includeDesc": "true"
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{API_BASE_DATA if api_key else API_BASE_PUBLIC}?{query_string}"
    
    headers = {
        "User-Agent": "GlobeX-Comtrade-Extractor/1.0"
    }
    if api_key:
        headers["Ocp-Apim-Subscription-Key"] = api_key

    req = urllib.request.Request(url, headers=headers)
    print(f"Fetching: {cmd_code} for period {period}...")
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Error fetching Comtrade data: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="Fetch UN Comtrade data for Indian exports.")
    parser.add_argument("--year", default="2025", help="Calendar year (e.g. 2025)")
    args = parser.parse_args()

    api_key = os.getenv("COMTRADE_API_KEY")
    print(f"Using UN Comtrade Extractor for year: {args.year}")
    if api_key:
        print("API Key detected.")
    else:
        print("Running in public preview mode (no key provided).")

if __name__ == "__main__":
    main()
