class SRCMinerContent {
    constructor() {
        if (window !== window.top) {
            //console.log('SRCMiner: skipiframeenvironment');
            return;
        }
        
        this.isScanning = false;
        this.scanResults = {};
        this.lastScanTime = 0;
        this.scanCooldown = 3000; 
        this.config = this.getConfig();
        // unified化version：not缓存configuration，every timescanbeforedirectlyfromchrome.storageread
        
        //console.log('🔍 phantomalreadyload -', window.location.href);
        this.init();
        this.loadCustomRegexConfig();
    }
    
    init() {
        //console.log('🔧 Content Scriptinitializemessagelistener...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            //console.log('📨 Content Scriptreceivedmessage:', request.action);
            
            if (window !== window.top) {
                //console.log('⚠️ Content Scriptiniframein，skip处理');
                return false;
            }
            
            switch (request.action) {
                case 'extractInfo':
                    //console.log('🔍 Content Scriptstart处理extractInforequest...');
                    this.performScan().then(results => {
                        //console.log('✅ Content Scriptscan complete，send响应');
                        sendResponse(results);
                    }).catch(error => {
                        console.error('❌ Content Scriptscanfailed:', error);
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
                
                // 处理deep scan窗口message
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    this.handleDeepScanMessage(request);
                    sendResponse({ success: true });
                    return true;
                    
                case 'injectScript':
                    //console.log('🔧 Content Scriptreceived脚本injectionrequest');
                    this.injectUserScript(request.code).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        console.error('❌ 脚本injectionfailed:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;
            }
        });
        
        // page面loadcomplete后automaticscan
        this.autoScan();
        
        // listenpage面change
        this.observePageChanges();
    }

    /**
     * unified化version：configuration由PatternExtractorunified管理，every timescanbeforedirectlyread
     */
    async loadCustomRegexConfig() {
        //console.log('📋 Content Scriptunified化version：every timescanbeforedirectlyfromstoragereadconfiguration');
    }
    
    getConfig() {
        return {
            // scanconfiguration
            scanTimeout: 30000,
            maxResults: 1000,
            
            // 文件class型configuration
            jsExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue'],
            cssExtensions: ['css', 'scss', 'sass', 'less', 'styl'],
            imageExtensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'],
            audioExtensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
            videoExtensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
            
            // through滤规则
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
            //console.log('🔍 startscanpage面:', window.location.href);
        }
        
        try {
            const results = await this.extractAllInfo();
            this.scanResults = results;
            
            if (!silent) {
                this.logResults(results);
            }
            
            // sendresulttobackground
            chrome.runtime.sendMessage({
                action: 'storeResults',
                data: results,
                url: window.location.href
            }).catch(() => {});
            
            return results;
        } catch (error) {
            console.error('scanthrough程出错:', error);
            return this.getEmptyResults();
        } finally {
            this.isScanning = false;
        }
    }
    
    async extractAllInfo() {
        //console.log('🔍 Content Scriptunified化versionstartextractinformation...');
        
        // unified化version：只usePatternExtractor + ContentExtractor系统
        if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
            //console.log('🔄 Content Scriptuseunified化extract系统');
            
            // every timescanbeforedirectlyfromchrome.storageread最newconfiguration，notuse缓存
            //console.log('📥 Content Scriptdirectlyfromstorageread最newconfiguration...');
            let latestConfig = null;
            try {
                const result = await chrome.storage.local.get(['regexSettings']);
                if (result.regexSettings) {
                    latestConfig = result.regexSettings;
                    //console.log('✅ Content Scriptsuccessread最newconfiguration:', latestConfig);
                } else {
                    //console.log('📋 Content Script未foundcustomconfiguration，将use默认configuration');
                }
            } catch (error) {
                console.error('❌ Content Scriptreadconfigurationfailed:', error);
            }
            
            // every time都createnewPatternExtractor实例，避免缓存
            //console.log('🔧 Content ScriptcreatenewPatternExtractor实例...');
            const patternExtractor = new PatternExtractor();
            
            // if有最newconfiguration，directly应fortoPatternExtractor
            if (latestConfig) {
                //console.log('🔧 Content Scriptdirectly应for最newconfigurationtoPatternExtractor...');
                await patternExtractor.updatePatterns(latestConfig);
                //console.log('✅ Content Scriptconfiguration应forcomplete');
            } else {
                // withoutcustomconfiguration时，确保默认configurationalreadyload
                await patternExtractor.ensureCustomPatternsLoaded();
            }
            
            // temporarysettingstowindow，供ContentExtractoruse
            window.patternExtractor = patternExtractor;
            
            //console.log('🔧 Content Script当beforePatternExtractorconfigurationstate:', {
            //    customRegexConfig: patternExtractor.customRegexConfig,
            //    hasAbsoluteApis: !!(latestConfig && latestConfig.absoluteApis),
            //    hasRelativeApis: !!(latestConfig && latestConfig.relativeApis),
            //    hasCustomEmails: !!(latestConfig && latestConfig.emails),
            //    hasCustomPhones: !!(latestConfig && latestConfig.phoneNumbers),
            //    hasCustomDomains: !!(latestConfig && latestConfig.domains)
            //});
            
            const contentExtractor = new ContentExtractor();
            const results = await contentExtractor.extractSensitiveInfo(window.location.href);
            
            //console.log('✅ Content Scriptunified化系统extractcomplete，result统计:', {
            //    absoluteApis: results.absoluteApis?.length || 0,
            //    relativeApis: results.relativeApis?.length || 0,
            //    domains: results.domains?.length || 0,
            //    emails: results.emails?.length || 0,
            //    phoneNumbers: results.phoneNumbers?.length || 0
            //});
            
            return results;
        } else {
            console.error('❌ Content Scriptunified化version：PatternExtractororContentExtractornot可for');
            return this.getEmptyResults();
        }
    }
    
