/**
 * SRCMiner 主class - 核心控制器
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
        
        // initialize组件
        this.initComponents();
        this.init();
    }
    
    // initialize各个组件
    initComponents() {
        // initializepatternextract器
        this.patternExtractor = new PatternExtractor();
        // 确保loadcustomregexconfiguration（scan与deep scanbefore）
        try {
            if (this.patternExtractor && typeof this.patternExtractor.loadCustomPatterns === 'function') {
                // 首次load
                this.patternExtractor.loadCustomPatterns().catch(err => {
                    console.error('loadcustomregexfailed:', err);
                });
                // listensettings更new，实时刷new
                window.addEventListener('regexConfigUpdated', () => {
                    try {
                        this.patternExtractor.loadCustomPatterns().catch(err => {
                            console.error('刷newcustomregexfailed:', err);
                        });
                    } catch (e) {
                        console.warn('刷newcustomregexabnormal:', e);
                    }
                });
            }
        } catch (e) {
            console.warn('initializecustomregex时发生abnormal:', e);
        }
        
        // initialize内容extract器
        this.contentExtractor = new ContentExtractor(this);
        
        // initializedeep scan器
        this.deepScanner = new DeepScanner(this);
        
        // initialize显示管理器
        this.displayManager = new DisplayManager(this);
        
        // initializeAPItest器
        this.apiTester = new ApiTester(this);
        
        //console.log('✅ all组件initializecomplete');
    }
    
    init() {
        // initialize导航切换
        this.initNavigation();
        
        // initializebuttonevent
        this.initEventListeners();
        
        // initialize窗口eventlisten
        this.initWindowEvents();
        
        // loadalready保存resultandautomaticscan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initialize窗口eventlisten
    initWindowEvents() {
        // listen窗口焦点event
        window.addEventListener('focus', () => {
            //console.log('🔄 窗口获得焦点，重newloaddata...');
            this.loadResults().then(() => {
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            });
        });
        
        // listenpage面可见性change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                //console.log('🔄 page面变为可见，重newloaddata...');
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
            }
        });
        
        // 定期checkdatacomplete性
        setInterval(() => {
            this.checkDataIntegrity();
        }, 5000); // 每5秒check一次
    }
    
    // checkdatacomplete性
    async checkDataIntegrity() {
        try {
            // get当beforepage面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDBcheckdata
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const storedData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // ifstoragein有databut内存inwithout，重newload
            if (storedData && storedData.results && 
                Object.keys(this.results || {}).length === 0) {
                //console.log('🔧 detecttodata丢失，正in恢复...');
                await this.loadResults();
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            }
        } catch (error) {
            console.error('datacomplete性checkfailed:', error);
        }
    }
    
    initEventListeners() {
        document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
        document.getElementById('deepScanBtn').addEventListener('click', () => this.toggleDeepScan());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        
        // 批量requestbutton
        const batchRequestBtn = document.getElementById('batchRequestBtn');
        if (batchRequestBtn) {
            batchRequestBtn.addEventListener('click', () => this.batchRequestTest());
        }
        
        // addcustomAPI路径button
        const addCustomApiBtn = document.getElementById('addCustomApiBtn');
        if (addCustomApiBtn) {
            addCustomApiBtn.addEventListener('click', () => this.addCustomApiPaths());
        }
        
        // mod态框关闭button
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('requestResultModal').style.display = 'none';
            });
        }
        
        // newbuttonevent处理
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
                
                // getallscanresultandaddtomod态框
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    clone.classList.remove('collapsed');
                    resultsContainer.appendChild(clone);
                });
                
                modal.style.display = 'block';
            });
        }
        
        // 复制allresultbutton
        const copyAllResultsBtn = document.getElementById('copyAllResultsBtn');
        if (copyAllResultsBtn) {
            copyAllResultsBtn.addEventListener('click', () => {
                const results = document.getElementById('requestResults').innerText;
                navigator.clipboard.writeText(results).then(() => {
                    const textSpan = copyAllResultsBtn.querySelector('.text');
                    if (textSpan) {
                        textSpan.textContent = '✅ already复制';
                        setTimeout(() => {
                            textSpan.textContent = '复制全部result';
                        }, 2000);
                    }
                });
            });
        }
    }
    
    // initialize导航功能
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const pages = document.querySelectorAll('.page');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;
                
                // 更new导航state
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // 更newpage面显示
                pages.forEach(page => {
                    page.classList.remove('active');
                    const pageId = `${targetPage}-page`;
                    if (page.id === pageId) {
                        page.classList.add('active');
                    }
                });
                
                // page面切换后special处理
                this.handlePageSwitch(targetPage);
            });
        });
    }
    
    // 处理page面切换后逻辑
    handlePageSwitch(pageName) {
        switch (pageName) {
            case 'scan':
                // 切换toscanpage面时，重newloadand显示result
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
                break;
            case 'deep':
                // 切换todeep scanpage面时，恢复deep scanstate
                this.loadResults().then(() => {
                    this.restoreDeepScanUI();
                });
                break;
            case 'test':
                // 切换toAPItestpage面时，更new分classselector
                this.loadResults().then(() => {
                    this.updateCategorySelect();
                });
                break;
            case 'about':
                // 关于page面
                break;
        }
    }
    
    // 恢复deep scanUIstate
    restoreDeepScanUI() {
        if (this.deepScanRunning) {
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            const configDiv = document.getElementById('deepScanConfig');
            const progressDiv = document.getElementById('deepScanProgress');
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止scan';
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
        
        // if有deep scanresult，确保显示
        if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
            this.results = this.deepScanResults;
            this.displayResults();
        }
    }
    
    // 更new分classselector
    updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.results) return;
        
        // 保存当before选invalue
        const currentValue = categorySelect.value;
        
        // 清空现有选项
        categorySelect.innerHTML = '';
        
        // add默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择要test分class';
        categorySelect.appendChild(defaultOption);
        
        // add有data分class
        const categories = [
            { key: 'customApis', title: '🔧 customAPI路径' },
            { key: 'absoluteApis', title: '🔗 绝对路径API' },
            { key: 'relativeApis', title: '📁 相对路径API' },
            { key: 'jsFiles', title: '📜 JS文件' },
            { key: 'cssFiles', title: '🎨 CSS文件' },
            { key: 'images', title: '🖼️ 图片文件' },
            { key: 'urls', title: '🔗 completeURL' },
            { key: 'domains', title: '🌐 domain' },
            { key: 'paths', title: '📂 路径' }
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
        
        // 恢复之before选invalue（if仍然exists）
        if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
            categorySelect.value = currentValue;
        }
    }
    
    // startscan
    async startScan(silent = false) {
        if (!silent) {
            //console.log('🔍 startscanpage面...');
        }
        
        try {
            // sendmessagetocontent script进行scan
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                throw new Error('无法get当beforepage面information');
            }
            
            // check是否是valid网pageURL
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                if (!silent) {
                    alert('无法scan系统page面，请in普通网page上use此功能');
                }
                return;
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo' });
            
            if (response) {
                //console.log('🔍 [SCAN LOG] received原始scanresult');
                //console.log('🔍 [SCAN LOG] 原始result统计:', this.getResultsStats(response));
                
                // inscan阶段就应for筛选器
                //console.log('🔍 [SCAN LOG] start应for筛选器toscanresult...');
                this.results = await this.applyFiltersToScanResults(response);
                //console.log('🔍 [SCAN LOG] 筛选后result统计:', this.getResultsStats(this.results));
                //console.log('✅ [SCAN LOG] 筛选器应forcomplete');
                
                // 清空deep scanresult，避免旧data干扰
                this.deepScanResults = {};
                //console.log('🔍 [SCAN LOG] already清空deep scanresult缓存');
                
                await this.displayResults();
                
                // 确保保存操作byexecute
                //console.log('🔍 [SCAN LOG] 准备调for saveResults()...');
                try {
                    await this.saveResults();
                    //console.log('✅ [SCAN LOG] saveResults() 调forcomplete');
                } catch (saveError) {
                    console.error('❌ [SCAN LOG] saveResults() 调forfailed:', saveError);
                }
                
                // 更new分classselector
                this.updateCategorySelect();
                
                if (!silent) {
                    //console.log('✅ [SCAN LOG] scan complete');
                }
            } else {
                throw new Error('未receivedscanresult');
            }
        } catch (error) {
            console.error('❌ [SCAN LOG] scanfailed:', error);
            if (!silent) {
                alert('scanfailed: ' + error.message);
            }
        }
    }
    
    // inscan阶段应for筛选器
    async applyFiltersToScanResults(rawResults) {
        try {
            //console.log('🔍 [FILTER LOG] start应for筛选器...');
            //console.log('🔍 [FILTER LOG] 原始result统计:', this.getResultsStats(rawResults));
            
            // 确保筛选器alreadyload
            await this.loadFiltersIfNeeded();
            
            // if筛选器not可for，return原始result
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.warn('⚠️ [FILTER LOG] 筛选器未load，return原始scanresult');
                return rawResults;
            }
            
            console.log('🔍 [FILTER LOG] 筛选器state:', {
                domainPhoneFilter: !!window.domainPhoneFilter,
                apiFilter: !!window.apiFilter
            });
            
            // create筛选后resultobject
            const filteredResults = {};
            
            // useAPI筛选器处理路径class型data
            if (window.apiFilter) {
                //console.log('🔍 [FILTER LOG] useAPI筛选器处理路径data...');
                const resultsSet = window.apiFilter.createEmptyResultSet();
                
                // 处理各种路径class型
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        //console.log(`🔍 [FILTER LOG] 处理 ${category}: ${rawResults[category].length} 个项目`);
                        rawResults[category].forEach(item => {
                            if (item && typeof item === 'string') {
                                window.apiFilter.filterAPI(item, resultsSet);
                            }
                        });
                    }
                });
                
                // 将筛选后Setconvert为Array
                Object.keys(resultsSet).forEach(key => {
                    if (resultsSet[key] instanceof Set) {
                        filteredResults[key] = Array.from(resultsSet[key]);
                        //console.log(`🔍 [FILTER LOG] API筛选器处理 ${key}: ${filteredResults[key].length} 个项目`);
                    } else if (Array.isArray(resultsSet[key])) {
                        filteredResults[key] = resultsSet[key];
                        //console.log(`🔍 [FILTER LOG] API筛选器处理 ${key}: ${filteredResults[key].length} 个项目`);
                    }
                });
            } else {
                // ifwithoutAPI筛选器，directly复制路径class型data
                //console.log('⚠️ [FILTER LOG] API筛选器not可for，directly复制路径data');
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // usedomainandmobile phone筛选器处理敏感information
            if (window.domainPhoneFilter) {
                //console.log('🔍 [FILTER LOG] usedomainmobile phone筛选器处理敏感information...');
                
                // 筛选domain
                if (rawResults.domains && Array.isArray(rawResults.domains)) {
                    //console.log(`🔍 [FILTER LOG] 筛选domain: ${rawResults.domains.length} -> `, rawResults.domains.slice(0, 5));
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(rawResults.domains);
                    //console.log(`🔍 [FILTER LOG] domain筛选result: ${filteredResults.domains.length} 个validdomain`);
                }
                
                // 筛选子domain
                if (rawResults.subdomains && Array.isArray(rawResults.subdomains)) {
                    //console.log(`🔍 [FILTER LOG] 筛选子domain: ${rawResults.subdomains.length} 个`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(rawResults.subdomains);
                    //console.log(`🔍 [FILTER LOG] 子domain筛选result: ${filteredResults.subdomains.length} 个valid子domain`);
                }
                
                // 筛选email
                if (rawResults.emails && Array.isArray(rawResults.emails)) {
                    //console.log(`🔍 [FILTER LOG] 筛选email: ${rawResults.emails.length} 个`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(rawResults.emails);
                    //console.log(`🔍 [FILTER LOG] email筛选result: ${filteredResults.emails.length} 个validemail`);
                }
                
                // 筛选mobile phone
                if (rawResults.phoneNumbers && Array.isArray(rawResults.phoneNumbers)) {
                    //console.log(`🔍 [FILTER LOG] 筛选mobile phone: ${rawResults.phoneNumbers.length} 个`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(rawResults.phoneNumbers, true);
                    //console.log(`🔍 [FILTER LOG] mobile phone筛选result: ${filteredResults.phoneNumbers.length} 个validmobile phone`);
                }
            } else {
                // ifwithoutdomainmobile phone筛选器，directly复制敏感information
                //console.log('⚠️ [FILTER LOG] domainmobile phone筛选器not可for，directly复制敏感information');
                const sensitiveCategories = ['domains', 'subdomains', 'emails', 'phoneNumbers'];
                sensitiveCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // keep其他未处理class别（directly复制）
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
            
            //console.log('✅ [FILTER LOG] 筛选complete，最终result统计:', this.getResultsStats(filteredResults));
            
            // 标记resultalready筛选
            filteredResults._filtered = true;
            
            return filteredResults;
            
        } catch (error) {
            console.error('❌ [FILTER LOG] 应for筛选器failed:', error);
            console.error('❌ [FILTER LOG] 错误堆栈:', error.stack);
            return rawResults; // 出错时return原始result
        }
    }
    
    // load筛选器（ifrequire）
    async loadFiltersIfNeeded() {
        try {
            // check是否already经loadthrough滤器
            if (window.domainPhoneFilter && window.apiFilter) {
                return;
            }
            
            //console.log('🔄 startloadscan筛选器...');
            
            // loaddomainandmobile phone筛选器
            if (!window.domainPhoneFilter) {
                await this.loadFilterScript('filters/domain-phone-filter.js');
                
                if (typeof DomainPhoneFilter !== 'undefined') {
                    window.domainPhoneFilter = new DomainPhoneFilter();
                    //console.log('✅ domainmobile phone筛选器initializesuccess');
                }
            }
            
            // loadAPI筛选器
            if (!window.apiFilter) {
                await this.loadFilterScript('filters/api-filter.js');
                
                if (typeof APIFilter !== 'undefined') {
                    window.apiFilter = new APIFilter();
                    //console.log('✅ API筛选器initializesuccess');
                }
            }
            
        } catch (error) {
            console.error('❌ 筛选器loadfailed:', error);
        }
    }
    
    // load筛选器脚本
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 筛选器脚本loadsuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 筛选器脚本loadfailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings超时保护
                setTimeout(() => {
                    resolve();
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load筛选器脚本failed: ${scriptPath}`, error);
                resolve();
            }
        });
    }
    
    // getresult统计information
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
            
            // check是否是valid网pageURL
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                //console.log('skip系统page面automaticscan');
                return;
            }
            
            // 更new当beforescandomain显示
            this.updateCurrentDomain(tab.url);
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // fromIndexedDBcheck上次scan时间
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const scanData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // ifwithoutscanthrough当beforepage面，or者超through5分钟，则automaticscan
            const now = Date.now();
            const lastScanTime = scanData ? scanData.timestamp : 0;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - lastScanTime > fiveMinutes) {
                setTimeout(() => {
                    this.startScan(true); // 静默scan
                }, 2000);
            }
        } catch (error) {
            console.error('automaticscancheckfailed:', error);
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
                        <span style="font-size: 12px; opacity: 0.8;">正在扫描:</span>
                        <span style="color: #00d4aa; font-weight: 600;">${protocol}//${domain}${port}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('更newdomain显示failed:', error);
        }
    }
    
    async clearResults() {
        // confirm清空操作
        if (!confirm('确定要清空当beforepage面scandata吗？此操作not可恢复。')) {
            return;
        }
        
        try {
            // get当beforepage面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showNotification('无法get当beforepage面URL', 'error');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // 清空内存indata
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.deepScanRunning = false;
            this.currentDepth = 0;
            
            // 清空界面显示
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDB清空当beforepage面相关data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            await window.indexedDBManager.deleteScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanState(fullUrl);
            
            // 重置deep scanUIstate
            this.resetDeepScanUI();
            
            // 重置分classselector
            this.updateCategorySelect();
            
            // 显示清空success提示
            this.showNotification(`page面 ${urlObj.hostname} scandataalready清空`, 'success');
            
            //console.log(`✅ page面 ${urlObj.hostname} scandataalready清空`);
            
        } catch (error) {
            console.error('❌ 清空datafailed:', error);
            this.showNotification('清空datafailed: ' + error.message, 'error');
        }
    }
    
    // 重置deep scanUIstate
    resetDeepScanUI() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn?.querySelector('.text');
        const configDiv = document.getElementById('deepScanConfig');
        const progressDiv = document.getElementById('deepScanProgress');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '🚀 startdeep scan';
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
        
        // 重置deep scan相关输入框
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        if (maxDepthInput) maxDepthInput.value = '2';
        if (concurrencyInput) concurrencyInput.value = '3';
    }
    
    // 显示notify
    showNotification(message, type = 'info') {
        // createnotify元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings样式
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
        
        // 根据class型settings颜色
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
        
        // addtopage面
        document.body.appendChild(notification);
        
        // 3秒后automatic移除
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
            // get当beforepage面URL作为storage键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法get当beforepage面URL，skip保存');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            //console.log('💾 [SAVE LOG] start保存result...');
            //console.log('💾 [SAVE LOG] 当before this.results 统计:', this.getResultsStats(this.results));
            //console.log('💾 [SAVE LOG] 当before this.deepScanResults 统计:', this.getResultsStats(this.deepScanResults));
            
            // 确定要保存最终result
            let finalResults = {};
            
            // if有普通scanresult，directlyuse（already经筛选through）
            if (this.results && Object.keys(this.results).length > 0) {
                //console.log('💾 [SAVE LOG] use普通scanresult作为basic');
                finalResults = { ...this.results };
            }
            
            // if有deep scanresult，require先筛选再合and
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                //console.log('💾 [SAVE LOG] 处理deep scanresult...');
                
                // 先对deep scanresult应for筛选器
                const filteredDeepResults = await this.applyFiltersToScanResults(this.deepScanResults);
                //console.log('💾 [SAVE LOG] deep scanresult筛选后统计:', this.getResultsStats(filteredDeepResults));
                
                // 合and筛选后result
                finalResults = this.mergeResults(finalResults, filteredDeepResults);
                //console.log('💾 [SAVE LOG] 合and后最终result统计:', this.getResultsStats(finalResults));
            }
            
            // 保存最终筛选后resulttoIndexedDB
            if (Object.keys(finalResults).length > 0) {
                const itemCount = Object.values(finalResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                //console.log(`💾 [SAVE LOG] 最终保存to IndexedDB，共 ${itemCount} 条筛选后record`);
                
                // validation保存data
                const domainCount = finalResults.domains ? finalResults.domains.length : 0;
                //console.log(`💾 [SAVE LOG] validation：保存domain数量 = ${domainCount}`);
                
                // useIndexedDB保存普通scanresult
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                // 构造completeURLfor保存
                const fullUrl = `https://${hostname}`;
                
                // getpage面标题forURL位置跟踪
                const pageTitle = document.title || tab.title || 'Unknown Page';
                
                // 保存result时containsURL位置information
                await window.indexedDBManager.saveScanResults(fullUrl, finalResults, tab.url, pageTitle);
                //console.log(`✅ [SAVE LOG] IndexedDB 保存complete: ${hostname}，containsURL位置information`);
            } else {
                //console.log('💾 [SAVE LOG] withoutvalidresultrequire保存');
            }
            
            // useIndexedDB保存deep scanstate
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ [SAVE LOG] deep scanstate保存toIndexedDBcomplete: ${hostname}`);
            
            // if有deep scanresult，也保存toIndexedDB
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log(`✅ [SAVE LOG] deep scanresult保存toIndexedDBcomplete: ${hostname}`);
            }
            
        } catch (error) {
            console.error('❌ [SAVE LOG] data保存failed:', error);
        }
    }
    
    // 合and筛选后scanresult（确保合anddata也是筛选through）
    async mergeFilteredResults(existingResults, newResults) {
        //console.log('🔍 [MERGE LOG] start合and筛选后result...');
        //console.log('🔍 [MERGE LOG] 现有result统计:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE LOG] newresult统计:', this.getResultsStats(newResults));
        
        // ifnewresult还without经through筛选，先筛选
        let filteredNewResults = newResults;
        if (newResults && !newResults._filtered) {
            //console.log('⚠️ [MERGE LOG] newresult未筛选，正in应for筛选器...');
            filteredNewResults = await this.applyFiltersToScanResults(newResults);
            filteredNewResults._filtered = true; // 标记already筛选
            //console.log('✅ [MERGE LOG] newresult筛选complete:', this.getResultsStats(filteredNewResults));
        } else {
            //console.log('✅ [MERGE LOG] newresultalready筛选，directly合and');
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
            
            // useSet去重，然后合and
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        // 标记合and后resultalready筛选
        mergedResults._filtered = true;
        
        //console.log('✅ [MERGE LOG] 筛选后result合andcomplete，最终统计:', this.getResultsStats(mergedResults));
        return mergedResults;
    }
    
    // 合andscanresult辅助方法
    mergeResults(existingResults, newResults) {
        //console.log('🔍 [MERGE-SIMPLE LOG] start简单合andresult...');
        //console.log('🔍 [MERGE-SIMPLE LOG] 现有result统计:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE-SIMPLE LOG] newresult统计:', this.getResultsStats(newResults));
        
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
            
            // useSet去重，然后合and
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE-SIMPLE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        //console.log('✅ [MERGE-SIMPLE LOG] 简单合andcomplete，最终统计:', this.getResultsStats(mergedResults));
        console.warn('⚠️ [MERGE-SIMPLE LOG] 注意：此方法未应for筛选器，可能contains未筛选data');
        
        return mergedResults;
    }
    
    async loadResults() {
        try {
            // get当beforepage面URL作为storage键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法get当beforepage面URL，skipload');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            console.log(`🔄 [LOAD LOG] 正inloadpage面data: ${hostname}`);
            
            // fromIndexedDBload普通scanresult
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造completeURLforload
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            // fix：正确处理newdata结构，datastoragein results 属性in
            let loadedData = null;
            if (loadedDataWrapper && loadedDataWrapper.results) {
                // check是否是new嵌套结构
                if (loadedDataWrapper.results.results) {
                    // newformat：datain results.results in
                    loadedData = loadedDataWrapper.results.results;
                } else {
                    // 旧format：datadirectlyin results in
                    loadedData = loadedDataWrapper.results;
                }
            }
            
            if (loadedData && typeof loadedData === 'object') {
                const itemCount = Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const domainCount = loadedData.domains ? loadedData.domains.length : 0;
                
                //console.log(`🔄 [LOAD LOG] fromIndexedDBloaddata统计:`, this.getResultsStats(loadedData));
                //console.log(`🔄 [LOAD LOG] storageindomain数量: ${domainCount}`);
                
                // checkdata是否already经筛选through
                if (loadedData._filtered) {
                    //console.log(`✅ [LOAD LOG] dataalready筛选，directlyuse`);
                    this.results = loadedData;
                    this.deepScanResults = loadedData;
                } else {
                    //console.log(`⚠️ [LOAD LOG] data未筛选，重new应for筛选器...`);
                    // 对loaddata重new应for筛选器
                    this.results = await this.applyFiltersToScanResults(loadedData);
                    this.deepScanResults = this.results;
                    
                    // 重new保存筛选后data
                    await this.saveResults();
                    //console.log(`✅ [LOAD LOG] already重new筛选and保存data`);
                }
                
                //console.log(`✅ [LOAD LOG] 最终loaddata统计:`, this.getResultsStats(this.results));
                this.displayResults();
            } else {
                //console.log(`⚠️ [LOAD LOG] page面 ${hostname} 未foundvalidscandata`);
            }
            
            // fromIndexedDB恢复deep scanstate
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                console.log('🔄 [LOAD LOG] fromIndexedDB恢复deep scanstate:', {
                    running: this.deepScanRunning,
                    scannedCount: this.scannedUrls.size,
                    depth: this.currentDepth
                });
            }
            
            // 尝试fromIndexedDBloaddeep scanresult
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            if (deepScanDataWrapper && deepScanDataWrapper.results) {
                const deepScanData = deepScanDataWrapper.results;
                const deepItemCount = Object.values(deepScanData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                
                // ifdeep scanresult比普通scanresult更complete，usedeep scanresult
                if (deepItemCount > 0) {
                    const currentItemCount = loadedData ? Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;
                    if (deepItemCount > currentItemCount) {
                        this.results = deepScanData;
                        this.deepScanResults = deepScanData;
                        console.log(`🔄 [LOAD LOG] useIndexedDBdeep scanresult，共 ${deepItemCount} 条record`);
                        this.displayResults();
                    }
                }
            }
        } catch (error) {
            console.error('❌ [LOAD LOG] loadresultfailed:', error);
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
    
    // 显示result - useDisplayManager
    async displayResults() {
        if (this.displayManager) {
            await this.displayManager.displayResults();
        } else {
            console.error('DisplayManager未initialize');
        }
    }
    
    // 批量requesttest - useApiTester
    async batchRequestTest() {
        if (this.apiTester) {
            await this.apiTester.batchRequestTest();
        } else {
            console.error('ApiTester未initialize');
            alert('APItest器未initialize，无法executetest');
        }
    }
    
        // addcustomAPI路径
    addCustomApiPaths() {
        const customApiPathsInput = document.getElementById('customApiPaths');
        if (!customApiPathsInput) {
            console.error('找nottocustomAPI路径输入框');
            return;
        }
        
        const customApiPaths = customApiPathsInput.value.trim();
        if (!customApiPaths) {
            alert('请输入customAPI路径，每行一个路径');
            return;
        }
        
        // 解析customAPI路径
        const paths = this.apiTester.parseCustomApiPaths(customApiPaths);
        if (paths.length === 0) {
            alert('请输入validAPI路径');
            return;
        }
        
        // 将customAPI路径addtoscanresultin
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
        
        // 保存resulttostorage
        this.saveResults();
        
        // 重new显示result
        this.displayResults();
        
        // 显示addsuccess提示
        const message = `successadd ${addedCount} 个customAPI路径toscanresultin:\n${paths.join('\n')}`;
        alert(message);
        
        // 清空输入框
        customApiPathsInput.value = '';
        
        //console.log(`✅ add了 ${addedCount} 个customAPI路径toscanresult:`, paths);
    }
    
    // 切换deep scan - useDeepScanner
    toggleDeepScan() {
        if (this.deepScanner) {
            this.deepScanner.toggleDeepScan();
        } else {
            console.error('DeepScanner未initialize');
            alert('deep scan器未initialize，无法executescan');
        }
    }
}
