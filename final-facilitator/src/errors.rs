use casper_types::ApiError;

/// Custom error codes for the vault facilitator
pub enum FacilitatorError {
    /// Unauthorized access (1000)
    Unauthorized = 1000,
    /// Contract is paused (1001)
    ContractPaused = 1001,
    /// Invalid token (1002)
    InvalidToken = 1002,
    /// Invalid signer (1003)
    InvalidSigner = 1003,
    /// Insufficient fee (1004)
    InsufficientFee = 1004,
    /// Invalid transaction data (1005)
    InvalidTransaction = 1005,
    /// Fee calculation overflow (1006)
    FeeCalculationOverflow = 1006,
    /// Token not supported (1007)
    TokenNotSupported = 1007,
    /// Signer already exists (1008)
    SignerAlreadyExists = 1008,
    /// Signer not found (1009)
    SignerNotFound = 1009,
    /// Invalid fee rate (1010)
    InvalidFeeRate = 1010,
    /// Invalid chunk size (1011)
    InvalidChunkSize = 1011,
    /// Token account creation failed (1012)
    TokenAccountCreationFailed = 1012,
}

impl From<FacilitatorError> for ApiError {
    fn from(error: FacilitatorError) -> Self {
        ApiError::User(error as u16)
    }
}

/// Helper functions to create specific errors
pub fn unauthorized_error() -> ApiError {
    FacilitatorError::Unauthorized.into()
}

pub fn contract_paused_error() -> ApiError {
    FacilitatorError::ContractPaused.into()
}

pub fn invalid_token_error() -> ApiError {
    FacilitatorError::InvalidToken.into()
}

pub fn invalid_signer_error() -> ApiError {
    FacilitatorError::InvalidSigner.into()
}

pub fn insufficient_fee_error() -> ApiError {
    FacilitatorError::InsufficientFee.into()
}

pub fn invalid_transaction_error() -> ApiError {
    FacilitatorError::InvalidTransaction.into()
}

pub fn fee_calculation_overflow_error() -> ApiError {
    FacilitatorError::FeeCalculationOverflow.into()
}

pub fn token_not_supported_error() -> ApiError {
    FacilitatorError::TokenNotSupported.into()
}

pub fn signer_already_exists_error() -> ApiError {
    FacilitatorError::SignerAlreadyExists.into()
}

pub fn signer_not_found_error() -> ApiError {
    FacilitatorError::SignerNotFound.into()
}

pub fn invalid_fee_rate_error() -> ApiError {
    FacilitatorError::InvalidFeeRate.into()
}

pub fn invalid_chunk_size_error() -> ApiError {
    FacilitatorError::InvalidChunkSize.into()
}

pub fn token_account_creation_failed_error() -> ApiError {
    FacilitatorError::TokenAccountCreationFailed.into()
}