/**
 * Property-based tests for CLValue conversion utilities
 */

const fc = require('fast-check');
const {
    convertPublicKey,
    convertAmount,
    convertNonce,
    convertSignature,
    convertSettlementRequest,
    validateConversionInputs
} = require('../utils/clvalue-converter');

describe('CLValue Conversion', () => {
    
    /**
     * Feature: transaction-relay-server, Property 4: Parameter conversion correctness
     * For any valid settlement request, all parameters should be correctly converted 
     * to their corresponding CLValue types (owner_public_key→CLPublicKey, amount→CLU256, 
     * nonce→CLU64, signature→CLString)
     * Validates: Requirements 1.4, 3.1, 3.2, 3.3, 3.4
     */
    test('Property 4: Parameter conversion correctness', async () => {
        await fc.assert(
            fc.property(
                fc.record({
                    owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                    amount: fc.bigUintN(64).filter(n => n > 0n).map(n => n.toString()),
                    nonce: fc.nat({ max: 1000000 }), // Avoid MAX_SAFE_INTEGER overflow
                    signature: fc.hexaString({ minLength: 64, maxLength: 256 })
                }),
                (validRequest) => {
                    // All conversions should succeed for valid inputs
                    expect(() => convertPublicKey(validRequest.owner_public_key)).not.toThrow();
                    expect(() => convertAmount(validRequest.amount)).not.toThrow();
                    expect(() => convertNonce(validRequest.nonce)).not.toThrow();
                    expect(() => convertSignature(validRequest.signature)).not.toThrow();
                    
                    // Full conversion should also succeed
                    expect(() => convertSettlementRequest(validRequest)).not.toThrow();
                    
                    // Validation should pass
                    const validation = validateConversionInputs(validRequest);
                    expect(validation.success).toBe(true);
                    expect(validation.errors).toHaveLength(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: transaction-relay-server, Property 9: Conversion error handling
     * For any invalid parameter that cannot be converted to CLValue format, 
     * the server should return an error response with conversion failure details
     * Validates: Requirements 3.5
     */
    test('Property 9: Conversion error handling', async () => {
        await fc.assert(
            fc.property(
                fc.oneof(
                    // Invalid public key formats
                    fc.record({
                        owner_public_key: fc.oneof(
                            fc.string().filter(s => !/^0[12][0-9a-fA-F]{64}$/.test(s)),
                            fc.constant(''),
                            fc.constant('invalid'),
                            fc.integer()
                        ),
                        amount: fc.bigUintN(32).map(n => n.toString()),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid amount formats
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                        amount: fc.oneof(
                            fc.constant('0'),
                            fc.constant(''),
                            fc.constant('invalid'),
                            fc.string().filter(s => !/^\d+$/.test(s)),
                            fc.integer()
                        ),
                        nonce: fc.nat(),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid nonce formats
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                        amount: fc.bigUintN(32).map(n => n.toString()),
                        nonce: fc.oneof(
                            fc.string(),
                            fc.float(),
                            fc.integer().filter(n => n < 0)
                        ),
                        signature: fc.hexaString({ minLength: 64, maxLength: 128 })
                    }),
                    // Invalid signature formats
                    fc.record({
                        owner_public_key: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '01' + s),
                        amount: fc.bigUintN(32).map(n => n.toString()),
                        nonce: fc.nat(),
                        signature: fc.oneof(
                            fc.constant(''),
                            fc.string().filter(s => s.length < 64 || !/^[0-9a-fA-F]*$/.test(s)),
                            fc.integer()
                        )
                    })
                ),
                (invalidRequest) => {
                    // At least one conversion should fail
                    const validation = validateConversionInputs(invalidRequest);
                    expect(validation.success).toBe(false);
                    expect(validation.errors.length).toBeGreaterThan(0);
                    
                    // Full conversion should throw
                    expect(() => convertSettlementRequest(invalidRequest)).toThrow();
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Individual conversion functions work correctly', () => {
        // Test valid conversions
        expect(() => convertPublicKey('01' + '0'.repeat(64))).not.toThrow();
        expect(() => convertAmount('1000')).not.toThrow();
        expect(() => convertNonce(42)).not.toThrow();
        expect(() => convertSignature('a'.repeat(64))).not.toThrow();
    });

    test('Individual conversion functions handle errors', () => {
        // Test invalid conversions
        expect(() => convertPublicKey('invalid')).toThrow();
        expect(() => convertAmount('0')).toThrow();
        expect(() => convertAmount('')).toThrow();
        expect(() => convertNonce(-1)).toThrow();
        expect(() => convertNonce('string')).toThrow();
        expect(() => convertSignature('')).toThrow();
        expect(() => convertSignature('short')).toThrow();
    });

    test('Conversion preserves data integrity', () => {
        const validRequest = {
            owner_public_key: '01' + 'a'.repeat(64),
            amount: '1000000000',
            nonce: 42,
            signature: 'b'.repeat(128)
        };

        const converted = convertSettlementRequest(validRequest);
        
        // Verify types are correct
        expect(converted.userPublicKey).toBeDefined();
        expect(converted.amount).toBeDefined();
        expect(converted.nonce).toBeDefined();
        expect(converted.signature).toBeDefined();
        
        // Verify CLValue types have expected properties
        expect(converted.userPublicKey.toHex()).toBe(validRequest.owner_public_key);
        expect(converted.amount.toString()).toContain(validRequest.amount);
        expect(converted.nonce.toString()).toContain(validRequest.nonce.toString());
        expect(converted.signature.toString()).toContain(validRequest.signature);
    });
});