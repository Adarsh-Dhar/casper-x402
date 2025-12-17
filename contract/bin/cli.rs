//! This example demonstrates how to use the `odra-cli` tool to deploy and interact with a smart contract.

#![cfg(not(target_arch = "wasm32"))]

use my_project::Cep18Permit;
use odra::host::{HostEnv, NoArgs};
use odra_cli::{
    deploy::DeployScript,
    ContractProvider, DeployedContractsContainer, DeployerExt,
    OdraCli, 
};

/// Deploys the `Cep18Permit` contract and adds it to the container.
pub struct Cep18PermitDeployScript;

impl DeployScript for Cep18PermitDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer
    ) -> Result<(), odra_cli::deploy::Error> {
        let _contract = Cep18Permit::load_or_deploy(
            &env,
            NoArgs,
            container,
            350_000_000_000 // Adjust gas limit as needed
        )?;

        Ok(())
    }
}

/// Main function to run the CLI tool.
#[cfg(not(target_arch = "wasm32"))]
pub fn main() {
    OdraCli::new()
        .about("CLI tool for Cep18Permit smart contract")
        .deploy(Cep18PermitDeployScript)
        .contract::<Cep18Permit>()
        .build()
        .run();
}

#[cfg(target_arch = "wasm32")]
pub fn main() {
    // Stub for wasm32 target
}
