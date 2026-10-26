import urllib.request
import json

def test_e2e():
    try:
        print('Logging in...')
        req = urllib.request.Request(
            'http://localhost:3000/api/v1/auth/login',
            data=json.dumps({'email': 'demo@spicesexport.in', 'password': 'Demo@123'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        login_res = json.loads(urllib.request.urlopen(req).read().decode())
        if not login_res.get('success'):
            raise Exception('Login failed')
        
        token = login_res['data']['tokens']['accessToken']
        print('Token received.')

        print('Calling /market/analyze...')
        req2 = urllib.request.Request(
            'http://localhost:3000/api/v1/market/analyze',
            data=json.dumps({'product': 'Organic Turmeric Powder'}).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
        )
        analyze_res = json.loads(urllib.request.urlopen(req2).read().decode())
        print('Analyze Data:', str(analyze_res)[:500])

        print('Fetching stored opportunities...')
        req3 = urllib.request.Request(
            'http://localhost:3000/api/v1/market/opportunities',
            headers={'Authorization': f'Bearer {token}'}
        )
        opp_res = json.loads(urllib.request.urlopen(req3).read().decode())
        print('Stored Opportunities Count:', len(opp_res.get('data', [])))

        print('Calling /buyers/discover...')
        req4 = urllib.request.Request(
            'http://localhost:3000/api/v1/buyers/discover',
            data=json.dumps({'product': 'Organic Turmeric Powder', 'targetCountries': ['US', 'AE']}).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
        )
        discover_res = json.loads(urllib.request.urlopen(req4).read().decode())
        print('Discovered Buyers Count:', len(discover_res.get('data', {}).get('buyers', [])))
        print('First Buyer:', discover_res.get('data', {}).get('buyers', [])[0] if discover_res.get('data', {}).get('buyers', []) else 'None')
        
        print('All tests passed.')
    except Exception as e:
        print('Test Failed:', e)

test_e2e()
