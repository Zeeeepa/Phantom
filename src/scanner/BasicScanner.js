/**
 * basic scan 器 - 负责 page content   basic scan
 */
class BasicScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async startScan(silent = false) {
        const loading = document.getElementById('loading');
        const scanBtn = document.getElementById('scanBtn');
        const scanBtnText = scanBtn.querySelector('.text');
        
        if (!silent) {
            loading.style.display = 'block';
            scanBtn.disabled = true;
            if (scanBtnText) {
                scanBtnText.textContent = 'scan in...';
            }
            scanBtn.classList.add('scanning');
        }
        
        try {
            // 获取 current 活动 tab 页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // check URL是否 valid
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('无法 scan system page');
            }
            
            // update current scan domain display
            this.srcMiner.updateCurrentDomain(tab.url);
            
            // method 1: 尝试directlyfromcontent script获取 result
            let results = null;
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo', targetUrl: tab.url });
                if (response) {
                    results = response;
                }
            } catch (contentError) {
                //console.log('Content scriptnot response，尝试 inject script');
            }
            
            // method 2: 如果content script没有 response，inject 必要  script file
            if (!results) {
                try {
                    // 先 inject dependency   script file
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: false },
                        files: [
                            'src/scanner/PatternExtractor.js',
                            'src/scanner/ContentExtractor.js'
                        ]
                    });
                    
                    // 然后 execute extract function
                    const injectionResults = await chrome.scripting.executeScript({
                        target: { 
                            tabId: tab.id,
                            allFrames: false
                        },
                        function: this.extractSensitiveInfo,
                        args: [tab.url]
                    });
                    
                    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                        results = injectionResults[0].result;
                    }
                } catch (injectionError) {
                    console.error('script inject failed:', injectionError);
                    throw new Error('无法访问 page content，请 refresh page 后 retry');
                }
            }
            
            if (results) {
                this.srcMiner.results = results;
                this.srcMiner.saveResults();
                this.srcMiner.displayResults();
                if (!silent) {
                    this.showScanComplete();
                }
            } else {
                throw new Error('未能获取 scan result');
            }
            
        } catch (error) {
            console.error('scan failed:', error);
            if (!silent) {
                this.showError(error.message || 'scan failed，请 refresh page 后 retry');
            }
        } finally {
            if (!silent) {
                loading.style.display = 'none';
                scanBtn.disabled = false;
                if (scanBtnText) {
                    scanBtnText.textContent = '重新 scan';
                }
                scanBtn.classList.remove('scanning');
            }
        }
    }
    
    showScanComplete() {
        const scanBtn = document.getElementById('scanBtn');
        const originalText = scanBtn.textContent;
        scanBtn.textContent = '✅ scan complete';
        scanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        setTimeout(() => {
            scanBtn.textContent = originalText;
            scanBtn.style.background = '';
        }, 2000);
    }
    
    showError(message) {
        const scanBtn = document.getElementById('scanBtn');
        scanBtn.textContent = '❌ scan failed';
        scanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        // display error 详情
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>scan failed</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    请尝试以下解决方案：<br>
                    1. 刷新page后重试<br>
                    2. 确保page完全load<br>
                    3. check 是否tosystem统page
                </p>
            </div>
        `;
        
        setTimeout(() => {
            scanBtn.textContent = '重新 scan';
            scanBtn.style.background = '';
        }, 3000);
    }
    
    // inject 到 page in execute   extract function
    async extractSensitiveInfo(targetUrl) {
        try {
            //console.log('🚀🚀🚀 BasicScanner.extractSensitiveInfo method passive marker调用！时间戳:', Date.now());
            //console.log('🚀🚀🚀 BasicScanner 目标URL:', targetUrl);
            //console.log('🚀🚀🚀 BasicScanner current URL:', window.location.href);
            
            // 确保in顶层 window execute
            if (window !== window.top) {
                //console.log('skipiframe scan，只 scan 顶层 page');
                return this.getEmptyResults();
            }
            
            // validate current page URL是否 match 目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('page URLdo not match，skip scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 BasicScanner start scan page:', window.location.href);
            
            // check 是否有新  module 化 system 可用
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                //console.log('🔄 BasicScanneruseunified化 regex extract system');
                try {
                    // 确保PatternExtractoralready经 initialize 并 load 了最新 configuration
                    //console.log('🔧 BasicScanner check PatternExtractor status ...');
                    
                    if (!window.patternExtractor) {
                        //console.log('🔧 BasicScanner initialize 新 PatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                    // every time scan 都 force 重新 load 最新 configuration，确保use最新 settings
                    //console.log('🔄 BasicScanner force 重新 load 最新 configuration ...');
                    await window.patternExtractor.loadCustomPatterns();
                    
                    //console.log('✅ BasicScanner configuration check complete');
                    //console.log('📊 BasicScanner最终可用  regex mode:', Object.keys(window.patternExtractor.patterns));
                    
                    // validate custom regex 是否存in
                    const customKeys = Object.keys(window.patternExtractor.patterns).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ BasicScanner发现 ${customKeys.length} 个 custom regex:`, customKeys);
                    } else {
                        console.warn('⚠️ BasicScanner未发现任何 custom regex');
                    }
                    
                    // 创建ContentExtractor并 execute extract
                    const contentExtractor = new ContentExtractor();
                    const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                    //console.log('✅ BasicScannerunified化 system extract complete，result:', results);
                    //console.log('🌐 [DEBUG] BasicScanner scan complete - URL:', window.location.href);
                    return results;
                } catch (error) {
                    console.error('❌ BasicScannerunified化 system extract failed:', error);
                    // unified化 version：do notuse降级方案，directly返回 empty result
                    //console.log('⚠️ BasicScannerunified化 version：do notuse降级方案，返回 empty result');
                    return this.getEmptyResults();
                }
            }
            
            // unified化 version：如果没有 module 化 system，directly返回 empty result
            //console.log('⚠️ BasicScannerunified化 version：未找到unified化 extract system，返回 empty result');
            return this.getEmptyResults();
            
        } catch (error) {
            console.error('❌ BasicScanner scan through程in出错:', error);
            return this.getEmptyResults();
        }
    }
    

    getEmptyResults() {
        const baseResults = {
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
            credentials: [],
            cookies: [],
            idKeys: [],
            idcards: [],
            companies: [],
            jwts: [],
            githubUrls: [],
            vueFiles: [],
            // 新增 敏感 information type
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
            cryptoUsage: []
        };
        
        // note：这里do not能 async 获取 custom regex configuration，因to这是 sync function
        // custom regex   empty result 会inPatternExtractorin process
        //console.log('📦 BasicScanner返回basic empty result 结构');
        
        return baseResults;
    }
}