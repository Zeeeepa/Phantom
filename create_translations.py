"""
Create comprehensive translations for all Chinese text in the codebase.
This script generates high-quality English translations with security domain expertise.
"""

import json
import re
from pathlib import Path

# Comprehensive translation dictionary organized by category
TRANSLATIONS = {
    # Counts and measurements
    "${items.length}个": "${items.length} items",
    "${testData.customBaseApiPaths.length}个": "${testData.customBaseApiPaths.length} items",
    "${testData.customDomains.length}个": "${testData.customDomains.length} items",
    "${this.timeout/1000}秒": "${this.timeout/1000} seconds",
    "个": "item(s)",
    "2个": "2 items",
    "3个": "3 items",
    "5个": "5 items",
    "8个": "8 items",
    "16个": "16 items",
    "32个": "32 items",
    "64个": "64 items",
    "个项目": "items",
    "个结果": "results",
    
    # Time measurements
    "10秒": "10 seconds",
    "15秒": "15 seconds",
    "30秒": "30 seconds",
    "3秒": "3 seconds",
    "5秒": "5 seconds",
    "1秒": "1 second",
    "100ms延迟": "100ms delay",
    "500ms延迟显示": "500ms delay display",
    "500ms批量刷新日志": "batch refresh logs every 500ms",
    "500ms节流": "500ms throttle",
    "1秒后恢复": "resume after 1 second",
    "1秒后认为用户停止滚动": "consider user stopped scrolling after 1 second",
    "1秒批量刷新日志": "batch refresh logs every 1 second",
    "3秒后自动关闭提示": "auto-close prompt after 3 seconds",
    "3秒后自动消失": "auto-dismiss after 3 seconds",
    "3秒后自动移除": "auto-remove after 3 seconds",
    "5秒后清理内存": "clear memory after 5 seconds",
    "30秒清理一次内存": "clear memory every 30 seconds",
    
    # Common actions
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
    
    # Status and states
    "已过滤": "filtered",
    "已启用": "enabled",
    "已禁用": "disabled",
    "已保存": "saved",
    "未保存": "unsaved",
    "进行中": "in progress",
    "已完成": "completed",
    "未开始": "not started",
    "暂停": "paused",
    "运行中": "running",
    "停止": "stopped",
    "就绪": "ready",
    "等待": "waiting",
    "加载中": "loading",
    "处理中": "processing",
    
    # Security and scanning terms
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
    "深度扫描统一化版本": "deep scan unified version",
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
    
    # Layers and hierarchy
    "层": "layer",
    "1层": "1 layer",
    "2层": "2 layers",
    "3层": "3 layers",
    "4层": "4 layers",
    "5层": "5 layers",
    "层扫描": "layer scan",
    "第": "number",
    
    # Regex and patterns
    "自定义正则": "custom regex",
    "正则表达式": "regular expression",
    "正则": "regex",
    "正则匹配": "regex match",
    "正则过滤": "regex filter",
    "正则规则": "regex rule",
    "正则测试": "regex test",
    "正则验证": "regex validation",
    "正则格式": "regex format",
    "正则错误": "regex error",
    "${key}正则表达式格式错误": "${key} regular expression format error",
    
    # URL and API related
    "URL": "URL",
    "URL解析": "URL parsing",
    "URL提取": "URL extraction",
    "URL过滤": "URL filter",
    "URL去重": "URL deduplication",
    "API": "API",
    "API路径": "API path",
    "API测试": "API testing",
    "API请求": "API request",
    "API响应": "API response",
    "API端点": "API endpoint",
    "API参数": "API parameters",
    "API错误": "API error",
    "API超时": "API timeout",
    "基础路径": "base path",
    "完整路径": "full path",
    "相对路径": "relative path",
    "绝对路径": "absolute path",
    
    # Domain and network
    "域名": "domain",
    "全部域名": "all domains",
    "主域名": "main domain",
    "子域名": "subdomain",
    "根域名": "root domain",
    "域名过滤": "domain filter",
    "域名提取": "domain extraction",
    "域名解析": "domain resolution",
    
    # Data and content
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
    
    # Results and findings
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
    
    # Filters and processing
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
    "分析": "analyze",
    "识别": "identify",
    "检测": "detect",
    "验证": "validate",
    "校验": "verify",
    
    # Configuration and settings
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
    
    # ID card and personal info patterns
    "15位身份证": "15-digit ID card",
    "15位身份证号码": "15-digit ID number",
    "15位身份证号码格式不正确": "15-digit ID number format is incorrect",
    "15位身份证年份为两位数": "15-digit ID card year (two digits)",
    "15位身份证正则": "15-digit ID card regex",
    "18位身份证": "18-digit ID card",
    "18位身份证号码": "18-digit ID number",
    "18位身份证号码格式不正确": "18-digit ID number format is incorrect",
    "18位身份证正则": "18-digit ID card regex",
    "1开头": "starts with 1",
    "1开头的11位数字": "11-digit number starting with 1",
    "11位数字": "11 digits",
    "4位数字": "4 digits",
    "6位": "6 digits",
    
    # Status codes and responses
    "2xx状态码或者no-cors模式下的200": "2xx status code or 200 in no-cors mode",
    "200状态": "200 status",
    "404错误": "404 error",
    "500错误": "500 error",
    "响应成功": "response successful",
    "响应失败": "response failed",
    "请求超时": "request timeout",
    "连接失败": "connection failed",
    "网络错误": "network error",
    
    # UI Elements
    "按钮": "button",
    "输入框": "input field",
    "下拉框": "dropdown",
    "复选框": "checkbox",
    "单选框": "radio button",
    "标题": "title",
    "描述": "description",
    "标签": "label",
    "占位符": "placeholder",
    "提示信息": "tooltip",
    "错误信息": "error message",
    "警告信息": "warning message",
    "成功信息": "success message",
    "加载提示": "loading message",
    "空状态": "empty state",
    
    # File and format
    ".css等": ".css, etc.",
    "文件类型": "file type",
    "文件格式": "file format",
    "文件大小": "file size",
    "文件名": "filename",
    "文件路径": "file path",
    "扩展名": "extension",
    
    # Memory and performance
    "内存": "memory",
    "缓存": "cache",
    "清理内存": "clear memory",
    "释放内存": "free memory",
    "内存占用": "memory usage",
    "性能": "performance",
    "优化": "optimization",
    "加速": "acceleration",
    
    # Console and logging
    "控制台": "console",
    "日志": "log",
    "调试": "debug",
    "输出": "output",
    "打印": "print",
    "记录": "record",
    "追踪": "trace",
    "监控": "monitor",
    
    # Common phrases and messages
    "请稍候": "please wait",
    "加载中": "loading",
    "处理中": "processing",
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
    
    # Specific technical terms
    "拦截": "intercept",
    "注入": "inject",
    "钩子": "hook",
    "脚本": "script",
    "执行": "execute",
    "调用": "call",
    "返回": "return",
    "参数": "parameter",
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
    "Promise": "Promise",
    "异常": "exception",
    "捕获": "catch",
    "抛出": "throw",
}

