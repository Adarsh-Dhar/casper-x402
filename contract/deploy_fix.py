import json
import urllib.request
import ssl

# 1. Load the signed deploy
try:
    with open('deploy.json', 'r') as f:
        deploy_data = json.load(f)
except FileNotFoundError:
    print("❌ Error: deploy.json not found. Run Step 1 (make-deploy) first.")
    exit()

# 2. Prepare the RPC request
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "account_put_deploy",
    "params": {
        "deploy": deploy_data
    }
}

# 3. Create an unverified SSL context (Fixes the macOS error)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 4. Send to CSPR.cloud
req = urllib.request.Request(
    "https://api.testnet.cspr.cloud/rpc",
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "Authorization": "019b2b7d-e2ba-752e-a21d-81383b1fd6fe"
    },
    method='POST'
)

try:
    print("🚀 Sending deploy to CSPR.cloud (SSL Disabled)...")
    with urllib.request.urlopen(req, context=ctx) as response:
        result = json.loads(response.read().decode())
        print("\n✅ SUCCESS! Here is your Deploy Hash:")
        print(result.get('result', {}).get('deploy_hash'))
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    # Print full response if possible for debugging
    if hasattr(e, 'read'):
         print(e.read().decode())