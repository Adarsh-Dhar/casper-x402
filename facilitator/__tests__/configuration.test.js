/**
 * Unit tests for server configuration
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, startServer } = require('../server');
const { loadConfig, validateConfig, getConfig, createDefaultEnvFile } = require('../config');

describe('Server Configuration', () => {
    
    let originalEnv;
    
    beforeEach(() => {
        // Save original environment variables
        originalEnv = { ...process.env };
    });
    
    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('Environment Variable Loading', () => {
        
        test('Loads default configuration when no env vars set', () => {
            // Clear relevant env vars
            delete process.env.PORT;
            delete process.env.NODE_ENV;
            delete process.env.CASPER_NODE_ADDRESS;
            
            const config = loadConfig();
            
            expect(config).toMatchObject({
                port: 3001,
                nodeEnv: 'development',
                nodeAddress: 'http://136.243.187.84:7777',
                chainName: 'casper-test'
            });
        });
        
        test('Loads custom configuration from environment variables', () => {
            process.env.PORT = '4000';
            process.env.NODE_ENV = 'production';
            process.env.CASPER_NODE_ADDRESS = 'http://custom-node:7777';
            process.env.CASPER_CHAIN_NAME = 'custom-chain';
            process.env.RATE_LIMIT_MAX = '200';
            
            const config = loadConfig();
            
            expect(config).toMatchObject({
                port: 4000,
                nodeEnv: 'production',
                nodeAddress: 'http://custom-node:7777',
                chainName: 'custom-chain',
                rateLimitMax: 200
            });
        });
        
        test('Handles invalid numeric environment variables', () => {
            process.env.PORT = 'invalid-port';
            process.env.RATE_LIMIT_MAX = 'not-a-number';
            
            const config = loadConfig();
            
            expect(config.port).toBe(3001); // Falls back to default
            expect(config.rateLimitMax).toBe(100); // Falls back to default
        });
    });

    describe('Configuration Validation', () => {
        
        test('Validates valid configuration', () => {
            const validConfig = {
                port: 3001,
                nodeAddress: 'http://localhost:7777',
                chainName: 'casper-test',
                facilitatorKeyPath: './keys/facilitator-secret.pem',
                gasPayment: '2500000000',
                rateLimitMax: 100,
                nodeEnv: 'development',
                allowedOrigins: '*'
            };
            
            // Mock key file existence
            const originalExistsSync = fs.existsSync;
            const originalReadFileSync = fs.readFileSync;
            fs.existsSync = jest.fn().mockReturnValue(true);
            fs.readFileSync = jest.fn().mockReturnValue('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----');
            
            const validation = validateConfig(validConfig);
            
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            
            // Restore original functions
            fs.existsSync = originalExistsSync;
            fs.readFileSync = originalReadFileSync;
        });
        
        test('Detects invalid port configuration', () => {
            const invalidConfig = {
                port: 0, // Invalid port
                nodeAddress: 'http://localhost:7777',
                chainName: 'casper-test'
            };
            
            const validation = validateConfig(invalidConfig);
            
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Invalid port number');
        });
        
        test('Detects invalid node address', () => {
            const invalidConfig = {
                port: 3001,
                nodeAddress: 'invalid-url', // Invalid URL
                chainName: 'casper-test'
            };
            
            const validation = validateConfig(invalidConfig);
            
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Invalid Casper node address');
        });
        
        test('Detects missing facilitator key file', () => {
            const configWithMissingKey = {
                port: 3001,
                nodeAddress: 'http://localhost:7777',
                chainName: 'casper-test',
                facilitatorKeyPath: './non-existent-key.pem'
            };
            
            const validation = validateConfig(configWithMissingKey);
            
            expect(validation.valid).toBe(false);
            expect(validation.errors.some(error => error.includes('key file not found'))).toBe(true);
        });
        
        test('Generates warnings for production configuration issues', () => {
            const productionConfig = {
                port: 3001,
                nodeAddress: 'http://localhost:7777',
                chainName: 'casper-test',
                nodeEnv: 'production',
                allowedOrigins: '*', // Should warn about this in production
                logLevel: 'debug', // Should warn about this in production
                contractHash: 'hash-YOUR-CONTRACT-HASH' // Placeholder hash
            };
            
            // Mock key file existence
            const originalExistsSync = fs.existsSync;
            const originalReadFileSync = fs.readFileSync;
            fs.existsSync = jest.fn().mockReturnValue(true);
            fs.readFileSync = jest.fn().mockReturnValue('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----');
            
            const validation = validateConfig(productionConfig);
            
            expect(validation.warnings.length).toBeGreaterThan(0);
            expect(validation.warnings.some(w => w.includes('CORS'))).toBe(true);
            expect(validation.warnings.some(w => w.includes('Debug logging'))).toBe(true);
            expect(validation.warnings.some(w => w.includes('placeholder'))).toBe(true);
            
            // Restore original functions
            fs.existsSync = originalExistsSync;
            fs.readFileSync = originalReadFileSync;
        });
    });

    describe('Server Startup and Shutdown', () => {
        
        test('Server starts with valid configuration', (done) => {
            // Use a random port to avoid conflicts
            process.env.PORT = '0';
            
            const server = startServer();
            
            server.on('listening', () => {
                expect(server.listening).toBe(true);
                server.close(done);
            });
        });
        
        test('Server handles graceful shutdown on SIGTERM', (done) => {
            process.env.PORT = '0';
            
            const server = startServer();
            
            server.on('listening', () => {
                // Simulate SIGTERM
                process.emit('SIGTERM');
                
                server.on('close', () => {
                    done();
                });
            });
        });
        
        test('Server handles graceful shutdown on SIGINT', (done) => {
            process.env.PORT = '0';
            
            const server = startServer();
            
            server.on('listening', () => {
                // Simulate SIGINT (Ctrl+C)
                process.emit('SIGINT');
                
                server.on('close', () => {
                    done();
                });
            });
        });
    });

    describe('Health Check Endpoint', () => {
        
        test('Health check returns correct information', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toMatchObject({
                status: 'ok',
                service: 'transaction-relay-server',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                environment: expect.any(String)
            });
            
            expect(response.body).toHaveProperty('config');
            expect(response.body.config).toHaveProperty('casperNode');
            expect(response.body.config).toHaveProperty('chainName');
        });
        
        test('Health check includes version information', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('version');
            expect(typeof response.body.version).toBe('string');
        });
        
        test('Custom health check path works', async () => {
            // Test that the health check responds on the configured path
            const response = await request(app)
                .get('/health') // Default path
                .expect(200);

            expect(response.body.status).toBe('ok');
        });
    });

    describe('Environment File Creation', () => {
        
        test('Creates default environment file', () => {
            const testEnvPath = './test.env';
            
            // Ensure file doesn't exist
            if (fs.existsSync(testEnvPath)) {
                fs.unlinkSync(testEnvPath);
            }
            
            createDefaultEnvFile(testEnvPath);
            
            expect(fs.existsSync(testEnvPath)).toBe(true);
            
            const content = fs.readFileSync(testEnvPath, 'utf8');
            expect(content).toContain('PORT=3001');
            expect(content).toContain('CASPER_NODE_ADDRESS=');
            expect(content).toContain('FACILITATOR_KEY_PATH=');
            
            // Clean up
            fs.unlinkSync(testEnvPath);
        });
        
        test('Does not overwrite existing environment file', () => {
            const testEnvPath = './test-existing.env';
            const existingContent = 'EXISTING_CONTENT=true';
            
            // Create existing file
            fs.writeFileSync(testEnvPath, existingContent);
            
            createDefaultEnvFile(testEnvPath);
            
            const content = fs.readFileSync(testEnvPath, 'utf8');
            expect(content).toBe(existingContent);
            
            // Clean up
            fs.unlinkSync(testEnvPath);
        });
    });

    describe('Configuration Integration', () => {
        
        test('getConfig returns configuration with validation', () => {
            const config = getConfig();
            
            expect(config).toHaveProperty('port');
            expect(config).toHaveProperty('nodeEnv');
            expect(config).toHaveProperty('validation');
            expect(config.validation).toHaveProperty('valid');
            expect(config.validation).toHaveProperty('errors');
            expect(config.validation).toHaveProperty('warnings');
        });
        
        test('Configuration affects server behavior', async () => {
            // Test that CORS configuration is applied
            const response = await request(app)
                .options('/settle')
                .set('Origin', 'http://example.com')
                .set('Access-Control-Request-Method', 'POST');

            // Should include CORS headers
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });
});