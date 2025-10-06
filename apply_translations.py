#!/usr/bin/env python3
"""
Simple Chinese to English Translator
Translates ONLY comments and string literals (not code identifiers)
"""

import re
import os
from pathlib import Path

# Comprehensive translation dictionary
TRANS = {
    '后台': 'background', 'script': 'script', '监听': 'listen', '来自': 'from', 'content': 'content', 'message': 'message',
    '保持': 'keep', '通道': 'channel', '开放': 'open', '以支持': 'to support', 'async': 'async', 'response': 'response',
    'tab': 'tab', '页': 'page', 'update': 'update', 'process': 'process', 'deep': 'deep', 'scan': 'scan', 'window': 'window',
    '消息': 'message', '发送': 'send', '到': 'to', 'offscreen': 'offscreen', 'document': 'document', 'offscreen.html': 'offscreen.html',
    '执行': 'execute', '深度': 'deep', '扫描': 'scan', '获取': 'get', 'tab.id': 'tab.id', '完成': 'complete',
    '打开': 'open', '新': 'new', '并': 'and', '创建': 'create', 'blob': 'blob', '直接': 'directly', '下载': 'download',
    '导出': 'export', '数据': 'data', 'json': 'json', '通知': 'notify', '用户': 'user', '设置': 'settings',
    '存储': 'storage', '修复': 'fix', 'content.js': 'content.js', 'regex': 'regex', 'configuration': 'configuration', '问题': 'issue', '补丁': 'patch',
    'SRCMinerContent': 'SRCMinerContent', '类': 'class', '添加': 'add', 'custom': 'custom', '自定义': 'custom', '正则': 'regex', '表达式': 'expression',
    '支持': 'support', '读取': 'read', 'phantomRegexConfig': 'phantomRegexConfig', '参数': 'parameter', '如果': 'if', '存在': 'exists',
    '使用': 'use', '启动': 'start', 'SRCMiner': 'SRCMiner', '转换': 'convert', 'format': 'format', 'regexSettings': 'regexSettings',
    'console.log': 'console.log', 'Content': 'Content', 'Script': 'Script', '从': 'from', '否则': 'otherwise',
    'default': 'default', '跳过': 'skip', 'iframe': 'iframe', '环境': 'environment', '统一': 'unified', '版本': 'version',
    '不': 'not', 'cache': 'cache', '每次': 'every time', '前': 'before', '直接': 'directly', 'chrome.storage': 'chrome.storage',
    '幻影': 'phantom', '已': 'already', 'load': 'load', 'window.location.href': 'window.location.href', '收到': 'received',
    'action': 'action', '在': 'in', '中': 'in', '过': 'through', '自动': 'automatic', '扫描': 'scan',
    '开始': 'start', '检查': 'check', 'performance': 'performance', 'scan(force=true)': 'scan(force=true)', '加载': 'load',
    '配置': 'configuration', 'userSettings': 'userSettings', 'customPatterns': 'customPatterns', '初始化': 'initialize', 'regexSettings': 'regexSettings',
    'settings': 'settings', '读入': 'read', 'phantomRegexConfig': 'phantomRegexConfig', '初始': 'initial', '状态': 'state',
    'regexConfigLoaded': 'regexConfigLoaded', '开关': 'toggle', '指示器': 'indicator', '开发': 'development', '模式': 'mode', 'devmode': 'devmode',
    '节点': 'node', '等待': 'wait', '异步': 'async', '扫描完成': 'scan complete', '原生': 'native', 'fetch/xhr': 'fetch/xhr', '请求': 'request',
    '返回': 'return', '结果': 'result', '成功': 'success', '找到': 'found', '提取': 'extract', '模式': 'pattern',
    '警告': 'warning', '注入': 'injection', '失败': 'failed', 'MutationObserver': 'MutationObserver', '深度扫描': 'deep scan',
    'CSS': 'CSS', '选择器': 'selector', '按钮': 'button', '点击': 'click', '事件': 'event', '监听器': 'listener',
    'DOM': 'DOM', '变化': 'change', '统一蓝色系': 'unified blue', '变体': 'variant', '保留': 'keep', '.btn': '.btn',
    '用于': 'for', '弹窗': 'popup', 'button': 'button', '记录': 'record', '蓝色': 'blue', '扫描中': 'scanning',
    '扫描完成': 'scan complete', '信息': 'information', '进度': 'progress', '成功状态': 'success state', 'text': 'text', '若': 'if',
    'script': 'script', '赋予': 'assign', '类名': 'class name', 'initialize': 'initialize', 'domain': 'domain', 'phone': 'phone', 'number': 'number',
    'filter': 'filter', '和': 'and', '增强': 'enhanced', 'feature': 'feature', '基础': 'basic', 'cache': 'cache',
    'API': 'API', '识别': 'identify', '被': 'by', '的': '', 'content': 'content', 'type': 'type',
    'load': 'load', 'valid': 'valid', '顶级': 'top-level', 'list': 'list', '完整': 'complete', '常见': 'common',
    '通用': 'general', '国家': 'country', '组织': 'organization', '公司': 'company', '教育': 'education', '政府': 'government',
    '银行': 'bank', '邮箱': 'email', '去掉': 'remove', 'ENUM': 'ENUM', '值': 'value', '纯净': 'clean',
    '版': 'version', '高性能': 'high performance', '检测': 'detection', '包含': 'contains', '测试': 'test', '返回': 'return',
    'true': 'true', 'false': 'false', '如': 'such as', '有效': 'valid', '邮箱': 'email', '域名': 'domain',
    '包括': 'including', '但': 'but', '没有': 'without', 'TLD': 'TLD', '域名检测': 'domain detection', '检测': 'detect',
    '顶级域名': 'top-level domain', '增加': 'add', 'TLD': 'TLD', '确认': 'confirm', '排除': 'exclude', '临时': 'temporary',
    '邮箱': 'email', '验证码': 'verification code', 'CDN': 'CDN', '内网': 'intranet', 'IP': 'IP', '字节跳动': 'ByteDance',
    '阿里巴巴': 'Alibaba', '腾讯': 'Tencent', '公司': 'company', '平台': 'platform', '服务': 'service', '内部': 'internal',
    '特殊': 'special', '示例': 'example', '商业': 'commercial', '邮件': 'email', '用': 'for', '企业': 'enterprise',
    '移动': 'mobile', '号码': 'number', '格式': 'format', '验证': 'validation', '匹配': 'match', 'pattern': 'pattern',
    '中国': 'China', '大陆': 'mainland', '手机号': 'mobile phone', '台湾': 'Taiwan', '香港': 'Hong Kong', '澳门': 'Macao',
    '号段': 'number range', '11位数字': '11 digits', '电话': 'telephone', '座机': 'landline', '国际': 'international',
    '手机': 'mobile', '码': 'code', '格式': 'format', '地区': 'area', 'ID': 'ID', 'card': 'card', '号码': 'number',
    '验证': 'validation', '身份证': 'ID card', '15位身份证': '15-digit ID card', '18位身份证': '18-digit ID card', '正则': 'regex',
    '省份': 'province', '代码': 'code', 'map': 'map', '北京': 'Beijing', '天津': 'Tianjin', '河北': 'Hebei',
    '山西': 'Shanxi', '内蒙古': 'Inner Mongolia', '辽宁': 'Liaoning', '吉林': 'Jilin', '黑龙江': 'Heilongjiang', '上海': 'Shanghai',
    '江苏': 'Jiangsu', '浙江': 'Zhejiang', '安徽': 'Anhui', '福建': 'Fujian', '江西': 'Jiangxi', '山东': 'Shandong',
    '河南': 'Henan', '湖北': 'Hubei', '湖南': 'Hunan', '广东': 'Guangdong', '广西': 'Guangxi', '海南': 'Hainan',
    '重庆': 'Chongqing', '四川': 'Sichuan', '贵州': 'Guizhou', '云南': 'Yunnan', '西藏': 'Tibet', '陕西': 'Shaanxi',
    '甘肃': 'Gansu', '青海': 'Qinghai', '宁夏': 'Ningxia', '新疆': 'Xinjiang', '台湾': 'Taiwan', '香港': 'Hong Kong',
    '澳门': 'Macao', '出生': 'birth', '日期': 'date', '校验码': 'check digit', '权重': 'weight', '求和': 'sum',
    '模': 'mod', '对应': 'correspond', '查表': 'lookup', 'X': 'X', '结尾': 'ending', '检验': 'check',
    '运算': 'operation', '年份': 'year', '两位数': 'two digits', '四位数': 'four digits', '月份': 'month',
    '日': 'day', '或': 'or', '异常': 'abnormal', '不正确': 'incorrect', '15位': '15-digit', '18位': '18-digit',
    '转': 'convert', '出生日期': 'birth date', '性别': 'gender', '随机': 'random', '生成': 'generate', '合法': 'valid',
    '地区码': 'area code', '年': 'year', '月': 'month', '男': 'male', '女': 'female', '顺序码': 'sequence code',
    '偶数': 'even', '奇数': 'odd', '末位': 'last digit', '离屏': 'offscreen', '文档': 'document', '需要': 'require',
    '完整': 'complete', 'Web': 'Web', 'API': 'API', '网络': 'network', '后台': 'background', '听': 'listen',
    '去除了小白点': 'removed small white dots', '减少': 'reduce', '对象': 'object', '所有': 'all', '贡献': 'contribution',
}

