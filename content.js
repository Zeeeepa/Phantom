class SRCMinerContent {
    constructor() {
        if (window !== window.top) {
            //console.log('SRCMiner: 跳过iframe环境');
            return;
        }
        
        this.isScanning = false;
        this.scanResults = {};
        this.lastScanTime = 0;
        this.scanCooldown = 3000; 
        this.config = this.getConfig();
        // Unified化版本：不缓存Configuration，Every次ScanBeforeDirectfromchrome.storageRead
        
        //console.log('🔍 幻影Loaded -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        //console.log('🔧 Content ScriptInitialize消息Listen器...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            //console.log('📨 Content Script收到消息:', request.action);
            
            if (window !== window.top) {
                //console.log('⚠️ Content Script在iframe中，跳过Process');
                return false;
            }
            
            switch (request.action) {
                case 'extractInfo':
                    //console.log('🔍 Content ScriptStartProcessextractInfoRequest...');
                    this.performScan().then(results => {
                        //console.log('✅ Content ScriptScan completed，Send响应');
                        sendResponse(results);
                    }).catch(error => {
                        console.error('❌ Content ScriptScanFailed:', error);
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
                
                // Process深度Scan窗口的消息
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    this.handleDeepScanMessage(request);
                    sendResponse({ success: true });
                    return true;
                    
                case 'injectScript':
                    //console.log('🔧 Content Script收到Script注入Request');
                    this.injectUserScript(request.code).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        console.error('❌ Script注入Failed:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;
            }
        });
        
        // PageLoading completeAfterAutoScan
        this.autoScan();
        
        // ListenPage变化
        this.observePageChanges();
    }

    /**
     * Unified化版本：Configuration由PatternExtractorUnified管理，Every次ScanBeforeDirectRead
     */
    async loadCustomRegexConfig() {
        //console.log('📋 Content ScriptUnified化版本：Every次ScanBeforeDirectfrom存储ReadConfiguration');
    }
    
    getConfig() {
        return {
            // ScanConfiguration
            scanTimeout: 30000,
            maxResults: 1000,
            
            // FileTypeConfiguration
            jsExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue'],
            cssExtensions: ['css', 'scss', 'sass', 'less', 'styl'],
            imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'],
            audioExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
            videoExtensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
            
            // Filter规则
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
            //console.log('🔍 Start scanningPage:', window.location.href);
        }
        
        try {
            const results = await this.extractAllInfo();
            this.scanResults = results;
            
            if (!silent) {
                this.logResults(results);
            }
            
            // SendResult到After台
            chrome.runtime.sendMessage({
                action: 'storeResults',
                data: results,
                url: window.location.href
            }).catch(() => {});
            
            return results;
        } catch (error) {
            console.error('Scan过程出错:', error);
            return this.getEmptyResults();
        } finally {
            this.isScanning = false;
        }
    }
    
    async extractAllInfo() {
        //console.log('🔍 Content ScriptUnified化版本StartExtract information...');
        
        // Unified化版本：Only使用PatternExtractor + ContentExtractorSystem
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            //console.log('🔄 Content Script使用Unified化ExtractSystem');
            
            // Every次ScanBeforeDirectfromchrome.storageRead最新Configuration，不使用缓存
            //console.log('📥 Content ScriptDirectfrom存储Read最新Configuration...');
            let latestConfig = null;
            try {
                const result = await chrome.storage.local.get(['regexSettings']);
                if (result.regexSettings) {
                    latestConfig = result.regexSettings;
                    //console.log('✅ Content ScriptSuccessRead最新Configuration:', latestConfig);
                } else {
                    //console.log('📋 Content ScriptNot foundCustomConfiguration，将使用DefaultConfiguration');
                }
            } catch (error) {
                console.error('❌ Content ScriptReadConfigurationFailed:', error);
            }
            
            // Every次都Create新的PatternExtractor实例，避免缓存
            //console.log('🔧 Content ScriptCreate新的PatternExtractor实例...');
            const patternExtractor = new PatternExtractor();
            
            // 如果有最新Configuration，Direct应用到PatternExtractor
            if (latestConfig) {
                //console.log('🔧 Content ScriptDirect应用最新Configuration到PatternExtractor...');
                await patternExtractor.updatePatterns(latestConfig);
                //console.log('✅ Content ScriptConfiguration应用Complete');
            } else {
                // NoCustomConfiguration时，EnsureDefaultConfigurationLoaded
                await patternExtractor.ensureCustomPatternsLoaded();
            }
            
            // 临时Settings到window，供ContentExtractor使用
            window.patternExtractor = patternExtractor;
            
            //console.log('🔧 Content ScriptCurrentPatternExtractorConfigurationStatus:', {
            //    customRegexConfig: patternExtractor.customRegexConfig,
            //    hasAbsoluteApis: !!(latestConfig && latestConfig.absoluteApis),
            //    hasRelativeApis: !!(latestConfig && latestConfig.relativeApis),
            //    hasCustomEmails: !!(latestConfig && latestConfig.emails),
            //    hasCustomPhones: !!(latestConfig && latestConfig.phoneNumbers),
            //    hasCustomDomains: !!(latestConfig && latestConfig.domains)
            //});
            
            const contentExtractor = new ContentExtractor();
            const results = await contentExtractor.extractSensitiveInfo(window.location.href);
            
            //console.log('✅ Content ScriptUnified化SystemExtraction completed，ResultStatistics:', {
            //    absoluteApis: results.absoluteApis?.length || 0,
            //    relativeApis: results.relativeApis?.length || 0,
            //    domains: results.domains?.length || 0,
            //    emails: results.emails?.length || 0,
            //    phoneNumbers: results.phoneNumbers?.length || 0
            //});
            
            return results;
        } else {
            console.error('❌ Content ScriptUnified化版本：PatternExtractorOrContentExtractor不Available');
            return this.getEmptyResults();
        }
    }
    
    logResults(results) {
        // Ensure所有Result都是数GroupFormat
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
        
        //console.log(`🔍 幻影: Scan completed，Found ${totalItems} 个Project`);
        
        if (totalItems > 0) {
            //console.log('📊 Scan results摘要:');
            Object.keys(summary).forEach(key => {
                if (summary[key] > 0) {
                    //console.log(`  ${key}: ${summary[key]} 个`);
                }
            });
            
            // 高亮Display重要Found
            if (summary.sensitiveKeywords > 0) {
                const keywords = Array.isArray(results.sensitiveKeywords) ? 
                    results.sensitiveKeywords : Array.from(results.sensitiveKeywords);
                //console.warn(`⚠️ Found敏感关Key词:`, keywords.slice(0, 10));
            }
            if (summary.emails > 0) {
                const emails = Array.isArray(results.emails) ? 
                    results.emails : Array.from(results.emails);
                //console.info(`📧 Found邮箱地址:`, emails.slice(0, 5));
            }
            if (summary.absoluteApis > 0) {
                const apis = Array.isArray(results.absoluteApis) ? 
                    results.absoluteApis : Array.from(results.absoluteApis);
                //console.info(`🔗 FoundAPI interface:`, apis.slice(0, 10));
            }
        } else {
            //console.log('📊 NotFound任何Project');
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
            // 新增的敏感InformationType
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
        // Process深度ScanRelated消息
        //console.log('Process深度Scan消息:', request.action);
    }
    
    /**
     * 注入UserScript - Class似油猴Script的Load方式
     * 使用Blob URL + 动态Script标签，绕过CSP限制
     */
    async injectUserScript(code) {
        try {
            //console.log('🔧 Start注入UserScript...');
            
            // Getinjector.js的URL
            const injectorUrl = chrome.runtime.getURL('src/core/injector.js');
            
            // Create一个Script标签Loadinjector.js
            const injectorScript = document.createElement('script');
            injectorScript.src = injectorUrl;
            
            // 等Pendinginjector.jsLoading complete
            await new Promise((resolve, reject) => {
                injectorScript.onload = resolve;
                injectorScript.onerror = reject;
                document.head.appendChild(injectorScript);
            });
            
            // 使用injectorExecuteUser代码
            if (window.PhantomInjector) {
                const result = await window.PhantomInjector.executeScript(code);
                //console.log('✅ Script注入Success');
                return { success: true, result: result };
            } else {
                throw new Error('PhantomInjectorNotLoad');
            }
            
        } catch (error) {
            console.error('❌ Script注入Failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Only在顶层PageInitialize
if (window === window.top) {
    new SRCMinerContent();
}