"""
Final Translation Applicator
Applies translations carefully to maintain code structure
"""

import json
import re
import os
from pathlib import Path

def apply_translations(translation_cache_path, root_dir='.'):
    """Apply translations to all files"""
    
    # Load translations
    with open(translation_cache_path, 'r', encoding='utf-8') as f:
        translations = json.load(f)
    
    print(f"Loaded {len(translations)} translations")
    
    # Sort by length (longest first to avoid partial matches)
    sorted_trans = sorted(translations.items(), key=lambda x: len(x[0]), reverse=True)
    
    excluded_dirs = {'.git', '.translate', 'node_modules', '__pycache__'}
    extensions = {'.js', '.html', '.htm'}
    
    total_files = 0
    modified_files = 0
    total_replacements = 0
    
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        for file in files:
            if Path(file).suffix not in extensions:
                continue
            
            file_path = os.path.join(root, file)
            total_files += 1
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                file_replacements = 0
                
                # Apply translations
                for chinese, english in sorted_trans:
                    if chinese in content:
                        count = content.count(chinese)
                        content = content.replace(chinese, english)
                        file_replacements += count
                
                # Write if modified
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    modified_files += 1
                    total_replacements += file_replacements
                    print(f"  ✓ {file_path}: {file_replacements} replacements")
            
            except Exception as e:
                print(f"  ✗ Error processing {file_path}: {e}")
    
    print(f"\nSummary:")
    print(f"  Total files: {total_files}")
    print(f"  Modified files: {modified_files}")
    print(f"  Total replacements: {total_replacements}")
    
    return modified_files > 0

if __name__ == "__main__":
    success = apply_translations('.translate/translation_cache_v2.json', '.')
    exit(0 if success else 1)

