/**
 * SRCMiner class 主 - 核心控制器
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
    
    // initialize component item(s) 各
    initComponents() {
        // initialize extracted mode 器
        this.patternExtractor = new PatternExtractor();
        // custom regex configuration load 确保（deep scan scan before 与）
        try {
            if (this.patternExtractor && typeof this.patternExtractor.loadCustomPatterns === 'function') {
                // load time(s) 首
                this.patternExtractor.loadCustomPatterns().catch(err => {
                    console.error('custom regex failed to load:', err);
                });
                // update settings listen，refresh when 实
                window.addEventListener('regexConfigUpdated', () => {
                    try {
                        this.patternExtractor.loadCustomPatterns().catch(err => {
                            console.error('custom regex failed refresh:', err);
                        });
                    } catch (e) {
                        console.warn('custom regex refresh exception:', e);
                    }
                });
            }
        } catch (e) {
            console.warn('custom regex initialize exception when 发生:', e);
        }
        
        // initialize content extracted 器
        this.contentExtractor = new ContentExtractor(this);
        
        // deep scan initialize 器
        this.deepScanner = new DeepScanner(this);
        
        // initialize manager display
        this.displayManager = new DisplayManager(this);
        
        // API testing initialize 器
        this.apiTester = new ApiTester(this);
        
        //console.log('✅ initialize complete component all');
    }
    
    init() {
        // initialize 导航切换
        this.initNavigation();
        
        // initialize button event
        this.initEventListeners();
        
        // initialize event listen window
        this.initWindowEvents();
        
        // saved scan results load auto of 并
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initialize event listen window
    initWindowEvents() {
        // event listen window 焦点
        window.addEventListener('focus', () => {
            //console.log('🔄 window 获得焦点，data load re- ...');
            this.loadResults().then(() => {
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            });
        });
        
        // listen page 可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                //console.log('🔄 page as 变可见，data load re- ...');
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
            }
        });
        
        // data check 定期完整性
        setInterval(() => {
            this.checkDataIntegrity();
        }, 5000); // 5 seconds check time(s) 每一
    }
    
    // data check 完整性
    async checkDataIntegrity() {
        try {
            // URL get page current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // data check from IndexedDB
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const storedData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // data memory if in in has has 存储但没，load re-
            if (storedData && storedData.results && 
                Object.keys(this.results || {}).length === 0) {
                //console.log('🔧 detected data lost，resume 正在...');
                await this.loadResults();
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            }
        } catch (error) {
            console.error('failed data check 完整性:', error);
        }
    }
    
    initEventListeners() {
        document.getElementById('scanBtn').addEventListener('click', () => this.startScan());
        document.getElementById('deepScanBtn').addEventListener('click', () => this.toggleDeepScan());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        
        // request button batch
        const batchRequestBtn = document.getElementById('batchRequestBtn');
        if (batchRequestBtn) {
            batchRequestBtn.addEventListener('click', () => this.batchRequestTest());
        }
        
        // API path custom add button
        const addCustomApiBtn = document.getElementById('addCustomApiBtn');
        if (addCustomApiBtn) {
            addCustomApiBtn.addEventListener('click', () => this.addCustomApiPaths());
        }
        
        // close button 模态框
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('requestResultModal').style.display = 'none';
            });
        }
        
        // process button event 新
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
                
                // scan results add get all to 并模态框
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    clone.classList.remove('collapsed');
                    resultsContainer.appendChild(clone);
                });
                
                modal.style.display = 'block';
            });
        }
        
        // copy results button all
        const copyAllResultsBtn = document.getElementById('copyAllResultsBtn');
        if (copyAllResultsBtn) {
            copyAllResultsBtn.addEventListener('click', () => {
                const results = document.getElementById('requestResults').innerText;
                navigator.clipboard.writeText(results).then(() => {
                    const textSpan = copyAllResultsBtn.querySelector('.text');
                    if (textSpan) {
                        textSpan.textContent = '✅ copy 已';
                        setTimeout(() => {
                            textSpan.textContent = 'copy results 全部';
                        }, 2000);
                    }
                });
            });
        }
    }
    
    // initialize feature 导航
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const pages = document.querySelectorAll('.page');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;
                
                // update status 导航
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
                
                // process special page of after 切换
                this.handlePageSwitch(targetPage);
            });
        });
    }
    
    // process page of after 切换逻辑
    handlePageSwitch(pageName) {
        switch (pageName) {
            case 'scan':
                // scan page to when 切换，results load re- display 并
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
                break;
            case 'deep':
                // deep scan page to when 切换，deep scan resume status
                this.loadResults().then(() => {
                    this.restoreDeepScanUI();
                });
                break;
            case 'test':
                // API testing page to when 切换，update select class 分器
                this.loadResults().then(() => {
                    this.updateCategorySelect();
                });
                break;
            case 'about':
                // page off 于
                break;
        }
    }
    
    // deep scan resume status UI
    restoreDeepScanUI() {
        if (this.deepScanRunning) {
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            const configDiv = document.getElementById('deepScanConfig');
            const progressDiv = document.getElementById('deepScanProgress');
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ stop scan';
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
        
        // deep scan results if has，display 确保
        if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
            this.results = this.deepScanResults;
            this.displayResults();
        }
    }
    
    // update select class 分器
    updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.results) return;
        
        // save current in of 选值
        const currentValue = categorySelect.value;
        
        // clear options has 现
        categorySelect.innerHTML = '';
        
        // add options default
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'please select test class of 要分';
        categorySelect.appendChild(defaultOption);
        
        // add data class of has 分
        const categories = [
            { key: 'customApis', title: '🔧 API path custom' },
            { key: 'absoluteApis', title: '🔗 absolute path API' },
            { key: 'relativeApis', title: '📁 relative path API' },
            { key: 'jsFiles', title: '📜 file JS' },
            { key: 'cssFiles', title: '🎨 file CSS' },
            { key: 'images', title: '🖼️ file 图片' },
            { key: 'urls', title: '🔗 URL 完整' },
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
        
        // resume in of before 之选值（if 仍然存在）
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
            // send to 消息content scan line(s) script进
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                throw new Error('information get page current 无法');
            }
            
            // URL check page(s) of no yes yes has 效网
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                if (!silent) {
                    alert('scan page 无法系统，feature use page(s) 请在普通网上此');
                }
                return;
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo' });
            
            if (response) {
                //console.log('🔍 [SCAN LOG] scan results original to 收');
                //console.log('🔍 [SCAN LOG] statistics results original:', this.getResultsStats(response));
                
                // selector scan 在阶段就应用
                //console.log('🔍 [SCAN LOG] scan results selector start to 应用...');
                this.results = await this.applyFiltersToScanResults(response);
                //console.log('🔍 [SCAN LOG] statistics results after 筛选:', this.getResultsStats(this.results));
                //console.log('✅ [SCAN LOG] selector complete 应用');
                
                // deep scan clear results，data 避免旧干扰
                this.deepScanResults = {};
                //console.log('🔍 [SCAN LOG] deep scan clear results cache 已');
                
                await this.displayResults();
                
                // save execute operation 确保被
                //console.log('🔍 [SCAN LOG] call 准备 saveResults()...');
                try {
                    await this.saveResults();
                    //console.log('✅ [SCAN LOG] saveResults() complete call');
                } catch (saveError) {
                    console.error('❌ [SCAN LOG] saveResults() failed call:', saveError);
                }
                
                // update select class 分器
                this.updateCategorySelect();
                
                if (!silent) {
                    //console.log('✅ [SCAN LOG] scan complete');
                }
            } else {
                throw new Error('scan results to 未收');
            }
        } catch (error) {
            console.error('❌ [SCAN LOG] scan failed:', error);
            if (!silent) {
                alert('scan failed: ' + error.message);
            }
        }
    }
    
    // selector scan 在阶段应用
    async applyFiltersToScanResults(rawResults) {
        try {
            //console.log('🔍 [FILTER LOG] selector start 应用...');
            //console.log('🔍 [FILTER LOG] statistics results original:', this.getResultsStats(rawResults));
            
            // selector load 确保已
            await this.loadFiltersIfNeeded();
            
            // unavailable selector if，return results original
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.warn('⚠️ [FILTER LOG] selector load 未，scan results return original');
                return rawResults;
            }
            
            console.log('🔍 [FILTER LOG] selector status:', {
                domainPhoneFilter: !!window.domainPhoneFilter,
                apiFilter: !!window.apiFilter
            });
            
            // results object of after 创建筛选
            const filteredResults = {};
            
            // API selector path data process type use
            if (window.apiFilter) {
                //console.log('🔍 [FILTER LOG] API selector path data process use ...');
                const resultsSet = window.apiFilter.createEmptyResultSet();
                
                // path process type 各种
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        //console.log(`🔍 [FILTER LOG] process ${category}: ${rawResults[category].length} project item(s)`);
                        rawResults[category].forEach(item => {
                            if (item && typeof item === 'string') {
                                window.apiFilter.filterAPI(item, resultsSet);
                            }
                        });
                    }
                });
                
                // convert as of after 将筛选SetArray
                Object.keys(resultsSet).forEach(key => {
                    if (resultsSet[key] instanceof Set) {
                        filteredResults[key] = Array.from(resultsSet[key]);
                        //console.log(`🔍 [FILTER LOG] API selector process ${key}: ${filteredResults[key].length} project item(s)`);
                    } else if (Array.isArray(resultsSet[key])) {
                        filteredResults[key] = resultsSet[key];
                        //console.log(`🔍 [FILTER LOG] API selector process ${key}: ${filteredResults[key].length} project item(s)`);
                    }
                });
            } else {
                // API selector if has 没，copy path data type directly
                //console.log('⚠️ [FILTER LOG] API unavailable selector，copy path data directly');
                const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
                pathCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // sensitive information selector domain process use and 手机号
            if (window.domainPhoneFilter) {
                //console.log('🔍 [FILTER LOG] sensitive information selector domain process use 手机号...');
                
                // domain 筛选
                if (rawResults.domains && Array.isArray(rawResults.domains)) {
                    //console.log(`🔍 [FILTER LOG] domain 筛选: ${rawResults.domains.length} -> `, rawResults.domains.slice(0, 5));
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(rawResults.domains);
                    //console.log(`🔍 [FILTER LOG] domain results 筛选: ${filteredResults.domains.length} domain item(s) has 效`);
                }
                
                // subdomain 筛选
                if (rawResults.subdomains && Array.isArray(rawResults.subdomains)) {
                    //console.log(`🔍 [FILTER LOG] subdomain 筛选: ${rawResults.subdomains.length}  item(s)`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(rawResults.subdomains);
                    //console.log(`🔍 [FILTER LOG] subdomain results 筛选: ${filteredResults.subdomains.length} subdomain item(s) has 效`);
                }
                
                // 筛选邮箱
                if (rawResults.emails && Array.isArray(rawResults.emails)) {
                    //console.log(`🔍 [FILTER LOG] 筛选邮箱: ${rawResults.emails.length}  item(s)`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(rawResults.emails);
                    //console.log(`🔍 [FILTER LOG] results 邮箱筛选: ${filteredResults.emails.length}  item(s) has 效邮箱`);
                }
                
                // 筛选手机号
                if (rawResults.phoneNumbers && Array.isArray(rawResults.phoneNumbers)) {
                    //console.log(`🔍 [FILTER LOG] 筛选手机号: ${rawResults.phoneNumbers.length}  item(s)`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(rawResults.phoneNumbers, true);
                    //console.log(`🔍 [FILTER LOG] results 手机号筛选: ${filteredResults.phoneNumbers.length}  item(s) has 效手机号`);
                }
            } else {
                // selector domain if has 没手机号，sensitive information copy directly
                //console.log('⚠️ [FILTER LOG] unavailable selector domain 手机号，sensitive information copy directly');
                const sensitiveCategories = ['domains', 'subdomains', 'emails', 'phoneNumbers'];
                sensitiveCategories.forEach(category => {
                    if (rawResults[category] && Array.isArray(rawResults[category])) {
                        filteredResults[category] = [...rawResults[category]];
                    }
                });
            }
            
            // process category of 保留其他未（copy directly）
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
            
            //console.log('✅ [FILTER LOG] complete 筛选，statistics results final:', this.getResultsStats(filteredResults));
            
            // marker results 已筛选
            filteredResults._filtered = true;
            
            return filteredResults;
            
        } catch (error) {
            console.error('❌ [FILTER LOG] selector failed 应用:', error);
            console.error('❌ [FILTER LOG] error 堆栈:', error.stack);
            return rawResults; // return results original error occurred when
        }
    }
    
    // selector load（if 需要）
    async loadFiltersIfNeeded() {
        try {
            // filter check load no yes 已经
            if (window.domainPhoneFilter && window.apiFilter) {
                return;
            }
            
            //console.log('🔄 selector start scan load ...');
            
            // selector domain load and 手机号
            if (!window.domainPhoneFilter) {
                await this.loadFilterScript('filters/domain-phone-filter.js');
                
                if (typeof DomainPhoneFilter !== 'undefined') {
                    window.domainPhoneFilter = new DomainPhoneFilter();
                    //console.log('✅ initialized successfully selector domain 手机号');
                }
            }
            
            // API selector load
            if (!window.apiFilter) {
                await this.loadFilterScript('filters/api-filter.js');
                
                if (typeof APIFilter !== 'undefined') {
                    window.apiFilter = new APIFilter();
                    //console.log('✅ initialized successfully API selector');
                }
            }
            
        } catch (error) {
            console.error('❌ failed to load selector:', error);
        }
    }
    
    // selector script load
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 loaded successfully selector script: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ failed to load selector script: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve();
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ selector failed script load: ${scriptPath}`, error);
                resolve();
            }
        });
    }
    
    // information get statistics results
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
            
            // URL check page(s) of no yes yes has 效网
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                //console.log('skip scan auto page of 系统');
                return;
            }
            
            // update scan domain current display
            this.updateCurrentDomain(tab.url);
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // scan check time(s) from when IndexedDB上间
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const scanData = await window.indexedDBManager.loadScanResults(fullUrl);
            
            // scan page current if has 没过， minutes or 超过5，scan auto then
            const now = Date.now();
            const lastScanTime = scanData ? scanData.timestamp : 0;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - lastScanTime > fiveMinutes) {
                setTimeout(() => {
                    this.startScan(true); // scan 静默
                }, 2000);
            }
        } catch (error) {
            console.error('failed scan check auto:', error);
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
                        <span style="font-size: 12px; opacity: 0.8;">scan 正在:</span>
                        <span style="color: #00d4aa; font-weight: 600;">${protocol}//${domain}${port}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('failed update domain display:', error);
        }
    }
    
    async clearResults() {
        // confirm clear operation
        if (!confirm('clear scan data page current of 确定要吗？resume operation 此不可。')) {
            return;
        }
        
        try {
            // URL get page current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showNotification('URL get page current 无法', 'error');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const fullUrl = `https://${urlObj.hostname}`;
            
            // clear data memory in of
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.deepScanRunning = false;
            this.currentDepth = 0;
            
            // clear display 界面
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // clear data page current related from of IndexedDB
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            await window.indexedDBManager.deleteScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanResults(fullUrl);
            await window.indexedDBManager.deleteDeepScanState(fullUrl);
            
            // deep scan reset status UI
            this.resetDeepScanUI();
            
            // reset select class 分器
            this.updateCategorySelect();
            
            // success clear hint display
            this.showNotification(`page ${urlObj.hostname} clear scan data of 已`, 'success');
            
            //console.log(`✅ page ${urlObj.hostname} clear scan data of 已`);
            
        } catch (error) {
            console.error('❌ failed clear data:', error);
            this.showNotification('failed clear data: ' + error.message, 'error');
        }
    }
    
    // deep scan reset status UI
    resetDeepScanUI() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn?.querySelector('.text');
        const configDiv = document.getElementById('deepScanConfig');
        const progressDiv = document.getElementById('deepScanProgress');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '🚀 deep scan start';
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
        
        // deep scan input field reset related of
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        if (maxDepthInput) maxDepthInput.value = '2';
        if (concurrencyInput) concurrencyInput.value = '3';
    }
    
    // display 通知
    showNotification(message, type = 'info') {
        // element 创建通知
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings 样式
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
        
        // settings type 根据颜色
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
        
        // add page to
        document.body.appendChild(notification);
        
        // 3 seconds remove auto after
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
            // URL get page current as 作存储键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ URL get page current 无法，save skip');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            //console.log('💾 [SAVE LOG] save start results ...');
            //console.log('💾 [SAVE LOG] current this.results statistics:', this.getResultsStats(this.results));
            //console.log('💾 [SAVE LOG] current this.deepScanResults statistics:', this.getResultsStats(this.deepScanResults));
            
            // save results final of 确定要
            let finalResults = {};
            
            // scan results if has 普通，use directly（已经筛选过）
            if (this.results && Object.keys(this.results).length > 0) {
                //console.log('💾 [SAVE LOG] scan results basic use as 普通作');
                finalResults = { ...this.results };
            }
            
            // deep scan results if has，需要先筛选再合并
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                //console.log('💾 [SAVE LOG] deep scan results process ...');
                
                // deep scan selector results 先对应用
                const filteredDeepResults = await this.applyFiltersToScanResults(this.deepScanResults);
                //console.log('💾 [SAVE LOG] deep scan statistics results after 筛选:', this.getResultsStats(filteredDeepResults));
                
                // results of after 合并筛选
                finalResults = this.mergeResults(finalResults, filteredDeepResults);
                //console.log('💾 [SAVE LOG] statistics results final after 合并:', this.getResultsStats(finalResults));
            }
            
            // save results final to of after 筛选IndexedDB
            if (Object.keys(finalResults).length > 0) {
                const itemCount = Object.values(finalResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                //console.log(`💾 [SAVE LOG] save final to IndexedDB，total ${itemCount} record record(s) of after 筛选`);
                
                // save data validate of
                const domainCount = finalResults.domains ? finalResults.domains.length : 0;
                //console.log(`💾 [SAVE LOG] validate：save domain quantity of = ${domainCount}`);
                
                // scan results save use IndexedDB普通
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                // URL save for of 构造完整
                const fullUrl = `https://${hostname}`;
                
                // URL get title page for digit(s) 置跟踪
                const pageTitle = document.title || tab.title || 'Unknown Page';
                
                // URL save information results contains digit(s) when 置
                await window.indexedDBManager.saveScanResults(fullUrl, finalResults, tab.url, pageTitle);
                //console.log(`✅ [SAVE LOG] IndexedDB save complete: ${hostname}，URL information contains digit(s) 置`);
            } else {
                //console.log('💾 [SAVE LOG] save results has has 没效需要');
            }
            
            // deep scan save use status IndexedDB
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ [SAVE LOG] deep scan save complete status to IndexedDB: ${hostname}`);
            
            // deep scan results if has，save to 也IndexedDB
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log(`✅ [SAVE LOG] deep scan save complete results to IndexedDB: ${hostname}`);
            }
            
        } catch (error) {
            console.error('❌ [SAVE LOG] failed save data:', error);
        }
    }
    
    // scan results of after 合并筛选（data of of yes 确保合并也筛选过）
    async mergeFilteredResults(existingResults, newResults) {
        //console.log('🔍 [MERGE LOG] start results of after 合并筛选...');
        //console.log('🔍 [MERGE LOG] statistics results has 现:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE LOG] statistics results 新:', this.getResultsStats(newResults));
        
        // results if has 新还没经过筛选，先筛选
        let filteredNewResults = newResults;
        if (newResults && !newResults._filtered) {
            //console.log('⚠️ [MERGE LOG] results 新未筛选，selector 正在应用...');
            filteredNewResults = await this.applyFiltersToScanResults(newResults);
            filteredNewResults._filtered = true; // marker 已筛选
            //console.log('✅ [MERGE LOG] complete results 新筛选:', this.getResultsStats(filteredNewResults));
        } else {
            //console.log('✅ [MERGE LOG] results 新已筛选，directly 合并');
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
            
            // use Set去重，after 然合并
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        // marker results of after 合并已筛选
        mergedResults._filtered = true;
        
        //console.log('✅ [MERGE LOG] complete results after 筛选合并，statistics final:', this.getResultsStats(mergedResults));
        return mergedResults;
    }
    
    // scan results method of 合并辅助
    mergeResults(existingResults, newResults) {
        //console.log('🔍 [MERGE-SIMPLE LOG] start results 简单合并...');
        //console.log('🔍 [MERGE-SIMPLE LOG] statistics results has 现:', this.getResultsStats(existingResults));
        //console.log('🔍 [MERGE-SIMPLE LOG] statistics results 新:', this.getResultsStats(newResults));
        
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
            
            // use Set去重，after 然合并
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
            
            if (existingItems.length > 0 || newItems.length > 0) {
                //console.log(`🔍 [MERGE-SIMPLE LOG] ${category}: ${existingItems.length} + ${newItems.length} = ${mergedResults[category].length}`);
            }
        });
        
        //console.log('✅ [MERGE-SIMPLE LOG] complete 简单合并，statistics final:', this.getResultsStats(mergedResults));
        console.warn('⚠️ [MERGE-SIMPLE LOG] 注意：selector method 此未应用，data contains 可能未筛选');
        
        return mergedResults;
    }
    
    async loadResults() {
        try {
            // URL get page current as 作存储键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ URL get page current 无法，skip load');
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            
            console.log(`🔄 [LOAD LOG] data load page 正在: ${hostname}`);
            
            // scan results load from IndexedDB普通
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // URL load for of 构造完整
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            // fixed：data process new structure 正确，data 存储在 results in 属性
            let loadedData = null;
            if (loadedDataWrapper && loadedDataWrapper.results) {
                // check new structure no yes yes 嵌套
                if (loadedDataWrapper.results.results) {
                    // format 新：data 在 results.results in
                    loadedData = loadedDataWrapper.results.results;
                } else {
                    // format 旧：data directly 在 results in
                    loadedData = loadedDataWrapper.results;
                }
            }
            
            if (loadedData && typeof loadedData === 'object') {
                const itemCount = Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const domainCount = loadedData.domains ? loadedData.domains.length : 0;
                
                //console.log(`🔄 [LOAD LOG] data statistics load from IndexedDB:`, this.getResultsStats(loadedData));
                //console.log(`🔄 [LOAD LOG] domain quantity in 存储: ${domainCount}`);
                
                // data check no yes 已经筛选过
                if (loadedData._filtered) {
                    //console.log(`✅ [LOAD LOG] data 已筛选，use directly`);
                    this.results = loadedData;
                    this.deepScanResults = loadedData;
                } else {
                    //console.log(`⚠️ [LOAD LOG] data 未筛选，selector re- 应用...`);
                    // selector data load re- of 对应用
                    this.results = await this.applyFiltersToScanResults(loadedData);
                    this.deepScanResults = this.results;
                    
                    // save data re- of after 筛选
                    await this.saveResults();
                    //console.log(`✅ [LOAD LOG] save data re- 已筛选并`);
                }
                
                //console.log(`✅ [LOAD LOG] data statistics load final:`, this.getResultsStats(this.results));
                this.displayResults();
            } else {
                //console.log(`⚠️ [LOAD LOG] page ${hostname} not found scan data of has 效`);
            }
            
            // deep scan resume status from IndexedDB
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                console.log('🔄 [LOAD LOG] deep scan resume status from IndexedDB:', {
                    running: this.deepScanRunning,
                    scannedCount: this.scannedUrls.size,
                    depth: this.currentDepth
                });
            }
            
            // deep scan results load from 尝试IndexedDB
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            if (deepScanDataWrapper && deepScanDataWrapper.results) {
                const deepScanData = deepScanDataWrapper.results;
                const deepItemCount = Object.values(deepScanData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                
                // deep scan scan results results if 比普通更完整，deep scan results use
                if (deepItemCount > 0) {
                    const currentItemCount = loadedData ? Object.values(loadedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;
                    if (deepItemCount > currentItemCount) {
                        this.results = deepScanData;
                        this.deepScanResults = deepScanData;
                        console.log(`🔄 [LOAD LOG] deep scan results use IndexedDB，total ${deepItemCount} record record(s)`);
                        this.displayResults();
                    }
                }
            }
        } catch (error) {
            console.error('❌ [LOAD LOG] failed results load:', error);
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
    
    // results display - use DisplayManager
    async displayResults() {
        if (this.displayManager) {
            await this.displayManager.displayResults();
        } else {
            console.error('not initialized DisplayManager');
        }
    }
    
    // request batch test - use ApiTester
    async batchRequestTest() {
        if (this.apiTester) {
            await this.apiTester.batchRequestTest();
        } else {
            console.error('not initialized ApiTester');
            alert('API testing not initialized 器，execute test 无法');
        }
    }
    
        // API path custom add
    addCustomApiPaths() {
        const customApiPathsInput = document.getElementById('customApiPaths');
        if (!customApiPathsInput) {
            console.error('API path custom input field to 找不');
            return;
        }
        
        const customApiPaths = customApiPathsInput.value.trim();
        if (!customApiPaths) {
            alert('API path custom please enter，path item(s) line(s) 每一');
            return;
        }
        
        // API path custom parse
        const paths = this.apiTester.parseCustomApiPaths(customApiPaths);
        if (paths.length === 0) {
            alert('API path please enter of has 效');
            return;
        }
        
        // API path scan results custom add to in 将
        if (!this.results.customApis) {
            this.results.customApis = [];
        }
        
        // use line(s) Set进去重
        const existingSet = new Set(this.results.customApis);
        let addedCount = 0;
        
        paths.forEach(path => {
            if (!existingSet.has(path)) {
                this.results.customApis.push(path);
                existingSet.add(path);
                addedCount++;
            }
        });
        
        // save results to 存储
        this.saveResults();
        
        // results re- display
        this.displayResults();
        
        // success add hint display of
        const message = `success add ${addedCount} API path scan results custom item(s) to in:\n${paths.join('\n')}`;
        alert(message);
        
        // input field clear
        customApiPathsInput.value = '';
        
        //console.log(`✅ add 了 ${addedCount} API path scan results custom item(s) to:`, paths);
    }
    
    // deep scan 切换 - use DeepScanner
    toggleDeepScan() {
        if (this.deepScanner) {
            this.deepScanner.toggleDeepScan();
        } else {
            console.error('not initialized DeepScanner');
            alert('deep scan not initialized 器，scan execute 无法');
        }
    }
}
