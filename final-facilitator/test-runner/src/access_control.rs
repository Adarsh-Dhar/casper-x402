// Access control logic and tests

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Account([u8; 32]);

impl Account {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

pub struct AccessControl {
    admin: Account,
    operators: Vec<Account>,
}

impl AccessControl {
    pub fn new(admin: Account) -> Self {
        Self {
            admin,
            operators: Vec::new(),
        }
    }

    pub fn is_admin(&self, account: &Account) -> bool {
        *account == self.admin
    }

    pub fn is_operator(&self, account: &Account) -> bool {
        self.operators.contains(account)
    }

    pub fn add_operator(&mut self, account: Account) -> Result<(), &'static str> {
        if self.operators.contains(&account) {
            Err("Operator already exists")
        } else {
            self.operators.push(account);
            Ok(())
        }
    }

    pub fn remove_operator(&mut self, account: &Account) -> Result<(), &'static str> {
        if let Some(pos) = self.operators.iter().position(|op| op == account) {
            self.operators.remove(pos);
            Ok(())
        } else {
            Err("Operator not found")
        }
    }

    pub fn require_admin(&self, caller: &Account) -> Result<(), &'static str> {
        if self.is_admin(caller) {
            Ok(())
        } else {
            Err("Admin access required")
        }
    }

    pub fn require_operator(&self, caller: &Account) -> Result<(), &'static str> {
        if self.is_operator(caller) || self.is_admin(caller) {
            Ok(())
        } else {
            Err("Operator access required")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_access_control_creation() {
        let admin = Account::new([1u8; 32]);
        let ac = AccessControl::new(admin.clone());
        
        assert!(ac.is_admin(&admin));
        assert_eq!(ac.operators.len(), 0);
    }

    #[test]
    fn test_admin_access() {
        let admin = Account::new([1u8; 32]);
        let user = Account::new([2u8; 32]);
        let ac = AccessControl::new(admin.clone());
        
        assert!(ac.is_admin(&admin));
        assert!(!ac.is_admin(&user));
        
        assert!(ac.require_admin(&admin).is_ok());
        assert!(ac.require_admin(&user).is_err());
    }

    #[test]
    fn test_operator_management() {
        let admin = Account::new([1u8; 32]);
        let operator = Account::new([2u8; 32]);
        let user = Account::new([3u8; 32]);
        let mut ac = AccessControl::new(admin.clone());
        
        // Initially no operators
        assert!(!ac.is_operator(&operator));
        assert!(!ac.is_operator(&user));
        
        // Add operator
        assert!(ac.add_operator(operator.clone()).is_ok());
        assert!(ac.is_operator(&operator));
        assert!(!ac.is_operator(&user));
        
        // Try to add duplicate operator
        assert!(ac.add_operator(operator.clone()).is_err());
        assert_eq!(ac.operators.len(), 1);
        
        // Remove operator
        assert!(ac.remove_operator(&operator).is_ok());
        assert!(!ac.is_operator(&operator));
        assert_eq!(ac.operators.len(), 0);
        
        // Try to remove non-existent operator
        assert!(ac.remove_operator(&user).is_err());
    }

    #[test]
    fn test_operator_access() {
        let admin = Account::new([1u8; 32]);
        let operator = Account::new([2u8; 32]);
        let user = Account::new([3u8; 32]);
        let mut ac = AccessControl::new(admin.clone());
        
        ac.add_operator(operator.clone()).unwrap();
        
        // Admin should have operator access
        assert!(ac.require_operator(&admin).is_ok());
        
        // Operator should have operator access
        assert!(ac.require_operator(&operator).is_ok());
        
        // User should not have operator access
        assert!(ac.require_operator(&user).is_err());
    }

    #[test]
    fn test_multiple_operators() {
        let admin = Account::new([1u8; 32]);
        let mut ac = AccessControl::new(admin);
        
        // Add multiple operators
        for i in 2..=5 {
            let operator = Account::new([i; 32]);
            assert!(ac.add_operator(operator.clone()).is_ok());
            assert!(ac.is_operator(&operator));
        }
        
        assert_eq!(ac.operators.len(), 4);
        
        // Remove some operators
        for i in 2..=3 {
            let operator = Account::new([i; 32]);
            assert!(ac.remove_operator(&operator).is_ok());
            assert!(!ac.is_operator(&operator));
        }
        
        assert_eq!(ac.operators.len(), 2);
        
        // Verify remaining operators
        for i in 4..=5 {
            let operator = Account::new([i; 32]);
            assert!(ac.is_operator(&operator));
        }
    }

    #[test]
    fn test_access_control_edge_cases() {
        let admin = Account::new([1u8; 32]);
        let mut ac = AccessControl::new(admin.clone());
        
        // Admin cannot be added as operator (different role)
        // This is allowed in our implementation, admin can also be operator
        assert!(ac.add_operator(admin.clone()).is_ok());
        assert!(ac.is_operator(&admin));
        assert!(ac.is_admin(&admin));
        
        // Remove admin from operators (admin role remains)
        assert!(ac.remove_operator(&admin).is_ok());
        assert!(!ac.is_operator(&admin));
        assert!(ac.is_admin(&admin)); // Still admin
    }

    #[test]
    fn test_account_equality() {
        let account1 = Account::new([1u8; 32]);
        let account2 = Account::new([1u8; 32]);
        let account3 = Account::new([2u8; 32]);
        
        assert_eq!(account1, account2);
        assert_ne!(account1, account3);
    }
}