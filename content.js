class SRCMinerContent {
    constructor() {
        if (window !== window.top) {
            //console.log('SRCMiner: skip iframe环境');
            return;
        }
        
        this.isScanning = false;
        this.scanResults = {};
        this.lastScanTime = 0;
        this.scanCooldown = 3000; 
        this.config = this.getConfig();
        // unified version：configuration cache 不，scan directly read time(s) from before 每chrome.storage
        
        //console.log('🔍 load 幻影已 -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        //console.log('🔧 Content initialize listen Script消息器...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            //console.log('📨 Content to Script收消息:', request.action);
            
            if (window !== window.top) {
                //console.log('⚠️ Content in Script在iframe，skip process');
                return false;
            }
            
            switch (request.action) {
                case 'extractInfo':
                    //console.log('🔍 Content start process request ScriptextractInfo...');
                    this.performScan().then(results => {
                        //console.log('✅ Content scan complete Script，response send');
                        sendResponse(results);
                    }).catch(error => {
                        console.error('❌ Content scan failed Script:', error);
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
                
                // deep scan process window of 消息
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    this.handleDeepScanMessage(request);
                    sendResponse({ success: true });
                    return true;
                    
                case 'injectScript':
                    //console.log('🔧 Content request inject script to Script收');
                    this.injectUserScript(request.code).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        console.error('❌ failed inject script:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;
            }
        });
        
        // complete scan load auto page after
        this.autoScan();
        
        // listen page 变化
        this.observePageChanges();
    }

    /**
     * unified version：configuration 由PatternExtractor统一管理，scan directly read time(s) before 每
     */
    async loadCustomRegexConfig() {
        //console.log('📋 Content unified version Script：scan configuration directly read time(s) from before 每存储');
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
            
            // filter rule
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
            
            // results background send to
            chrome.runtime.sendMessage({
                action: 'storeResults',
                data: results,
                url: window.location.href
            }).catch(() => {});
            
            return results;
        } catch (error) {
            console.error('scan error occurred 过程:', error);
            return this.getEmptyResults();
        } finally {
            this.isScanning = false;
        }
    }
    
    async extractAllInfo() {
        //console.log('🔍 Content unified start information extracted version Script...');
        
        // unified version：use 只PatternExtractor + ContentExtractor系统
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            //console.log('🔄 Content unified extracted use Script系统');
            
            // scan configuration latest directly read time(s) from before 每chrome.storage，cache use 不
            //console.log('📥 Content configuration latest directly read from Script存储...');
            let latestConfig = null;
            try {
                const result = await chrome.storage.local.get(['regexSettings']);
                if (result.regexSettings) {
                    latestConfig = result.regexSettings;
                    //console.log('✅ Content success configuration latest read Script:', latestConfig);
                } else {
                    //console.log('📋 Content custom not found configuration Script，configuration default use 将');
                }
            } catch (error) {
                console.error('❌ Content failed configuration read Script:', error);
            }
            
            // instance new time(s) 每都创建PatternExtractor，cache 避免
            //console.log('🔧 Content instance new Script创建PatternExtractor...');
            const patternExtractor = new PatternExtractor();
            
            // configuration latest if has，directly to 应用PatternExtractor
            if (latestConfig) {
                //console.log('🔧 Content configuration latest directly to Script应用PatternExtractor...');
                await patternExtractor.updatePatterns(latestConfig);
                //console.log('✅ Content complete configuration Script应用');
            } else {
                // custom configuration when has 没，configuration default load 确保已
                await patternExtractor.ensureCustomPatternsLoaded();
            }
            
            // settings to when 临window，use 供ContentExtractor
            window.patternExtractor = patternExtractor;
            
            //console.log('🔧 Content configuration current status ScriptPatternExtractor:', {
            //    customRegexConfig: patternExtractor.customRegexConfig,
            //    hasAbsoluteApis: !!(latestConfig && latestConfig.absoluteApis),
            //    hasRelativeApis: !!(latestConfig && latestConfig.relativeApis),
            //    hasCustomEmails: !!(latestConfig && latestConfig.emails),
            //    hasCustomPhones: !!(latestConfig && latestConfig.phoneNumbers),
            //    hasCustomDomains: !!(latestConfig && latestConfig.domains)
            //});
            
            const contentExtractor = new ContentExtractor();
            const results = await contentExtractor.extractSensitiveInfo(window.location.href);
            
            //console.log('✅ Content unified complete extracted Script系统，statistics results:', {
            //    absoluteApis: results.absoluteApis?.length || 0,
            //    relativeApis: results.relativeApis?.length || 0,
            //    domains: results.domains?.length || 0,
            //    emails: results.emails?.length || 0,
            //    phoneNumbers: results.phoneNumbers?.length || 0
            //});
            
            return results;
        } else {
            console.error('❌ Content unified version Script：unavailable PatternExtractor或ContentExtractor');
            return this.getEmptyResults();
        }
    }
    
    logResults(results) {
        // results format all array yes 确保都
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
        
        //console.log(`🔍 幻影: scan complete，found ${totalItems} project item(s)`);
        
        if (totalItems > 0) {
            //console.log('📊 scan results 摘要:');
            Object.keys(summary).forEach(key => {
                if (summary[key] > 0) {
                    //console.log(`  ${key}: ${summary[key]}  item(s)`);
                }
            });
            
            // found display 高亮重要
            if (summary.sensitiveKeywords > 0) {
                const keywords = Array.isArray(results.sensitiveKeywords) ? 
                    results.sensitiveKeywords : Array.from(results.sensitiveKeywords);
                //console.warn(`⚠️ keyword found 敏感:`, keywords.slice(0, 10));
            }
            if (summary.emails > 0) {
                const emails = Array.isArray(results.emails) ? 
                    results.emails : Array.from(results.emails);
                //console.info(`📧 found address 邮箱:`, emails.slice(0, 5));
            }
            if (summary.absoluteApis > 0) {
                const apis = Array.isArray(results.absoluteApis) ? 
                    results.absoluteApis : Array.from(results.absoluteApis);
                //console.info(`🔗 API interface found:`, apis.slice(0, 10));
            }
        } else {
            //console.log('📊 not found any project');
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
            // sensitive information type of 新增
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
        // deep scan process related 消息
        //console.log('deep scan process 消息:', request.action);
    }
    
    /**
     * inject script user - script load class of 似油猴方式
     * use Blob URL + tag script dynamic，limit 绕过CSP
     */
    async injectUserScript(code) {
        try {
            //console.log('🔧 start inject script user ...');
            
            // URL get of injector.js
            const injectorUrl = chrome.runtime.getURL('src/core/injector.js');
            
            // tag script load item(s) 创建一injector.js
            const injectorScript = document.createElement('script');
            injectorScript.src = injectorUrl;
            
            // complete waiting load injector.js
            await new Promise((resolve, reject) => {
                injectorScript.onload = resolve;
                injectorScript.onerror = reject;
                document.head.appendChild(injectorScript);
            });
            
            // code execute user use injector
            if (window.PhantomInjector) {
                const result = await window.PhantomInjector.executeScript(code);
                //console.log('✅ success inject script');
                return { success: true, result: result };
            } else {
                throw new Error('load PhantomInjector未');
            }
            
        } catch (error) {
            console.error('❌ failed inject script:', error);
            return { success: false, error: error.message };
        }
    }
}

// initialize page layer(s) 只在顶
if (window === window.top) {
    new SRCMinerContent();
}