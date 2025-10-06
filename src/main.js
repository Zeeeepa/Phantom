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
        
        // initialize feature module - 先 initialize SettingsManager
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
        
        // initialize message listener
        this.initMessageListeners();
        
        // load already save   result 并 automatic scan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initialize message listener
    initMessageListeners() {
        // listenfrom deep scan window   message
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateScanResults' || 
                message.action === 'scanProgress' || 
                message.action === 'scanComplete' || 
                message.action === 'scanError') {
                
                // process deep scan window   message
                if (this.deepScanner) {
                    return this.deepScanner.handleScanWindowMessage(message, sender, sendResponse);
                }
            }
        });
    }
    
    // initialize data sync 机制
    initDataSync() {
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
            if (!tab || !tab.url) {
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // fromIndexedDB check data complete性
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // check 普通 scan result
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // check deep scan result
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanData = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // 如果IndexedDBin有 current page   data 但内存in没有，重新 load
            if ((scanData || deepScanData) && Object.keys(this.results || {}).length === 0) {
                //console.log(`🔧 检测到 page ${hostname} IndexedDB data 丢失，正in恢复...`);
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
        
        // 收放 button event
        const toggleButtonsBtn = document.getElementById('toggleButtonsBtn');
        if (toggleButtonsBtn) {
            toggleButtonsBtn.addEventListener('click', () => this.toggleScanButtons());
        }
        
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
            case 'settings':
                // 切换到 settings page 时，load settings
                if (this.settingsManager) {
                    this.settingsManager.loadSettings();
                }
                // initialize custom regex popup event
                this.initCustomRegexModal();
                // load 并 display custom regex configuration list
                this.loadCustomRegexList();
                break;
            case 'js-injection':
                // 切换到JS inject page 时，initialize JS inject feature
                this.initJSInjectPage();
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
        
        // clear 现有 option（keep default option）
        const defaultOption = categorySelect.querySelector('option[value=""]');
        categorySelect.innerHTML = '';
        if (defaultOption) {
            categorySelect.appendChild(defaultOption);
        }
        
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
    
    // 委托 method - 将 feature 委托给相应  module
    async startScan(silent = false) {
        // 重新 load regular expression configuration
        if (this.patternExtractor) {
            await this.patternExtractor.loadCustomPatterns();
            //console.log('🔄 already重新 load regular expression configuration');
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
    
    exportResults() {
        return this.exportManager.exportResults();
    }
    
    // 收放 button feature
    // 收放 button feature
    toggleScanButtons() {
        const scanButtonsContainer = document.getElementById('scanButtonsContainer');
        const toggleButton = document.getElementById('toggleButtonsBtn');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');
        const toggleText = toggleButton.querySelector('.toggle-text');
        const resultsContainer = document.getElementById('results');
        
        if (scanButtonsContainer && toggleButton) {
            const isCollapsed = scanButtonsContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                // expand button
                scanButtonsContainer.classList.remove('collapsed');
                toggleIcon.textContent = '▲';
                toggleText.textContent = '收起 button';
                toggleButton.classList.remove('collapsed');
                
                // 恢复 result 容器 原始高度
                if (resultsContainer) {
                    resultsContainer.classList.remove('expanded');
                }
            } else {
                // 收起 button
                scanButtonsContainer.classList.add('collapsed');
                toggleIcon.textContent = '▼';
                toggleText.textContent = 'expand button';
                toggleButton.classList.add('collapsed');
                
                // extension result 容器高度，占用原来 button   empty 间
                if (resultsContainer) {
                    resultsContainer.classList.add('expanded');
                }
            }
        }
    }

    // initialize custom regex popup
    initCustomRegexModal() {
        const addCustomRegexBtn = document.getElementById('addCustomRegexBtn');
        const customRegexModal = document.getElementById('customRegexModal');
        const closeCustomRegexModal = document.getElementById('closeCustomRegexModal');
        const confirmCustomRegexBtn = document.getElementById('confirmCustomRegexBtn');
        const cancelCustomRegexBtn = document.getElementById('cancelCustomRegexBtn');

        // open popup
        if (addCustomRegexBtn) {
            addCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'block';
                    // clear input
                    document.getElementById('customRegexName').value = '';
                    document.getElementById('customRegexKey').value = '';
                    document.getElementById('customRegexPattern').value = '';
                }
            });
        }

        // close popup
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

        // 点击popup外部 close
        if (customRegexModal) {
            customRegexModal.addEventListener('click', (e) => {
                if (e.target === customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }
    }

    // process custom regex 提交
    // process custom regex 提交
    async handleCustomRegexSubmit() {
        const nameInput = document.getElementById('customRegexName');
        const keyInput = document.getElementById('customRegexKey');
        const patternInput = document.getElementById('customRegexPattern');
        const modal = document.getElementById('customRegexModal');

        if (!nameInput || !keyInput || !patternInput) {
            this.showNotification('input 元素未找到', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        const pattern = patternInput.value.trim();

        // validate 输入
        if (!name) {
            this.showNotification('请输入 display 名称', 'warning');
            nameInput.focus();
            return;
        }

        if (!key) {
            this.showNotification('请输入 storage key 名', 'warning');
            keyInput.focus();
            return;
        }

        if (!pattern) {
            this.showNotification('请输入 regular expression', 'warning');
            patternInput.focus();
            return;
        }

        // validate key 名 format（只允许字母、number、下划线）
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
            this.showNotification('storage key 名只能 contains 字母、number and下划线，且必须以字母开头', 'warning');
            keyInput.focus();
            return;
        }

        // validate regular expression
        try {
            new RegExp(pattern);
        } catch (error) {
            this.showNotification('regular expression format error: ' + error.message, 'error');
            patternInput.focus();
            return;
        }

        // check 名称and key 名是否重复
        try {
            // fromSettingsManager获取 custom regex configuration
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();

            // check key 名是否重复
            if (customConfigs[key]) {
                this.showNotification(`storage key 名 "${key}" already存in，请use其他 key 名`, 'warning');
                keyInput.focus();
                return; // do not close popup
            }

            // check 名称是否重复
            const existingNames = Object.values(customConfigs).map(config => config.name);
            if (existingNames.includes(name)) {
                this.showNotification(`display 名称 "${name}" already存in，请use其他名称`, 'warning');
                nameInput.focus();
                return; // do not close popup
            }

            // 如果没有重复，save configuration
            await this.saveCustomRegexConfig(name, key, pattern);
            
            // close popup
            if (modal) {
                modal.style.display = 'none';
            }
            this.showNotification(`custom regex "${name}" add success`, 'success');

        } catch (error) {
            console.error('check 重复or save configuration failed:', error);
            this.showNotification('操作 failed: ' + error.message, 'error');
        }
    }

    // save custom regex configuration
    async saveCustomRegexConfig(name, key, pattern) {
        try {
            // 通throughSettingsManager save custom regex configuration
            await this.settingsManager.saveCustomRegexConfig(key, {
                name: name,
                pattern: pattern,
                createdAt: Date.now()
            });

            //console.log('✅ custom regex configuration already save:', { name, key, pattern });

            // notification PatternExtractor重新 load configuration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }

            // refresh custom regex configuration list display
            this.loadCustomRegexList();

        } catch (error) {
            console.error('❌ save custom regex configuration failed:', error);
            throw error;
        }
    }

    // load 并 display custom regex configuration list
    async loadCustomRegexList() {
        try {
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();
            
            // 查找or创建 custom regex configuration list 容器
            let listContainer = document.getElementById('customRegexList');
            if (!listContainer) {
                // 如果容器do not存in，创建它并插入到"add custom regex"按钮后面
                const addRegexBtn = document.getElementById('addCustomRegexBtn');
                if (addRegexBtn) {
                    listContainer = document.createElement('div');
                    listContainer.id = 'customRegexList';
                    listContainer.className = 'api-test-section';
                    listContainer.innerHTML = `
                        <div class="config-title">alreadyadd custom regex configuration</div>
                        <div id="customRegexItems"></div>
                    `;
                    addRegexBtn.parentNode.insertBefore(listContainer, addRegexBtn);
                }
            }
            
            const itemsContainer = document.getElementById('customRegexItems');
            if (!itemsContainer) return;
            
            // clear 现有 content
            itemsContainer.innerHTML = '';
            
            // 如果没有 custom configuration，display prompt information
            if (Object.keys(customConfigs).length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 20px; font-size: 12px;">
                        暂无custom regex configuration<br>
                        点击上方"add custom regex"按钮来addconfiguration
                    </div>
                `;
                return;
            }
            
            // display 每个 custom configuration
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
                                创建时间: ${createdDate}
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
                
                // 获取各个 button and input 元素
                const editBtn = configItem.querySelector('.edit-custom-regex-btn');
                const saveBtn = configItem.querySelector('.save-custom-regex-btn');
                const cancelBtn = configItem.querySelector('.cancel-edit-regex-btn');
                const deleteBtn = configItem.querySelector('.delete-custom-regex-btn');
                const nameInput = configItem.querySelector('.edit-name-input');
                const patternTextarea = configItem.querySelector('.edit-pattern-textarea');
                
                // storage 原始 value for cancel edit
                let originalName = config.name;
                let originalPattern = config.pattern;
                
                // edit button event
                editBtn.addEventListener('click', () => {
                    // 进入 edit mode
                    nameInput.removeAttribute('readonly');
                    patternTextarea.removeAttribute('readonly');
                    nameInput.style.borderBottom = '1px solid #00d4aa';
                    patternTextarea.style.border = '1px solid #00d4aa';
                    patternTextarea.style.background = 'rgba(0,0,0,0.5)';
                    
                    // 切换 button display status
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    cancelBtn.style.display = 'block';
                    
                    // 聚焦到名称 input
                    nameInput.focus();
                });
                
                // save button event
                saveBtn.addEventListener('click', async () => {
                    const newName = nameInput.value.trim();
                    const newPattern = patternTextarea.value.trim();
                    
                    // validate 输入
                    if (!newName) {
                        this.showNotification('请输入 display 名称', 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    if (!newPattern) {
                        this.showNotification('请输入 regular expression', 'warning');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // validate regular expression
                    try {
                        new RegExp(newPattern);
                    } catch (error) {
                        this.showNotification('regular expression format error: ' + error.message, 'error');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // check 名称是否与其他 configuration 重复（exclude current configuration）
                    const customConfigs = await this.settingsManager.getCustomRegexConfigs();
                    const existingNames = Object.entries(customConfigs)
                        .filter(([k, v]) => k !== key)
                        .map(([k, v]) => v.name);
                    
                    if (existingNames.includes(newName)) {
                        this.showNotification(`display 名称 "${newName}" already存in，请use其他名称`, 'warning');
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
                        
                        //console.log(`✅ already update custom regex configuration: ${newName} (${key})`);
                        this.showNotification(`custom regex configuration "${newName}" already update`, 'success');
                        
                        // notification PatternExtractor重新 load configuration
                        if (this.patternExtractor) {
                            await this.patternExtractor.loadCustomPatterns();
                        }
                        
                        // refresh configuration list display
                        this.loadCustomRegexList();
                        
                    } catch (error) {
                        console.error('❌ update custom regex configuration failed:', error);
                        this.showNotification('update configuration failed: ' + error.message, 'error');
                    }
                });
                
                // cancel edit button event
                cancelBtn.addEventListener('click', () => {
                    // 恢复原始 value
                    nameInput.value = originalName;
                    patternTextarea.value = originalPattern;
                    
                    // 退出 edit mode
                    nameInput.setAttribute('readonly', true);
                    patternTextarea.setAttribute('readonly', true);
                    nameInput.style.borderBottom = '1px solid transparent';
                    patternTextarea.style.border = '1px solid transparent';
                    patternTextarea.style.background = 'rgba(0,0,0,0.3)';
                    
                    // 切换 button display status
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
            console.error('❌ load custom regex configuration list failed:', error);
        }
    }

    // delete custom regex configuration
    async deleteCustomRegexConfig(key, name) {
        if (!confirm(`确定要 delete custom regex configuration "${name}" 吗？此操作do not可恢复。`)) {
            return;
        }
        
        try {
            // 通throughSettingsManager delete configuration
            await this.settingsManager.deleteCustomRegexConfig(key);
            
            //console.log(`✅ already delete custom regex configuration: ${name} (${key})`);
            this.showNotification(`custom regex configuration "${name}" already delete`, 'success');
            
            // notification PatternExtractor重新 load configuration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }
            
            // refresh configuration list display
            this.loadCustomRegexList();
            
        } catch (error) {
            console.error('❌ delete custom regex configuration failed:', error);
            this.showNotification('delete configuration failed: ' + error.message, 'error');
        }
    }
    
    // 核心 feature method
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
            
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // 如果没有 scan through current page，or者超through5分钟，则 automatic scan
            const now = Date.now();
            const lastScanTime = scanDataWrapper ? scanDataWrapper.timestamp : 0;
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
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // clear 内存in  data
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.currentDepth = 0;
            this.deepScanRunning = false;
            
            // clear 界面 display
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDB delete all相关 data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // delete 普通 scan result
            await window.indexedDBManager.deleteScanResults(fullUrl);
            
            // delete deep scan 相关 data（package 括 result and status）
            await window.indexedDBManager.deleteDeepScanData(fullUrl);
            
            // 重置 deep scan UI status
            this.resetDeepScanUI();
            
            // display clear success prompt
            this.showNotification(`page ${tab.url}   scan data already clear`, 'success');
            
            //console.log(`✅ page ${pageKey}   scan data already clear`);
            
        } catch (error) {
            console.error('❌ clear data failed:', error);
            this.showNotification('clear data failed: ' + error.message, 'error');
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
            // 构造complete URLfor save
            const fullUrl = `https://${hostname}`;
            
            // initialize IndexedDBManager
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // useIndexedDB save 普通 scan result
            if (this.results && Object.keys(this.results).length > 0) {
                await window.indexedDBManager.saveScanResults(fullUrl, this.results);
                //console.log(`✅ 普通 scan result save 到IndexedDB success: ${hostname}`);
            }
            
            // save deep scan result
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log('💾 deep scan result save 到IndexedDB，data 条目:', 
                    //Object.values(this.deepScanResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0));
            }
            
            // save deep scan status
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ deep scan status save 到IndexedDB success: ${hostname}`);
            
        } catch (error) {
            console.error('❌ data save failed:', error);
        }
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
            const pageKey = this.getPageStorageKey(tab.url);
            
            //console.log(`🔄 正in load page data: ${hostname}`);
            
            // fromIndexedDB load 普通 scan result
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造complete URLfor load
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const indexedDBResults = loadedDataWrapper ? loadedDataWrapper.results : null;
            
            // fromIndexedDB load deep scan result and status
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanResults = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // 优先use最complete  data 源
            let bestResults = null;
            let bestSource = '';
            
            // 比较各个 data 源 complete性
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
                //console.log(`✅ fromIndexedDB ${bestSource} load 了 page data，共 ${Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} 条记录`);
                this.displayResults();
            } else {
                //console.log(`⚠️ page ${hostname} 未找到 valid   scan data`);
            }
            
            // fromIndexedDB恢复 deep scan status
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                //console.log('🔄 fromIndexedDB恢复 deep scan status:', {
                //    running: this.deepScanRunning,
                //    scannedCount: this.scannedUrls.size,
                //    depth: this.currentDepth
                //});
            }
        } catch (error) {
            console.error('❌ load result failed:', error);
        }
    }

    // initialize JS inject page
    initJSInjectPage() {
        if (this.jsInjector) {
            // settings 全局引用，供HTMLin onclickuse
            window.jsInjector = this.jsInjector;
            // delay initialize，确保DOM元素already load
            setTimeout(() => {
                this.jsInjector.init();
            }, 100);
        }
    }
}

const CURRENT_VERSION = 'v1.7.6'; // 请 root 据实际 version modify

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
        // 找到 maximum version
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
