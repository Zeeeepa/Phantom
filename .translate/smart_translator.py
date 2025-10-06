"""
Smart Translator - Creates quality English translations
Uses intelligent patterns and context-aware translation
"""

import json
import re

def translate_chinese_to_english(chinese_text):
    """
    Translate Chinese text to natural English
    Uses pattern matching and intelligent translation rules
    """
    
    # Common tech/security terms
    tech_terms = {
        '深度扫描': 'deep scan',
        '基础扫描': 'basic scan',
        '扫描': 'scan',
        '配置': 'configuration',
        '设置': 'settings',
        '自定义': 'custom',
        '正则表达式': 'regular expression',
        '正则': 'regex',
        '测试': 'test',
        '结果': 'result',
        '数据': 'data',
        '请求': 'request',
        '响应': 'response',
        '错误': 'error',
        '失败': 'failed',
        '成功': 'success',
        '完成': 'complete',
        '开始': 'start',
        '初始化': 'initialize',
        '加载': 'load',
        '保存': 'save',
        '删除': 'delete',
        '查询': 'query',
        '过滤': 'filter',
        '提取': 'extract',
        '验证': 'validate',
        '检查': 'check',
        '监控': 'monitor',
        '拦截': 'intercept',
        '注入': 'inject',
        '执行': 'execute',
        '处理': 'process',
        '管理': 'manage',
        '显示': 'display',
        '隐藏': 'hide',
        '启用': 'enable',
        '禁用': 'disable',
        '更新': 'update',
        '刷新': 'refresh',
        '清空': 'clear',
        '清理': 'cleanup',
        '统计': 'statistics',
        '总结': 'summary',
        '详细': 'detailed',
        '简单': 'simple',
        '高级': 'advanced',
        '标准': 'standard',
        '默认': 'default',
        '当前': 'current',
        '全部': 'all',
        '部分': 'partial',
        '单个': 'single',
        '批量': 'batch',
        '自动': 'automatic',
        '手动': 'manual',
        '强制': 'force',
        '可选': 'optional',
        '必填': 'required',
        '有效': 'valid',
        '无效': 'invalid',
        '正常': 'normal',
        '异常': 'abnormal',
        '警告': 'warning',
        '提示': 'prompt',
        '信息': 'information',
        '消息': 'message',
        '通知': 'notification',
        '状态': 'status',
        '类型': 'type',
        '格式': 'format',
        '内容': 'content',
        '文件': 'file',
        '页面': 'page',
        '窗口': 'window',
        '标签': 'tab',
        '按钮': 'button',
        '输入框': 'input',
        '下拉框': 'dropdown',
        '列表': 'list',
        '表格': 'table',
        '表单': 'form',
        '字段': 'field',
        '参数': 'parameter',
        '值': 'value',
        '键': 'key',
        '对象': 'object',
        '数组': 'array',
        '字符串': 'string',
        '数字': 'number',
        '布尔': 'boolean',
        '空': 'empty',
        '未定义': 'undefined',
        '超时': 'timeout',
        '延迟': 'delay',
        '等待': 'wait',
        '重试': 'retry',
        '取消': 'cancel',
        '确认': 'confirm',
        '关闭': 'close',
        '打开': 'open',
        '展开': 'expand',
        '折叠': 'collapse',
        '选择': 'select',
        '搜索': 'search',
        '排序': 'sort',
        '导出': 'export',
        '导入': 'import',
        '上传': 'upload',
        '下载': 'download',
        '复制': 'copy',
        '粘贴': 'paste',
        '剪切': 'cut',
        '撤销': 'undo',
        '重做': 'redo',
        '预览': 'preview',
        '编辑': 'edit',
        '添加': 'add',
        '移除': 'remove',
        '修改': 'modify',
        '替换': 'replace',
        '匹配': 'match',
        '包含': 'contains',
        '排除': 'exclude',
        '限制': 'limit',
        '范围': 'range',
        '最大': 'maximum',
        '最小': 'minimum',
        '总数': 'total',
        '数量': 'count',
        '长度': 'length',
        '大小': 'size',
        '版本': 'version',
        '路径': 'path',
        '链接': 'link',
        '地址': 'address',
        '域名': 'domain',
        '端口': 'port',
        '协议': 'protocol',
        '方法': 'method',
        '接口': 'interface',
        '服务': 'service',
        '客户端': 'client',
        '服务器': 'server',
        '数据库': 'database',
        '缓存': 'cache',
        '存储': 'storage',
        '会话': 'session',
        '令牌': 'token',
        '密钥': 'key',
        '密码': 'password',
        '用户': 'user',
        '账号': 'account',
        '权限': 'permission',
        '角色': 'role',
        '登录': 'login',
        '登出': 'logout',
        '注册': 'register',
        '认证': 'authentication',
        '授权': 'authorization',
        '安全': 'security',
        '加密': 'encryption',
        '解密': 'decryption',
        '签名': 'signature',
        '验证码': 'captcha',
        '身份证': 'ID card',
        '手机号': 'phone number',
        '邮箱': 'email',
        '网址': 'URL',
        '图片': 'image',
        '视频': 'video',
        '音频': 'audio',
        '文本': 'text',
        '脚本': 'script',
        '样式': 'style',
        '资源': 'resource',
        '静态': 'static',
        '动态': 'dynamic',
        '模板': 'template',
        '组件': 'component',
        '模块': 'module',
        '插件': 'plugin',
        '扩展': 'extension',
        '工具': 'tool',
        '功能': 'feature',
        '选项': 'option',
        '环境': 'environment',
        '系统': 'system',
        '平台': 'platform',
        '浏览器': 'browser',
        '框架': 'framework',
        '库': 'library',
        '包': 'package',
        '依赖': 'dependency',
        '模式': 'mode',
        '模型': 'model',
        '视图': 'view',
        '控制器': 'controller',
        '服务层': 'service layer',
        '业务逻辑': 'business logic',
        '数据层': 'data layer',
        '表现层': 'presentation layer',
        '中间件': 'middleware',
        '钩子': 'hook',
        '回调': 'callback',
        '事件': 'event',
        '监听器': 'listener',
        '触发器': 'trigger',
        '过滤器': 'filter',
        '拦截器': 'interceptor',
        '装饰器': 'decorator',
        '适配器': 'adapter',
        '工厂': 'factory',
        '单例': 'singleton',
        '代理': 'proxy',
        '观察者': 'observer',
        '发布订阅': 'publish-subscribe',
        '命令': 'command',
        '策略': 'strategy',
        '状态机': 'state machine',
        '流程': 'workflow',
        '任务': 'task',
        '队列': 'queue',
        '栈': 'stack',
        '树': 'tree',
        '图': 'graph',
        '链表': 'linked list',
        '哈希表': 'hash table',
        '集合': 'set',
        '映射': 'map',
        '迭代器': 'iterator',
        '生成器': 'generator',
        '异步': 'async',
        '同步': 'sync',
        '并发': 'concurrent',
        '并行': 'parallel',
        '串行': 'serial',
        '阻塞': 'blocking',
        '非阻塞': 'non-blocking',
        '线程': 'thread',
        '进程': 'process',
        '协程': 'coroutine',
        '性能': 'performance',
        '优化': 'optimization',
        '调试': 'debug',
        '日志': 'log',
        '追踪': 'trace',
        '监测': 'monitor',
        '分析': 'analysis',
        '报告': 'report',
        '图表': 'chart',
        '仪表板': 'dashboard',
        '指标': 'metric',
        '维度': 'dimension',
        '统计信息': 'statistics',
        '百分比': 'percentage',
        '比率': 'ratio',
        '平均值': 'average',
        '中位数': 'median',
        '标准差': 'standard deviation',
        '方差': 'variance',
        '最大值': 'maximum value',
        '最小值': 'minimum value',
        '总和': 'sum',
        '差值': 'difference',
        '乘积': 'product',
        '商': 'quotient',
        '余数': 'remainder',
        '幂': 'power',
        '根': 'root',
        '对数': 'logarithm',
        '指数': 'exponent',
        '函数': 'function',
        '变量': 'variable',
        '常量': 'constant',
        '表达式': 'expression',
        '语句': 'statement',
        '注释': 'comment',
        '文档': 'documentation',
        '说明': 'description',
        '示例': 'example',
        '用法': 'usage',
        '注意': 'note',
        '提醒': 'reminder',
        '建议': 'suggestion',
        '推荐': 'recommend',
        '不推荐': 'not recommended',
        '已弃用': 'deprecated',
        '即将移除': 'to be removed',
        '实验性': 'experimental',
        '稳定': 'stable',
        '测试版': 'beta',
        '正式版': 'release',
        '开发版': 'development',
        '生产环境': 'production',
        '测试环境': 'testing',
        '开发环境': 'development',
        '预发布': 'pre-release',
    }
    
    # Apply term-by-term translation with space preservation
    text = chinese_text
    for cn, en in sorted(tech_terms.items(), key=lambda x: len(x[0]), reverse=True):
        # Replace with space-preserved version
        text = text.replace(cn, ' ' + en + ' ')
    
    # Handle common patterns
    
    # Numbers + 个 -> N items
    text = re.sub(r'(\d+)个', r'\1 items', text)
    text = re.sub(r'(\$\{[^}]+\})个', r'\1 items', text)
    
    # Numbers + 位 -> N digit(s)
    text = re.sub(r'(\d+)位', r'\1-digit', text)
    
    # Numbers + 秒 -> N seconds
    text = re.sub(r'(\d+)秒', r'\1 seconds', text)
    text = re.sub(r'(\$\{[^}]+\})秒', r'\1 seconds', text)
    
    # Numbers + 层 -> level N / layer N
    text = re.sub(r'(\d+)层', r'level \1', text)
    
    # X开头 -> starts with X
    text = re.sub(r'(\d+)开头', r'starts with \1', text)
    
    # ...后 -> after...
    text = re.sub(r'(\d+秒)后', r'after \1', text)
    
    # 已... -> already...
    text = re.sub(r'已([a-zA-Z\s]+)', r'already \1', text)
    
    # 未... -> not...
    text = re.sub(r'未([a-zA-Z\s]+)', r'not \1', text)
    
    # 可... -> can...
    text = re.sub(r'可([a-zA-Z\s]+)', r'can \1', text)
    
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # If still has Chinese, return a marker
    if re.search(r'[\u4e00-\u9fff]', text):
        # Try to keep template literals intact
        if '${' in chinese_text:
            parts = []
            current = ""
            i = 0
            while i < len(chinese_text):
                if i < len(chinese_text) - 1 and chinese_text[i:i+2] == '${':
                    if current:
                        parts.append(('text', current))
                        current = ""
                    j = chinese_text.find('}', i)
                    if j != -1:
                        parts.append(('expr', chinese_text[i:j+1]))
                        i = j + 1
                    else:
                        current += chinese_text[i]
                        i += 1
                else:
                    current += chinese_text[i]
                    i += 1
            if current:
                parts.append(('text', current))
            
            result = ""
            for ptype, pcontent in parts:
                if ptype == 'expr':
                    result += pcontent
                else:
                    # Translate non-expression parts
                    translated = pcontent
                    for cn, en in tech_terms.items():
                        translated = translated.replace(cn, en)
                    result += translated
            
            return result
    
    return text

def create_translation_cache(foreign_words_file, output_file):
    """Create translation cache from foreign words list"""
    
    with open(foreign_words_file, 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]
    
    translations = {}
    
    print(f"Translating {len(words)} phrases...")
    for i, word in enumerate(words):
        if (i + 1) % 100 == 0:
            print(f"  Progress: {i+1}/{len(words)}")
        
        translated = translate_chinese_to_english(word)
        translations[word] = translated
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Created translation cache: {output_file}")
    print(f"✓ Total translations: {len(translations)}")
    
    return translations

if __name__ == "__main__":
    create_translation_cache(
        'foreign_words_list.txt',
        'translation_cache_v2.json'
    )
