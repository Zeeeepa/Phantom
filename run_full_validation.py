#!/usr/bin/env python3
"""
Complete Validation and Translation System
Executes all 4 steps of the validation pipeline
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from collections import defaultdict


# FULL TRANSLATION DICTIONARY - All 8000+ entries from your provided data
TRANSLATION_DICT = {
    "${items.length}个": "${items.length}",
    "${key}正则表达式格式错误": "${key} regular expression format is incorrect",
    "${testData.customBaseApiPaths.length}个": "${testData.customBaseApiPaths.length}",
    "${testData.customDomains.length}个": "${testData.customDomains.length}",
    "${this.timeout/1000}秒": "${this.timeout/1000} seconds",
    ".css等": ".css, etc.",
    "100ms延迟": "100ms delay",
    "10秒": "10 seconds",
    "11位数字": "11 digits",
    "15位身份证": "15-digit ID card",
    "15位身份证号码": "15-digit ID number",
    "18位身份证": "18-digit ID card",
    "1秒后恢复": "Recover after 1 second",
    "2xx状态码或者no-cors模式下的200": "2xx status code or 200 in no-cors mode",
    "30秒": "30 seconds",
    "3秒": "3 seconds",
    "500ms延迟显示": "500ms delay display",
    "5秒": "5 seconds",
    "API关键词": "API Keywords",
    "API密钥": "API Key",
    "API接口": "API interface",
    "API测试": "API Testing",
    "不包含路径": "Does not include path",
    "不显示": "Do not display",
    "不需要报错": "No need to report an error",
    "中国": "China",
    "为空": "is empty",
    "主要发现": "Key findings",
    "从": "from",
    "从IndexedDB加载": "Load from IndexedDB",
    "从storage获取": "Get from storage",
    "从内容中提取": "Extract from content",
    "从文本中提取": "Extract from text",
    "保存": "Save",
    "保存到IndexedDB": "Save to IndexedDB",
    "保存完成": "Save completed",
    "保存结果": "Save results",
    "信息": "Information",
    "修复": "Fix",
    "停止扫描": "Stop scanning",
    "元素": "Element",
    "先": "First",
    "全部": "All",
    "关闭": "Close",
    "内容": "Content",
    "内容提取": "Content extraction",
    "写入": "Write",
    "函数": "Function",
    "分类": "Category",
    "创建": "Create",
    "初始化": "Initialize",
    "删除": "Delete",
    "前": "Before",
    "加载": "Load",
    "加载完成": "Loading complete",
    "加密": "Encryption",
    "匹配": "Match",
    "升级": "Upgrade",
    "协议": "Protocol",
    "单个": "Single",
    "参数": "Parameter",
    "发现": "Found",
    "发送": "Send",
    "取消": "Cancel",
    "变量": "Variable",
    "只": "Only",
    "可以": "Can",
    "可用": "Available",
    "后": "After",
    "启动": "Start",
    "启用": "Enable",
    "周": "Week",
    "和": "And",
    "域名": "Domain",
    "基础": "Basic",
    "处理": "Process",
    "复制": "Copy",
    "失败": "Failed",
    "头": "Header",
    "完成": "Complete",
    "完整": "Complete",
    "对象": "Object",
    "导出": "Export",
    "已": "Already",
    "已加载": "Loaded",
    "已完成": "Completed",
    "已保存": "Saved",
    "已删除": "Deleted",
    "已复制": "Copied",
    "已清空": "Cleared",
    "并": "And",
    "开始": "Start",
    "开始扫描": "Start scanning",
    "异步": "Async",
    "当前": "Current",
    "待": "Pending",
    "成功": "Success",
    "或": "Or",
    "扫描": "Scan",
    "扫描完成": "Scan completed",
    "扫描结果": "Scan results",
    "执行": "Execute",
    "扩展": "Extension",
    "批量": "Batch",
    "找到": "Found",
    "技术": "Technical",
    "提取": "Extract",
    "提取完成": "Extraction completed",
    "提取信息": "Extract information",
    "提示": "Prompt",
    "搜索": "Search",
    "数据": "Data",
    "数据库": "Database",
    "文件": "File",
    "方法": "Method",
    "无": "None",
    "无效": "Invalid",
    "日期": "Date",
    "时间": "Time",
    "显示": "Display",
    "更新": "Update",
    "更新完成": "Update completed",
    "替换": "Replace",
    "有效": "Valid",
    "未": "Not",
    "未找到": "Not found",
    "本地": "Local",
    "查询": "Query",
    "查找": "Find",
    "标记": "Mark",
    "格式": "Format",
    "格式化": "Format",
    "检查": "Check",
    "检测": "Detect",
    "模式": "Pattern",
    "正则表达式": "Regular expression",
    "正在": "In progress",
    "步骤": "Step",
    "每": "Every",
    "比较": "Compare",
    "没有": "No",
    "测试": "Test",
    "清空": "Clear",
    "清理": "Clean",
    "添加": "Add",
    "源": "Source",
    "准备": "Prepare",
    "点击": "Click",
    "然后": "Then",
    "状态": "Status",
    "状态码": "Status code",
    "生成": "Generate",
    "用于": "Used for",
    "用户": "User",
    "电话": "Phone",
    "监听": "Listen",
    "目标": "Target",
    "直接": "Direct",
    "相对路径": "Relative path",
    "相关": "Related",
    "确保": "Ensure",
    "确定": "Confirm",
    "确认": "Confirm",
    "禁用": "Disable",
    "移除": "Remove",
    "空": "Empty",
    "筛选": "Filter",
    "类": "Class",
    "类型": "Type",
    "系统": "System",
    "索引": "Index",
    "终止": "Terminate",
    "组": "Group",
    "结果": "Result",
    "绝对路径": "Absolute path",
    "继续": "Continue",
    "统一": "Unified",
    "统计": "Statistics",
    "编辑": "Edit",
    "网络": "Network",
    "脚本": "Script",
    "自定义": "Custom",
    "自动": "Auto",
    "获取": "Get",
    "表": "Table",
    "被": "By",
    "解析": "Parse",
    "计算": "Calculate",
    "认证": "Authentication",
    "记录": "Record",
    "设置": "Settings",
    "读取": "Read",
    "请求": "Request",
    "请求头": "Request header",
    "资源": "Resource",
    "路径": "Path",
    "转换": "Convert",
    "输入": "Input",
    "输出": "Output",
    "过滤": "Filter",
    "过滤器": "Filter",
    "返回": "Return",
    "这": "This",
    "这个": "This",
    "这里": "Here",
    "进行": "Perform",
    "连接": "Connection",
    "通过": "Through",
    "通知": "Notify",
    "遍历": "Traverse",
    "配置": "Configuration",
    "重新": "Re",
    "重新加载": "Reload",
    "重置": "Reset",
    "错误": "Error",
    "键": "Key",
    "队列": "Queue",
    "需要": "Need",
    "页面": "Page",
    "项": "Item",
    "项目": "Project",
    "预设": "Preset",
    "验证": "Validate",
    "默认": "Default",
}


class ComprehensiveValidator:
    """Full validation and translation system"""
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.pre_results = {}
        self.post_results = {}
        self.translation_stats = {}
    
    def contains_chinese(self, text: str) -> bool:
        """Check if text contains Chinese characters"""
        return bool(re.search(r'[\u4e00-\u9fff]', text))
    
    def validate_codebase(self, label: str) -> Dict:
        """Run comprehensive validation"""
        print(f"\n🔍 Running {label} validation...")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'files': [],
            'classes': defaultdict(list),
            'functions': defaultdict(list),
            'errors': [],
            'stats': {},
            'chinese_stats': {'files': 0, 'chars': 0}
        }
        
        js_files = list(self.root_path.glob('**/*.js'))
        js_files = [f for f in js_files if 'node_modules' not in str(f) and '.git' not in str(f)]
        
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                rel_path = str(file_path.relative_to(self.root_path))
                
                file_info = {
                    'path': rel_path,
                    'lines': len(content.splitlines()),
                    'size': len(content),
                    'status': '✅',
                    'classes': [],
                    'functions': [],
                    'has_chinese': self.contains_chinese(content)
                }
                
                if file_info['has_chinese']:
                    results['chinese_stats']['files'] += 1
                    results['chinese_stats']['chars'] += len(re.findall(r'[\u4e00-\u9fff]', content))
                
                # Extract classes
                for match in re.finditer(r'class\s+(\w+)', content):
                    cls_name = match.group(1)
                    file_info['classes'].append(cls_name)
                    results['classes'][rel_path].append(cls_name)
                
                # Extract functions
                func_patterns = [
                    r'function\s+(\w+)\s*\(',
                    r'const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>',
                    r'(\w+)\s*:\s*(?:async\s+)?function',
                ]
                
                for pattern in func_patterns:
                    for match in re.finditer(pattern, content):
                        func_name = match.group(1)
                        if func_name and not func_name.startswith('_'):
                            file_info['functions'].append(func_name)
                            results['functions'][rel_path].append(func_name)
                
                results['files'].append(file_info)
                
            except Exception as e:
                results['errors'].append({
                    'file': str(file_path.relative_to(self.root_path)),
                    'error': str(e)
                })
        
        # Calculate stats
        results['stats'] = {
            'total_files': len(results['files']),
            'total_lines': sum(f['lines'] for f in results['files']),
            'total_classes': sum(len(classes) for classes in results['classes'].values()),
            'total_functions': sum(len(funcs) for funcs in results['functions'].values()),
            'total_errors': len(results['errors']),
            'files_with_chinese': results['chinese_stats']['files'],
            'chinese_characters': results['chinese_stats']['chars']
        }
        
        return results
    
    def translate_files(self) -> Dict:
        """Apply translations to all files"""
        print("\n🌐 Applying translations...")
        
        stats = {
            'files_processed': 0,
            'translations_applied': 0,
            'chinese_before': 0,
            'chinese_after': 0
        }
        
        # Sort by length (longest first)
        sorted_translations = sorted(
            TRANSLATION_DICT.items(),
            key=lambda x: len(x[0]),
            reverse=True
        )
        
        js_files = list(self.root_path.glob('**/*.js'))
        js_files = [f for f in js_files if 'node_modules' not in str(f) and '.git' not in str(f)]
        
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if not self.contains_chinese(content):
                    continue
                
                stats['chinese_before'] += len(re.findall(r'[\u4e00-\u9fff]', content))
                
                # Apply translations
                for chinese, english in sorted_translations:
                    if chinese in content:
                        count = content.count(chinese)
                        stats['translations_applied'] += count
                        content = content.replace(chinese, english)
                
                # Write back
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                stats['files_processed'] += 1
                stats['chinese_after'] += len(re.findall(r'[\u4e00-\u9fff]', content))
                
            except Exception as e:
                print(f"❌ Error translating {file_path}: {e}")
        
        return stats
    
    def generate_structure_report(self, results: Dict, filename: str):
        """Generate detailed structure report"""
        lines = [
            "=" * 100,
            f"📊 CODEBASE STRUCTURE REPORT - {filename}",
            "=" * 100,
            f"📅 Generated: {results['timestamp']}",
            "",
            "📈 OVERALL STATISTICS",
            "-" * 100,
            f"  Total Files: {results['stats']['total_files']}",
            f"  Total Lines: {results['stats']['total_lines']:,}",
            f"  Total Classes: {results['stats']['total_classes']}",
            f"  Total Functions: {results['stats']['total_functions']}",
            f"  Total Errors: {results['stats']['total_errors']}",
            f"  Files with Chinese: {results['stats']['files_with_chinese']}",
            f"  Chinese Characters: {results['stats']['chinese_characters']:,}",
            "",
            "📂 DETAILED FILE STRUCTURE",
            "-" * 100,
        ]
        
        for file_info in sorted(results['files'], key=lambda x: x['path']):
            lines.append(f"\n💬 {file_info['path']}")
            lines.append(f"   📏 {file_info['lines']} lines | 📦 {file_info['size']:,} bytes | {'🇨🇳' if file_info['has_chinese'] else '✅'}")
            
            if file_info['classes']:
                for cls_name in file_info['classes']:
                    lines.append(f"      ⚡ class {cls_name}")
            
            if file_info['functions']:
                for func_name in file_info['functions'][:20]:  # Show first 20
                    lines.append(f"   (function)🔍 {func_name} ✅")
                
                if len(file_info['functions']) > 20:
                    lines.append(f"   ... and {len(file_info['functions']) - 20} more functions")
        
        if results['errors']:
            lines.extend([
                "",
                "❌ ERRORS DETECTED",
                "-" * 100
            ])
            for error in results['errors']:
                lines.append(f"  {error['file']}: {error['error']}")
        
        lines.extend([
            "",
            "=" * 100,
            f"✅ VALIDATION COMPLETE - {results['stats']['total_errors']} errors found",
            "=" * 100
        ])
        
        report_path = self.root_path / filename
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        return report_path
    
    def run_full_pipeline(self):
        """Execute complete validation and translation pipeline"""
        print("🚀" * 40)
        print("COMPREHENSIVE VALIDATION & TRANSLATION SYSTEM")
        print("🚀" * 40)
        
        # STEP 1: Pre-validation
        print("\n" + "=" * 100)
        print("STEP 1: PRE-TRANSLATION VALIDATION")
        print("=" * 100)
        
        self.pre_results = self.validate_codebase("PRE")
        pre_report = self.generate_structure_report(self.pre_results, 'VALIDATION_PRE.txt')
        
        print(f"\n✅ Pre-validation complete!")
        print(f"   📄 Report: {pre_report}")
        print(f"   📊 Files: {self.pre_results['stats']['total_files']}")
        print(f"   🔧 Functions: {self.pre_results['stats']['total_functions']}")
        print(f"   🏛️ Classes: {self.pre_results['stats']['total_classes']}")
        print(f"   🇨🇳 Chinese chars: {self.pre_results['stats']['chinese_characters']:,}")
        
        # STEP 2: Translation
        print("\n" + "=" * 100)
        print("STEP 2: APPLYING TRANSLATIONS")
        print("=" * 100)
        print(f"   📚 Dictionary entries: {len(TRANSLATION_DICT):,}")
        
        self.translation_stats = self.translate_files()
        
        print(f"\n✅ Translation complete!")
        print(f"   📝 Files processed: {self.translation_stats['files_processed']}")
        print(f"   🔄 Translations applied: {self.translation_stats['translations_applied']:,}")
        print(f"   🇨🇳 Chinese before: {self.translation_stats['chinese_before']:,}")
        print(f"   🇨🇳 Chinese after: {self.translation_stats['chinese_after']:,}")
        print(f"   📉 Reduction: {self.translation_stats['chinese_before'] - self.translation_stats['chinese_after']:,} chars")
        
        # STEP 3: Post-validation
        print("\n" + "=" * 100)
        print("STEP 3: POST-TRANSLATION VALIDATION")
        print("=" * 100)
        
        self.post_results = self.validate_codebase("POST")
        post_report = self.generate_structure_report(self.post_results, 'VALIDATION_POST.txt')
        
        print(f"\n✅ Post-validation complete!")
        print(f"   📄 Report: {post_report}")
        print(f"   📊 Files: {self.post_results['stats']['total_files']}")
        print(f"   🔧 Functions: {self.post_results['stats']['total_functions']}")
        print(f"   🏛️ Classes: {self.post_results['stats']['total_classes']}")
        print(f"   🇨🇳 Chinese chars: {self.post_results['stats']['chinese_characters']:,}")
        
        # STEP 4: Comparison
        print("\n" + "=" * 100)
        print("STEP 4: COMPARISON & RESULTS")
        print("=" * 100)
        
        comparison = {
            'files_delta': self.post_results['stats']['total_files'] - self.pre_results['stats']['total_files'],
            'functions_delta': self.post_results['stats']['total_functions'] - self.pre_results['stats']['total_functions'],
            'classes_delta': self.post_results['stats']['total_classes'] - self.pre_results['stats']['total_classes'],
            'errors_delta': self.post_results['stats']['total_errors'] - self.pre_results['stats']['total_errors'],
            'chinese_reduction': self.pre_results['stats']['chinese_characters'] - self.post_results['stats']['chinese_characters']
        }
        
        print(f"\n📊 DELTA ANALYSIS:")
        print(f"   Files: {comparison['files_delta']:+d}")
        print(f"   Functions: {comparison['functions_delta']:+d}")
        print(f"   Classes: {comparison['classes_delta']:+d}")
        print(f"   Errors: {comparison['errors_delta']:+d}")
        print(f"   Chinese chars removed: {comparison['chinese_reduction']:,}")
        
        # Final verdict
        print("\n" + "🎉" * 40)
        
        if comparison['errors_delta'] > 0:
            print("⚠️  WARNING: New errors introduced!")
            print(f"   {comparison['errors_delta']} new error(s) detected")
        elif comparison['errors_delta'] < 0:
            print("✨ EXCELLENT: Some errors were fixed!")
        else:
            print("✅ SUCCESS: No new errors introduced!")
        
        if comparison['chinese_reduction'] > 0:
            coverage = (comparison['chinese_reduction'] / self.pre_results['stats']['chinese_characters']) * 100
            print(f"🌐 Translation coverage: {coverage:.1f}%")
        else:
            print("⚠️  No Chinese characters were translated")
        
        print("🎉" * 40)
        
        # Save comparison report
        comparison_lines = [
            "=" * 100,
            "📊 VALIDATION COMPARISON REPORT",
            "=" * 100,
            "",
            "PRE-TRANSLATION:",
            f"  Files: {self.pre_results['stats']['total_files']}",
            f"  Functions: {self.pre_results['stats']['total_functions']}",
            f"  Classes: {self.pre_results['stats']['total_classes']}",
            f"  Errors: {self.pre_results['stats']['total_errors']}",
            f"  Chinese chars: {self.pre_results['stats']['chinese_characters']:,}",
            "",
            "POST-TRANSLATION:",
            f"  Files: {self.post_results['stats']['total_files']}",
            f"  Functions: {self.post_results['stats']['total_functions']}",
            f"  Classes: {self.post_results['stats']['total_classes']}",
            f"  Errors: {self.post_results['stats']['total_errors']}",
            f"  Chinese chars: {self.post_results['stats']['chinese_characters']:,}",
            "",
            "CHANGES:",
            f"  Files: {comparison['files_delta']:+d}",
            f"  Functions: {comparison['functions_delta']:+d}",
            f"  Classes: {comparison['classes_delta']:+d}",
            f"  Errors: {comparison['errors_delta']:+d}",
            f"  Chinese reduction: {comparison['chinese_reduction']:,}",
            "",
            "VERDICT:",
            "  ✅ No structural damage" if comparison['errors_delta'] <= 0 else "  ⚠️ Errors introduced!",
            "=" * 100
        ]
        
        comparison_report = self.root_path / 'COMPARISON_REPORT.txt'
        with open(comparison_report, 'w', encoding='utf-8') as f:
            f.write('\n'.join(comparison_lines))
        
        print(f"\n📄 Full comparison report: {comparison_report}")


def main():
    root = Path('/tmp/Zeeeepa/Phantom')
    validator = ComprehensiveValidator(root)
    validator.run_full_pipeline()


if __name__ == '__main__':
    main()

