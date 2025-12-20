#!/usr/bin/env python3
"""
Direct deployment script for CEP18 Permit Token to Casper testnet.
Based on the successful deployment pattern from my-project.
"""

import subprocess
import json
import time
import sys
import os

# Configuration - Using exact same setup as my-project
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "../my-project/keys/secret_key.pem"
PAYMENT_AMOUNT = "2000000000000"  # 2000 CSPR for very large contract
ACCOUNT_HASH = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"

# Alternative testnet nodes to try
TESTNET_NODES = [
    "https://node.testnet.casper.network/rpc",
    "http://65.21.227.180:7777/rpc",
    "http://3.208.91.63:7777/rpc", 
    "http://136.243.187.84:7777/rpc",
    "http://34.220.83.153:7777/rpc"
]

def build_contract():
    """Build the CEP18 permit token contract."""
    print("🔨 Building CEP18 permit token contract...")
    
    # Clean first
    if os.path.exists("target"):
        import shutil
        shutil.rmtree("target")
        print("✅ Cleaned target directory")
    
    try:
        result = subprocess.run(
            ["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print("✅ Contract built successfully!")
            
            # Check if WASM file exists
            wasm_path = "target/wasm32-unknown-unknown/release/cep18_permit_token.wasm"
            if os.path.exists(wasm_path):
                # Copy to wasm directory for deployment and optimize
                os.makedirs("wasm", exist_ok=True)
                import shutil
                shutil.copy2(wasm_path, "wasm/cep18_permit_token.wasm")
                print("✅ WASM copied to wasm/cep18_permit_token.wasm")
                
                # Optimize the WASM
                try:
                    result = subprocess.run(
                        ["wasm-opt", "-Oz", "--strip-debug", "--strip-producers", 
                         "wasm/cep18_permit_token.wasm", "-o", "wasm/cep18_permit_token_optimized.wasm"],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        print("✅ WASM optimized successfully")
                    else:
                        print("⚠️  WASM optimization failed, using original")
                        shutil.copy2("wasm/cep18_permit_token.wasm", "wasm/cep18_permit_token_optimized.wasm")
                except:
                    print("⚠️  wasm-opt not available, using original")
                    shutil.copy2("wasm/cep18_permit_token.wasm", "wasm/cep18_permit_token_optimized.wasm")
                
                return True
            else:
                print(f"❌ WASM file not found at {wasm_path}")
                return False
        else:
            print(f"❌ Build failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("⏱️  Build timeout")
        return False
    except Exception as e:
        print(f"❌ Build error: {e}")
        return False

def find_working_node():
    """Find a working testnet node."""
    print("🔍 Searching for working testnet node...")
    for node in TESTNET_NODES:
        try:
            result = subprocess.run(
                ["casper-client", "get-state-root-hash", "--node-address", node],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                print(f"✅ Found working node: {node}")
                return node
        except:
            continue
    return None

def check_account_balance(node_address):
    """Check if the account is funded."""
    print(f"🔍 Checking account balance on {node_address}...")
    try:
        result = subprocess.run(
            [
                "casper-client", "get-account-info",
                "--node-address", node_address,
                "--account-identifier", ACCOUNT_HASH
            ],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            print(f"✅ Account found on {node_address}")
            return True, node_address
        else:
            print(f"⚠️  Account check failed on {node_address}: {result.stderr}")
            return False, None
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout checking account on {node_address}")
        return False, None
    except Exception as e:
        print(f"❌ Error checking account on {node_address}: {e}")
        return False, None

def deploy_contract(node_address):
    """Deploy the CEP18 permit token contract."""
    print(f"🚀 Deploying CEP18 permit token to {node_address}...")
    
    # Check if WASM exists
    if not os.path.exists("wasm/cep18_permit_token_optimized.wasm"):
        print("❌ Optimized WASM file not found at wasm/cep18_permit_token_optimized.wasm")
        return False
    
    print("✅ Found optimized WASM file at wasm/cep18_permit_token_optimized.wasm")
    
    # Get current timestamp - using exact same format as my-project
    import datetime
    timestamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    try:
        # Use exact same command structure as my-project
        result = subprocess.run(
            [
                "casper-client", "put-deploy",
                "--node-address", node_address,
                "--chain-name", CHAIN_NAME,
                "--secret-key", SECRET_KEY_PATH,
                "--payment-amount", PAYMENT_AMOUNT,
                "--session-path", "wasm/cep18_permit_token_optimized.wasm",
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
                if 'deploy_hash' in line.lower() or 'hash' in line.lower():
                    print(f"📝 {line}")
                    # Try to extract the hash
                    if '"' in line:
                        parts = line.split('"')
                        for part in parts:
                            if len(part) == 64 and all(c in '0123456789abcdef' for c in part):
                                deploy_hash = part
                                break
            
            if deploy_hash:
                print(f"\n🔗 Deploy Hash: {deploy_hash}")
                print(f"🌐 Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
            
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
    """Main deployment flow - following exact pattern from my-project."""
    print("=" * 70)
    print("🪙 CEP18 Permit Token Direct Deployment")
    print("=" * 70)
    print(f"Account: {ACCOUNT_HASH}")
    print(f"Chain: {CHAIN_NAME}")
    print(f"Payment: {PAYMENT_AMOUNT} motes (500 CSPR)")
    print("=" * 70)
    
    # Step 1: Build contract
    print("\nStep 1: Building contract...")
    if not build_contract():
        print("❌ Failed to build contract!")
        return 1
    
    # Step 2: Find working node
    print("\nStep 2: Finding working node...")
    working_node = find_working_node()
    if not working_node:
        print("❌ No working testnet nodes found!")
        print("💡 The Casper testnet might be experiencing issues.")
        print("💡 Please try again later or check https://testnet.cspr.live/")
        return 1
    
    # Step 3: Check account balance
    print("\nStep 3: Checking account balance...")
    funded, node = check_account_balance(working_node)
    if not funded:
        print("\n⚠️  Account not found or not funded!")
        print(f"💰 Please fund your account at: https://testnet.cspr.live/tools/faucet")
        print(f"📝 Use account hash: {ACCOUNT_HASH}")
        return 1
    
    # Step 4: Deploy contract
    print("\nStep 4: Deploying contract...")
    success = deploy_contract(working_node)
    
    if success:
        print("\n" + "=" * 70)
        print("🎉 CEP18 PERMIT TOKEN DEPLOYMENT SUCCESSFUL!")
        print("=" * 70)
        print(f"✅ Contract deployed successfully!")
        print(f"🌐 Account Explorer: https://testnet.cspr.live/account/{ACCOUNT_HASH}")
        print("📝 Check the explorer for your deploy hash and contract details")
        print("\n💡 Next steps:")
        print("   1. Wait for deployment to finalize (~2-3 minutes)")
        print("   2. Test token functions")
        print("   3. Test permit functionality")
        return 0
    else:
        print("\n" + "=" * 70)
        print("❌ DEPLOYMENT FAILED")
        print("=" * 70)
        print("💡 Possible issues:")
        print("   1. Account not funded enough (need >500 CSPR)")
        print("   2. Network connectivity issues")
        print("   3. Contract compilation issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())