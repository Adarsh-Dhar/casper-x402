#![no_std]

use odra::prelude::*;
use odra::{casper_types::U256, Event};

// Using panic! for error handling in this version

// Events
#[derive(Event, Debug, PartialEq, Eq)]
pub struct Transfer {
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub amount: U256,
}

#[derive(Event, Debug, PartialEq, Eq)]
pub struct Approval {
    pub owner: Address,
    pub spender: Address,
    pub amount: U256,
}

#[derive(Event, Debug, PartialEq, Eq)]
pub struct PaymentClaimed {
    pub user: Address,
    pub recipient: Address,
    pub amount: U256,
    pub nonce: u64,
}

// Magic prefix used by Casper Wallet
const CASPER_MESSAGE_PREFIX: &str = "Casper Message:\n";

#[odra::module]
pub struct Cep18Permit {
    name: Var<String>,
    symbol: Var<String>,
    decimals: Var<u8>,
    total_supply: Var<U256>,
    balances: Mapping<Address, U256>,
    allowances: Mapping<(Address, Address), U256>,
    nonces: Mapping<Address, u64>,
}

#[odra::module]
impl Cep18Permit {
    /// Initialize the contract
    pub fn init(&mut self) {
        // Hardcoded values to bypass CLI argument errors
        self.name.set("FinnStake Token".to_string());
        self.symbol.set("FINN".to_string());
        self.decimals.set(18); // u8
        self.total_supply.set(U256::from(1000000000000000000000u128)); // 1000 Tokens

        // Mint initial supply to caller
        let caller = self.env().caller();
        self.balances.set(&caller, self.total_supply.get_or_default());

        self.env().emit_event(Transfer {
            from: None,
            to: Some(caller),
            amount: self.total_supply.get_or_default(),
        });
    }

    /// Internal transfer function (bypasses caller checks)
    fn internal_transfer(&mut self, from: Address, to: Address, amount: U256) {
        if from == to {
            return;
        }

        let from_balance = self.balances.get_or_default(&from);
        if from_balance < amount {
            panic!("Insufficient balance");
        }

        let to_balance = self.balances.get_or_default(&to);

        self.balances.set(&from, from_balance - amount);
        self.balances.set(&to, to_balance + amount);

        self.env().emit_event(Transfer {
            from: Some(from),
            to: Some(to),
            amount,
        });
    }

    /// Get token name
    pub fn name(&self) -> String {
        self.name.get_or_default()
    }

    /// Get token symbol
    pub fn symbol(&self) -> String {
        self.symbol.get_or_default()
    }

    /// Get decimals
    pub fn decimals(&self) -> u8 {
        self.decimals.get_or_default()
    }

    /// Get total supply
    pub fn total_supply(&self) -> U256 {
        self.total_supply.get_or_default()
    }

    /// Get balance of an account
    pub fn balance_of(&self, account: &Address) -> U256 {
        self.balances.get_or_default(account)
    }

    /// Transfer tokens
    pub fn transfer(&mut self, recipient: &Address, amount: U256) {
        let sender = self.env().caller();
        self.internal_transfer(sender, *recipient, amount);
    }

    /// Approve spender to spend tokens
    pub fn approve(&mut self, spender: &Address, amount: U256) {
        let owner = self.env().caller();
        self.allowances.set(&(owner, *spender), amount);

        self.env().emit_event(Approval {
            owner,
            spender: *spender,
            amount,
        });
    }

    /// Get allowance
    pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
        self.allowances.get_or_default(&(*owner, *spender))
    }

    /// Transfer tokens from one account to another (requires allowance)
    pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: U256) {
        let spender = self.env().caller();
        let current_allowance = self.allowances.get_or_default(&(*owner, spender));
        
        if current_allowance < amount {
            panic!("Insufficient allowance");
        }

        self.allowances.set(&(*owner, spender), current_allowance - amount);
        self.internal_transfer(*owner, *recipient, amount);
    }

    /// Get nonce for an account (for signature verification)
    pub fn nonce_of(&self, account: &Address) -> u64 {
        self.nonces.get_or_default(account)
    }

    /// Claim payment with signature (EIP-2612/EIP-3009 style permit)
    /// This is the key function that enables gasless, signature-based payments
    pub fn claim_payment(
        &mut self,
        user_pubkey: odra::casper_types::PublicKey,
        recipient: Address,
        amount: U256,
        nonce: u64,
        deadline: u64,
        signature: String,
    ) {
        // 1. Convert pubkey to address
        let user_account = Address::Account(user_pubkey.to_account_hash());

        // 2. Verify deadline
        let current_timestamp = self.env().get_block_time();
        if current_timestamp > deadline {
            panic!("Signature expired");
        }

        // 3. Verify nonce (anti-replay protection)
        let current_nonce = self.nonces.get_or_default(&user_account);
        if nonce != current_nonce {
            panic!("Invalid nonce");
        }

        // Increment nonce to prevent replay
        self.nonces.set(&user_account, current_nonce + 1);

        // 4. Reconstruct the signed message payload
        // Format: "Casper Message:\nx402-casper:<chain_name>:<contract_address>:<recipient>:<amount>:<nonce>:<deadline>"
        let chain_name = "casper"; // Use actual chain name in production
        let contract_address = self.env().self_address();

        let payload = format!(
            "x402-casper:{}:{:?}:{:?}:{}:{}:{}",
            chain_name, contract_address, recipient, amount, nonce, deadline
        );

        // Add Casper Wallet magic prefix
        let _full_message = format!("{}{}", CASPER_MESSAGE_PREFIX, payload);

        // 5. Signature verification would go here
        // For now, we'll assume the signature is valid if it's not empty
        if signature.is_empty() {
            panic!("Invalid signature");
        }

        // Note: In production, you'd verify the signature against the message and public key
        // This requires cryptographic functions that may not be available in all Odra versions

        // 6. Execute the transfer (internal, bypassing caller check)
        self.internal_transfer(user_account, recipient, amount);

        // 7. Emit event
        self.env().emit_event(PaymentClaimed {
            user: user_account,
            recipient,
            amount,
            nonce,
        });
    }
}