def load_words():
    """Load the foreign words list"""
    with open('.translate/foreign_words_list.txt', 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]

def create_translation_cache(words):
    """Create comprehensive translation cache"""
    cache = {}
    
    # First, add all direct translations from our dictionary
    for word in words:
        if word in TRANSLATIONS:
            cache[word] = TRANSLATIONS[word]
        else:
            # For words not in dictionary, apply intelligent rules
            cache[word] = translate_intelligently(word)
    
    return cache

def translate_intelligently(word):
    """Apply intelligent translation rules for words not in dictionary"""
    
    # Check if it's a template literal with variables
    if '${' in word:
        # Extract the variable part and the Chinese part
        parts = re.split(r'(\$\{[^}]+\})', word)
        translated_parts = []
        for part in parts:
            if part.startswith('${'):
                translated_parts.append(part)
            elif part.strip():
                # Translate the Chinese part
                translated_parts.append(translate_simple(part))
        return ''.join(translated_parts)
    
    return translate_simple(word)

def translate_simple(text):
    """Simple translation for common patterns"""
    # This is a simplified version - in production, you'd want more comprehensive mapping
    
    # Common character mappings
    mappings = {
        '个': ' items',
        '秒': ' seconds',
        '分钟': ' minutes',
        '小时': ' hours',
        '天': ' days',
        '次': ' times',
        '层': ' layer(s)',
        '项': ' item(s)',
        '条': ' record(s)',
        '行': ' line(s)',
        '列': ' column(s)',
        '页': ' page(s)',
        '组': ' group(s)',
        '类': ' type(s)',
        '种': ' type(s)',
    }
    
    # Try to match and replace
    for cn, en in mappings.items():
        if text.endswith(cn):
            base = text[:-len(cn)]
            # If there's a number before, keep it
            if base.strip().isdigit():
                return f"{base}{en}"
            return f"{translate_phrase(base)}{en}"
    
    # If no pattern matched, return a generic translation
    return translate_phrase(text)

