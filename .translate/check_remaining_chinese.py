"""
Check for remaining Chinese text in the codebase after translation
"""

import re
import os
from pathlib import Path

def contains_chinese(text):
    """Check if text contains Chinese characters"""
    return bool(re.search(r'[\u4e00-\u9fff]+', text))

def check_file(file_path):
    """Check a single file for Chinese text"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        chinese_lines = []
        for line_num, line in enumerate(lines, 1):
            if contains_chinese(line):
                chinese_lines.append((line_num, line.strip()[:100]))
        
        return chinese_lines
    except Exception as e:
        return None

def main():
    print("=" * 80)
    print("CHECKING FOR REMAINING CHINESE TEXT")
    print("=" * 80)
    
    excluded_dirs = {'.git', '.translate', 'node_modules', '__pycache__', 'dist', 'build'}
    extensions = {'.js', '.html', '.htm', '.jsx', '.tsx', '.ts', '.py'}
    
    files_with_chinese = {}
    total_files_checked = 0
    
    for root, dirs, files in os.walk('.'):
        # Remove excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            if Path(file).suffix in extensions:
                total_files_checked += 1
                chinese_lines = check_file(file_path)
                if chinese_lines:
                    files_with_chinese[file_path] = chinese_lines
    
    print(f"\nTotal files checked: {total_files_checked}")
    print(f"Files with Chinese text: {len(files_with_chinese)}")
    
    if files_with_chinese:
        print("\n" + "=" * 80)
        print("FILES WITH REMAINING CHINESE TEXT:")
        print("=" * 80)
        
        for file_path, lines in sorted(files_with_chinese.items()):
            print(f"\n📄 {file_path}")
            print(f"   {len(lines)} line(s) with Chinese text:")
            for line_num, content in lines[:5]:  # Show first 5
                print(f"   Line {line_num}: {content}")
            if len(lines) > 5:
                print(f"   ... and {len(lines) - 5} more lines")
    else:
        print("\n✅ No Chinese text found! Translation is complete.")
    
    return len(files_with_chinese) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

