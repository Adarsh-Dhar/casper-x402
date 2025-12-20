#!/usr/bin/env python3
"""
Derive account hash from public key for Casper.
"""

import hashlib
import subprocess
import sys

def derive_account_hash_from_pubkey(public_key_hex):
    """Derive account hash from public key hex."""
    print(f"🔑 Public Key: {public_key_hex}")
    
    # Remove any whitespace and ensure it's lowercase
    public_key_hex = public_key_hex.strip().lower()
    
    # Convert hex to bytes
    try:
        public_key_bytes = bytes.fromhex(public_key_hex)
        print(f"📏 Public key length: {len(public_key_bytes)} bytes")
    except ValueError as e:
        print(f"❌ Invalid hex format: {e}")
        return None
    
    # For Casper, account hash is blake2b hash of the public key
    account_hash_bytes = hashlib.blake2b(public_key_bytes, digest_size=32).digest()
    account_hash_hex = account_hash_bytes.hex()
    
    # Format as Casper account hash
    account_hash = f"account-hash-{account_hash_hex}"
    
    print(f"🏦 Account Hash: {account_hash}")
    return account_hash

def get_account_hash_from_casper_client():
    """Get account hash using casper-client."""
    print("🔍 Getting account hash using casper-client...")
    try:
        result = subprocess.run(
            ["casper-client", "account-address", "--public-key", "keys/public_key_hex"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            # Parse the output to extract account hash
            output = result.stdout.strip()
            print(f"✅ Casper client output: {output}")
            
            # The output should contain the account hash
            if "account-hash-" in output:
                account_hash = output.split("account-hash-")[1].split()[0]
                return f"account-hash-{account_hash}"
            else:
                return output
        else:
            print(f"❌ Casper client error: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error running casper-client: {e}")
        return None

def main():
    """Main function."""
    print("=" * 60)
    print("🎯 Casper Account Hash Derivation")
    print("=" * 60)
    
    # Read public key from file
    try:
        with open("keys/public_key_hex", "r") as f:
            public_key_hex = f.read().strip()
    except FileNotFoundError:
        print("❌ Public key file not found!")
        return 1
    
    # Method 1: Manual derivation
    print("\n📊 Method 1: Manual Blake2b derivation")
    manual_hash = derive_account_hash_from_pubkey(public_key_hex)
    
    # Method 2: Using casper-client
    print("\n📊 Method 2: Using casper-client")
    client_hash = get_account_hash_from_casper_client()
    
    print("\n" + "=" * 60)
    print("📋 RESULTS")
    print("=" * 60)
    if manual_hash:
        print(f"Manual derivation: {manual_hash}")
    if client_hash:
        print(f"Casper client:     {client_hash}")
    
    # Use the casper-client result if available, otherwise manual
    final_hash = client_hash if client_hash else manual_hash
    
    if final_hash:
        print(f"\n🎯 Final Account Hash: {final_hash}")
        print(f"🌐 Explorer: https://testnet.cspr.live/account/{final_hash}")
        return final_hash
    else:
        print("❌ Could not derive account hash!")
        return None

if __name__ == "__main__":
    result = main()
    if result:
        sys.exit(0)
    else:
        sys.exit(1)