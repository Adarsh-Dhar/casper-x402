import sdk from 'casper-js-sdk';

console.log('Default export type:', typeof sdk);
console.log('Default export keys:', Object.keys(sdk).slice(0, 20));

// Check for the classes we need
console.log('\nLooking for specific classes:');
console.log('CasperClient:', !!sdk.CasperClient);
console.log('CLPublicKey:', !!sdk.CLPublicKey);
console.log('DeployUtil:', !!sdk.DeployUtil);
console.log('CLValueBuilder:', !!sdk.CLValueBuilder);

// Look for patterns in the default export
const allKeys = Object.keys(sdk);
console.log('\nKeys containing "Casper":', allKeys.filter(k => k.toLowerCase().includes('casper')));
console.log('Keys containing "Deploy":', allKeys.filter(k => k.toLowerCase().includes('deploy')));
console.log('Keys containing "CL":', allKeys.filter(k => k.includes('CL')));
console.log('Keys containing "Public":', allKeys.filter(k => k.toLowerCase().includes('public')));