/**
 * deep scan 器 - 负责递归 deep scan feature
 */
class DeepScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        // add URL cache，避免重复 process
        this.urlContentCache = new Map();
        // add regular expression cache
        this.regexCache = {};
        // default timeout 时间（毫秒）
        this.timeout = 5000;
        // filter status
        this.filtersLoaded = false;
    }
    
    // load enhanced filter
    async loadEnhancedFilters() {
        if (this.filtersLoaded) {
            //console.log('🔍 enhanced filter already load');
            return;
        }
        
        //console.log('🔄 start load deep scan enhanced filter ...');
        
        try {
            // check 是否in extension environment in
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // load domain and phone number filter
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // initialize filter
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ domain phone number filter initialize success');
                    }
                }
                
                // load API filter
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ API filter load success');
                }
                
                this.filtersLoaded = true;
                //console.log('🎉 all filter load complete');
            } else {
                console.warn('⚠️ 非 extension environment，无法 load filter');
            }
        } catch (error) {
            console.error('❌ filter load failed:', error);
        }
    }
    
    // load filter script
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 script load success: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ script load failed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve(); // 即使 timeout 也继续 execute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load script failed: ${scriptPath}`, error);
                resolve(); // 出错时也继续 execute
            }
        });
    }
    
    // 切换 deep scan mode - use新  window system
    toggleDeepScan() {
        const configDiv = document.getElementById('deepScanConfig');
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (configDiv.style.display === 'none' || !configDiv.style.display) {
            // display configuration 面板
            configDiv.style.display = 'block';
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '🚀 start deep scan';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        } else {
            // start deep scan - use新  window system
            this.startDeepScanWindow();
        }
    }
    
    // start deep scan window
    async startDeepScanWindow() {
        //console.log('🚀 启动 deep scan window ...');
        
        try {
            // 获取 configuration parameter
            const maxDepthInput = document.getElementById('maxDepth');
            const concurrencyInput = document.getElementById('concurrency');
            const timeoutInput = document.getElementById('timeout');
            
            const maxDepth = parseInt(maxDepthInput?.value) || 2;
            const concurrency = parseInt(concurrencyInput?.value) || 8;
            const timeout = parseInt(timeoutInput?.value) || 5;
            
            // initialize deep scan window manage 器
            if (!this.srcMiner.deepScanWindow) {
                // dynamic load DeepScanWindow类
                await this.loadDeepScanWindow();
                this.srcMiner.deepScanWindow = new DeepScanWindow(this.srcMiner);
            }
            
            // 获取 current page URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法获取 current page information');
            }
            
            // 启动 deep scan window
            await this.srcMiner.deepScanWindow.createDeepScanWindow({
                maxDepth: maxDepth,
                concurrency: concurrency,
                timeout: timeout
            });
            
            // display success prompt
            this.showSuccessNotification('🚀 deep scan alreadyin新 window in启动！请查看新 open   scan page。');
            
            // hide configuration 面板
            const configDiv = document.getElementById('deepScanConfig');
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            
            if (configDiv) {
                configDiv.style.display = 'none';
            }
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归 scan';
            }
            
            if (deepScanBtn) {
                deepScanBtn.style.background = '';
            }
            
        } catch (error) {
            console.error('❌ 启动 deep scan window failed:', error);
            this.showError('启动 deep scan window failed: ' + error.message);
        }
    }
    
    // dynamic load DeepScanWindow类
    async loadDeepScanWindow() {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/scanner/DeepScanWindow.js');
                
                script.onload = () => {
                    //console.log('📦 DeepScanWindow类 load success');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('❌ DeepScanWindow类 load failed:', error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    if (typeof DeepScanWindow !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('DeepScanWindow类 load timeout'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // process from scan window   message
    handleScanWindowMessage(message, sender, sendResponse) {
        if (!this.srcMiner.deepScanWindow) {
            sendResponse({ success: false, error: 'DeepScanWindow not initialized' });
            return;
        }
        
        return this.srcMiner.deepScanWindow.handleScanWindowMessage(message, sender, sendResponse);
    }
    
    // 兼容性 method - 保持原有  deep scan feature 作to备用
    async startDeepScan() {
        //console.log('🔄 use传统 deep scan method 作to备用');
        
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scan alreadyin运行in');
            return;
        }
        
        //console.log('🚀 启动传统 deep scan ...');
        // 确保 filter already load
        await this.loadEnhancedFilters();
        
        // 获取 configuration parameter
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');
        
        // check configuration 元素是否存in
        if (!maxDepthInput || !concurrencyInput) {
            console.error('deep scan configuration 元素未找到');
            this.showError('deep scan configuration error，请 check page 元素');
            return;
        }
        
        this.srcMiner.maxDepth = parseInt(maxDepthInput.value) || 2;
        this.srcMiner.concurrency = parseInt(concurrencyInput.value) || 8;
        
        // 获取 timeout settings
        if (timeoutInput) {
            this.timeout = parseInt(timeoutInput.value) * 1000; // convertto毫秒
        } else {
            this.timeout = 5000; // default 5 seconds
        }
        
        //console.log(`settings timeout 时间: ${this.timeout/1000} seconds`);
        const scanJsFiles = scanJsFilesInput ? scanJsFilesInput.checked : true;
        const scanHtmlFiles = scanHtmlFilesInput ? scanHtmlFilesInput.checked : true;
        const scanApiFiles = scanApiFilesInput ? scanApiFilesInput.checked : true;
        
        console.log('deep scan configuration:', {
            maxDepth: this.srcMiner.maxDepth,
            concurrency: this.srcMiner.concurrency,
            timeout: this.timeout / 1000 + '秒',
            scanJsFiles,
            scanHtmlFiles,
            scanApiFiles
        });
        
        // 重置 scan status
        this.srcMiner.deepScanRunning = true;
        this.srcMiner.scannedUrls = new Set(); // useSet而do not是clear()，确保是新实例
        this.srcMiner.pendingUrls = new Set();
        this.urlContentCache.clear(); // clear URL content cache
        
        // use引用而do not是深拷贝，reduce内存use
        this.srcMiner.deepScanResults = {};
        Object.keys(this.srcMiner.results).forEach(key => {
            this.srcMiner.deepScanResults[key] = [...(this.srcMiner.results[key] || [])];
        });
        
        this.srcMiner.currentDepth = 0;
        
        const deepScanBtn = document.getElementById('deepScanBtn');
        const progressDiv = document.getElementById('deepScanProgress');
        const configDiv = document.getElementById('deepScanConfig');
        
        // update UI status
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止 scan';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            deepScanBtn.style.color = '#fff';
        }
        
        if (progressDiv) {
            // 进度条 display already remove
        }
        
        // 保持 configuration 面板 display，以便查看进度条
        if (configDiv) {
            configDiv.style.display = 'block';
            // disable configuration option，防止 scan through程in modify
            const configInputs = configDiv.querySelectorAll('input, select');
            configInputs.forEach(input => input.disabled = true);
        }
        
        try {
        // 🔥 unified化 version：force 重新 load regular expression configuration
        if (this.srcMiner.patternExtractor) {
            //console.log('🔄 deep scan unified化 version start force 重新 load regular expression configuration ...');
            
            // 清除现有 configuration
            this.srcMiner.patternExtractor.patterns = {};
            this.srcMiner.patternExtractor.customPatternsLoaded = false;
            
            // 重新 load configuration
            await this.srcMiner.patternExtractor.loadCustomPatterns();
            if (typeof this.srcMiner.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                await this.srcMiner.patternExtractor.ensureCustomPatternsLoaded();
            }
            
            //console.log('✅ deep scan unified化 version already force 重新 load regular expression configuration');
            //console.log('📊 deep scan unified化 version current 可用  regex mode:', Object.keys(this.srcMiner.patternExtractor.patterns));
            //console.log('🔍 deep scan unified化 version custom regex configuration status:', this.srcMiner.patternExtractor.customPatternsLoaded);
        } else {
            console.error('❌ deep scan unified化 version：未找到PatternExtractor实例，无法进行unified化 extract');
        }
            
            // 获取 current page information
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法获取 current page URL');
            }
            
            const baseUrl = new URL(tab.url).origin;
            const currentUrl = tab.url;
            
            console.log('🎯 deep scan 目标:', {
                baseUrl,
                currentUrl,
                maxDepth: this.srcMiner.maxDepth
            });
            
            // add current page 到already scan list
            this.srcMiner.scannedUrls.add(currentUrl);
            
            // 收集初始 scan URL list
            const initialUrls = await this.collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles);
            //console.log('📋 初始URL list (' + initialUrls.length + ' 个):', initialUrls.slice(0, 5));
            
            if (initialUrls.length === 0) {
                //console.log('⚠️ 没有找到can scan  URL');
                this.updateDeepScanProgress(0, 0, '没有找到can scan  URL');
                return;
            }
            
            // start 分层递归 scan
            await this.performLayeredScan(baseUrl, initialUrls, {
                scanJsFiles,
                scanHtmlFiles,
                scanApiFiles
            });
            
            // update 最终 result 并 save
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            this.srcMiner.saveResults();
            
            // 额外 save deep scan 专用 data 到IndexedDB
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
            console.error('❌ deep scan failed:', error);
            this.showError('deep scan failed: ' + error.message);
        } finally {
            // 重置UI status
            this.srcMiner.deepScanRunning = false;
            
            // 最终 save all data
            this.srcMiner.saveResults();
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归 scan';
                }
                deepScanBtn.style.background = '';
                deepScanBtn.style.color = '';
            }
            
            if (configDiv) {
                // 重新 enable configuration option
                const configInputs = configDiv.querySelectorAll('input, select');
                configInputs.forEach(input => input.disabled = false);
                
                // delay hide configuration 面板，让 user 看到最终进度
                setTimeout(() => {
                    configDiv.style.display = 'none';
                }, 5000);
            }
            
            if (progressDiv) {
                // 保持进度条 display 一段时间
                setTimeout(() => {
                    if (progressDiv.style.display !== 'none') {
                        progressDiv.style.display = 'none';
                    }
                }, 5000);
            }
            
            // cleanup cache
            this.urlContentCache.clear();
            
            // save scan complete status 到IndexedDB
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
    
    // 收集初始 scan URL - async version（兼容新旧 data format）
    async collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles) {
        const urls = new Set();
        
        //console.log('🔍 收集初始URL，current result:', Object.keys(this.srcMiner.results));
        
        // fromJS file in收集 - 兼容新旧 format
        if (scanJsFiles && this.srcMiner.results.jsFiles) {
            for (const jsFile of this.srcMiner.results.jsFiles) {
                // extract URL value - 兼容 object format and string format
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // fromHTML/ page URLin收集 - 兼容新旧 format
        if (scanHtmlFiles && this.srcMiner.results.urls) {
            for (const urlItem of this.srcMiner.results.urls) {
                // extract URL value - 兼容 object format and string format
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    // 只收集可能是 page  URL
                    if (this.isPageUrl(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        // fromAPI interface in收集 - 兼容新旧 format
        if (scanApiFiles) {
            // 绝对 path API
            if (this.srcMiner.results.absoluteApis) {
                for (const apiItem of this.srcMiner.results.absoluteApis) {
                    // extract URL value - 兼容 object format and string format
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            // 相对 path API
            if (this.srcMiner.results.relativeApis) {
                for (const apiItem of this.srcMiner.results.relativeApis) {
                    // extract URL value - 兼容 object format and string format
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
    
    // 判断是否to page URL
    isPageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            // use cache   regular expression
            if (!this.regexCache.resourceExtensions) {
                this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i;
            }
            
            // exclude 明显  resource file
            if (this.regexCache.resourceExtensions.test(pathname)) {
                return false;
            }
            
            // contains page 特征
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
    
    // execute 分层 scan
    async performLayeredScan(baseUrl, initialUrls, options) {
        let currentUrls = [...initialUrls];
        
        for (let depth = 1; depth <= this.srcMiner.maxDepth && this.srcMiner.deepScanRunning; depth++) {
            this.srcMiner.currentDepth = depth;
            
            if (currentUrls.length === 0) {
                //console.log(`第 ${depth} 层没有URLrequire scan`);
                break;
            }
            
            //console.log(`🔍 start 第 ${depth} 层 scan，URL count: ${currentUrls.length}`);
            this.updateDeepScanProgress(0, currentUrls.length, `第 ${depth} 层 scan`);
            
            // 分批 process URL - use optimization  批 process method
            const newUrls = await this.scanUrlBatchOptimized(currentUrls, baseUrl, options, depth);
            
            // 准备下一层 URL - useSet进行去重
            const nextUrlsSet = new Set(newUrls);
            currentUrls = Array.from(nextUrlsSet).filter(url => !this.srcMiner.scannedUrls.has(url));
            
            //console.log(`✅ 第 ${depth} 层 scan complete，发现新URL: ${currentUrls.length} 个`);
            
            // 每层 scan complete 后 force update display
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            //console.log(`🔄 第 ${depth} 层 scan complete，already update display 界面`);
            
            // 每层 scan 后释放内存
            if (typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // optimization   batch scan URL method - support实时输出
    async scanUrlBatchOptimized(urls, baseUrl, options, depth) {
        const newUrls = new Set();
        let processedCount = 0;
        const totalUrls = urls.length;
        const concurrency = this.srcMiner.concurrency;
        
        // use queue and工作 thread 池 mode，而do not是 simple  分块
        const queue = [...urls];
        const activeWorkers = new Set();
        
        // 实时 display 计数器
        let lastDisplayUpdate = 0;
        const displayUpdateInterval = 1000; // 每1 seconds最多 update 一次 display
        
        const processQueue = async () => {
            while (queue.length > 0 && this.srcMiner.deepScanRunning) {
                const url = queue.shift();
                
                // skipalready scan  URL
                if (this.srcMiner.scannedUrls.has(url)) {
                    processedCount++;
                    this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层 scan`);
                    continue;
                }
                
                // 标记toalready scan
                this.srcMiner.scannedUrls.add(url);
                
                const workerPromise = (async () => {
                    try {
                        // 获取URL content - use cache
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
                            // extract information
                            const extractedData = this.extractFromContent(content, url);
                            const hasNewData = await this.mergeDeepScanResults(extractedData);
                            
                            // 如果有新 data 且距离上次 display update 超through间隔时间，立即 update display
                            const now = Date.now();
                            if (hasNewData && (now - lastDisplayUpdate) > displayUpdateInterval) {
                                lastDisplayUpdate = now;
                                // 实时 update display
                                this.srcMiner.results = this.srcMiner.deepScanResults;
                                this.srcMiner.displayResults();
                                //console.log(`🔄 实时 update display - scan 到新 data 来源: ${url}`);
                            }
                            
                            // 收集新URL
                            const discoveredUrls = await this.collectUrlsFromContent(content, baseUrl, options);
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                    } finally {
                        processedCount++;
                        this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层 scan`);
                        activeWorkers.delete(workerPromise);
                    }
                })();
                
                activeWorkers.add(workerPromise);
                
                // 控制 concurrent 数
                if (activeWorkers.size >= concurrency) {
                    await Promise.race(Array.from(activeWorkers));
                }
            }
        };
        
        // 启动 queue process
        await processQueue();
        
        // wait all活跃工作 thread complete
        if (activeWorkers.size > 0) {
            await Promise.all(Array.from(activeWorkers));
        }
        
        return Array.from(newUrls);
    }
    
    // 获取URL content - 通throughbackground script 发送 request
    async fetchUrlContent(url) {
        try {
            //console.log(`🔥 deep scan - 准备通throughbackground script request: ${url}`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                    'Cache-Control': 'no-cache'
                },
                timeout: this.timeout
            };
            
            //console.log(`🔥 deep scan - 发送 message 到background script，URL: ${url}`);
            
            // 通throughbackground script 发送 request
            const response = await this.makeRequestViaBackground(url, requestOptions);
            
            //console.log(`🔥 deep scan - background script response: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            // 快速 filter 非 text content
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
            console.error(`无法访问 ${url}:`, error);
            return null;
        }
    }
    
    // 通throughbackground script 发送 request
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
                    // 模拟fetch response object
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
    
    // 🔥 unified化 version：from content in extract information - 完全usePatternExtractor
    extractFromContent(content, sourceUrl) {
        //console.log(`🔍 deep scan unified化 version start extract content，来源: ${sourceUrl}`);
        
        // remove content size limit，允许 process complete content
        const processedContent = content;
        
        // 🔥 unified化 version：完全usePatternExtractor进行 extract
        if (this.srcMiner.patternExtractor) {
            //console.log('✅ deep scan unified化 version：usePatternExtractor进行unified extract');
            
            try {
                // 确保 custom regex configuration already load
                if (!this.srcMiner.patternExtractor.customPatternsLoaded) {
                    //console.log('🔄 deep scan unified化 version：重新 load custom regex configuration ...');
                    this.srcMiner.patternExtractor.loadCustomPatterns();
                }
                
                // useunified PatternExtractor进行 extract
                const extractedResults = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                //console.log('📊 deep scan unified化 version extract result:', extractedResults);
                //console.log('📈 deep scan unified化 version extract 到  data type count:', Object.keys(extractedResults).length);
                
                // statistics 每种 type   count
                Object.entries(extractedResults).forEach(([type, items]) => {
                    if (Array.isArray(items) && items.length > 0) {
                        //console.log(`📋 deep scan unified化 version ${type}: ${items.length} 个项目`);
                        // 如果是 custom regex result，display 更 detailed   information
                        if (type.startsWith('custom_')) {
                            //console.log(`🎯 deep scan unified化 version custom regex ${type} match content:`, items.slice(0, 3));
                        }
                    }
                });
                
                return extractedResults;
            } catch (error) {
                console.error('❌ deep scan unified化 version extract failed:', error);
                return {};
            }
        } else {
            console.error('❌ deep scan unified化 version：PatternExtractornot initialize，无法进行unified化 extract');
            return {};
        }
    }
    
    // 🔥 unified化 version：from content in收集新 URL - usePatternExtractor extract  URL（async version，兼容新旧 format）
    async collectUrlsFromContent(content, baseUrl, options) {
        //console.log('🔍 deep scan unified化 version：from content in收集URL...');
        
        const urls = new Set();
        const { scanJsFiles, scanHtmlFiles, scanApiFiles } = options;
        
        // remove content size limit，允许 process complete content
        const processedContent = content;
        
        // 🔥 unified化 version：usePatternExtractor extract URL
        if (this.srcMiner.patternExtractor) {
            try {
                const extractedData = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                // from extract result in收集URL - 兼容新旧 format
                if (scanJsFiles && extractedData.jsFiles) {
                    for (const jsFileItem of extractedData.jsFiles) {
                        // extract URL value - 兼容 object format and string format
                        const jsFile = typeof jsFileItem === 'object' ? jsFileItem.value : jsFileItem;
                        const fullUrl = this.resolveUrl(jsFile, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanHtmlFiles && extractedData.urls) {
                    for (const urlItem of extractedData.urls) {
                        // extract URL value - 兼容 object format and string format
                        const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                        const fullUrl = this.resolveUrl(url, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && this.isValidPageUrl(url)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanApiFiles) {
                    // 收集绝对API - 兼容新旧 format
                    if (extractedData.absoluteApis) {
                        for (const apiItem of extractedData.absoluteApis) {
                            // extract URL value - 兼容 object format and string format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                    
                    // 收集相对API - 兼容新旧 format
                    if (extractedData.relativeApis) {
                        for (const apiItem of extractedData.relativeApis) {
                            // extract URL value - 兼容 object format and string format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                }
                
                //console.log(`✅ deep scan unified化 version：fromPatternExtractor收集到 ${urls.size} 个URL`);
            } catch (error) {
                console.error('❌ deep scan unified化 version：usePatternExtractor收集URL failed:', error);
            }
        }
        
        return Array.from(urls);
    }
    
    // validate page URL
    isValidPageUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // use cache   regular expression
        if (!this.regexCache.resourceExtensions) {
            this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
        }
        
        // exclude resource file
        if (this.regexCache.resourceExtensions.test(url.toLowerCase())) {
            return false;
        }
        
        return true;
    }
    
    // validate API URL - optimization version
    isValidApiUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // use cache   regular expression
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
    
    // 合并 deep scan result - optimization version，support实时输出
    async mergeDeepScanResults(newResults) {
        let hasNewData = false;
        
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.deepScanResults[key]) {
                this.srcMiner.deepScanResults[key] = [];
            }
            
            // useSet进行去重
            const existingSet = new Set(this.srcMiner.deepScanResults[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.deepScanResults[key].push(item);
                    hasNewData = true;
                }
            });
        });
        
        // 如果有新 data，立即 save 到多个位置确保 data 持久化
        if (hasNewData) {
            this.srcMiner.results = this.srcMiner.deepScanResults;
            
            // 立即 save 到 storage，useunified  storage key format
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                // useIndexedDB save deep scan result
                try {
                    if (!window.indexedDBManager) {
                        window.indexedDBManager = new IndexedDBManager();
                    }
                    
                    const urlObj = new URL(tab.url);
                    const fullUrl = `https://${urlObj.hostname}`;
                    
                    // 获取 page 标题forURL位置跟踪
                    const pageTitle = document.title || tab.title || 'Unknown Page';
                    
                    // save 普通 scan result，contains URL位置 information
                    await window.indexedDBManager.saveScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    // save deep scan result，现in也 contains 源URLand page 标题 information
                    await window.indexedDBManager.saveDeepScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    //console.log('✅ deep scan result already save 到IndexedDB');
                } catch (error) {
                    console.error('❌ save deep scan result 到IndexedDB failed:', error);
                }
            }
            
            console.log('🔄 deep scan data already save，current result count:', 
                Object.values(this.srcMiner.deepScanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0));
        }
        
        // 返回是否有新 data  标志，for实时 display 判断
        return hasNewData;
    }
    
    // 🔥 unified化 version：do not再require单独  filter process，PatternExtractoralready经 process 了all逻辑
    applyFilters(results, content, sourceUrl = '未知URL') {
        //console.log('🔥 deep scan unified化 version：skip旧  filter process，PatternExtractoralready经 process 了all extract and filter 逻辑');
        // unified化 version do not再require额外  filter process
        // all extract and filter 逻辑都already经inPatternExtractorinunified process
    }
    
    // 解析相对URLto绝对URL - optimization version
    resolveUrl(url, baseUrl) {
        try {
            if (!url) return null;
            
            // already经是completeURL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // protocol 相对URL
            if (url.startsWith('//')) {
                return new URL(baseUrl).protocol + url;
            }
            
            // 绝对 path or相对 path
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            return null;
        }
    }
    
    // check 是否to同一 domain - support子 domain and all domain settings
    async isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            
            // 获取 domain scan settings
            const domainSettings = await this.getDomainScanSettings();
            
            // 如果允许 scan all domain
            if (domainSettings.allowAllDomains) {
                //console.log(`🌐 允许all domain: ${urlObj.hostname}`);
                return true;
            }
            
            // 如果允许 scan 子 domain
            if (domainSettings.allowSubdomains) {
                const baseHostname = baseUrlObj.hostname;
                const urlHostname = urlObj.hostname;
                
                // check 是否to同一 domain or子 domain
                const isSameOrSubdomain = urlHostname === baseHostname || 
                                        urlHostname.endsWith('.' + baseHostname) ||
                                        baseHostname.endsWith('.' + urlHostname);
                
                if (isSameOrSubdomain) {
                    ////console.log(`🔗 允许子 domain: ${urlHostname} (基于 ${baseHostname})`);
                    return true;
                }
            }
            
            // default：只允许完全相同  domain
            const isSame = urlObj.hostname === baseUrlObj.hostname;
            if (isSame) {
                //console.log(`✅ 同 domain: ${urlObj.hostname}`);
            } else {
                //console.log(`❌ do not同 domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
            }
            return isSame;
            
        } catch (error) {
            console.error('domain check failed:', error);
            return false;
        }
    }
    
    // 获取 domain scan settings
    async getDomainScanSettings() {
        try {
            // 如果SettingsManager可用，use它获取 settings
            if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
                return await window.SettingsManager.getDomainScanSettings();
            }
            
            // 备用方案：directlyfromchrome.storage获取
            const result = await chrome.storage.local.get(['domainScanSettings']);
            const domainSettings = result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
            //console.log('🔍 [deep scan] fromstorage获取  domain settings:', domainSettings);
            return domainSettings;
        } catch (error) {
            console.error('获取 domain scan settings failed:', error);
            // default settings：只允许同 domain
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }
    
    // update deep scan 进度
    updateDeepScanProgress(current, total, stage) {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // display deep scan complete
    showDeepScanComplete() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '✅ deep scan complete';
        }
        deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        // 确保最终 result passive marker save
        this.srcMiner.saveResults();
        
        // save deep scan complete status 到IndexedDB
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
                console.error('save deep scan complete status failed:', error);
            }
        };
        
        saveCompletionState();
        
        setTimeout(() => {
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归 scan';
            }
            deepScanBtn.style.background = '';
        }, 3000);
        
        const totalScanned = this.srcMiner.scannedUrls.size;
        const totalResults = Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        //console.log(`🎉 deep scan complete！scan 了 ${totalScanned} 个 file，extract 了 ${totalResults} 个项目`);
    }
    
    showError(message) {
        console.error('deep scan error:', message);
        // 可以in这里 add UI prompt
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'error');
        }
    }
    
    showSuccessNotification(message) {
        //console.log('deep scan prompt:', message);
        // display success prompt
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'success');
        } else {
            // 备用 prompt 方式
            alert(message);
        }
    }
    
    // 生成 page storage key - unifieduse domain 作to key
    getPageStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只use domain 作to key，do not contains path，确保同一 domain 下 all page 共享 storage
            const key = urlObj.hostname;
            // replace 特殊字符，确保 key   valid 性
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('生成 storage key failed:', error);
            // 如果URL解析 failed，use简化  key
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }
}