    logResults(results) {
        // 确保allresult都是数组format
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
            //console.log('📊 scanresult摘要:');
            Object.keys(summary).forEach(key => {
                if (summary[key] > 0) {
                    //console.log(`  ${key}: ${summary[key]} 个`);
                }
            });
            
            // 高亮显示重要发现
            if (summary.sensitiveKeywords > 0) {
                const keywords = Array.isArray(results.sensitiveKeywords) ? 
                    results.sensitiveKeywords : Array.from(results.sensitiveKeywords);
                //console.warn(`⚠️ 发现敏感关键词:`, keywords.slice(0, 10));
            }
            if (summary.emails > 0) {
                const emails = Array.isArray(results.emails) ? 
                    results.emails : Array.from(results.emails);
                //console.info(`📧 发现email地址:`, emails.slice(0, 5));
            }
            if (summary.absoluteApis > 0) {
                const apis = Array.isArray(results.absoluteApis) ? 
                    results.absoluteApis : Array.from(results.absoluteApis);
                //console.info(`🔗 发现API接口:`, apis.slice(0, 10));
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
            // new增敏感informationclass型
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
        // 处理deep scan相关message
        //console.log('处理deep scanmessage:', request.action);
    }
    
    /**
     * injectionuser脚本 - class似油猴脚本load方式
     * useBlob URL + 动态脚本标签，绕throughCSP限制
     */
    async injectUserScript(code) {
        try {
            //console.log('🔧 startinjectionuser脚本...');
            
            // getinjector.jsURL
            const injectorUrl = chrome.runtime.getURL('src/core/injector.js');
            
            // create一个脚本标签loadinjector.js
            const injectorScript = document.createElement('script');
            injectorScript.src = injectorUrl;
            
            // waitinjector.jsloadcomplete
            await new Promise((resolve, reject) => {
                injectorScript.onload = resolve;
                injectorScript.onerror = reject;
                document.head.appendChild(injectorScript);
            });
            
            // useinjectorexecuteusercode
            if (window.PhantomInjector) {
                const result = await window.PhantomInjector.executeScript(code);
                //console.log('✅ 脚本injectionsuccess');
                return { success: true, result: result };
            } else {
                throw new Error('PhantomInjector未load');
            }
            
        } catch (error) {
            console.error('❌ 脚本injectionfailed:', error);
            return { success: false, error: error.message };
        }
    }
}

// 只in顶层page面initialize
if (window === window.top) {
    new SRCMinerContent();
}