def translate(text):
    """Translate Chinese text"""
    for zh, en in sorted(TRANS.items(), key=lambda x: len(x[0]), reverse=True):
        text = text.replace(zh, en)
    return text

def process_js(path):
    """Process JavaScript file"""
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result = []
    for line in lines:
        # Translate comments
        if '//' in line:
            parts = line.split('//', 1)
            result.append(parts[0] + '//' + translate(parts[1]))
        elif '/*' in line or '*/' in line or line.strip().startswith('*'):
            result.append(translate(line))
        # Translate strings
        elif '"' in line or "'" in line or '`' in line:
            # Simple approach: translate content between quotes
            translated = line
            for match in re.finditer(r'''(["'`])(.*?)\1''', line):
                original = match.group(2)
                if re.search(r'[\u4e00-\u9fff]', original):
                    translated_text = translate(original)
                    translated = translated.replace(match.group(0), match.group(1) + translated_text + match.group(1))
            result.append(translated)
        else:
            result.append(line)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(result)

def process_html(path):
    """Process HTML file"""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Translate comments
    content = re.sub(r'<!--(.*?)-->', lambda m: '<!--' + translate(m.group(1)) + '-->', content, flags=re.DOTALL)
    
    # Translate text nodes (simple approach)
    content = re.sub(r'>([\u4e00-\u9fff][^<]*)<', lambda m: '>' + translate(m.group(1)) + '<', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules'}]
        for file in files:
            path = os.path.join(root, file)
            ext = Path(file).suffix
            
            try:
                if ext == '.js':
                    process_js(path)
                    print(f'✓ {path}')
                elif ext in {'.html', '.htm'}:
                    process_html(path)
                    print(f'✓ {path}')
            except Exception as e:
                print(f'✗ {path}: {e}')

if __name__ == '__main__':
    main()

