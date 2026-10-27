import os
import sys
import json
import csv
import urllib.request
import urllib.parse
import argparse
from pathlib import Path

API_BASE_PUBLIC = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
API_BASE_DATA = "https://comtradeapi.un.org/data/v1/get/C/A/HS"

def get_api_key():
    key = os.getenv("COMTRADE_API_KEY")
    if not key:
        # Check backend/.env
        env_path = Path(__file__).parent.parent / "backend" / ".env"
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("COMTRADE_API_KEY="):
                        key = line.strip().split("=", 1)[1].strip()
                        break
    return key

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
        with urllib.request.urlopen(req, timeout=45) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Error fetching Comtrade data for {cmd_code}: {e}", file=sys.stderr)
        return None

def save_dataset(data, base_filename, output_dir):
    records = data.get("data", [])
    if not records:
        print(f"No records returned for {base_filename}")
        return 0

    # Ensure raw directory
    raw_dir = output_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    with open(raw_dir / f"{base_filename}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Save clean JSON
    json_path = output_dir / f"{base_filename}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    # Save CSV
    csv_path = output_dir / f"{base_filename}.csv"
    fieldnames = [
        "period", "reporterCode", "reporterISO", "reporterDesc",
        "flowCode", "flowDesc", "partnerCode", "partnerISO", "partnerDesc",
        "cmdCode", "cmdDesc", "primaryValue", "netWgt", "qty", "qtyUnitCode", "qtyUnitAbbr"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            writer.writerow(r)

    print(f"Saved {len(records)} records to {json_path} and {csv_path}")
    return len(records)

def main():
    parser = argparse.ArgumentParser(description="Fetch UN Comtrade data for Indian exports.")
    parser.add_argument("--year", default="2025", help="Calendar year (e.g. 2025)")
    args = parser.parse_args()

    api_key = get_api_key()
    print(f"Using UN Comtrade Extractor for year: {args.year}")
    if api_key:
        print("API Key detected.")
    else:
        print("Running in public preview mode (no key provided).")

    output_dir = Path(__file__).parent

    # 1. Total exports
    total_data = fetch_comtrade(period=args.year, cmd_code="TOTAL", api_key=api_key)
    if total_data:
        save_dataset(total_data, f"india_exports_total_by_partner_{args.year}", output_dir)

    # 2. HS62 (Apparel)
    hs62_data = fetch_comtrade(period=args.year, cmd_code="62", api_key=api_key)
    if hs62_data:
        save_dataset(hs62_data, f"india_exports_hs62_by_partner_{args.year}", output_dir)

    print("Data extraction complete.")

if __name__ == "__main__":
    main()

