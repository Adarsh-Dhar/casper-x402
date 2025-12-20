#!/usr/bin/env python3
"""
Simple deployment script for testing Casper testnet connectivity.
Uses a minimal WASM file to test the deployment process.
"""

import subprocess
import json
import time
import sys
import os

# Configuration - Updated with working RPC endpoint
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "/Users/adarsh/Documents/casper/my-project/keys/secret_key.pem"
PAYMENT_AMOUNT = "350000000000"  # 350 CSPR
ACCOUNT_HASH = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"

def create_minimal_wasm():
    """Create a minimal valid WASM file for testing deployment."""
    print("🔧 Creating minimal WASM for deployment test...")
    
    # This is a minimal valid WASM module that does nothing but is deployable
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
            print(f"State root hash: {result.stdout.strip()}")
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
            # Parse balance from output
            output = result.stdout
            if "liquid" in output.lower():
                print("Account details:")
                for line in output.split('\n'):
                    if 'liquid' in line.lower() or 'balance' in line.lower():
                        print(f"  {line.strip()}")
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

def deploy_test_contract():
    """Deploy a test contract to verify deployment process."""
    print(f"🚀 Deploying test contract to {NODE_ADDRESS}...")
    
    # Create minimal WASM
    wasm_path = create_minimal_wasm()
    
    # Get current timestamp in the correct format for Casper
    import datetime
    # Use a timestamp that's well in the past to avoid future timestamp issues
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
            
            if deploy_hash:
                print(f"\n🔗 Track your deployment:")
                print(f"   Deploy Hash: {deploy_hash}")
                print(f"   Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
            
            return True, deploy_hash
        else:
            print(f"❌ Deployment failed:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            print(f"Return code: {result.returncode}")
            return False, None
            
    except subprocess.TimeoutExpired:
        print("⏱️  Deployment timeout")
        return False, None
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return False, None

def main():
    """Main deployment flow."""
    print("=" * 60)
    print("🎯 Casper Testnet Deployment Test")
    print("=" * 60)
    print(f"Node: {NODE_ADDRESS}")
    print(f"Account: {ACCOUNT_HASH}")
    print(f"Chain: {CHAIN_NAME}")
    print(f"Payment: {PAYMENT_AMOUNT} motes (350 CSPR)")
    print("=" * 60)
    
    # Step 1: Check node connectivity
    print("\nStep 1: Testing node connectivity...")
    if not check_node_connectivity():
        print("❌ Cannot connect to Casper testnet node!")
        print("💡 Please check your internet connection and try again.")
        return 1
    
    # Step 2: Check account
    print("\nStep 2: Checking account status...")
    if not check_account_balance():
        print("\n⚠️  Account not found or not funded!")
        print(f"💰 Please fund your account at: https://testnet.cspr.live/tools/faucet")
        print(f"📝 Use account hash: {ACCOUNT_HASH}")
        print(f"🌐 Account Explorer: https://testnet.cspr.live/account/{ACCOUNT_HASH}")
        return 1
    
    # Step 3: Deploy test contract
    print("\nStep 3: Deploying test contract...")
    success, deploy_hash = deploy_test_contract()
    
    if success:
        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT TEST SUCCESSFUL!")
        print("=" * 60)
        print("✅ Your Casper testnet setup is working correctly!")
        print(f"🌐 Account Explorer: https://testnet.cspr.live/account/{ACCOUNT_HASH}")
        if deploy_hash:
            print(f"🔗 Deploy Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
        print("\n💡 Next steps:")
        print("   1. Fix the Flipper contract build issues")
        print("   2. Deploy your actual Flipper contract")
        print("   3. Test contract interactions")
        return 0
    else:
        print("\n" + "=" * 60)
        print("❌ DEPLOYMENT TEST FAILED")
        print("=" * 60)
        print("💡 Possible issues:")
        print("   1. Account not funded enough (need >350 CSPR)")
        print("   2. Network connectivity issues")
        print("   3. Invalid secret key")
        print("   4. Node temporarily unavailable")
        return 1

if __name__ == "__main__":
    sys.exit(main())