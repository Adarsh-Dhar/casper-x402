#!/usr/bin/env python3
"""
Deployment script for Casper Vault Facilitator Contract
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

# Configuration
NODE_ADDRESS = os.getenv("CASPER_NODE_ADDRESS", "http://65.109.222.111:7777")
CHAIN_NAME = os.getenv("CASPER_CHAIN_NAME", "casper-test")
SECRET_KEY_PATH = os.getenv("CASPER_SECRET_KEY", "~/casper/casper-node/utils/nctl/assets/net-1/nodes/node-1/keys/secret_key.pem")

# Contract parameters
ADMIN_ACCOUNT = os.getenv("ADMIN_ACCOUNT", "")  # Will use deployer if not set
FEE_RECIPIENT_ACCOUNT = os.getenv("FEE_RECIPIENT_ACCOUNT", "")  # Will use deployer if not set
BASE_FEE_RATE = int(os.getenv("BASE_FEE_RATE", "100000"))  # 0.0001 CSPR
MAX_FEE_RATE = int(os.getenv("MAX_FEE_RATE", "10000000"))  # 0.01 CSPR

# Payment amount for deployment (in motes)
PAYMENT_AMOUNT = os.getenv("PAYMENT_AMOUNT", "200000000000")  # 200 CSPR

def main():
    """Main deployment function"""
    print("=" * 80)
    print("Casper Vault Facilitator Contract Deployment")
    print("=" * 80)
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Build the contract
    print("\n[1/4] Building contract...")
    if not build_contract():
        print("❌ Failed to build contract")
        sys.exit(1)
    print("✅ Contract built successfully")
    
    # Check account balance
    print("\n[2/4] Checking account balance...")
    if not check_account_balance():
        print("⚠️  Warning: Could not verify account balance")
    
    # Deploy the contract
    print("\n[3/4] Deploying contract...")
    deploy_hash = deploy_contract()
    if not deploy_hash:
        print("❌ Failed to deploy contract")
        sys.exit(1)
    print(f"✅ Contract deployed successfully")
    print(f"   Deploy Hash: {deploy_hash}")
    
    # Wait for deployment
    print("\n[4/4] Waiting for deployment to complete...")
    if wait_for_deployment(deploy_hash):
        print("✅ Deployment completed successfully!")
        print("\n" + "=" * 80)
        print("Deployment Summary:")
        print("=" * 80)
        print(f"Deploy Hash: {deploy_hash}")
        print(f"Node Address: {NODE_ADDRESS}")
        print(f"Chain Name: {CHAIN_NAME}")
        print(f"Base Fee Rate: {BASE_FEE_RATE} motes")
        print(f"Max Fee Rate: {MAX_FEE_RATE} motes")
        print("=" * 80)
    else:
        print("❌ Deployment failed or timed out")
        sys.exit(1)

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("\nChecking prerequisites...")
    
    # Check if casper-client is installed
    try:
        result = subprocess.run(
            ["casper-client", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ casper-client found: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ casper-client not found. Please install it first.")
        print("   Visit: https://docs.casper.network/developers/prerequisites/")
        return False
    
    # Check if secret key exists
    secret_key = os.path.expanduser(SECRET_KEY_PATH)
    if not os.path.exists(secret_key):
        print(f"❌ Secret key not found at: {secret_key}")
        print("   Please set CASPER_SECRET_KEY environment variable")
        return False
    print(f"✅ Secret key found: {secret_key}")
    
    # Check if WASM file exists
    wasm_path = "target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm"
    if not os.path.exists(wasm_path):
        print(f"❌ WASM file not found at: {wasm_path}")
        print("   Please build the contract first with: cargo build --release --target wasm32-unknown-unknown")
        return False
    print(f"✅ WASM file found: {wasm_path}")
    
    return True

def build_contract():
    """Build the contract"""
    try:
        subprocess.run(
            ["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"],
            check=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        return False

def check_account_balance():
    """Check the deployer account balance"""
    try:
        secret_key = os.path.expanduser(SECRET_KEY_PATH)
        public_key_path = secret_key.replace("secret_key.pem", "public_key.pem")
        
        # Get public key from public key file
        result = subprocess.run(
            ["casper-client", "account-address", "--public-key", public_key_path],
            capture_output=True,
            text=True,
            check=True
        )
        
        account_hash = result.stdout.strip()
        print(f"   Account: {account_hash}")
        
        # Note: Balance checking requires a running node, so we'll skip the actual balance query
        print(f"   Balance check completed (skipped - requires live node)")
        return True
            
    except Exception as e:
        print(f"   Could not check balance: {e}")
        return False

def deploy_contract():
    """Deploy the contract to the network"""
    try:
        secret_key = os.path.expanduser(SECRET_KEY_PATH)
        public_key_path = secret_key.replace("secret_key.pem", "public_key.pem")
        wasm_path = "target/wasm32-unknown-unknown/release/casper_vault_facilitator.wasm"
        
        # Get deployer account hash for admin and fee recipient if not set
        result = subprocess.run(
            ["casper-client", "account-address", "--public-key", public_key_path],
            capture_output=True,
            text=True,
            check=True
        )
        deployer_account = result.stdout.strip()
        
        admin = ADMIN_ACCOUNT if ADMIN_ACCOUNT else deployer_account
        fee_recipient = FEE_RECIPIENT_ACCOUNT if FEE_RECIPIENT_ACCOUNT else deployer_account
        
        print(f"   Admin: {admin}")
        print(f"   Fee Recipient: {fee_recipient}")
        print(f"   Base Fee Rate: {BASE_FEE_RATE}")
        print(f"   Max Fee Rate: {MAX_FEE_RATE}")
        
        # Deploy command
        cmd = [
            "casper-client", "put-deploy",
            "--node-address", NODE_ADDRESS,
            "--chain-name", CHAIN_NAME,
            "--secret-key", secret_key,
            "--payment-amount", PAYMENT_AMOUNT,
            "--session-path", wasm_path,
            "--session-arg", f"admin:account_hash='{admin}'",
            "--session-arg", f"fee_recipient:account_hash='{fee_recipient}'",
            "--session-arg", f"base_fee_rate:u64='{BASE_FEE_RATE}'",
            "--session-arg", f"max_fee_rate:u64='{MAX_FEE_RATE}'"
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Parse deploy hash from output
        output = result.stdout
        if "deploy_hash" in output:
            # Try to parse as JSON
            try:
                data = json.loads(output)
                return data.get("result", {}).get("deploy_hash", "")
            except json.JSONDecodeError:
                # Try to extract from text
                for line in output.split('\n'):
                    if "deploy_hash" in line.lower():
                        parts = line.split(':')
                        if len(parts) > 1:
                            return parts[1].strip().strip('"').strip(',')
        
        return None
        
    except subprocess.CalledProcessError as e:
        print(f"Deployment failed: {e}")
        print(f"Output: {e.output}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def wait_for_deployment(deploy_hash, timeout=300):
    """Wait for deployment to complete"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            result = subprocess.run(
                ["casper-client", "get-deploy",
                 "--node-address", NODE_ADDRESS,
                 deploy_hash],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Check if deployment is complete
            if "execution_results" in result.stdout:
                try:
                    data = json.loads(result.stdout)
                    execution_results = data.get("result", {}).get("execution_results", [])
                    
                    if execution_results:
                        result_data = execution_results[0].get("result", {})
                        
                        if "Success" in result_data:
                            return True
                        elif "Failure" in result_data:
                            print(f"❌ Deployment failed: {result_data.get('Failure', {})}")
                            return False
                except json.JSONDecodeError:
                    pass
            
            print("   Waiting for deployment... (checking again in 10 seconds)")
            time.sleep(10)
            
        except subprocess.CalledProcessError:
            print("   Deploy not found yet, waiting...")
            time.sleep(10)
    
    print(f"❌ Timeout waiting for deployment after {timeout} seconds")
    return False

if __name__ == "__main__":
    main()
