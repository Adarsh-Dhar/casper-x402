// State management logic and tests

use crate::access_control::{Account, AccessControl};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ContractHash([u8; 32]);

impl ContractHash {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PublicKey([u8; 32]);

impl PublicKey {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

#[derive(Debug, Clone)]
pub struct SignerInfo {
    pub account_hash: Account,
    pub public_key: PublicKey,
    pub weight: u32,
    pub is_active: bool,
}

impl SignerInfo {
    pub fn new(account_hash: Account, public_key: PublicKey, weight: u32) -> Self {
        Self {
            account_hash,
            public_key,
            weight,
            is_active: true,
        }
    }
}

pub struct ContractState {
    pub access_control: AccessControl,
    pub fee_recipient: Account,
    pub base_fee_rate: u64,
    pub max_fee_rate: u64,
    pub is_paused: bool,
    pub supported_tokens: Vec<ContractHash>,
    pub signer_pool: Vec<SignerInfo>,
    pub user_balances: HashMap<(Account, ContractHash), u64>,
}

impl ContractState {
    pub fn new(admin: Account, fee_recipient: Account, base_fee_rate: u64, max_fee_rate: u64) -> Self {
        Self {
            access_control: AccessControl::new(admin),
            fee_recipient,
            base_fee_rate,
            max_fee_rate,
            is_paused: false,
            supported_tokens: Vec::new(),
            signer_pool: Vec::new(),
            user_balances: HashMap::new(),
        }
    }

    pub fn pause(&mut self, caller: &Account) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        if self.is_paused {
            Err("Already paused")
        } else {
            self.is_paused = true;
            Ok(())
        }
    }

    pub fn unpause(&mut self, caller: &Account) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        if !self.is_paused {
            Err("Already unpaused")
        } else {
            self.is_paused = false;
            Ok(())
        }
    }

