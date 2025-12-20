#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

pub mod flipper;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod deployment_test;
