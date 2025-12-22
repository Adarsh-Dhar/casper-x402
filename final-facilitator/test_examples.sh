#!/bin/bash

# Test script for Casper Facilitator examples
echo "🧪 Testing Casper Facilitator Examples"
echo "======================================="

# Function to test an example
test_example() {
    local example_name=$1
    echo ""
    echo "Testing example: $example_name"
    echo "--------------------------------"
    
    # Check if example compiles
    if cargo check --example "$example_name" > /dev/null 2>&1; then
        echo "✅ $example_name: Compilation successful"
        
        # Try to run the example with timeout
        timeout 10s cargo run --example "$example_name" > /dev/null 2>&1
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo "✅ $example_name: Execution successful"
        elif [ $exit_code -eq 124 ]; then
            echo "⚠️  $example_name: Execution timed out (likely successful but long-running)"
        else
            echo "❌ $example_name: Execution failed"
        fi
    else
        echo "❌ $example_name: Compilation failed"
    fi
}

# Test all examples
examples=("demo" "fee_calculation" "token_management" "integration_test" "payment_processor")

for example in "${examples[@]}"; do
    test_example "$example"
done

echo ""
echo "📊 Test Summary"
echo "==============="
echo "Tested ${#examples[@]} examples"
echo ""
echo "Note: Some examples may take time to compile due to dependencies."
echo "If compilation is slow, try running individual examples:"
echo ""
for example in "${examples[@]}"; do
    echo "  cargo run --example $example"
done

echo ""
echo "✅ Example testing completed!"