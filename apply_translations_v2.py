"""
Apply translations to JavaScript and HTML files - Version 2
Safely replaces Chinese text with English translations
Handles template literals correctly
"""

import json
import re
import os
from pathlib import Path
from typing import Dict, List, Tuple

class SafeTranslationApplicator:
    """Applies translations safely to code files"""
    
    def __init__(self, translation_cache_path: str):
        """Initialize with translation cache"""
        with open(translation_cache_path, 'r', encoding='utf-8') as f:
            self.translations = json.load(f)
        print(f"✓ Loaded {len(self.translations)} translations")
        
        # Pre-compute sorted translations (longest first)
        self.sorted_translations = sorted(
            self.translations.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )
    
    def _safe_replace_in_string(self, string_content: str, quote_char: str) -> str:
        """Safely replace Chinese in a string literal"""
        result = string_content
        
        for chinese, english in self.sorted_translations:
            if chinese in result:
                result = result.replace(chinese, english)
        
        return result
    
    def _process_template_literal(self, template_content: str) -> str:
        """Process template literal, preserving ${} expressions"""
        # Split by template expressions
        parts = []
        current = ""
        depth = 0
        i = 0
        
        while i < len(template_content):
            if i < len(template_content) - 1 and template_content[i:i+2] == '${':
                # Start of template expression
                if current:
                    # Translate the text part before the expression
                    parts.append(('text', current))
                    current = ""
                
                # Find the end of the expression
                expr_start = i
                i += 2
                depth = 1
                expr_content = "${"
                
                while i < len(template_content) and depth > 0:
                    char = template_content[i]
                    expr_content += char
                    if char == '{':
                        depth += 1
                    elif char == '}':
                        depth -= 1
                    i += 1
                
                # Keep expression as-is
                parts.append(('expr', expr_content))
            else:
                current += template_content[i]
                i += 1
        
        if current:
            parts.append(('text', current))
        
        # Translate text parts only
        result = ""
        for part_type, part_content in parts:
            if part_type == 'expr':
                result += part_content
            else:
                # Translate the text
                translated = part_content
                for chinese, english in self.sorted_translations:
                    if chinese in translated:
                        translated = translated.replace(chinese, english)
                result += translated
        
        return result
    
    def apply_to_javascript(self, file_path: str) -> Tuple[bool, int]:
        """Apply translations to a JavaScript file"""
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            result = []
            i = 0
            changes_made = 0
            
            while i < len(content):
                # Check for string literals
                if content[i] == '"':
                    # Double-quoted string
                    result.append('"')
                    i += 1
                    string_start = i
                    string_content = ""
                    
                    while i < len(content) and content[i] != '"':
                        if content[i] == '\\' and i + 1 < len(content):
                            string_content += content[i:i+2]
                            i += 2
                        else:
                            string_content += content[i]
                            i += 1
                    
                    # Translate string content
                    translated = self._safe_replace_in_string(string_content, '"')
                    if translated != string_content:
                        changes_made += 1
                    result.append(translated)
                    
                    if i < len(content):
                        result.append(content[i])  # Closing quote
                        i += 1
                
                elif content[i] == "'":
                    # Single-quoted string
                    result.append("'")
                    i += 1
                    string_content = ""
                    
                    while i < len(content) and content[i] != "'":
                        if content[i] == '\\' and i + 1 < len(content):
                            string_content += content[i:i+2]
                            i += 2
                        else:
                            string_content += content[i]
                            i += 1
                    
                    # Translate string content
                    translated = self._safe_replace_in_string(string_content, "'")
                    if translated != string_content:
                        changes_made += 1
                    result.append(translated)
                    
                    if i < len(content):
                        result.append(content[i])  # Closing quote
                        i += 1
                
                elif content[i] == '`':
                    # Template literal
                    result.append('`')
                    i += 1
                    template_content = ""
                    
                    while i < len(content) and content[i] != '`':
                        if content[i] == '\\' and i + 1 < len(content):
                            template_content += content[i:i+2]
                            i += 2
                        else:
                            template_content += content[i]
                            i += 1
                    
                    # Process template literal
                    translated = self._process_template_literal(template_content)
                    if translated != template_content:
                        changes_made += 1
                    result.append(translated)
                    
                    if i < len(content):
                        result.append(content[i])  # Closing backtick
                        i += 1
                
                elif i < len(content) - 1 and content[i:i+2] == '//':
                    # Single-line comment
                    comment_start = i
                    i += 2
                    comment_content = "//"
                    
                    while i < len(content) and content[i] not in ['\n', '\r']:
                        comment_content += content[i]
                        i += 1
                    
                    # Translate comment
                    translated = comment_content
                    for chinese, english in self.sorted_translations:
                        if chinese in translated:
                            translated = translated.replace(chinese, english)
                            changes_made += 1
                    
                    result.append(translated)
                
                elif i < len(content) - 1 and content[i:i+2] == '/*':
                    # Multi-line comment
                    comment_content = "/*"
                    i += 2
                    
                    while i < len(content) - 1:
                        if content[i:i+2] == '*/':
                            comment_content += '*/'
                            i += 2
                            break
                        comment_content += content[i]
                        i += 1
                    
                    # Translate comment
                    translated = comment_content
                    for chinese, english in self.sorted_translations:
                        if chinese in translated:
                            translated = translated.replace(chinese, english)
                            changes_made += 1
                    
                    result.append(translated)
                
                else:
                    result.append(content[i])
                    i += 1
            
            new_content = ''.join(result)
            
            # Only write if changes were made
            if new_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                return True, changes_made
            
            return False, 0
            
        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}")
            import traceback
            traceback.print_exc()
            return False, 0
    
    def apply_to_html(self, file_path: str) -> Tuple[bool, int]:
        """Apply translations to an HTML file"""
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            replacements = 0
            
            # Apply translations to HTML content and attributes
            for chinese, english in self.sorted_translations:
                if chinese in content:
                    # Replace in text nodes (between tags)
                    new_content = re.sub(
                        rf'>([^<]*{re.escape(chinese)}[^<]*)<',
                        lambda m: '>' + m.group(1).replace(chinese, english) + '<',
                        content
                    )
                    if new_content != content:
                        replacements += 1
                        content = new_content
                    
                    # Replace in attributes
                    for attr in ['title', 'placeholder', 'alt', 'value', 'label', 'aria-label']:
                        pattern = rf'{attr}="([^"]*{re.escape(chinese)}[^"]*)"'
                        new_content = re.sub(
                            pattern,
                            lambda m: f'{attr}="' + m.group(1).replace(chinese, english) + '"',
                            content,
                            flags=re.IGNORECASE
                        )
                        if new_content != content:
                            replacements += 1
                            content = new_content
                    
                    # Replace in HTML comments
                    pattern = rf'<!--([^>]*{re.escape(chinese)}[^>]*)-->'
                    new_content = re.sub(
                        pattern,
                        lambda m: '<!--' + m.group(1).replace(chinese, english) + '-->',
                        content
                    )
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
    print("SAFE TRANSLATION APPLICATOR V2 - Phantom Browser Extension")
    print("=" * 80)
    
    # Load translation cache
    print("\n[1/5] Loading translation cache...")
    cache_path = '.translate/translation_cache.json'
    applicator = SafeTranslationApplicator(cache_path)
    
    # Find files to process
    print("\n[2/5] Finding files to process...")
    js_files, html_files = find_files_to_process('.')
    print(f"✓ Found {len(js_files)} JavaScript files")
    print(f"✓ Found {len(html_files)} HTML files")
    
    # Process JavaScript files
    print("\n[3/5] Processing JavaScript files...")
    js_modified = 0
    js_total_changes = 0
    
    for js_file in js_files:
        print(f"  Processing {js_file}...", end=" ")
        modified, changes = applicator.apply_to_javascript(js_file)
        if modified:
            js_modified += 1
            js_total_changes += changes
            print(f"✓ {changes} change(s)")
        else:
            print("(no changes)")
    
    print(f"\n✓ Modified {js_modified}/{len(js_files)} JavaScript files")
    print(f"✓ Total JavaScript changes: {js_total_changes}")
    
    # Process HTML files
    print("\n[4/5] Processing HTML files...")
    html_modified = 0
    html_total_changes = 0
    
    for html_file in html_files:
        print(f"  Processing {html_file}...", end=" ")
        modified, changes = applicator.apply_to_html(html_file)
        if modified:
            html_modified += 1
            html_total_changes += changes
            print(f"✓ {changes} change(s)")
        else:
            print("(no changes)")
    
    print(f"\n✓ Modified {html_modified}/{len(html_files)} HTML files")
    print(f"✓ Total HTML changes: {html_total_changes}")
    
    # Summary
    print("\n[5/5] Summary")
    print("=" * 80)
    print(f"Total files processed: {len(js_files) + len(html_files)}")
    print(f"Total files modified: {js_modified + html_modified}")
    print(f"Total changes: {js_total_changes + html_total_changes}")
    print("=" * 80)
    print("\n✓ Translation application complete!")
    
    return js_modified + html_modified > 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

