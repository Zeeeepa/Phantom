/**
 * basic scan 器 - basic scan content page of 负责
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
                scanBtnText.textContent = 'scanning ...';
            }
            scanBtn.classList.add('scanning');
        }
        
        try {
            // tab get active current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // URL check no yes has 效
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('scan page 无法系统');
            }
            
            // update scan domain current display
            this.srcMiner.updateCurrentDomain(tab.url);
            
            // method 1: directly from 尝试content get results script
            let results = null;
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo', targetUrl: tab.url });
                if (response) {
                    results = response;
                }
            } catch (contentError) {
                //console.log('Content response script未，inject script 尝试');
            }
            
            // method 2: if content response has script没，file inject script of 必要
            if (!results) {
                try {
                    // file inject script of 先依赖
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: false },
                        files: [
                            'src/scanner/PatternExtractor.js',
                            'src/scanner/ContentExtractor.js'
                        ]
                    });
                    
                    // extracted execute function after 然
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
                    console.error('failed inject script:', injectionError);
                    throw new Error('content page 无法访问，refresh retry page after 请');
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
                throw new Error('scan results get 未能');
            }
            
        } catch (error) {
            console.error('scan failed:', error);
            if (!silent) {
                this.showError(error.message || 'scan failed，refresh retry page after 请');
            }
        } finally {
            if (!silent) {
                loading.style.display = 'none';
                scanBtn.disabled = false;
                if (scanBtnText) {
                    scanBtnText.textContent = 'scan re-';
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
        
        // error details display
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>scan failed</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    请尝试以下解决方案：<br>
                    1. 刷新page后重试<br>
                    2. 确保page完全load<br>
                    3. check as no yes系统page
                </p>
            </div>
        `;
        
        setTimeout(() => {
            scanBtn.textContent = 'scan re-';
            scanBtn.style.background = '';
        }, 3000);
    }
    
    // extracted inject execute function page to in of
    async extractSensitiveInfo(targetUrl) {
        try {
            //console.log('🚀🚀🚀 BasicScanner.extractSensitiveInfo call method 被！when 间戳:', Date.now());
            //console.log('🚀🚀🚀 BasicScanner URL 目标:', targetUrl);
            //console.log('🚀🚀🚀 BasicScanner URL current:', window.location.href);
            
            // execute window layer(s) 确保在顶
            if (window !== window.top) {
                //console.log('skip scan iframe，scan page layer(s) 只顶');
                return this.getEmptyResults();
            }
            
            // URL URL match validate page current no yes 目标
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('URL match page 不，skip scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 start scan page BasicScanner:', window.location.href);
            
            // check module available new no yes has 化系统
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                //console.log('🔄 unified regex extracted use BasicScanner系统');
                try {
                    // initialize configuration load latest 确保PatternExtractor已经并了
                    //console.log('🔧 check status BasicScannerPatternExtractor...');
                    
                    if (!window.patternExtractor) {
                        //console.log('🔧 initialize new BasicScannerPatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                    // scan configuration load latest force re- time(s) 每都，settings latest use 确保
                    //console.log('🔄 configuration load latest force re- BasicScanner...');
                    await window.patternExtractor.loadCustomPatterns();
                    
                    //console.log('✅ complete check configuration BasicScanner');
                    //console.log('📊 available regex mode final BasicScanner:', Object.keys(window.patternExtractor.patterns));
                    
                    // custom regex validate no yes 存在
                    const customKeys = Object.keys(window.patternExtractor.patterns).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ found BasicScanner ${customKeys.length} custom regex item(s):`, customKeys);
                    } else {
                        console.warn('⚠️ custom regex not found any BasicScanner');
                    }
                    
                    // extracted execute 创建ContentExtractor并
                    const contentExtractor = new ContentExtractor();
                    const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                    //console.log('✅ unified complete extracted BasicScanner系统，results:', results);
                    //console.log('🌐 [DEBUG] scan complete BasicScanner - URL:', window.location.href);
                    return results;
                } catch (error) {
                    console.error('❌ unified failed extracted BasicScanner系统:', error);
                    // unified version：use 不降级方案，return results directly empty
                    //console.log('⚠️ unified version BasicScanner：不use降级方案，return results empty');
                    return this.getEmptyResults();
                }
            }
            
            // unified version：module if has 没化系统，return results directly empty
            //console.log('⚠️ unified version BasicScanner：not found unified extracted 系统，return results empty');
            return this.getEmptyResults();
            
        } catch (error) {
            console.error('❌ scan error occurred in BasicScanner过程:', error);
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
            // sensitive information type of 新增
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
        
        // 注意：custom regex get configuration async 这里不能，function sync as yes 因这
        // custom regex results process in of empty 会在PatternExtractor
        //console.log('📦 return results basic structure empty BasicScanner');
        
        return baseResults;
    }
}