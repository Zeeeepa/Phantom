/**
 * 模式提取器 - 只使用设置界面配置的正则表达式
 * 统一化版本 - 去除所有内置正则和降级机制
 */
class PatternExtractor {
    constructor() {
        // 静态文件扩展名列表 - 用于过滤绝对路径API
        this.staticFileExtensions = [
            // 图片文件
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
            // 样式文件
            '.css', '.scss', '.sass', '.less',
            // 脚本文件
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.coffee',
            // 字体文件
            '.woff', '.woff2', '.ttf', '.otf', '.eot',
            // 音频文件
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // 视频文件
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
        ];
        
        // 引入身份证验证过滤器
        this.idCardFilter = null;
        this.loadIdCardFilter();
        
        // 当前使用的正则表达式配置 - 初始为空，只使用设置界面配置
        this.patterns = {};
        
        // 自定义正则表达式配置
        this.customRegexConfig = null;
        
        // 标记是否已加载自定义配置
        this.customPatternsLoaded = false;
        
        // 设置全局引用，供设置管理器调用
        window.patternExtractor = this;
        
        // 监听配置更新事件
        window.addEventListener('regexConfigUpdated', (event) => {
            console.log('🔄 收到正则配置更新事件:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // 异步加载自定义配置，但不阻塞构造函数
        this.loadCustomPatterns().catch(error => {
            console.error('❌ 异步加载自定义配置失败:', error);
        });
    }
    
    /**
     * 加载身份证验证过滤器
     */
    loadIdCardFilter() {
        try {
            // 尝试从全局变量获取
            if (typeof window !== 'undefined' && window.idCardFilter) {
                this.idCardFilter = window.idCardFilter;
                console.log('✅ 身份证过滤器加载成功 (全局变量)');
                return;
            }
            
            // 尝试动态加载
            const script = document.createElement('script');
            script.src = 'filters/id-card-filter.js';
            script.onload = () => {
                if (window.idCardFilter) {
                    this.idCardFilter = window.idCardFilter;
                    console.log('✅ 身份证过滤器动态加载成功');
                } else {
                    console.warn('⚠️ 身份证过滤器加载失败：未找到 idCardFilter');
                }
            };
            script.onerror = () => {
                console.error('❌ 身份证过滤器脚本加载失败');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('❌ 加载身份证过滤器时出错:', error);
        }
    }
    
    /**
     * 检测URL是否为静态文件
     * @param {string} url - 要检测的URL
     * @returns {boolean} 是否为静态文件
     */
    isStaticFile(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        // 移除查询参数和锚点
        const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
        
        // 检查是否以静态文件扩展名结尾
        return this.staticFileExtensions.some(ext => cleanUrl.endsWith(ext));
    }

    // 处理相对路径API，去除开头的"."符号但保留"/"
    processRelativeApi(api) {
        try {
            // 去除开头的"."符号，但保留"/"
            if (api.startsWith('./')) {
                return api.substring(1); // 去除开头的"."，保留"/"
            } else if (api.startsWith('.') && !api.startsWith('/')) {
                return api.substring(1); // 去除开头的"."
            }
            return api; // 其他情况保持不变
        } catch (error) {
            console.warn('⚠️ 处理相对路径API时出错:', error);
            return api;
        }
    }
    
    /**
     * 验证并过滤身份证号码，只保留18位有效身份证
     * @param {Array} idCards - 提取到的身份证号码数组
     * @returns {Array} 验证通过的18位身份证号码数组
     */
    validateIdCards(idCards) {
        if (!this.idCardFilter || !Array.isArray(idCards)) {
            return idCards || [];
        }
        
        const validIdCards = [];
        
        for (const idCard of idCards) {
            try {
                const cleanIdCard = idCard.replace(/['"]/g, '').trim();
                
                // 只处理18位身份证
                if (cleanIdCard.length !== 18) {
                    continue;
                }
                
                const result = this.idCardFilter.validate(cleanIdCard);
                if (result.valid && result.type === '18位身份证') {
                    validIdCards.push(cleanIdCard);
                    console.log(`✅ 身份证验证通过: ${cleanIdCard} (${result.province}, ${result.gender})`);
                } else {
                    console.log(`❌ 身份证验证失败: ${cleanIdCard} - ${result.error || '格式错误'}`);
                }
            } catch (error) {
                console.error('❌ 身份证验证过程出错:', error, '身份证:', idCard);
            }
        }
        
        return validIdCards;
    }
    
    /**
     * 加载自定义正则表达式配置 - 统一化版本
     */
    async loadCustomPatterns() {
        try {
            console.log('🔄 PatternExtractor统一化版本开始加载自定义配置...');
            
            // 修复：保存现有的自定义正则模式，避免被清空
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    console.log(`💾 [PatternExtractor] 保存现有自定义正则: ${key}`);
                }
            });
            
            // 只重置非自定义的正则模式
            const newPatterns = {};
            Object.keys(existingCustomPatterns).forEach(key => {
                newPatterns[key] = existingCustomPatterns[key];
            });
            this.patterns = newPatterns;
            
            // 加载所有相关配置：regexSettings + 动态自定义正则配置
            const result = await chrome.storage.local.get(['regexSettings', 'customRegexConfigs']);
            
            console.log('📊 PatternExtractor加载的存储数据:', result);
            
            if (result.regexSettings) {
                console.log('🔄 PatternExtractor加载regexSettings配置:', result.regexSettings);
                this.updatePatterns(result.regexSettings);
                console.log('✅ PatternExtractor基础正则表达式配置已更新');
            } else {
                console.warn('⚠️ PatternExtractor未找到regexSettings配置，添加基础资源正则');
                // 添加基础资源文件正则（这些不依赖设置界面，是基础功能）
                this.patterns.jsFile = /(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
                this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            }
            
            // 加载动态自定义正则配置 - 修复：支持对象和数组两种存储格式
            if (result.customRegexConfigs) {
                console.log('🔄 PatternExtractor开始加载动态自定义正则配置:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // 检查存储格式：对象格式还是数组格式
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数组格式
                    configsToProcess = result.customRegexConfigs;
                    console.log('📋 PatternExtractor检测到数组格式的自定义正则配置');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // 对象格式，转换为数组
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // 添加 custom_ 前缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    console.log('📋 PatternExtractor检测到对象格式的自定义正则配置，已转换为数组格式');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        try {
                            if (config.key && config.pattern && config.name) {
                                // 将自定义正则添加到patterns中
                                const regex = new RegExp(config.pattern, 'g');
                                this.patterns[config.key] = regex;
                                console.log(`✅ PatternExtractor添加自定义正则 ${index + 1}: ${config.name} (${config.key}) - ${config.pattern}`);
                            } else {
                                console.warn(`⚠️ PatternExtractor跳过无效的自定义正则配置 ${index + 1}:`, config);
                            }
                        } catch (error) {
                            console.error(`❌ PatternExtractor自定义正则配置 ${index + 1} 格式错误:`, error, config);
                        }
                    });
                    
                    console.log(`✅ PatternExtractor动态自定义正则配置加载完成，共加载 ${configsToProcess.length} 个配置`);
                } else {
                    console.log('⚠️ PatternExtractor动态自定义正则配置为空');
                }
            } else {
                console.log('ℹ️ PatternExtractor未找到动态自定义正则配置');
            }
            
            // 标记配置已加载
            this.customPatternsLoaded = true;
            console.log('✅ PatternExtractor统一化版本自定义配置加载完成');
            console.log('📊 PatternExtractor当前可用的正则模式:', Object.keys(this.patterns));
            
        } catch (error) {
            console.error('❌ PatternExtractor加载自定义正则表达式配置失败:', error);
            this.customPatternsLoaded = true; // 即使失败也标记为已加载，避免无限等待
        }
    }
    
    /**
     * 解析正则表达式输入，支持 /pattern/flags 格式和普通字符串格式
     * @param {string} input - 输入的正则表达式字符串
     * @param {string} defaultFlags - 默认标志，默认为 'g'
     * @returns {RegExp|null} 解析后的正则表达式对象
     */
    parseRegexInput(input, defaultFlags = 'g') {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }
        
        const trimmedInput = input.trim();
        
        // 检查是否为 /pattern/flags 格式
        const match = trimmedInput.match(/^\/(.*)\/([gimuy]*)$/);
        if (match) {
            const [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags || defaultFlags);
            } catch (error) {
                console.error('❌ 正则表达式格式错误 (字面量格式):', error, 'Pattern:', pattern, 'Flags:', flags);
                return null;
            }
        } else {
            // 兼容旧写法（非 /.../ 形式）
            try {
                return new RegExp(trimmedInput, defaultFlags);
            } catch (error) {
                console.error('❌ 正则表达式格式错误 (字符串格式):', error, 'Pattern:', trimmedInput);
                return null;
            }
        }
    }

    /**
     * 更新正则表达式配置 - 只使用设置界面的配置
     */
    updatePatterns(customSettings) {
        try {
            console.log('🔧 开始更新正则表达式配置...', customSettings);
            
            // 保存现有的自定义正则模式
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    console.log(`💾 [PatternExtractor] 保存现有自定义正则: ${key}`);
                }
            });
            
            // 清空所有现有模式
            this.patterns = {};
            
            // 恢复自定义正则模式
            Object.keys(existingCustomPatterns).forEach(key => {
                this.patterns[key] = existingCustomPatterns[key];
                console.log(`🔄 [PatternExtractor] 恢复自定义正则: ${key}`);
            });
            
            // 更新绝对路径API正则
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                this.patterns.absoluteApi = this.parseRegexInput(customSettings.absoluteApis);
                console.log('📝 更新绝对路径API正则表达式:', customSettings.absoluteApis);
            }
            
            // 更新相对路径API正则
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                this.patterns.relativeApi = this.parseRegexInput(customSettings.relativeApis);
                console.log('📝 更新相对路径API正则表达式:', customSettings.relativeApis);
            }
            
            // 更新域名正则
            if (customSettings.domains && customSettings.domains.trim()) {
                this.patterns.domain = this.parseRegexInput(customSettings.domains);
                console.log('📝 更新域名正则表达式:', customSettings.domains);
            }
            
            // 更新邮箱正则
            if (customSettings.emails && customSettings.emails.trim()) {
                this.patterns.email = this.parseRegexInput(customSettings.emails);
                console.log('📝 更新邮箱正则表达式:', customSettings.emails);
            }
            
            // 更新电话正则
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                this.patterns.phone = this.parseRegexInput(customSettings.phoneNumbers);
                console.log('📝 更新电话正则表达式:', customSettings.phoneNumbers);
            }
            
            // 更新敏感信息正则
            if (customSettings.credentials && customSettings.credentials.trim()) {
                this.patterns.credentials = this.parseRegexInput(customSettings.credentials, 'gi');
                console.log('📝 更新敏感信息正则表达式:', customSettings.credentials);
            }
            
            // 更新IP地址正则
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                this.patterns.ip = this.parseRegexInput(customSettings.ipAddresses);
                console.log('📝 更新IP地址正则表达式:', customSettings.ipAddresses);
            }
            
            // 更新路径正则
            if (customSettings.paths && customSettings.paths.trim()) {
                this.patterns.paths = this.parseRegexInput(customSettings.paths);
                console.log('📝 更新路径正则表达式:', customSettings.paths);
            }
            
            // 更新JWT令牌正则
            if (customSettings.jwts && customSettings.jwts.trim()) {
                this.patterns.jwt = this.parseRegexInput(customSettings.jwts);
                console.log('📝 更新JWT令牌正则表达式:', customSettings.jwts);
            }
            
            // 更新GitHub链接正则
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                this.patterns.github = this.parseRegexInput(customSettings.githubUrls);
                console.log('📝 更新GitHub链接正则表达式:', customSettings.githubUrls);
            }
            
            // 更新Vue文件正则
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                this.patterns.vue = this.parseRegexInput(customSettings.vueFiles);
                console.log('📝 更新Vue文件正则表达式:', customSettings.vueFiles);
            }
            
            // 更新公司名称正则
            if (customSettings.companies && customSettings.companies.trim()) {
                this.patterns.company = this.parseRegexInput(customSettings.companies);
                console.log('📝 更新公司名称正则表达式:', customSettings.companies);
            }
            
            // 更新注释正则
            if (customSettings.comments && customSettings.comments.trim()) {
                this.patterns.comments = this.parseRegexInput(customSettings.comments, 'gm');
                console.log('📝 更新注释正则表达式:', customSettings.comments);
            }
            
            // 更新身份证正则
            if (customSettings.idCards && customSettings.idCards.trim()) {
                this.patterns.idCard = this.parseRegexInput(customSettings.idCards);
                console.log('📝 更新身份证正则表达式:', customSettings.idCards);
            }
            
            // 更新Bearer Token正则
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                this.patterns.bearerToken = this.parseRegexInput(customSettings.bearerTokens);
                console.log('📝 更新Bearer Token正则表达式:', customSettings.bearerTokens);
            }
            
            // 更新Basic Auth正则
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                this.patterns.basicAuth = this.parseRegexInput(customSettings.basicAuth);
                console.log('📝 更新Basic Auth正则表达式:', customSettings.basicAuth);
            }
            
            // 更新Authorization Header正则
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                this.patterns.authHeader = this.parseRegexInput(customSettings.authHeaders);
                console.log('📝 更新Authorization Header正则表达式:', customSettings.authHeaders);
            }
            
            // 更新微信AppID正则
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                this.patterns.wechatAppId = this.parseRegexInput(customSettings.wechatAppIds);
                console.log('📝 更新微信AppID正则表达式:', customSettings.wechatAppIds);
            }
            
            // 更新AWS密钥正则
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                this.patterns.awsKey = this.parseRegexInput(customSettings.awsKeys);
                console.log('📝 更新AWS密钥正则表达式:', customSettings.awsKeys);
            }
            
            // 更新Google API Key正则
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                this.patterns.googleApiKey = this.parseRegexInput(customSettings.googleApiKeys);
                console.log('📝 更新Google API Key正则表达式:', customSettings.googleApiKeys);
            }
            
            // 更新GitHub Token正则
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                this.patterns.githubToken = this.parseRegexInput(customSettings.githubTokens);
                console.log('📝 更新GitHub Token正则表达式:', customSettings.githubTokens);
            }
            
            // 更新GitLab Token正则
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                this.patterns.gitlabToken = this.parseRegexInput(customSettings.gitlabTokens);
                console.log('📝 更新GitLab Token正则表达式:', customSettings.gitlabTokens);
            }
            
            // 更新Webhook URLs正则
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                this.patterns.webhookUrls = this.parseRegexInput(customSettings.webhookUrls);
                console.log('📝 更新Webhook URLs正则表达式:', customSettings.webhookUrls);
            }
            
            // 更新加密算法使用正则
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                this.patterns.cryptoUsage = this.parseRegexInput(customSettings.cryptoUsage, 'gi');
                console.log('📝 更新加密算法使用正则表达式:', customSettings.cryptoUsage);
            }
            
            // 添加基础资源文件正则（这些不依赖设置界面，是基础功能）
            this.patterns.jsFile = /(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
            this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            
            console.log('✅ 正则表达式配置更新完成');
            console.log('📊 当前可用的正则模式:', Object.keys(this.patterns));
            
            // 保存当前配置状态
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ 更新正则表达式配置失败:', error);
        }
    }
    
    /**
     * 确保自定义配置已加载 - 统一化版本
     * 修复：只在必要时重新加载配置，避免清空现有配置
     */
    async ensureCustomPatternsLoaded() {
        if (!this.customPatternsLoaded) {
            console.log('🔄 PatternExtractor统一化版本：首次加载配置...');
            await this.loadCustomPatterns();
        } else {
            console.log('✅ PatternExtractor统一化版本：配置已加载，跳过重复加载');
        }
    }
    
    /**
     * 使用exec方法执行正则匹配 - 修复负向断言问题
     */
    executeRegexWithExec(regex, content, results, resultKey, patternKey) {
        console.log(`🔍 [PatternExtractor] 使用exec方法处理: ${patternKey}`);
        
        // 重置正则表达式状态
        regex.lastIndex = 0;
        let match;
        let matchCount = 0;
        let lastIndex = -1;
        
        while ((match = regex.exec(content)) !== null) {
            const matchedText = match[1] || match[0];
            if (matchedText && matchedText.trim()) {
                const trimmedText = matchedText.trim();
                
                // 🔥 特殊处理：过滤绝对路径API中包含协议的内容
                if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                    console.log(`🚫 [PatternExtractor] 绝对路径API包含协议，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊处理：过滤绝对路径API中的静态文件
                if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                    console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                results[resultKey].add(trimmedText);
                matchCount++;
                console.log(`✅ [PatternExtractor] ${patternKey} 匹配到 ${matchCount}: "${trimmedText}"`);
            }
            
            // 防止无限循环 - 特别针对负向断言
            if (matchCount > 1000) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 匹配次数过多，停止匹配`);
                break;
            }
            
            // 检查是否陷入无限循环
            if (regex.lastIndex === lastIndex) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 检测到无限循环，强制推进`);
                regex.lastIndex = lastIndex + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
            lastIndex = regex.lastIndex;
            
            // 对于非全局正则或者lastIndex为0的情况，手动推进
            if (!regex.global || regex.lastIndex === 0) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 非全局正则或lastIndex为0，手动推进`);
                regex.lastIndex = match.index + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
        }
        
        console.log(`📊 [PatternExtractor] ${patternKey} exec方法提取完成，共找到 ${matchCount} 个`);
    }
    
    // 专门的API提取方法
    extractAPIs(content, results) {
        console.log('🔍 [PatternExtractor] 开始提取API...');
        console.log('🔍 [PatternExtractor] 当前patterns对象:', Object.keys(this.patterns));
        console.log('🔍 [PatternExtractor] absoluteApi配置:', this.patterns.absoluteApi);
        console.log('🔍 [PatternExtractor] relativeApi配置:', this.patterns.relativeApi);
        
        // 检查是否有API正则配置
        if (!this.patterns.absoluteApi && !this.patterns.relativeApi) {
            console.warn('⚠️ [PatternExtractor] 未配置API正则表达式，跳过API提取');
            console.warn('⚠️ [PatternExtractor] absoluteApi存在:', !!this.patterns.absoluteApi);
            console.warn('⚠️ [PatternExtractor] relativeApi存在:', !!this.patterns.relativeApi);
            return;
        }
        
        // 限制内容大小，避免过大的正则匹配
        const maxContentSize = 300000; // 约300KB
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        console.log(`📊 [PatternExtractor] 处理内容大小: ${processContent.length} 字符`);
        console.log(`📊 [PatternExtractor] 内容预览: ${processContent.substring(0, 200)}...`);
        
        // 提取绝对路径API - 修复：支持RegExp对象
        if (this.patterns.absoluteApi) {
            console.log(`🔍 [PatternExtractor] 开始提取绝对路径API`);
            console.log(`🔍 [PatternExtractor] 绝对路径API正则类型: ${typeof this.patterns.absoluteApi}`);
            console.log(`🔍 [PatternExtractor] 绝对路径API正则内容: ${this.patterns.absoluteApi.source || this.patterns.absoluteApi}`);
            
            let absoluteApiCount = 0;
            const regex = this.patterns.absoluteApi;
            
            // 重置正则表达式状态
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                console.log(`🎯 [PatternExtractor] 绝对路径API匹配到: "${api}"`);
                if (api && api.trim()) {
                    const trimmedApi = api.trim();
                    // 🔥 添加校验：过滤掉包含http://或https://的绝对路径API
                    if (trimmedApi.includes('http://') || trimmedApi.includes('https://')) {
                        console.log(`🚫 [PatternExtractor] 绝对路径API包含协议，已过滤: "${trimmedApi}"`);
                    }
                    // 🔥 新增校验：过滤掉静态文件（如.jpg, .png, .css等）
                    else if (this.isStaticFile(trimmedApi)) {
                        console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，已过滤: "${trimmedApi}"`);
                    } else {
                        results.absoluteApis.add(trimmedApi);
                        absoluteApiCount++;
                        console.log(`✅ [PatternExtractor] 绝对路径API添加: "${trimmedApi}"`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径API匹配次数过多，停止匹配`);
                    break;
                }
                
                // 检查是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径API检测到无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            console.log(`✅ [PatternExtractor] 绝对路径API提取完成，共找到 ${absoluteApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 绝对路径API配置为空');
        }
        
        // 提取相对路径API - 修复：支持RegExp对象
        if (this.patterns.relativeApi) {
            console.log(`🔍 [PatternExtractor] 开始提取相对路径API`);
            console.log(`🔍 [PatternExtractor] 相对路径API正则类型: ${typeof this.patterns.relativeApi}`);
            console.log(`🔍 [PatternExtractor] 相对路径API正则内容: ${this.patterns.relativeApi.source || this.patterns.relativeApi}`);
            
            let relativeApiCount = 0;
            const regex = this.patterns.relativeApi;
            
            // 重置正则表达式状态
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                console.log(`🎯 [PatternExtractor] 相对路径API匹配到: "${api}"`);
                if (api && api.trim()) {
                    // 🔥 新增：处理相对路径API，去除开头的"."符号但保留"/"
                    const processedApi = this.processRelativeApi(api.trim());
                    results.relativeApis.add(processedApi);
                    relativeApiCount++;
                    matchCount++;
                    console.log(`✅ [PatternExtractor] 相对路径API处理后添加: "${processedApi}" (原始: "${api.trim()}")`);
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径API匹配次数过多，停止匹配`);
                    break;
                }
                
                // 检查是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径API检测到无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            console.log(`✅ [PatternExtractor] 相对路径API提取完成，共找到 ${relativeApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 相对路径API配置为空');
        }
        
        console.log(`📊 [PatternExtractor] API提取总结 - 绝对路径: ${results.absoluteApis.size}, 相对路径: ${results.relativeApis.size}`);
    }
    
    // 提取其他资源
    extractOtherResources(content, results, sourceUrl = '') {
        console.log('📁 [PatternExtractor] 开始提取其他资源...');
        
        // 限制内容大小
        const maxContentSize = 300000;
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        console.log(`📊 [PatternExtractor] 其他资源处理内容大小: ${processContent.length} 字符`);
        console.log(`🌐 [PatternExtractor] 当前处理的URL: ${sourceUrl}`);
        
        // 提取JS文件
        if (this.patterns.jsFile) {
            console.log('🔍 [PatternExtractor] 开始提取JS文件...');
            this.patterns.jsFile.lastIndex = 0;
            let match;
            let jsFileCount = 0;
            while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
                const jsFile = match[1] || match[2] || match[3];
                if (jsFile) {
                    const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                    results.jsFiles.add(cleanJsFile);
                    jsFileCount++;
                    console.log(`✅ [PatternExtractor] JS文件添加: "${cleanJsFile}"`);
                }
            }
            console.log(`📊 [PatternExtractor] JS文件提取完成，共找到 ${jsFileCount} 个`);
        }
        
        // 提取CSS文件
        if (this.patterns.cssFile) {
            console.log('🔍 [PatternExtractor] 开始提取CSS文件...');
            this.patterns.cssFile.lastIndex = 0;
            let match;
            let cssFileCount = 0;
            while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
                const cssFile = match[1];
                if (cssFile) {
                    const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                    results.cssFiles.add(cleanCssFile);
                    cssFileCount++;
                    console.log(`✅ [PatternExtractor] CSS文件添加: "${cleanCssFile}"`);
                }
            }
            console.log(`📊 [PatternExtractor] CSS文件提取完成，共找到 ${cssFileCount} 个`);
        }
        
        // 提取图片
        if (this.patterns.image) {
            console.log('🔍 [PatternExtractor] 开始提取图片...');
            this.patterns.image.lastIndex = 0;
            let match;
            let imageCount = 0;
            while ((match = this.patterns.image.exec(processContent)) !== null) {
                const image = match[1];
                if (image) {
                    const cleanImage = image.replace(/["'`]/g, '').trim();
                    results.images.add(cleanImage);
                    imageCount++;
                    console.log(`✅ [PatternExtractor] 图片添加: "${cleanImage}"`);
                }
            }
            console.log(`📊 [PatternExtractor] 图片提取完成，共找到 ${imageCount} 个`);
        }
        
        // 提取URL
        if (this.patterns.url) {
            console.log('🔍 [PatternExtractor] 开始提取URL...');
            this.patterns.url.lastIndex = 0;
            let match;
            let urlCount = 0;
            while ((match = this.patterns.url.exec(processContent)) !== null) {
                const url = match[0];
                if (url) {
                    results.urls.add(url);
                    urlCount++;
                    console.log(`✅ [PatternExtractor] URL添加: "${url}"`);
                }
            }
            console.log(`📊 [PatternExtractor] URL提取完成，共找到 ${urlCount} 个`);
        }
        
        console.log('✅ [PatternExtractor] 其他资源提取完成');
    }
    
    /**
     * 提取动态自定义正则模式 - 统一化版本
     */
    async extractDynamicCustomPatterns(content, results) {
        try {
            console.log('🔄 [PatternExtractor] 开始提取动态自定义正则模式...');
            
            // 确保自定义配置已加载
            await this.ensureCustomPatternsLoaded();
            
            // 获取当前的自定义正则配置
            const storageResult = await chrome.storage.local.get(['customRegexConfigs']);
            
            if (!storageResult.customRegexConfigs) {
                console.log('ℹ️ [PatternExtractor] 未找到动态自定义正则配置');
                return;
            }
            
            console.log('📊 [PatternExtractor] 当前动态自定义正则配置:', storageResult.customRegexConfigs);
            
            let configsToProcess = [];
            
            // 检查存储格式：对象格式还是数组格式
            if (Array.isArray(storageResult.customRegexConfigs)) {
                // 数组格式
                configsToProcess = storageResult.customRegexConfigs;
                console.log('📋 [PatternExtractor] 检测到数组格式的自定义正则配置');
            } else if (typeof storageResult.customRegexConfigs === 'object') {
                // 对象格式，转换为数组
                configsToProcess = Object.entries(storageResult.customRegexConfigs).map(([key, config]) => ({
                    key: `custom_${key}`, // 添加 custom_ 前缀
                    name: config.name,
                    pattern: config.pattern,
                    createdAt: config.createdAt
                }));
                console.log('📋 [PatternExtractor] 检测到对象格式的自定义正则配置，已转换为数组格式');
            }
            
            if (configsToProcess.length === 0) {
                console.log('ℹ️ [PatternExtractor] 动态自定义正则配置为空');
                return;
            }
            
            // 限制内容大小
            const maxContentSize = 300000;
            const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
            
            console.log(`📊 [PatternExtractor] 动态自定义正则处理内容大小: ${processContent.length} 字符`);
            
            // 处理每个自定义正则配置
            configsToProcess.forEach((config, index) => {
                try {
                    if (!config.key || !config.pattern || !config.name) {
                        console.warn(`⚠️ [PatternExtractor] 跳过无效的自定义正则配置 ${index + 1}:`, config);
                        return;
                    }
                    
                    console.log(`🔍 [PatternExtractor] 处理自定义正则 ${index + 1}: ${config.name} (${config.key})`);
                    console.log(`📝 [PatternExtractor] 正则模式: ${config.pattern}`);
                    
                    // 创建正则表达式
                    const regex = new RegExp(config.pattern, 'g');
                    
                    // 确保results中有对应的Set
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        console.log(`📦 [PatternExtractor] 为自定义正则 ${config.key} 创建结果集合`);
                    }
                    
                    console.log(`🔍 [PatternExtractor] 开始在内容中匹配自定义正则 ${config.key}...`);
                    console.log(`📊 [PatternExtractor] 待匹配内容长度: ${processContent.length} 字符`);
                    
                    // 先在小样本上测试正则表达式
                    const testContent = processContent.substring(0, 1000);
                    console.log(`🧪 [PatternExtractor] 测试自定义正则 ${config.key} 在小样本上的匹配...`);
                    const testRegex = new RegExp(config.pattern, 'g');
                    let testMatch;
                    let testCount = 0;
                    while ((testMatch = testRegex.exec(testContent)) !== null && testCount < 5) {
                        console.log(`🎯 [PatternExtractor] 测试匹配 ${testCount + 1}: "${testMatch[0]}"`);
                        testCount++;
                    }
                    console.log(`📊 [PatternExtractor] 小样本测试完成，匹配到 ${testCount} 个结果`);
                    
                    // 执行完整匹配
                    let match;
                    let matchCount = 0;
                    regex.lastIndex = 0; // 重置正则表达式状态
                    
                    console.log(`🔍 [PatternExtractor] 开始完整内容匹配...`);
                    while ((match = regex.exec(processContent)) !== null) {
                        const matchedText = match[0];
                        if (matchedText && matchedText.trim()) {
                            results[config.key].add(matchedText.trim());
                            matchCount++;
                            console.log(`✅ [PatternExtractor] 自定义正则 ${config.key} 匹配到 ${matchCount}: "${matchedText.trim()}"`);
                        }
                        
                        // 防止无限循环
                        if (matchCount > 1000) {
                            console.warn(`⚠️ [PatternExtractor] 自定义正则 ${config.key} 匹配次数过多，停止匹配`);
                            break;
                        }
                        
                        // 防止正则表达式无限循环
                        if (regex.lastIndex === match.index) {
                            console.warn(`⚠️ [PatternExtractor] 自定义正则 ${config.key} 检测到无限循环，停止匹配`);
                            break;
                        }
                    }
                    
                    console.log(`📊 [PatternExtractor] 自定义正则 ${config.key} 匹配完成，共找到 ${matchCount} 个结果`);
                    console.log(`📦 [PatternExtractor] 自定义正则 ${config.key} 结果集合大小: ${results[config.key].size}`);
                    
                    // 验证结果是否正确添加到results对象中
                    if (results[config.key].size > 0) {
                        console.log(`✅ [PatternExtractor] 自定义正则 ${config.key} 结果已成功添加到results对象`);
                        console.log(`🎯 [PatternExtractor] 自定义正则 ${config.key} 结果预览:`, Array.from(results[config.key]).slice(0, 3));
                    } else {
                        console.log(`ℹ️ [PatternExtractor] 自定义正则 ${config.key} 未匹配到任何结果`);
                        // 如果没有匹配到结果，仍然保留空的Set，确保键存在
                        console.log(`🔧 [PatternExtractor] 保留空的结果集合以确保键 ${config.key} 存在`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PatternExtractor] 自定义正则配置 ${index + 1} 处理失败:`, error, config);
                    // 即使出错也要确保键存在
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        console.log(`🔧 [PatternExtractor] 为出错的自定义正则 ${config.key} 创建空结果集合`);
                    }
                }
            });
            
            console.log('✅ [PatternExtractor] 动态自定义正则模式提取完成');
            
        } catch (error) {
            console.error('❌ [PatternExtractor] 提取动态自定义正则模式失败:', error);
        }
    }
    
    /**
     * 提取所有模式 - 统一化版本，只使用设置界面配置
     */
    async extractPatterns(content, sourceUrl = '') {
        try {
            console.log('🚀🚀🚀 [PatternExtractor] 统一化版本开始提取模式 - 强制日志！');
            console.log(`📊 [PatternExtractor] 内容长度: ${content.length} 字符`);
            console.log(`🌐 [PatternExtractor] 源URL: ${sourceUrl}`);
            console.log('🔍🔍🔍 [PatternExtractor] 这个方法被调用了！');
            
            // 确保自定义配置已加载
            await this.ensureCustomPatternsLoaded();
            
            // 初始化结果对象，使用Set避免重复 - 修复：使用正确的键名
            const results = {
                // API相关
                absoluteApis: new Set(),
                relativeApis: new Set(),
                
                // 资源文件
                jsFiles: new Set(),
                cssFiles: new Set(),
                images: new Set(),
                urls: new Set(),
                
                // 敏感信息 - 修复：使用与DisplayManager一致的键名
                domains: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(), // 修复：从phones改为phoneNumbers
                credentials: new Set(),
                ipAddresses: new Set(), // 修复：从ips改为ipAddresses
                paths: new Set(),
                jwts: new Set(),
                githubUrls: new Set(), // 修复：从githubs改为githubUrls
                vueFiles: new Set(), // 修复：从vues改为vueFiles
                companies: new Set(),
                comments: new Set(),
                idCards: new Set(),
                bearerTokens: new Set(),
                basicAuth: new Set(),
                authHeaders: new Set(),
                wechatAppIds: new Set(),
                awsKeys: new Set(),
                googleApiKeys: new Set(),
                githubTokens: new Set(),
                gitlabTokens: new Set(),
                webhookUrls: new Set(),
                cryptoUsage: new Set()
            };
            
            console.log('📦 [PatternExtractor] 结果对象初始化完成');
            console.log('📊 [PatternExtractor] 当前可用的正则模式:', Object.keys(this.patterns));
            
            // 限制内容大小，避免过大的正则匹配
            const maxContentSize = 300000; // 约300KB
            const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
            
            console.log(`📊 [PatternExtractor] 实际处理内容大小: ${processContent.length} 字符`);
            
            // 1. 提取API（特殊处理，因为可能有多个正则）
            this.extractAPIs(processContent, results);
            
            // 2. 提取其他资源文件
            this.extractOtherResources(processContent, results, sourceUrl);
            
            // 3. 提取其他模式（使用设置界面配置的正则） - 修复：使用正确的键名映射
            const patternMappings = {
                domain: 'domains',
                email: 'emails', 
                phone: 'phoneNumbers', // 修复：从phones改为phoneNumbers
                credentials: 'credentials',
                ip: 'ipAddresses', // 修复：从ips改为ipAddresses
                paths: 'paths',
                jwt: 'jwts',
                github: 'githubUrls', // 修复：从githubs改为githubUrls
                vue: 'vueFiles', // 修复：从vues改为vueFiles
                company: 'companies',
                comments: 'comments',
                idCard: 'idCards',
                bearerToken: 'bearerTokens',
                basicAuth: 'basicAuth',
                authHeader: 'authHeaders',
                wechatAppId: 'wechatAppIds',
                awsKey: 'awsKeys',
                googleApiKey: 'googleApiKeys',
                githubToken: 'githubTokens',
                gitlabToken: 'gitlabTokens',
                webhookUrls: 'webhookUrls',
                cryptoUsage: 'cryptoUsage'
            };
            
            console.log('🔍 [PatternExtractor] 开始提取其他模式...');
            
            Object.entries(patternMappings).forEach(([patternKey, resultKey]) => {
                if (this.patterns[patternKey]) {
                    console.log(`🔍 [PatternExtractor] 提取 ${patternKey} -> ${resultKey}`);
                    console.log(`📝 [PatternExtractor] 使用正则: ${this.patterns[patternKey].source}`);
                    
                    // 修复：针对负向断言的特殊处理
                    const regex = this.patterns[patternKey];
                    const regexSource = regex.source;
                    const hasLookbehind = regexSource.includes('(?<!') || regexSource.includes('(?<=');
                    const hasLookahead = regexSource.includes('(?!') || regexSource.includes('(?=');
                    
                    if (hasLookbehind || hasLookahead) {
                        console.log(`🔧 [PatternExtractor] 检测到负向断言，使用特殊处理: ${patternKey}`);
                        
                        // 对于包含负向断言的正则，使用 matchAll 方法
                        try {
                            const matches = [...processContent.matchAll(regex)];
                            console.log(`📊 [PatternExtractor] ${patternKey} 使用matchAll找到 ${matches.length} 个匹配`);
                            
                            matches.forEach((match, index) => {
                                const matchedText = match[1] || match[0];
                                if (matchedText && matchedText.trim()) {
                                    const trimmedText = matchedText.trim();
                                    
                                    // 🔥 特殊处理：过滤绝对路径API中包含协议的内容
                                    if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                                        console.log(`🚫 [PatternExtractor] 绝对路径API包含协议，已过滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊处理：过滤绝对路径API中的静态文件
                                    if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                                        console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，已过滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    results[resultKey].add(trimmedText);
                                    console.log(`✅ [PatternExtractor] ${patternKey} 匹配到 ${index + 1}: "${trimmedText}"`);
                                }
                            });
                            
                            console.log(`📊 [PatternExtractor] ${patternKey} 提取完成，共找到 ${matches.length} 个`);
                        } catch (error) {
                            console.error(`❌ [PatternExtractor] ${patternKey} matchAll失败，回退到exec方法:`, error);
                            // 回退到原来的exec方法
                            this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                        }
                    } else {
                        // 对于普通正则，使用原来的exec方法
                        this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                    }
                } else {
                    console.log(`⚠️ [PatternExtractor] 跳过未配置的模式: ${patternKey}`);
                }
            });
            
            
            // 4. 提取动态自定义正则模式 - 修复：直接使用已加载的patterns
            console.log('🔍 [PatternExtractor] 开始提取动态自定义正则模式...');
            console.log('🔍 [PatternExtractor] 当前this.patterns的所有键:', Object.keys(this.patterns));
            
            // 查找所有自定义正则模式
            const customPatternKeys = Object.keys(this.patterns).filter(key => key.startsWith('custom_'));
            console.log(`📊 [PatternExtractor] 发现 ${customPatternKeys.length} 个自定义正则模式:`, customPatternKeys);
            console.log(`🔍 [PatternExtractor] 自定义正则模式详情:`, customPatternKeys.map(key => ({
                key,
                regex: this.patterns[key] ? this.patterns[key].source : 'null',
                type: typeof this.patterns[key]
            })));
            
            if (customPatternKeys.length > 0) {
                customPatternKeys.forEach(patternKey => {
                    try {
                        console.log(`🔍 [PatternExtractor] 处理自定义正则: ${patternKey}`);
                        
                        const regex = this.patterns[patternKey];
                        if (!regex) {
                            console.warn(`⚠️ [PatternExtractor] 自定义正则 ${patternKey} 未找到对应的正则表达式`);
                            return;
                        }
                        
                        // 确保results中有对应的Set
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            console.log(`📦 [PatternExtractor] 为自定义正则 ${patternKey} 创建结果集合`);
                        }
                        
                        console.log(`🔍 [PatternExtractor] 开始匹配自定义正则 ${patternKey}...`);
                        console.log(`📝 [PatternExtractor] 正则表达式: ${regex.source}`);
                        
                        // 重置正则表达式状态
                        regex.lastIndex = 0;
                        
                        let match;
                        let matchCount = 0;
                        
                        while ((match = regex.exec(processContent)) !== null) {
                            const matchedText = match[0];
                            if (matchedText && matchedText.trim()) {
                                results[patternKey].add(matchedText.trim());
                                matchCount++;
                                console.log(`✅ [PatternExtractor] 自定义正则 ${patternKey} 匹配到 ${matchCount}: "${matchedText.trim()}"`);
                            }
                            
                            // 防止无限循环
                            if (matchCount > 1000) {
                                console.warn(`⚠️ [PatternExtractor] 自定义正则 ${patternKey} 匹配次数过多，停止匹配`);
                                break;
                            }
                            
                            // 防止正则表达式无限循环
                            if (regex.lastIndex === match.index) {
                                console.warn(`⚠️ [PatternExtractor] 自定义正则 ${patternKey} 检测到无限循环，停止匹配`);
                                break;
                            }
                        }
                        
                        console.log(`📊 [PatternExtractor] 自定义正则 ${patternKey} 匹配完成，共找到 ${matchCount} 个结果`);
                        console.log(`📦 [PatternExtractor] 自定义正则 ${patternKey} 结果集合大小: ${results[patternKey].size}`);
                        
                        if (results[patternKey].size > 0) {
                            console.log(`✅ [PatternExtractor] 自定义正则 ${patternKey} 结果预览:`, Array.from(results[patternKey]).slice(0, 3));
                        } else {
                            console.log(`ℹ️ [PatternExtractor] 自定义正则 ${patternKey} 未匹配到任何结果`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ [PatternExtractor] 自定义正则 ${patternKey} 处理失败:`, error);
                        // 即使出错也要确保键存在
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            console.log(`🔧 [PatternExtractor] 为出错的自定义正则 ${patternKey} 创建空结果集合`);
                        }
                    }
                });
            } else {
                console.log('ℹ️ [PatternExtractor] 未发现自定义正则模式');
            }
            
            console.log('🔍 [PatternExtractor] 动态自定义正则模式提取完成，当前results键:', Object.keys(results));
            
            // 5. 特殊处理身份证验证
            if (results.idCards.size > 0) {
                console.log(`🔍 [PatternExtractor] 开始验证身份证，共 ${results.idCards.size} 个`);
                const validatedIdCards = this.validateIdCards(Array.from(results.idCards));
                results.idCards = new Set(validatedIdCards);
                console.log(`✅ [PatternExtractor] 身份证验证完成，有效身份证 ${results.idCards.size} 个`);
            }
            
            // 6. 转换Set为Array，包括所有动态创建的键 - 修复：遍历所有键
            const finalResults = {};
            
            console.log('🔍 [PatternExtractor] 开始转换结果，当前results对象的所有键:', Object.keys(results));
            
            // 修复：遍历所有键，包括动态创建的自定义正则键
            for (const [key, value] of Object.entries(results)) {
                finalResults[key] = value instanceof Set ? [...value] : value;
                
                if (value instanceof Set) {
                    console.log(`🔄 [PatternExtractor] 转换 ${key}: Set(${value.size}) -> Array(${finalResults[key].length})`);
                    if (finalResults[key].length > 0) {
                        console.log(`📊 [PatternExtractor] ${key}: ${finalResults[key].length} 个结果`);
                        // 如果是自定义正则结果，显示更详细的信息
                        if (key.startsWith('custom_')) {
                            console.log(`🎯 [PatternExtractor] 自定义正则 ${key} 结果预览:`, finalResults[key].slice(0, 3));
                        }
                    } else if (key.startsWith('custom_')) {
                        // 即使是空的自定义正则结果，也要保留在最终结果中
                        console.log(`📦 [PatternExtractor] 保留空的自定义正则键 ${key}`);
                    }
                } else if (value) {
                    console.log(`🔄 [PatternExtractor] 直接复制 ${key}:`, typeof value, value);
                }
            }
            
            // 验证所有自定义正则键都被正确处理
            const customKeys = Object.keys(results).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                console.log(`✅ [PatternExtractor] 发现并处理了 ${customKeys.length} 个自定义正则键:`, customKeys);
                customKeys.forEach(key => {
                    console.log(`✅ [PatternExtractor] 自定义正则键 ${key} 已正确转换: ${finalResults[key].length} 个结果`);
                });
            } else {
                console.log('ℹ️ [PatternExtractor] 未发现自定义正则键');
            }
            
            console.log('✅ [PatternExtractor] 统一化版本模式提取完成');
            console.log('📊 [PatternExtractor] 最终结果键:', Object.keys(finalResults));
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ [PatternExtractor] 提取模式失败:', error);
            return {};
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternExtractor;
} else if (typeof window !== 'undefined') {
    window.PatternExtractor = PatternExtractor;
}
