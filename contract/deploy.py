#!/usr/bin/env python3
"""
Casper Contract Deployment Script with Auth Token Support
"""

import json
import subprocess
import sys
import os
import tempfile
from pathlib import Path

def load_env():
    """Load environment variables from .env file"""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    os.environ[key] = value

def main():
    load_env()
    
    # Configuration
    node_address = os.getenv("CASPER_NODE_ADDRESS", "https://node.testnet.cspr.cloud")
    chain_name = "casper-test"
    payment_amount = "100000000000"
    secret_key = "./keys/secret_key.pem"
    wasm_path = "./wasm/Cep18Permit.wasm"
    auth_token = os.getenv("CASPER_AUTH_TOKEN", "")
    
    print("🚀 Deploying Cep18Permit Contract to Casper Testnet")
    print("=" * 50)
    print(f"Node Address: {node_address}")
    print(f"Chain Name: {chain_name}")
    print(f"Payment Amount: {payment_amount} motes")
    print(f"WASM Path: {wasm_path}")
    print()
    
    # Validation
    if not Path(wasm_path).exists():
        print(f"❌ Error: WASM file not found at {wasm_path}")
        sys.exit(1)
    
    if not Path(secret_key).exists():
        print(f"❌ Error: Secret key not found at {secret_key}")
        sys.exit(1)
    
    if not auth_token:
        print("❌ Error: CASPER_AUTH_TOKEN not set")
        sys.exit(1)
    
    print("📝 Creating and signing transaction...")
    
    # Create temporary file for transaction
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_tx = f.name
    
    try:
        # Get public key hex
        with open("keys/public_key_hex", 'r') as f:
            public_key = f.read().strip()
        
        # Create the transaction (without connecting to node)
        cmd = [
            "casper-client", "put-transaction", "session",
            "--node-address", "http://localhost:7777",  # Dummy address, won't be used
            "--chain-name", chain_name,
            "--secret-key", secret_key,
            "--wasm-path", wasm_path,
            "--payment-amount", payment_amount,
            "--gas-price-tolerance", "1",
            "--standard-payment", "true",
            "--output", temp_tx
        ]
        
        print(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to create transaction:")
            print(result.stderr)
            sys.exit(1)
        
        print("✅ Transaction created and signed")
        
        # Read the transaction
        with open(temp_tx, 'r') as f:
            tx_data = f.read()
        
        print("🔐 Sending signed transaction with authentication...")
        
        # Send the transaction with auth header
        import urllib.request
        import urllib.error
        
        req = urllib.request.Request(
            f"{node_address}/rpc",
            data=tx_data.encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': auth_token
            },
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                response_data = response.read().decode('utf-8')
                response_json = json.loads(response_data)
                
                print("✅ Transaction submitted successfully!")
                print(json.dumps(response_json, indent=2))
                
                # Extract deploy hash if available
                if 'result' in response_json:
                    print(f"\n📋 Deploy Hash: {response_json['result']}")
        
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8')
            print(f"❌ HTTP Error {e.code}:")
            try:
                print(json.dumps(json.loads(error_data), indent=2))
            except:
                print(error_data)
            sys.exit(1)
        
        print("\nMonitor your deployment at: https://testnet.cspr.cloud/")
    
    finally:
        # Cleanup
        if Path(temp_tx).exists():
            Path(temp_tx).unlink()

if __name__ == "__main__":
    main()
