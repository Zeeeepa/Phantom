"""
Apply translations to JavaScript and HTML files
Safely replaces Chinese text with English translations
"""

import json
import re
import os
from pathlib import Path
from typing import Dict, List, Tuple
import html
from html.parser import HTMLParser

class TranslationApplicator:
    """Applies translations to code files"""
    
    def __init__(self, translation_cache_path: str):
        """Initialize with translation cache"""
        with open(translation_cache_path, 'r', encoding='utf-8') as f:
            self.translations = json.load(f)
        print(f"✓ Loaded {len(self.translations)} translations")
    
    def apply_to_javascript(self, file_path: str) -> Tuple[bool, int]:
        """Apply translations to a JavaScript file"""
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            replacements = 0
            
            # Sort translations by length (longest first) to avoid partial replacements
            sorted_translations = sorted(
                self.translations.items(),
                key=lambda x: len(x[0]),
                reverse=True
            )
            
            # Apply translations
            for chinese, english in sorted_translations:
                if chinese in content:
                    # Use regex to replace only in string contexts
                    # Match strings in single quotes, double quotes, or template literals
                    patterns = [
                        # Double quotes
                        (rf'"([^"]*{re.escape(chinese)}[^"]*)"', 
                         lambda m: '"' + m.group(1).replace(chinese, english) + '"'),
                        # Single quotes
                        (rf"'([^']*{re.escape(chinese)}[^']*)'",
                         lambda m: "'" + m.group(1).replace(chinese, english) + "'"),
                        # Template literals
                        (rf'`([^`]*{re.escape(chinese)}[^`]*)`',
                         lambda m: '`' + m.group(1).replace(chinese, english) + '`'),
                        # Comments (//  style)
                        (rf'//(.* {re.escape(chinese)}.*)',
                         lambda m: '//' + m.group(1).replace(chinese, english)),
                        # Multi-line comments
                        (rf'/\*([^*]*{re.escape(chinese)}[^*]*)\*/',
                         lambda m: '/*' + m.group(1).replace(chinese, english) + '*/'),
                    ]
                    
                    for pattern, replacement in patterns:
                        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
                        if new_content != content:
                            replacements += 1
                            content = new_content
            
            # Only write if changes were made
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, replacements
            
            return False, 0
            
        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}")
            return False, 0
    
    def apply_to_html(self, file_path: str) -> Tuple[bool, int]:
        """Apply translations to an HTML file"""
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            replacements = 0
            
            # Sort translations by length (longest first)
            sorted_translations = sorted(
                self.translations.items(),
                key=lambda x: len(x[0]),
                reverse=True
            )
            
            # Apply translations to HTML content and attributes
            for chinese, english in sorted_translations:
                if chinese in content:
                    # Replace in text nodes (between tags)
                    content = re.sub(
                        rf'>([^<]*{re.escape(chinese)}[^<]*)<',
                        lambda m: '>' + m.group(1).replace(chinese, english) + '<',
                        content
                    )
                    
                    # Replace in attributes (title, placeholder, alt, value, etc.)
                    for attr in ['title', 'placeholder', 'alt', 'value', 'label', 'aria-label', 'data-.*']:
                        # Double quotes
                        content = re.sub(
                            rf'{attr}="([^"]*{re.escape(chinese)}[^"]*)"',
                            lambda m: f'{attr}="' + m.group(1).replace(chinese, english) + '"',
                            content,
                            flags=re.IGNORECASE
                        )
                        # Single quotes
                        content = re.sub(
                            rf"{attr}='([^']*{re.escape(chinese)}[^']*)'",
                            lambda m: f"{attr}='" + m.group(1).replace(chinese, english) + "'",
                            content,
                            flags=re.IGNORECASE
                        )
                    
                    # Replace in HTML comments
                    content = re.sub(
                        rf'<!--([^>]*{re.escape(chinese)}[^>]*)-->',
                        lambda m: '<!--' + m.group(1).replace(chinese, english) + '-->',
                        content
                    )
                    
                    # Replace in script tags
                    content = re.sub(
                        rf'<script[^>]*>(.*?{re.escape(chinese)}.*?)</script>',
                        lambda m: m.group(0).replace(chinese, english),
                        content,
                        flags=re.DOTALL
                    )
                    
                    if content != original_content:
                        replacements += 1
                        original_content = content
            
            # Only write if changes were made
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, replacements
            
            return False, 0
            
        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}")
            return False, 0

def find_files_to_process(root_dir: str) -> Tuple[List[str], List[str]]:
    """Find all JavaScript and HTML files to process"""
    js_files = []
    html_files = []
    
    for root, dirs, files in os.walk(root_dir):
        # Skip hidden directories and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for file in files:
            file_path = os.path.join(root, file)
            if file.endswith('.js'):
                js_files.append(file_path)
            elif file.endswith(('.html', '.htm')):
                html_files.append(file_path)
    
    return js_files, html_files

def main():
    print("=" * 80)
    print("TRANSLATION APPLICATOR - Phantom Browser Extension")
    print("=" * 80)
    
    # Load translation cache
    print("\n[1/5] Loading translation cache...")
    cache_path = '.translate/translation_cache.json'
    applicator = TranslationApplicator(cache_path)
    
    # Find files to process
    print("\n[2/5] Finding files to process...")
    js_files, html_files = find_files_to_process('.')
    print(f"✓ Found {len(js_files)} JavaScript files")
    print(f"✓ Found {len(html_files)} HTML files")
    
    # Process JavaScript files
    print("\n[3/5] Processing JavaScript files...")
    js_modified = 0
    js_total_replacements = 0
    
    for js_file in js_files:
        modified, replacements = applicator.apply_to_javascript(js_file)
        if modified:
            js_modified += 1
            js_total_replacements += replacements
            print(f"  ✓ {js_file}: {replacements} replacement(s)")
    
    print(f"✓ Modified {js_modified}/{len(js_files)} JavaScript files")
    print(f"✓ Total JavaScript replacements: {js_total_replacements}")
    
    # Process HTML files
    print("\n[4/5] Processing HTML files...")
    html_modified = 0
    html_total_replacements = 0
    
    for html_file in html_files:
        modified, replacements = applicator.apply_to_html(html_file)
        if modified:
            html_modified += 1
            html_total_replacements += replacements
            print(f"  ✓ {html_file}: {replacements} replacement(s)")
    
    print(f"✓ Modified {html_modified}/{len(html_files)} HTML files")
    print(f"✓ Total HTML replacements: {html_total_replacements}")
    
    # Summary
    print("\n[5/5] Summary")
    print("=" * 80)
    print(f"Total files processed: {len(js_files) + len(html_files)}")
    print(f"Total files modified: {js_modified + html_modified}")
    print(f"Total replacements: {js_total_replacements + html_total_replacements}")
    print("=" * 80)
    print("\n✓ Translation application complete!")
    
    return js_modified + html_modified > 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

