#!/usr/bin/env python3
"""
Unit tests for nuclear clean module error handling.
Tests permission error scenarios and partial cleanup failure recovery.
"""

import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import the nuclear clean function
from deploy_nuclear import nuclear_clean, CleanResult


class TestNuclearCleanErrorHandling(unittest.TestCase):
    """Test error handling scenarios for nuclear clean module."""
    
    def setUp(self):
        """Set up test environment with temporary directory."""
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)
        
        # Create target and wasm directories for testing
        self.target_dir = Path("target")
        self.wasm_dir = Path("wasm")
        self.target_dir.mkdir(exist_ok=True)
        self.wasm_dir.mkdir(exist_ok=True)
        
    def tearDown(self):
        """Clean up test environment."""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)
        
    def test_permission_error_target_directory(self):
        """Test handling of permission errors when removing target directory."""
        with patch('shutil.rmtree') as mock_rmtree:
            # Mock permission error on target directory removal
            def side_effect(path, ignore_errors=False):
                if str(path).endswith('target'):
                    raise PermissionError("Permission denied: target")
                    
            mock_rmtree.side_effect = side_effect
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to remove target", result.error_message)
            self.assertIn("Permission denied", result.error_message)
            self.assertEqual(result.removed_paths, [])
            
    def test_permission_error_wasm_directory(self):
        """Test handling of permission errors when removing wasm directory."""
        with patch('shutil.rmtree') as mock_rmtree:
            # Mock permission error on wasm directory removal
            def side_effect(path, ignore_errors=False):
                if str(path).endswith('wasm'):
                    raise PermissionError("Permission denied: wasm")
                    
            mock_rmtree.side_effect = side_effect
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to remove wasm", result.error_message)
            self.assertIn("Permission denied", result.error_message)
            self.assertEqual(result.removed_paths, [])
            
    def test_partial_cleanup_failure_both_directories(self):
        """Test handling when both directories fail to be removed."""
        with patch('shutil.rmtree') as mock_rmtree:
            # Mock permission errors on both directories
            mock_rmtree.side_effect = PermissionError("Permission denied")
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to remove target", result.error_message)
            self.assertIn("Also failed to remove wasm", result.error_message)
            self.assertEqual(result.removed_paths, [])
            
    def test_partial_cleanup_target_succeeds_wasm_fails(self):
        """Test partial cleanup where target succeeds but wasm fails."""
        with patch('shutil.rmtree') as mock_rmtree:
            # Mock success for target, failure for wasm
            def side_effect(path, ignore_errors=False):
                if str(path).endswith('wasm'):
                    raise PermissionError("Permission denied: wasm")
                # target removal succeeds (no exception)
                    
            mock_rmtree.side_effect = side_effect
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to remove wasm", result.error_message)
            self.assertEqual(result.removed_paths, [])  # Rollback should clear this
            
    def test_os_error_handling(self):
        """Test handling of OS errors during directory removal."""
        with patch('shutil.rmtree') as mock_rmtree:
            mock_rmtree.side_effect = OSError("Disk full")
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to remove target", result.error_message)
            self.assertIn("Disk full", result.error_message)
            
    def test_unexpected_error_handling(self):
        """Test handling of unexpected errors during cleanup."""
        with patch('shutil.rmtree') as mock_rmtree:
            mock_rmtree.side_effect = RuntimeError("Unexpected error")
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Unexpected error during nuclear clean", result.error_message)
            self.assertIn("Unexpected error", result.error_message)
            
    def test_directory_still_exists_after_removal(self):
        """Test handling when directory still exists after attempted removal."""
        with patch('shutil.rmtree') as mock_rmtree, \
             patch('pathlib.Path.exists') as mock_exists:
            
            # Mock rmtree to succeed but directory still exists
            mock_rmtree.return_value = None
            mock_exists.return_value = True  # Directory still exists
            
            result = nuclear_clean()
            
            self.assertFalse(result.success)
            self.assertIn("Failed to completely remove", result.error_message)
            self.assertIn("directory still exists after deletion", result.error_message)
            
    def test_successful_cleanup_with_verification(self):
        """Test successful cleanup with proper verification."""
        # Create actual directories to test real cleanup
        target_dir = Path("target")
        wasm_dir = Path("wasm")
        target_dir.mkdir(exist_ok=True)
        wasm_dir.mkdir(exist_ok=True)
        
        # Add some files to make directories non-empty
        (target_dir / "test_file.txt").write_text("test")
        (wasm_dir / "test.wasm").write_text("wasm content")
        
        result = nuclear_clean()
        
        self.assertTrue(result.success)
        self.assertIn("target", result.removed_paths)
        self.assertIn("wasm", result.removed_paths)
        self.assertFalse(target_dir.exists())
        self.assertFalse(wasm_dir.exists())
        self.assertIsNone(result.error_message)
        
    def test_cleanup_when_directories_dont_exist(self):
        """Test cleanup when target directories don't exist."""
        # Remove directories so they don't exist
        if self.target_dir.exists():
            shutil.rmtree(self.target_dir)
        if self.wasm_dir.exists():
            shutil.rmtree(self.wasm_dir)
            
        result = nuclear_clean()
        
        self.assertTrue(result.success)
        self.assertEqual(result.removed_paths, [])  # No paths removed since they didn't exist
        self.assertIsNone(result.error_message)


if __name__ == '__main__':
    unittest.main()