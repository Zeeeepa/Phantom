/**
 * deep scan 器 - deep scan feature 负责递归
 */
class DeepScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        // URL add cache，process 避免重复
        this.urlContentCache = new Map();
        // regular expression add cache
        this.regexCache = {};
        // default timeout when 间（ seconds 毫）
        this.timeout = 5000;
        // filter status
        this.filtersLoaded = false;
    }
    
    // filter load 增强
    async loadEnhancedFilters() {
        if (this.filtersLoaded) {
            //console.log('🔍 filter load 增强已');
            return;
        }
        
        //console.log('🔄 deep scan filter start load 增强...');
        
        try {
            // check extension in no yes 在环境
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // filter domain load and 手机号
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // filter initialize
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ initialized successfully filter domain 手机号');
                    }
                }
                
                // API filter load
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ loaded successfully API filter');
                }
                
                this.filtersLoaded = true;
                //console.log('🎉 filter complete load all');
            } else {
                console.warn('⚠️ extension 非环境，filter load 无法');
            }
        } catch (error) {
            console.error('❌ failed to load filter:', error);
        }
    }
    
    // filter script load
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 loaded successfully script: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ failed to load script: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve(); // continue execute timeout 即使也
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ failed script load: ${scriptPath}`, error);
                resolve(); // continue execute error occurred when 也
            }
        });
    }
    
    // deep scan mode 切换 - window use new 系统
    toggleDeepScan() {
        const configDiv = document.getElementById('deepScanConfig');
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (configDiv.style.display === 'none' || !configDiv.style.display) {
            // configuration display 面板
            configDiv.style.display = 'block';
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '🚀 deep scan start';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        } else {
            // deep scan start - window use new 系统
            this.startDeepScanWindow();
        }
    }
    
    // deep scan start window
    async startDeepScanWindow() {
        //console.log('🚀 deep scan window 启动...');
        
        try {
            // get configuration parameters
            const maxDepthInput = document.getElementById('maxDepth');
            const concurrencyInput = document.getElementById('concurrency');
            const timeoutInput = document.getElementById('timeout');
            
            const maxDepth = parseInt(maxDepthInput?.value) || 2;
            const concurrency = parseInt(concurrencyInput?.value) || 8;
            const timeout = parseInt(timeoutInput?.value) || 5;
            
            // deep scan initialize manager window
            if (!this.srcMiner.deepScanWindow) {
                // load dynamic class DeepScanWindow
                await this.loadDeepScanWindow();
                this.srcMiner.deepScanWindow = new DeepScanWindow(this.srcMiner);
            }
            
            // URL get page current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('information get page current 无法');
            }
            
            // deep scan window 启动
            await this.srcMiner.deepScanWindow.createDeepScanWindow({
                maxDepth: maxDepth,
                concurrency: concurrency,
                timeout: timeout
            });
            
            // success hint display
            this.showSuccessNotification('🚀 deep scan window in 已在新启动！open scan page new 请查看。');
            
            // configuration hide 面板
            const configDiv = document.getElementById('deepScanConfig');
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            
            if (configDiv) {
                configDiv.style.display = 'none';
            }
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'scan 深度递归';
            }
            
            if (deepScanBtn) {
                deepScanBtn.style.background = '';
            }
            
        } catch (error) {
            console.error('❌ deep scan failed window 启动:', error);
            this.showError('deep scan failed window 启动: ' + error.message);
        }
    }
    
    // load dynamic class DeepScanWindow
    async loadDeepScanWindow() {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/scanner/DeepScanWindow.js');
                
                script.onload = () => {
                    //console.log('📦 loaded successfully class DeepScanWindow');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('❌ failed to load class DeepScanWindow:', error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    if (typeof DeepScanWindow !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('load timeout class DeepScanWindow'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // scan process window of from 自消息
    handleScanWindowMessage(message, sender, sendResponse) {
        if (!this.srcMiner.deepScanWindow) {
            sendResponse({ success: false, error: 'DeepScanWindow not initialized' });
            return;
        }
        
        return this.srcMiner.deepScanWindow.handleScanWindowMessage(message, sender, sendResponse);
    }
    
    // method 兼容性 - deep scan feature as of has 保持原作备用
    async startDeepScan() {
        //console.log('🔄 deep scan method use as 传统作备用');
        
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scan running 已在');
            return;
        }
        
        //console.log('🚀 deep scan 启动传统...');
        // filter load 确保已
        await this.loadEnhancedFilters();
        
        // get configuration parameters
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');
        
        // check configuration element no yes 存在
        if (!maxDepthInput || !concurrencyInput) {
            console.error('deep scan not found configuration element');
            this.showError('deep scan error configuration，check element page 请');
            return;
        }
        
        this.srcMiner.maxDepth = parseInt(maxDepthInput.value) || 2;
        this.srcMiner.concurrency = parseInt(concurrencyInput.value) || 8;
        
        // get settings timeout
        if (timeoutInput) {
            this.timeout = parseInt(timeoutInput.value) * 1000; // convert seconds as 毫
        } else {
            this.timeout = 5000; // 5 seconds default
        }
        
        //console.log(`settings timeout when 间: ${this.timeout/1000} seconds`);
        const scanJsFiles = scanJsFilesInput ? scanJsFilesInput.checked : true;
        const scanHtmlFiles = scanHtmlFilesInput ? scanHtmlFilesInput.checked : true;
        const scanApiFiles = scanApiFilesInput ? scanApiFilesInput.checked : true;
        
        console.log('deep scan configuration:', {
            maxDepth: this.srcMiner.maxDepth,
            concurrency: this.srcMiner.concurrency,
            timeout: this.timeout / 1000 + ' seconds',
            scanJsFiles,
            scanHtmlFiles,
            scanApiFiles
        });
        
        // scan status reset
        this.srcMiner.deepScanRunning = true;
        this.srcMiner.scannedUrls = new Set(); // use yes Set而不clear()，instance yes 确保新
        this.srcMiner.pendingUrls = new Set();
        this.urlContentCache.clear(); // URL clear content cache
        
        // use yes 引用而不深拷贝，memory use 减少
        this.srcMiner.deepScanResults = {};
        Object.keys(this.srcMiner.results).forEach(key => {
            this.srcMiner.deepScanResults[key] = [...(this.srcMiner.results[key] || [])];
        });
        
        this.srcMiner.currentDepth = 0;
        
        const deepScanBtn = document.getElementById('deepScanBtn');
        const progressDiv = document.getElementById('deepScanProgress');
        const configDiv = document.getElementById('deepScanConfig');
        
        // update status UI
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ stop scan';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            deepScanBtn.style.color = '#fff';
        }
        
        if (progressDiv) {
            // remove display record(s) 进度已
        }
        
        // configuration display 保持面板， record(s) with 便查看进度
        if (configDiv) {
            configDiv.style.display = 'block';
            // configuration options 禁用，scan in 防止过程修改
            const configInputs = configDiv.querySelectorAll('input, select');
            configInputs.forEach(input => input.disabled = true);
        }
        
        try {
        // 🔥 unified version：regular expression configuration load force re-
        if (this.srcMiner.patternExtractor) {
            //console.log('🔄 regular expression deep scan unified start configuration version load force re- ...');
            
            // clear configuration has 现
            this.srcMiner.patternExtractor.patterns = {};
            this.srcMiner.patternExtractor.customPatternsLoaded = false;
            
            // configuration load re-
            await this.srcMiner.patternExtractor.loadCustomPatterns();
            if (typeof this.srcMiner.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                await this.srcMiner.patternExtractor.ensureCustomPatternsLoaded();
            }
            
            //console.log('✅ regular expression deep scan unified configuration version load force re- 已');
            //console.log('📊 deep scan unified available regex mode version current:', Object.keys(this.srcMiner.patternExtractor.patterns));
            //console.log('🔍 custom regex deep scan unified configuration version status:', this.srcMiner.patternExtractor.customPatternsLoaded);
        } else {
            console.error('❌ deep scan unified version：not found instance PatternExtractor，unified extracted line(s) 无法进');
        }
            
            // information get page current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('URL get page current 无法');
            }
            
            const baseUrl = new URL(tab.url).origin;
            const currentUrl = tab.url;
            
            console.log('🎯 deep scan 目标:', {
                baseUrl,
                currentUrl,
                maxDepth: this.srcMiner.maxDepth
            });
            
            // add scan page current column(s) to 已表
            this.srcMiner.scannedUrls.add(currentUrl);
            
            // URL scan collected column(s) 初始表
            const initialUrls = await this.collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles);
            //console.log('📋 URL column(s) 初始表 (' + initialUrls.length + '  item(s)):', initialUrls.slice(0, 5));
            
            if (initialUrls.length === 0) {
                //console.log('⚠️ URL scan to of has 没找可');
                this.updateDeepScanProgress(0, 0, 'URL scan to of has 没找可');
                return;
            }
            
            // start scan layer(s) 分递归
            await this.performLayeredScan(baseUrl, initialUrls, {
                scanJsFiles,
                scanHtmlFiles,
                scanApiFiles
            });
            
            // save update results final 并
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            this.srcMiner.saveResults();
            
            // deep scan save data to 额外专用IndexedDB
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
            // reset status UI
            this.srcMiner.deepScanRunning = false;
            
            // save data all final
            this.srcMiner.saveResults();
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'scan 深度递归';
                }
                deepScanBtn.style.background = '';
                deepScanBtn.style.color = '';
            }
            
            if (configDiv) {
                // configuration options re- 启用
                const configInputs = configDiv.querySelectorAll('input, select');
                configInputs.forEach(input => input.disabled = false);
                
                // configuration delay hide 面板，user final to 让看进度
                setTimeout(() => {
                    configDiv.style.display = 'none';
                }, 5000);
            }
            
            if (progressDiv) {
                // display record(s) when 保持进度一段间
                setTimeout(() => {
                    if (progressDiv.style.display !== 'none') {
                        progressDiv.style.display = 'none';
                    }
                }, 5000);
            }
            
            // cleanup cache
            this.urlContentCache.clear();
            
            // scan complete save status to IndexedDB
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
    
    // URL scan collected 初始 - async version（data format 兼容新旧）
    async collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles) {
        const urls = new Set();
        
        //console.log('🔍 URL collected 初始，results current:', Object.keys(this.srcMiner.results));
        
        // file collected from in JS - format 兼容新旧
        if (scanJsFiles && this.srcMiner.results.jsFiles) {
            for (const jsFile of this.srcMiner.results.jsFiles) {
                // URL extracted 值 - object format format characters and 兼容串
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // URL collected page from in HTML/ - format 兼容新旧
        if (scanHtmlFiles && this.srcMiner.results.urls) {
            for (const urlItem of this.srcMiner.results.urls) {
                // URL extracted 值 - object format format characters and 兼容串
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    // URL collected page of yes 只可能
                    if (this.isPageUrl(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        // API interface collected from in - format 兼容新旧
        if (scanApiFiles) {
            // absolute path API
            if (this.srcMiner.results.absoluteApis) {
                for (const apiItem of this.srcMiner.results.absoluteApis) {
                    // URL extracted 值 - object format format characters and 兼容串
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            // relative path API
            if (this.srcMiner.results.relativeApis) {
                for (const apiItem of this.srcMiner.results.relativeApis) {
                    // URL extracted 值 - object format format characters and 兼容串
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        const urlArray = Array.from(urls);
        //console.log(`📊 collected to ${urlArray.length} URL item(s) 初始`);
        return urlArray;
    }
    
    // URL page as no yes 判断
    isPageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            // regular expression cache use of
            if (!this.regexCache.resourceExtensions) {
                this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i;
            }
            
            // file resource exclude of 明显
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
    
    // scan execute layer(s) 分
    async performLayeredScan(baseUrl, initialUrls, options) {
        let currentUrls = [...initialUrls];
        
        for (let depth = 1; depth <= this.srcMiner.maxDepth && this.srcMiner.deepScanRunning; depth++) {
            this.srcMiner.currentDepth = depth;
            
            if (currentUrls.length === 0) {
                //console.log(`# ${depth} URL scan layer(s) has 没需要`);
                break;
            }
            
            //console.log(`🔍 start # ${depth} scan layer(s)，URL quantity: ${currentUrls.length}`);
            this.updateDeepScanProgress(0, currentUrls.length, `# ${depth} scan layer(s)`);
            
            // URL process 分批 - process optimization method use of 批
            const newUrls = await this.scanUrlBatchOptimized(currentUrls, baseUrl, options, depth);
            
            // URL layer(s) of 准备下一 - use line(s) Set进去重
            const nextUrlsSet = new Set(newUrls);
            currentUrls = Array.from(nextUrlsSet).filter(url => !this.srcMiner.scannedUrls.has(url));
            
            //console.log(`✅ # ${depth} scan complete layer(s)，URL found 新: ${currentUrls.length}  item(s)`);
            
            // scan complete update force display layer(s) after 每
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            //console.log(`🔄 # ${depth} scan complete layer(s)，update display 已界面`);
            
            // free memory scan layer(s) after 每
            if (typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // URL scan optimization method batch of - output when 支持实
    async scanUrlBatchOptimized(urls, baseUrl, options, depth) {
        const newUrls = new Set();
        let processedCount = 0;
        const totalUrls = urls.length;
        const concurrency = this.srcMiner.concurrency;
        
        // mode use work column(s) and 队线程池，of yes 而不简单分块
        const queue = [...urls];
        const activeWorkers = new Set();
        
        // display when 实计数器
        let lastDisplayUpdate = 0;
        const displayUpdateInterval = 1000; // 1 second update display time(s) 每最多一
        
        const processQueue = async () => {
            while (queue.length > 0 && this.srcMiner.deepScanRunning) {
                const url = queue.shift();
                
                // URL skip scan of 已
                if (this.srcMiner.scannedUrls.has(url)) {
                    processedCount++;
                    this.updateDeepScanProgress(processedCount, totalUrls, `# ${depth} scan layer(s)`);
                    continue;
                }
                
                // scan marker as 已
                this.srcMiner.scannedUrls.add(url);
                
                const workerPromise = (async () => {
                    try {
                        // URL content get - cache use
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
                            // information extracted
                            const extractedData = this.extractFromContent(content, url);
                            const hasNewData = await this.mergeDeepScanResults(extractedData);
                            
                            // update data if display time(s) when has 新且距离上超过间隔间，update display 立即
                            const now = Date.now();
                            if (hasNewData && (now - lastDisplayUpdate) > displayUpdateInterval) {
                                lastDisplayUpdate = now;
                                // update display when 实
                                this.srcMiner.results = this.srcMiner.deepScanResults;
                                this.srcMiner.displayResults();
                                //console.log(`🔄 update display when 实 - scan data to from 新源: ${url}`);
                            }
                            
                            // URL collected 新
                            const discoveredUrls = await this.collectUrlsFromContent(content, baseUrl, options);
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                    } finally {
                        processedCount++;
                        this.updateDeepScanProgress(processedCount, totalUrls, `# ${depth} scan layer(s)`);
                        activeWorkers.delete(workerPromise);
                    }
                })();
                
                activeWorkers.add(workerPromise);
                
                // 控制并发数
                if (activeWorkers.size >= concurrency) {
                    await Promise.race(Array.from(activeWorkers));
                }
            }
        };
        
        // process column(s) 启动队
        await processQueue();
        
        // complete waiting all work 活跃线程
        if (activeWorkers.size > 0) {
            await Promise.all(Array.from(activeWorkers));
        }
        
        return Array.from(newUrls);
    }
    
    // URL content get - request script background send via
    async fetchUrlContent(url) {
        try {
            //console.log(`🔥 deep scan - request script background via 准备: ${url}`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                    'Cache-Control': 'no-cache'
                },
                timeout: this.timeout
            };
            
            //console.log(`🔥 deep scan - script background send to 消息，URL: ${url}`);
            
            // request script background send via
            const response = await this.makeRequestViaBackground(url, requestOptions);
            
            //console.log(`🔥 deep scan - response script background: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            // content text filter 快速非
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
    
    // request script background send via
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
                    // response object 模拟fetch
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
    
    // 🔥 unified version：content information extracted from in - use 完全PatternExtractor
    extractFromContent(content, sourceUrl) {
        //console.log(`🔍 deep scan unified start content extracted version，from 源: ${sourceUrl}`);
        
        // remove content limit 大小，content process 允许完整
        const processedContent = content;
        
        // 🔥 unified version：extracted use line(s) 完全PatternExtractor进
        if (this.srcMiner.patternExtractor) {
            //console.log('✅ deep scan unified version：extracted use line(s) PatternExtractor进统一');
            
            try {
                // custom regex configuration load 确保已
                if (!this.srcMiner.patternExtractor.customPatternsLoaded) {
                    //console.log('🔄 deep scan unified version：custom regex configuration load re- ...');
                    this.srcMiner.patternExtractor.loadCustomPatterns();
                }
                
                // extracted use line(s) of 统一PatternExtractor进
                const extractedResults = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                //console.log('📊 deep scan unified extracted results version:', extractedResults);
                //console.log('📈 deep scan unified data extracted quantity version type to of:', Object.keys(extractedResults).length);
                
                // statistics quantity type of 每种
                Object.entries(extractedResults).forEach(([type, items]) => {
                    if (Array.isArray(items) && items.length > 0) {
                        //console.log(`📋 deep scan unified version ${type}: ${items.length} project item(s)`);
                        // custom regex results if yes，information display of 更详细
                        if (type.startsWith('custom_')) {
                            //console.log(`🎯 custom regex deep scan unified version ${type} content match:`, items.slice(0, 3));
                        }
                    }
                });
                
                return extractedResults;
            } catch (error) {
                console.error('❌ deep scan unified failed extracted version:', error);
                return {};
            }
        } else {
            console.error('❌ deep scan unified version：not initialized PatternExtractor，unified extracted line(s) 无法进');
            return {};
        }
    }
    
    // 🔥 unified version：URL content collected new from in - URL extracted use of PatternExtractor（async version，format 兼容新旧）
    async collectUrlsFromContent(content, baseUrl, options) {
        //console.log('🔍 deep scan unified version：URL content collected from in ...');
        
        const urls = new Set();
        const { scanJsFiles, scanHtmlFiles, scanApiFiles } = options;
        
        // remove content limit 大小，content process 允许完整
        const processedContent = content;
        
        // 🔥 unified version：URL extracted use PatternExtractor
        if (this.srcMiner.patternExtractor) {
            try {
                const extractedData = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                // URL extracted collected results from in - format 兼容新旧
                if (scanJsFiles && extractedData.jsFiles) {
                    for (const jsFileItem of extractedData.jsFiles) {
                        // URL extracted 值 - object format format characters and 兼容串
                        const jsFile = typeof jsFileItem === 'object' ? jsFileItem.value : jsFileItem;
                        const fullUrl = this.resolveUrl(jsFile, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanHtmlFiles && extractedData.urls) {
                    for (const urlItem of extractedData.urls) {
                        // URL extracted 值 - object format format characters and 兼容串
                        const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                        const fullUrl = this.resolveUrl(url, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && this.isValidPageUrl(url)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanApiFiles) {
                    // API collected 绝对 - format 兼容新旧
                    if (extractedData.absoluteApis) {
                        for (const apiItem of extractedData.absoluteApis) {
                            // URL extracted 值 - object format format characters and 兼容串
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                    
                    // API collected 相对 - format 兼容新旧
                    if (extractedData.relativeApis) {
                        for (const apiItem of extractedData.relativeApis) {
                            // URL extracted 值 - object format format characters and 兼容串
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                }
                
                //console.log(`✅ deep scan unified version：collected to from PatternExtractor ${urls.size} URL item(s)`);
            } catch (error) {
                console.error('❌ deep scan unified version：URL failed collected use PatternExtractor:', error);
            }
        }
        
        return Array.from(urls);
    }
    
    // URL validate page
    isValidPageUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // regular expression cache use of
        if (!this.regexCache.resourceExtensions) {
            this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
        }
        
        // file resource exclude
        if (this.regexCache.resourceExtensions.test(url.toLowerCase())) {
            return false;
        }
        
        return true;
    }
    
    // API validate URL - optimization version
    isValidApiUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // regular expression cache use of
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
    
    // deep scan results 合并 - optimization version，output when 支持实
    async mergeDeepScanResults(newResults) {
        let hasNewData = false;
        
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.deepScanResults[key]) {
                this.srcMiner.deepScanResults[key] = [];
            }
            
            // use line(s) Set进去重
            const existingSet = new Set(this.srcMiner.deepScanResults[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.deepScanResults[key].push(item);
                    hasNewData = true;
                }
            });
        });
        
        // data if has 新，save data item(s) digit(s) to 立即多置确保持久化
        if (hasNewData) {
            this.srcMiner.results = this.srcMiner.deepScanResults;
            
            // save to 立即存储，format use of 统一存储键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                // deep scan save results use IndexedDB
                try {
                    if (!window.indexedDBManager) {
                        window.indexedDBManager = new IndexedDBManager();
                    }
                    
                    const urlObj = new URL(tab.url);
                    const fullUrl = `https://${urlObj.hostname}`;
                    
                    // URL get title page for digit(s) 置跟踪
                    const pageTitle = document.title || tab.title || 'Unknown Page';
                    
                    // scan results save 普通，URL information contains digit(s) 置
                    await window.indexedDBManager.saveScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    // deep scan save results，URL information contains title page and 现在也源
                    await window.indexedDBManager.saveDeepScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    //console.log('✅ deep scan saved results to IndexedDB');
                } catch (error) {
                    console.error('❌ deep scan failed save results to IndexedDB:', error);
                }
            }
            
            console.log('🔄 deep scan saved data，results quantity current:', 
                Object.values(this.srcMiner.deepScanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0));
        }
        
        // return data new no yes has 标志，display for when 实判断
        return hasNewData;
    }
    
    // 🔥 unified version：filter process of 不再需要单独，process all PatternExtractor已经了逻辑
    applyFilters(results, content, sourceUrl = 'URL 未知') {
        //console.log('🔥 deep scan unified version：filter skip process old，extracted filter process all and PatternExtractor已经了逻辑');
        // filter unified process version of 不再需要额外
        // extracted filter process all in and 逻辑都已经在PatternExtractor统一
    }
    
    // URL URL parse as 相对绝对 - optimization version
    resolveUrl(url, baseUrl) {
        try {
            if (!url) return null;
            
            // URL yes 已经完整
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // URL 协议相对
            if (url.startsWith('//')) {
                return new URL(baseUrl).protocol + url;
            }
            
            // relative path absolute path 或
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            return null;
        }
    }
    
    // domain check as no yes 同一 - all domains subdomain settings and 支持
    async isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            
            // scan settings domain get
            const domainSettings = await this.getDomainScanSettings();
            
            // scan domain all if 允许
            if (domainSettings.allowAllDomains) {
                //console.log(`🌐 domain all 允许: ${urlObj.hostname}`);
                return true;
            }
            
            // subdomain scan if 允许
            if (domainSettings.allowSubdomains) {
                const baseHostname = baseUrlObj.hostname;
                const urlHostname = urlObj.hostname;
                
                // subdomain domain check as no yes 同一或
                const isSameOrSubdomain = urlHostname === baseHostname || 
                                        urlHostname.endsWith('.' + baseHostname) ||
                                        baseHostname.endsWith('.' + urlHostname);
                
                if (isSameOrSubdomain) {
                    ////console.log(`🔗 subdomain 允许: ${urlHostname} (基于 ${baseHostname})`);
                    return true;
                }
            }
            
            // default：domain of 只允许完全相同
            const isSame = urlObj.hostname === baseUrlObj.hostname;
            if (isSame) {
                //console.log(`✅ domain 同: ${urlObj.hostname}`);
            } else {
                //console.log(`❌ domain 不同: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
            }
            return isSame;
            
        } catch (error) {
            console.error('failed domain check:', error);
            return false;
        }
    }
    
    // scan settings domain get
    async getDomainScanSettings() {
        try {
            // available if SettingsManager，get settings use 它
            if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
                return await window.SettingsManager.getDomainScanSettings();
            }
            
            // 备用方案：get directly from chrome.storage
            const result = await chrome.storage.local.get(['domainScanSettings']);
            const domainSettings = result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
            //console.log('🔍 [deep scan] domain get settings from of storage:', domainSettings);
            return domainSettings;
        } catch (error) {
            console.error('scan settings failed domain get:', error);
            // settings default：domain 只允许同
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }
    
    // deep scan update 进度
    updateDeepScanProgress(current, total, stage) {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // deep scan complete display
    showDeepScanComplete() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '✅ deep scan complete';
        }
        deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        // save results final 确保被
        this.srcMiner.saveResults();
        
        // deep scan save complete status to IndexedDB
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
                console.error('deep scan failed save complete status:', error);
            }
        };
        
        saveCompletionState();
        
        setTimeout(() => {
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'scan 深度递归';
            }
            deepScanBtn.style.background = '';
        }, 3000);
        
        const totalScanned = this.srcMiner.scannedUrls.size;
        const totalResults = Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        //console.log(`🎉 deep scan complete！scan 了 ${totalScanned} file item(s)，extracted 了 ${totalResults} project item(s)`);
    }
    
    showError(message) {
        console.error('deep scan error:', message);
        // add hint can 在这里UI
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'error');
        }
    }
    
    showSuccessNotification(message) {
        //console.log('deep scan hint:', message);
        // success hint display
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'success');
        } else {
            // hint 备用方式
            alert(message);
        }
    }
    
    // page 生成存储键 - domain use as 统一作键
    getPageStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // domain use as 只作键，path contains 不，domain page all total of 确保同一下享存储
            const key = urlObj.hostname;
            // replace special characters，of has 确保键效性
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('failed 生成存储键:', error);
            // URL parsing failed if，use of 简化键
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }
}
