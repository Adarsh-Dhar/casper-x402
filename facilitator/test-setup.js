// Test setup file
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random available port for tests

// Increase timeout for property-based tests
jest.setTimeout(30000);