/**
 * BasicScan器 - 负责PageContent的BasicScan
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
                scanBtnText.textContent = 'Scan中...';
            }
            scanBtn.classList.add('scanning');
        }
        
        try {
            // GetCurrent活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // CheckURL是否Valid
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('None法ScanSystemPage');
            }
            
            // UpdateCurrentScanDomainDisplay
            this.srcMiner.updateCurrentDomain(tab.url);
            
            // Method1: 尝试Directfromcontent scriptGetResult
            let results = null;
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo', targetUrl: tab.url });
                if (response) {
                    results = response;
                }
            } catch (contentError) {
                //console.log('Content scriptNot响应，尝试注入Script');
            }
            
            // Method2: 如果content scriptNo响应，注入必要的ScriptFile
            if (!results) {
                try {
                    // First注入依赖的ScriptFile
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: false },
                        files: [
                            'src/scanner/PatternExtractor.js',
                            'src/scanner/ContentExtractor.js'
                        ]
                    });
                    
                    // ThenExecuteExtractFunction
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
                    console.error('Script注入Failed:', injectionError);
                    throw new Error('None法访问PageContent，请刷新PageAfter重试');
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
                throw new Error('Not能GetScan results');
            }
            
        } catch (error) {
            console.error('ScanFailed:', error);
            if (!silent) {
                this.showError(error.message || 'ScanFailed，请刷新PageAfter重试');
            }
        } finally {
            if (!silent) {
                loading.style.display = 'none';
                scanBtn.disabled = false;
                if (scanBtnText) {
                    scanBtnText.textContent = 'ReScan';
                }
                scanBtn.classList.remove('scanning');
            }
        }
    }
    
    showScanComplete() {
        const scanBtn = document.getElementById('scanBtn');
        const originalText = scanBtn.textContent;
        scanBtn.textContent = '✅ Scan completed';
        scanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        setTimeout(() => {
            scanBtn.textContent = originalText;
            scanBtn.style.background = '';
        }, 2000);
    }
    
    showError(message) {
        const scanBtn = document.getElementById('scanBtn');
        scanBtn.textContent = '❌ ScanFailed';
        scanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        // DisplayError详情
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>ScanFailed</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    请尝试以下解决方案：<br>
                    1. 刷新PageAfter重试<br>
                    2. EnsurePage完全Load<br>
                    3. Check是否为SystemPage
                </p>
            </div>
        `;
        
        setTimeout(() => {
            scanBtn.textContent = 'ReScan';
            scanBtn.style.background = '';
        }, 3000);
    }
    
    // 注入到Page中Execute的ExtractFunction
    async extractSensitiveInfo(targetUrl) {
        try {
            //console.log('🚀🚀🚀 BasicScanner.extractSensitiveInfo MethodBy调用！Time戳:', Date.now());
            //console.log('🚀🚀🚀 BasicScanner TargetURL:', targetUrl);
            //console.log('🚀🚀🚀 BasicScanner CurrentURL:', window.location.href);
            
            // Ensure在顶层窗口Execute
            if (window !== window.top) {
                //console.log('跳过iframeScan，OnlyScan顶层Page');
                return this.getEmptyResults();
            }
            
            // ValidateCurrentPageURL是否MatchTargetURL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('PageURL不Match，跳过Scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 BasicScannerStart scanningPage:', window.location.href);
            
            // Check是否有新的模块化SystemAvailable
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                //console.log('🔄 BasicScanner使用Unified化正则ExtractSystem');
                try {
                    // EnsurePatternExtractorAlready经InitializeAndLoad了最新Configuration
                    //console.log('🔧 BasicScannerCheckPatternExtractorStatus...');
                    
                    if (!window.patternExtractor) {
                        //console.log('🔧 BasicScannerInitialize新的PatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                    // Every次Scan都强制Reload最新Configuration，Ensure使用最新Settings
                    //console.log('🔄 BasicScanner强制Reload最新Configuration...');
                    await window.patternExtractor.loadCustomPatterns();
                    
                    //console.log('✅ BasicScannerConfigurationCheckComplete');
                    //console.log('📊 BasicScanner最终Available的正则Pattern:', Object.keys(window.patternExtractor.patterns));
                    
                    // ValidateCustom正则是否存在
                    const customKeys = Object.keys(window.patternExtractor.patterns).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ BasicScannerFound ${customKeys.length} 个Custom正则:`, customKeys);
                    } else {
                        console.warn('⚠️ BasicScannerNotFound任何Custom正则');
                    }
                    
                    // CreateContentExtractorAndExecuteExtract
                    const contentExtractor = new ContentExtractor();
                    const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                    //console.log('✅ BasicScannerUnified化SystemExtraction completed，Result:', results);
                    //console.log('🌐 [DEBUG] BasicScannerScan completed - URL:', window.location.href);
                    return results;
                } catch (error) {
                    console.error('❌ BasicScannerUnified化SystemExtractFailed:', error);
                    // Unified化版本：不使用降级方案，DirectReturnEmptyResult
                    //console.log('⚠️ BasicScannerUnified化版本：不使用降级方案，ReturnEmptyResult');
                    return this.getEmptyResults();
                }
            }
            
            // Unified化版本：如果No模块化System，DirectReturnEmptyResult
            //console.log('⚠️ BasicScannerUnified化版本：Not foundUnified化ExtractSystem，ReturnEmptyResult');
            return this.getEmptyResults();
            
        } catch (error) {
            console.error('❌ BasicScannerScan过程中出错:', error);
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
            // 新增的敏感InformationType
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
        
        // 注意：Here不能AsyncGetCustom正则Configuration，因为This是同步Function
        // Custom正则的EmptyResult会在PatternExtractor中Process
        //console.log('📦 BasicScannerReturnBasicEmptyResult结构');
        
        return baseResults;
    }
}