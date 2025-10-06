/**
 * SRCMiner 主Class - 核心控制器
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
        
        // InitializeGroup件
        this.initComponents();
        this.init();
    }
    
    // Initialize各个Group件
    initComponents() {
        // InitializePatternExtract器
        this.patternExtractor = new PatternExtractor();
        // EnsureLoadCustom正则Configuration（Scan与深度ScanBefore）
        try {
            if (this.patternExtractor && typeof this.patternExtractor.loadCustomPatterns === 'function') {
                // 首次Load
                this.patternExtractor.loadCustomPatterns().catch(err => {
                    console.error('LoadCustom正则Failed:', err);
                });
                // ListenSettingsUpdate，实时刷新
                window.addEventListener('regexConfigUpdated', () => {
                    try {
                        this.patternExtractor.loadCustomPatterns().catch(err => {
                            console.error('刷新Custom正则Failed:', err);
                        });
                    } catch (e) {
                        console.warn('刷新Custom正则异常:', e);
                    }
                });
            }
        } catch (e) {
            console.warn('InitializeCustom正则时发生异常:', e);
        }
        
        // InitializeContent extraction器
        this.contentExtractor = new ContentExtractor(this);
        
        // Initialize深度Scan器
        this.deepScanner = new DeepScanner(this);
        
        // InitializeDisplay管理器
        this.displayManager = new DisplayManager(this);
        
        // InitializeAPI Testing器
        this.apiTester = new ApiTester(this);
        
        //console.log('✅ 所有Group件InitializeComplete');
    }
    
    init() {
        // Initialize导航切换
        this.initNavigation();
        
        // Initialize按钮事件
        this.initEventListeners();
        
        // Initialize窗口事件Listen
        this.initWindowEvents();
        
        // LoadSaved的ResultAndAutoScan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // Initialize窗口事件Listen
    initWindowEvents() {
        // Listen窗口焦点事件
        window.addEventListener('focus', () => {
            //console.log('🔄 窗口获得焦点，ReloadData...');
            this.loadResults().then(() => {
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            });
        });
        
        // ListenPage可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                //console.log('🔄 Page变为可见，ReloadData...');
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
            }
        });
        
        // 定期CheckDataComplete性
        setInterval(() => {
            this.checkDataIntegrity();
        }, 5000); // Every5 secondsCheck一次
    }
    
    // CheckDataComplete性
    async checkDataIntegrity() {
        try {
            // GetCurrentPageURL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDBCheckData
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const storedData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // 如果存储中有Data但内存中No，Reload
            if (storedData && storedData.results && 
                Object.keys(this.results || {}).length === 0) {
                //console.log('🔧 Detect到Data丢失，In progress恢复...');
                await this.loadResults();
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            }
        } catch (error) {
            console.error('DataComplete性CheckFailed:', error);
        }
    }
    
    initEventListeners() {
        document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
        document.getElementById('deepScanBtn').addEventListener('click', () => this.toggleDeepScan());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        
        // BatchRequest按钮
        const batchRequestBtn = document.getElementById('batchRequestBtn');
        if (batchRequestBtn) {
            batchRequestBtn.addEventListener('click', () => this.batchRequestTest());
        }
        
        // AddCustomAPIPath按钮
        const addCustomApiBtn = document.getElementById('addCustomApiBtn');
        if (addCustomApiBtn) {
            addCustomApiBtn.addEventListener('click', () => this.addCustomApiPaths());
        }
        
        // 模态框Close按钮
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('requestResultModal').style.display = 'none';
            });
        }
        
        // 新按钮事件Process
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
                
                // Get所有Scan resultsAndAdd到模态框
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    clone.classList.remove('collapsed');
                    resultsContainer.appendChild(clone);
                });
                
                modal.style.display = 'block';
            });
        }
        
        // Copy所有Result按钮
        const copyAllResultsBtn = document.getElementById('copyAllResultsBtn');
        if (copyAllResultsBtn) {
            copyAllResultsBtn.addEventListener('click', () => {
                const results = document.getElementById('requestResults').innerText;
                navigator.clipboard.writeText(results).then(() => {
                    const textSpan = copyAllResultsBtn.querySelector('.text');
                    if (textSpan) {
                        textSpan.textContent = '✅ Copied';
                        setTimeout(() => {
                            textSpan.textContent = 'CopyAllResult';
                        }, 2000);
                    }
                });
            });
        }
    }
    
    // Initialize导航功能
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const pages = document.querySelectorAll('.page');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;
                
                // Update导航Status
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // UpdatePageDisplay
                pages.forEach(page => {
                    page.classList.remove('active');
                    const pageId = `${targetPage}-page`;
                    if (page.id === pageId) {
                        page.classList.add('active');
                    }
                });
                
                // Page切换After的特殊Process
                this.handlePageSwitch(targetPage);
            });
        });
    }
    
    // ProcessPage切换After的逻辑
    handlePageSwitch(pageName) {
        switch (pageName) {
            case 'scan':
                // 切换到ScanPage时，ReloadAndDisplayResult
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
                break;
            case 'deep':
                // 切换到深度ScanPage时，恢复深度ScanStatus
                this.loadResults().then(() => {
                    this.restoreDeepScanUI();
                });
                break;
            case 'test':
                // 切换到API TestingPage时，UpdateCategory选择器
                this.loadResults().then(() => {
                    this.updateCategorySelect();
                });
                break;
            case 'about':
                // 关于Page
                break;
        }
    }
    
    // 恢复深度ScanUIStatus
    restoreDeepScanUI() {
        if (this.deepScanRunning) {
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            const configDiv = document.getElementById('deepScanConfig');
            const progressDiv = document.getElementById('deepScanProgress');
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ Stop scanning';
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
        
        // 如果有深度Scan results，EnsureDisplay
        if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
            this.results = this.deepScanResults;
            this.displayResults();
        }
    }
    
    // UpdateCategory选择器
    updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.results) return;
        
        // SaveCurrent选中的值
        const currentValue = categorySelect.value;
        
        // Clear现有选Item
        categorySelect.innerHTML = '';
        
        // AddDefault选Item
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择要Test的Category';
        categorySelect.appendChild(defaultOption);
        
        // Add有Data的Category
        const categories = [
            { key: 'customApis', title: '🔧 CustomAPIPath' },
            { key: 'absoluteApis', title: '🔗 Absolute pathAPI' },
            { key: 'relativeApis', title: '📁 Relative pathAPI' },
            { key: 'jsFiles', title: '📜 JSFile' },
            { key: 'cssFiles', title: '🎨 CSSFile' },
            { key: 'images', title: '🖼️ 图片File' },
            { key: 'urls', title: '🔗 CompleteURL' },
            { key: 'domains', title: '🌐 Domain' },
            { key: 'paths', title: '📂 Path' }
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
        
        // 恢复之Before选中的值（如果仍然存在）
        if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
            categorySelect.value = currentValue;
        }
    }
    
    // Start scanning
    async startScan(silent = false) {
        if (!silent) {
            //console.log('🔍 Start scanningPage...');
        }
        
        try {
            // Send消息到content scriptPerformScan
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                throw new Error('None法GetCurrentPageInformation');
            }
            
            // Check是否是Valid的网页URL
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                if (!silent) {
                    alert('None法ScanSystemPage，请在普通网页上使用此功能');
                }
                return;
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo' });
            
            if (response) {
                //console.log('🔍 [SCAN LOG] 收到原始Scan results');
                //console.log('🔍 [SCAN LOG] 原始ResultStatistics:', this.getResultsStats(response));
                
                // 在Scan阶段就应用Filter器
                //console.log('🔍 [SCAN LOG] Start应用Filter器到Scan results...');
                this.results = await this.applyFiltersToScanResults(response);
                //console.log('🔍 [SCAN LOG] FilterAfterResultStatistics:', this.getResultsStats(this.results));
                //console.log('✅ [SCAN LOG] Filter器应用Complete');
                
                // Clear深度Scan results，避免旧Data干扰
                this.deepScanResults = {};
                //console.log('🔍 [SCAN LOG] Cleared深度Scan results缓存');
                
                await this.displayResults();
                
                // EnsureSave操作ByExecute
                //console.log('🔍 [SCAN LOG] Prepare调用 saveResults()...');
                try {
                    await this.saveResults();
                    //console.log('✅ [SCAN LOG] saveResults() 调用Complete');
                } catch (saveError) {
                    console.error('❌ [SCAN LOG] saveResults() 调用Failed:', saveError);
                }
                
                // UpdateCategory选择器
                this.updateCategorySelect();
                
                if (!silent) {
                    //console.log('✅ [SCAN LOG] Scan completed');
                }
            } else {
                throw new Error('Not收到Scan results');
            }
        } catch (error) {
            console.error('❌ [SCAN LOG] ScanFailed:', error);
            if (!silent) {
                alert('ScanFailed: ' + error.message);
            }
        }
    }
    
    // 在Scan阶段应用Filter器
    async applyFiltersToScanResults(rawResults) {
        try {
            //console.log('🔍 [FILTER LOG] Start应用Filter器...');
            //console.log('🔍 [FILTER LOG] 原始ResultStatistics:', this.getResultsStats(rawResults));
            
            // EnsureFilter器Loaded
            await this.loadFiltersIfNeeded();
            
            // 如果Filter器不Available，Return原始Result
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.warn('⚠️ [FILTER LOG] Filter器NotLoad，Return原始Scan results');
                return rawResults;
            }
            
            console.log('🔍 [FILTER LOG] Filter器Status:', {
                domainPhoneFilter: !!window.domainPhoneFilter,
                apiFilter: !!window.apiFilter
            });
            
            // CreateFilterAfter的ResultObject
            const filteredResults = {};
            
            // 使用APIFilter器ProcessPathTypeData
            if (window.apiFilter) {
                //console.log('🔍 [FILTER LOG] 使用APIFilter器ProcessPathData...');
                const resultsSet = window.apiFilter.createEmptyResultSet();
                
                // Process各种PathType
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        //console.log(`🔍 [FILTER LOG] Process ${category}: ${rawResults[category].length} 个Project`);
                        rawResults[category].forEach(item => {
                            if (item && typeof item === 'string') {
                                window.apiFilter.filterAPI(item, resultsSet);
                            }
                        });
                    }
                });
                
                // 将FilterAfter的SetConvert为Array
                Object.keys(resultsSet).forEach(key => {
                    if (resultsSet[key] instanceof Set) {
                        filteredResults[key] = Array.from(resultsSet[key]);
                        //console.log(`🔍 [FILTER LOG] APIFilter器Process ${key}: ${filteredResults[key].length} 个Project`);
                    } else if (Array.isArray(resultsSet[key])) {
                        filteredResults[key] = resultsSet[key];
                        //console.log(`🔍 [FILTER LOG] APIFilter器Process ${key}: ${filteredResults[key].length} 个Project`);
                    }
                });
            } else {
                // 如果NoAPIFilter器，DirectCopyPathTypeData
                //console.log('⚠️ [FILTER LOG] APIFilter器不Available，DirectCopyPathData');
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // 使用DomainAnd手机号Filter器Process敏感Information
            if (window.domainPhoneFilter) {
                //console.log('🔍 [FILTER LOG] 使用Domain手机号Filter器Process敏感Information...');
                
                // FilterDomain
                if (rawResults.domains && Array.isArray(rawResults.domains)) {
                    //console.log(`🔍 [FILTER LOG] FilterDomain: ${rawResults.domains.length} -> `, rawResults.domains.slice(0, 5));
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(rawResults.domains);
                    //console.log(`🔍 [FILTER LOG] DomainFilterResult: ${filteredResults.domains.length} 个ValidDomain`);
                }
                
                // Filter子Domain
                if (rawResults.subdomains && Array.isArray(rawResults.subdomains)) {
                    //console.log(`🔍 [FILTER LOG] Filter子Domain: ${rawResults.subdomains.length} 个`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(rawResults.subdomains);
                    //console.log(`🔍 [FILTER LOG] 子DomainFilterResult: ${filteredResults.subdomains.length} 个Valid子Domain`);
                }
                
                // Filter邮箱
                if (rawResults.emails && Array.isArray(rawResults.emails)) {
                    //console.log(`🔍 [FILTER LOG] Filter邮箱: ${rawResults.emails.length} 个`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(rawResults.emails);
                    //console.log(`🔍 [FILTER LOG] 邮箱FilterResult: ${filteredResults.emails.length} 个Valid邮箱`);
                }
                
                // Filter手机号
                if (rawResults.phoneNumbers && Array.isArray(rawResults.phoneNumbers)) {
                    //console.log(`🔍 [FILTER LOG] Filter手机号: ${rawResults.phoneNumbers.length} 个`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(rawResults.phoneNumbers, true);
                    //console.log(`🔍 [FILTER LOG] 手机号FilterResult: ${filteredResults.phoneNumbers.length} 个Valid手机号`);
                }
            } else {
                // 如果NoDomain手机号Filter器，DirectCopy敏感Information
                //console.log('⚠️ [FILTER LOG] Domain手机号Filter器不Available，DirectCopy敏感Information');
                const sensitiveCategories = ['domains', 'subdomains', 'emails', 'phoneNumbers'];
                sensitiveCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // 保留其他NotProcess的Class别（DirectCopy）
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
            
            //console.log('✅ [FILTER LOG] FilterComplete，最终ResultStatistics:', this.getResultsStats(filteredResults));
            
            // MarkResultAlreadyFilter
            filteredResults._filtered = true;
            
            return filteredResults;
            
        } catch (error) {
            console.error('❌ [FILTER LOG] 应用Filter器Failed:', error);
            console.error('❌ [FILTER LOG] Error堆栈:', error.stack);
            return rawResults; // 出错时Return原始Result
        }
    }
    
    // LoadFilter器（如果Need）
    async loadFiltersIfNeeded() {
        try {
            // Check是否Already经LoadFilter
            if (window.domainPhoneFilter && window.apiFilter) {
                return;
            }
            
            //console.log('🔄 StartLoadScanFilter器...');
            
            // LoadDomainAnd手机号Filter器
            if (!window.domainPhoneFilter) {
                await this.loadFilterScript('filters/domain-phone-filter.js');
                
                if (typeof DomainPhoneFilter !== 'undefined') {
                    window.domainPhoneFilter = new DomainPhoneFilter();
                    //console.log('✅ Domain手机号Filter器InitializeSuccess');
                }
            }
            
            // LoadAPIFilter器
            if (!window.apiFilter) {
                await this.loadFilterScript('filters/api-filter.js');
                
                if (typeof APIFilter !== 'undefined') {
                    window.apiFilter = new APIFilter();
                    //console.log('✅ APIFilter器InitializeSuccess');
                }
            }
            
        } catch (error) {
            console.error('❌ Filter器LoadFailed:', error);
        }
    }
    
    // LoadFilter器Script
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 Filter器ScriptLoadSuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ Filter器ScriptLoadFailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // Settings超时保护
                setTimeout(() => {
                    resolve();
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ LoadFilter器ScriptFailed: ${scriptPath}`, error);
                resolve();
            }
        });
    }
    
    // GetResultStatisticsInformation
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
            
            // Check是否是Valid的网页URL
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                //console.log('跳过SystemPage的AutoScan');
                return;
            }
            
            // UpdateCurrentScanDomainDisplay
            this.updateCurrentDomain(tab.url);
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDBCheck上次ScanTime
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const scanData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // 如果NoScan过CurrentPage，Or者超过5分钟，则AutoScan
            const now = Date.now();
            const lastScanTime = scanData ? scanData.timestamp : 0;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - lastScanTime > fiveMinutes) {
                setTimeout(() => {
                    this.startScan(true); // 静默Scan
                }, 2000);
            }
        } catch (error) {
            console.error('AutoScanCheckFailed:', error);
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
                        <span style="font-size: 12px; opacity: 0.8;">In progressScan:</span>
                        <span style="color: #00d4aa; font-weight: 600;">${protocol}//${domain}${port}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('UpdateDomainDisplayFailed:', error);
        }
    }
    
    async clearResults() {
        // ConfirmClear操作
        if (!confirm('Confirm要ClearCurrentPage的ScanData吗？此操作不可恢复。')) {
            return;
        }
        
        try {
            // GetCurrentPageURL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showNotification('None法GetCurrentPageURL', 'error');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // Clear内存中的Data
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.deepScanRunning = false;
            this.currentDepth = 0;
            
            // Clear界面Display
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDBClearCurrentPageRelated的Data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            await window.indexedDBManager.deleteScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanState(fullUrl);
            
            // Reset深度ScanUIStatus
            this.resetDeepScanUI();
            
            // ResetCategory选择器
            this.updateCategorySelect();
            
            // DisplayClearSuccessPrompt
            this.showNotification(`Page ${urlObj.hostname} 的ScanDataCleared`, 'success');
            
            //console.log(`✅ Page ${urlObj.hostname} 的ScanDataCleared`);
            
        } catch (error) {
            console.error('❌ ClearDataFailed:', error);
            this.showNotification('ClearDataFailed: ' + error.message, 'error');
        }
    }
    
    // Reset深度ScanUIStatus
    resetDeepScanUI() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn?.querySelector('.text');
        const configDiv = document.getElementById('deepScanConfig');
        const progressDiv = document.getElementById('deepScanProgress');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '🚀 Start深度Scan';
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
        
        // Reset深度ScanRelated的Input框
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        if (maxDepthInput) maxDepthInput.value = '2';
        if (concurrencyInput) concurrencyInput.value = '3';
    }
    
    // DisplayNotify
    showNotification(message, type = 'info') {
        // CreateNotifyElement
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Settings样式
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
        
        // 根据TypeSettings颜色
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
        
        // Add到Page
        document.body.appendChild(notification);
        
        // 3 secondsAfterAutoRemove
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
            // GetCurrentPageURL作为存储Key
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ None法GetCurrentPageURL，跳过Save');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            //console.log('💾 [SAVE LOG] StartSave results...');
            //console.log('💾 [SAVE LOG] Current this.results Statistics:', this.getResultsStats(this.results));
            //console.log('💾 [SAVE LOG] Current this.deepScanResults Statistics:', this.getResultsStats(this.deepScanResults));
            
            // Confirm要Save的最终Result
            let finalResults = {};
            
            // 如果有普通Scan results，Direct使用（Already经Filter过）
            if (this.results && Object.keys(this.results).length > 0) {
                //console.log('💾 [SAVE LOG] 使用普通Scan results作为Basic');
                finalResults = { ...this.results };
            }
            
            // 如果有深度Scan results，NeedFirstFilter再合And
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                //console.log('💾 [SAVE LOG] Process深度Scan results...');
                
                // First对深度Scan results应用Filter器
                const filteredDeepResults = await this.applyFiltersToScanResults(this.deepScanResults);
                //console.log('💾 [SAVE LOG] 深度Scan resultsFilterAfterStatistics:', this.getResultsStats(filteredDeepResults));
                
                // 合AndFilterAfter的Result
                finalResults = this.mergeResults(finalResults, filteredDeepResults);
                //console.log('💾 [SAVE LOG] 合AndAfter最终ResultStatistics:', this.getResultsStats(finalResults));
            }
            
            // Save最终的FilterAfterResult到IndexedDB
            if (Object.keys(finalResults).length > 0) {
                const itemCount = Object.values(finalResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                //console.log(`💾 [SAVE LOG] 最终Save到 IndexedDB，共 ${itemCount} 条FilterAfter的Record`);
                
                // ValidateSave的Data
                const domainCount = finalResults.domains ? finalResults.domains.length : 0;
                //console.log(`💾 [SAVE LOG] Validate：Save的Domain数量 = ${domainCount}`);
                
                // 使用IndexedDBSave普通Scan results
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                // 构造Complete的URLUsed forSave
                const fullUrl = `https://${hostname}`;
                
                // GetPage标题Used forURL位置跟踪
                const pageTitle = document.title || tab.title || 'Unknown Page';
                
                // Save results时包含URL位置Information
                await window.indexedDBManager.saveScanResults(fullUrl, finalResults, tab.url, pageTitle);
                //console.log(`✅ [SAVE LOG] IndexedDB Save completed: ${hostname}，包含URL位置Information`);
            } else {
                //console.log('💾 [SAVE LOG] NoValidResultNeedSave');
            }
            
            // 使用IndexedDBSave深度ScanStatus
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ [SAVE LOG] 深度ScanStatusSave to IndexedDBComplete: ${hostname}`);
            
            // 如果有深度Scan results，也Save to IndexedDB
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log(`✅ [SAVE LOG] 深度Scan resultsSave to IndexedDBComplete: ${hostname}`);
            }
            
        } catch (error) {
            console.error('❌ [SAVE LOG] DataSaveFailed:', error);
        }
    }
    
    // 合AndFilterAfter的Scan results（Ensure合And的Data也是Filter过的）
    async mergeFilteredResults(existingResults, newResults) {
        //console.log('🔍 [MERGE LOG] Start合AndFilterAfter的Result...');
        //console.log('🔍 [MERGE LOG] 现有ResultStatistics:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE LOG] 新ResultStatistics:', this.getResultsStats(newResults));
        
        // 如果新Result还No经过Filter，FirstFilter
        let filteredNewResults = newResults;
        if (newResults && !newResults._filtered) {
            //console.log('⚠️ [MERGE LOG] 新ResultNotFilter，In progress应用Filter器...');
            filteredNewResults = await this.applyFiltersToScanResults(newResults);
            filteredNewResults._filtered = true; // MarkAlreadyFilter
            //console.log('✅ [MERGE LOG] 新ResultFilterComplete:', this.getResultsStats(filteredNewResults));
        } else {
            //console.log('✅ [MERGE LOG] 新ResultAlreadyFilter，Direct合And');
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
            
            // 使用Set去重，Then合And
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        // Mark合AndAfter的ResultAlreadyFilter
        mergedResults._filtered = true;
        
        //console.log('✅ [MERGE LOG] FilterAfterResult合AndComplete，最终Statistics:', this.getResultsStats(mergedResults));
        return mergedResults;
    }
    
    // 合AndScan results的辅助Method
    mergeResults(existingResults, newResults) {
        //console.log('🔍 [MERGE-SIMPLE LOG] Start简单合AndResult...');
        //console.log('🔍 [MERGE-SIMPLE LOG] 现有ResultStatistics:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE-SIMPLE LOG] 新ResultStatistics:', this.getResultsStats(newResults));
        
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
            
            // 使用Set去重，Then合And
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE-SIMPLE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        //console.log('✅ [MERGE-SIMPLE LOG] 简单合AndComplete，最终Statistics:', this.getResultsStats(mergedResults));
        console.warn('⚠️ [MERGE-SIMPLE LOG] 注意：此MethodNot应用Filter器，可能包含NotFilterData');
        
        return mergedResults;
    }
    
    async loadResults() {
        try {
            // GetCurrentPageURL作为存储Key
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ None法GetCurrentPageURL，跳过Load');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            console.log(`🔄 [LOAD LOG] In progressLoadPageData: ${hostname}`);
            
            // Load from IndexedDB普通Scan results
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造Complete的URLUsed forLoad
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            // Fix：正确Process新的Data结构，Data存储在 results 属性中
            let loadedData = null;
            if (loadedDataWrapper && loadedDataWrapper.results) {
                // Check是否是新的嵌套结构
                if (loadedDataWrapper.results.results) {
                    // 新Format：Data在 results.results 中
                    loadedData = loadedDataWrapper.results.results;
                } else {
                    // 旧Format：DataDirect在 results 中
                    loadedData = loadedDataWrapper.results;
                }
            }
            
            if (loadedData && typeof loadedData === 'object') {
                const itemCount = Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const domainCount = loadedData.domains ? loadedData.domains.length : 0;
                
                //console.log(`🔄 [LOAD LOG] Load from IndexedDBDataStatistics:`, this.getResultsStats(loadedData));
                //console.log(`🔄 [LOAD LOG] 存储中Domain数量: ${domainCount}`);
                
                // CheckData是否Already经Filter过
                if (loadedData._filtered) {
                    //console.log(`✅ [LOAD LOG] DataAlreadyFilter，Direct使用`);
                    this.results = loadedData;
                    this.deepScanResults = loadedData;
                } else {
                    //console.log(`⚠️ [LOAD LOG] DataNotFilter，Re应用Filter器...`);
                    // 对Load的DataRe应用Filter器
                    this.results = await this.applyFiltersToScanResults(loadedData);
                    this.deepScanResults = this.results;
                    
                    // ReSaveFilterAfter的Data
                    await this.saveResults();
                    //console.log(`✅ [LOAD LOG] AlreadyReFilterAndSaveData`);
                }
                
                //console.log(`✅ [LOAD LOG] 最终LoadDataStatistics:`, this.getResultsStats(this.results));
                this.displayResults();
            } else {
                //console.log(`⚠️ [LOAD LOG] Page ${hostname} Not foundValid的ScanData`);
            }
            
            // fromIndexedDB恢复深度ScanStatus
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                console.log('🔄 [LOAD LOG] fromIndexedDB恢复深度ScanStatus:', {
                    running: this.deepScanRunning,
                    scannedCount: this.scannedUrls.size,
                    depth: this.currentDepth
                });
            }
            
            // 尝试Load from IndexedDB深度Scan results
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            if (deepScanDataWrapper && deepScanDataWrapper.results) {
                const deepScanData = deepScanDataWrapper.results;
                const deepItemCount = Object.values(deepScanData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                
                // 如果深度Scan results比普通Scan results更Complete，使用深度Scan results
                if (deepItemCount > 0) {
                    const currentItemCount = loadedData ? Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;
                    if (deepItemCount > currentItemCount) {
                        this.results = deepScanData;
                        this.deepScanResults = deepScanData;
                        console.log(`🔄 [LOAD LOG] 使用IndexedDB深度Scan results，共 ${deepItemCount} 条Record`);
                        this.displayResults();
                    }
                }
            }
        } catch (error) {
            console.error('❌ [LOAD LOG] LoadResultFailed:', error);
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
    
    // DisplayResult - 使用DisplayManager
    async displayResults() {
        if (this.displayManager) {
            await this.displayManager.displayResults();
        } else {
            console.error('DisplayManagerNotInitialize');
        }
    }
    
    // BatchRequestTest - 使用ApiTester
    async batchRequestTest() {
        if (this.apiTester) {
            await this.apiTester.batchRequestTest();
        } else {
            console.error('ApiTesterNotInitialize');
            alert('API Testing器NotInitialize，None法ExecuteTest');
        }
    }
    
        // AddCustomAPIPath
    addCustomApiPaths() {
        const customApiPathsInput = document.getElementById('customApiPaths');
        if (!customApiPathsInput) {
            console.error('找不到CustomAPIPathInput框');
            return;
        }
        
        const customApiPaths = customApiPathsInput.value.trim();
        if (!customApiPaths) {
            alert('请InputCustomAPIPath，Every行一个Path');
            return;
        }
        
        // ParseCustomAPIPath
        const paths = this.apiTester.parseCustomApiPaths(customApiPaths);
        if (paths.length === 0) {
            alert('请InputValid的APIPath');
            return;
        }
        
        // 将CustomAPIPathAdd到Scan results中
        if (!this.results.customApis) {
            this.results.customApis = [];
        }
        
        // 使用SetPerform去重
        const existingSet = new Set(this.results.customApis);
        let addedCount = 0;
        
        paths.forEach(path => {
            if (!existingSet.has(path)) {
                this.results.customApis.push(path);
                existingSet.add(path);
                addedCount++;
            }
        });
        
        // Save results到存储
        this.saveResults();
        
        // ReDisplayResult
        this.displayResults();
        
        // DisplayAddSuccess的Prompt
        const message = `SuccessAdd ${addedCount} 个CustomAPIPath到Scan results中:\n${paths.join('\n')}`;
        alert(message);
        
        // ClearInput框
        customApiPathsInput.value = '';
        
        //console.log(`✅ Add了 ${addedCount} 个CustomAPIPath到Scan results:`, paths);
    }
    
    // 切换深度Scan - 使用DeepScanner
    toggleDeepScan() {
        if (this.deepScanner) {
            this.deepScanner.toggleDeepScan();
        } else {
            console.error('DeepScannerNotInitialize');
            alert('深度Scan器NotInitialize，None法ExecuteScan');
        }
    }
}
