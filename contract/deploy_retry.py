import json
import os
import subprocess
import urllib.request
import ssl
import time

# --- CONFIG ---
WASM_PATH = "wasm/Cep18Permit.wasm"  # Your specific file path
DEPLOY_FILE = "deploy_final.json"
NODE_URL = "https://node.testnet.cspr.cloud/rpc"
API_KEY = "019b2b7d-e2ba-752e-a21d-81383b1fd6fe"

# 1. GENERATE THE DEPLOY (Only once!)
# We do this first to fix the timestamp.
print(f"🔨 Generating signed deploy for {WASM_PATH}...")

# Check if wasm exists
if not os.path.exists(WASM_PATH):
    print(f"❌ Error: Cannot find {WASM_PATH}. Did you run 'cargo odra build -b casper'?")
    exit(1)

cmd = [
    "casper-client", "make-deploy",
    "--chain-name", "casper-test",
    "--secret-key", "keys/secret_key.pem",
    "--payment-amount", "350000000000",
    "--session-path", WASM_PATH,
    "--output", DEPLOY_FILE
]

# Run the command
try:
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL) # Hide warnings
except subprocess.CalledProcessError:
    print("❌ Error generating deploy. Check your casper-client installation.")
    exit(1)

# 2. PREPARE THE REQUEST
with open(DEPLOY_FILE, 'r') as f:
    deploy_data = json.load(f)

payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "account_put_deploy",
    "params": { "deploy": deploy_data }
}

# SSL Context for Mac
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    NODE_URL,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "Authorization": API_KEY
    },
    method='POST'
)

# 3. RETRY LOOP
print(f"📡 Sending deploy... (If clock is skewed, we will auto-retry)")

while True:
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            result = json.loads(response.read().decode())

            # Check for "Future" error
            if 'error' in result:
                msg = result['error'].get('data', '')
                if "timestamp is in the future" in msg:
                    print(f"   ⏳ Time skew detected. Waiting 5 seconds for node to catch up...")
                    time.sleep(5)
                    continue # Try sending the SAME deploy again
                else:
                    # Real error
                    print(f"\n❌ NODE ERROR: {result['error']}")
                    break
            else:
                # Success!
                deploy_hash = result.get('result', {}).get('deploy_hash')
                print("\n✅ SUCCESS! Deploy Hash:")
                print(deploy_hash)
                print(f"\nCheck status: https://testnet.cspr.live/deploy/{deploy_hash}")
                break

    except Exception as e:
        print(f"\n❌ CONNECTION ERROR: {e}")
        break