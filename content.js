class SRCMinerContent {
    constructor() {
        if (window !== window.top) {
            //console.log('SRCMiner: skipiframe environment');
            return;
        }
        
        this.isScanning = false;
        this.scanResults = {};
        this.lastScanTime = 0;
        this.scanCooldown = 3000; 
        this.config = this.getConfig();
        // unified化 version：do not cache configuration，every time scan beforedirectlyfromchrome.storageread
        
        //console.log('🔍 phantomalready load -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        //console.log('🔧 Content Script initialize message listener ...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            //console.log('📨 Content Scriptreceived message:', request.action);
            
            if (window !== window.top) {
                //console.log('⚠️ Content Scriptiniframein，skip process');
                return false;
            }
            
            switch (request.action) {
                case 'extractInfo':
                    //console.log('🔍 Content Script start process extractInfo request ...');
                    this.performScan().then(results => {
                        //console.log('✅ Content Script scan complete，发送 response');
                        sendResponse(results);
                    }).catch(error => {
                        console.error('❌ Content Script scan failed:', error);
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
                
                // process deep scan window   message
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    this.handleDeepScanMessage(request);
                    sendResponse({ success: true });
                    return true;
                    
                case 'injectScript':
                    //console.log('🔧 Content Scriptreceived script inject request');
                    this.injectUserScript(request.code).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        console.error('❌ script inject failed:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;
            }
        });
        
        // page load complete 后 automatic scan
        this.autoScan();
        
        // listen page 变化
        this.observePageChanges();
    }

    /**
     * unified化 version：configuration 由PatternExtractorunified manage，every time scan beforedirectlyread
     */
    async loadCustomRegexConfig() {
        //console.log('📋 Content Scriptunified化 version：every time scan beforedirectlyfrom storage read configuration');
    }
    
    getConfig() {
        return {
            // scan configuration
            scanTimeout: 30000,
            maxResults: 1000,
            
            // file type configuration
            jsExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue'],
            cssExtensions: ['css', 'scss', 'sass', 'less', 'styl'],
            imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'],
            audioExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
            videoExtensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
            
            // filter 规则
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
            //console.log('🔍 start scan page:', window.location.href);
        }
        
        try {
            const results = await this.extractAllInfo();
            this.scanResults = results;
            
            if (!silent) {
                this.logResults(results);
            }
            
            // 发送 result 到background
            chrome.runtime.sendMessage({
                action: 'storeResults',
                data: results,
                url: window.location.href
            }).catch(() => {});
            
            return results;
        } catch (error) {
            console.error('scan through程出错:', error);
            return this.getEmptyResults();
        } finally {
            this.isScanning = false;
        }
    }
    
    async extractAllInfo() {
        //console.log('🔍 Content Scriptunified化 version start extract information ...');
        
        // unified化 version：只usePatternExtractor + ContentExtractor system
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            //console.log('🔄 Content Scriptuseunified化 extract system');
            
            // every time scan beforedirectlyfromchrome.storageread最新 configuration，do notuse cache
            //console.log('📥 Content Scriptdirectlyfrom storage read最新 configuration ...');
            let latestConfig = null;
            try {
                const result = await chrome.storage.local.get(['regexSettings']);
                if (result.regexSettings) {
                    latestConfig = result.regexSettings;
                    //console.log('✅ Content Script success read最新 configuration:', latestConfig);
                } else {
                    //console.log('📋 Content Script未找到 custom configuration，将use default configuration');
                }
            } catch (error) {
                console.error('❌ Content Scriptread configuration failed:', error);
            }
            
            // every time都创建新 PatternExtractor实例，避免 cache
            //console.log('🔧 Content Script创建新 PatternExtractor实例...');
            const patternExtractor = new PatternExtractor();
            
            // 如果有最新 configuration，directly应用到PatternExtractor
            if (latestConfig) {
                //console.log('🔧 Content Scriptdirectly应用最新 configuration 到PatternExtractor...');
                await patternExtractor.updatePatterns(latestConfig);
                //console.log('✅ Content Script configuration 应用 complete');
            } else {
                // 没有 custom configuration 时，确保 default configuration already load
                await patternExtractor.ensureCustomPatternsLoaded();
            }
            
            // 临时 settings 到window，供ContentExtractoruse
            window.patternExtractor = patternExtractor;
            
            //console.log('🔧 Content Script current PatternExtractor configuration status:', {
            //    customRegexConfig: patternExtractor.customRegexConfig,
            //    hasAbsoluteApis: !!(latestConfig && latestConfig.absoluteApis),
            //    hasRelativeApis: !!(latestConfig && latestConfig.relativeApis),
            //    hasCustomEmails: !!(latestConfig && latestConfig.emails),
            //    hasCustomPhones: !!(latestConfig && latestConfig.phoneNumbers),
            //    hasCustomDomains: !!(latestConfig && latestConfig.domains)
            //});
            
            const contentExtractor = new ContentExtractor();
            const results = await contentExtractor.extractSensitiveInfo(window.location.href);
            
            //console.log('✅ Content Scriptunified化 system extract complete，result statistics:', {
            //    absoluteApis: results.absoluteApis?.length || 0,
            //    relativeApis: results.relativeApis?.length || 0,
            //    domains: results.domains?.length || 0,
            //    emails: results.emails?.length || 0,
            //    phoneNumbers: results.phoneNumbers?.length || 0
            //});
            
            return results;
        } else {
            console.error('❌ Content Scriptunified化 version：PatternExtractororContentExtractordo not可用');
            return this.getEmptyResults();
        }
    }
    
    logResults(results) {
        // 确保all result 都是 array format
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
        
        //console.log(`🔍 phantom: scan complete，发现 ${totalItems} 个项目`);
        
        if (totalItems > 0) {
            //console.log('📊 scan result 摘要:');
            Object.keys(summary).forEach(key => {
                if (summary[key] > 0) {
                    //console.log(`  ${key}: ${summary[key]} 个`);
                }
            });
            
            // 高亮 display 重要发现
            if (summary.sensitiveKeywords > 0) {
                const keywords = Array.isArray(results.sensitiveKeywords) ? 
                    results.sensitiveKeywords : Array.from(results.sensitiveKeywords);
                //console.warn(`⚠️ 发现敏感关 key 词:`, keywords.slice(0, 10));
            }
            if (summary.emails > 0) {
                const emails = Array.isArray(results.emails) ? 
                    results.emails : Array.from(results.emails);
                //console.info(`📧 发现 email address:`, emails.slice(0, 5));
            }
            if (summary.absoluteApis > 0) {
                const apis = Array.isArray(results.absoluteApis) ? 
                    results.absoluteApis : Array.from(results.absoluteApis);
                //console.info(`🔗 发现API interface:`, apis.slice(0, 10));
            }
        } else {
            //console.log('📊 未发现任何项目');
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
            // 新增 敏感 information type
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
        // process deep scan 相关 message
        //console.log('process deep scan message:', request.action);
    }
    
    /**
     * inject user script - 类似油猴 script   load 方式
     * useBlob URL + dynamic script tab，绕throughCSP limit
     */
    async injectUserScript(code) {
        try {
            //console.log('🔧 start inject user script ...');
            
            // 获取injector.js URL
            const injectorUrl = chrome.runtime.getURL('src/core/injector.js');
            
            // 创建一个 script tab load injector.js
            const injectorScript = document.createElement('script');
            injectorScript.src = injectorUrl;
            
            // wait injector.js load complete
            await new Promise((resolve, reject) => {
                injectorScript.onload = resolve;
                injectorScript.onerror = reject;
                document.head.appendChild(injectorScript);
            });
            
            // useinjector execute user code
            if (window.PhantomInjector) {
                const result = await window.PhantomInjector.executeScript(code);
                //console.log('✅ script inject success');
                return { success: true, result: result };
            } else {
                throw new Error('PhantomInjectornot load');
            }
            
        } catch (error) {
            console.error('❌ script inject failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// 只in顶层 page initialize
if (window === window.top) {
    new SRCMinerContent();
}