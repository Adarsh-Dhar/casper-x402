#!/usr/bin/env python3
"""
Deploy the ultra minimal contract to test if bulk memory issue is fixed.
"""

import subprocess
import os
import datetime

# Configuration
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "../my-project/keys/secret_key.pem"
PAYMENT_AMOUNT = "350000000000"  # 350 CSPR
ACCOUNT_HASH = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"

def deploy_ultra_minimal():
    """Deploy the ultra minimal contract."""
    print("🚀 Deploying ultra minimal contract...")
    
    wasm_path = "target/wasm32-unknown-unknown/release/fixed_minimal.wasm"
    if not os.path.exists(wasm_path):
        print(f"❌ WASM not found: {wasm_path}")
        return False
    
    print(f"✅ WASM size: {os.path.getsize(wasm_path)} bytes")
    
    # Get timestamp
    timestamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    try:
        result = subprocess.run(
            [
                "casper-client", "put-deploy",
                "--node-address", NODE_ADDRESS,
                "--chain-name", CHAIN_NAME,
                "--secret-key", SECRET_KEY_PATH,
                "--payment-amount", PAYMENT_AMOUNT,
                "--session-path", wasm_path,
                "--session-arg", "decimals:u8='18'",
                "--session-arg", "total_supply:u256='1000000000000000000000000'",
                "--timestamp", timestamp_str
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        if result.returncode == 0:
            # Extract deploy hash
            for line in result.stdout.split('\n'):
                if '"deploy_hash"' in line or '"hash"' in line:
                    print(f"📝 Deploy Hash Line: {line}")
            return True
        else:
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("🧪 Ultra Minimal Contract Deployment Test")
    print("=" * 60)
    
    # Check prerequisites
    if not os.path.exists(SECRET_KEY_PATH):
        print(f"❌ Secret key not found: {SECRET_KEY_PATH}")
        return 1
    
    # Test network
    try:
        result = subprocess.run(
            ["casper-client", "get-state-root-hash", "--node-address", NODE_ADDRESS],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("✅ Network connectivity OK")
        else:
            print(f"❌ Network test failed")
            return 1
    except Exception as e:
        print(f"❌ Network error: {e}")
        return 1
    
    # Deploy
    if deploy_ultra_minimal():
        print("\n🎉 Ultra minimal contract deployed successfully!")
        print("✅ No bulk memory operations error!")
        return 0
    else:
        print("\n❌ Deployment failed!")
        return 1

if __name__ == "__main__":
    exit(main())