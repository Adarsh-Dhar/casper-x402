#!/usr/bin/env python3
"""
Minimal deployment test to check if deployment works at all.
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

def create_minimal_wasm():
    """Create a minimal valid WASM file for testing."""
    print("🔧 Creating minimal WASM for deployment test...")
    
    # This is a minimal valid WASM module
    wasm_bytes = bytes([
        0x00, 0x61, 0x73, 0x6d,  # WASM magic number
        0x01, 0x00, 0x00, 0x00,  # WASM version
        # Type section
        0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
        # Function section  
        0x03, 0x02, 0x01, 0x00,
        # Export section
        0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
        # Code section
        0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b
    ])
    
    os.makedirs("wasm", exist_ok=True)
    
    with open("wasm/test.wasm", "wb") as f:
        f.write(wasm_bytes)
    
    print("✅ Minimal WASM created at wasm/test.wasm")
    return "wasm/test.wasm"

def test_deploy():
    """Test deployment with minimal WASM."""
    print("🚀 Testing deployment...")
    
    # Create minimal WASM
    wasm_path = create_minimal_wasm()
    
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
                "--timestamp", timestamp_str
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 50)
    print("🧪 Minimal Deployment Test")
    print("=" * 50)
    
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
            print(f"❌ Network test failed: {result.stderr}")
            return 1
    except Exception as e:
        print(f"❌ Network error: {e}")
        return 1
    
    # Test deployment
    if test_deploy():
        print("✅ Deployment test successful!")
        return 0
    else:
        print("❌ Deployment test failed!")
        return 1

if __name__ == "__main__":
    exit(main())