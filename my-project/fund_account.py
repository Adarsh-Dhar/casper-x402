#!/usr/bin/env python3
"""
Instructions and tools for funding the Casper testnet account.
"""

def main():
    """Main function with funding instructions."""
    print("=" * 60)
    print("💰 Casper Testnet Account Funding")
    print("=" * 60)
    
    account_hash = "account-hash-9f6bc6ed963b3e2874785a348c83f1b446dd6feb9a235b5f854f6430bef48003"
    public_key = "0202cf7a3684779b612a1621927590b1384af1f515ed247a71cf36574273c86c6729"
    
    print(f"🏦 Account Hash: {account_hash}")
    print(f"🔑 Public Key: {public_key}")
    print(f"💰 Current Balance: 0 CSPR")
    print()
    
    print("📝 FUNDING INSTRUCTIONS:")
    print("=" * 40)
    print("1. Visit the Casper testnet faucet:")
    print("   🌐 https://testnet.cspr.live/tools/faucet")
    print()
    print("2. Enter your public key:")
    print(f"   📋 {public_key}")
    print()
    print("3. Request testnet CSPR (usually 1000 CSPR)")
    print()
    print("4. Wait for the transaction to complete (1-2 minutes)")
    print()
    print("5. Verify funding by checking your account:")
    print(f"   🌐 https://testnet.cspr.live/account/{account_hash}")
    print()
    
    print("🔧 ALTERNATIVE: Use casper-client to check balance:")
    print("=" * 50)
    print("casper-client get-account-info \\")
    print("  --node-address https://node.testnet.casper.network/rpc \\")
    print(f"  --account-identifier {account_hash}")
    print()
    
    print("⚡ QUICK LINKS:")
    print("=" * 20)
    print(f"🌐 Faucet: https://testnet.cspr.live/tools/faucet")
    print(f"🏦 Account: https://testnet.cspr.live/account/{account_hash}")
    print(f"📊 Explorer: https://testnet.cspr.live/")
    print()
    
    print("💡 TIPS:")
    print("=" * 10)
    print("• Request 1000+ CSPR for multiple deployments")
    print("• Each deployment costs ~350 CSPR")
    print("• Keep some CSPR for gas fees")
    print("• Faucet may have daily limits")
    print()
    
    print("🚀 AFTER FUNDING:")
    print("=" * 20)
    print("Run the deployment script:")
    print("  python3 deploy_flipper_direct.py")
    print()

if __name__ == "__main__":
    main()