    pub fn add_supported_token(&mut self, caller: &Account, token: ContractHash) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        
        if self.supported_tokens.contains(&token) {
            Err("Token already supported")
        } else {
            self.supported_tokens.push(token);
            Ok(())
        }
    }

    pub fn remove_supported_token(&mut self, caller: &Account, token: &ContractHash) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        
        if let Some(pos) = self.supported_tokens.iter().position(|t| t == token) {
            self.supported_tokens.remove(pos);
            Ok(())
        } else {
            Err("Token not found")
        }
    }

    pub fn add_signer(&mut self, caller: &Account, signer: SignerInfo) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        
        if self.signer_pool.iter().any(|s| s.account_hash == signer.account_hash) {
            Err("Signer already exists")
        } else {
            self.signer_pool.push(signer);
            Ok(())
        }
    }

    pub fn remove_signer(&mut self, caller: &Account, account_hash: &Account) -> Result<(), &'static str> {
        self.access_control.require_admin(caller)?;
        
        if let Some(pos) = self.signer_pool.iter().position(|s| s.account_hash == *account_hash) {
            self.signer_pool.remove(pos);
            Ok(())
        } else {
            Err("Signer not found")
        }
    }

    pub fn is_token_supported(&self, token: &ContractHash) -> bool {
        self.supported_tokens.contains(token)
    }

    pub fn get_total_signer_weight(&self) -> u32 {
        self.signer_pool.iter().filter(|s| s.is_active).map(|s| s.weight).sum()
    }

    pub fn process_transaction(&self, _signature: &str, transaction_data: &[u8], fee_token: Option<&ContractHash>) -> Result<(), &'static str> {
        if self.is_paused {
            return Err("Contract is paused");
        }

        if transaction_data.is_empty() {
            return Err("Empty transaction data");
        }

        if let Some(token) = fee_token {
            if !self.is_token_supported(token) {
                return Err("Unsupported fee token");
            }
        }

        Ok(())
    }

    pub fn set_user_balance(&mut self, user: Account, token: ContractHash, balance: u64) {
        self.user_balances.insert((user, token), balance);
    }

    pub fn get_user_balance(&self, user: &Account, token: &ContractHash) -> u64 {
        self.user_balances.get(&(user.clone(), token.clone())).copied().unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_state() -> ContractState {
        let admin = Account::new([1u8; 32]);
        let fee_recipient = Account::new([2u8; 32]);
        ContractState::new(admin, fee_recipient, 1000, 10000)
    }

    #[test]
    fn test_state_initialization() {
        let state = create_test_state();
        
        assert_eq!(state.base_fee_rate, 1000);
        assert_eq!(state.max_fee_rate, 10000);
        assert!(!state.is_paused);
        assert!(state.supported_tokens.is_empty());
        assert!(state.signer_pool.is_empty());
        assert!(state.user_balances.is_empty());
    }

    #[test]
    fn test_pause_unpause() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        let user = Account::new([3u8; 32]);
        
        // Initially not paused
        assert!(!state.is_paused);
        
        // User cannot pause
        assert!(state.pause(&user).is_err());
        assert!(!state.is_paused);
        
        // Admin can pause
        assert!(state.pause(&admin).is_ok());
        assert!(state.is_paused);
        
        // Cannot pause when already paused
        assert!(state.pause(&admin).is_err());
        
        // Admin can unpause
        assert!(state.unpause(&admin).is_ok());
        assert!(!state.is_paused);
        
        // Cannot unpause when already unpaused
        assert!(state.unpause(&admin).is_err());
    }

    #[test]
    fn test_token_management() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        let user = Account::new([3u8; 32]);
        let token = ContractHash::new([100u8; 32]);
        
        // Initially no tokens
        assert!(!state.is_token_supported(&token));
        assert_eq!(state.supported_tokens.len(), 0);
        
        // User cannot add token
        assert!(state.add_supported_token(&user, token.clone()).is_err());
        
        // Admin can add token
        assert!(state.add_supported_token(&admin, token.clone()).is_ok());
        assert!(state.is_token_supported(&token));
        assert_eq!(state.supported_tokens.len(), 1);
        
        // Cannot add duplicate token
        assert!(state.add_supported_token(&admin, token.clone()).is_err());
        assert_eq!(state.supported_tokens.len(), 1);
        
        // Admin can remove token
        assert!(state.remove_supported_token(&admin, &token).is_ok());
        assert!(!state.is_token_supported(&token));
        assert_eq!(state.supported_tokens.len(), 0);
        
        // Cannot remove non-existent token
        assert!(state.remove_supported_token(&admin, &token).is_err());
    }

    #[test]
    fn test_signer_management() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        let user = Account::new([3u8; 32]);
        
        let signer_account = Account::new([50u8; 32]);
        let signer_pubkey = PublicKey::new([50u8; 32]);
        let signer = SignerInfo::new(signer_account.clone(), signer_pubkey, 100);
        
        // Initially no signers
        assert_eq!(state.signer_pool.len(), 0);
        assert_eq!(state.get_total_signer_weight(), 0);
        
        // User cannot add signer
        assert!(state.add_signer(&user, signer.clone()).is_err());
        
        // Admin can add signer
        assert!(state.add_signer(&admin, signer.clone()).is_ok());
        assert_eq!(state.signer_pool.len(), 1);
        assert_eq!(state.get_total_signer_weight(), 100);
        
        // Cannot add duplicate signer
        assert!(state.add_signer(&admin, signer).is_err());
        assert_eq!(state.signer_pool.len(), 1);
        
        // Admin can remove signer
        assert!(state.remove_signer(&admin, &signer_account).is_ok());
        assert_eq!(state.signer_pool.len(), 0);
        assert_eq!(state.get_total_signer_weight(), 0);
        
        // Cannot remove non-existent signer
        assert!(state.remove_signer(&admin, &signer_account).is_err());
    }

    #[test]
    fn test_multiple_signers() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        
        // Add multiple signers with different weights
        for i in 1..=5 {
            let account = Account::new([i + 10; 32]);
            let pubkey = PublicKey::new([i + 10; 32]);
            let signer = SignerInfo::new(account, pubkey, (i * 50) as u32);
            
            assert!(state.add_signer(&admin, signer).is_ok());
        }
        
        assert_eq!(state.signer_pool.len(), 5);
        assert_eq!(state.get_total_signer_weight(), 750); // 50 + 100 + 150 + 200 + 250
        
        // Verify individual signer weights
        for (i, signer) in state.signer_pool.iter().enumerate() {
            assert_eq!(signer.weight, ((i + 1) as u32) * 50);
            assert!(signer.is_active);
        }
    }

    #[test]
    fn test_transaction_processing() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        let token = ContractHash::new([100u8; 32]);
        
        // Add supported token
        state.add_supported_token(&admin, token.clone()).unwrap();
        
        let transaction_data = vec![1, 2, 3, 4, 5];
        
        // Process transaction without fee token
        assert!(state.process_transaction("signature", &transaction_data, None).is_ok());
        
        // Process transaction with supported fee token
        assert!(state.process_transaction("signature", &transaction_data, Some(&token)).is_ok());
        
        // Process transaction with unsupported fee token
        let unsupported_token = ContractHash::new([200u8; 32]);
        assert!(state.process_transaction("signature", &transaction_data, Some(&unsupported_token)).is_err());
        
        // Process empty transaction
        assert!(state.process_transaction("signature", &[], None).is_err());
        
        // Process transaction when paused
        state.pause(&admin).unwrap();
        assert!(state.process_transaction("signature", &transaction_data, None).is_err());
        
        // Should work again when unpaused
        state.unpause(&admin).unwrap();
        assert!(state.process_transaction("signature", &transaction_data, None).is_ok());
    }

    #[test]
    fn test_user_balances() {
        let mut state = create_test_state();
        let user = Account::new([10u8; 32]);
        let token = ContractHash::new([100u8; 32]);
        
        // Initially zero balance
        assert_eq!(state.get_user_balance(&user, &token), 0);
        
        // Set balance
        state.set_user_balance(user.clone(), token.clone(), 1000);
        assert_eq!(state.get_user_balance(&user, &token), 1000);
        
        // Update balance
        state.set_user_balance(user.clone(), token.clone(), 2000);
        assert_eq!(state.get_user_balance(&user, &token), 2000);
        
        // Different token should have zero balance
        let other_token = ContractHash::new([101u8; 32]);
        assert_eq!(state.get_user_balance(&user, &other_token), 0);
    }

    #[test]
    fn test_complex_state_operations() {
        let mut state = create_test_state();
        let admin = Account::new([1u8; 32]);
        
        // Add multiple tokens
        let tokens: Vec<ContractHash> = (1..=3).map(|i| ContractHash::new([i; 32])).collect();
        for token in &tokens {
            state.add_supported_token(&admin, token.clone()).unwrap();
        }
        
        // Add multiple signers
        let signers: Vec<SignerInfo> = (1u32..=3).map(|i| {
            let account = Account::new([i as u8 + 10; 32]);
            let pubkey = PublicKey::new([i as u8 + 10; 32]);
            SignerInfo::new(account, pubkey, i * 100)
        }).collect();
        
        for signer in &signers {
            state.add_signer(&admin, signer.clone()).unwrap();
        }
        
        // Set user balances
        let user = Account::new([20u8; 32]);
        for (i, token) in tokens.iter().enumerate() {
            state.set_user_balance(user.clone(), token.clone(), (i + 1) as u64 * 1000);
        }
        
        // Verify state
        assert_eq!(state.supported_tokens.len(), 3);
        assert_eq!(state.signer_pool.len(), 3);
        assert_eq!(state.get_total_signer_weight(), 600); // 100 + 200 + 300
        
        for (i, token) in tokens.iter().enumerate() {
            assert_eq!(state.get_user_balance(&user, token), (i + 1) as u64 * 1000);
        }
        
        // Test transaction processing with all tokens
        let transaction_data = vec![1, 2, 3];
        for token in &tokens {
            assert!(state.process_transaction("sig", &transaction_data, Some(token)).is_ok());
        }
        
        // Pause and verify transactions fail
        state.pause(&admin).unwrap();
        for token in &tokens {
            assert!(state.process_transaction("sig", &transaction_data, Some(token)).is_err());
        }
        
        // Unpause and verify transactions work again
        state.unpause(&admin).unwrap();
        for token in &tokens {
            assert!(state.process_transaction("sig", &transaction_data, Some(token)).is_ok());
        }
    }
}