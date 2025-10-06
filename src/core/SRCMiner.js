/**
 * SRCMiner 主类 - 核心 controller
 */
class SRCMiner {
    constructor() {
        this.results = {};
        this.deepScanRunning = false;
        this.scannedUrls = new Set();
        this.pendingUrls = new Set();
        this.deepScanResults = {};
        this.currentDepth = 0;
        this.maxDepth = 2;
        this.concurrency = 3;
        
        // initialize component
        this.initComponents();
        this.init();
    }
    
    // initialize 各个 component
    initComponents() {
        // initialize mode extract 器
        this.patternExtractor = new PatternExtractor();
        // 确保 load custom regex configuration（scan 与 deep scan before）
        try {
            if (this.patternExtractor && typeof this.patternExtractor.loadCustomPatterns === 'function') {
                // 首次 load
                this.patternExtractor.loadCustomPatterns().catch(err => {
                    console.error('load custom regex failed:', err);
                });
                // listen settings update，实时 refresh
                window.addEventListener('regexConfigUpdated', () => {
                    try {
                        this.patternExtractor.loadCustomPatterns().catch(err => {
                            console.error('refresh custom regex failed:', err);
                        });
                    } catch (e) {
                        console.warn('refresh custom regex abnormal:', e);
                    }
                });
            }
        } catch (e) {
            console.warn('initialize custom regex 时发生 abnormal:', e);
        }
        
        // initialize content extract 器
        this.contentExtractor = new ContentExtractor(this);
        
        // initialize deep scan 器
        this.deepScanner = new DeepScanner(this);
        
        // initialize display manage 器
        this.displayManager = new DisplayManager(this);
        
        // initialize API test 器
        this.apiTester = new ApiTester(this);
        
        //console.log('✅ all component initialize complete');
    }
    
