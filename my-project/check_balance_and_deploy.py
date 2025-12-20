#!/usr/bin/env python3
"""
Check account balance and deploy if funded.
"""

import subprocess
import json
import sys

def check_balance():
    """Check account balance."""
    print("🔍 Checking account balance...")
    
    account_hash = "account-hash-d788adea6d1342e2a11ccac5549c9359f5533aa9f1bf51bfca8631e47b1510ea"
    
    try:
        result = subprocess.run(
            [
                "casper-client", "get-account-info",
                "--node-address", "https://node.testnet.casper.network/rpc",
                "--account-identifier", account_hash
            ],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            print("✅ Account found!")
            
            # Get state root hash
            state_result = subprocess.run(
                ["casper-client", "get-state-root-hash", "--node-address", "https://node.testnet.casper.network/rpc"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if state_result.returncode == 0:
                state_data = json.loads(state_result.stdout)
                state_root_hash = state_data["result"]["state_root_hash"]
                
                # Get account info to find purse
                account_data = json.loads(result.stdout)
                main_purse = account_data["result"]["account"]["main_purse"]
                
                # Get balance
                balance_result = subprocess.run(
                    [
                        "casper-client", "get-balance",
                        "--node-address", "https://node.testnet.casper.network/rpc",
                        "--state-root-hash", state_root_hash,
                        "--purse-uref", main_purse
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if balance_result.returncode == 0:
                    balance_data = json.loads(balance_result.stdout)
                    balance_motes = int(balance_data["result"]["balance_value"])
                    balance_cspr = balance_motes / 1_000_000_000  # Convert motes to CSPR
                    
                    print(f"💰 Balance: {balance_cspr:.9f} CSPR ({balance_motes} motes)")
                    
                    if balance_cspr >= 350:
                        print("✅ Sufficient funds for deployment!")
                        return True, balance_cspr
                    else:
                        print("❌ Insufficient funds for deployment (need 350+ CSPR)")
                        return False, balance_cspr
                else:
                    print(f"❌ Failed to get balance: {balance_result.stderr}")
                    return False, 0
            else:
                print(f"❌ Failed to get state root hash: {state_result.stderr}")
                return False, 0
        else:
            print(f"❌ Account not found: {result.stderr}")
            return False, 0
            
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return False, 0

def deploy_contract():
    """Deploy the contract."""
    print("🚀 Starting deployment...")
    try:
        result = subprocess.run(
            ["python3", "deploy_flipper_direct.py"],
            timeout=120
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return False

def main():
    """Main function."""
    print("=" * 60)
    print("🎯 Balance Check & Deployment")
    print("=" * 60)
    
    # Check balance
    funded, balance = check_balance()
    
    if funded:
        print(f"\n✅ Account is funded with {balance:.2f} CSPR")
        print("🚀 Proceeding with deployment...")
        
        if deploy_contract():
            print("\n🎉 DEPLOYMENT SUCCESSFUL!")
        else:
            print("\n❌ DEPLOYMENT FAILED!")
            return 1
    else:
        print(f"\n💰 Account balance: {balance:.9f} CSPR")
        print("❌ Insufficient funds for deployment!")
        print("\n📝 Please fund your account:")
        print("1. Visit: https://testnet.cspr.live/tools/faucet")
        print("2. Enter public key: 0202cf7a3684779b612a1621927590b1384af1f515ed247a71cf36574273c86c6729")
        print("3. Request 1000+ CSPR")
        print("4. Wait 1-2 minutes")
        print("5. Run this script again")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())