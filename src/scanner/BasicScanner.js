/**
 * basicscan器 - 负责page面内容basicscan
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
                scanBtnText.textContent = 'scanning...';
            }
            scanBtn.classList.add('scanning');
        }
        
        try {
            // get当before活动标签page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // checkURL是否valid
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('无法scan系统page面');
            }
            
            // 更new当beforescandomain显示
            this.srcMiner.updateCurrentDomain(tab.url);
            
            // 方法1: 尝试directlyfromcontent scriptgetresult
            let results = null;
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo', targetUrl: tab.url });
                if (response) {
                    results = response;
                }
            } catch (contentError) {
                //console.log('Content script未响应，尝试injection脚本');
            }
            
            // 方法2: ifcontent scriptwithout响应，injection必要脚本文件
            if (!results) {
                try {
                    // 先injection依赖脚本文件
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: false },
                        files: [
                            'src/scanner/PatternExtractor.js',
                            'src/scanner/ContentExtractor.js'
                        ]
                    });
                    
                    // 然后executeextract函数
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
                    console.error('脚本injectionfailed:', injectionError);
                    throw new Error('无法访问page面内容，请刷newpage面后重试');
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
                throw new Error('未能getscanresult');
            }
            
        } catch (error) {
            console.error('scanfailed:', error);
            if (!silent) {
                this.showError(error.message || 'scanfailed，请刷newpage面后重试');
            }
        } finally {
            if (!silent) {
                loading.style.display = 'none';
                scanBtn.disabled = false;
                if (scanBtnText) {
                    scanBtnText.textContent = '重newscan';
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
        scanBtn.textContent = '❌ scanfailed';
        scanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        // 显示错误详情
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>扫描失败</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    请尝试以下解决方案：<br>
                    1. 刷新页面后重试<br>
                    2. 确保页面完全加载<br>
                    3. 检查是否为系统页面
                </p>
            </div>
        `;
        
        setTimeout(() => {
            scanBtn.textContent = '重newscan';
            scanBtn.style.background = '';
        }, 3000);
    }
    
    // injectiontopage面inexecuteextract函数
    async extractSensitiveInfo(targetUrl) {
        try {
            //console.log('🚀🚀🚀 BasicScanner.extractSensitiveInfo 方法by调for！时间戳:', Date.now());
            //console.log('🚀🚀🚀 BasicScanner 目标URL:', targetUrl);
            //console.log('🚀🚀🚀 BasicScanner 当beforeURL:', window.location.href);
            
            // 确保in顶层窗口execute
            if (window !== window.top) {
                //console.log('skipiframescan，只scan顶层page面');
                return this.getEmptyResults();
            }
            
            // validation当beforepage面URL是否match目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('page面URLnotmatch，skipscan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 BasicScannerstartscanpage面:', window.location.href);
            
            // check是否有newmod块化系统可for
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                //console.log('🔄 BasicScanneruseunified化regexextract系统');
                try {
                    // 确保PatternExtractoralready经initializeandload了最newconfiguration
                    //console.log('🔧 BasicScannercheckPatternExtractorstate...');
                    
                    if (!window.patternExtractor) {
                        //console.log('🔧 BasicScannerinitializenewPatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                    // every timescan都强制重newload最newconfiguration，确保use最newsettings
                    //console.log('🔄 BasicScanner强制重newload最newconfiguration...');
                    await window.patternExtractor.loadCustomPatterns();
                    
                    //console.log('✅ BasicScannerconfigurationcheckcomplete');
                    //console.log('📊 BasicScanner最终可forregexpattern:', Object.keys(window.patternExtractor.patterns));
                    
                    // validationcustomregex是否exists
                    const customKeys = Object.keys(window.patternExtractor.patterns).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ BasicScanner发现 ${customKeys.length} 个customregex:`, customKeys);
                    } else {
                        console.warn('⚠️ BasicScanner未发现任何customregex');
                    }
                    
                    // createContentExtractorandexecuteextract
                    const contentExtractor = new ContentExtractor();
                    const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                    //console.log('✅ BasicScannerunified化系统extractcomplete，result:', results);
                    //console.log('🌐 [DEBUG] BasicScannerscan complete - URL:', window.location.href);
                    return results;
                } catch (error) {
                    console.error('❌ BasicScannerunified化系统extractfailed:', error);
                    // unified化version：notuse降级方案，directlyreturn空result
                    //console.log('⚠️ BasicScannerunified化version：notuse降级方案，return空result');
                    return this.getEmptyResults();
                }
            }
            
            // unified化version：ifwithoutmod块化系统，directlyreturn空result
            //console.log('⚠️ BasicScannerunified化version：未foundunified化extract系统，return空result');
            return this.getEmptyResults();
            
        } catch (error) {
            console.error('❌ BasicScannerscanthrough程in出错:', error);
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
            // new增敏感informationclass型
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
        
        // 注意：这里not能asyncgetcustomregexconfiguration，因为这是同步函数
        // customregex空result会inPatternExtractorin处理
        //console.log('📦 BasicScannerreturnbasic空result结构');
        
        return baseResults;
    }
}