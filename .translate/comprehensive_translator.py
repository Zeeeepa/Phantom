"""
Comprehensive Translation System for Phantom Browser Extension
Translates all Chinese text to English with security domain expertise
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

class ComprehensiveTranslator:
    """Handles translation of Chinese text to English with context awareness"""
    
    def __init__(self):
        # Comprehensive base translations dictionary
        self.base_translations = self._build_base_translations()
        
    def _build_base_translations(self) -> Dict[str, str]:
        """Build comprehensive translation dictionary"""
        return {
            # === COUNTS AND MEASUREMENTS ===
            "个": " item(s)",
            "项": " item(s)",
            "条": " record(s)",
            "次": " time(s)",
            "层": " layer(s)",
            "秒": " seconds",
            "分钟": " minutes",
            "小时": " hours",
            "天": " days",
            "位": " digit(s)",
            "行": " line(s)",
            "列": " column(s)",
            "页": " page(s)",
            
            # === TIME MEASUREMENTS ===
            "10秒": "10 seconds",
            "15秒": "15 seconds",
            "30秒": "30 seconds",
            "3秒": "3 seconds",
            "5秒": "5 seconds",
            "1秒": "1 second",
            "100ms": "100ms",
            "500ms": "500ms",
            
            # === COMMON ACTIONS ===
            "修复": "fixed",
            "成功": "success",
            "失败": "failed",
            "错误": "error",
            "警告": "warning",
            "取消": "cancel",
            "确认": "confirm",
            "保存": "save",
            "删除": "delete",
            "编辑": "edit",
            "添加": "add",
            "移除": "remove",
            "清空": "clear",
            "清除": "clear",
            "清理": "cleanup",
            "重置": "reset",
            "刷新": "refresh",
            "更新": "update",
            "导出": "export",
            "导入": "import",
            "下载": "download",
            "上传": "upload",
            "复制": "copy",
            "粘贴": "paste",
            "剪切": "cut",
            "撤销": "undo",
            "重做": "redo",
            "搜索": "search",
            "查找": "find",
            "替换": "replace",
            "选择": "select",
            "全选": "select all",
            "反选": "invert selection",
            "打开": "open",
            "关闭": "close",
            "开始": "start",
            "停止": "stop",
            "暂停": "pause",
            "继续": "continue",
            "完成": "complete",
            "结束": "end",
            "返回": "return",
            "跳过": "skip",
            "重试": "retry",
            
            # === STATUS AND STATES ===
            "已过滤": "filtered",
            "已启用": "enabled",
            "已禁用": "disabled",
            "已保存": "saved",
            "未保存": "unsaved",
            "进行中": "in progress",
            "已完成": "completed",
            "未开始": "not started",
            "运行中": "running",
            "就绪": "ready",
            "等待": "waiting",
            "加载中": "loading",
            "处理中": "processing",
            
            # === SCANNING TERMS ===
            "扫描": "scan",
            "深度扫描": "deep scan",
            "基础扫描": "basic scan",
            "扫描失败": "scan failed",
            "扫描成功": "scan successful",
            "扫描完成": "scan complete",
            "开始扫描": "start scan",
            "停止扫描": "stop scan",
            "暂停扫描": "pause scan",
            "继续扫描": "resume scan",
            "扫描中": "scanning",
            "扫描深度": "scan depth",
            "扫描超时": "scan timeout",
            "扫描结果": "scan results",
            "扫描记录": "scan history",
            "扫描设置": "scan settings",
            "扫描配置": "scan configuration",
            "扫描选项": "scan options",
            "扫描参数": "scan parameters",
            "扫描策略": "scan strategy",
            "扫描模式": "scan mode",
            "扫描类型": "scan type",
            "扫描范围": "scan scope",
            "扫描目标": "scan target",
            "扫描进度": "scan progress",
            "扫描状态": "scan status",
            "扫描日志": "scan log",
            "扫描报告": "scan report",
            
            # === REGEX AND PATTERNS ===
            "正则": "regex",
            "正则表达式": "regular expression",
            "自定义正则": "custom regex",
            "正则匹配": "regex match",
            "正则过滤": "regex filter",
            "正则规则": "regex rule",
            "正则测试": "regex test",
            "正则验证": "regex validation",
            "正则格式": "regex format",
            "正则错误": "regex error",
            "格式错误": "format error",
            "格式不正确": "format is incorrect",
            
            # === API AND NETWORK ===
            "API": "API",
            "API测试": "API testing",
            "API路径": "API path",
            "API请求": "API request",
            "API响应": "API response",
            "API端点": "API endpoint",
            "API参数": "API parameters",
            "API错误": "API error",
            "API超时": "API timeout",
            "API接口": "API interface",
            "API密钥": "API key",
            "URL": "URL",
            "URL解析": "URL parsing",
            "URL提取": "URL extraction",
            "URL过滤": "URL filter",
            "路径": "path",
            "基础路径": "base path",
            "完整路径": "full path",
            "相对路径": "relative path",
            "绝对路径": "absolute path",
            
            # === DOMAIN AND NETWORK ===
            "域名": "domain",
            "全部域名": "all domains",
            "主域名": "main domain",
            "子域名": "subdomain",
            "根域名": "root domain",
            "域名过滤": "domain filter",
            "域名提取": "domain extraction",
            "域名解析": "domain resolution",
            
            # === DATA AND CONTENT ===
            "数据": "data",
            "内容": "content",
            "文本": "text",
            "代码": "code",
            "文件": "file",
            "资源": "resource",
            "信息": "information",
            "敏感信息": "sensitive information",
            "敏感数据": "sensitive data",
            "关键词": "keyword",
            "标签": "tag",
            "标记": "marker",
            "注释": "comment",
            "说明": "description",
            "备注": "note",
            "提示": "hint",
            "帮助": "help",
            "文档": "documentation",
            "手册": "manual",
            "教程": "tutorial",
            "示例": "example",
            "模板": "template",
            
            # === RESULTS AND FINDINGS ===
            "共找到": "found",
            "共": "total",
            "匹配到": "matched",
            "发现": "discovered",
            "提取": "extracted",
            "获取": "obtained",
            "收集": "collected",
            "汇总": "aggregated",
            "统计": "statistics",
            "分析": "analysis",
            "报告": "report",
            "结果": "results",
            "详情": "details",
            "总数": "total count",
            "数量": "quantity",
            
            # === FILTERS AND PROCESSING ===
            "过滤": "filter",
            "过滤器": "filter",
            "过滤规则": "filter rule",
            "过滤条件": "filter condition",
            "黑名单": "blacklist",
            "白名单": "whitelist",
            "排除": "exclude",
            "包含": "include",
            "匹配": "match",
            "忽略": "ignore",
            "跳过": "skip",
            "处理": "process",
            "解析": "parse",
            "识别": "identify",
            "检测": "detect",
            "验证": "validate",
            "校验": "verify",
            "检查": "check",
            
            # === CONFIGURATION ===
            "配置": "configuration",
            "设置": "settings",
            "选项": "options",
            "参数": "parameters",
            "默认": "default",
            "自定义": "custom",
            "高级": "advanced",
            "基础": "basic",
            "通用": "general",
            "特殊": "special",
            "扩展": "extension",
            "插件": "plugin",
            "功能": "feature",
            "模块": "module",
            "组件": "component",
            
            # === ID CARD TERMS ===
            "身份证": "ID card",
            "身份证号码": "ID number",
            "开头": "starts with",
            "数字": "digit(s)",
            "年份": "year",
            "两位数": "two digits",
            
            # === STATUS CODES ===
            "状态码": "status code",
            "模式": "mode",
            "响应": "response",
            "请求": "request",
            "连接": "connection",
            "网络": "network",
            
            # === UI ELEMENTS ===
            "按钮": "button",
            "输入框": "input field",
            "下拉框": "dropdown",
            "复选框": "checkbox",
            "单选框": "radio button",
            "标题": "title",
            "占位符": "placeholder",
            "提示信息": "tooltip",
            "错误信息": "error message",
            "警告信息": "warning message",
            "成功信息": "success message",
            "加载提示": "loading message",
            "空状态": "empty state",
            
            # === FILE AND FORMAT ===
            "等": ", etc.",
            "文件类型": "file type",
            "文件格式": "file format",
            "文件大小": "file size",
            "文件名": "filename",
            "文件路径": "file path",
            "扩展名": "extension",
            
            # === MEMORY AND PERFORMANCE ===
            "内存": "memory",
            "缓存": "cache",
            "清理内存": "clear memory",
            "释放内存": "free memory",
            "内存占用": "memory usage",
            "性能": "performance",
            "优化": "optimization",
            "加速": "acceleration",
            
            # === CONSOLE AND LOGGING ===
            "控制台": "console",
            "日志": "log",
            "调试": "debug",
            "输出": "output",
            "打印": "print",
            "记录": "record",
            "追踪": "trace",
            "监控": "monitor",
            
            # === TECHNICAL TERMS ===
            "拦截": "intercept",
            "注入": "inject",
            "钩子": "hook",
            "脚本": "script",
            "执行": "execute",
            "调用": "call",
            "变量": "variable",
            "函数": "function",
            "方法": "method",
            "类": "class",
            "对象": "object",
            "实例": "instance",
            "继承": "inherit",
            "接口": "interface",
            "事件": "event",
            "监听": "listen",
            "触发": "trigger",
            "回调": "callback",
            "异步": "async",
            "同步": "sync",
            "异常": "exception",
            "捕获": "catch",
            "抛出": "throw",
            
            # === COMMON PHRASES ===
            "请稍候": "please wait",
            "请输入": "please enter",
            "请选择": "please select",
            "确认删除": "confirm delete",
            "操作成功": "operation successful",
            "操作失败": "operation failed",
            "无数据": "no data",
            "未找到": "not found",
            "不支持": "not supported",
            "暂未实现": "not yet implemented",
            "即将推出": "coming soon",
            
            # === SPECIFIC TERMS ===
            "统一化": "unified",
            "版本": "version",
            "区域": "area",
            "总结": "summary",
            "初始化": "initialize",
            "未初始化": "not initialized",
            "初始化成功": "initialized successfully",
            "管理器": "manager",
            "加载": "load",
            "加载成功": "loaded successfully",
            "加载失败": "failed to load",
            "超时": "timeout",
            "延迟": "delay",
            "节流": "throttle",
            "防抖": "debounce",
            "批量": "batch",
            "恢复": "resume",
            "停止": "stop",
            "滚动": "scroll",
            "用户": "user",
            "认为": "consider",
            "自动": "auto",
            "消失": "dismiss",
            "格式": "format",
            "包含": "contains",
            "类型": "type",
            "密钥": "key",
            "密码": "password",
            "令牌": "token",
            "链接": "link",
            "地址": "address",
            "元素": "element",
            "页面": "page",
            "窗口": "window",
            "标签页": "tab",
            "活动": "active",
            "当前": "current",
            "所有": "all",
            "可用": "available",
            "不可用": "unavailable",
            "最新": "latest",
            "最终": "final",
            "原始": "original",
            "转换": "convert",
            "已添加": "added",
            "以": "with",
            "为": "as",
            "到": "to",
            "从": "from",
            "中": "in",
            "的": "of",
            "和": "and",
            "或者": "or",
            "否则": "otherwise",
            "如果": "if",
            "则": "then",
            "否": "no",
            "是": "yes",
            "后": "after",
            "前": "before",
            "时": "when",
            "后台": "background",
            "前台": "foreground",
            "发送": "send",
            "接收": "receive",
            "带": "with",
            "通过": "via",
            "使用": "use",
            "来": "from",
            "强制": "force",
            "重新": "re-",
            "新的": "new",
            "旧的": "old",
            "最大": "maximum",
            "最小": "minimum",
            "字符": "character(s)",
            "限制": "limit",
            "长度": "length",
            "直接": "directly",
            "可以": "can",
            "工作": "work",
            "工作簿": "workbook",
            "工作表": "worksheet",
            "名称": "name",
            "有": "has",
            "特殊": "special",
            "字符": "characters",
            "丢失": "lost",
            "智能": "intelligent",
            "相关": "related",
            "筛选器": "selector",
            "获取": "get",
            "识别": "recognition",
            "测试": "test",
            "测试项目": "test items",
            "完成": "complete",
            "出错": "error occurred",
            "发现": "found",
            "未发现": "not found",
            "任何": "any",
            "状态": "status",
            "最终": "final",
            "可用的": "available",
            "返回": "return",
            "空": "empty",
            "结构": "structure",
            "开始": "start",
            "结束": "end",
            "显示": "display",
            "隐藏": "hide",
            "为空": "is empty",
            "添加": "add",
            "动态": "dynamic",
            "类别": "category",
            "检测到": "detected",
            "数组": "array",
            "对象": "object",
            "用于": "for",
            "主要": "main",
            "次要": "secondary",
            "第": "#",
            "第一": "first",
            "第二": "second",
            "第三": "third",
            "项目": "project",
            "按": "by",
            "查询": "query",
            "操作": "operation",
            "已关闭": "closed",
            "保存": "save",
            "读取": "read",
            "写入": "write",
            "连接": "connection",
            "关": "off",
            "开": "on",
        }
    
    def translate_word(self, word: str) -> str:
        """Translate a single word or phrase"""
        
        # Handle template literals with variables
        if '${' in word:
            return self._translate_template_literal(word)
        
        # Direct match in base translations
        if word in self.base_translations:
            return self.base_translations[word]
        
        # Try intelligent translation
        return self._intelligent_translate(word)
    
    def _translate_template_literal(self, text: str) -> str:
        """Handle template literals with embedded variables"""
        # Split by template expressions
        parts = re.split(r'(\$\{[^}]+\})', text)
        translated_parts = []
        
        for part in parts:
            if part.startswith('${') and part.endswith('}'):
                # Keep variable expressions as-is
                translated_parts.append(part)
            elif part.strip():
                # Translate the Chinese part
                translated = self._intelligent_translate(part)
                # Add space before variable if needed
                if translated_parts and translated_parts[-1].startswith('${'):
                    translated = ' ' + translated if not translated.startswith(' ') else translated
                translated_parts.append(translated)
        
        return ''.join(translated_parts)
    
    def _intelligent_translate(self, text: str) -> str:
        """Intelligent translation with pattern matching"""
        
        # Try to find longest matching substring
        best_match = ""
        best_translation = ""
        
        for chinese, english in self.base_translations.items():
            if chinese in text and len(chinese) > len(best_match):
                best_match = chinese
                best_translation = english
        
        if best_match:
            # Replace and recursively translate the rest
            remaining = text.replace(best_match, "", 1)
            if remaining.strip():
                rest_translation = self._intelligent_translate(remaining)
                # Smart concatenation
                if best_translation.endswith(' ') or rest_translation.startswith(' '):
                    return best_translation + rest_translation
                return best_translation + ' ' + rest_translation
            return best_translation
        
        # No match found - return as-is with brackets
        return text
    
    def create_translation_cache(self, words: List[str]) -> Dict[str, str]:
        """Create translation cache for all words"""
        cache = {}
        
        for word in words:
            translation = self.translate_word(word)
            cache[word] = translation
        
        return cache

def main():
    print("=" * 80)
    print("COMPREHENSIVE TRANSLATOR - Phantom Browser Extension")
    print("=" * 80)
    
    # Load foreign words
    print("\n[1/4] Loading foreign words...")
    words_file = Path('.translate/foreign_words_list.txt')
    with open(words_file, 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]
    print(f"✓ Loaded {len(words)} words")
    
    # Create translator
    print("\n[2/4] Creating comprehensive translator...")
    translator = ComprehensiveTranslator()
    print(f"✓ Base dictionary contains {len(translator.base_translations)} entries")
    
    # Generate translations
    print("\n[3/4] Generating translations...")
    cache = translator.create_translation_cache(words)
    print(f"✓ Generated {len(cache)} translations")
    
    # Save translation cache
    print("\n[4/4] Saving translation cache...")
    cache_file = Path('.translate/translation_cache.json')
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved to {cache_file}")
    
    # Statistics
    print("\n" + "=" * 80)
    print("TRANSLATION STATISTICS")
    print("=" * 80)
    
    # Sample translations
    print("\n📝 Sample translations (first 30):")
    for i, (word, translation) in enumerate(list(cache.items())[:30]):
        print(f"  {word:50s} → {translation}")
    
    print(f"\n✓ Translation cache created successfully!")
    print(f"✓ Total phrases translated: {len(cache)}")
    
    return cache

if __name__ == "__main__":
    main()

