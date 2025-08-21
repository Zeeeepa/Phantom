 class SRCMinerContent {
    constructor() {
        if (window !== window.top) {
            console.log('SRCMiner: 跳过iframe环境');
            return;
        }
        
        this.isScanning = false;
        this.scanResults = {};
        this.lastScanTime = 0;
        this.scanCooldown = 3000; 
        this.config = this.getConfig();
        this.customRegexConfig = null;
        
        console.log('🔍 幻影已加载 -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (window !== window.top) return false;
            
            switch (request.action) {
                case 'extractInfo':
                    this.performScan().then(results => {
                        sendResponse(results);
                    }).catch(error => {
                        console.error('扫描失败:', error);
                        sendResponse(this.getEmptyResults());
                    });
                    return true;
                    
                case 'getStatus':
                    sendResponse({
                        isScanning: this.isScanning,
                        url: window.location.href,
                        lastScan: this.lastScanTime
                    });
                    return true;
                
                // 处理深度扫描窗口的消息
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    this.handleDeepScanMessage(request);
                    sendResponse({ success: true });
                    return true;
            }
        });
        
        // 页面加载完成后自动扫描
        this.autoScan();
        
        // 监听页面变化
        this.observePageChanges();
    }

    /**
     * 加载自定义正则表达式配置
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                console.log('🔄 Content Script加载regexSettings配置:', customSettings);
            } else if (result.phantomRegexConfig) {
                // 转换phantomRegexConfig格式为regexSettings格式
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                console.log('🔄 Content Script从phantomRegexConfig转换配置:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                console.log('✅ Content Script正则表达式配置已更新');
            } else {
                console.log('📋 Content Script使用默认正则表达式配置');
            }
        } catch (error) {
            console.error('❌ Content Script加载自定义正则表达式配置失败:', error);
        }
    }
    
    getConfig() {
        return {
            // 扫描配置
            scanTimeout: 30000,
            maxResults: 1000,
            
            // 文件类型配置
            jsExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue'],
            cssExtensions: ['css', 'scss', 'sass', 'less', 'styl'],
            imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'],
            audioExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
            videoExtensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
            
            // 敏感关键词
            sensitiveKeywords: [
                'password', 'passwd', 'pwd', 'pass', 'secret', 'key', 'token',
                'api_key', 'access_token', 'refresh_token', 'private_key', 'public_key',
                'admin', 'root', 'database', 'db_password', 'db_user', 'mysql',
                'redis', 'mongodb', 'config', 'env', 'credential', 'auth',
                'login', 'session', 'cookie', 'jwt', 'bearer', 'oauth'
            ],
            
            // 过滤规则
            excludePatterns: [
                /chrome-extension:\/\//,
                /moz-extension:\/\//,
                /about:blank/,
                /data:image/,
                /javascript:void/,
                /mailto:/,
                /tel:/,
                /^#/,
                /\.(?:woff|woff2|ttf|eot|otf)$/i,
                /iframe\.js/,
                /window\.iframeStartup/,
                /devtools/,
                /wappalyzer/,
                /vue-devtools/
            ],
            
            // API路径识别
            apiPatterns: [
                /\/api\//,
                /\/v\d+\//,
                /\/admin\//,
                /\/manage\//,
                /\/backend\//,
                /\/service\//,
                /\/rest\//,
                /\/graphql/,
                /\.(?:php|asp|aspx|jsp|do|action)$/,
                /\.(?:json|xml)(?:\?|$)/
            ]
        };
    }
    
    async autoScan() {
        if (document.readyState === 'complete') {
            setTimeout(() => this.performScan(true), 1000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.performScan(true), 2000);
            });
        }
    }
    
    observePageChanges() {
        let scanTimeout;
        const observer = new MutationObserver((mutations) => {
            const now = Date.now();
            if (now - this.lastScanTime < this.scanCooldown) return;
            
            const hasSignificantChange = mutations.some(mutation => {
                return mutation.addedNodes.length > 0 &&
                       Array.from(mutation.addedNodes).some(node => 
                           node.nodeType === Node.ELEMENT_NODE &&
                           (node.tagName === 'SCRIPT' || 
                            node.tagName === 'FORM' ||
                            node.hasAttribute('src') ||
                            node.hasAttribute('href'))
                       );
            });
            
            if (hasSignificantChange) {
                clearTimeout(scanTimeout);
                scanTimeout = setTimeout(() => {
                    this.performScan(true);
                }, 3000);
            }
        });
        
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
    
    async performScan(silent = false) {
        if (this.isScanning) return this.scanResults;
        
        this.isScanning = true;
        this.lastScanTime = Date.now();
        
        if (!silent) {
            console.log('🔍 开始扫描页面:', window.location.href);
        }
        
        try {
            const results = await this.extractAllInfo();
            this.scanResults = results;
            
            if (!silent) {
                this.logResults(results);
            }
            
            // 发送结果到后台
            chrome.runtime.sendMessage({
                action: 'storeResults',
                data: results,
                url: window.location.href
            }).catch(() => {});
            
            return results;
        } catch (error) {
            console.error('扫描过程出错:', error);
            return this.getEmptyResults();
        } finally {
            this.isScanning = false;
        }
    }
    
    async extractAllInfo() {
        console.log('🔍 Content Script开始提取信息...');
        console.log('🔍 检查模块化系统可用性:', {
            PatternExtractor: typeof PatternExtractor !== 'undefined',
            ContentExtractor: typeof ContentExtractor !== 'undefined',
            windowPatternExtractor: !!window.patternExtractor
        });
        
        let results;

        await this.loadEnhancedFilter();

        // 检查是否有新的模块化系统可用
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            console.log('🔄 Content Script使用新的模块化提取系统');
            try {
                // 确保PatternExtractor已经初始化并加载了最新配置
                if (!window.patternExtractor) {
                    console.log('🔧 Content Script初始化PatternExtractor...');
                    window.patternExtractor = new PatternExtractor();
                }
                
                // 强制重新加载自定义配置
                console.log('🔄 Content Script重新加载PatternExtractor自定义配置...');
                await window.patternExtractor.loadCustomPatterns();
                
                // 等待配置加载完成
                if (typeof window.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                    await window.patternExtractor.ensureCustomPatternsLoaded();
                }
                
                console.log('🔧 Content Script当前PatternExtractor配置状态:', {
                    customPatternsLoaded: window.patternExtractor.customPatternsLoaded,
                    customRegexConfig: window.patternExtractor.customRegexConfig,
                    hasCustomEmails: !!(window.patternExtractor.customRegexConfig && window.patternExtractor.customRegexConfig.emails),
                    hasCustomPhones: !!(window.patternExtractor.customRegexConfig && window.patternExtractor.customRegexConfig.phoneNumbers),
                    hasCustomDomains: !!(window.patternExtractor.customRegexConfig && window.patternExtractor.customRegexConfig.domains)
                });
                
                const contentExtractor = new ContentExtractor();
                results = await contentExtractor.extractSensitiveInfo(window.location.href);
                console.log('✅ Content Script新系统提取完成，结果统计:', {
                    absoluteApis: results.absoluteApis?.length || 0,
                    domains: results.domains?.length || 0,
                    emails: results.emails?.length || 0,
                    phoneNumbers: results.phoneNumbers?.length || 0
                });
            } catch (error) {
                console.error('❌ Content Script新系统提取失败，使用降级方案:', error);
                console.error('错误堆栈:', error.stack);
                results = null;
            }
        } else {
            console.warn('⚠️ Content Script模块化系统不可用，PatternExtractor:', typeof PatternExtractor, 'ContentExtractor:', typeof ContentExtractor);
        }
        
        // 降级方案：使用原有的提取逻辑
        if (!results) {
            console.log('📋 Content Script使用原有的提取系统');
            results = this.getEmptyResults();
            
            // 首先加载过滤器并等待初始化完成
            //await this.loadEnhancedFilter();
            
            // 获取页面内容
            const content = this.getPageContent();
            
            // 并行执行各种提取任务
            await Promise.all([
                this.extractAPIs(content, results),
                this.extractFiles(content, results),
                this.extractNetworkInfo(content, results),
                this.extractSensitiveInfo(content, results),
                this.extractFormInfo(results),
                this.extractComments(content, results),
                this.extractPaths(content, results),
                this.extractParameters(content, results)
            ]);
        }
        
        // FIX: #1 无论走哪个分支，统一跑一次增强过滤
        console.log('🔍 [FIX] 开始统一应用增强过滤器...');
        await this.applyEnhancedFiltering(results);
        console.log('✅ [FIX] 统一增强过滤器应用完成');
        
  

        // 清理和去重
        this.cleanResults(results);
        
        console.log('📋 Content Script最终提取完成，结果统计:', {
            absoluteApis: results.absoluteApis?.length || 0,
            domains: results.domains?.length || 0,
            emails: results.emails?.length || 0,
            phoneNumbers: results.phoneNumbers?.length || 0
        });
        
        return results;
    }
    
    getPageContent() {
        const content = {
            html: document.documentElement.outerHTML,
            scripts: '',
            styles: '',
            links: '',
            meta: ''
        };
        
        // 获取脚本内容
        Array.from(document.scripts).forEach(script => {
            if (this.isValidElement(script)) {
                content.scripts += (script.innerHTML || script.textContent || '') + '\n';
            }
        });
        
        // 获取样式内容
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                if (sheet.cssRules && this.isValidStyleSheet(sheet)) {
                    Array.from(sheet.cssRules).forEach(rule => {
                        content.styles += rule.cssText + '\n';
                    });
                }
            } catch (e) {
                // 跨域样式表无法访问
            }
        });
        
        // 获取链接
        Array.from(document.links).forEach(link => {
            if (this.isValidElement(link)) {
                content.links += link.href + '\n';
            }
        });
        
        // 获取meta信息
        Array.from(document.querySelectorAll('meta')).forEach(meta => {
            if (this.isValidElement(meta)) {
                content.meta += meta.outerHTML + '\n';
            }
        });
        
        return content;
    }
    
    isValidElement(element) {
        try {
            return element.ownerDocument === document &&
                   element.ownerDocument.defaultView === window &&
                   !this.isExcluded(element.src || element.href || element.textContent || '');
        } catch (e) {
            return false;
        }
    }
    
    isValidStyleSheet(sheet) {
        try {
            return sheet.ownerNode && 
                   sheet.ownerNode.ownerDocument === document &&
                   sheet.ownerNode.ownerDocument.defaultView === window;
        } catch (e) {
            return false;
        }
    }
    
    isExcluded(content) {
        return this.config.excludePatterns.some(pattern => pattern.test(content));
    }
    
    async extractAPIs(content, results) {
        const allContent = Object.values(content).join('\n');
        
        // 使用自定义API正则表达式（如果有）
        if (this.customRegexConfig && 
            (this.customRegexConfig.absoluteApis || this.customRegexConfig.relativeApis)) {
            
            // 提取绝对路径API
            if (this.customRegexConfig.absoluteApis && this.customRegexConfig.absoluteApis.trim()) {
                try {
                    const customAbsolutePattern = new RegExp(this.customRegexConfig.absoluteApis, 'g');
                    const absoluteApis = allContent.match(customAbsolutePattern) || [];
                    absoluteApis.forEach(api => {
                        const cleanApi = api.replace(/["'`]/g, '');
                        if (cleanApi && this.isValidAPI(cleanApi, true)) {
                            results.absoluteApis.add(cleanApi);
                        }
                    });
                    console.log('🔧 使用自定义绝对路径API正则表达式，匹配到', absoluteApis.length, '个API');
                } catch (error) {
                    console.error('自定义绝对路径API正则表达式格式错误:', error);
                }
            }
            
            // 提取相对路径API
            if (this.customRegexConfig.relativeApis && this.customRegexConfig.relativeApis.trim()) {
                try {
                    const customRelativePattern = new RegExp(this.customRegexConfig.relativeApis, 'g');
                    const relativeApis = allContent.match(customRelativePattern) || [];
                    relativeApis.forEach(api => {
                        const cleanApi = api.replace(/["'`]/g, '');
                        if (cleanApi && this.isValidAPI(cleanApi, false)) {
                            results.relativeApis.add(cleanApi);
                        }
                    });
                    console.log('🔧 使用自定义相对路径API正则表达式，匹配到', relativeApis.length, '个API');
                } catch (error) {
                    console.error('自定义相对路径API正则表达式格式错误:', error);
                }
            }
        } else {
            // 使用默认的API提取逻辑
            this.extractAPIsWithDefaultPattern(allContent, results);
        }
        
        // 额外的模块路径提取
        this.extractModulePaths(allContent, results);
    }

    extractAPIsWithDefaultPattern(allContent, results) {
        // 使用SnowEyes的API模式进行匹配
        const apiPattern = /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\{\}\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g;
        
        let match;
        while ((match = apiPattern.exec(allContent)) !== null) {
            const path = match[0];
            
            // 使用优化的API过滤器
            if (window.apiFilter && typeof window.apiFilter.filterAPI === 'function') {
                try {
                    window.apiFilter.filterAPI(path, results);
                } catch (error) {
                    console.warn('API过滤器处理失败:', error);
                    this.fallbackAPIExtraction(path, results);
                }
            } else {
                // 降级处理
                this.fallbackAPIExtraction(path, results);
            }
        }
        console.log('📋 使用默认API提取模式');
    }
    
    async loadEnhancedFilter() {
        try {
            // 检查是否已经初始化过滤器
            if (window.domainPhoneFilter) {
                console.log('🔍 增强过滤器已加载');
                return;
            }
            
            console.log('🔄 开始加载增强过滤器...');
            
            // 加载域名和手机号过滤器
            if (!window.domainPhoneFilter && !document.querySelector('script[src*="domain-phone-filter.js"]')) {
                const domainScript = document.createElement('script');
                domainScript.src = chrome.runtime.getURL('filters/domain-phone-filter.js');
                document.head.appendChild(domainScript);
                
                // 等待加载完成
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.error('⏰ 过滤器加载超时');
                        reject(new Error('加载超时'));
                    }, 10000); // 10秒超时
                    
                    domainScript.onload = () => {
                        console.log('📦 过滤器脚本加载完成，开始初始化...');
                        // 等待一小段时间确保类定义完成
                        setTimeout(() => {
                            try {
                                // 检查类是否可用
                                if (typeof DomainPhoneFilter !== 'undefined') {
                                    window.domainPhoneFilter = new DomainPhoneFilter();
                                    console.log('✅ 增强过滤器初始化成功');
                                    console.log('🔍 过滤器功能测试:', {
                                        isValidDomain: typeof window.domainPhoneFilter.isValidDomain === 'function',
                                        filterDomains: typeof window.domainPhoneFilter.filterDomains === 'function',
                                        filterPhones: typeof window.domainPhoneFilter.filterPhones === 'function',
                                        filterEmails: typeof window.domainPhoneFilter.filterEmails === 'function'
                                    });
                                    clearTimeout(timeout);
                                    resolve();
                                } else {
                                    console.error('❌ DomainPhoneFilter 类未找到');
                                    clearTimeout(timeout);
                                    reject(new Error('DomainPhoneFilter 类未找到'));
                                }
                            } catch (initError) {
                                console.error('❌ 过滤器初始化失败:', initError);
                                clearTimeout(timeout);
                                reject(initError);
                            }
                        }, 200); // 增加等待时间
                    };
                    
                    domainScript.onerror = (error) => {
                        console.error('❌ 域名过滤器加载失败:', error);
                        clearTimeout(timeout);
                        reject(error);
                    };
                });
            }
            
            // 加载API过滤器（可选）
            if (!window.apiFilter && !document.querySelector('script[src*="api-filter.js"]')) {
                try {
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL('filters/api-filter.js');
                    document.head.appendChild(script);
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(resolve, 3000); // API过滤器不是必需的，3秒后继续
                        script.onload = () => {
                            clearTimeout(timeout);
                            console.log('📦 API过滤器加载完成');
                            resolve();
                        };
                        script.onerror = () => {
                            clearTimeout(timeout);
                            console.warn('⚠️ API过滤器加载失败，继续执行');
                            resolve(); // 不阻塞主流程
                        };
                    });
                } catch (error) {
                    console.warn('⚠️ API过滤器加载失败:', error);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ 过滤器加载失败，使用降级方案:', error);
        }
    }
    
    fallbackAPIExtraction(path, results) {
        const cleanPath = path.slice(1, -1); // 移除引号
        
        if (!cleanPath || cleanPath.length < 2) return;
        
        // 基础过滤
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot)$/i.test(cleanPath)) {
            return;
        }
        
        // 绝对路径
        if (cleanPath.startsWith('/')) {
            if (this.isValidAPI(cleanPath, true)) {
                results.absoluteApis.add(cleanPath);
            }
        }
        // 相对路径
        else if (!cleanPath.startsWith('./') && !cleanPath.startsWith('../')) {
            if (this.isValidAPI(cleanPath, false)) {
                results.relativeApis.add(cleanPath);
            }
        }
        // 模块路径
        else {
            if (this.isValidModulePath(cleanPath)) {
                results.modulePaths.add(cleanPath);
            }
        }
    }
    
    extractModulePaths(content, results) {
        const modulePatterns = [
            /import\s+.*?from\s+["'`]([^"'`]+)["'`]/g,
            /require\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
            /import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g
        ];
        
        modulePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const path = match[1];
                if (path && this.isValidModulePath(path)) {
                    results.modulePaths.add(path);
                }
            }
        });
    }
    
    async extractFiles(content, results) {
        const allContent = Object.values(content).join('\n');
        
        // JS文件
        this.extractFilesByExtension(allContent, this.config.jsExtensions, results.jsFiles);
        
        // CSS文件
        this.extractFilesByExtension(allContent, this.config.cssExtensions, results.cssFiles);
        
        // 图片文件
        this.extractFilesByExtension(allContent, this.config.imageExtensions, results.images);
        
        // 音频文件
        this.extractFilesByExtension(allContent, this.config.audioExtensions, results.audios);
        
        // 视频文件
        this.extractFilesByExtension(allContent, this.config.videoExtensions, results.videos);
    }
    
    extractFilesByExtension(content, extensions, resultSet) {
        const pattern = new RegExp(
  `(?:src|href)\\s*=\\s*["'\\\`]([^"'\\\`]*?\\.(?:${extensions.join('|')})(?:\\?[^"'\\\`]*)?)["'\\\`]`,'gi');
        const matches = content.match(pattern) || [];
        
        matches.forEach(match => {
            const parts = match.split('=');
            if (parts.length > 1) {
                const file = parts[1].replace(/["'`]/g, '').trim();
                if (file && !this.isExcluded(file)) {
                    resultSet.add(file);
                }
            }
        });
    }
    
    async extractNetworkInfo(content, results) {
        const allContent = Object.values(content).join('\n');
        
        // URL
        const urlPattern = /(https?:\/\/[^\s"'<>]+)/g;
        const urls = allContent.match(urlPattern) || [];
        urls.forEach(url => {
            if (!this.isExcluded(url)) {
                results.urls.add(url);
                
                // 提取域名
                try {
                    const urlObj = new URL(url);
                    // 使用增强过滤器验证域名
                    if (window.domainPhoneFilter && window.domainPhoneFilter.isValidDomain(urlObj.hostname)) {
                        results.domains.add(urlObj.hostname);
                    } else if (!window.domainPhoneFilter) {
                        // 降级方案
                        results.domains.add(urlObj.hostname);
                    }
                    
                    // 提取子域名
                    const parts = urlObj.hostname.split('.');
                    if (parts.length > 2) {
                        results.subdomains.add(urlObj.hostname);
                    }
                    
                    // 提取端口
                    if (urlObj.port) {
                        results.ports.add(urlObj.port);
                    }
                } catch (e) {
                    // 无效URL
                }
            }
        });
        
        // IP地址
        const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
        const ips = allContent.match(ipPattern) || [];
        ips.forEach(ip => results.ipAddresses.add(ip));
        
        // 域名（独立匹配）- 使用增强过滤器
        if (window.domainPhoneFilter) {
            const extractedDomains = window.domainPhoneFilter.extractDomainsFromText(allContent);
            const validDomains = window.domainPhoneFilter.filterDomains(extractedDomains);
            validDomains.forEach(domain => {
                if (!this.isExcluded(domain)) {
                    results.domains.add(domain);
                }
            });
        } else {
            // 降级方案：使用自定义域名正则（如果有）或默认正则
            this.extractDomainsWithCustomRegex(allContent, results);
        }
    }
    
    async extractSensitiveInfo(content, results) {
        const allContent = Object.values(content).join('\n');
        
        // 使用增强的域名手机号过滤器
        if (window.domainPhoneFilter) {
            try {
                const extractedInfo = window.domainPhoneFilter.processText(allContent);
                
                // 添加有效的邮箱地址
                extractedInfo.emails.forEach(email => results.emails.add(email));
                
                // 添加有效的手机号
                extractedInfo.phoneNumbers.forEach(phone => results.phoneNumbers.add(phone));
                
                // 添加有效的域名
                extractedInfo.domains.forEach(domain => results.domains.add(domain));
                
                console.log('🔍 使用增强过滤器提取敏感信息:', {
                    emails: extractedInfo.emails.length,
                    phones: extractedInfo.phoneNumbers.length,
                    domains: extractedInfo.domains.length
                });
            } catch (error) {
                console.warn('增强过滤器处理失败，使用降级方案:', error);
                this.fallbackSensitiveExtraction(allContent, results);
            }
        } else {
            // 降级方案：使用自定义正则配置的提取逻辑
            this.fallbackSensitiveExtraction(allContent, results);
        }
        
        // 敏感关键词提取 - 使用自定义正则（如果有）
        if (this.customRegexConfig && this.customRegexConfig.credentials && this.customRegexConfig.credentials.trim()) {
            try {
                const customCredentialsPattern = new RegExp(this.customRegexConfig.credentials, 'gi');
                const credentials = allContent.match(customCredentialsPattern) || [];
                credentials.forEach(credential => results.sensitiveKeywords.add(credential));
                console.log('🔧 使用自定义敏感信息正则表达式，匹配到', credentials.length, '个敏感信息');
            } catch (error) {
                console.error('自定义敏感信息正则表达式格式错误:', error);
                this.useDefaultSensitiveKeywords(allContent, results);
            }
        } else {
            this.useDefaultSensitiveKeywords(allContent, results);
        }
    }

    useDefaultSensitiveKeywords(allContent, results) {
        this.config.sensitiveKeywords.forEach(keyword => {
            const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = allContent.match(pattern) || [];
            matches.forEach(match => results.sensitiveKeywords.add(match.toLowerCase()));
        });
        console.log('📋 使用默认敏感关键词匹配');
    }
    
    fallbackSensitiveExtraction(allContent, results) {
        console.log('🔧 Content Script开始降级敏感信息提取...');
        console.log('🔧 当前自定义正则配置:', this.customRegexConfig);
        
        // 使用自定义邮箱正则（如果有）
        if (this.customRegexConfig && this.customRegexConfig.emails && this.customRegexConfig.emails.trim()) {
            try {
                console.log('🔧 使用自定义邮箱正则:', this.customRegexConfig.emails);
                const customEmailPattern = new RegExp(this.customRegexConfig.emails, 'g');
                const emails = allContent.match(customEmailPattern) || [];
                emails.forEach(email => {
                    if (!this.isExcluded(email)) {
                        results.emails.add(email);
                    }
                });
                console.log('🔧 使用自定义邮箱正则表达式，匹配到', emails.length, '个邮箱:', emails.slice(0, 5));
            } catch (error) {
                console.error('自定义邮箱正则表达式格式错误:', error);
                this.useDefaultEmailPattern(allContent, results);
            }
        } else {
            console.log('📋 使用默认邮箱正则表达式');
            this.useDefaultEmailPattern(allContent, results);
        }
        
        // 使用自定义手机号正则（如果有）
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                console.log('🔧 使用自定义手机号正则:', this.customRegexConfig.phoneNumbers);
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = allContent.match(customPhonePattern) || [];
                phones.forEach(phone => results.phoneNumbers.add(phone));
                console.log('🔧 使用自定义手机号正则表达式，匹配到', phones.length, '个手机号:', phones.slice(0, 5));
            } catch (error) {
                console.error('自定义手机号正则表达式格式错误:', error);
                this.useDefaultPhonePatterns(allContent, results);
            }
        } else {
            console.log('📋 使用默认手机号正则表达式');
            this.useDefaultPhonePatterns(allContent, results);
        }
        
        // 使用自定义敏感信息正则（如果有）
        if (this.customRegexConfig && this.customRegexConfig.credentials && this.customRegexConfig.credentials.trim()) {
            try {
                console.log('🔧 使用自定义敏感信息正则:', this.customRegexConfig.credentials);
                const customCredentialsPattern = new RegExp(this.customRegexConfig.credentials, 'gi');
                const credentials = allContent.match(customCredentialsPattern) || [];
                credentials.forEach(credential => results.sensitiveKeywords.add(credential));
                console.log('🔧 使用自定义敏感信息正则表达式，匹配到', credentials.length, '个敏感信息:', credentials.slice(0, 5));
            } catch (error) {
                console.error('自定义敏感信息正则表达式格式错误:', error);
            }
        } else {
            console.log('📋 使用默认敏感关键词匹配');
        }
    }

    useDefaultEmailPattern(allContent, results) {
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = allContent.match(emailPattern) || [];
        emails.forEach(email => {
            if (!this.isExcluded(email)) {
                results.emails.add(email);
            }
        });
        console.log('📋 使用默认邮箱正则表达式，匹配到', emails.length, '个邮箱');
    }

    useDefaultPhonePatterns(allContent, results) {
        const phonePatterns = [
            "1[3-9]\\d{9}"
        ];
        
        phonePatterns.forEach(pattern => {
            const phones = allContent.match(pattern) || [];
            phones.forEach(phone => results.phoneNumbers.add(phone));
        });
        console.log('📋 使用默认手机号正则表达式');
    }

    extractDomainsWithCustomRegex(allContent, results) {
        // 使用自定义域名正则（如果有）
        if (this.customRegexConfig && this.customRegexConfig.domains && this.customRegexConfig.domains.trim()) {
            try {
                const customDomainPattern = new RegExp(this.customRegexConfig.domains, 'g');
                const domains = allContent.match(customDomainPattern) || [];
                domains.forEach(domain => {
                    if (!this.isExcluded(domain)) {
                        results.domains.add(domain);
                    }
                });
                console.log('🔧 使用自定义域名正则表达式，匹配到', domains.length, '个域名');
            } catch (error) {
                console.error('自定义域名正则表达式格式错误:', error);
                this.useDefaultDomainPattern(allContent, results);
            }
        } else {
            this.useDefaultDomainPattern(allContent, results);
        }
    }

    useDefaultDomainPattern(allContent, results) {
        const domainPattern = /([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)/g;
        const domains = allContent.match(domainPattern) || [];
        domains.forEach(domain => {
            if (domain.includes('.') && domain.length > 3 && domain.length < 100 && !this.isExcluded(domain)) {
                results.domains.add(domain);
            }
        });
        console.log('📋 使用默认域名正则表达式，匹配到', domains.length, '个域名');
    }
    
    async extractFormInfo(results) {
        try {
            // 表单
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                if (this.isValidElement(form)) {
                    const formInfo = {
                        action: form.action || '',
                        method: form.method || 'GET',
                        id: form.id || '',
                        class: form.className || ''
                    };
                    results.forms.add(JSON.stringify(formInfo));
                }
            });
            
            // 输入字段
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (this.isValidElement(input)) {
                    const inputInfo = {
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name || '',
                        id: input.id || '',
                        placeholder: input.placeholder || ''
                    };
                    
                    if (input.type === 'hidden' && input.value) {
                        inputInfo.value = input.value;
                        results.hiddenFields.add(JSON.stringify(inputInfo));
                    } else {
                        results.inputFields.add(JSON.stringify(inputInfo));
                    }
                }
            });
        } catch (error) {
            console.error('提取表单信息时出错:', error);
        }
    }
    
    async extractComments(content, results) {
        const allContent = Object.values(content).join('\n');
        
        // HTML注释
        const htmlCommentPattern = /<!--([\s\S]*?)-->/g;
        let matches = allContent.match(htmlCommentPattern) || [];
        matches.forEach(match => {
            const comment = match.slice(4, -3).trim();
            if (comment.length > 5 && comment.length < 500 && !this.isExcluded(comment)) {
                results.comments.add(comment);
            }
        });
        
        // JS注释
        const jsCommentPatterns = [
            /\/\*([\s\S]*?)\*\//g,
            /\/\/(.+)$/gm
        ];
        
        jsCommentPatterns.forEach(pattern => {
            matches = allContent.match(pattern) || [];
            matches.forEach(match => {
                let comment = match.replace(/^(\/\*|\*\/|\/\/)/, '').replace(/\*\/$/, '').trim();
                if (comment.length > 5 && comment.length < 500 && !this.isExcluded(comment)) {
                    results.comments.add(comment);
                }
            });
        });
    }
    
    async extractPaths(content, results) {
        const allContent = Object.values(content).join('\n');
        
        const pathPatterns = [
            /["'`](\/[a-zA-Z0-9\/_\-\.]+)["'`]/g,
            /href\s*=\s*["'`]([^"'`#?]+)/gi,
            /action\s*=\s*["'`]([^"'`]+)["'`]/gi
        ];
        
        pathPatterns.forEach(pattern => {
            const matches = allContent.match(pattern) || [];
            matches.forEach(match => {
                let path;
                if (match.includes('=')) {
                    path = match.split('=')[1].replace(/["'`]/g, '').trim();
                } else {
                    path = match.slice(1, -1);
                }
                
                if (path && path.startsWith('/') && path.length > 1 && path.length < 200 && !this.isExcluded(path)) {
                    results.paths.add(path);
                }
            });
        });
    }
    
    async extractParameters(content, results) {
        const allContent = Object.values(content).join('\n');
        
        const paramPatterns = [
            /[?&]([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g,
            /data-([a-zA-Z\-]+)/g,
            /name\s*=\s*["'`]([^"'`]+)["'`]/gi
        ];
        
        paramPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(allContent)) !== null) {
                const param = match[1];
                if (param && param.length > 1 && param.length < 50 && /^[a-zA-Z_][a-zA-Z0-9_\-]*$/.test(param)) {
                    results.parameters.add(param);
                }
            }
        });
    }
    
    isValidAPI(path, isAbsolute) {
        if (!path || path.length < 2) return false;
        
        if (isAbsolute && !path.startsWith('/')) return false;
        if (!isAbsolute && (path.startsWith('/') || path.startsWith('.') || path.includes('://'))) return false;
        
        // 检查是否为静态文件（扩展更多资源类型，避免误当作API）——放行 .json/.xml
        if (/\.(css|js|mjs|cjs|jsx|ts|tsx|png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff|woff|woff2|ttf|eot|otf|mp3|wav|ogg|m4a|aac|flac|wma|mp4|avi|mov|wmv|flv|webm|mkv|m4v|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|map)$/i.test(path)) return false;
        
        // 检查是否匹配API模式
        return this.config.apiPatterns.some(pattern => pattern.test(path));
    }
    
    isValidModulePath(path) {
        return (path.startsWith('./') || path.startsWith('../') || path.includes('node_modules')) &&
               path.length > 2 && path.length < 200 && !this.isExcluded(path);
    }
    
    /**
     * 应用增强过滤器进行最终过滤
     * FIX: 只过滤手机号和域名，其他字段全部放行，避免误杀
     */
    async applyEnhancedFiltering(results) {
        if (!window.domainPhoneFilter) {
            console.warn('⚠️ [FIX] DomainPhoneFilter not loaded, skip final filtering');
            return;
        }
        
        try {
            console.log('🔄 [FIX] 开始应用增强过滤（仅过滤手机号和域名）...');
            console.log('🔄 [FIX] 过滤前数据统计:', {
                domains: this.getDataCount(results.domains),
                phoneNumbers: this.getDataCount(results.phoneNumbers)
            });
            
            // 只过滤手机号 - 支持 Array 和 Set
            if (results.phoneNumbers) {
                const phoneArray = this.toArray(results.phoneNumbers);
                console.log(`🔍 [FIX] 开始过滤手机号，原始数量: ${phoneArray.length}`);
                
                const validPhones = window.domainPhoneFilter.filterPhones(phoneArray, true);
                results.phoneNumbers = this.restoreDataType(results.phoneNumbers, validPhones);
                
                console.log(`✅ [FIX] 手机号过滤完成: ${phoneArray.length} -> ${validPhones.length}`);
            }
            
            // 只过滤域名 - 支持 Array 和 Set
            if (results.domains) {
                const domainArray = this.toArray(results.domains);
                console.log(`🔍 [FIX] 开始过滤域名，原始数量: ${domainArray.length}`);
                
                const validDomains = window.domainPhoneFilter.filterDomains(domainArray);
                results.domains = this.restoreDataType(results.domains, validDomains);
                
                console.log(`✅ [FIX] 域名过滤完成: ${domainArray.length} -> ${validDomains.length}`);
            }
            
            // 其余字段全部放行，不再过滤
            console.log('✅ [FIX] 其他字段（邮箱、API、敏感信息等）全部放行，不进行过滤');
            
            console.log('🎉 [FIX] 增强过滤完成！只过滤了手机号和域名');
            console.log('🎉 [FIX] 过滤后数据统计:', {
                domains: this.getDataCount(results.domains),
                phoneNumbers: this.getDataCount(results.phoneNumbers),
                emails: this.getDataCount(results.emails),
                absoluteApis: this.getDataCount(results.absoluteApis),
                relativeApis: this.getDataCount(results.relativeApis),
                credentials: this.getDataCount(results.credentials)
            });
            
        } catch (error) {
            console.error('❌ [FIX] 增强过滤失败:', error);
            console.error('❌ [FIX] 错误详情:', error.stack);
        }
    }
    
    /**
     * 获取数据数量，支持 Array 和 Set
     */
    getDataCount(data) {
        if (!data) return 0;
        if (data instanceof Set) return data.size;
        if (Array.isArray(data)) return data.length;
        return 0;
    }
    
    /**
     * 将数据转换为数组，支持 Array 和 Set
     */
    toArray(data) {
        if (!data) return [];
        if (data instanceof Set) return Array.from(data);
        if (Array.isArray(data)) return data;
        return [];
    }
    
    /**
     * 根据原始数据类型恢复过滤后的数据类型
     */
    restoreDataType(originalData, filteredArray) {
        if (originalData instanceof Set) {
            return new Set(filteredArray);
        }
        return filteredArray;
    }
    
    cleanResults(results) {
        Object.keys(results).forEach(key => {
            if (results[key] instanceof Set) {
                // 转换为数组并去重
                const array = Array.from(results[key])
                    .filter(item => item && item.length > 0)
                    .slice(0, this.config.maxResults);
                results[key] = array;
            }
        });
    }
    
    logResults(results) {
        // 确保所有结果都是数组格式
        let totalItems = 0;
        const summary = {};
        
        Object.keys(results).forEach(key => {
            const value = results[key];
            let count = 0;
            
            if (Array.isArray(value)) {
                count = value.length;
            } else if (value instanceof Set) {
                count = value.size;
            } else if (value && typeof value === 'object') {
                count = Object.keys(value).length;
            }
            
            summary[key] = count;
            totalItems += count;
        });
        
        console.log(`🔍 幻影: 扫描完成，发现 ${totalItems} 个项目`);
        
        if (totalItems > 0) {
            console.log('📊 扫描结果摘要:');
            Object.keys(summary).forEach(key => {
                if (summary[key] > 0) {
                    console.log(`  ${key}: ${summary[key]} 个`);
                }
            });
            
            // 高亮显示重要发现
            if (summary.sensitiveKeywords > 0) {
                const keywords = Array.isArray(results.sensitiveKeywords) ? 
                    results.sensitiveKeywords : Array.from(results.sensitiveKeywords);
                console.warn(`⚠️ 发现敏感关键词:`, keywords.slice(0, 10));
            }
            if (summary.emails > 0) {
                const emails = Array.isArray(results.emails) ? 
                    results.emails : Array.from(results.emails);
                console.info(`📧 发现邮箱地址:`, emails.slice(0, 5));
            }
            if (summary.absoluteApis > 0) {
                const apis = Array.isArray(results.absoluteApis) ? 
                    results.absoluteApis : Array.from(results.absoluteApis);
                console.info(`🔗 发现API接口:`, apis.slice(0, 10));
            }
        } else {
            console.log('📊 未发现任何项目');
        }
    }
    
    getEmptyResults() {
        return {
            absoluteApis: new Set(),
            relativeApis: new Set(),
            modulePaths: new Set(),
            domains: new Set(),
            urls: new Set(),
            images: new Set(),
            audios: new Set(),
            videos: new Set(),
            jsFiles: new Set(),
            cssFiles: new Set(),
            emails: new Set(),
            phoneNumbers: new Set(),
            ipAddresses: new Set(),
            sensitiveKeywords: new Set(),
            comments: new Set(),
            subdomains: new Set(),
            ports: new Set(),
            paths: new Set(),
            parameters: new Set(),
            forms: new Set(),
            inputFields: new Set(),
            hiddenFields: new Set(),
            // 新增的敏感信息类型
            credentials: new Set(),
            jwts: new Set(),
            bearerTokens: new Set(),
            basicAuth: new Set(),
            authHeaders: new Set(),
            wechatAppIds: new Set(),
            awsKeys: new Set(),
            googleApiKeys: new Set(),
            githubTokens: new Set(),
            gitlabTokens: new Set(),
            webhookUrls: new Set(),
            idCards: new Set(),
            cryptoUsage: new Set(),
            githubUrls: new Set(),
            vueFiles: new Set(),
            companies: new Set()
        };
    }
}

// 只在顶层页面初始化
if (window === window.top) {
    new SRCMinerContent();
}
