import json
import os
import subprocess
import urllib.request
import ssl

# --- CONFIGURATION ---
# 1. We assume the file is in the 'wasm' folder created by 'cargo odra build'
# If your file is named something else, change 'cep18_permit.wasm' below!
WASM_PATH = "wasm/Cep18Permit.wasm" 

# 2. Check if file exists
if not os.path.exists(WASM_PATH):
    # Fallback to check if it has a different name in that folder
    try:
        files = [f for f in os.listdir("wasm") if f.endswith(".wasm")]
        if len(files) > 0:
            WASM_PATH = f"wasm/{files[0]}"
            print(f"⚠️ Found different WASM file, using: {WASM_PATH}")
        else:
            print("❌ ERROR: No .wasm file found in 'wasm/' folder.")
            print("   Did you run 'cargo odra build -b casper'?")
            exit()
    except FileNotFoundError:
        print("❌ ERROR: 'wasm/' folder not found.")
        print("   Please run: cargo odra build -b casper")
        exit()

print(f"🚀 Preparing to deploy: {WASM_PATH}")

# 3. Create the unsigned deploy using CLI
# We use NO arguments because your init() function is now empty.
cmd = [
    "casper-client", "make-deploy",
    "--chain-name", "casper-test",
    "--secret-key", "keys/secret_key.pem",
    "--payment-amount", "350000000000", # Increased to 350 CSPR just to be safe
    "--session-path", WASM_PATH,
    "--output", "deploy_final.json"
]

subprocess.run(cmd, check=True)

# 4. Wrap and Send
with open('deploy_final.json', 'r') as f:
    deploy_data = json.load(f)

payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "account_put_deploy",
    "params": { "deploy": deploy_data }
}

# SSL Context to avoid macOS errors
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    "https://node.testnet.cspr.cloud/rpc",
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Content-Type": "application/json",
        "Authorization": "019b2b7d-e2ba-752e-a21d-81383b1fd6fe"
    },
    method='POST'
)

try:
    print("📡 Sending to Casper Testnet...")
    with urllib.request.urlopen(req, context=ctx) as response:
        result = json.loads(response.read().decode())
        if 'error' in result:
             print(f"\n❌ NODE ERROR: {result['error']}")
        else:
             print("\n✅ SUCCESS! Deploy Hash:")
             print(result.get('result', {}).get('deploy_hash'))
             print("\nCheck status at: https://testnet.cspr.live/deploy/" + result.get('result', {}).get('deploy_hash'))
except Exception as e:
    print(f"\n❌ CONNECTION ERROR: {e}")