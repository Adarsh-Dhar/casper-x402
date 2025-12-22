#!/usr/bin/env python3
"""
Deploy contracts for the x402 demo
"""

import subprocess
import os
import datetime
import json
import time

# Configuration
NODE_ADDRESS = "https://node.testnet.casper.network/rpc"
CHAIN_NAME = "casper-test"
SECRET_KEY_PATH = "./keys/secret_key.pem"
PUBLIC_KEY_PATH = "./keys/public_key.pem"
PAYMENT_AMOUNT = "350000000000"  # 350 CSPR

def get_account_info():
    """Get account hash and check balance"""
    try:
        # Get account hash
        result = subprocess.run(
            ["casper-client", "account-address", "--public-key", PUBLIC_KEY_PATH],
            capture_output=True,
            text=True,
            check=True
        )
        account_hash = result.stdout.strip()
        print(f"📋 Account: {account_hash}")
        
        # Check balance
        try:
            balance_result = subprocess.run(
                ["casper-client", "get-balance", 
                 "--node-address", NODE_ADDRESS,
                 "--public-key", PUBLIC_KEY_PATH],
                capture_output=True,
                text=True,
                check=True
            )
            balance = balance_result.stdout.strip()
            print(f"💰 Balance: {balance}")
            
            # Convert to CSPR (divide by 10^9)
            try:
                balance_motes = int(balance)
                balance_cspr = balance_motes / 1_000_000_000
                print(f"💰 Balance: {balance_cspr:.2f} CSPR")
                
                if balance_cspr < 1000:  # Need at least 1000 CSPR for deployments
                    print(f"⚠️ Warning: Low balance. You may need more CSPR for deployments.")
                    print(f"🔗 Get testnet CSPR: https://testnet.cspr.live/tools/faucet")
                    
            except ValueError:
                pass
                
        except subprocess.CalledProcessError:
            print("⚠️ Could not check balance")
        
        return account_hash
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to get account info: {e}")
        return None

