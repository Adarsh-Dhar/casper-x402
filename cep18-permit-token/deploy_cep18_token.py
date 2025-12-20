#!/usr/bin/env python3
"""
CEP18 Permit Token Deployment Script

Deploys the CEP18 permit token contract to Casper testnet with proper initialization.
"""

import subprocess
import json
import time
import sys
import os
from pathlib import Path

# Configuration
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "../my-project/keys/secret_key.pem"  # Use the same keys as my-project
PAYMENT_AMOUNT = "500000000000"  # 500 CSPR for contract deployment
ACCOUNT_HASH = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"

# Token configuration
TOKEN_NAME = "Permit Token"
TOKEN_SYMBOL = "PERMIT"
TOKEN_DECIMALS = 18
TOTAL_SUPPLY = "1000000000000000000000000"  # 1 million tokens with 18 decimals

def check_prerequisites():
    """Check if all prerequisites are met."""
    print("🔍 Checking prerequisites...")
    
    # Check if secret key exists
    if not os.path.exists(SECRET_KEY_PATH):
        print(f"❌ Secret key not found at {SECRET_KEY_PATH}")
        print("💡 Make sure you have the secret key from my-project")
        return False
    
    # Check if casper-client is installed
    try:
        result = subprocess.run(["casper-client", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Casper client found: {result.stdout.strip()}")
        else:
            print("❌ Casper client not found")
            return False
    except FileNotFoundError:
        print("❌ Casper client not installed")
        print("💡 Install with: cargo install casper-client")
        return False
    
    # Check if we're in the right directory
    if not os.path.exists("Cargo.toml"):
        print("❌ Not in CEP18 token directory")
        print("💡 Run this script from the cep18-permit-token directory")
        return False
    
    print("✅ All prerequisites met")
    return True

def clean_build_artifacts():
    """Clean previous build artifacts."""
    print("🧹 Cleaning build artifacts...")
    
    # Remove target directory
    if os.path.exists("target"):
        import shutil
        shutil.rmtree("target")
        print("✅ Removed target directory")
    
    # Remove wasm directory if it exists
    if os.path.exists("wasm"):
        import shutil
        shutil.rmtree("wasm")
        print("✅ Removed wasm directory")

def build_contract():
    """Build the CEP18 permit token contract."""
    print("🔨 Building CEP18 permit token contract...")
    
    try:
        # Build the contract
        result = subprocess.run(
            ["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"❌ Build failed:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False, None
        
        # Check if WASM file was created
        wasm_path = "target/wasm32-unknown-unknown/release/cep18_permit_token.wasm"
        if not os.path.exists(wasm_path):
            print(f"❌ WASM file not found at {wasm_path}")
            return False, None
        
        print(f"✅ Contract built successfully: {wasm_path}")
        return True, wasm_path
        
    except subprocess.TimeoutExpired:
        print("⏱️  Build timeout")
        return False, None
    except Exception as e:
        print(f"❌ Build error: {e}")
        return False, None

def check_node_connectivity():
    """Check if the node is reachable."""
    print(f"🔍 Testing connectivity to {NODE_ADDRESS}...")
    try:
        result = subprocess.run(
            ["casper-client", "get-state-root-hash", "--node-address", NODE_ADDRESS],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            print(f"✅ Node is reachable: {NODE_ADDRESS}")
            return True
        else:
            print(f"❌ Node connectivity failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout connecting to {NODE_ADDRESS}")
        return False
    except Exception as e:
        print(f"❌ Error connecting to node: {e}")
        return False

def check_account_balance():
    """Check if the account is funded."""
    print(f"🔍 Checking account balance...")
    try:
        result = subprocess.run(
            [
                "casper-client", "get-account-info",
                "--node-address", NODE_ADDRESS,
                "--account-identifier", ACCOUNT_HASH
            ],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            print(f"✅ Account found and funded")
            return True
        else:
            print(f"⚠️  Account check failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout checking account")
        return False
    except Exception as e:
        print(f"❌ Error checking account: {e}")
        return False

def deploy_contract(wasm_path):
    """Deploy the CEP18 permit token contract."""
    print(f"🚀 Deploying CEP18 permit token to {NODE_ADDRESS}...")
    
    # Get current timestamp
    import datetime
    timestamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    try:
        # Deploy with initialization parameters
        result = subprocess.run(
            [
                "casper-client", "put-deploy",
                "--node-address", NODE_ADDRESS,
                "--chain-name", CHAIN_NAME,
                "--secret-key", SECRET_KEY_PATH,
                "--payment-amount", PAYMENT_AMOUNT,
                "--session-path", wasm_path,
                "--session-arg", f"name:string='{TOKEN_NAME}'",
                "--session-arg", f"symbol:string='{TOKEN_SYMBOL}'",
                "--session-arg", f"decimals:u8='{TOKEN_DECIMALS}'",
                "--session-arg", f"total_supply:u256='{TOTAL_SUPPLY}'",
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
                if 'deploy_hash' in line.lower() or '"hash"' in line:
                    print(f"📝 Deploy Hash: {line.strip()}")
                    # Try to extract just the hash
                    if '"' in line:
                        parts = line.split('"')
                        for i, part in enumerate(parts):
                            if len(part) == 64 and all(c in '0123456789abcdef' for c in part):
                                deploy_hash = part
                                break
            
            return True, deploy_hash
        else:
            print(f"❌ Deployment failed:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False, None
            
    except subprocess.TimeoutExpired:
        print("⏱️  Deployment timeout")
        return False, None
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return False, None

def wait_for_deployment(deploy_hash, timeout=300):
    """Wait for deployment to be processed."""
    if not deploy_hash:
        return False
    
    print(f"⏳ Waiting for deployment to be processed...")
    print(f"Deploy hash: {deploy_hash}")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            result = subprocess.run(
                [
                    "casper-client", "get-deploy",
                    "--node-address", NODE_ADDRESS,
                    deploy_hash
                ],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                output = result.stdout
                if '"execution_results"' in output and '"Success"' in output:
                    print("✅ Deployment processed successfully!")
                    return True
                elif '"Failure"' in output:
                    print("❌ Deployment failed during execution")
                    print(output)
                    return False
                else:
                    print("⏳ Still processing...")
                    time.sleep(10)
            else:
                print("⏳ Deploy not found yet, waiting...")
                time.sleep(10)
                
        except Exception as e:
            print(f"⚠️  Error checking deployment status: {e}")
            time.sleep(10)
    
    print("⏱️  Timeout waiting for deployment")
    return False

def main():
    """Main deployment flow."""
    print("=" * 70)
    print("🪙 CEP18 Permit Token Deployment")
    print("=" * 70)
    print(f"Node: {NODE_ADDRESS}")
    print(f"Account: {ACCOUNT_HASH}")
    print(f"Chain: {CHAIN_NAME}")
    print(f"Token: {TOKEN_NAME} ({TOKEN_SYMBOL})")
    print(f"Supply: {TOTAL_SUPPLY} (with {TOKEN_DECIMALS} decimals)")
    print(f"Payment: {PAYMENT_AMOUNT} motes (500 CSPR)")
    print("=" * 70)
    
    # Step 1: Check prerequisites
    print("\nStep 1: Checking prerequisites...")
    if not check_prerequisites():
        return 1
    
    # Step 2: Clean and build
    print("\nStep 2: Building contract...")
    clean_build_artifacts()
    success, wasm_path = build_contract()
    if not success:
        print("❌ Build failed!")
        return 1
    
    # Step 3: Check network connectivity
    print("\nStep 3: Testing network connectivity...")
    if not check_node_connectivity():
        print("❌ Cannot connect to Casper testnet!")
        return 1
    
    # Step 4: Check account
    print("\nStep 4: Checking account status...")
    if not check_account_balance():
        print("\n⚠️  Account not found or not funded!")
        print(f"💰 Please fund your account at: https://testnet.cspr.live/tools/faucet")
        print(f"📝 Use account hash: {ACCOUNT_HASH}")
        return 1
    
    # Step 5: Deploy contract
    print("\nStep 5: Deploying CEP18 permit token...")
    success, deploy_hash = deploy_contract(wasm_path)
    
    if not success:
        print("❌ Deployment failed!")
        return 1
    
    # Step 6: Wait for processing
    print("\nStep 6: Waiting for deployment processing...")
    if wait_for_deployment(deploy_hash):
        print("\n" + "=" * 70)
        print("🎉 CEP18 PERMIT TOKEN DEPLOYED SUCCESSFULLY!")
        print("=" * 70)
        print(f"✅ Token Name: {TOKEN_NAME}")
        print(f"✅ Token Symbol: {TOKEN_SYMBOL}")
        print(f"✅ Decimals: {TOKEN_DECIMALS}")
        print(f"✅ Total Supply: {TOTAL_SUPPLY}")
        print(f"🔗 Deploy Hash: {deploy_hash}")
        print(f"🌐 Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
        print(f"📊 Account: https://testnet.cspr.live/account/{ACCOUNT_HASH}")
        print("\n💡 Next steps:")
        print("   1. Wait for deployment to finalize (~2-3 minutes)")
        print("   2. Test token functions (transfer, approve, etc.)")
        print("   3. Test permit functionality")
        return 0
    else:
        print("\n❌ Deployment processing failed or timed out")
        if deploy_hash:
            print(f"🔗 Check status: https://testnet.cspr.live/deploy/{deploy_hash}")
        return 1

if __name__ == "__main__":
    sys.exit(main())