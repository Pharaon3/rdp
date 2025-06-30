#!/usr/bin/env python3
"""
Test script to verify cross-drive access functionality
"""

import os
import subprocess
import sys

def test_cross_drive_access():
    """Test if we can access different drives"""
    print("Testing cross-drive access...")
    
    # Get current directory and drive
    current_dir = os.getcwd()
    current_drive = os.path.splitdrive(current_dir)[0].upper()
    print(f"Current directory: {current_dir}")
    print(f"Current drive: {current_drive}")
    
    # Test accessing different drives
    drives_to_test = []
    for drive in ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'L:', 'M:', 'N:', 'O:', 'P:', 'Q:', 'R:', 'S:', 'T:', 'U:', 'V:', 'W:', 'X:', 'Y:', 'Z:']:
        if os.path.exists(drive + '\\'):
            drives_to_test.append(drive)
    
    print(f"Available drives: {', '.join(drives_to_test)}")
    
    # Test the new command execution method
    for drive in drives_to_test:
        if drive.upper() != current_drive:
            print(f"\nTesting access to drive {drive}...")
            
            # Test directory listing
            test_dir = f"{drive}\\"
            cmd_to_execute = f'cmd /c "cd /d "{test_dir}" && dir"'
            
            try:
                result = subprocess.run(
                    cmd_to_execute,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    print(f"✓ Successfully accessed {drive}")
                    # Show first few lines of output
                    lines = result.stdout.split('\n')[:5]
                    for line in lines:
                        if line.strip():
                            print(f"  {line.strip()}")
                else:
                    print(f"✗ Failed to access {drive}: {result.stderr}")
                    
            except Exception as e:
                print(f"✗ Error accessing {drive}: {e}")

if __name__ == "__main__":
    test_cross_drive_access() 