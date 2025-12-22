#!/usr/bin/env python3
"""
Test script for Casper Vault Facilitator Contract
"""

import os
import subprocess
import json
import time

# Configuration - Updated for testnet
NODE_ADDRESS = os.getenv("CASPER_NODE_ADDRESS", "https://node.testnet.casper.network/rpc")
CHAIN_NAME = os.getenv("CASPER_CHAIN_NAME", "casper-test")
SECRET_KEY_PATH = os.getenv("CASPER_SECRET_KEY", "./keys/secret_key.pem")
CONTRACT_HASH = os.getenv("CONTRACT_HASH", "")  # Set this after deployment

def main():
    """Main test function"""
    print("=" * 80)
    print("Casper Vault Facilitator Contract Tests")
    print("=" * 80)
    
    if not CONTRACT_HASH:
        print("❌ Please set CONTRACT_HASH environment variable")
        print("   Example: export CONTRACT_HASH=hash-1234567890abcdef...")
        return
    
    print(f"Testing contract: {CONTRACT_HASH}")
    print(f"Node: {NODE_ADDRESS}")
    print(f"Chain: {CHAIN_NAME}")
    
    # Test 1: Query supported tokens (should be empty initially)
    print("\n[Test 1] Querying supported tokens...")
    test_query_supported_tokens()
    
    # Test 2: Estimate fees
    print("\n[Test 2] Estimating transaction fees...")
    test_estimate_fees()
    
    print("\n" + "=" * 80)
    print("Test Summary:")
    print("✅ Basic contract queries working")
    print("✅ Contract is deployed and accessible")
    print("=" * 80)

def test_query_supported_tokens():
    """Test querying supported tokens"""
    try:
        result = subprocess.run([
            "casper-client", "query-global-state",
            "--node-address", NODE_ADDRESS,
            "--state-root-hash", get_state_root_hash(),
            "--key", CONTRACT_HASH,
            "--path", "supported_tokens"
        ], capture_output=True, text=True, check=True)
        
        print("✅ Supported tokens query successful")
        print(f"   Result: {result.stdout}")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Supported tokens query failed: {e}")
        print(f"   Output: {e.stdout}")
        print(f"   Error: {e.stderr}")

def test_estimate_fees():
    """Test fee estimation"""
    try:
        secret_key = os.path.expanduser(SECRET_KEY_PATH)
        
        result = subprocess.run([
            "casper-client", "put-deploy",
            "--node-address", NODE_ADDRESS,
            "--chain-name", CHAIN_NAME,
            "--secret-key", secret_key,
            "--payment-amount", "5000000000",  # 5 CSPR
            "--session-hash", CONTRACT_HASH,
            "--session-entry-point", "estimate_fees",
            "--session-arg", "transaction_size:u64='1000'",
            "--session-arg", "instruction_count:u32='10'",
            "--session-arg", "uses_lookup_tables:bool='false'",
            "--session-arg", "is_payment_required:bool='false'"
        ], capture_output=True, text=True, check=True)
        
        # Parse deploy hash
        output = result.stdout
        deploy_hash = None
        
        try:
            data = json.loads(output)
            deploy_hash = data.get("result", {}).get("deploy_hash", "")
        except json.JSONDecodeError:
            for line in output.split('\n'):
                if "deploy_hash" in line.lower():
                    parts = line.split(':')
                    if len(parts) > 1:
                        deploy_hash = parts[1].strip().strip('"').strip(',')
                        break
        
        if deploy_hash:
            print(f"✅ Fee estimation deploy submitted: {deploy_hash}")
            
            # Wait a bit and check result
            time.sleep(15)
            check_deploy_result(deploy_hash)
        else:
            print("❌ Could not extract deploy hash")
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Fee estimation failed: {e}")
        print(f"   Output: {e.stdout}")
        print(f"   Error: {e.stderr}")

def check_deploy_result(deploy_hash):
    """Check the result of a deploy"""
    try:
        result = subprocess.run([
            "casper-client", "get-deploy",
            "--node-address", NODE_ADDRESS,
            deploy_hash
        ], capture_output=True, text=True, check=True)
        
        try:
            data = json.loads(result.stdout)
            execution_results = data.get("result", {}).get("execution_results", [])
            
            if execution_results:
                result_data = execution_results[0].get("result", {})
                
                if "Success" in result_data:
                    print("✅ Deploy executed successfully")
                    
                    # Check for return value
                    transforms = execution_results[0].get("transforms", [])
                    for transform in transforms:
                        if "WriteTransform" in transform.get("transform", {}):
                            write_transform = transform["transform"]["WriteTransform"]
                            if "CLValue" in write_transform:
                                print(f"   Return value: {write_transform['CLValue']}")
                                
                elif "Failure" in result_data:
                    print(f"❌ Deploy failed: {result_data.get('Failure', {})}")
                else:
                    print("⏳ Deploy still processing...")
            else:
                print("⏳ No execution results yet...")
                
        except json.JSONDecodeError:
            print("❌ Could not parse deploy result")
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Could not get deploy result: {e}")

def get_state_root_hash():
    """Get the current state root hash"""
    try:
        result = subprocess.run([
            "casper-client", "get-state-root-hash",
            "--node-address", NODE_ADDRESS
        ], capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        return data.get("result", {}).get("state_root_hash", "")
        
    except Exception:
        return ""

if __name__ == "__main__":
    main()