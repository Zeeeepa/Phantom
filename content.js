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
        // 统一化版本：不缓存配置，每次扫描前直接从chrome.storage读取
        
        console.log('🔍 幻影已加载 -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        console.log('🔧 Content Script初始化消息监听器...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Content Script收到消息:', request.action);
            
            if (window !== window.top) {
                console.log('⚠️ Content Script在iframe中，跳过处理');
                return false;
            }
            
            switch (request.action) {
                case 'extractInfo':
                    console.log('🔍 Content Script开始处理extractInfo请求...');
                    this.performScan().then(results => {
                        console.log('✅ Content Script扫描完成，发送响应');
                        sendResponse(results);
                    }).catch(error => {
                        console.error('❌ Content Script扫描失败:', error);
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
     * 统一化版本：配置由PatternExtractor统一管理，每次扫描前直接读取
     */
    async loadCustomRegexConfig() {
        console.log('📋 Content Script统一化版本：每次扫描前直接从存储读取配置');
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
        console.log('🔍 Content Script统一化版本开始提取信息...');
        
        // 统一化版本：只使用PatternExtractor + ContentExtractor系统
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            console.log('🔄 Content Script使用统一化提取系统');
            
            // 每次扫描前直接从chrome.storage读取最新配置，不使用缓存
            console.log('📥 Content Script直接从存储读取最新配置...');
            let latestConfig = null;
            try {
                const result = await chrome.storage.local.get(['regexSettings']);
                if (result.regexSettings) {
                    latestConfig = result.regexSettings;
                    console.log('✅ Content Script成功读取最新配置:', latestConfig);
                } else {
                    console.log('📋 Content Script未找到自定义配置，将使用默认配置');
                }
            } catch (error) {
                console.error('❌ Content Script读取配置失败:', error);
            }
            
            // 每次都创建新的PatternExtractor实例，避免缓存
            console.log('🔧 Content Script创建新的PatternExtractor实例...');
            const patternExtractor = new PatternExtractor();
            
            // 如果有最新配置，直接应用到PatternExtractor
            if (latestConfig) {
                console.log('🔧 Content Script直接应用最新配置到PatternExtractor...');
                await patternExtractor.updatePatterns(latestConfig);
                console.log('✅ Content Script配置应用完成');
            } else {
                // 没有自定义配置时，确保默认配置已加载
                await patternExtractor.ensureCustomPatternsLoaded();
            }
            
            // 临时设置到window，供ContentExtractor使用
            window.patternExtractor = patternExtractor;
            
            console.log('🔧 Content Script当前PatternExtractor配置状态:', {
                customRegexConfig: patternExtractor.customRegexConfig,
                hasAbsoluteApis: !!(latestConfig && latestConfig.absoluteApis),
                hasRelativeApis: !!(latestConfig && latestConfig.relativeApis),
                hasCustomEmails: !!(latestConfig && latestConfig.emails),
                hasCustomPhones: !!(latestConfig && latestConfig.phoneNumbers),
                hasCustomDomains: !!(latestConfig && latestConfig.domains)
            });
            
            const contentExtractor = new ContentExtractor();
            const results = await contentExtractor.extractSensitiveInfo(window.location.href);
            
            console.log('✅ Content Script统一化系统提取完成，结果统计:', {
                absoluteApis: results.absoluteApis?.length || 0,
                relativeApis: results.relativeApis?.length || 0,
                domains: results.domains?.length || 0,
                emails: results.emails?.length || 0,
                phoneNumbers: results.phoneNumbers?.length || 0
            });
            
            return results;
        } else {
            console.error('❌ Content Script统一化版本：PatternExtractor或ContentExtractor不可用');
            return this.getEmptyResults();
        }
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
            absoluteApis: [],
            relativeApis: [],
            modulePaths: [],
            domains: [],
            urls: [],
            images: [],
            audios: [],
            videos: [],
            jsFiles: [],
            cssFiles: [],
            emails: [],
            phoneNumbers: [],
            ipAddresses: [],
            sensitiveKeywords: [],
            comments: [],
            subdomains: [],
            ports: [],
            paths: [],
            parameters: [],
            forms: [],
            inputFields: [],
            hiddenFields: [],
            // 新增的敏感信息类型
            credentials: [],
            jwts: [],
            bearerTokens: [],
            basicAuth: [],
            authHeaders: [],
            wechatAppIds: [],
            awsKeys: [],
            googleApiKeys: [],
            githubTokens: [],
            gitlabTokens: [],
            webhookUrls: [],
            idCards: [],
            cryptoUsage: [],
            githubUrls: [],
            vueFiles: [],
            companies: []
        };
    }
    
    handleDeepScanMessage(request) {
        // 处理深度扫描相关消息
        console.log('处理深度扫描消息:', request.action);
    }
}

// 只在顶层页面初始化
if (window === window.top) {
    new SRCMinerContent();
}