#!/usr/bin/env python3
"""
Quick deployment status checker for Casper Vault Facilitator
"""

import os
import sys
import subprocess
import json
import requests

NODE_ADDRESS = "https://node.testnet.casper.network/rpc"

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 check_deployment.py <deploy_hash>")
        sys.exit(1)
    
    deploy_hash = sys.argv[1]
    print(f"🔍 Checking deployment status for: {deploy_hash}")
    print(f"📡 Using RPC: {NODE_ADDRESS}")
    print("=" * 60)
    
    # Check deployment status
    status = check_deploy_status(deploy_hash)
    if status:
        print("✅ Deployment found and processed!")
        print_deploy_info(status)
    else:
        print("❌ Deployment not found or failed")

def check_deploy_status(deploy_hash):
    """Check deployment status"""
    try:
        result = subprocess.run(
            ["casper-client", "get-deploy",
             "--node-address", NODE_ADDRESS,
             deploy_hash],
            capture_output=True,
            text=True,
            check=True
        )
        
        data = json.loads(result.stdout)
        return data.get("result", {})
        
    except subprocess.CalledProcessError:
        print("Deploy not found")
        return None
    except json.JSONDecodeError:
        print("Could not parse deploy result")
        return None

def print_deploy_info(deploy_data):
    """Print deployment information"""
    deploy = deploy_data.get("deploy", {})
    execution_results = deploy_data.get("execution_results", [])
    
    print(f"Deploy Hash: {deploy.get('hash', 'Unknown')}")
    print(f"Account: {deploy.get('header', {}).get('account', 'Unknown')}")
    print(f"Timestamp: {deploy.get('header', {}).get('timestamp', 'Unknown')}")
    print(f"Payment Amount: {deploy.get('header', {}).get('payment', {}).get('ModuleBytes', {}).get('args', [{}])[0].get('value', {}).get('parsed', 'Unknown')} motes")
    
    if execution_results:
        result = execution_results[0].get("result", {})
        if "Success" in result:
            print("✅ Status: SUCCESS")
            success_data = result["Success"]
            print(f"Cost: {success_data.get('cost', 'Unknown')} motes")
            
            # Try to extract contract hash
            transforms = success_data.get("effect", {}).get("transforms", [])
            for transform in transforms:
                if transform.get("transform") == "WriteContract":
                    print(f"📋 Contract Hash: contract-{transform.get('key', 'Unknown')}")
                    break
                    
        elif "Failure" in result:
            print("❌ Status: FAILED")
            failure_data = result["Failure"]
            print(f"Error: {failure_data}")
        else:
            print("⏳ Status: PENDING")
    else:
        print("⏳ Status: PENDING (no execution results yet)")

if __name__ == "__main__":
    main()