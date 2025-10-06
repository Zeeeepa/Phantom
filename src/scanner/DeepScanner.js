/**
 * deep scan器 - 负责递归deep scan功能
 */
class DeepScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        // addURL缓存，避免重复处理
        this.urlContentCache = new Map();
        // addregexexpression缓存
        this.regexCache = {};
        // 默认超时时间（毫秒）
        this.timeout = 5000;
        // through滤器state
        this.filtersLoaded = false;
    }
    
    // loadenhancedthrough滤器
    async loadEnhancedFilters() {
        if (this.filtersLoaded) {
            //console.log('🔍 enhancedthrough滤器alreadyload');
            return;
        }
        
        //console.log('🔄 startloaddeep scanenhancedthrough滤器...');
        
        try {
            // check是否in扩展environmentin
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // loaddomainandmobile phonethrough滤器
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // initializethrough滤器
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ domainmobile phonethrough滤器initializesuccess');
                    }
                }
                
                // loadAPIthrough滤器
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ APIthrough滤器loadsuccess');
                }
                
                this.filtersLoaded = true;
                //console.log('🎉 allthrough滤器loadcomplete');
            } else {
                console.warn('⚠️ 非扩展environment，无法loadthrough滤器');
            }
        } catch (error) {
            console.error('❌ through滤器loadfailed:', error);
        }
    }
    
    // loadthrough滤器脚本
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 脚本loadsuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 脚本loadfailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也继续execute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load脚本failed: ${scriptPath}`, error);
                resolve(); // 出错时也继续execute
            }
        });
    }
    
    // 切换deep scanpattern - usenew窗口系统
    toggleDeepScan() {
        const configDiv = document.getElementById('deepScanConfig');
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (configDiv.style.display === 'none' || !configDiv.style.display) {
            // 显示configuration面板
            configDiv.style.display = 'block';
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '🚀 startdeep scan';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        } else {
            // startdeep scan - usenew窗口系统
            this.startDeepScanWindow();
        }
    }
    
    // startdeep scan窗口
    async startDeepScanWindow() {
        //console.log('🚀 startdeep scan窗口...');
        
        try {
            // getconfigurationparameter
            const maxDepthInput = document.getElementById('maxDepth');
            const concurrencyInput = document.getElementById('concurrency');
            const timeoutInput = document.getElementById('timeout');
            
            const maxDepth = parseInt(maxDepthInput?.value) || 2;
            const concurrency = parseInt(concurrencyInput?.value) || 8;
            const timeout = parseInt(timeoutInput?.value) || 5;
            
            // initializedeep scan窗口管理器
            if (!this.srcMiner.deepScanWindow) {
                // 动态loadDeepScanWindowclass
                await this.loadDeepScanWindow();
                this.srcMiner.deepScanWindow = new DeepScanWindow(this.srcMiner);
            }
            
            // get当beforepage面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法get当beforepage面information');
            }
            
            // startdeep scan窗口
            await this.srcMiner.deepScanWindow.createDeepScanWindow({
                maxDepth: maxDepth,
                concurrency: concurrency,
                timeout: timeout
            });
            
            // 显示success提示
            this.showSuccessNotification('🚀 deep scanalreadyinnew窗口instart！请查看newopenscanpage面。');
            
            // 隐藏configuration面板
            const configDiv = document.getElementById('deepScanConfig');
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            
            if (configDiv) {
                configDiv.style.display = 'none';
            }
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'deep递归scan';
            }
            
            if (deepScanBtn) {
                deepScanBtn.style.background = '';
            }
            
        } catch (error) {
            console.error('❌ startdeep scan窗口failed:', error);
            this.showError('startdeep scan窗口failed: ' + error.message);
        }
    }
    
    // 动态loadDeepScanWindowclass
    async loadDeepScanWindow() {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/scanner/DeepScanWindow.js');
                
                script.onload = () => {
                    //console.log('📦 DeepScanWindowclassloadsuccess');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('❌ DeepScanWindowclassloadfailed:', error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings超时保护
                setTimeout(() => {
                    if (typeof DeepScanWindow !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('DeepScanWindowclassload超时'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 处理fromscan窗口message
    handleScanWindowMessage(message, sender, sendResponse) {
        if (!this.srcMiner.deepScanWindow) {
            sendResponse({ success: false, error: 'DeepScanWindow not initialized' });
            return;
        }
        
        return this.srcMiner.deepScanWindow.handleScanWindowMessage(message, sender, sendResponse);
    }
    
    // 兼容性方法 - keep原有deep scan功能作为备for
    async startDeepScan() {
        //console.log('🔄 use传统deep scan方法作为备for');
        
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scanalreadyin运行in');
            return;
        }
        
        //console.log('🚀 start传统deep scan...');
        // 确保through滤器alreadyload
        await this.loadEnhancedFilters();
        
        // getconfigurationparameter
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');
        
        // checkconfiguration元素是否exists
        if (!maxDepthInput || !concurrencyInput) {
            console.error('deep scanconfiguration元素未found');
            this.showError('deep scanconfiguration错误，请checkpage面元素');
            return;
        }
        
        this.srcMiner.maxDepth = parseInt(maxDepthInput.value) || 2;
        this.srcMiner.concurrency = parseInt(concurrencyInput.value) || 8;
        
        // get超时settings
        if (timeoutInput) {
            this.timeout = parseInt(timeoutInput.value) * 1000; // convert为毫秒
        } else {
            this.timeout = 5000; // 默认5秒
        }
        
        //console.log(`settings超时时间: ${this.timeout/1000}秒`);
        const scanJsFiles = scanJsFilesInput ? scanJsFilesInput.checked : true;
        const scanHtmlFiles = scanHtmlFilesInput ? scanHtmlFilesInput.checked : true;
        const scanApiFiles = scanApiFilesInput ? scanApiFilesInput.checked : true;
        
        console.log('deep scanconfiguration:', {
            maxDepth: this.srcMiner.maxDepth,
            concurrency: this.srcMiner.concurrency,
            timeout: this.timeout / 1000 + '秒',
            scanJsFiles,
            scanHtmlFiles,
            scanApiFiles
        });
        
        // 重置scanstate
        this.srcMiner.deepScanRunning = true;
        this.srcMiner.scannedUrls = new Set(); // useSet而not是clear()，确保是new实例
        this.srcMiner.pendingUrls = new Set();
        this.urlContentCache.clear(); // 清空URL内容缓存
        
        // use引for而not是深拷贝，reduce内存use
        this.srcMiner.deepScanResults = {};
        Object.keys(this.srcMiner.results).forEach(key => {
            this.srcMiner.deepScanResults[key] = [...(this.srcMiner.results[key] || [])];
        });
        
        this.srcMiner.currentDepth = 0;
        
        const deepScanBtn = document.getElementById('deepScanBtn');
        const progressDiv = document.getElementById('deepScanProgress');
        const configDiv = document.getElementById('deepScanConfig');
        
        // 更newUIstate
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止scan';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            deepScanBtn.style.color = '#fff';
        }
        
        if (progressDiv) {
            // progress条显示already移除
        }
        
        // keepconfiguration面板显示，以便查看progress条
        if (configDiv) {
            configDiv.style.display = 'block';
            // 禁forconfiguration选项，防止scanthrough程in修改
            const configInputs = configDiv.querySelectorAll('input, select');
            configInputs.forEach(input => input.disabled = true);
        }
        
        try {
        // 🔥 unified化version：强制重newloadregexexpressionconfiguration
        if (this.srcMiner.patternExtractor) {
            //console.log('🔄 deep scanunified化versionstart强制重newloadregexexpressionconfiguration...');
            
            // 清除现有configuration
            this.srcMiner.patternExtractor.patterns = {};
            this.srcMiner.patternExtractor.customPatternsLoaded = false;
            
            // 重newloadconfiguration
            await this.srcMiner.patternExtractor.loadCustomPatterns();
            if (typeof this.srcMiner.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                await this.srcMiner.patternExtractor.ensureCustomPatternsLoaded();
            }
            
            //console.log('✅ deep scanunified化versionalready强制重newloadregexexpressionconfiguration');
            //console.log('📊 deep scanunified化version当before可forregexpattern:', Object.keys(this.srcMiner.patternExtractor.patterns));
            //console.log('🔍 deep scanunified化versioncustomregexconfigurationstate:', this.srcMiner.patternExtractor.customPatternsLoaded);
        } else {
            console.error('❌ deep scanunified化version：未foundPatternExtractor实例，无法进行unified化extract');
        }
            
            // get当beforepage面information
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法get当beforepage面URL');
            }
            
            const baseUrl = new URL(tab.url).origin;
            const currentUrl = tab.url;
            
            console.log('🎯 deep scan目标:', {
                baseUrl,
                currentUrl,
                maxDepth: this.srcMiner.maxDepth
            });
            
            // add当beforepage面toalreadyscan列表
            this.srcMiner.scannedUrls.add(currentUrl);
            
            // 收集initialscanURL列表
            const initialUrls = await this.collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles);
            //console.log('📋 initialURL列表 (' + initialUrls.length + ' 个):', initialUrls.slice(0, 5));
            
            if (initialUrls.length === 0) {
                //console.log('⚠️ withoutfound可scanURL');
                this.updateDeepScanProgress(0, 0, 'withoutfound可scanURL');
                return;
            }
            
            // start分层递归scan
            await this.performLayeredScan(baseUrl, initialUrls, {
                scanJsFiles,
                scanHtmlFiles,
                scanApiFiles
            });
            
            // 更new最终resultand保存
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            this.srcMiner.saveResults();
            
            // 额外保存deep scan专fordatatoIndexedDB
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
            console.error('❌ deep scanfailed:', error);
            this.showError('deep scanfailed: ' + error.message);
        } finally {
            // 重置UIstate
            this.srcMiner.deepScanRunning = false;
            
            // 最终保存alldata
            this.srcMiner.saveResults();
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'deep递归scan';
                }
                deepScanBtn.style.background = '';
                deepScanBtn.style.color = '';
            }
            
            if (configDiv) {
                // 重new启forconfiguration选项
                const configInputs = configDiv.querySelectorAll('input, select');
                configInputs.forEach(input => input.disabled = false);
                
                // 延迟隐藏configuration面板，让user看to最终progress
                setTimeout(() => {
                    configDiv.style.display = 'none';
                }, 5000);
            }
            
            if (progressDiv) {
                // keepprogress条显示一段时间
                setTimeout(() => {
                    if (progressDiv.style.display !== 'none') {
                        progressDiv.style.display = 'none';
                    }
                }, 5000);
            }
            
            // 清理缓存
            this.urlContentCache.clear();
            
            // 保存scan completestatetoIndexedDB
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
    
    // 收集initialscanURL - asyncversion（兼容new旧dataformat）
    async collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles) {
        const urls = new Set();
        
        //console.log('🔍 收集initialURL，当beforeresult:', Object.keys(this.srcMiner.results));
        
        // fromJS文件in收集 - 兼容new旧format
        if (scanJsFiles && this.srcMiner.results.jsFiles) {
            for (const jsFile of this.srcMiner.results.jsFiles) {
                // extractURLvalue - 兼容objectformatand字符串format
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // fromHTML/page面URLin收集 - 兼容new旧format
        if (scanHtmlFiles && this.srcMiner.results.urls) {
            for (const urlItem of this.srcMiner.results.urls) {
                // extractURLvalue - 兼容objectformatand字符串format
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    // 只收集可能是page面URL
                    if (this.isPageUrl(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        // fromAPI接口in收集 - 兼容new旧format
        if (scanApiFiles) {
            // 绝对路径API
            if (this.srcMiner.results.absoluteApis) {
                for (const apiItem of this.srcMiner.results.absoluteApis) {
                    // extractURLvalue - 兼容objectformatand字符串format
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            // 相对路径API
            if (this.srcMiner.results.relativeApis) {
                for (const apiItem of this.srcMiner.results.relativeApis) {
                    // extractURLvalue - 兼容objectformatand字符串format
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        const urlArray = Array.from(urls);
        //console.log(`📊 收集to ${urlArray.length} 个initialURL`);
        return urlArray;
    }
    
    // 判断是否为page面URL
    isPageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            // use缓存regexexpression
            if (!this.regexCache.resourceExtensions) {
                this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i;
            }
            
            // exclude明显资源文件
            if (this.regexCache.resourceExtensions.test(pathname)) {
                return false;
            }
            
            // containspage面特征
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
    
    // execute分层scan
    async performLayeredScan(baseUrl, initialUrls, options) {
        let currentUrls = [...initialUrls];
        
        for (let depth = 1; depth <= this.srcMiner.maxDepth && this.srcMiner.deepScanRunning; depth++) {
            this.srcMiner.currentDepth = depth;
            
            if (currentUrls.length === 0) {
                //console.log(`第 ${depth} 层withoutURLrequirescan`);
                break;
            }
            
            //console.log(`🔍 start第 ${depth} 层scan，URL数量: ${currentUrls.length}`);
            this.updateDeepScanProgress(0, currentUrls.length, `第 ${depth} 层scan`);
            
            // 分批处理URL - use优化批处理方法
            const newUrls = await this.scanUrlBatchOptimized(currentUrls, baseUrl, options, depth);
            
            // 准备下一层URL - useSet进行去重
            const nextUrlsSet = new Set(newUrls);
            currentUrls = Array.from(nextUrlsSet).filter(url => !this.srcMiner.scannedUrls.has(url));
            
            //console.log(`✅ 第 ${depth} 层scan complete，发现newURL: ${currentUrls.length} 个`);
            
            // 每层scan complete后强制更new显示
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            //console.log(`🔄 第 ${depth} 层scan complete，already更new显示界面`);
            
            // 每层scan后释放内存
            if (typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // 优化批量scanURL方法 - support实时输出
    async scanUrlBatchOptimized(urls, baseUrl, options, depth) {
        const newUrls = new Set();
        let processedCount = 0;
        const totalUrls = urls.length;
        const concurrency = this.srcMiner.concurrency;
        
        // use队列and工作线程池pattern，而not是简单分块
        const queue = [...urls];
        const activeWorkers = new Set();
        
        // 实时显示计数器
        let lastDisplayUpdate = 0;
        const displayUpdateInterval = 1000; // 每1秒最多更new一次显示
        
        const processQueue = async () => {
            while (queue.length > 0 && this.srcMiner.deepScanRunning) {
                const url = queue.shift();
                
                // skipalreadyscanURL
                if (this.srcMiner.scannedUrls.has(url)) {
                    processedCount++;
                    this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层scan`);
                    continue;
                }
                
                // 标记为alreadyscan
                this.srcMiner.scannedUrls.add(url);
                
                const workerPromise = (async () => {
                    try {
                        // getURL内容 - use缓存
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
                            // extractinformation
                            const extractedData = this.extractFromContent(content, url);
                            const hasNewData = await this.mergeDeepScanResults(extractedData);
                            
                            // if有newdata且距离上次显示更new超through间隔时间，立即更new显示
                            const now = Date.now();
                            if (hasNewData && (now - lastDisplayUpdate) > displayUpdateInterval) {
                                lastDisplayUpdate = now;
                                // 实时更new显示
                                this.srcMiner.results = this.srcMiner.deepScanResults;
                                this.srcMiner.displayResults();
                                //console.log(`🔄 实时更new显示 - scantonewdata来源: ${url}`);
                            }
                            
                            // 收集newURL
                            const discoveredUrls = await this.collectUrlsFromContent(content, baseUrl, options);
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                    } finally {
                        processedCount++;
                        this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层scan`);
                        activeWorkers.delete(workerPromise);
                    }
                })();
                
                activeWorkers.add(workerPromise);
                
                // 控制and发数
                if (activeWorkers.size >= concurrency) {
                    await Promise.race(Array.from(activeWorkers));
                }
            }
        };
        
        // start队列处理
        await processQueue();
        
        // waitall活跃工作线程complete
        if (activeWorkers.size > 0) {
            await Promise.all(Array.from(activeWorkers));
        }
        
        return Array.from(newUrls);
    }
    
    // getURL内容 - 通throughbackground脚本sendrequest
    async fetchUrlContent(url) {
        try {
            //console.log(`🔥 deep scan - 准备通throughbackground脚本request: ${url}`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                    'Cache-Control': 'no-cache'
                },
                timeout: this.timeout
            };
            
            //console.log(`🔥 deep scan - sendmessagetobackground脚本，URL: ${url}`);
            
            // 通throughbackground脚本sendrequest
            const response = await this.makeRequestViaBackground(url, requestOptions);
            
            //console.log(`🔥 deep scan - background脚本响应: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            // 快速through滤非文本内容
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
    
    // 通throughbackground脚本sendrequest
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
                    // mod拟fetch响应object
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
    
    // 🔥 unified化version：from内容inextractinformation - 完全usePatternExtractor
    extractFromContent(content, sourceUrl) {
        //console.log(`🔍 deep scanunified化versionstartextract内容，来源: ${sourceUrl}`);
        
        // 移除内容大小限制，允许处理complete内容
        const processedContent = content;
        
        // 🔥 unified化version：完全usePatternExtractor进行extract
        if (this.srcMiner.patternExtractor) {
            //console.log('✅ deep scanunified化version：usePatternExtractor进行unifiedextract');
            
            try {
                // 确保customregexconfigurationalreadyload
                if (!this.srcMiner.patternExtractor.customPatternsLoaded) {
                    //console.log('🔄 deep scanunified化version：重newloadcustomregexconfiguration...');
                    this.srcMiner.patternExtractor.loadCustomPatterns();
                }
                
                // useunifiedPatternExtractor进行extract
                const extractedResults = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                //console.log('📊 deep scanunified化versionextractresult:', extractedResults);
                //console.log('📈 deep scanunified化versionextracttodataclass型数量:', Object.keys(extractedResults).length);
                
                // 统计每种class型数量
                Object.entries(extractedResults).forEach(([type, items]) => {
                    if (Array.isArray(items) && items.length > 0) {
                        //console.log(`📋 deep scanunified化version ${type}: ${items.length} 个项目`);
                        // if是customregexresult，显示更详细information
                        if (type.startsWith('custom_')) {
                            //console.log(`🎯 deep scanunified化versioncustomregex ${type} match内容:`, items.slice(0, 3));
                        }
                    }
                });
                
                return extractedResults;
            } catch (error) {
                console.error('❌ deep scanunified化versionextractfailed:', error);
                return {};
            }
        } else {
            console.error('❌ deep scanunified化version：PatternExtractor未initialize，无法进行unified化extract');
            return {};
        }
    }
    
    // 🔥 unified化version：from内容in收集newURL - usePatternExtractorextractURL（asyncversion，兼容new旧format）
    async collectUrlsFromContent(content, baseUrl, options) {
        //console.log('🔍 deep scanunified化version：from内容in收集URL...');
        
        const urls = new Set();
        const { scanJsFiles, scanHtmlFiles, scanApiFiles } = options;
        
        // 移除内容大小限制，允许处理complete内容
        const processedContent = content;
        
        // 🔥 unified化version：usePatternExtractorextractURL
        if (this.srcMiner.patternExtractor) {
            try {
                const extractedData = this.srcMiner.patternExtractor.extractPatterns(processedContent);
                
                // fromextractresultin收集URL - 兼容new旧format
                if (scanJsFiles && extractedData.jsFiles) {
                    for (const jsFileItem of extractedData.jsFiles) {
                        // extractURLvalue - 兼容objectformatand字符串format
                        const jsFile = typeof jsFileItem === 'object' ? jsFileItem.value : jsFileItem;
                        const fullUrl = this.resolveUrl(jsFile, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanHtmlFiles && extractedData.urls) {
                    for (const urlItem of extractedData.urls) {
                        // extractURLvalue - 兼容objectformatand字符串format
                        const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                        const fullUrl = this.resolveUrl(url, baseUrl);
                        if (fullUrl && await this.isSameDomain(fullUrl, baseUrl) && this.isValidPageUrl(url)) {
                            urls.add(fullUrl);
                        }
                    }
                }
                
                if (scanApiFiles) {
                    // 收集绝对API - 兼容new旧format
                    if (extractedData.absoluteApis) {
                        for (const apiItem of extractedData.absoluteApis) {
                            // extractURLvalue - 兼容objectformatand字符串format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                    
                    // 收集相对API - 兼容new旧format
                    if (extractedData.relativeApis) {
                        for (const apiItem of extractedData.relativeApis) {
                            // extractURLvalue - 兼容objectformatand字符串format
                            const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                            const fullUrl = this.resolveUrl(api, baseUrl);
                            if (fullUrl && await this.isSameDomain(fullUrl, baseUrl)) {
                                urls.add(fullUrl);
                            }
                        }
                    }
                }
                
                //console.log(`✅ deep scanunified化version：fromPatternExtractor收集to ${urls.size} 个URL`);
            } catch (error) {
                console.error('❌ deep scanunified化version：usePatternExtractor收集URLfailed:', error);
            }
        }
        
        return Array.from(urls);
    }
    
    // validationpage面URL
    isValidPageUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // use缓存regexexpression
        if (!this.regexCache.resourceExtensions) {
            this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
        }
        
        // exclude资源文件
        if (this.regexCache.resourceExtensions.test(url.toLowerCase())) {
            return false;
        }
        
        return true;
    }
    
    // validationAPI URL - 优化version
    isValidApiUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // use缓存regexexpression
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
    
    // 合anddeep scanresult - 优化version，support实时输出
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
        
        // if有newdata，立即保存to多个位置确保data持久化
        if (hasNewData) {
            this.srcMiner.results = this.srcMiner.deepScanResults;
            
            // 立即保存tostorage，useunifiedstorage键format
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                // useIndexedDB保存deep scanresult
                try {
                    if (!window.indexedDBManager) {
                        window.indexedDBManager = new IndexedDBManager();
                    }
                    
                    const urlObj = new URL(tab.url);
                    const fullUrl = `https://${urlObj.hostname}`;
                    
                    // getpage面标题forURL位置跟踪
                    const pageTitle = document.title || tab.title || 'Unknown Page';
                    
                    // 保存普通scanresult，containsURL位置information
                    await window.indexedDBManager.saveScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    // 保存deep scanresult，现in也contains源URLandpage面标题information
                    await window.indexedDBManager.saveDeepScanResults(fullUrl, this.srcMiner.deepScanResults, tab.url, pageTitle);
                    
                    //console.log('✅ deep scanresultalready保存toIndexedDB');
                } catch (error) {
                    console.error('❌ 保存deep scanresulttoIndexedDBfailed:', error);
                }
            }
            
            console.log('🔄 deep scandataalready保存，当beforeresult数量:', 
                Object.values(this.srcMiner.deepScanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0));
        }
        
        // return是否有newdata标志，for实时显示判断
        return hasNewData;
    }
    
    // 🔥 unified化version：not再require单独through滤器处理，PatternExtractoralready经处理了all逻辑
    applyFilters(results, content, sourceUrl = '未知URL') {
        //console.log('🔥 deep scanunified化version：skip旧through滤器处理，PatternExtractoralready经处理了allextractandthrough滤逻辑');
        // unified化versionnot再require额外through滤器处理
        // allextractandthrough滤逻辑都already经inPatternExtractorinunified处理
    }
    
    // 解析相对URL为绝对URL - 优化version
    resolveUrl(url, baseUrl) {
        try {
            if (!url) return null;
            
            // already经是completeURL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // 协议相对URL
            if (url.startsWith('//')) {
                return new URL(baseUrl).protocol + url;
            }
            
            // 绝对路径or相对路径
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            return null;
        }
    }
    
    // check是否为同一domain - support子domainand全部domainsettings
    async isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            
            // getdomainscansettings
            const domainSettings = await this.getDomainScanSettings();
            
            // if允许scanalldomain
            if (domainSettings.allowAllDomains) {
                //console.log(`🌐 允许alldomain: ${urlObj.hostname}`);
                return true;
            }
            
            // if允许scan子domain
            if (domainSettings.allowSubdomains) {
                const baseHostname = baseUrlObj.hostname;
                const urlHostname = urlObj.hostname;
                
                // check是否为同一domainor子domain
                const isSameOrSubdomain = urlHostname === baseHostname || 
                                        urlHostname.endsWith('.' + baseHostname) ||
                                        baseHostname.endsWith('.' + urlHostname);
                
                if (isSameOrSubdomain) {
                    ////console.log(`🔗 允许子domain: ${urlHostname} (基于 ${baseHostname})`);
                    return true;
                }
            }
            
            // 默认：只允许完全相同domain
            const isSame = urlObj.hostname === baseUrlObj.hostname;
            if (isSame) {
                //console.log(`✅ 同domain: ${urlObj.hostname}`);
            } else {
                //console.log(`❌ not同domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
            }
            return isSame;
            
        } catch (error) {
            console.error('domaincheckfailed:', error);
            return false;
        }
    }
    
    // getdomainscansettings
    async getDomainScanSettings() {
        try {
            // ifSettingsManager可for，use它getsettings
            if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
                return await window.SettingsManager.getDomainScanSettings();
            }
            
            // 备for方案：directlyfromchrome.storageget
            const result = await chrome.storage.local.get(['domainScanSettings']);
            const domainSettings = result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
            //console.log('🔍 [deep scan] fromstoragegetdomainsettings:', domainSettings);
            return domainSettings;
        } catch (error) {
            console.error('getdomainscansettingsfailed:', error);
            // 默认settings：只允许同domain
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }
    
    // 更newdeep scanprogress
    updateDeepScanProgress(current, total, stage) {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // 显示deepscan complete
    showDeepScanComplete() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '✅ deepscan complete';
        }
        deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        // 确保最终resultby保存
        this.srcMiner.saveResults();
        
        // 保存deepscan completestatetoIndexedDB
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
                console.error('保存deepscan completestatefailed:', error);
            }
        };
        
        saveCompletionState();
        
        setTimeout(() => {
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'deep递归scan';
            }
            deepScanBtn.style.background = '';
        }, 3000);
        
        const totalScanned = this.srcMiner.scannedUrls.size;
        const totalResults = Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        //console.log(`🎉 deepscan complete！scan了 ${totalScanned} 个文件，extract了 ${totalResults} 个项目`);
    }
    
    showError(message) {
        console.error('deep scan错误:', message);
        // 可以in这里addUI提示
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'error');
        }
    }
    
    showSuccessNotification(message) {
        //console.log('deep scan提示:', message);
        // 显示success提示
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'success');
        } else {
            // 备for提示方式
            alert(message);
        }
    }
    
    // generatepage面storage键 - unifiedusedomain作为键
    getPageStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只usedomain作为键，notcontains路径，确保同一domain下allpage面共享storage
            const key = urlObj.hostname;
            // 替换special字符，确保键valid性
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('generatestorage键failed:', error);
            // ifURL解析failed，use简化键
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }
}
