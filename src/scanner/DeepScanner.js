/**
 * 深度Scan器 - 负责递归深度Scan功能
 */
class DeepScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        // AddURL缓存，避免重复Process
        this.urlContentCache = new Map();
        // AddRegular expression缓存
        this.regexCache = {};
        // Default超时Time（毫秒）
        this.timeout = 5000;
        // FilterStatus
        this.filtersLoaded = false;
    }
    
    // Load增强Filter
    async loadEnhancedFilters() {
        if (this.filtersLoaded) {
            //console.log('🔍 增强FilterLoaded');
            return;
        }
        
        //console.log('🔄 StartLoad深度Scan增强Filter...');
        
        try {
            // Check是否在Extension环境中
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // LoadDomainAnd手机号Filter
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // InitializeFilter
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ Domain手机号FilterInitializeSuccess');
                    }
                }
                
                // LoadAPIFilter
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ APIFilterLoadSuccess');
                }
                
                this.filtersLoaded = true;
                //console.log('🎉 所有FilterLoading complete');
            } else {
                console.warn('⚠️ 非Extension环境，None法LoadFilter');
            }
        } catch (error) {
            console.error('❌ FilterLoadFailed:', error);
        }
    }
    
    // LoadFilterScript
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 ScriptLoadSuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ ScriptLoadFailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // Settings超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也ContinueExecute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ LoadScriptFailed: ${scriptPath}`, error);
                resolve(); // 出错时也ContinueExecute
            }
        });
    }
    
    // 切换深度ScanPattern - 使用新的窗口System
    toggleDeepScan() {
        const configDiv = document.getElementById('deepScanConfig');
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (configDiv.style.display === 'none' || !configDiv.style.display) {
            // DisplayConfiguration面板
            configDiv.style.display = 'block';
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '🚀 Start深度Scan';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        } else {
            // Start深度Scan - 使用新的窗口System
            this.startDeepScanWindow();
        }
    }
    
    // Start深度Scan窗口
    async startDeepScanWindow() {
        //console.log('🚀 Start深度Scan窗口...');
        
        try {
            // GetConfigurationParameter
            const maxDepthInput = document.getElementById('maxDepth');
            const concurrencyInput = document.getElementById('concurrency');
            const timeoutInput = document.getElementById('timeout');
            
            const maxDepth = parseInt(maxDepthInput?.value) || 2;
            const concurrency = parseInt(concurrencyInput?.value) || 8;
            const timeout = parseInt(timeoutInput?.value) || 5;
            
            // Initialize深度Scan窗口管理器
            if (!this.srcMiner.deepScanWindow) {
                // 动态LoadDeepScanWindowClass
                await this.loadDeepScanWindow();
                this.srcMiner.deepScanWindow = new DeepScanWindow(this.srcMiner);
            }
            
            // GetCurrentPageURL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('None法GetCurrentPageInformation');
            }
            
            // Start深度Scan窗口
            await this.srcMiner.deepScanWindow.createDeepScanWindow({
                maxDepth: maxDepth,
                concurrency: concurrency,
                timeout: timeout
            });
            
            // DisplaySuccessPrompt
            this.showSuccessNotification('🚀 深度ScanAlready在新窗口中Start！请查看新打开的ScanPage。');
            
            // 隐藏Configuration面板
            const configDiv = document.getElementById('deepScanConfig');
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            
            if (configDiv) {
                configDiv.style.display = 'none';
            }
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归Scan';
            }
            
            if (deepScanBtn) {
                deepScanBtn.style.background = '';
            }
            
        } catch (error) {
            console.error('❌ Start深度Scan窗口Failed:', error);
            this.showError('Start深度Scan窗口Failed: ' + error.message);
        }
    }
    
    // 动态LoadDeepScanWindowClass
    async loadDeepScanWindow() {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/scanner/DeepScanWindow.js');
                
                script.onload = () => {
                    //console.log('📦 DeepScanWindowClassLoadSuccess');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('❌ DeepScanWindowClassLoadFailed:', error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // Settings超时保护
                setTimeout(() => {
                    if (typeof DeepScanWindow !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('DeepScanWindowClassLoad超时'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Process来自Scan窗口的消息
    handleScanWindowMessage(message, sender, sendResponse) {
        if (!this.srcMiner.deepScanWindow) {
            sendResponse({ success: false, error: 'DeepScanWindow not initialized' });
            return;
        }
        
        return this.srcMiner.deepScanWindow.handleScanWindowMessage(message, sender, sendResponse);
    }
    
    // 兼容性Method - 保持原有的深度Scan功能作为备用
    async startDeepScan() {
        //console.log('🔄 使用传统深度ScanMethod作为备用');
        
        if (this.srcMiner.deepScanRunning) {
            //console.log('深度ScanAlready在运行中');
            return;
        }
        
        //console.log('🚀 Start传统深度Scan...');
        // EnsureFilterLoaded
        await this.loadEnhancedFilters();
        
        // GetConfigurationParameter
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');
        
        // CheckConfigurationElement是否存在
        if (!maxDepthInput || !concurrencyInput) {
            console.error('深度ScanConfigurationElementNot found');
            this.showError('深度ScanConfigurationError，请CheckPageElement');
            return;
        }
        
        this.srcMiner.maxDepth = parseInt(maxDepthInput.value) || 2;
        this.srcMiner.concurrency = parseInt(concurrencyInput.value) || 8;
        
        // Get超时Settings
        if (timeoutInput) {
            this.timeout = parseInt(timeoutInput.value) * 1000; // Convert为毫秒
        } else {
            this.timeout = 5000; // Default5 seconds
        }
        
        //console.log(`Settings超时Time: ${this.timeout/1000} seconds`);
        const scanJsFiles = scanJsFilesInput ? scanJsFilesInput.checked : true;
        const scanHtmlFiles = scanHtmlFilesInput ? scanHtmlFilesInput.checked : true;
        const scanApiFiles = scanApiFilesInput ? scanApiFilesInput.checked : true;
        
        console.log('深度ScanConfiguration:', {
            maxDepth: this.srcMiner.maxDepth,
            concurrency: this.srcMiner.concurrency,
            timeout: this.timeout / 1000 + '秒',
            scanJsFiles,
            scanHtmlFiles,
            scanApiFiles
        });
        
        // ResetScanStatus
        this.srcMiner.deepScanRunning = true;
        this.srcMiner.scannedUrls = new Set(); // 使用Set而不是clear()，Ensure是新实例
        this.srcMiner.pendingUrls = new Set();
        this.urlContentCache.clear(); // ClearURLContent缓存
        
        // 使用引用而不是深拷贝，减少内存使用
        this.srcMiner.deepScanResults = {};
        Object.keys(this.srcMiner.results).forEach(key => {
            this.srcMiner.deepScanResults[key] = [...(this.srcMiner.results[key] || [])];
        });
        
        this.srcMiner.currentDepth = 0;
        
        const deepScanBtn = document.getElementById('deepScanBtn');
        const progressDiv = document.getElementById('deepScanProgress');
        const configDiv = document.getElementById('deepScanConfig');
        
        // UpdateUIStatus
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ Stop scanning';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            deepScanBtn.style.color = '#fff';
        }
        
        if (progressDiv) {
            // 进度条DisplayAlreadyRemove
        }
        
        // 保持Configuration面板Display，以便查看进度条
        if (configDiv) {
            configDiv.style.display = 'block';
            // DisableConfiguration选Item，防止Scan过程中修改
            const configInputs = configDiv.querySelectorAll('input, select');
            configInputs.forEach(input => input.disabled = true);
        }
        
        try {
        // 🔥 Unified化版本：强制ReloadRegular expressionConfiguration
        if (this.srcMiner.patternExtractor) {
            //console.log('🔄 深度ScanUnified化版本Start强制ReloadRegular expressionConfiguration...');
            
            // 清除现有Configuration
            this.srcMiner.patternExtractor.patterns = {};
            this.srcMiner.patternExtractor.customPatternsLoaded = false;
            
            // ReloadConfiguration
            await this.srcMiner.patternExtractor.loadCustomPatterns();
            if (typeof this.srcMiner.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                await this.srcMiner.patternExtractor.ensureCustomPatternsLoaded();
            }
            
            //console.log('✅ 深度ScanUnified化版本Already强制ReloadRegular expressionConfiguration');
            //console.log('📊 深度ScanUnified化版本CurrentAvailable的正则Pattern:', Object.keys(this.srcMiner.patternExtractor.patterns));
            //console.log('🔍 深度ScanUnified化版本Custom正则ConfigurationStatus:', this.srcMiner.patternExtractor.customPatternsLoaded);
        } else {
            console.error('❌ 深度ScanUnified化版本：Not foundPatternExtractor实例，None法PerformUnified化Extract');
        }
            
            // GetCurrentPageInformation
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('None法GetCurrentPageURL');
            }
            
            const baseUrl = new URL(tab.url).origin;
            const currentUrl = tab.url;
            
            console.log('🎯 深度ScanTarget:', {
                baseUrl,
                currentUrl,
                maxDepth: this.srcMiner.maxDepth
            });
            
            // AddCurrentPage到AlreadyScan列Table
            this.srcMiner.scannedUrls.add(currentUrl);
            
            // 收集初始ScanURL列Table
            const initialUrls = await this.collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles);
            //console.log('📋 初始URL列Table (' + initialUrls.length + ' 个):', initialUrls.slice(0, 5));
            
            if (initialUrls.length === 0) {
                //console.log('⚠️ NoFound可Scan的URL');
                this.updateDeepScanProgress(0, 0, 'NoFound可Scan的URL');
                return;
            }
            
            // Start分层递归Scan
            await this.performLayeredScan(baseUrl, initialUrls, {
                scanJsFiles,
                scanHtmlFiles,
                scanApiFiles
            });
            
            // Update最终ResultAndSave
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            this.srcMiner.saveResults();
            
            // 额外Save深度Scan专用Data到IndexedDB
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab && currentTab.url) {
                const urlObj = new URL(currentTab.url);
                const fullUrl = `https://${urlObj.hostname}`;
                
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                
                const deepState = {
                    running: false,
                    complete: true,
                    timestamp: Date.now(),
                    url: currentTab.url,
                    scannedUrls: Array.from(this.srcMiner.scannedUrls || []),
                    currentDepth: this.srcMiner.currentDepth,
                    maxDepth: this.srcMiner.maxDepth,
                    concurrency: this.srcMiner.concurrency
                };
                
                await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            }
            
            this.showDeepScanComplete();
            
        } catch (error) {
            console.error('❌ 深度ScanFailed:', error);
            this.showError('深度ScanFailed: ' + error.message);
        } finally {
            // ResetUIStatus
            this.srcMiner.deepScanRunning = false;
            
            // 最终Save所有Data
            this.srcMiner.saveResults();
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归Scan';
                }
                deepScanBtn.style.background = '';
                deepScanBtn.style.color = '';
            }
            
            if (configDiv) {
                // ReEnableConfiguration选Item
                const configInputs = configDiv.querySelectorAll('input, select');
                configInputs.forEach(input => input.disabled = false);
                
                // 延迟隐藏Configuration面板，让User看到最终进度
                setTimeout(() => {
                    configDiv.style.display = 'none';
                }, 5000);
            }
            
            if (progressDiv) {
                // 保持进度条Display一段Time
                setTimeout(() => {
                    if (progressDiv.style.display !== 'none') {
                        progressDiv.style.display = 'none';
                    }
                }, 5000);
            }
            
            // Clean缓存
            this.urlContentCache.clear();
            
            // SaveScan completedStatus到IndexedDB
            const [completedTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (completedTab && completedTab.url) {
                const urlObj = new URL(completedTab.url);
                const fullUrl = `https://${urlObj.hostname}`;
                
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                
                const finalState = {
                    running: false,
                    complete: true,
                    lastCompleted: Date.now(),
                    scannedUrls: Array.from(this.srcMiner.scannedUrls || []),
                    currentDepth: this.srcMiner.currentDepth,
                    maxDepth: this.srcMiner.maxDepth,
                    concurrency: this.srcMiner.concurrency
                };
                
                await window.indexedDBManager.saveDeepScanState(fullUrl, finalState);
            }
        }
    }
    
    // 收集初始ScanURL - Async版本（兼容新旧DataFormat）
    async collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles) {
        const urls = new Set();
        
        //console.log('🔍 收集初始URL，CurrentResult:', Object.keys(this.srcMiner.results));
        
        // fromJSFile中收集 - 兼容新旧Format
        if (scanJsFiles && this.srcMiner.results.jsFiles) {
            for (const jsFile of this.srcMiner.results.jsFiles) {
                // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // fromHTML/PageURL中收集 - 兼容新旧Format
        if (scanHtmlFiles && this.srcMiner.results.urls) {
            for (const urlItem of this.srcMiner.results.urls) {
                // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    // Only收集可能是Page的URL
                    if (this.isPageUrl(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        // fromAPI interface中收集 - 兼容新旧Format
        if (scanApiFiles) {
            // Absolute pathAPI
            if (this.srcMiner.results.absoluteApis) {
                for (const apiItem of this.srcMiner.results.absoluteApis) {
                    // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            // Relative pathAPI
            if (this.srcMiner.results.relativeApis) {
                for (const apiItem of this.srcMiner.results.relativeApis) {
                    // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        const urlArray = Array.from(urls);
        //console.log(`📊 收集到 ${urlArray.length} 个初始URL`);
        return urlArray;
    }
    
    // 判断是否为PageURL
    isPageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            // 使用缓存的Regular expression
            if (!this.regexCache.resourceExtensions) {
                this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i;
            }
            
            // 排除明显的ResourceFile
            if (this.regexCache.resourceExtensions.test(pathname)) {
                return false;
            }
            
            // 包含Page特征
            return pathname === '/' || 
                   pathname.endsWith('/') || 
                   pathname.endsWith('.html') || 
                   pathname.endsWith('.htm') ||
                   pathname.includes('/page') ||
                   pathname.includes('/view') ||
                   !pathname.includes('.');
        } catch (e) {
            return false;
        }
    }
    
    // Execute分层Scan
    async performLayeredScan(baseUrl, initialUrls, options) {
        let currentUrls = [...initialUrls];
        
        for (let depth = 1; depth <= this.srcMiner.maxDepth && this.srcMiner.deepScanRunning; depth++) {
            this.srcMiner.currentDepth = depth;
            
            if (currentUrls.length === 0) {
                //console.log(`第 ${depth} 层NoURLNeedScan`);
                break;
            }
            
            //console.log(`🔍 Start第 ${depth} 层Scan，URL数量: ${currentUrls.length}`);
            this.updateDeepScanProgress(0, currentUrls.length, `第 ${depth} 层Scan`);
            
            // 分批ProcessURL - 使用优化的批ProcessMethod
            const newUrls = await this.scanUrlBatchOptimized(currentUrls, baseUrl, options, depth);
            
            // Prepare下一层的URL - 使用SetPerform去重
            const nextUrlsSet = new Set(newUrls);
            currentUrls = Array.from(nextUrlsSet).filter(url => !this.srcMiner.scannedUrls.has(url));
            
            //console.log(`✅ 第 ${depth} 层Scan completed，Found新URL: ${currentUrls.length} 个`);
            
            // Every层Scan completedAfter强制UpdateDisplay
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            //console.log(`🔄 第 ${depth} 层Scan completed，AlreadyUpdateDisplay界面`);
            
            // Every层ScanAfter释放内存
            if (typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // 优化的BatchScanURLMethod - 支持实时Output
    async scanUrlBatchOptimized(urls, baseUrl, options, depth) {
        const newUrls = new Set();
        let processedCount = 0;
        const totalUrls = urls.length;
        const concurrency = this.srcMiner.concurrency;
        
        // 使用QueueAnd工作线程池Pattern，而不是简单的分块
        const queue = [...urls];
        const activeWorkers = new Set();
        
        // 实时Display计数器
        let lastDisplayUpdate = 0;
        const displayUpdateInterval = 1000; // Every1秒最多Update一次Display
        
        const processQueue = async () => {
            while (queue.length > 0 && this.srcMiner.deepScanRunning) {
                const url = queue.shift();
                
                // 跳过AlreadyScan的URL
                if (this.srcMiner.scannedUrls.has(url)) {
                    processedCount++;
                    this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层Scan`);
                    continue;
                }
                
                // Mark为AlreadyScan
                this.srcMiner.scannedUrls.add(url);
                
                const workerPromise = (async () => {
                    try {
                        // GetURLContent - 使用缓存
                        let content;
                        if (this.urlContentCache.has(url)) {
                            content = this.urlContentCache.get(url);
                        } else {
                            content = await this.fetchUrlContent(url);
                            if (content) {
                                this.urlContentCache.set(url, content);
                            }
                        }
                        
                        if (content) {
                            // Extract information
                            const extractedData = this.extractFromContent(content, url);
                            const hasNewData = await this.mergeDeepScanResults(extractedData);
                            
                            // 如果有新Data且距离上次DisplayUpdate超过间隔Time，立即UpdateDisplay
                            const now = Date.now();
                            if (hasNewData && (now - lastDisplayUpdate) > displayUpdateInterval) {
                                lastDisplayUpdate = now;
                                // 实时UpdateDisplay
                                this.srcMiner.results = this.srcMiner.deepScanResults;
                                this.srcMiner.displayResults();
                                //console.log(`🔄 实时UpdateDisplay - Scan到新Data来Source: ${url}`);
                            }
                            
                            // 收集新URL
                            const discoveredUrls = await this.collectUrlsFromContent(content, baseUrl, options);
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        }
                    } catch (error) {
                        console.error(`Scan ${url} Failed:`, error);
                    } finally {
                        processedCount++;
                        this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层Scan`);
                        activeWorkers.delete(workerPromise);
                    }
                })();
                
                activeWorkers.add(workerPromise);
                
                // 控制And发数
                if (activeWorkers.size >= concurrency) {
                    await Promise.race(Array.from(activeWorkers));
                }
            }
        };
        
        // StartQueueProcess
        await processQueue();
        
        // 等Pending所有活跃工作线程Complete
        if (activeWorkers.size > 0) {
            await Promise.all(Array.from(activeWorkers));
        }
        
        return Array.from(newUrls);
    }
    
    // GetURLContent - ThroughAfter台ScriptSendRequest
    async fetchUrlContent(url) {
        try {
            //console.log(`🔥 深度Scan - PrepareThroughAfter台ScriptRequest: ${url}`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                    'Cache-Control': 'no-cache'
                },
                timeout: this.timeout
            };
            
            //console.log(`🔥 深度Scan - Send消息到After台Script，URL: ${url}`);
            
            // ThroughAfter台ScriptSendRequest
            const response = await this.makeRequestViaBackground(url, requestOptions);
            
            //console.log(`🔥 深度Scan - After台Script响应: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            // 快速Filter非文本Content
            if (contentType.includes('image/') || 
                contentType.includes('audio/') || 
                contentType.includes('video/') || 
                contentType.includes('application/octet-stream') ||
                contentType.includes('application/zip') ||
                contentType.includes('application/pdf')) {
                return null;
            }
            
            const text = await response.text();
            return text;
            
        } catch (error) {
            console.error(`None法访问 ${url}:`, error);
            return null;
        }
    }
    
    // ThroughAfter台ScriptSendRequest
    async makeRequestViaBackground(url, options = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'makeRequest',
                url: url,
                options: options
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    // 模拟fetch响应Object
                    const mockHeaders = new Map(Object.entries(response.data.headers || {}));
                    
                    resolve({
                        ok: response.data.status >= 200 && response.data.status < 300,
                        status: response.data.status,
                        statusText: response.data.statusText,
                        headers: {
                            get: (name) => mockHeaders.get(name.toLowerCase()),
                            has: (name) => mockHeaders.has(name.toLowerCase()),
                            entries: () => mockHeaders.entries(),
                            keys: () => mockHeaders.keys(),
                            values: () => mockHeaders.values()
                        },
                        text: () => Promise.resolve(response.data.text),
                        json: () => {
                            try {
                                return Promise.resolve(JSON.parse(response.data.text));
                            } catch (e) {
                                return Promise.reject(new Error('Invalid JSON'));
                            }
                        },
                        url: response.data.url,
                        clone: () => ({
                            text: () => Promise.resolve(response.data.text),
                            json: () => {
                                try {
                                    return Promise.resolve(JSON.parse(response.data.text));
                                } catch (e) {
                                    return Promise.reject(new Error('Invalid JSON'));
                                }
                            }
                        })
                    });
                } else {
                    reject(new Error(response?.error || 'Request failed'));
                }
            });
        });
    }
    
    // 🔥 Unified化版本：Extract from contentInformation - 完全使用PatternExtractor
    extractFromContent(content, sourceUrl) {
        //console.log(`🔍 深度ScanUnified化版本StartExtractContent，来Source: ${sourceUrl}`);
        
        // RemoveContent大小限制，允许ProcessCompleteContent
        const processedContent = content;
        
        // 🔥 Unified化版本：完全使用PatternExtractorPerformExtract
        if (this.srcMiner.patternExtractor) {
            //console.log('✅ 深度ScanUnified化版本：使用PatternExtractorPerformUnifiedExtract');
            
            try {
                // EnsureCustom正则ConfigurationLoaded
                if (!this.srcMiner.patternExtractor.customPatternsLoaded) {
                    //console.log('🔄 深度ScanUnified化版本：ReloadCustom正则Configuration...');
                    this.srcMiner.patternExtractor.loadCustomPatterns();
                }
                
                // 使用Unified的PatternExtractorPerformExtract
                const extractedResults = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                //console.log('📊 深度ScanUnified化版本ExtractResult:', extractedResults);
                //console.log('📈 深度ScanUnified化版本Extract到的DataType数量:', Object.keys(extractedResults).length);
                
                // StatisticsEvery种Type的数量
                Object.entries(extractedResults).forEach(([type, items]) => {
                    if (Array.isArray(items) && items.length > 0) {
                        //console.log(`📋 深度ScanUnified化版本 ${type}: ${items.length} 个Project`);
                        // 如果是Custom正则Result，Display更详细的Information
                        if (type.startsWith('custom_')) {
                            //console.log(`🎯 深度ScanUnified化版本Custom正则 ${type} MatchContent:`, items.slice(0, 3));
                        }
                    }
                });
                
                return extractedResults;
            } catch (error) {
                console.error('❌ 深度ScanUnified化版本ExtractFailed:', error);
                return {};
            }
        } else {
            console.error('❌ 深度ScanUnified化版本：PatternExtractorNotInitialize，None法PerformUnified化Extract');
            return {};
        }
    }
    
    // 🔥 Unified化版本：fromContent中收集新的URL - 使用PatternExtractorExtract的URL（Async版本，兼容新旧Format）
    async collectUrlsFromContent(content, baseUrl, options) {
        //console.log('🔍 深度ScanUnified化版本：fromContent中收集URL...');
        
        const urls = new Set();
        const { scanJsFiles, scanHtmlFiles, scanApiFiles } = options;
        
        // RemoveContent大小限制，允许ProcessCompleteContent
        const processedContent = content;
        
        // 🔥 Unified化版本：使用PatternExtractorExtractURL
        if (this.srcMiner.patternExtractor) {
            try {
                const extractedData = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                // fromExtractResult中收集URL - 兼容新旧Format
                if (scanJsFiles && extractedData.jsFiles) {
                    for (const jsFileItem of extractedData.jsFiles) {
                        // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                        const jsFile = typeof jsFileItem === 'object' ? jsFileItem.value : jsFileItem;
                        const fullUrl = this.resolveUrl(jsFile, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanHtmlFiles && extractedData.urls) {
                    for (const urlItem of extractedData.urls) {
                        // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                        const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                        const fullUrl = this.resolveUrl(url, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && this.isValidPageUrl(url)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanApiFiles) {
                    // 收集绝对API - 兼容新旧Format
                    if (extractedData.absoluteApis) {
                        for (const apiItem of extractedData.absoluteApis) {
                            // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                    
                    // 收集相对API - 兼容新旧Format
                    if (extractedData.relativeApis) {
                        for (const apiItem of extractedData.relativeApis) {
                            // ExtractURL值 - 兼容ObjectFormatAnd字符串Format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                }
                
                //console.log(`✅ 深度ScanUnified化版本：fromPatternExtractor收集到 ${urls.size} 个URL`);
            } catch (error) {
                console.error('❌ 深度ScanUnified化版本：使用PatternExtractor收集URLFailed:', error);
            }
        }
        
        return Array.from(urls);
    }
    
    // ValidatePageURL
    isValidPageUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // 使用缓存的Regular expression
        if (!this.regexCache.resourceExtensions) {
            this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
        }
        
        // 排除ResourceFile
        if (this.regexCache.resourceExtensions.test(url.toLowerCase())) {
            return false;
        }
        
        return true;
    }
    
    // ValidateAPI URL - 优化版本
    isValidApiUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // 使用缓存的Regular expression
        if (!this.regexCache.apiFeatures) {
            this.regexCache.apiFeatures = [
                /\/api\//i,
                /\/admin\//i,
                /\/manage\//i,
                /\/backend\//i,
                /\/service\//i,
                /\.(php|asp|aspx|jsp|do|action|json|xml|csv)(\?|$)/i,
                /\.js\.map(\?|$)/i,
                /\.css\.map(\?|$)/i,
                /config.*\.(json|js|xml)(\?|$)/i,
                /\?.*=/,
                /\.(ts|tsx)(\?|$)/i,
                /\.(tpl|template)(\?|$)/i
            ];
        }
        
        return this.regexCache.apiFeatures.some(pattern => pattern.test(url));
    }
    
    // 合And深度Scan results - 优化版本，支持实时Output
    async mergeDeepScanResults(newResults) {
        let hasNewData = false;
        
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.deepScanResults[key]) {
                this.srcMiner.deepScanResults[key] = [];
            }
            
            // 使用SetPerform去重
            const existingSet = new Set(this.srcMiner.deepScanResults[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.deepScanResults[key].push(item);
                    hasNewData = true;
                }
            });
        });
        
        // 如果有新Data，立即Save到多个位置EnsureData持久化
        if (hasNewData) {
            this.srcMiner.results = this.srcMiner.deepScanResults;
            
            // 立即Save到存储，使用Unified的存储KeyFormat
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                // 使用IndexedDBSave深度Scan results
                try {
                    if (!window.indexedDBManager) {
                        window.indexedDBManager = new IndexedDBManager();
                    }
                    
                    const urlObj = new URL(tab.url);
                    const fullUrl = `https://${urlObj.hostname}`;
                    
                    // GetPage标题Used forURL位置跟踪
                    const pageTitle = document.title || tab.title || 'Unknown Page';
                    
                    // Save普通Scan results，包含URL位置Information
                    await window.indexedDBManager.saveScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    // Save深度Scan results，现在也包含SourceURLAndPage标题Information
                    await window.indexedDBManager.saveDeepScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    //console.log('✅ 深度Scan resultsAlreadySave to IndexedDB');
                } catch (error) {
                    console.error('❌ Save深度Scan results到IndexedDBFailed:', error);
                }
            }
            
            console.log('🔄 深度ScanDataSaved，CurrentResult数量:', 
                Object.values(this.srcMiner.deepScanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0));
        }
        
        // Return是否有新Data的标志，Used for实时Display判断
        return hasNewData;
    }
    
    // 🔥 Unified化版本：不再Need单独的FilterProcess，PatternExtractorAlready经Process了所有逻辑
    applyFilters(results, content, sourceUrl = 'Not知URL') {
        //console.log('🔥 深度ScanUnified化版本：跳过旧的FilterProcess，PatternExtractorAlready经Process了所有ExtractAndFilter逻辑');
        // Unified化版本不再Need额外的FilterProcess
        // 所有ExtractAndFilter逻辑都Already经在PatternExtractor中UnifiedProcess
    }
    
    // Parse相对URL为绝对URL - 优化版本
    resolveUrl(url, baseUrl) {
        try {
            if (!url) return null;
            
            // Already经是CompleteURL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // Protocol相对URL
            if (url.startsWith('//')) {
                return new URL(baseUrl).protocol + url;
            }
            
            // Absolute pathOrRelative path
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            return null;
        }
    }
    
    // Check是否为同一Domain - 支持子DomainAndAllDomainSettings
    async isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            
            // GetDomainScanSettings
            const domainSettings = await this.getDomainScanSettings();
            
            // 如果允许Scan所有Domain
            if (domainSettings.allowAllDomains) {
                //console.log(`🌐 允许所有Domain: ${urlObj.hostname}`);
                return true;
            }
            
            // 如果允许Scan子Domain
            if (domainSettings.allowSubdomains) {
                const baseHostname = baseUrlObj.hostname;
                const urlHostname = urlObj.hostname;
                
                // Check是否为同一DomainOr子Domain
                const isSameOrSubdomain = urlHostname === baseHostname || 
                                        urlHostname.endsWith('.' + baseHostname) ||
                                        baseHostname.endsWith('.' + urlHostname);
                
                if (isSameOrSubdomain) {
                    ////console.log(`🔗 允许子Domain: ${urlHostname} (基于 ${baseHostname})`);
                    return true;
                }
            }
            
            // Default：Only允许完全相同的Domain
            const isSame = urlObj.hostname === baseUrlObj.hostname;
            if (isSame) {
                //console.log(`✅ 同Domain: ${urlObj.hostname}`);
            } else {
                //console.log(`❌ 不同Domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
            }
            return isSame;
            
        } catch (error) {
            console.error('DomainCheckFailed:', error);
            return false;
        }
    }
    
    // GetDomainScanSettings
    async getDomainScanSettings() {
        try {
            // 如果SettingsManagerAvailable，使用它GetSettings
            if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
                return await window.SettingsManager.getDomainScanSettings();
            }
            
            // 备用方案：Directfromchrome.storageGet
            const result = await chrome.storage.local.get(['domainScanSettings']);
            const domainSettings = result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
            //console.log('🔍 [深度Scan] Get from storage的DomainSettings:', domainSettings);
            return domainSettings;
        } catch (error) {
            console.error('GetDomainScanSettingsFailed:', error);
            // DefaultSettings：Only允许同Domain
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }
    
    // Update深度Scan进度
    updateDeepScanProgress(current, total, stage) {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // Display深度Scan completed
    showDeepScanComplete() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '✅ 深度Scan completed';
        }
        deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        // Ensure最终ResultBySave
        this.srcMiner.saveResults();
        
        // Save深度Scan completedStatus到IndexedDB
        const saveCompletionState = async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.url) {
                    const urlObj = new URL(tab.url);
                    const fullUrl = `https://${urlObj.hostname}`;
                    
                    if (!window.indexedDBManager) {
                        window.indexedDBManager = new IndexedDBManager();
                    }
                    
                    const completionState = {
                        running: false,
                        complete: true,
                        completedAt: Date.now(),
                        resultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0),
                        scannedUrls: Array.from(this.srcMiner.scannedUrls || []),
                        currentDepth: this.srcMiner.currentDepth,
                        maxDepth: this.srcMiner.maxDepth,
                        concurrency: this.srcMiner.concurrency
                    };
                    
                    await window.indexedDBManager.saveDeepScanState(fullUrl, completionState);
                }
            } catch (error) {
                console.error('Save深度Scan completedStatusFailed:', error);
            }
        };
        
        saveCompletionState();
        
        setTimeout(() => {
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归Scan';
            }
            deepScanBtn.style.background = '';
        }, 3000);
        
        const totalScanned = this.srcMiner.scannedUrls.size;
        const totalResults = Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        //console.log(`🎉 深度Scan completed！Scan了 ${totalScanned} 个File，Extract了 ${totalResults} 个Project`);
    }
    
    showError(message) {
        console.error('深度ScanError:', message);
        // Can在HereAddUIPrompt
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'error');
        }
    }
    
    showSuccessNotification(message) {
        //console.log('深度ScanPrompt:', message);
        // DisplaySuccessPrompt
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'success');
        } else {
            // 备用Prompt方式
            alert(message);
        }
    }
    
    // GeneratePage存储Key - Unified使用Domain作为Key
    getPageStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // Only使用Domain作为Key，Does not include path，Ensure同一Domain下的所有Page共享存储
            const key = urlObj.hostname;
            // Replace特殊字符，EnsureKey的Valid性
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('Generate存储KeyFailed:', error);
            // 如果URLParseFailed，使用简化的Key
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }
}