    init() {
        // initialize 导航切换
        this.initNavigation();
        
        // initialize button event
        this.initEventListeners();
        
        // initialize window event listen
        this.initWindowEvents();
        
        // load already save   result 并 automatic scan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initialize window event listen
    initWindowEvents() {
        // listen window 焦点 event
        window.addEventListener('focus', () => {
            //console.log('🔄 window 获得焦点，重新 load data ...');
            this.loadResults().then(() => {
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            });
        });
        
        // listen page 可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                //console.log('🔄 page 变to可见，重新 load data ...');
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
            }
        });
        
        // 定期 check data complete性
        setInterval(() => {
            this.checkDataIntegrity();
        }, 5000); // 每5 seconds check 一次
    }
    
    // check data complete性
    async checkDataIntegrity() {
        try {
            // 获取 current page URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDB check data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const storedData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // 如果 storage in有 data 但内存in没有，重新 load
            if (storedData && storedData.results && 
                Object.keys(this.results || {}).length === 0) {
                //console.log('🔧 检测到 data 丢失，正in恢复...');
                await this.loadResults();
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            }
        } catch (error) {
            console.error('data complete性 check failed:', error);
        }
    }
    
    initEventListeners() {
        document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
        document.getElementById('deepScanBtn').addEventListener('click', () => this.toggleDeepScan());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        
        // batch request button
        const batchRequestBtn = document.getElementById('batchRequestBtn');
        if (batchRequestBtn) {
            batchRequestBtn.addEventListener('click', () => this.batchRequestTest());
        }
        
        // add custom API path button
        const addCustomApiBtn = document.getElementById('addCustomApiBtn');
        if (addCustomApiBtn) {
            addCustomApiBtn.addEventListener('click', () => this.addCustomApiPaths());
        }
        
        // 模态框 close button
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('requestResultModal').style.display = 'none';
            });
        }
        
        // 新 button event process
        const toggleExpandBtn = document.getElementById('toggleExpandBtn');
        if (toggleExpandBtn) {
            toggleExpandBtn.addEventListener('click', () => {
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    item.classList.toggle('collapsed');
                });
            });
        }
        
        const batchViewBtn = document.getElementById('batchViewBtn');
        if (batchViewBtn) {
            batchViewBtn.addEventListener('click', () => {
                const modal = document.getElementById('requestResultModal');
                const resultsContainer = document.getElementById('requestResults');
                resultsContainer.innerHTML = '';
                
                // 获取all scan result 并 add 到模态框
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    clone.classList.remove('collapsed');
                    resultsContainer.appendChild(clone);
                });
                
                modal.style.display = 'block';
            });
        }
        
        // copy all result button
        const copyAllResultsBtn = document.getElementById('copyAllResultsBtn');
        if (copyAllResultsBtn) {
            copyAllResultsBtn.addEventListener('click', () => {
                const results = document.getElementById('requestResults').innerText;
                navigator.clipboard.writeText(results).then(() => {
                    const textSpan = copyAllResultsBtn.querySelector('.text');
                    if (textSpan) {
                        textSpan.textContent = '✅ already copy';
                        setTimeout(() => {
                            textSpan.textContent = 'copy all result';
                        }, 2000);
                    }
                });
            });
        }
    }
    
    // initialize 导航 feature
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const pages = document.querySelectorAll('.page');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;
                
                // update 导航 status
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // update page display
                pages.forEach(page => {
                    page.classList.remove('active');
                    const pageId = `${targetPage}-page`;
                    if (page.id === pageId) {
                        page.classList.add('active');
                    }
                });
                
                // page 切换后 特殊 process
                this.handlePageSwitch(targetPage);
            });
        });
    }
    
    // process page 切换后 逻辑
    handlePageSwitch(pageName) {
        switch (pageName) {
            case 'scan':
                // 切换到 scan page 时，重新 load 并 display result
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
                break;
            case 'deep':
                // 切换到 deep scan page 时，恢复 deep scan status
                this.loadResults().then(() => {
                    this.restoreDeepScanUI();
                });
                break;
            case 'test':
                // 切换到API test page 时，update 分类 select 器
                this.loadResults().then(() => {
                    this.updateCategorySelect();
                });
                break;
            case 'about':
                // 关于 page
                break;
        }
    }
    
    // 恢复 deep scan UI status
    restoreDeepScanUI() {
        if (this.deepScanRunning) {
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            const configDiv = document.getElementById('deepScanConfig');
            const progressDiv = document.getElementById('deepScanProgress');
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止 scan';
            }
            if (deepScanBtn) {
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
                deepScanBtn.style.color = '#fff';
            }
            if (configDiv) {
                configDiv.style.display = 'block';
            }
            if (progressDiv) {
                progressDiv.style.display = 'block';
            }
        }
        
        // 如果有 deep scan result，确保 display
        if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
            this.results = this.deepScanResults;
            this.displayResults();
        }
    }
    
    // update 分类 select 器
    updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.results) return;
        
        // save current 选in  value
        const currentValue = categorySelect.value;
        
        // clear 现有 option
        categorySelect.innerHTML = '';
        
        // add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请 select 要 test  分类';
        categorySelect.appendChild(defaultOption);
        
        // add 有 data  分类
        const categories = [
            { key: 'customApis', title: '🔧 custom API path' },
            { key: 'absoluteApis', title: '🔗 绝对 path API' },
            { key: 'relativeApis', title: '📁 相对 path API' },
            { key: 'jsFiles', title: '📜 JS file' },
            { key: 'cssFiles', title: '🎨 CSS file' },
            { key: 'images', title: '🖼️ image file' },
            { key: 'urls', title: '🔗 completeURL' },
            { key: 'domains', title: '🌐 domain' },
            { key: 'paths', title: '📂 path' }
        ];
        
        categories.forEach(category => {
            const items = this.results[category.key] || [];
            if (items.length > 0) {
                const option = document.createElement('option');
                option.value = category.key;
                option.textContent = `${category.title} (${items.length})`;
                categorySelect.appendChild(option);
            }
        });
        
        // 恢复之before选in  value（如果仍然存in）
        if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
            categorySelect.value = currentValue;
        }
    }
    
    // start scan
    async startScan(silent = false) {
        if (!silent) {
            //console.log('🔍 start scan page ...');
        }
        
        try {
            // 发送 message 到content script进行 scan
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                throw new Error('无法获取 current page information');
            }
            
            // check 是否是 valid  web页URL
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                if (!silent) {
                    alert('无法 scan system page，请in普通web页上use此 feature');
                }
                return;
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo' });
            
            if (response) {
                //console.log('🔍 [SCAN LOG] received原始 scan result');
                //console.log('🔍 [SCAN LOG] 原始 result statistics:', this.getResultsStats(response));
                
                // in scan 阶段就应用filter器
                //console.log('🔍 [SCAN LOG] start 应用filter器到 scan result ...');
                this.results = await this.applyFiltersToScanResults(response);
                //console.log('🔍 [SCAN LOG] filter后 result statistics:', this.getResultsStats(this.results));
                //console.log('✅ [SCAN LOG] filter器应用 complete');
                
                // clear deep scan result，避免旧 data 干扰
                this.deepScanResults = {};
                //console.log('🔍 [SCAN LOG] already clear deep scan result cache');
                
                await this.displayResults();
                
                // 确保 save 操作passive marker execute
                //console.log('🔍 [SCAN LOG] 准备调用 saveResults()...');
                try {
                    await this.saveResults();
                    //console.log('✅ [SCAN LOG] saveResults() 调用 complete');
                } catch (saveError) {
                    console.error('❌ [SCAN LOG] saveResults() 调用 failed:', saveError);
                }
                
                // update 分类 select 器
                this.updateCategorySelect();
                
                if (!silent) {
                    //console.log('✅ [SCAN LOG] scan complete');
                }
            } else {
                throw new Error('未received scan result');
            }
        } catch (error) {
            console.error('❌ [SCAN LOG] scan failed:', error);
            if (!silent) {
                alert('scan failed: ' + error.message);
            }
        }
    }
    
    // in scan 阶段应用filter器
    async applyFiltersToScanResults(rawResults) {
        try {
            //console.log('🔍 [FILTER LOG] start 应用filter器...');
            //console.log('🔍 [FILTER LOG] 原始 result statistics:', this.getResultsStats(rawResults));
            
            // 确保filter器already load
            await this.loadFiltersIfNeeded();
            
            // 如果filter器do not可用，返回原始 result
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.warn('⚠️ [FILTER LOG] filter器not load，返回原始 scan result');
                return rawResults;
            }
            
            console.log('🔍 [FILTER LOG] filter器 status:', {
                domainPhoneFilter: !!window.domainPhoneFilter,
                apiFilter: !!window.apiFilter
            });
            
            // 创建filter后  result object
            const filteredResults = {};
            
            // useAPIfilter器 process path type data
            if (window.apiFilter) {
                //console.log('🔍 [FILTER LOG] useAPIfilter器 process path data ...');
                const resultsSet = window.apiFilter.createEmptyResultSet();
                
                // process 各种 path type
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        //console.log(`🔍 [FILTER LOG] process ${category}: ${rawResults[category].length} 个项目`);
                        rawResults[category].forEach(item => {
                            if (item && typeof item === 'string') {
                                window.apiFilter.filterAPI(item, resultsSet);
                            }
                        });
                    }
                });
                
                // 将filter后 SetconverttoArray
                Object.keys(resultsSet).forEach(key => {
                    if (resultsSet[key] instanceof Set) {
                        filteredResults[key] = Array.from(resultsSet[key]);
                        //console.log(`🔍 [FILTER LOG] APIfilter器 process ${key}: ${filteredResults[key].length} 个项目`);
                    } else if (Array.isArray(resultsSet[key])) {
                        filteredResults[key] = resultsSet[key];
                        //console.log(`🔍 [FILTER LOG] APIfilter器 process ${key}: ${filteredResults[key].length} 个项目`);
                    }
                });
            } else {
                // 如果没有APIfilter器，directly copy path type data
                //console.log('⚠️ [FILTER LOG] APIfilter器do not可用，directly copy path data');
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // use domain and phone number filter器 process 敏感 information
            if (window.domainPhoneFilter) {
                //console.log('🔍 [FILTER LOG] use domain phone number filter器 process 敏感 information ...');
                
                // filter domain
                if (rawResults.domains && Array.isArray(rawResults.domains)) {
                    //console.log(`🔍 [FILTER LOG] filter domain: ${rawResults.domains.length} -> `, rawResults.domains.slice(0, 5));
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(rawResults.domains);
                    //console.log(`🔍 [FILTER LOG] domain filter result: ${filteredResults.domains.length} 个 valid domain`);
                }
                
                // filter子 domain
                if (rawResults.subdomains && Array.isArray(rawResults.subdomains)) {
                    //console.log(`🔍 [FILTER LOG] filter子 domain: ${rawResults.subdomains.length} 个`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(rawResults.subdomains);
                    //console.log(`🔍 [FILTER LOG] 子 domain filter result: ${filteredResults.subdomains.length} 个 valid 子 domain`);
                }
                
                // filter email
                if (rawResults.emails && Array.isArray(rawResults.emails)) {
                    //console.log(`🔍 [FILTER LOG] filter email: ${rawResults.emails.length} 个`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(rawResults.emails);
                    //console.log(`🔍 [FILTER LOG] email filter result: ${filteredResults.emails.length} 个 valid email`);
                }
                
                // filter phone number
                if (rawResults.phoneNumbers && Array.isArray(rawResults.phoneNumbers)) {
                    //console.log(`🔍 [FILTER LOG] filter phone number: ${rawResults.phoneNumbers.length} 个`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(rawResults.phoneNumbers, true);
                    //console.log(`🔍 [FILTER LOG] phone number filter result: ${filteredResults.phoneNumbers.length} 个 valid phone number`);
                }
            } else {
                // 如果没有 domain phone number filter器，directly copy 敏感 information
                //console.log('⚠️ [FILTER LOG] domain phone number filter器do not可用，directly copy 敏感 information');
                const sensitiveCategories = ['domains', 'subdomains', 'emails', 'phoneNumbers'];
                sensitiveCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // keep其他not process  类别（directly copy）
            const otherCategories = [
                'ipAddresses', 'sensitiveKeywords', 'comments', 'parameters', 
                'credentials', 'cookies', 'idKeys', 'companies', 'jwts', 'githubUrls',
                'modulePaths', 'vueFiles', 'audios', 'videos', 'idcards', 'ports'
            ];
            
            otherCategories.forEach(category => {
                if (rawResults[category] && Array.isArray(rawResults[category])) {
                    filteredResults[category] = [...rawResults[category]];
                }
            });
            
            //console.log('✅ [FILTER LOG] filter complete，最终 result statistics:', this.getResultsStats(filteredResults));
            
            // 标记 result alreadyfilter
            filteredResults._filtered = true;
            
            return filteredResults;
            
        } catch (error) {
            console.error('❌ [FILTER LOG] 应用filter器 failed:', error);
            console.error('❌ [FILTER LOG] error 堆 stack:', error.stack);
            return rawResults; // 出错时返回原始 result
        }
    }
    
    // load filter器（如果require）
    async loadFiltersIfNeeded() {
        try {
            // check 是否already经 load filter
            if (window.domainPhoneFilter && window.apiFilter) {
                return;
            }
            
            //console.log('🔄 start load scan filter器...');
            
            // load domain and phone number filter器
            if (!window.domainPhoneFilter) {
                await this.loadFilterScript('filters/domain-phone-filter.js');
                
                if (typeof DomainPhoneFilter !== 'undefined') {
                    window.domainPhoneFilter = new DomainPhoneFilter();
                    //console.log('✅ domain phone number filter器 initialize success');
                }
            }
            
            // load APIfilter器
            if (!window.apiFilter) {
                await this.loadFilterScript('filters/api-filter.js');
                
                if (typeof APIFilter !== 'undefined') {
                    window.apiFilter = new APIFilter();
                    //console.log('✅ APIfilter器 initialize success');
                }
            }
            
        } catch (error) {
            console.error('❌ filter器 load failed:', error);
        }
    }
    
    // load filter器 script
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 filter器 script load success: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ filter器 script load failed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve();
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load filter器 script failed: ${scriptPath}`, error);
                resolve();
            }
        });
    }
    
    // 获取 result statistics
    getResultsStats(results) {
        const stats = {};
        let total = 0;
        
        Object.keys(results || {}).forEach(key => {
            const count = Array.isArray(results[key]) ? results[key].length : 0;
            stats[key] = count;
            total += count;
        });
        
        stats.total = total;
        return stats;
    }
    
    async autoScanIfNeeded() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // check 是否是 valid  web页URL
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                //console.log('skip system page   automatic scan');
                return;
            }
            
            // update current scan domain display
            this.updateCurrentDomain(tab.url);
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDB check 上次 scan 时间
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const scanData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // 如果没有 scan through current page，or者超through5分钟，则 automatic scan
            const now = Date.now();
            const lastScanTime = scanData ? scanData.timestamp : 0;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - lastScanTime > fiveMinutes) {
                setTimeout(() => {
                    this.startScan(true); // 静默 scan
                }, 2000);
            }
        } catch (error) {
            console.error('automatic scan check failed:', error);
        }
    }
    
    updateCurrentDomain(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const protocol = urlObj.protocol;
            const port = urlObj.port ? `:${urlObj.port}` : '';
            
            const domainDisplay = document.getElementById('currentDomain');
            if (domainDisplay) {
                domainDisplay.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; opacity: 0.8;">正in scan:</span>
                        <span style="color: #00d4aa; font-weight: 600;">${protocol}//${domain}${port}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('update domain display failed:', error);
        }
    }
    
    async clearResults() {
        // confirm clear 操作
        if (!confirm('确定要 clear current page   scan data 吗？此操作do not可恢复。')) {
            return;
        }
        
        try {
            // 获取 current page URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showNotification('无法获取 current page URL', 'error');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // clear 内存in  data
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.deepScanRunning = false;
            this.currentDepth = 0;
            
            // clear 界面 display
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDB clear current page 相关  data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            await window.indexedDBManager.deleteScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanState(fullUrl);
            
            // 重置 deep scan UI status
            this.resetDeepScanUI();
            
            // 重置分类 select 器
            this.updateCategorySelect();
            
            // display clear success prompt
            this.showNotification(`page ${urlObj.hostname}   scan data already clear`, 'success');
            
            //console.log(`✅ page ${urlObj.hostname}   scan data already clear`);
            
        } catch (error) {
            console.error('❌ clear data failed:', error);
            this.showNotification('clear data failed: ' + error.message, 'error');
        }
    }
    
    // 重置 deep scan UI status
    resetDeepScanUI() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn?.querySelector('.text');
        const configDiv = document.getElementById('deepScanConfig');
        const progressDiv = document.getElementById('deepScanProgress');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '🚀 start deep scan';
        }
        if (deepScanBtn) {
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
            deepScanBtn.style.color = '#00d4aa';
        }
        if (configDiv) {
            configDiv.style.display = 'none';
        }
        if (progressDiv) {
            progressDiv.style.display = 'none';
            progressDiv.innerHTML = '';
        }
        
        // 重置 deep scan 相关  input
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        if (maxDepthInput) maxDepthInput.value = '2';
        if (concurrencyInput) concurrencyInput.value = '3';
    }
    
    // display notification
    showNotification(message, type = 'info') {
        // 创建 notification 元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings style
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '6px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = '500';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        notification.style.animation = 'slideIn 0.3s ease';
        
        // root 据 type settings color
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#00d4aa';
                notification.style.color = '#fff';
                break;
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                notification.style.color = '#fff';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f39c12';
                notification.style.color = '#fff';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
                notification.style.color = '#fff';
        }
        
        // add 到 page
        document.body.appendChild(notification);
        
        // 3 seconds后 automatic remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    async saveResults() {
        try {
            // 获取 current page URL作to storage key
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法获取 current page URL，skip save');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            //console.log('💾 [SAVE LOG] start save result ...');
            //console.log('💾 [SAVE LOG] current this.results statistics:', this.getResultsStats(this.results));
            //console.log('💾 [SAVE LOG] current this.deepScanResults statistics:', this.getResultsStats(this.deepScanResults));
            
            // 确定要 save  最终 result
            let finalResults = {};
            
            // 如果有普通 scan result，directlyuse（already经filterthrough）
            if (this.results && Object.keys(this.results).length > 0) {
                //console.log('💾 [SAVE LOG] use普通 scan result 作tobasic');
                finalResults = { ...this.results };
            }
            
            // 如果有 deep scan result，require先filter再合并
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                //console.log('💾 [SAVE LOG] process deep scan result ...');
                
                // 先对 deep scan result 应用filter器
                const filteredDeepResults = await this.applyFiltersToScanResults(this.deepScanResults);
                //console.log('💾 [SAVE LOG] deep scan result filter后 statistics:', this.getResultsStats(filteredDeepResults));
                
                // 合并filter后  result
                finalResults = this.mergeResults(finalResults, filteredDeepResults);
                //console.log('💾 [SAVE LOG] 合并后最终 result statistics:', this.getResultsStats(finalResults));
            }
            
            // save 最终 filter后 result 到IndexedDB
            if (Object.keys(finalResults).length > 0) {
                const itemCount = Object.values(finalResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                //console.log(`💾 [SAVE LOG] 最终 save 到 IndexedDB，共 ${itemCount} 条filter后 记录`);
                
                // validate save   data
                const domainCount = finalResults.domains ? finalResults.domains.length : 0;
                //console.log(`💾 [SAVE LOG] validate：save   domain count = ${domainCount}`);
                
                // useIndexedDB save 普通 scan result
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                // 构造complete URLfor save
                const fullUrl = `https://${hostname}`;
                
                // 获取 page 标题forURL位置跟踪
                const pageTitle = document.title || tab.title || 'Unknown Page';
                
                // save result 时 contains URL位置 information
                await window.indexedDBManager.saveScanResults(fullUrl, finalResults, tab.url, pageTitle);
                //console.log(`✅ [SAVE LOG] IndexedDB save complete: ${hostname}，contains URL位置 information`);
            } else {
                //console.log('💾 [SAVE LOG] 没有 valid result require save');
            }
            
            // useIndexedDB save deep scan status
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ [SAVE LOG] deep scan status save 到IndexedDB complete: ${hostname}`);
            
            // 如果有 deep scan result，也 save 到IndexedDB
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log(`✅ [SAVE LOG] deep scan result save 到IndexedDB complete: ${hostname}`);
            }
            
        } catch (error) {
            console.error('❌ [SAVE LOG] data save failed:', error);
        }
    }
    
    // 合并filter后  scan result（确保合并  data 也是filterthrough ）
    async mergeFilteredResults(existingResults, newResults) {
        //console.log('🔍 [MERGE LOG] start 合并filter后  result ...');
        //console.log('🔍 [MERGE LOG] 现有 result statistics:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE LOG] 新 result statistics:', this.getResultsStats(newResults));
        
        // 如果新 result 还没有经throughfilter，先filter
        let filteredNewResults = newResults;
        if (newResults && !newResults._filtered) {
            //console.log('⚠️ [MERGE LOG] 新 result 未filter，正in应用filter器...');
            filteredNewResults = await this.applyFiltersToScanResults(newResults);
            filteredNewResults._filtered = true; // 标记alreadyfilter
            //console.log('✅ [MERGE LOG] 新 result filter complete:', this.getResultsStats(filteredNewResults));
        } else {
            //console.log('✅ [MERGE LOG] 新 result alreadyfilter，directly合并');
        }
        
        const mergedResults = {};
        const categories = [
            'absoluteApis', 'relativeApis', 'modulePaths', 'domains', 'urls', 
            'images', 'jsFiles', 'cssFiles', 'emails', 'phoneNumbers', 
            'ipAddresses', 'sensitiveKeywords', 'comments', 'paths', 
            'parameters', 'credentials', 'cookies', 'idKeys', 'companies', 
            'jwts', 'githubUrls', 'vueFiles', 'subdomains', 'audios', 'videos', 
            'idcards', 'ports'
        ];
        
        categories.forEach(category => {
            const existingItems = existingResults[category] || [];
            const newItems = filteredNewResults[category] || [];
            
            // useSet去重，然后合并
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        // 标记合并后  result alreadyfilter
        mergedResults._filtered = true;
        
        //console.log('✅ [MERGE LOG] filter后 result 合并 complete，最终 statistics:', this.getResultsStats(mergedResults));
        return mergedResults;
    }
    
    // 合并 scan result  辅助 method
    mergeResults(existingResults, newResults) {
        //console.log('🔍 [MERGE-SIMPLE LOG] start simple 合并 result ...');
        //console.log('🔍 [MERGE-SIMPLE LOG] 现有 result statistics:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE-SIMPLE LOG] 新 result statistics:', this.getResultsStats(newResults));
        
        const mergedResults = {};
        const categories = [
            'customApis', 'absoluteApis', 'relativeApis', 'modulePaths', 'domains', 'urls', 
            'images', 'jsFiles', 'cssFiles', 'emails', 'phoneNumbers', 
            'ipAddresses', 'sensitiveKeywords', 'comments', 'paths', 
            'parameters', 'credentials', 'cookies', 'idKeys', 'companies', 
            'jwts', 'githubUrls', 'vueFiles'
        ];
        
        categories.forEach(category => {
            const existingItems = existingResults[category] || [];
            const newItems = newResults[category] || [];
            
            // useSet去重，然后合并
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE-SIMPLE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        //console.log('✅ [MERGE-SIMPLE LOG] simple 合并 complete，最终 statistics:', this.getResultsStats(mergedResults));
        console.warn('⚠️ [MERGE-SIMPLE LOG] note：此 method 未应用filter器，可能 contains 未filter data');
        
        return mergedResults;
    }
    
    async loadResults() {
        try {
            // 获取 current page URL作to storage key
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法获取 current page URL，skip load');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            console.log(`🔄 [LOAD LOG] 正in load page data: ${hostname}`);
            
            // fromIndexedDB load 普通 scan result
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造complete URLfor load
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            // fix：正确 process 新  data 结构，data storage in results 属性in
            let loadedData = null;
            if (loadedDataWrapper && loadedDataWrapper.results) {
                // check 是否是新 嵌套结构
                if (loadedDataWrapper.results.results) {
                    // 新 format：data in results.results in
                    loadedData = loadedDataWrapper.results.results;
                } else {
                    // 旧 format：data directlyin results in
                    loadedData = loadedDataWrapper.results;
                }
            }
            
            if (loadedData && typeof loadedData === 'object') {
                const itemCount = Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const domainCount = loadedData.domains ? loadedData.domains.length : 0;
                
                //console.log(`🔄 [LOAD LOG] fromIndexedDB load data statistics:`, this.getResultsStats(loadedData));
                //console.log(`🔄 [LOAD LOG] storage in domain count: ${domainCount}`);
                
                // check data 是否already经filterthrough
                if (loadedData._filtered) {
                    //console.log(`✅ [LOAD LOG] data alreadyfilter，directlyuse`);
                    this.results = loadedData;
                    this.deepScanResults = loadedData;
                } else {
                    //console.log(`⚠️ [LOAD LOG] data 未filter，重新应用filter器...`);
                    // 对 load   data 重新应用filter器
                    this.results = await this.applyFiltersToScanResults(loadedData);
                    this.deepScanResults = this.results;
                    
                    // 重新 save filter后  data
                    await this.saveResults();
                    //console.log(`✅ [LOAD LOG] already重新filter并 save data`);
                }
                
                //console.log(`✅ [LOAD LOG] 最终 load data statistics:`, this.getResultsStats(this.results));
                this.displayResults();
            } else {
                //console.log(`⚠️ [LOAD LOG] page ${hostname} 未找到 valid   scan data`);
            }
            
            // fromIndexedDB恢复 deep scan status
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                console.log('🔄 [LOAD LOG] fromIndexedDB恢复 deep scan status:', {
                    running: this.deepScanRunning,
                    scannedCount: this.scannedUrls.size,
                    depth: this.currentDepth
                });
            }
            
            // 尝试fromIndexedDB load deep scan result
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            if (deepScanDataWrapper && deepScanDataWrapper.results) {
                const deepScanData = deepScanDataWrapper.results;
                const deepItemCount = Object.values(deepScanData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                
                // 如果 deep scan result 比普通 scan result 更complete，use deep scan result
                if (deepItemCount > 0) {
                    const currentItemCount = loadedData ? Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;
                    if (deepItemCount > currentItemCount) {
                        this.results = deepScanData;
                        this.deepScanResults = deepScanData;
                        console.log(`🔄 [LOAD LOG] useIndexedDB deep scan result，共 ${deepItemCount} 条记录`);
                        this.displayResults();
                    }
                }
            }
        } catch (error) {
            console.error('❌ [LOAD LOG] load result failed:', error);
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
    
    // display result - useDisplayManager
    async displayResults() {
        if (this.displayManager) {
            await this.displayManager.displayResults();
        } else {
            console.error('DisplayManagernot initialize');
        }
    }
    
    // batch request test - useApiTester
    async batchRequestTest() {
        if (this.apiTester) {
            await this.apiTester.batchRequestTest();
        } else {
            console.error('ApiTesternot initialize');
            alert('API test 器not initialize，无法 execute test');
        }
    }
    
        // add custom API path
    addCustomApiPaths() {
        const customApiPathsInput = document.getElementById('customApiPaths');
        if (!customApiPathsInput) {
            console.error('找do not到 custom API path input');
            return;
        }
        
        const customApiPaths = customApiPathsInput.value.trim();
        if (!customApiPaths) {
            alert('请输入 custom API path，每行一个 path');
            return;
        }
        
        // 解析 custom API path
        const paths = this.apiTester.parseCustomApiPaths(customApiPaths);
        if (paths.length === 0) {
            alert('请输入 valid  API path');
            return;
        }
        
        // 将 custom API path add 到 scan result in
        if (!this.results.customApis) {
            this.results.customApis = [];
        }
        
        // useSet进行去重
        const existingSet = new Set(this.results.customApis);
        let addedCount = 0;
        
        paths.forEach(path => {
            if (!existingSet.has(path)) {
                this.results.customApis.push(path);
                existingSet.add(path);
                addedCount++;
            }
        });
        
        // save result 到 storage
        this.saveResults();
        
        // 重新 display result
        this.displayResults();
        
        // display add success   prompt
        const message = `success add ${addedCount} 个 custom API path 到 scan result in:\n${paths.join('\n')}`;
        alert(message);
        
        // clear input
        customApiPathsInput.value = '';
        
        //console.log(`✅ add 了 ${addedCount} 个 custom API path 到 scan result:`, paths);
    }
    
    // 切换 deep scan - useDeepScanner
    toggleDeepScan() {
        if (this.deepScanner) {
            this.deepScanner.toggleDeepScan();
        } else {
            console.error('DeepScannernot initialize');
            alert('deep scan 器not initialize，无法 execute scan');
        }
    }
}
