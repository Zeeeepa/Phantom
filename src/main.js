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
        
        // Initialize功能模块 - FirstInitializeSettingsManager
        this.settingsManager = new SettingsManager();
        window.SettingsManager = this.settingsManager; // Ensure全局可访问
        
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
        // Initialize导航切换
        this.initNavigation();
        
        // Initialize按钮事件
        this.initEventListeners();
        
        // InitializeData同步机制
        this.initDataSync();
        
        // Initialize消息Listen器
        this.initMessageListeners();
        
        // LoadSaved的ResultAndAutoScan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // Initialize消息Listen器
    initMessageListeners() {
        // Listen来自深度Scan窗口的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateScanResults' || 
                message.action === 'scanProgress' || 
                message.action === 'scanComplete' || 
                message.action === 'scanError') {
                
                // Process深度Scan窗口的消息
                if (this.deepScanner) {
                    return this.deepScanner.handleScanWindowMessage(message, sender, sendResponse);
                }
            }
        });
    }
    
    // InitializeData同步机制
    initDataSync() {
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
            if (!tab || !tab.url) {
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // fromIndexedDBCheckDataComplete性
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // Check普通Scan results
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // Check深度Scan results
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanData = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // 如果IndexedDB中有CurrentPage的Data但内存中No，Reload
            if ((scanData || deepScanData) && Object.keys(this.results || {}).length === 0) {
                //console.log(`🔧 Detect到Page ${hostname} IndexedDBData丢失，In progress恢复...`);
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
        
        // 收放按钮事件
        const toggleButtonsBtn = document.getElementById('toggleButtonsBtn');
        if (toggleButtonsBtn) {
            toggleButtonsBtn.addEventListener('click', () => this.toggleScanButtons());
        }
        
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
            case 'settings':
                // 切换到SettingsPage时，LoadSettings
                if (this.settingsManager) {
                    this.settingsManager.loadSettings();
                }
                // InitializeCustom正则弹窗事件
                this.initCustomRegexModal();
                // LoadAndDisplayCustom正则Configuration列Table
                this.loadCustomRegexList();
                break;
            case 'js-injection':
                // 切换到JS注入Page时，InitializeJS注入功能
                this.initJSInjectPage();
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
        
        // Clear现有选Item（保留Default选Item）
        const defaultOption = categorySelect.querySelector('option[value=""]');
        categorySelect.innerHTML = '';
        if (defaultOption) {
            categorySelect.appendChild(defaultOption);
        }
        
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
    
    // 委托Method - 将功能委托给相应的模块
    async startScan(silent = false) {
        // ReloadRegular expressionConfiguration
        if (this.patternExtractor) {
            await this.patternExtractor.loadCustomPatterns();
            //console.log('🔄 AlreadyReloadRegular expressionConfiguration');
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
    
    exportResults() {
        return this.exportManager.exportResults();
    }
    
    // 收放按钮功能
    // 收放按钮功能
    toggleScanButtons() {
        const scanButtonsContainer = document.getElementById('scanButtonsContainer');
        const toggleButton = document.getElementById('toggleButtonsBtn');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');
        const toggleText = toggleButton.querySelector('.toggle-text');
        const resultsContainer = document.getElementById('results');
        
        if (scanButtonsContainer && toggleButton) {
            const isCollapsed = scanButtonsContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                // 展开按钮
                scanButtonsContainer.classList.remove('collapsed');
                toggleIcon.textContent = '▲';
                toggleText.textContent = '收起按钮';
                toggleButton.classList.remove('collapsed');
                
                // 恢复Result容器的原始高度
                if (resultsContainer) {
                    resultsContainer.classList.remove('expanded');
                }
            } else {
                // 收起按钮
                scanButtonsContainer.classList.add('collapsed');
                toggleIcon.textContent = '▼';
                toggleText.textContent = '展开按钮';
                toggleButton.classList.add('collapsed');
                
                // ExtensionResult容器高度，占用原来按钮的Empty间
                if (resultsContainer) {
                    resultsContainer.classList.add('expanded');
                }
            }
        }
    }

    // InitializeCustom正则弹窗
    initCustomRegexModal() {
        const addCustomRegexBtn = document.getElementById('addCustomRegexBtn');
        const customRegexModal = document.getElementById('customRegexModal');
        const closeCustomRegexModal = document.getElementById('closeCustomRegexModal');
        const confirmCustomRegexBtn = document.getElementById('confirmCustomRegexBtn');
        const cancelCustomRegexBtn = document.getElementById('cancelCustomRegexBtn');

        // 打开弹窗
        if (addCustomRegexBtn) {
            addCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'block';
                    // ClearInput框
                    document.getElementById('customRegexName').value = '';
                    document.getElementById('customRegexKey').value = '';
                    document.getElementById('customRegexPattern').value = '';
                }
            });
        }

        // Close弹窗
        if (closeCustomRegexModal) {
            closeCustomRegexModal.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // Cancel按钮
        if (cancelCustomRegexBtn) {
            cancelCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // ConfirmAdd按钮
        if (confirmCustomRegexBtn) {
            confirmCustomRegexBtn.addEventListener('click', () => {
                this.handleCustomRegexSubmit();
            });
        }

        // Click弹窗外部Close
        if (customRegexModal) {
            customRegexModal.addEventListener('click', (e) => {
                if (e.target === customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }
    }

    // ProcessCustom正则提交
    // ProcessCustom正则提交
    async handleCustomRegexSubmit() {
        const nameInput = document.getElementById('customRegexName');
        const keyInput = document.getElementById('customRegexKey');
        const patternInput = document.getElementById('customRegexPattern');
        const modal = document.getElementById('customRegexModal');

        if (!nameInput || !keyInput || !patternInput) {
            this.showNotification('Input框ElementNot found', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        const pattern = patternInput.value.trim();

        // ValidateInput
        if (!name) {
            this.showNotification('请InputDisplay名称', 'warning');
            nameInput.focus();
            return;
        }

        if (!key) {
            this.showNotification('请Input存储Key名', 'warning');
            keyInput.focus();
            return;
        }

        if (!pattern) {
            this.showNotification('请InputRegular expression', 'warning');
            patternInput.focus();
            return;
        }

        // ValidateKey名Format（Only允许字母、数字、下划线）
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
            this.showNotification('存储Key名Only能包含字母、数字And下划线，且必须以字母开Header', 'warning');
            keyInput.focus();
            return;
        }

        // ValidateRegular expression
        try {
            new RegExp(pattern);
        } catch (error) {
            this.showNotification('Regular expressionFormatError: ' + error.message, 'error');
            patternInput.focus();
            return;
        }

        // Check名称AndKey名是否重复
        try {
            // fromSettingsManagerGetCustom正则Configuration
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();

            // CheckKey名是否重复
            if (customConfigs[key]) {
                this.showNotification(`存储Key名 "${key}" Already存在，请使用其他Key名`, 'warning');
                keyInput.focus();
                return; // 不Close弹窗
            }

            // Check名称是否重复
            const existingNames = Object.values(customConfigs).map(config => config.name);
            if (existingNames.includes(name)) {
                this.showNotification(`Display名称 "${name}" Already存在，请使用其他名称`, 'warning');
                nameInput.focus();
                return; // 不Close弹窗
            }

            // 如果No重复，SaveConfiguration
            await this.saveCustomRegexConfig(name, key, pattern);
            
            // Close弹窗
            if (modal) {
                modal.style.display = 'none';
            }
            this.showNotification(`Custom正则 "${name}" AddSuccess`, 'success');

        } catch (error) {
            console.error('Check重复OrSaveConfigurationFailed:', error);
            this.showNotification('操作Failed: ' + error.message, 'error');
        }
    }

    // SaveCustom正则Configuration
    async saveCustomRegexConfig(name, key, pattern) {
        try {
            // ThroughSettingsManagerSaveCustom正则Configuration
            await this.settingsManager.saveCustomRegexConfig(key, {
                name: name,
                pattern: pattern,
                createdAt: Date.now()
            });

            //console.log('✅ Custom正则ConfigurationSaved:', { name, key, pattern });

            // NotifyPatternExtractorReloadConfiguration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }

            // 刷新Custom正则Configuration列TableDisplay
            this.loadCustomRegexList();

        } catch (error) {
            console.error('❌ SaveCustom正则ConfigurationFailed:', error);
            throw error;
        }
    }

    // LoadAndDisplayCustom正则Configuration列Table
    async loadCustomRegexList() {
        try {
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();
            
            // FindOrCreateCustom正则Configuration列Table容器
            let listContainer = document.getElementById('customRegexList');
            if (!listContainer) {
                // 如果容器不存在，Create它And插入到"AddCustom正则"按钮After面
                const addRegexBtn = document.getElementById('addCustomRegexBtn');
                if (addRegexBtn) {
                    listContainer = document.createElement('div');
                    listContainer.id = 'customRegexList';
                    listContainer.className = 'api-test-section';
                    listContainer.innerHTML = `
                        <div class="config-title">AlreadyAdd的Custom正则Configuration</div>
                        <div id="customRegexItems"></div>
                    `;
                    addRegexBtn.parentNode.insertBefore(listContainer, addRegexBtn);
                }
            }
            
            const itemsContainer = document.getElementById('customRegexItems');
            if (!itemsContainer) return;
            
            // Clear现有Content
            itemsContainer.innerHTML = '';
            
            // 如果NoCustomConfiguration，DisplayPromptInformation
            if (Object.keys(customConfigs).length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 20px; font-size: 12px;">
                        暂NoneCustom正则Configuration<br>
                        Click上方"AddCustom正则"按钮来AddConfiguration
                    </div>
                `;
                return;
            }
            
            // DisplayEvery个CustomConfiguration
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
                
                const createdDate = config.createdAt ? new Date(config.createdAt).toLocaleString() : 'Not知';
                
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
                                Key名: <span style="color: #ccc; font-family: monospace;">${key}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; margin-bottom: 8px;">
                                CreateTime: ${createdDate}
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
                            ">Edit</button>
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
                            ">Save</button>
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
                            ">Cancel</button>
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
                            ">Delete</button>
                        </div>
                    </div>
                `;
                
                // Add悬停效果
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
                
                // Get各个按钮AndInput框Element
                const editBtn = configItem.querySelector('.edit-custom-regex-btn');
                const saveBtn = configItem.querySelector('.save-custom-regex-btn');
                const cancelBtn = configItem.querySelector('.cancel-edit-regex-btn');
                const deleteBtn = configItem.querySelector('.delete-custom-regex-btn');
                const nameInput = configItem.querySelector('.edit-name-input');
                const patternTextarea = configItem.querySelector('.edit-pattern-textarea');
                
                // 存储原始值Used forCancelEdit
                let originalName = config.name;
                let originalPattern = config.pattern;
                
                // Edit按钮事件
                editBtn.addEventListener('click', () => {
                    // 进入EditPattern
                    nameInput.removeAttribute('readonly');
                    patternTextarea.removeAttribute('readonly');
                    nameInput.style.borderBottom = '1px solid #00d4aa';
                    patternTextarea.style.border = '1px solid #00d4aa';
                    patternTextarea.style.background = 'rgba(0,0,0,0.5)';
                    
                    // 切换按钮DisplayStatus
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    cancelBtn.style.display = 'block';
                    
                    // 聚焦到名称Input框
                    nameInput.focus();
                });
                
                // Save按钮事件
                saveBtn.addEventListener('click', async () => {
                    const newName = nameInput.value.trim();
                    const newPattern = patternTextarea.value.trim();
                    
                    // ValidateInput
                    if (!newName) {
                        this.showNotification('请InputDisplay名称', 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    if (!newPattern) {
                        this.showNotification('请InputRegular expression', 'warning');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // ValidateRegular expression
                    try {
                        new RegExp(newPattern);
                    } catch (error) {
                        this.showNotification('Regular expressionFormatError: ' + error.message, 'error');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // Check名称是否与其他Configuration重复（排除CurrentConfiguration）
                    const customConfigs = await this.settingsManager.getCustomRegexConfigs();
                    const existingNames = Object.entries(customConfigs)
                        .filter(([k, v]) => k !== key)
                        .map(([k, v]) => v.name);
                    
                    if (existingNames.includes(newName)) {
                        this.showNotification(`Display名称 "${newName}" Already存在，请使用其他名称`, 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    try {
                        // UpdateConfiguration
                        await this.settingsManager.saveCustomRegexConfig(key, {
                            name: newName,
                            pattern: newPattern,
                            createdAt: customConfigs[key]?.createdAt || Date.now(),
                            updatedAt: Date.now()
                        });
                        
                        //console.log(`✅ AlreadyUpdateCustom正则Configuration: ${newName} (${key})`);
                        this.showNotification(`Custom正则Configuration "${newName}" AlreadyUpdate`, 'success');
                        
                        // NotifyPatternExtractorReloadConfiguration
                        if (this.patternExtractor) {
                            await this.patternExtractor.loadCustomPatterns();
                        }
                        
                        // 刷新Configuration列TableDisplay
                        this.loadCustomRegexList();
                        
                    } catch (error) {
                        console.error('❌ UpdateCustom正则ConfigurationFailed:', error);
                        this.showNotification('UpdateConfigurationFailed: ' + error.message, 'error');
                    }
                });
                
                // CancelEdit按钮事件
                cancelBtn.addEventListener('click', () => {
                    // 恢复原始值
                    nameInput.value = originalName;
                    patternTextarea.value = originalPattern;
                    
                    // 退出EditPattern
                    nameInput.setAttribute('readonly', true);
                    patternTextarea.setAttribute('readonly', true);
                    nameInput.style.borderBottom = '1px solid transparent';
                    patternTextarea.style.border = '1px solid transparent';
                    patternTextarea.style.background = 'rgba(0,0,0,0.3)';
                    
                    // 切换按钮DisplayStatus
                    editBtn.style.display = 'block';
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                });
                
                // Delete按钮事件
                deleteBtn.addEventListener('click', () => this.deleteCustomRegexConfig(key, config.name));
                
                // 按钮悬停效果
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
            console.error('❌ LoadCustom正则Configuration列TableFailed:', error);
        }
    }

    // DeleteCustom正则Configuration
    async deleteCustomRegexConfig(key, name) {
        if (!confirm(`Confirm要DeleteCustom正则Configuration "${name}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        try {
            // ThroughSettingsManagerDeleteConfiguration
            await this.settingsManager.deleteCustomRegexConfig(key);
            
            //console.log(`✅ DeletedCustom正则Configuration: ${name} (${key})`);
            this.showNotification(`Custom正则Configuration "${name}" Deleted`, 'success');
            
            // NotifyPatternExtractorReloadConfiguration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }
            
            // 刷新Configuration列TableDisplay
            this.loadCustomRegexList();
            
        } catch (error) {
            console.error('❌ DeleteCustom正则ConfigurationFailed:', error);
            this.showNotification('DeleteConfigurationFailed: ' + error.message, 'error');
        }
    }
    
    // 核心功能Method
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
            
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // 如果NoScan过CurrentPage，Or者超过5分钟，则AutoScan
            const now = Date.now();
            const lastScanTime = scanDataWrapper ? scanDataWrapper.timestamp : 0;
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
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // Clear内存中的Data
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.currentDepth = 0;
            this.deepScanRunning = false;
            
            // Clear界面Display
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDBDelete所有RelatedData
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // Delete普通Scan results
            await window.indexedDBManager.deleteScanResults(fullUrl);
            
            // Delete深度ScanRelatedData（包括ResultAndStatus）
            await window.indexedDBManager.deleteDeepScanData(fullUrl);
            
            // Reset深度ScanUIStatus
            this.resetDeepScanUI();
            
            // DisplayClearSuccessPrompt
            this.showNotification(`Page ${tab.url} 的ScanDataCleared`, 'success');
            
            //console.log(`✅ Page ${pageKey} 的ScanDataCleared`);
            
        } catch (error) {
            console.error('❌ ClearDataFailed:', error);
            this.showNotification('ClearDataFailed: ' + error.message, 'error');
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
            // 构造Complete的URLUsed forSave
            const fullUrl = `https://${hostname}`;
            
            // InitializeIndexedDBManager
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 使用IndexedDBSave普通Scan results
            if (this.results && Object.keys(this.results).length > 0) {
                await window.indexedDBManager.saveScanResults(fullUrl, this.results);
                //console.log(`✅ 普通Scan resultsSave to IndexedDBSuccess: ${hostname}`);
            }
            
            // Save深度Scan results
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log('💾 深度Scan resultsSave to IndexedDB，Data条目:', 
                    //Object.values(this.deepScanResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0));
            }
            
            // Save深度ScanStatus
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ 深度ScanStatusSave to IndexedDBSuccess: ${hostname}`);
            
        } catch (error) {
            console.error('❌ DataSaveFailed:', error);
        }
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
            const pageKey = this.getPageStorageKey(tab.url);
            
            //console.log(`🔄 In progressLoadPageData: ${hostname}`);
            
            // Load from IndexedDB普通Scan results
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造Complete的URLUsed forLoad
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const indexedDBResults = loadedDataWrapper ? loadedDataWrapper.results : null;
            
            // Load from IndexedDB深度Scan resultsAndStatus
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanResults = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // 优First使用最Complete的DataSource
            let bestResults = null;
            let bestSource = '';
            
            // Compare各个DataSource的Complete性
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
                //console.log(`✅ fromIndexedDB ${bestSource} Load了PageData，共 ${Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} 条Record`);
                this.displayResults();
            } else {
                //console.log(`⚠️ Page ${hostname} Not foundValid的ScanData`);
            }
            
            // fromIndexedDB恢复深度ScanStatus
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                //console.log('🔄 fromIndexedDB恢复深度ScanStatus:', {
                //    running: this.deepScanRunning,
                //    scannedCount: this.scannedUrls.size,
                //    depth: this.currentDepth
                //});
            }
        } catch (error) {
            console.error('❌ LoadResultFailed:', error);
        }
    }

    // InitializeJS注入Page
    initJSInjectPage() {
        if (this.jsInjector) {
            // Settings全局引用，供HTML中的onclick使用
            window.jsInjector = this.jsInjector;
            // 延迟Initialize，EnsureDOMElementLoaded
            setTimeout(() => {
                this.jsInjector.init();
            }, 100);
        }
    }
}

const CURRENT_VERSION = 'v1.7.6'; // 请根据实际版本修改

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
            <h2 style="color:#00d4aa;">Xuan8a1提醒您，有新版本：${release.tag_name}</h2>
            <div style="margin:12px 0 18px 0;font-size:13px;">${release.name || ''}</div>
            <div style="margin-bottom:12px;font-size:12px;color:#ccc;">${release.body || ''}</div>
            <a href="${release.html_url}" target="_blank" style="display:inline-block;padding:8px 18px;background:#00d4aa;color:#222;border-radius:6px;text-decoration:none;font-weight:bold;">Before往下载</a>
            <br><button style="margin-top:18px;padding:6px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;" id="closeUpdateModal">Close</button>
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
        // Found最大版本
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

// Initialize应用
document.addEventListener('DOMContentLoaded', () => {
    new ILoveYouTranslucent7();
    checkForUpdate();
});
