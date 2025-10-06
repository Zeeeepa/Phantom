"""
Foreign Word Extractor Module

This module provides precise extraction of foreign words (specifically Chinese characters) 
from Python, JavaScript, TypeScript, and HTML files with exact location tracking.
"""

import re
import ast
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime
import subprocess
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('foreign_words_extraction.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ForeignWordExtractor:
    """Extracts foreign words from code files with precise location tracking."""

    @staticmethod
    def contains_foreign_text(string: str) -> bool:
        """Returns True if the given string contains Chinese characters."""
        chinese_regex = re.compile(r'[\u4e00-\u9fff]+')
        return chinese_regex.search(string) is not None

    @staticmethod
    def is_numeric_or_system_text(text: str) -> bool:
        """Check if text appears to be numeric, date-like, or system-generated."""
        patterns = [
            r'^\d+$',  # Pure numbers
            r'^\d{4}[-./]\d{1,2}[-./]\d{1,2}$',  # Dates
            r'^\d{1,2}:\d{2}(?::\d{2})?$',  # Times
            r'^\d+(\.\d+)?[a-zA-Z]{1,3}$',  # Units
            r'^#[0-9A-Fa-f]{3,6}$',  # Colors
            r'^[a-zA-Z0-9_-]+\.(com|org|net|edu)$',  # Domains
        ]
        return any(re.match(pattern, text) for pattern in patterns)

    @staticmethod
    def extract_from_file_content(file_path: str) -> Tuple[Set[str], List[Dict]]:
        """提取外语单词，增强位置记录的准确性"""
        file_path_obj = Path(file_path)
        file_extension = file_path_obj.suffix.lower()
        foreign_words = set()
        locations = []

        try:
            # 尝试多种编码
            encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb2312', 'big5', 'latin1', 'cp1252']
            content = None
            used_encoding = None

            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    used_encoding = encoding
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue

            if content is None:
                logger.warning(f"Could not decode file {file_path} with any supported encoding")
                return set(), []

            if not ForeignWordExtractor.contains_foreign_text(content):
                return set(), []

            # 根据文件类型提取
            if file_extension == '.py':
                words, locs = ForeignWordExtractor._extract_from_python(content, file_path)
            elif file_extension in ['.js', '.ts', '.jsx', '.tsx']:
                words, locs = ForeignWordExtractor._extract_from_javascript(content, file_path)
            elif file_extension in ['.html', '.htm']:
                words, locs = ForeignWordExtractor._extract_from_html(content, file_path)
            else:
                words, locs = ForeignWordExtractor._extract_generic(content, file_path)

            foreign_words.update(words)
            locations.extend(locs)

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")

        return foreign_words, locations

    @staticmethod
    def _extract_from_python(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from Python files."""
        words = set()
        locations = []

        # Extract from comments
        comment_words, comment_locs = ForeignWordExtractor._extract_python_comments(content, file_path)
        words.update(comment_words)
        locations.extend(comment_locs)

        # Extract from AST
        try:
            preprocessed_content = ForeignWordExtractor._preprocess_for_ast(content)
            tree = ast.parse(preprocessed_content)
            ast_words, ast_locs = ForeignWordExtractor._extract_from_ast(tree, file_path, content)
            words.update(ast_words)
            locations.extend(ast_locs)
        except SyntaxError as e:
            logger.debug(f"AST parsing failed for {file_path}, using regex fallback: {e}")
            regex_words, regex_locs = ForeignWordExtractor._extract_with_regex(content, file_path, 'python')
            words.update(regex_words)
            locations.extend(regex_locs)

        return words, locations

    @staticmethod
    def _extract_from_javascript(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        words = set()
        locations = []

        string_patterns = [
            r'"((?:[^"\\]|\\.)*)"',
            r"'((?:[^'\\]|\\.)*)'",
            r"`((?:[^`\\]|\\.)*)`"
        ]

        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            for pattern in string_patterns:
                for match in re.finditer(pattern, line):
                    text = match.group(1)
                    if text and ForeignWordExtractor.contains_foreign_text(text):
                        split_texts = ForeignWordExtractor._split_complex_string(text)
                        for split_text in split_texts:
                            if ForeignWordExtractor.contains_foreign_text(split_text):
                                words.add(split_text)
                                # 记录精确位置
                                start_col = match.start(1) + line.find(split_text)
                                locations.append({
                                    'word': split_text,
                                    'file': file_path,
                                    'line': line_num,
                                    'start_column': start_col,
                                    'end_column': start_col + len(split_text),
                                    'type': 'string_literal',
                                    'original_text': text
                                })

        # 提取注释（单行和多行）
        comment_words, comment_locs = ForeignWordExtractor._extract_js_comments(content, file_path)
        words.update(comment_words)
        locations.extend(comment_locs)

        return words, locations
    @staticmethod
    def _extract_from_html(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from HTML files."""
        words = set()
        locations = []

        # HTML comments
        comment_words, comment_locs = ForeignWordExtractor._extract_html_comments(content, file_path)
        words.update(comment_words)
        locations.extend(comment_locs)

        # HTML content
        content_words, content_locs = ForeignWordExtractor._extract_html_content(content, file_path)
        words.update(content_words)
        locations.extend(content_locs)

        return words, locations

    @staticmethod
    def _extract_generic(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Generic extraction for unsupported file types."""
        words = set()
        locations = []
        lines = content.splitlines()

        for line_num, line in enumerate(lines, 1):
            if ForeignWordExtractor.contains_foreign_text(line):
                split_words = ForeignWordExtractor._split_complex_string(line)
                for word in split_words:
                    if ForeignWordExtractor.contains_foreign_text(word):
                        words.add(word)
                        word_pos = line.find(word)
                        locations.append({
                            'word': word,
                            'file': file_path,
                            'line': line_num,
                            'start_column': word_pos,
                            'end_column': word_pos + len(word),
                            'type': 'generic_text',
                            'original_text': line.strip()
                        })

        return words, locations

    @staticmethod
    def _extract_python_comments(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from Python comments."""
        words = set()
        locations = []
        lines = content.splitlines()

        for line_num, line in enumerate(lines, 1):
            comment_match = re.search(r'#(.*)$', line)
            if comment_match:
                comment = comment_match.group(1).strip()
                if comment and ForeignWordExtractor.contains_foreign_text(comment):
                    start_col = comment_match.start(1)
                    split_comments = ForeignWordExtractor._split_complex_string(comment)

                    for split_comment in split_comments:
                        if ForeignWordExtractor.contains_foreign_text(split_comment):
                            words.add(split_comment)
                            comment_pos = comment.find(split_comment)
                            if comment_pos != -1:
                                exact_col = start_col + comment_pos
                                locations.append({
                                    'word': split_comment,
                                    'file': file_path,
                                    'line': line_num,
                                    'start_column': exact_col,
                                    'end_column': exact_col + len(split_comment),
                                    'type': 'comment',
                                    'original_text': comment
                                })
        return words, locations

    @staticmethod
    def _extract_js_comments(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from JavaScript/TypeScript comments."""
        words = set()
        locations = []
        lines = content.splitlines()

        # Single-line comments
        for line_num, line in enumerate(lines, 1):
            comment_match = re.search(r'\/\/(.*)$', line)
            if comment_match:
                comment = comment_match.group(1).strip()
                if comment and ForeignWordExtractor.contains_foreign_text(comment):
                    start_col = comment_match.start(1)
                    split_comments = ForeignWordExtractor._split_complex_string(comment)

                    for split_comment in split_comments:
                        if ForeignWordExtractor.contains_foreign_text(split_comment):
                            words.add(split_comment)
                            comment_pos = comment.find(split_comment)
                            if comment_pos != -1:
                                exact_col = start_col + comment_pos
                                locations.append({
                                    'word': split_comment,
                                    'file': file_path,
                                    'line': line_num,
                                    'start_column': exact_col,
                                    'end_column': exact_col + len(split_comment),
                                    'type': 'comment',
                                    'original_text': comment
                                })

        # Multi-line comments
        multiline_pattern = r'\/\*(.*?)\*\/'
        for match in re.finditer(multiline_pattern, content, re.DOTALL):
            comment = match.group(1).strip()
            if comment and ForeignWordExtractor.contains_foreign_text(comment):
                lines_before = content[:match.start()].count('\n')
                split_comments = ForeignWordExtractor._split_complex_string(comment)

                for split_comment in split_comments:
                    if ForeignWordExtractor.contains_foreign_text(split_comment):
                        words.add(split_comment)
                        locations.append({
                            'word': split_comment,
                            'file': file_path,
                            'line': lines_before + 1,
                            'start_column': match.start(),
                            'end_column': match.start() + len(split_comment),
                            'type': 'multiline_comment',
                            'original_text': comment
                        })

        return words, locations

    @staticmethod
    def _extract_html_comments(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from HTML comments."""
        words = set()
        locations = []

        # HTML comments
        pattern = r'<!--(.*?)-->'
        for match in re.finditer(pattern, content, re.DOTALL):
            comment = match.group(1).strip()
            if comment and ForeignWordExtractor.contains_foreign_text(comment):
                lines_before = content[:match.start()].count('\n')
                split_comments = ForeignWordExtractor._split_complex_string(comment)

                for split_comment in split_comments:
                    if ForeignWordExtractor.contains_foreign_text(split_comment):
                        words.add(split_comment)
                        locations.append({
                            'word': split_comment,
                            'file': file_path,
                            'line': lines_before + 1,
                            'start_column': match.start(),
                            'end_column': match.start() + len(split_comment),
                            'type': 'html_comment',
                            'original_text': comment
                        })

        return words, locations

    @staticmethod
    def _extract_html_content(content: str, file_path: str) -> Tuple[Set[str], List[Dict]]:
        """Extract foreign words from HTML content."""
        words = set()
        locations = []

        # Text between tags
        text_pattern = r'>([^<]+)<'
        for match in re.finditer(text_pattern, content):
            text = match.group(1).strip()
            if text and ForeignWordExtractor.contains_foreign_text(text):
                lines_before = content[:match.start()].count('\n')
                split_texts = ForeignWordExtractor._split_complex_string(text)

                for split_text in split_texts:
                    if ForeignWordExtractor.contains_foreign_text(split_text):
                        words.add(split_text)
                        locations.append({
                            'word': split_text,
                            'file': file_path,
                            'line': lines_before + 1,
                            'start_column': match.start(1),
                            'end_column': match.start(1) + len(split_text),
                            'type': 'html_text',
                            'original_text': text
                        })

        # HTML attributes
        attr_pattern = r'(\w+)\s*=\s*["\']([^"\']*)["\']'
        for match in re.finditer(attr_pattern, content):
            attr_name = match.group(1).lower()
            attr_value = match.group(2).strip()

            if attr_name in ['alt', 'title', 'placeholder', 'value', 'content', 'label']:
                if attr_value and ForeignWordExtractor.contains_foreign_text(attr_value):
                    lines_before = content[:match.start()].count('\n')
                    split_attrs = ForeignWordExtractor._split_complex_string(attr_value)

                    for split_attr in split_attrs:
                        if ForeignWordExtractor.contains_foreign_text(split_attr):
                            words.add(split_attr)
                            locations.append({
                                'word': split_attr,
                                'file': file_path,
                                'line': lines_before + 1,
                                'start_column': match.start(2),
                                'end_column': match.start(2) + len(split_attr),
                                'type': 'html_attribute',
                                'original_text': attr_value
                            })

        return words, locations

    @staticmethod
    def _preprocess_for_ast(content: str) -> str:
        """Pre-sanitize content to fix common issues preventing AST parse."""
        def fix_match(m):
            prefix = m.group(1)
            bad_name = m.group(2)
            fixed = re.sub(r'\s+', '', bad_name)
            return f"{prefix}{fixed}"

        content = re.sub(r'(def\s+)([a-zA-Z_\u4e00-\u9fff][\w\s\u4e00-\u9fff]*?)\s*\(', fix_match, content)
        content = re.sub(r'(class\s+)([a-zA-Z_\u4e00-\u9fff][\w\s\u4e00-\u9fff]*?)\s*[:\(]', fix_match, content)
        return content

    @staticmethod
    def _extract_from_ast(tree, file_path: str, content: str) -> Tuple[Set[str], List[Dict]]:
        """Extract using AST parsing with location tracking."""
        words = set()
        locations = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Str):
                if hasattr(node, 's') and ForeignWordExtractor.contains_foreign_text(node.s):
                    split_strings = ForeignWordExtractor._split_complex_string(node.s)
                    for split_str in split_strings:
                        if ForeignWordExtractor.contains_foreign_text(split_str):
                            words.add(split_str)
                            locations.append({
                                'word': split_str,
                                'file': file_path,
                                'line': node.lineno,
                                'start_column': node.col_offset,
                                'end_column': node.col_offset + len(split_str),
                                'type': 'string_literal',
                                'original_text': node.s
                            })

            if isinstance(node, ast.Name):
                if ForeignWordExtractor.contains_foreign_text(node.id):
                    clean_id = re.sub(r'\s+', '', node.id)
                    words.add(clean_id)
                    locations.append({
                        'word': clean_id,
                        'file': file_path,
                        'line': node.lineno,
                        'start_column': node.col_offset,
                        'end_column': node.col_offset + len(node.id),
                        'type': 'identifier',
                        'original_text': node.id
                    })

            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                if ForeignWordExtractor.contains_foreign_text(node.name):
                    words.add(node.name)
                    locations.append({
                        'word': node.name,
                        'file': file_path,
                        'line': node.lineno,
                        'start_column': node.col_offset,
                        'end_column': node.col_offset + len(node.name),
                        'type': 'function_class_name',
                        'original_text': node.name
                    })

        return words, locations

    @staticmethod
    def _extract_with_regex(content: str, file_path: str, language: str) -> Tuple[Set[str], List[Dict]]:
        """Regex-based extraction fallback."""
        words = set()
        locations = []
        lines = content.splitlines()

        # String literals
        string_patterns = [r'"((?:[^"\\]|\\.)*)"', r"'((?:[^'\\]|\\.)*)'"]
        if language == 'javascript':
            string_patterns.append(r'`((?:[^`\\]|\\.)*)`')

        for line_num, line in enumerate(lines, 1):
            for pattern in string_patterns:
                for match in re.finditer(pattern, line):
                    text = match.group(1)
                    if text and ForeignWordExtractor.contains_foreign_text(text):
                        split_texts = ForeignWordExtractor._split_complex_string(text)
                        for st in split_texts:
                            if ForeignWordExtractor.contains_foreign_text(st):
                                words.add(st)
                                locations.append({
                                    'word': st,
                                    'file': file_path,
                                    'line': line_num,
                                    'start_column': match.start(1),
                                    'end_column': match.start(1) + len(st),
                                    'type': 'string_literal',
                                    'original_text': text
                                })

        return words, locations

    @staticmethod
    def _split_complex_string(text: str) -> List[str]:
        """Split complex strings into individual phrases."""
        if not text or not ForeignWordExtractor.contains_foreign_text(text):
            return []

        text = text.strip()

        # Remove common prefixes
        prefixes_to_remove = ['[Local Message]', '[System]', '[Debug]', '[Info]', '[Warning]', '[Error]']
        for prefix in prefixes_to_remove:
            if text.startswith(prefix):
                text = text.replace(prefix, '').strip()

        delimiters = [
            "，", "。", "）", "（", "(", ")", "<", ">", "[", "]", "【", "】",
            "？", "：", ":", ",", "#", "\n", ";", "`", " ", "- ", "---",
            "！", "!", "、", "…", "～", "｜", "|", "　"
        ]

        parts = [text]
        for delimiter in delimiters:
            new_parts = []
            for part in parts:
                if delimiter in part:
                    split_parts = [p.strip() for p in part.split(delimiter)]
                    for p in split_parts:
                        if p and ForeignWordExtractor.contains_foreign_text(p):
                            new_parts.append(p)
                else:
                    if ForeignWordExtractor.contains_foreign_text(part):
                        new_parts.append(part)
            parts = new_parts

        # Filter out URLs, code fragments, and system text
        filtered_parts = []
        for part in parts:
            part = part.strip()
            if (
                not ForeignWordExtractor.is_numeric_or_system_text(part) and
                not any(url in part.lower() for url in [".com", ".org", ".net", "http", "www.", "https"]) and
                not part.count('"') > 0 and
                not part.count("'") > 0 and
                not part.startswith("//") and
                not part.startswith("/*") and
                len(part) > 0
            ):
                filtered_parts.append(part)

        return filtered_parts


class ProjectScanner:
    """Comprehensive project scanner for foreign words with caching."""

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.translate_dir = self.project_path / ".translate"
        self.foreign_words = set()
        self.locations = []

        # Ensure .translate directory exists
        self.translate_dir.mkdir(exist_ok=True)

    def scan_project(self) -> Dict[str, any]:
        """Scan the entire project for foreign words."""
        logger.info(f"Starting comprehensive scan of project: {self.project_path}")

        scan_results = {
            'total_files': 0,
            'processed_files': 0,
            'foreign_files': 0,
            'total_foreign_words': 0,
            'total_locations': 0,
            'file_types': {},
            'errors': []
        }

        supported_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.htm'}

        for root, _, files in os.walk(self.project_path):
            # Skip hidden directories and common excluded directories
            if any(part.startswith('.') or part in {
                '.git', '__pycache__', 'build', 'dist', 'venv', 'node_modules',
                '.translate', 'coverage', '.pytest_cache', '.mypy_cache'
            } for part in Path(root).parts):
                continue

            for file in files:
                file_path = Path(root) / file
                file_extension = file_path.suffix.lower()

                scan_results['total_files'] += 1

                if file_extension in supported_extensions:
                    scan_results['processed_files'] += 1
                    scan_results['file_types'][file_extension] = scan_results['file_types'].get(file_extension, 0) + 1

                    try:
                        logger.info(f"Processing file: {file_path}")
                        words, locations = ForeignWordExtractor.extract_from_file_content(str(file_path))

                        if words:
                            scan_results['foreign_files'] += 1
                            self.foreign_words.update(words)
                            self.locations.extend(locations)

                    except Exception as e:
                        error_msg = f"Error processing {file_path}: {str(e)}"
                        logger.error(error_msg)
                        scan_results['errors'].append(error_msg)

        scan_results['total_foreign_words'] = len(self.foreign_words)
        scan_results['total_locations'] = len(self.locations)

        logger.info(f"Scan complete: {scan_results['total_foreign_words']} unique foreign words "
                   f"found at {scan_results['total_locations']} locations")

        return scan_results

    def save_extraction_cache(self) -> bool:
        """Save extraction results to .translate directory."""
        try:
            # Create comprehensive cache data
            cache_data = {
                "metadata": {
                    "project_path": str(self.project_path),
                    "scan_date": datetime.now().isoformat(),
                    "total_words": len(self.foreign_words),
                    "total_locations": len(self.locations)
                },
                "foreign_words": sorted(list(self.foreign_words)),
                "locations": self.locations
            }

            # Save main cache file
            cache_file = self.translate_dir / "extraction_cache.json"
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            logger.info(f"Extraction cache saved: {cache_file}")

            # Save word list for translation
            words_file = self.translate_dir / "foreign_words_list.txt"
            with open(words_file, 'w', encoding='utf-8') as f:
                for word in sorted(self.foreign_words):
                    f.write(f"{word}\n")
            logger.info(f"Foreign words list saved: {words_file}")

            return True

        except Exception as e:
            logger.error(f"Error saving extraction cache: {e}")
            return False

    def get_project_statistics(self) -> Dict[str, any]:
        """Get comprehensive project statistics."""
        stats = {
            'project_name': self.project_path.name,
            'project_path': str(self.project_path),
            'foreign_words_count': len(self.foreign_words),
            'locations_count': len(self.locations),
            'word_types': {},
            'file_distribution': {},
            'top_words': []
        }

        # Analyze word types
        for location in self.locations:
            word_type = location.get('type', 'unknown')
            stats['word_types'][word_type] = stats['word_types'].get(word_type, 0) + 1

        # Analyze file distribution
        for location in self.locations:
            file_path = Path(location['file']).suffix
            stats['file_distribution'][file_path] = stats['file_distribution'].get(file_path, 0) + 1

        # Top words by frequency
        word_counts = {}
        for location in self.locations:
            word = location['word']
            word_counts[word] = word_counts.get(word, 0) + 1

        stats['top_words'] = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:20]

        return stats


if __name__ == "__main__":
    scanner = ProjectScanner(".")
    results = scanner.scan_project()
    scanner.save_extraction_cache()
    stats = scanner.get_project_statistics()
    
    print("\n" + "="*60)
    print("SCAN RESULTS")
    print("="*60)
    print(f"Total files scanned: {results['total_files']}")
    print(f"Files processed: {results['processed_files']}")
    print(f"Files with foreign words: {results['foreign_files']}")
    print(f"Unique foreign words found: {results['total_foreign_words']}")
    print(f"Total locations: {results['total_locations']}")
    print("\nFile types processed:")
    for ext, count in results['file_types'].items():
        print(f"  {ext}: {count} files")
    
    print("\n" + "="*60)
    print("TOP 20 MOST COMMON WORDS")
    print("="*60)
    for word, count in stats['top_words']:
        print(f"{word}: {count} occurrences")