def deploy_contract(wasm_path, session_args=None, contract_name="contract"):
    """Deploy a contract with optional session arguments"""
    print(f"\n🚀 Deploying {contract_name}...")
    
    if not os.path.exists(wasm_path):
        print(f"❌ WASM not found: {wasm_path}")
        return None
    
    wasm_size = os.path.getsize(wasm_path)
    print(f"✅ WASM size: {wasm_size} bytes")
    
    # Get timestamp
    timestamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    try:
        # Build command
        cmd = [
            "casper-client", "put-deploy",
            "--node-address", NODE_ADDRESS,
            "--chain-name", CHAIN_NAME,
            "--secret-key", SECRET_KEY_PATH,
            "--payment-amount", PAYMENT_AMOUNT,
            "--session-path", wasm_path,
            "--timestamp", timestamp_str
        ]
        
        # Add session arguments if provided
        if session_args:
            for arg in session_args:
                cmd.extend(["--session-arg", arg])
        
        print(f"📝 Command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        if result.returncode == 0:
            # Extract deploy hash
            deploy_hash = None
            for line in result.stdout.split('\n'):
                if '"deploy_hash"' in line:
                    try:
                        if ':' in line:
                            hash_part = line.split(':')[1].strip().strip('"').strip(',')
                            if len(hash_part) == 64:
                                deploy_hash = hash_part
                    except:
                        pass
            
            if not deploy_hash:
                try:
                    data = json.loads(result.stdout)
                    deploy_hash = data.get("result", {}).get("deploy_hash", "")
                except:
                    pass
            
            if deploy_hash:
                print(f"✅ {contract_name} deployed successfully!")
                print(f"📝 Deploy Hash: {deploy_hash}")
                print(f"🔗 Explorer: https://testnet.cspr.live/deploy/{deploy_hash}")
                return deploy_hash
            else:
                print(f"❌ Could not extract deploy hash for {contract_name}")
                return None
        else:
            print(f"❌ {contract_name} deployment failed!")
            return None
        
    except Exception as e:
        print(f"❌ Error deploying {contract_name}: {e}")
        return None

def wait_for_deploy(deploy_hash, contract_name, timeout=300):
    """Wait for deploy to complete and get contract hash"""
    print(f"\n⏳ Waiting for {contract_name} deployment to complete...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            result = subprocess.run(
                ["casper-client", "get-deploy",
                 "--node-address", NODE_ADDRESS,
                 deploy_hash],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    execution_results = data.get("result", {}).get("execution_results", [])
                    
                    if execution_results:
                        execution_result = execution_results[0].get("result")
                        
                        if "Success" in execution_result:
                            print(f"✅ {contract_name} deployment successful!")
                            
                            # Extract contract hash from transforms
                            transforms = execution_result.get("Success", {}).get("transforms", [])
                            contract_hash = None
                            
                            for transform in transforms:
                                if "WriteContract" in transform.get("transform", {}):
                                    contract_hash = transform.get("key", "")
                                    if contract_hash.startswith("hash-"):
                                        break
                            
                            if contract_hash:
                                print(f"📋 Contract Hash: {contract_hash}")
                                return contract_hash
                            else:
                                print(f"⚠️ Could not extract contract hash for {contract_name}")
                                return deploy_hash  # Return deploy hash as fallback
                                
                        elif "Failure" in execution_result:
                            error_msg = execution_result.get("Failure", {}).get("error_message", "Unknown error")
                            print(f"❌ {contract_name} deployment failed: {error_msg}")
                            return None
                            
                except json.JSONDecodeError:
                    pass
            
            print(f"⏳ Still waiting for {contract_name}... ({int(time.time() - start_time)}s)")
            time.sleep(10)
            
        except Exception as e:
            print(f"⚠️ Error checking deploy status: {e}")
            time.sleep(10)
    
    print(f"⏰ Timeout waiting for {contract_name} deployment")
    return None

def deploy_facilitator_contract():
    """Deploy the facilitator contract"""
    wasm_path = "./target/wasm32-unknown-unknown/release/fixed_minimal.wasm"
    
    # Session arguments for the facilitator contract
    session_args = [
        "name:string='X402Token'",
        "symbol:string='X402'", 
        "decimals:u8='9'",
        "total_supply:u256='1000000000000000000'"  # 1 token with 18 decimals
    ]
    
    deploy_hash = deploy_contract(wasm_path, session_args, "Facilitator Contract")
    
    if deploy_hash:
        contract_hash = wait_for_deploy(deploy_hash, "Facilitator Contract")
        return deploy_hash, contract_hash
    
    return None, None

def deploy_cep18_token():
    """Deploy the CEP18 token contract"""
    wasm_path = "./target/wasm32-unknown-unknown/release/cep18_copy.wasm"
    
    # Session arguments for CEP18 token
    session_args = [
        "name:string='X402PaymentToken'",
        "symbol:string='X402PAY'",
        "decimals:u8='9'",
        "total_supply:u256='1000000000000000000000'"  # 1000 tokens with 9 decimals
    ]
    
    deploy_hash = deploy_contract(wasm_path, session_args, "CEP18 Token")
    
    if deploy_hash:
        contract_hash = wait_for_deploy(deploy_hash, "CEP18 Token")
        return deploy_hash, contract_hash
    
    return None, None

def update_demo_env(facilitator_hash, cep18_hash):
    """Update the x402 demo .env file with contract hashes"""
    env_path = "./docs/x402/demo/.env"
    
    if not os.path.exists(env_path):
        print(f"⚠️ Demo .env file not found: {env_path}")
        return
    
    try:
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Update contract hashes
        if facilitator_hash:
            content = content.replace(
                'FACILITATOR_CONTRACT_HASH=hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                f'FACILITATOR_CONTRACT_HASH={facilitator_hash}'
            )
        
        if cep18_hash:
            content = content.replace(
                'CEP18_TOKEN_CONTRACT_HASH=hash-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                f'CEP18_TOKEN_CONTRACT_HASH={cep18_hash}'
            )
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        print(f"✅ Updated demo .env file with contract hashes")
        
    except Exception as e:
        print(f"❌ Error updating demo .env file: {e}")

def main():
    print("=" * 80)
    print("🚀 X402 DEMO CONTRACT DEPLOYMENT")
    print("Deploying Facilitator and CEP18 Token contracts to Casper Testnet")
    print("=" * 80)
    
    # Test network connectivity
    try:
        result = subprocess.run(
            ["casper-client", "get-state-root-hash", "--node-address", NODE_ADDRESS],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("✅ Network connectivity OK")
        else:
            print(f"❌ Network test failed")
            return False
    except Exception as e:
        print(f"❌ Network error: {e}")
        return False
    
    # Get account info
    account_hash = get_account_info()
    if not account_hash:
        return False
    
    # Deploy contracts
    print(f"\n🎯 Starting contract deployments...")
    
    # Deploy facilitator contract
    facilitator_deploy, facilitator_hash = deploy_facilitator_contract()
    
    # Deploy CEP18 token
    cep18_deploy, cep18_hash = deploy_cep18_token()
    
    # Summary
    print(f"\n" + "=" * 80)
    print("📋 DEPLOYMENT SUMMARY")
    print("=" * 80)
    
    success = True
    
    if facilitator_deploy and facilitator_hash:
        print(f"✅ Facilitator Contract:")
        print(f"   Deploy Hash: {facilitator_deploy}")
        print(f"   Contract Hash: {facilitator_hash}")
        print(f"   Explorer: https://testnet.cspr.live/deploy/{facilitator_deploy}")
    else:
        print(f"❌ Facilitator Contract: FAILED")
        success = False
    
    if cep18_deploy and cep18_hash:
        print(f"✅ CEP18 Token Contract:")
        print(f"   Deploy Hash: {cep18_deploy}")
        print(f"   Contract Hash: {cep18_hash}")
        print(f"   Explorer: https://testnet.cspr.live/deploy/{cep18_deploy}")
    else:
        print(f"❌ CEP18 Token Contract: FAILED")
        success = False
    
    if success:
        # Update demo configuration
        update_demo_env(facilitator_hash, cep18_hash)
        
        # Save deployment info
        deployment_info = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "network": CHAIN_NAME,
            "node": NODE_ADDRESS,
            "account": account_hash,
            "facilitator": {
                "deploy_hash": facilitator_deploy,
                "contract_hash": facilitator_hash
            },
            "cep18": {
                "deploy_hash": cep18_deploy,
                "contract_hash": cep18_hash
            }
        }
        
        with open("x402_deployment.json", "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"\n🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!")
        print(f"📋 Deployment info saved: x402_deployment.json")
        print(f"📋 Demo .env file updated with contract hashes")
        print(f"\n🚀 Ready to run x402 demo with real contracts!")
        
    else:
        print(f"\n❌ SOME DEPLOYMENTS FAILED")
    
    return success

if __name__ == "__main__":
    success = main()
    if success:
        print(f"\n🎯 SUCCESS: All contracts deployed!")
    else:
        print(f"\n❌ FAILED: Check errors above")