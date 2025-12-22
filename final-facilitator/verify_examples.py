#!/usr/bin/env python3
"""
Verification script for Casper Facilitator examples
Checks that all examples are properly structured and documented
"""

import os
import re
import sys
from pathlib import Path

def check_file_exists(file_path, description):
    """Check if a file exists and report the result"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (missing)")
        return False

def check_rust_file_structure(file_path):
    """Check if a Rust file has proper documentation and structure"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        checks = {
            'has_doc_comment': content.startswith('/*!'),
            'has_main_function': 'fn main()' in content,
            'has_usage_example': '```bash' in content and 'cargo run --example' in content,
            'has_description': len(content.split('\n')[0]) > 10,
        }
        
        return checks
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return {}

def verify_cargo_toml():
    """Verify that Cargo.toml includes all examples"""
    cargo_path = "Cargo.toml"
    if not os.path.exists(cargo_path):
        print("❌ Cargo.toml not found")
        return False
    
    with open(cargo_path, 'r') as f:
        cargo_content = f.read()
    
    expected_examples = [
        'demo',
        'fee_calculation', 
        'token_management',
        'integration_test',
        'payment_processor'
    ]
    
    print("\n📦 Checking Cargo.toml example entries:")
    all_found = True
    for example in expected_examples:
        if f'name = "{example}"' in cargo_content:
            print(f"✅ Example '{example}' found in Cargo.toml")
        else:
            print(f"❌ Example '{example}' missing from Cargo.toml")
            all_found = False
    
    return all_found

def main():
    print("🔍 Verifying Casper Facilitator Examples")
    print("=========================================\n")
    
    # Check directory structure
    print("📁 Checking directory structure:")
    directories = [
        "examples",
        "examples/getting-started",
        "examples/getting-started/demo",
        "examples/getting-started/basic", 
        "examples/advanced",
        "examples/integration"
    ]
    
    structure_ok = True
    for directory in directories:
        if os.path.exists(directory):
            print(f"✅ Directory: {directory}")
        else:
            print(f"❌ Directory: {directory} (missing)")
            structure_ok = False
    
    # Check example files
    print("\n📄 Checking example files:")
    examples = [
        ("examples/getting-started/demo/main.rs", "Main demo example"),
        ("examples/getting-started/basic/fee_calculation.rs", "Fee calculation example"),
        ("examples/getting-started/basic/token_management.rs", "Token management example"),
        ("examples/advanced/integration_test.rs", "Integration test example"),
        ("examples/integration/payment_processor.rs", "Payment processor example"),
    ]
    
    files_ok = True
    for file_path, description in examples:
        if not check_file_exists(file_path, description):
            files_ok = False
    
    # Check documentation files
    print("\n📚 Checking documentation:")
    docs = [
        ("examples/README.md", "Examples README"),
        ("EXAMPLES_INTEGRATION_GUIDE.md", "Integration guide"),
    ]
    
    docs_ok = True
    for file_path, description in docs:
        if not check_file_exists(file_path, description):
            docs_ok = False
    
    # Check Rust file structure
    print("\n🦀 Checking Rust file structure:")
    rust_files_ok = True
    for file_path, description in examples:
        if os.path.exists(file_path):
            checks = check_rust_file_structure(file_path)
            print(f"\n  {description} ({file_path}):")
            
            for check_name, passed in checks.items():
                status = "✅" if passed else "❌"
                check_desc = {
                    'has_doc_comment': "Has documentation comment",
                    'has_main_function': "Has main() function", 
                    'has_usage_example': "Has usage example",
                    'has_description': "Has description"
                }.get(check_name, check_name)
                
                print(f"    {status} {check_desc}")
                if not passed:
                    rust_files_ok = False
    
    # Check Cargo.toml
    cargo_ok = verify_cargo_toml()
    
    # Check utility scripts
    print("\n🛠️ Checking utility scripts:")
    scripts = [
        ("test_examples.sh", "Example test script"),
        ("verify_examples.py", "Example verification script"),
    ]
    
    scripts_ok = True
    for file_path, description in scripts:
        if not check_file_exists(file_path, description):
            scripts_ok = False
    
    # Final summary
    print("\n📊 Verification Summary:")
    print("========================")
    
    all_checks = [
        ("Directory structure", structure_ok),
        ("Example files", files_ok),
        ("Documentation", docs_ok),
        ("Rust file structure", rust_files_ok),
        ("Cargo.toml configuration", cargo_ok),
        ("Utility scripts", scripts_ok),
    ]
    
    passed_checks = sum(1 for _, ok in all_checks if ok)
    total_checks = len(all_checks)
    
    for check_name, ok in all_checks:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status}: {check_name}")
    
    print(f"\nOverall: {passed_checks}/{total_checks} checks passed")
    
    if passed_checks == total_checks:
        print("\n🎉 All examples are properly structured and ready to use!")
        print("\nTo run the examples:")
        print("  cargo run --example demo")
        print("  cargo run --example fee_calculation")
        print("  cargo run --example token_management")
        print("  cargo run --example integration_test")
        print("  cargo run --example payment_processor")
        return 0
    else:
        print(f"\n⚠️ {total_checks - passed_checks} issues found. Please fix them before using the examples.")
        return 1

if __name__ == "__main__":
    sys.exit(main())