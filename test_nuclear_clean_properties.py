#!/usr/bin/env python3
"""
Property-based tests for nuclear clean completeness.
**Feature: nuclear-contract-deployment, Property 1: Nuclear clean completeness**
"""

import os
import shutil
import tempfile
from pathlib import Path
from hypothesis import given, strategies as st, settings
import unittest

# Import the nuclear clean function
from deploy_nuclear import nuclear_clean


class TestNuclearCleanProperties(unittest.TestCase):
    """Property-based tests for nuclear clean module."""
    
    def setUp(self):
        """Set up test environment."""
        self.original_cwd = os.getcwd()
        
    def tearDown(self):
        """Clean up test environment."""
        os.chdir(self.original_cwd)
        
    @given(
        target_files=st.lists(st.text(min_size=1, max_size=20), min_size=0, max_size=10),
        wasm_files=st.lists(st.text(min_size=1, max_size=20), min_size=0, max_size=10),
        target_subdirs=st.lists(st.text(min_size=1, max_size=15), min_size=0, max_size=5),
        wasm_subdirs=st.lists(st.text(min_size=1, max_size=15), min_size=0, max_size=5)
    )
    @settings(max_examples=100)
    def test_nuclear_clean_completeness_property(self, target_files, wasm_files, target_subdirs, wasm_subdirs):
        """
        **Feature: nuclear-contract-deployment, Property 1: Nuclear clean completeness**
        **Validates: Requirements 1.1, 1.2, 1.3**
        
        Property: For any deployment workflow execution, after the nuclear clean phase 
        completes successfully, both target and wasm directories should not exist on the filesystem.
        """
        # Create temporary directory for this test
        with tempfile.TemporaryDirectory() as test_dir:
            os.chdir(test_dir)
            
            # Create target directory with files and subdirectories
            target_dir = Path("target")
            target_dir.mkdir(exist_ok=True)
            
            # Add files to target directory
            for i, filename in enumerate(target_files):
                # Sanitize filename to avoid filesystem issues
                safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")[:15]
                if safe_filename:  # Only create if filename is valid
                    try:
                        (target_dir / f"{safe_filename}_{i}.txt").write_text(f"content_{i}")
                    except (OSError, ValueError):
                        pass  # Skip invalid filenames
                        
            # Add subdirectories to target
            for i, dirname in enumerate(target_subdirs):
                safe_dirname = "".join(c for c in dirname if c.isalnum() or c in "._-")[:10]
                if safe_dirname:
                    try:
                        subdir = target_dir / f"{safe_dirname}_{i}"
                        subdir.mkdir(exist_ok=True)
                        (subdir / "nested_file.txt").write_text("nested content")
                    except (OSError, ValueError):
                        pass
                        
            # Create wasm directory with files and subdirectories
            wasm_dir = Path("wasm")
            wasm_dir.mkdir(exist_ok=True)
            
            # Add files to wasm directory
            for i, filename in enumerate(wasm_files):
                safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")[:15]
                if safe_filename:
                    try:
                        (wasm_dir / f"{safe_filename}_{i}.wasm").write_text(f"wasm_content_{i}")
                    except (OSError, ValueError):
                        pass
                        
            # Add subdirectories to wasm
            for i, dirname in enumerate(wasm_subdirs):
                safe_dirname = "".join(c for c in dirname if c.isalnum() or c in "._-")[:10]
                if safe_dirname:
                    try:
                        subdir = wasm_dir / f"{safe_dirname}_{i}"
                        subdir.mkdir(exist_ok=True)
                        (subdir / "nested_wasm.wasm").write_text("nested wasm")
                    except (OSError, ValueError):
                        pass
                        
            # Verify directories exist before cleanup
            self.assertTrue(target_dir.exists(), "Target directory should exist before cleanup")
            self.assertTrue(wasm_dir.exists(), "WASM directory should exist before cleanup")
            
            # Execute nuclear clean
            result = nuclear_clean()
            
            # Property assertion: If nuclear clean succeeds, both directories must not exist
            if result.success:
                self.assertFalse(target_dir.exists(), 
                    f"Target directory should not exist after successful nuclear clean. Result: {result}")
                self.assertFalse(wasm_dir.exists(), 
                    f"WASM directory should not exist after successful nuclear clean. Result: {result}")
                    
                # Additional verification: ensure no remnants exist
                self.assertFalse(any(target_dir.glob("*")) if target_dir.exists() else False,
                    "No files should remain in target directory")
                self.assertFalse(any(wasm_dir.glob("*")) if wasm_dir.exists() else False,
                    "No files should remain in wasm directory")
                    
    @given(
        create_target=st.booleans(),
        create_wasm=st.booleans()
    )
    @settings(max_examples=50)
    def test_nuclear_clean_handles_missing_directories(self, create_target, create_wasm):
        """
        **Feature: nuclear-contract-deployment, Property 1: Nuclear clean completeness**
        **Validates: Requirements 1.1, 1.2, 1.3**
        
        Property: Nuclear clean should succeed even when directories don't exist initially.
        """
        with tempfile.TemporaryDirectory() as test_dir:
            os.chdir(test_dir)
            
            # Conditionally create directories
            if create_target:
                Path("target").mkdir()
                Path("target/test.txt").write_text("test")
                
            if create_wasm:
                Path("wasm").mkdir()
                Path("wasm/test.wasm").write_text("wasm")
                
            # Execute nuclear clean
            result = nuclear_clean()
            
            # Property: Nuclear clean should always succeed and ensure directories don't exist
            self.assertTrue(result.success, f"Nuclear clean should succeed regardless of initial state. Error: {result.error_message}")
            self.assertFalse(Path("target").exists(), "Target directory should not exist after cleanup")
            self.assertFalse(Path("wasm").exists(), "WASM directory should not exist after cleanup")
            
    @settings(max_examples=50)
    def test_nuclear_clean_idempotent_property(self):
        """
        **Feature: nuclear-contract-deployment, Property 1: Nuclear clean completeness**
        **Validates: Requirements 1.1, 1.2, 1.3**
        
        Property: Running nuclear clean multiple times should be idempotent - 
        same result regardless of how many times it's called.
        """
        with tempfile.TemporaryDirectory() as test_dir:
            os.chdir(test_dir)
            
            # Create initial directories
            target_dir = Path("target")
            wasm_dir = Path("wasm")
            target_dir.mkdir()
            wasm_dir.mkdir()
            Path("target/test.txt").write_text("test")
            Path("wasm/test.wasm").write_text("wasm")
            
            # First nuclear clean
            result1 = nuclear_clean()
            
            # Second nuclear clean (should be idempotent)
            result2 = nuclear_clean()
            
            # Third nuclear clean (should still be idempotent)
            result3 = nuclear_clean()
            
            # Property: All calls should succeed and have consistent results
            self.assertTrue(result1.success, f"First nuclear clean should succeed: {result1.error_message}")
            self.assertTrue(result2.success, f"Second nuclear clean should succeed: {result2.error_message}")
            self.assertTrue(result3.success, f"Third nuclear clean should succeed: {result3.error_message}")
            
            # Directories should not exist after any call
            self.assertFalse(target_dir.exists(), "Target directory should not exist after any nuclear clean")
            self.assertFalse(wasm_dir.exists(), "WASM directory should not exist after any nuclear clean")
            
            # Second and third calls should have empty removed_paths (nothing to remove)
            self.assertEqual(result2.removed_paths, [], "Second call should have no paths to remove")
            self.assertEqual(result3.removed_paths, [], "Third call should have no paths to remove")


if __name__ == '__main__':
    # Install hypothesis if not available
    try:
        import hypothesis
    except ImportError:
        print("Installing hypothesis for property-based testing...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "hypothesis"])
        import hypothesis
        
    unittest.main()