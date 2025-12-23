export interface ActiveAccountType {
  public_key: string;
  account_hash: string;
  balance?: {
    liquid_balance_main_purse: string;
  };
}

export interface CsprClickEvent {
  account: ActiveAccountType;
}

export interface SignMessageResult {
  signature: string;
  cancelled: boolean;
}

export interface DeployResult {
  deploy_hash: string;
  cancelled: boolean;
}

// CsprClick SignResult type
export interface SignResult {
  signature: string;
  cancelled?: boolean;
}