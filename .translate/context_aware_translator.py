"""
Context-Aware Translator
ONLY translates string literals and comments, NOT code identifiers
"""

import json
import re

def translate_text(text, translations):
    """Apply translations to text"""
    result = text
    for cn, en in sorted(translations.items(), key=lambda x: len(x[0]), reverse=True):
        if cn in result:
            result = result.replace(cn, en)
    return result

def translate_javascript_file(filepath, translations):
    """
    Translate JavaScript file - ONLY strings and comments
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = []
    i = 0
    changes = 0
    
    while i < len(content):
        # Double-quoted strings
        if content[i] == '"':
            result.append('"')
            i += 1
            string_content = ""
            
            while i < len(content) and content[i] != '"':
                if content[i] == '\\' and i + 1 < len(content):
                    string_content += content[i:i+2]
                    i += 2
                else:
                    string_content += content[i]
                    i += 1
            
            # Translate string content
            translated = translate_text(string_content, translations)
            if translated != string_content:
                changes += 1
            result.append(translated)
            
            if i < len(content):
                result.append(content[i])  # closing quote
                i += 1
        
        # Single-quoted strings
        elif content[i] == "'":
            result.append("'")
            i += 1
            string_content = ""
            
            while i < len(content) and content[i] != "'":
                if content[i] == '\\' and i + 1 < len(content):
                    string_content += content[i:i+2]
                    i += 2  # Skip both backslash and next char
                else:
                    string_content += content[i]
                    i += 1
            
            # Translate string content
            translated = translate_text(string_content, translations)
            if translated != string_content:
                changes += 1
            result.append(translated)
            
            if i < len(content):
                result.append(content[i])  # closing quote
                i += 1
        
        # Template literals
        elif content[i] == '`':
            result.append('`')
            i += 1
            template_content = ""
            
            while i < len(content) and content[i] != '`':
                if content[i] == '\\' and i + 1 < len(content):
                    template_content += content[i:i+2]
                    i += 2
                # Don't translate inside ${}
                elif i < len(content) - 1 and content[i:i+2] == '${':
                    template_content += '${'
                    i += 2
                    depth = 1
                    while i < len(content) and depth > 0:
                        if content[i] == '{':
                            depth += 1
                        elif content[i] == '}':
                            depth -= 1
                        template_content += content[i]
                        i += 1
                else:
                    template_content += content[i]
                    i += 1
            
            # Translate template content (but ${} expressions are preserved)
            translated = translate_text(template_content, translations)
            if translated != template_content:
                changes += 1
            result.append(translated)
            
            if i < len(content):
                result.append(content[i])  # closing backtick
                i += 1
        
        # Single-line comments
        elif i < len(content) - 1 and content[i:i+2] == '//':
            comment_start = i
            i += 2
            comment_content = "//"
            
            while i < len(content) and content[i] not in ['\n', '\r']:
                comment_content += content[i]
                i += 1
            
            # Translate comment
            translated = translate_text(comment_content, translations)
            if translated != comment_content:
                changes += 1
            result.append(translated)
        
        # Multi-line comments
        elif i < len(content) - 1 and content[i:i+2] == '/*':
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
            translated = translate_text(comment_content, translations)
            if translated != comment_content:
                changes += 1
            result.append(translated)
        
        else:
            result.append(content[i])
            i += 1
    
    return ''.join(result), changes

def translate_html_file(filepath, translations):
    """Translate HTML file - text nodes, attributes, and comments"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Translate HTML comments
    def translate_html_comment(match):
        return '<!--' + translate_text(match.group(1), translations) + '-->'
    
    content = re.sub(r'<!--(.*?)-->', translate_html_comment, content, flags=re.DOTALL)
    
    # Translate text between tags
    def translate_text_node(match):
        return '>' + translate_text(match.group(1), translations) + '<'
    
    content = re.sub(r'>([^<]+)<', translate_text_node, content)
    
    # Translate specific attributes
    for attr in ['title', 'placeholder', 'alt', 'value', 'aria-label']:
        def translate_attr(match):
            return f'{attr}="' + translate_text(match.group(1), translations) + '"'
        
        content = re.sub(rf'{attr}="([^"]*)"', translate_attr, content, flags=re.IGNORECASE)
    
    return content, 1  # Simplified - just mark as changed

def main():
    print("=" * 80)
    print("CONTEXT-AWARE TRANSLATION APPLICATION")
    print("=" * 80)
    
    # Load translations
    print("\n[1/4] Loading translation cache...")
    with open('.translate/translation_cache_v3.json', 'r', encoding='utf-8') as f:
        translations = json.load(f)
    print(f"  ✓ Loaded {len(translations)} translations")
    
    # Process files
    import os
    from pathlib import Path
    
    excluded_dirs = {'.git', '.translate', 'node_modules'}
    
    js_files = []
    html_files = []
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        for file in files:
            filepath = os.path.join(root, file)
            if file.endswith('.js'):
                js_files.append(filepath)
            elif file.endswith(('.html', '.htm')):
                html_files.append(filepath)
    
    print(f"\n[2/4] Found {len(js_files)} JavaScript and {len(html_files)} HTML files")
    
    # Translate JavaScript
    print(f"\n[3/4] Translating JavaScript files...")
    js_modified = 0
    total_js_changes = 0
    
    for jsfile in js_files:
        try:
            translated_content, changes = translate_javascript_file(jsfile, translations)
            if changes > 0:
                with open(jsfile, 'w', encoding='utf-8') as f:
                    f.write(translated_content)
                js_modified += 1
                total_js_changes += changes
                print(f"  ✓ {jsfile}: {changes} changes")
        except Exception as e:
            print(f"  ✗ Error in {jsfile}: {e}")
    
    # Translate HTML
    print(f"\n[4/4] Translating HTML files...")
    html_modified = 0
    
    for htmlfile in html_files:
        try:
            translated_content, _ = translate_html_file(htmlfile, translations)
            with open(htmlfile, 'w', encoding='utf-8') as f:
                f.write(translated_content)
            html_modified += 1
            print(f"  ✓ {htmlfile}")
        except Exception as e:
            print(f"  ✗ Error in {htmlfile}: {e}")
    
    print(f"\n{'=' * 80}")
    print(f"SUMMARY")
    print(f"{'=' * 80}")
    print(f"JavaScript files modified: {js_modified}/{len(js_files)}")
    print(f"Total JavaScript changes: {total_js_changes}")
    print(f"HTML files modified: {html_modified}/{len(html_files)}")
    print(f"{'=' * 80}\n")

if __name__ == "__main__":
    main()
