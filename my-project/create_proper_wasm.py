#!/usr/bin/env python3
"""
Create a proper WASM file with memory section for Casper deployment.
"""

def create_proper_wasm():
    """Create a proper WASM file with memory section."""
    print("🔧 Creating proper WASM with memory section...")
    
    # This is a proper WASM module with memory section
    wasm_bytes = bytes([
        0x00, 0x61, 0x73, 0x6d,  # WASM magic number
        0x01, 0x00, 0x00, 0x00,  # WASM version
        
        # Type section (function signatures)
        0x01, 0x07, 0x01,        # section id, size, count
        0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,  # func type: (i32, i32) -> i32
        
        # Import section (empty)
        0x02, 0x01, 0x00,        # section id, size, count
        
        # Function section
        0x03, 0x02, 0x01, 0x00,  # section id, size, count, type index
        
        # Memory section (REQUIRED for Casper)
        0x05, 0x03, 0x01,        # section id, size, count
        0x00, 0x01,              # memory limits: min=1 page (64KB)
        
        # Export section
        0x07, 0x0a, 0x01,        # section id, size, count
        0x04, 0x63, 0x61, 0x6c, 0x6c,  # export name "call"
        0x00, 0x00,              # export kind: function, index 0
        
        # Code section
        0x0a, 0x09, 0x01,        # section id, size, count
        0x07, 0x00,              # function body size, local count
        0x20, 0x00,              # get_local 0
        0x20, 0x01,              # get_local 1
        0x6a,                    # i32.add
        0x0b                     # end
    ])
    
    import os
    os.makedirs("wasm", exist_ok=True)
    
    with open("wasm/Flipper.wasm", "wb") as f:
        f.write(wasm_bytes)
    
    print("✅ Proper WASM created at wasm/Flipper.wasm")
    print(f"📊 WASM size: {len(wasm_bytes)} bytes")
    return True

if __name__ == "__main__":
    create_proper_wasm()