class ILoveYouTranslucent7 {
    constructor() {
        this.results = {};
        this.deepScanRunning = false;
        this.scannedUrls = new Set();
        this.pendingUrls = new Set();
        this.deepScanResults = {};
        this.currentDepth = 0;
        this.maxDepth = 2;
        this.concurrency = 3;
        
        // initialize feature module - initialize 先SettingsManager
        this.settingsManager = new SettingsManager();
        window.SettingsManager = this.settingsManager; // 确保全局可访问
        
        this.basicScanner = new BasicScanner(this);
        this.deepScanner = new DeepScanner(this);
        this.displayManager = new DisplayManager(this);
        this.apiTester = new ApiTester(this);
        this.exportManager = new ExportManager(this);
        this.contentExtractor = new ContentExtractor();
        this.patternExtractor = new PatternExtractor();
        this.jsInjector = new JSInjector();
        
        this.init();
    }
    
    init() {
        // initialize 导航切换
        this.initNavigation();
        
        // initialize button event
        this.initEventListeners();
        
        // initialize data sync 机制
        this.initDataSync();
        
        // initialize listen 消息器
        this.initMessageListeners();
        
        // saved scan results load auto of 并
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initialize listen 消息器
    initMessageListeners() {
        // deep scan listen window of from 自消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateScanResults' || 
                message.action === 'scanProgress' || 
                message.action === 'scanComplete' || 
                message.action === 'scanError') {
                
                // deep scan process window of 消息
                if (this.deepScanner) {
                    return this.deepScanner.handleScanWindowMessage(message, sender, sendResponse);
                }
            }
        });
    }
    
    // initialize data sync 机制
    initDataSync() {
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
            if (!tab || !tab.url) {
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // data check from IndexedDB完整性
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // scan results check 普通
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // deep scan results check
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanData = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // data memory page current if in in of has has IndexedDB但没，load re-
            if ((scanData || deepScanData) && Object.keys(this.results || {}).length === 0) {
                //console.log(`🔧 detected page ${hostname} data lost IndexedDB，resume 正在...`);
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
        
        // button event 收放
        const toggleButtonsBtn = document.getElementById('toggleButtonsBtn');
        if (toggleButtonsBtn) {
            toggleButtonsBtn.addEventListener('click', () => this.toggleScanButtons());
        }
        
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
            case 'settings':
                // settings page to when 切换，settings load
                if (this.settingsManager) {
                    this.settingsManager.loadSettings();
                }
                // custom regex initialize event 弹窗
                this.initCustomRegexModal();
                // custom regex configuration load display column(s) 并表
                this.loadCustomRegexList();
                break;
            case 'js-injection':
                // inject page to when 切换JS，initialize feature inject JS
                this.initJSInjectPage();
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
        
        // clear options has 现（options default 保留）
        const defaultOption = categorySelect.querySelector('option[value=""]');
        categorySelect.innerHTML = '';
        if (defaultOption) {
            categorySelect.appendChild(defaultOption);
        }
        
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
    
    // method 委托 - feature module of 将委托给相应
    async startScan(silent = false) {
        // regular expression configuration load re-
        if (this.patternExtractor) {
            await this.patternExtractor.loadCustomPatterns();
            //console.log('🔄 regular expression configuration load re- 已');
        }
        return await this.basicScanner.startScan(silent);
    }
    
    toggleDeepScan() {
        return this.deepScanner.toggleDeepScan();
    }
    
    displayResults() {
        return this.displayManager.displayResults();
    }
    
    async batchRequestTest() {
        return await this.apiTester.batchRequestTest();
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
    
    exportResults() {
        return this.exportManager.exportResults();
    }
    
    // feature button 收放
    // feature button 收放
    toggleScanButtons() {
        const scanButtonsContainer = document.getElementById('scanButtonsContainer');
        const toggleButton = document.getElementById('toggleButtonsBtn');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');
        const toggleText = toggleButton.querySelector('.toggle-text');
        const resultsContainer = document.getElementById('results');
        
        if (scanButtonsContainer && toggleButton) {
            const isCollapsed = scanButtonsContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                // button on 展
                scanButtonsContainer.classList.remove('collapsed');
                toggleIcon.textContent = '▲';
                toggleText.textContent = 'button 收起';
                toggleButton.classList.remove('collapsed');
                
                // results resume original of 容器高度
                if (resultsContainer) {
                    resultsContainer.classList.remove('expanded');
                }
            } else {
                // button 收起
                scanButtonsContainer.classList.add('collapsed');
                toggleIcon.textContent = '▼';
                toggleText.textContent = 'button on 展';
                toggleButton.classList.add('collapsed');
                
                // results extension 容器高度，button of from empty 占用原间
                if (resultsContainer) {
                    resultsContainer.classList.add('expanded');
                }
            }
        }
    }

    // custom regex initialize 弹窗
    initCustomRegexModal() {
        const addCustomRegexBtn = document.getElementById('addCustomRegexBtn');
        const customRegexModal = document.getElementById('customRegexModal');
        const closeCustomRegexModal = document.getElementById('closeCustomRegexModal');
        const confirmCustomRegexBtn = document.getElementById('confirmCustomRegexBtn');
        const cancelCustomRegexBtn = document.getElementById('cancelCustomRegexBtn');

        // open 弹窗
        if (addCustomRegexBtn) {
            addCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'block';
                    // input field clear
                    document.getElementById('customRegexName').value = '';
                    document.getElementById('customRegexKey').value = '';
                    document.getElementById('customRegexPattern').value = '';
                }
            });
        }

        // close 弹窗
        if (closeCustomRegexModal) {
            closeCustomRegexModal.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // cancel button
        if (cancelCustomRegexBtn) {
            cancelCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // confirm add button
        if (confirmCustomRegexBtn) {
            confirmCustomRegexBtn.addEventListener('click', () => {
                this.handleCustomRegexSubmit();
            });
        }

        // close 点击弹窗外部
        if (customRegexModal) {
            customRegexModal.addEventListener('click', (e) => {
                if (e.target === customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }
    }

    // custom regex process 提交
    // custom regex process 提交
    async handleCustomRegexSubmit() {
        const nameInput = document.getElementById('customRegexName');
        const keyInput = document.getElementById('customRegexKey');
        const patternInput = document.getElementById('customRegexPattern');
        const modal = document.getElementById('customRegexModal');

        if (!nameInput || !keyInput || !patternInput) {
            this.showNotification('input field not found element', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        const pattern = patternInput.value.trim();

        // validate 输入
        if (!name) {
            this.showNotification('please enter name display', 'warning');
            nameInput.focus();
            return;
        }

        if (!key) {
            this.showNotification('please enter 存储键名', 'warning');
            keyInput.focus();
            return;
        }

        if (!pattern) {
            this.showNotification('regular expression please enter', 'warning');
            patternInput.focus();
            return;
        }

        // validate format 键名（只允许字母、digit(s)、下划线）
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
            this.showNotification('contains 存储键名只能字母、digit(s) and 下划线，starts with with 且必须字母', 'warning');
            keyInput.focus();
            return;
        }

        // regular expression validate
        try {
            new RegExp(pattern);
        } catch (error) {
            this.showNotification('regular expression format error: ' + error.message, 'error');
            patternInput.focus();
            return;
        }

        // check name and no yes 键名重复
        try {
            // custom regex get configuration from SettingsManager
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();

            // check no yes 键名重复
            if (customConfigs[key]) {
                this.showNotification(`存储键名 "${key}" 已存在，use 请其他键名`, 'warning');
                keyInput.focus();
                return; // close 不弹窗
            }

            // check name no yes 重复
            const existingNames = Object.values(customConfigs).map(config => config.name);
            if (existingNames.includes(name)) {
                this.showNotification(`name display "${name}" 已存在，use name 请其他`, 'warning');
                nameInput.focus();
                return; // close 不弹窗
            }

            // if has 没重复，save configuration
            await this.saveCustomRegexConfig(name, key, pattern);
            
            // close 弹窗
            if (modal) {
                modal.style.display = 'none';
            }
            this.showNotification(`custom regex "${name}" success add`, 'success');

        } catch (error) {
            console.error('failed save check configuration 重复或:', error);
            this.showNotification('operation failed: ' + error.message, 'error');
        }
    }

    // custom regex save configuration
    async saveCustomRegexConfig(name, key, pattern) {
        try {
            // custom regex save configuration via SettingsManager
            await this.settingsManager.saveCustomRegexConfig(key, {
                name: name,
                pattern: pattern,
                createdAt: Date.now()
            });

            //console.log('✅ custom regex saved configuration:', { name, key, pattern });

            // configuration load re- 通知PatternExtractor
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }

            // custom regex refresh configuration display column(s) 表
            this.loadCustomRegexList();

        } catch (error) {
            console.error('❌ custom regex failed save configuration:', error);
            throw error;
        }
    }

    // custom regex configuration load display column(s) 并表
    async loadCustomRegexList() {
        try {
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();
            
            // custom regex find configuration column(s) 或创建表容器
            let listContainer = document.getElementById('customRegexList');
            if (!listContainer) {
                // if 容器不存在，创建它并插入到"custom regex add"按钮后面
                const addRegexBtn = document.getElementById('addCustomRegexBtn');
                if (addRegexBtn) {
                    listContainer = document.createElement('div');
                    listContainer.id = 'customRegexList';
                    listContainer.className = 'api-test-section';
                    listContainer.innerHTML = `
                        <div class="config-title">已add的custom regex configuration</div>
                        <div id="customRegexItems"></div>
                    `;
                    addRegexBtn.parentNode.insertBefore(listContainer, addRegexBtn);
                }
            }
            
            const itemsContainer = document.getElementById('customRegexItems');
            if (!itemsContainer) return;
            
            // clear content has 现
            itemsContainer.innerHTML = '';
            
            // custom configuration if has 没，tooltip display
            if (Object.keys(customConfigs).length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 20px; font-size: 12px;">
                        暂无custom regex configuration<br>
                        点击上方"custom regex add"按钮来addconfiguration
                    </div>
                `;
                return;
            }
            
            // custom configuration display item(s) 每
            Object.entries(customConfigs).forEach(([key, config]) => {
                const configItem = document.createElement('div');
                configItem.className = 'custom-regex-item';
                configItem.style.cssText = `
                    background: rgba(40, 40, 40, 0.5);
                    border: 1px solid rgba(90, 90, 90, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    transition: all 0.3s;
                `;
                
                const createdDate = config.createdAt ? new Date(config.createdAt).toLocaleString() : '未知';
                
                configItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #00d4aa; font-size: 14px; margin-bottom: 4px;">
                                <input type="text" class="edit-name-input" value="${config.name}" style="
                                    background: transparent;
                                    border: none;
                                    color: #00d4aa;
                                    font-weight: 600;
                                    font-size: 14px;
                                    width: 100%;
                                    outline: none;
                                    border-bottom: 1px solid transparent;
                                    transition: all 0.2s;
                                " readonly>
                            </div>
                            <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
                                键名: <span style="color: #ccc; font-family: monospace;">${key}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; margin-bottom: 8px;">
                                when 创建间: ${createdDate}
                            </div>
                            <div style="position: relative;">
                                <textarea class="edit-pattern-textarea" style="
                                    font-size: 12px;
                                    color: #ccc;
                                    font-family: monospace;
                                    background: rgba(0,0,0,0.3);
                                    padding: 6px;
                                    border-radius: 4px;
                                    word-break: break-all;
                                    width: 100%;
                                    border: 1px solid transparent;
                                    resize: vertical;
                                    min-height: 40px;
                                    outline: none;
                                    transition: all 0.2s;
                                " readonly>${config.pattern}</textarea>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px; margin-left: 10px;">
                            <button class="edit-custom-regex-btn" data-key="${key}" style="
                                background: rgba(0, 212, 170, 0.3);
                                border: 1px solid rgba(0, 212, 170, 0.5);
                                color: #00d4aa;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                white-space: nowrap;
                            ">编辑</button>
                            <button class="save-custom-regex-btn" data-key="${key}" style="
                                background: rgba(52, 152, 219, 0.3);
                                border: 1px solid rgba(52, 152, 219, 0.5);
                                color: #3498db;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                white-space: nowrap;
                                display: none;
                            ">保存</button>
                            <button class="cancel-edit-regex-btn" data-key="${key}" style="
                                background: rgba(149, 165, 166, 0.3);
                                border: 1px solid rgba(149, 165, 166, 0.5);
                                color: #95a5a6;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                white-space: nowrap;
                                display: none;
                            ">cancel</button>
                            <button class="delete-custom-regex-btn" data-key="${key}" style="
                                background: rgba(231, 76, 60, 0.3);
                                border: 1px solid rgba(231, 76, 60, 0.5);
                                color: #e74c3c;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                white-space: nowrap;
                            ">delete</button>
                        </div>
                    </div>
                `;
                
                // add 悬停效果
                configItem.addEventListener('mouseenter', () => {
                    configItem.style.transform = 'translateY(-2px)';
                    configItem.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.4)';
                    configItem.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                });
                
                configItem.addEventListener('mouseleave', () => {
                    configItem.style.transform = 'translateY(0)';
                    configItem.style.boxShadow = 'none';
                    configItem.style.borderColor = 'rgba(90, 90, 90, 0.3)';
                });
                
                // input field get button element item(s) and 各
                const editBtn = configItem.querySelector('.edit-custom-regex-btn');
                const saveBtn = configItem.querySelector('.save-custom-regex-btn');
                const cancelBtn = configItem.querySelector('.cancel-edit-regex-btn');
                const deleteBtn = configItem.querySelector('.delete-custom-regex-btn');
                const nameInput = configItem.querySelector('.edit-name-input');
                const patternTextarea = configItem.querySelector('.edit-pattern-textarea');
                
                // cancel edit original for 存储值
                let originalName = config.name;
                let originalPattern = config.pattern;
                
                // edit button event
                editBtn.addEventListener('click', () => {
                    // edit mode 进入
                    nameInput.removeAttribute('readonly');
                    patternTextarea.removeAttribute('readonly');
                    nameInput.style.borderBottom = '1px solid #00d4aa';
                    patternTextarea.style.border = '1px solid #00d4aa';
                    patternTextarea.style.background = 'rgba(0,0,0,0.5)';
                    
                    // button status display 切换
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    cancelBtn.style.display = 'block';
                    
                    // input field name to 聚焦
                    nameInput.focus();
                });
                
                // save button event
                saveBtn.addEventListener('click', async () => {
                    const newName = nameInput.value.trim();
                    const newPattern = patternTextarea.value.trim();
                    
                    // validate 输入
                    if (!newName) {
                        this.showNotification('please enter name display', 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    if (!newPattern) {
                        this.showNotification('regular expression please enter', 'warning');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // regular expression validate
                    try {
                        new RegExp(newPattern);
                    } catch (error) {
                        this.showNotification('regular expression format error: ' + error.message, 'error');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // check configuration name no yes 与其他重复（exclude configuration current）
                    const customConfigs = await this.settingsManager.getCustomRegexConfigs();
                    const existingNames = Object.entries(customConfigs)
                        .filter(([k, v]) => k !== key)
                        .map(([k, v]) => v.name);
                    
                    if (existingNames.includes(newName)) {
                        this.showNotification(`name display "${newName}" 已存在，use name 请其他`, 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    try {
                        // update configuration
                        await this.settingsManager.saveCustomRegexConfig(key, {
                            name: newName,
                            pattern: newPattern,
                            createdAt: customConfigs[key]?.createdAt || Date.now(),
                            updatedAt: Date.now()
                        });
                        
                        //console.log(`✅ custom regex update configuration 已: ${newName} (${key})`);
                        this.showNotification(`custom regex configuration "${newName}" update 已`, 'success');
                        
                        // configuration load re- 通知PatternExtractor
                        if (this.patternExtractor) {
                            await this.patternExtractor.loadCustomPatterns();
                        }
                        
                        // refresh configuration display column(s) 表
                        this.loadCustomRegexList();
                        
                    } catch (error) {
                        console.error('❌ custom regex failed update configuration:', error);
                        this.showNotification('failed update configuration: ' + error.message, 'error');
                    }
                });
                
                // cancel edit button event
                cancelBtn.addEventListener('click', () => {
                    // resume original 值
                    nameInput.value = originalName;
                    patternTextarea.value = originalPattern;
                    
                    // edit mode 退出
                    nameInput.setAttribute('readonly', true);
                    patternTextarea.setAttribute('readonly', true);
                    nameInput.style.borderBottom = '1px solid transparent';
                    patternTextarea.style.border = '1px solid transparent';
                    patternTextarea.style.background = 'rgba(0,0,0,0.3)';
                    
                    // button status display 切换
                    editBtn.style.display = 'block';
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                });
                
                // delete button event
                deleteBtn.addEventListener('click', () => this.deleteCustomRegexConfig(key, config.name));
                
                // button 悬停效果
                editBtn.addEventListener('mouseenter', () => {
                    editBtn.style.background = 'rgba(0, 212, 170, 0.5)';
                    editBtn.style.borderColor = 'rgba(0, 212, 170, 0.7)';
                });
                editBtn.addEventListener('mouseleave', () => {
                    editBtn.style.background = 'rgba(0, 212, 170, 0.3)';
                    editBtn.style.borderColor = 'rgba(0, 212, 170, 0.5)';
                });
                
                saveBtn.addEventListener('mouseenter', () => {
                    saveBtn.style.background = 'rgba(52, 152, 219, 0.5)';
                    saveBtn.style.borderColor = 'rgba(52, 152, 219, 0.7)';
                });
                saveBtn.addEventListener('mouseleave', () => {
                    saveBtn.style.background = 'rgba(52, 152, 219, 0.3)';
                    saveBtn.style.borderColor = 'rgba(52, 152, 219, 0.5)';
                });
                
                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.background = 'rgba(149, 165, 166, 0.5)';
                    cancelBtn.style.borderColor = 'rgba(149, 165, 166, 0.7)';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.background = 'rgba(149, 165, 166, 0.3)';
                    cancelBtn.style.borderColor = 'rgba(149, 165, 166, 0.5)';
                });
                
                deleteBtn.addEventListener('mouseenter', () => {
                    deleteBtn.style.background = 'rgba(231, 76, 60, 0.5)';
                    deleteBtn.style.borderColor = 'rgba(231, 76, 60, 0.7)';
                });
                deleteBtn.addEventListener('mouseleave', () => {
                    deleteBtn.style.background = 'rgba(231, 76, 60, 0.3)';
                    deleteBtn.style.borderColor = 'rgba(231, 76, 60, 0.5)';
                });
                
                itemsContainer.appendChild(configItem);
            });
            
        } catch (error) {
            console.error('❌ custom regex failed configuration load column(s) 表:', error);
        }
    }

    // custom regex delete configuration
    async deleteCustomRegexConfig(key, name) {
        if (!confirm(`custom regex delete configuration 确定要 "${name}" 吗？resume operation 此不可。`)) {
            return;
        }
        
        try {
            // delete configuration via SettingsManager
            await this.settingsManager.deleteCustomRegexConfig(key);
            
            //console.log(`✅ custom regex delete configuration 已: ${name} (${key})`);
            this.showNotification(`custom regex configuration "${name}" delete 已`, 'success');
            
            // configuration load re- 通知PatternExtractor
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }
            
            // refresh configuration display column(s) 表
            this.loadCustomRegexList();
            
        } catch (error) {
            console.error('❌ custom regex failed delete configuration:', error);
            this.showNotification('failed delete configuration: ' + error.message, 'error');
        }
    }
    
    // feature method 核心
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
            
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // scan page current if has 没过， minutes or 超过5，scan auto then
            const now = Date.now();
            const lastScanTime = scanDataWrapper ? scanDataWrapper.timestamp : 0;
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
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // clear data memory in of
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.currentDepth = 0;
            this.deepScanRunning = false;
            
            // clear display 界面
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // delete data all related from IndexedDB
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // scan results delete 普通
            await window.indexedDBManager.deleteScanResults(fullUrl);
            
            // deep scan delete data related（results status and 包括）
            await window.indexedDBManager.deleteDeepScanData(fullUrl);
            
            // deep scan reset status UI
            this.resetDeepScanUI();
            
            // success clear hint display
            this.showNotification(`page ${tab.url} clear scan data of 已`, 'success');
            
            //console.log(`✅ page ${pageKey} clear scan data of 已`);
            
        } catch (error) {
            console.error('❌ failed clear data:', error);
            this.showNotification('failed clear data: ' + error.message, 'error');
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
            // URL save for of 构造完整
            const fullUrl = `https://${hostname}`;
            
            // initialize IndexedDBManager
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // scan results save use IndexedDB普通
            if (this.results && Object.keys(this.results).length > 0) {
                await window.indexedDBManager.saveScanResults(fullUrl, this.results);
                //console.log(`✅ scan results success save to 普通IndexedDB: ${hostname}`);
            }
            
            // deep scan save results
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log('💾 deep scan save results to IndexedDB，data record(s) 目:', 
                    //Object.values(this.deepScanResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0));
            }
            
            // deep scan save status
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ deep scan success save status to IndexedDB: ${hostname}`);
            
        } catch (error) {
            console.error('❌ failed save data:', error);
        }
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
            const pageKey = this.getPageStorageKey(tab.url);
            
            //console.log(`🔄 data load page 正在: ${hostname}`);
            
            // scan results load from IndexedDB普通
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // URL load for of 构造完整
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const indexedDBResults = loadedDataWrapper ? loadedDataWrapper.results : null;
            
            // deep scan results load status from and IndexedDB
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanResults = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // data use of 优先最完整源
            let bestResults = null;
            let bestSource = '';
            
            // data item(s) of 比较各源完整性
            const sources = [
                { data: deepScanResults, name: 'deepScanResults' },
                { data: indexedDBResults, name: 'scanResults' }
            ];
            
            for (const source of sources) {
                if (source.data && typeof source.data === 'object') {
                    const itemCount = Object.values(source.data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                    if (itemCount > 0 && (!bestResults || itemCount > Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0))) {
                        bestResults = source.data;
                        bestSource = source.name;
                    }
                }
            }
            
            if (bestResults) {
                this.results = bestResults;
                this.deepScanResults = bestResults;
                //console.log(`✅ from IndexedDB ${bestSource} data load page 了，total ${Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} record record(s)`);
                this.displayResults();
            } else {
                //console.log(`⚠️ page ${hostname} not found scan data of has 效`);
            }
            
            // deep scan resume status from IndexedDB
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                //console.log('🔄 deep scan resume status from IndexedDB:', {
                //    running: this.deepScanRunning,
                //    scannedCount: this.scannedUrls.size,
                //    depth: this.currentDepth
                //});
            }
        } catch (error) {
            console.error('❌ failed results load:', error);
        }
    }

    // initialize inject page JS
    initJSInjectPage() {
        if (this.jsInjector) {
            // settings 全局引用，use in of 供HTMLonclick
            window.jsInjector = this.jsInjector;
            // initialize delay，load element 确保DOM已
            setTimeout(() => {
                this.jsInjector.init();
            }, 100);
        }
    }
}

const CURRENT_VERSION = 'v1.7.6'; // version 请根据实际修改

function compareVersion(v1, v2) {
    const arr1 = v1.replace(/^v/, '').split('.').map(Number);
    const arr2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
        const num1 = arr1[i] || 0;
        const num2 = arr2[i] || 0;
        if (num1 < num2) return -1;
        if (num1 > num2) return 1;
    }
    return 0;
}

function showUpdateModal(release) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;
        background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#222;padding:30px 24px;border-radius:12px;max-width:350px;color:#fff;text-align:center;box-shadow:0 0 20px #000;">
            <h2 style="color:#00d4aa;">Xuan8a1提醒您，有新version：${release.tag_name}</h2>
            <div style="margin:12px 0 18px 0;font-size:13px;">${release.name || ''}</div>
            <div style="margin-bottom:12px;font-size:12px;color:#ccc;">${release.body || ''}</div>
            <a href="${release.html_url}" target="_blank" style="display:inline-block;padding:8px 18px;background:#00d4aa;color:#222;border-radius:6px;text-decoration:none;font-weight:bold;">before往下载</a>
            <br><button style="margin-top:18px;padding:6px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;" id="closeUpdateModal">close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#closeUpdateModal').onclick = () => modal.remove();
}

async function checkForUpdate() {
    try {
        const lastShown = localStorage.getItem('phantom_update_last_shown');
        const now = Date.now();
        if (lastShown && now - Number(lastShown) < 24 * 60 * 60 * 1000) return;

        const res = await fetch('https://www.cn-fnst.top/huanying/');
        if (!res.ok) return;
        const releases = await res.json();
        if (!Array.isArray(releases) || releases.length === 0) return;
        // version maximum to 找
        let maxRelease = releases[0];
        for (const r of releases) {
            if (compareVersion(maxRelease.tag_name, r.tag_name) < 0) {
                maxRelease = r;
            }
        }
        if (compareVersion(CURRENT_VERSION, maxRelease.tag_name) < 0) {
            showUpdateModal(maxRelease);
            localStorage.setItem('phantom_update_last_shown', now);
        }
    } catch (e) {}
}

// initialize 应用
document.addEventListener('DOMContentLoaded', () => {
    new ILoveYouTranslucent7();
    checkForUpdate();
});
