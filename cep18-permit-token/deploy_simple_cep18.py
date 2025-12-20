#!/usr/bin/env python3
"""
Simple CEP18 Permit Token Deployment Script
Based on the working deployment pattern from my-project
"""

import subprocess
import json
import time
import sys
import os

# Configuration - Using the same working setup as my-project
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "../my-project/keys/secret_key.pem"
PAYMENT_AMOUNT = "500000000000"  # 500 CSPR
ACCOUNT_HASH = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"

def build_contract():
    """Build the contract first."""
    print("🔨 Building CEP18 contract...")
    
    # Clean first
    if os.path.exists("target"):
        import shutil
        shutil.rmtree("target")
    
    try:
        result = subprocess.run(
            ["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            wasm_path = "target/wasm32-unknown-unknown/release/cep18_permit_token.wasm"
            if os.path.exists(wasm_path):
                print(f"✅ Contract built: {wasm_path}")
                return wasm_path
            else:
                print("❌ WASM file not found after build")
                return None
        else:
            print(f"❌ Build failed: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Build error: {e}")
        return None

def deploy_contract():
    """Deploy the contract using the simple approach."""
    print("🚀 Deploying CEP18 Permit Token...")
    
    # Build first
    wasm_path = build_contract()
    if not wasm_path:
        return False
    
    # Get timestamp
    import datetime
    timestamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    try:
        # Use the newer put-transaction session command
        result = subprocess.run(
            [
                "casper-client", "put-transaction", "session",
                "--node-address", NODE_ADDRESS,
                "--chain-name", CHAIN_NAME,
                "--secret-key", SECRET_KEY_PATH,
                "--payment-amount", PAYMENT_AMOUNT,
                "--standard-payment", "true",
                "--wasm-path", wasm_path,
                "--gas-price-tolerance", "1",
                "--timestamp", timestamp_str
            ],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Deployment successful!")
            print(result.stdout)
            
            # Extract deploy hash
            deploy_hash = None
            for line in result.stdout.split('\n'):
                if '"hash"' in line and len(line) > 10:
                    # Extract hash from JSON-like output
                    import re
                    hash_match = re.search(r'"([a-f0-9]{64})"', line)
                    if hash_match:
                        deploy_hash = hash_match.group(1)
                        break
            
            if deploy_hash:
                print(f"\n🔗 Deploy Hash: {deploy_hash}")
                print(f"🌐 Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
                return True
            else:
                print("⚠️  Deploy successful but couldn't extract hash")
                return True
        else:
            print(f"❌ Deployment failed:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("⏱️  Deployment timeout")
        return False
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return False

def main():
    """Main deployment."""
    print("=" * 60)
    print("🪙 CEP18 Permit Token Simple Deployment")
    print("=" * 60)
    print(f"Node: {NODE_ADDRESS}")
    print(f"Account: {ACCOUNT_HASH}")
    print(f"Payment: {PAYMENT_AMOUNT} motes")
    print("=" * 60)
    
    # Check prerequisites
    if not os.path.exists(SECRET_KEY_PATH):
        print(f"❌ Secret key not found: {SECRET_KEY_PATH}")
        return 1
    
    # Test connectivity
    try:
        result = subprocess.run(
            ["casper-client", "get-state-root-hash", "--node-address", NODE_ADDRESS],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            print("❌ Cannot connect to network")
            return 1
        print("✅ Network connectivity OK")
    except:
        print("❌ Network test failed")
        return 1
    
    # Deploy
    if deploy_contract():
        print("\n🎉 CEP18 Permit Token deployed successfully!")
        return 0
    else:
        print("\n❌ Deployment failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())