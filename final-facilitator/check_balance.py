#!/usr/bin/env python3
"""
Quick balance checker for your account
"""

import subprocess
import requests
import json

NODE_ADDRESS = "https://node.testnet.casper.network/rpc"

def main():
    # Get account hash
    result = subprocess.run(
        ["casper-client", "account-address", "--public-key", "./keys/public_key.pem"],
        capture_output=True,
        text=True,
        check=True
    )
    account_hash = result.stdout.strip()
    
    print(f"🔍 Checking balance for: {account_hash}")
    print(f"📡 Using RPC: {NODE_ADDRESS}")
    print("=" * 60)
    
    # Get latest state root hash
    try:
        payload = {
            "jsonrpc": "2.0",
            "method": "chain_get_state_root_hash",
            "params": [],
            "id": 1
        }
        
        response = requests.post(NODE_ADDRESS, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            state_root_hash = data["result"]["state_root_hash"]
            print(f"State root hash: {state_root_hash}")
            
            # Get account info
            payload2 = {
                "jsonrpc": "2.0",
                "method": "state_get_item",
                "params": {
                    "state_root_hash": state_root_hash,
                    "key": account_hash,
                    "path": []
                },
                "id": 2
            }
            
            response2 = requests.post(NODE_ADDRESS, json=payload2, timeout=10)
            if response2.status_code == 200:
                data2 = response2.json()
                if "result" in data2 and "stored_value" in data2["result"]:
                    account_data = data2["result"]["stored_value"]["Account"]
                    main_purse = account_data["main_purse"]
                    
                    # Get balance
                    payload3 = {
                        "jsonrpc": "2.0",
                        "method": "state_get_balance",
                        "params": {
                            "state_root_hash": state_root_hash,
                            "purse_uref": main_purse
                        },
                        "id": 3
                    }
                    
                    response3 = requests.post(NODE_ADDRESS, json=payload3, timeout=10)
                    if response3.status_code == 200:
                        data3 = response3.json()
                        if "result" in data3:
                            balance_motes = int(data3["result"]["balance_value"])
                            balance_cspr = balance_motes / 1_000_000_000
                            
                            print(f"💰 Balance: {balance_cspr:.2f} CSPR ({balance_motes:,} motes)")
                            
                            if balance_cspr >= 300:
                                print("✅ Sufficient balance for deployment!")
                                return True
                            else:
                                print("❌ Insufficient balance for deployment")
                                print("   Need at least 300 CSPR")
                                print("   Fund at: https://testnet.cspr.live/tools/faucet")
                                return False
                else:
                    print("❌ Account not found on network")
                    print("   Fund at: https://testnet.cspr.live/tools/faucet")
                    return False
            else:
                print(f"❌ Failed to get account info: {response2.status_code}")
                return False
        else:
            print(f"❌ Failed to get state root: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return False

if __name__ == "__main__":
    main()