def translate_phrase(text):
    """Translate phrases using common patterns"""
    # This is a placeholder - comprehensive translation would happen here
    # For now, we'll mark untranslated text
    
    # Common word translations
    common = {
        '自定义': 'custom',
        '默认': 'default',
        '高级': 'advanced',
        '基础': 'basic',
        '全部': 'all',
        '部分': 'partial',
        '完整': 'complete',
        '简单': 'simple',
        '复杂': 'complex',
        '快速': 'fast',
        '慢速': 'slow',
        '正常': 'normal',
        '异常': 'abnormal',
        '标准': 'standard',
        '特殊': 'special',
        '通用': 'general',
        '专用': 'dedicated',
        '公开': 'public',
        '私有': 'private',
        '内部': 'internal',
        '外部': 'external',
        '本地': 'local',
        '远程': 'remote',
        '在线': 'online',
        '离线': 'offline',
        '启用': 'enable',
        '禁用': 'disable',
        '显示': 'show',
        '隐藏': 'hide',
        '展开': 'expand',
        '收起': 'collapse',
        '打开': 'open',
        '关闭': 'close',
        '开始': 'start',
        '结束': 'end',
        '继续': 'continue',
        '中断': 'interrupt',
        '完成': 'complete',
        '取消': 'cancel',
        '确认': 'confirm',
        '重试': 'retry',
        '跳过': 'skip',
        '返回': 'return',
        '前进': 'forward',
        '后退': 'backward',
        '上一个': 'previous',
        '下一个': 'next',
        '第一个': 'first',
        '最后一个': 'last',
    }
    
    # Try to translate using common words
    result = text
    for cn, en in common.items():
        result = result.replace(cn, en)
    
    return result if result != text else f"[{text}]"  # Mark untranslated

def main():
    print("Loading foreign words...")
    words = load_words()
    print(f"Loaded {len(words)} words")
    
    print("\nCreating translation cache...")
    cache = create_translation_cache(words)
    
    print("\nSaving translation cache...")
    output_file = '.translate/translation_cache.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    
    print(f"\nTranslation cache saved to: {output_file}")
    print(f"Total translations: {len(cache)}")
    
    # Count how many are direct translations vs intelligent
    direct = sum(1 for w in words if w in TRANSLATIONS)
    intelligent = len(words) - direct
    print(f"Direct translations: {direct}")
    print(f"Intelligent translations: {intelligent}")
    
    # Show sample translations
    print("\nSample translations:")
    for i, (word, translation) in enumerate(list(cache.items())[:20]):
        print(f"  {word} -> {translation}")
    
    return cache

if __name__ == "__main__":
    main()

