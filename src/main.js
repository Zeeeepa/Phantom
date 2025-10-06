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
        
        // initialize功能mod块 - 先initializeSettingsManager
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
        // initialize导航切换
        this.initNavigation();
        
        // initializebuttonevent
        this.initEventListeners();
        
        // initializedata同步机制
        this.initDataSync();
        
        // initializemessagelistener
        this.initMessageListeners();
        
        // loadalready保存resultandautomaticscan
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // initializemessagelistener
    initMessageListeners() {
        // listenfromdeep scan窗口message
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateScanResults' || 
                message.action === 'scanProgress' || 
                message.action === 'scanComplete' || 
                message.action === 'scanError') {
                
                // 处理deep scan窗口message
                if (this.deepScanner) {
                    return this.deepScanner.handleScanWindowMessage(message, sender, sendResponse);
                }
            }
        });
    }
    
    // initializedata同步机制
    initDataSync() {
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
            if (!tab || !tab.url) {
                return;
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // fromIndexedDBcheckdatacomplete性
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // check普通scanresult
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // checkdeep scanresult
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanData = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // ifIndexedDBin有当beforepage面databut内存inwithout，重newload
            if ((scanData || deepScanData) && Object.keys(this.results || {}).length === 0) {
                //console.log(`🔧 detecttopage面 ${hostname} IndexedDBdata丢失，正in恢复...`);
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
        
        // 收放buttonevent
        const toggleButtonsBtn = document.getElementById('toggleButtonsBtn');
        if (toggleButtonsBtn) {
            toggleButtonsBtn.addEventListener('click', () => this.toggleScanButtons());
        }
        
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
            case 'settings':
                // 切换tosettingspage面时，loadsettings
                if (this.settingsManager) {
                    this.settingsManager.loadSettings();
                }
                // initializecustomregexpopupevent
                this.initCustomRegexModal();
                // loadand显示customregexconfiguration列表
                this.loadCustomRegexList();
                break;
            case 'js-injection':
                // 切换toJSinjectionpage面时，initializeJSinjection功能
                this.initJSInjectPage();
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
        
        // 清空现有选项（keep默认选项）
        const defaultOption = categorySelect.querySelector('option[value=""]');
        categorySelect.innerHTML = '';
        if (defaultOption) {
            categorySelect.appendChild(defaultOption);
        }
        
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
    
    // 委托方法 - 将功能委托给相应mod块
    async startScan(silent = false) {
        // 重newloadregexexpressionconfiguration
        if (this.patternExtractor) {
            await this.patternExtractor.loadCustomPatterns();
            //console.log('🔄 already重newloadregexexpressionconfiguration');
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
    
    exportResults() {
        return this.exportManager.exportResults();
    }
    
    // 收放button功能
    // 收放button功能
    toggleScanButtons() {
        const scanButtonsContainer = document.getElementById('scanButtonsContainer');
        const toggleButton = document.getElementById('toggleButtonsBtn');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');
        const toggleText = toggleButton.querySelector('.toggle-text');
        const resultsContainer = document.getElementById('results');
        
        if (scanButtonsContainer && toggleButton) {
            const isCollapsed = scanButtonsContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                // 展开button
                scanButtonsContainer.classList.remove('collapsed');
                toggleIcon.textContent = '▲';
                toggleText.textContent = '收起button';
                toggleButton.classList.remove('collapsed');
                
                // 恢复result容器原始高度
                if (resultsContainer) {
                    resultsContainer.classList.remove('expanded');
                }
            } else {
                // 收起button
                scanButtonsContainer.classList.add('collapsed');
                toggleIcon.textContent = '▼';
                toggleText.textContent = '展开button';
                toggleButton.classList.add('collapsed');
                
                // 扩展result容器高度，占for原来button空间
                if (resultsContainer) {
                    resultsContainer.classList.add('expanded');
                }
            }
        }
    }

    // initializecustomregexpopup
    initCustomRegexModal() {
        const addCustomRegexBtn = document.getElementById('addCustomRegexBtn');
        const customRegexModal = document.getElementById('customRegexModal');
        const closeCustomRegexModal = document.getElementById('closeCustomRegexModal');
        const confirmCustomRegexBtn = document.getElementById('confirmCustomRegexBtn');
        const cancelCustomRegexBtn = document.getElementById('cancelCustomRegexBtn');

        // openpopup
        if (addCustomRegexBtn) {
            addCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'block';
                    // 清空输入框
                    document.getElementById('customRegexName').value = '';
                    document.getElementById('customRegexKey').value = '';
                    document.getElementById('customRegexPattern').value = '';
                }
            });
        }

        // 关闭popup
        if (closeCustomRegexModal) {
            closeCustomRegexModal.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // 取消button
        if (cancelCustomRegexBtn) {
            cancelCustomRegexBtn.addEventListener('click', () => {
                if (customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }

        // confirmaddbutton
        if (confirmCustomRegexBtn) {
            confirmCustomRegexBtn.addEventListener('click', () => {
                this.handleCustomRegexSubmit();
            });
        }

        // clickpopup外部关闭
        if (customRegexModal) {
            customRegexModal.addEventListener('click', (e) => {
                if (e.target === customRegexModal) {
                    customRegexModal.style.display = 'none';
                }
            });
        }
    }

    // 处理customregex提交
    // 处理customregex提交
    async handleCustomRegexSubmit() {
        const nameInput = document.getElementById('customRegexName');
        const keyInput = document.getElementById('customRegexKey');
        const patternInput = document.getElementById('customRegexPattern');
        const modal = document.getElementById('customRegexModal');

        if (!nameInput || !keyInput || !patternInput) {
            this.showNotification('输入框元素未found', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        const pattern = patternInput.value.trim();

        // validation输入
        if (!name) {
            this.showNotification('请输入显示名称', 'warning');
            nameInput.focus();
            return;
        }

        if (!key) {
            this.showNotification('请输入storage键名', 'warning');
            keyInput.focus();
            return;
        }

        if (!pattern) {
            this.showNotification('请输入regexexpression', 'warning');
            patternInput.focus();
            return;
        }

        // validation键名format（只允许字母、数字、下划线）
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
            this.showNotification('storage键名只能contains字母、数字and下划线，且必须以字母开头', 'warning');
            keyInput.focus();
            return;
        }

        // validationregexexpression
        try {
            new RegExp(pattern);
        } catch (error) {
            this.showNotification('regexexpressionformat错误: ' + error.message, 'error');
            patternInput.focus();
            return;
        }

        // check名称and键名是否重复
        try {
            // fromSettingsManagergetcustomregexconfiguration
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();

            // check键名是否重复
            if (customConfigs[key]) {
                this.showNotification(`storage键名 "${key}" alreadyexists，请use其他键名`, 'warning');
                keyInput.focus();
                return; // not关闭popup
            }

            // check名称是否重复
            const existingNames = Object.values(customConfigs).map(config => config.name);
            if (existingNames.includes(name)) {
                this.showNotification(`显示名称 "${name}" alreadyexists，请use其他名称`, 'warning');
                nameInput.focus();
                return; // not关闭popup
            }

            // ifwithout重复，保存configuration
            await this.saveCustomRegexConfig(name, key, pattern);
            
            // 关闭popup
            if (modal) {
                modal.style.display = 'none';
            }
            this.showNotification(`customregex "${name}" addsuccess`, 'success');

        } catch (error) {
            console.error('check重复or保存configurationfailed:', error);
            this.showNotification('操作failed: ' + error.message, 'error');
        }
    }

    // 保存customregexconfiguration
    async saveCustomRegexConfig(name, key, pattern) {
        try {
            // 通throughSettingsManager保存customregexconfiguration
            await this.settingsManager.saveCustomRegexConfig(key, {
                name: name,
                pattern: pattern,
                createdAt: Date.now()
            });

            //console.log('✅ customregexconfigurationalready保存:', { name, key, pattern });

            // notifyPatternExtractor重newloadconfiguration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }

            // 刷newcustomregexconfiguration列表显示
            this.loadCustomRegexList();

        } catch (error) {
            console.error('❌ 保存customregexconfigurationfailed:', error);
            throw error;
        }
    }

    // loadand显示customregexconfiguration列表
    async loadCustomRegexList() {
        try {
            const customConfigs = await this.settingsManager.getCustomRegexConfigs();
            
            // 查找orcreatecustomregexconfiguration列表容器
            let listContainer = document.getElementById('customRegexList');
            if (!listContainer) {
                // if容器notexists，create它and插入to"addcustomregex"button后面
                const addRegexBtn = document.getElementById('addCustomRegexBtn');
                if (addRegexBtn) {
                    listContainer = document.createElement('div');
                    listContainer.id = 'customRegexList';
                    listContainer.className = 'api-test-section';
                    listContainer.innerHTML = `
                        <div class="config-title">已添加的自定义正则配置</div>
                        <div id="customRegexItems"></div>
                    `;
                    addRegexBtn.parentNode.insertBefore(listContainer, addRegexBtn);
                }
            }
            
            const itemsContainer = document.getElementById('customRegexItems');
            if (!itemsContainer) return;
            
            // 清空现有内容
            itemsContainer.innerHTML = '';
            
            // ifwithoutcustomconfiguration，显示提示information
            if (Object.keys(customConfigs).length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 20px; font-size: 12px;">
                        暂无自定义正则配置<br>
                        点击上方"addcustomregex"按钮来添加配置
                    </div>
                `;
                return;
            }
            
            // 显示每个customconfiguration
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
                            ">取消</button>
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
                            ">删除</button>
                        </div>
                    </div>
                `;
                
                // add悬停效果
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
                
                // get各个buttonand输入框元素
                const editBtn = configItem.querySelector('.edit-custom-regex-btn');
                const saveBtn = configItem.querySelector('.save-custom-regex-btn');
                const cancelBtn = configItem.querySelector('.cancel-edit-regex-btn');
                const deleteBtn = configItem.querySelector('.delete-custom-regex-btn');
                const nameInput = configItem.querySelector('.edit-name-input');
                const patternTextarea = configItem.querySelector('.edit-pattern-textarea');
                
                // storage原始valuefor取消编辑
                let originalName = config.name;
                let originalPattern = config.pattern;
                
                // 编辑buttonevent
                editBtn.addEventListener('click', () => {
                    // 进入编辑pattern
                    nameInput.removeAttribute('readonly');
                    patternTextarea.removeAttribute('readonly');
                    nameInput.style.borderBottom = '1px solid #00d4aa';
                    patternTextarea.style.border = '1px solid #00d4aa';
                    patternTextarea.style.background = 'rgba(0,0,0,0.5)';
                    
                    // 切换button显示state
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    cancelBtn.style.display = 'block';
                    
                    // 聚焦to名称输入框
                    nameInput.focus();
                });
                
                // 保存buttonevent
                saveBtn.addEventListener('click', async () => {
                    const newName = nameInput.value.trim();
                    const newPattern = patternTextarea.value.trim();
                    
                    // validation输入
                    if (!newName) {
                        this.showNotification('请输入显示名称', 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    if (!newPattern) {
                        this.showNotification('请输入regexexpression', 'warning');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // validationregexexpression
                    try {
                        new RegExp(newPattern);
                    } catch (error) {
                        this.showNotification('regexexpressionformat错误: ' + error.message, 'error');
                        patternTextarea.focus();
                        return;
                    }
                    
                    // check名称是否与其他configuration重复（exclude当beforeconfiguration）
                    const customConfigs = await this.settingsManager.getCustomRegexConfigs();
                    const existingNames = Object.entries(customConfigs)
                        .filter(([k, v]) => k !== key)
                        .map(([k, v]) => v.name);
                    
                    if (existingNames.includes(newName)) {
                        this.showNotification(`显示名称 "${newName}" alreadyexists，请use其他名称`, 'warning');
                        nameInput.focus();
                        return;
                    }
                    
                    try {
                        // 更newconfiguration
                        await this.settingsManager.saveCustomRegexConfig(key, {
                            name: newName,
                            pattern: newPattern,
                            createdAt: customConfigs[key]?.createdAt || Date.now(),
                            updatedAt: Date.now()
                        });
                        
                        //console.log(`✅ already更newcustomregexconfiguration: ${newName} (${key})`);
                        this.showNotification(`customregexconfiguration "${newName}" already更new`, 'success');
                        
                        // notifyPatternExtractor重newloadconfiguration
                        if (this.patternExtractor) {
                            await this.patternExtractor.loadCustomPatterns();
                        }
                        
                        // 刷newconfiguration列表显示
                        this.loadCustomRegexList();
                        
                    } catch (error) {
                        console.error('❌ 更newcustomregexconfigurationfailed:', error);
                        this.showNotification('更newconfigurationfailed: ' + error.message, 'error');
                    }
                });
                
                // 取消编辑buttonevent
                cancelBtn.addEventListener('click', () => {
                    // 恢复原始value
                    nameInput.value = originalName;
                    patternTextarea.value = originalPattern;
                    
                    // 退出编辑pattern
                    nameInput.setAttribute('readonly', true);
                    patternTextarea.setAttribute('readonly', true);
                    nameInput.style.borderBottom = '1px solid transparent';
                    patternTextarea.style.border = '1px solid transparent';
                    patternTextarea.style.background = 'rgba(0,0,0,0.3)';
                    
                    // 切换button显示state
                    editBtn.style.display = 'block';
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                });
                
                // 删除buttonevent
                deleteBtn.addEventListener('click', () => this.deleteCustomRegexConfig(key, config.name));
                
                // button悬停效果
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
            console.error('❌ loadcustomregexconfiguration列表failed:', error);
        }
    }

    // 删除customregexconfiguration
    async deleteCustomRegexConfig(key, name) {
        if (!confirm(`确定要删除customregexconfiguration "${name}" 吗？此操作not可恢复。`)) {
            return;
        }
        
        try {
            // 通throughSettingsManager删除configuration
            await this.settingsManager.deleteCustomRegexConfig(key);
            
            //console.log(`✅ already删除customregexconfiguration: ${name} (${key})`);
            this.showNotification(`customregexconfiguration "${name}" already删除`, 'success');
            
            // notifyPatternExtractor重newloadconfiguration
            if (this.patternExtractor) {
                await this.patternExtractor.loadCustomPatterns();
            }
            
            // 刷newconfiguration列表显示
            this.loadCustomRegexList();
            
        } catch (error) {
            console.error('❌ 删除customregexconfigurationfailed:', error);
            this.showNotification('删除configurationfailed: ' + error.message, 'error');
        }
    }
    
    // 核心功能方法
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
            
            const scanDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const scanData = scanDataWrapper ? scanDataWrapper.results : null;
            
            // ifwithoutscanthrough当beforepage面，or者超through5分钟，则automaticscan
            const now = Date.now();
            const lastScanTime = scanDataWrapper ? scanDataWrapper.timestamp : 0;
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
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // 清空内存indata
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.currentDepth = 0;
            this.deepScanRunning = false;
            
            // 清空界面显示
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // fromIndexedDB删除all相关data
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname;
            const fullUrl = `https://${hostname}`;
            
            // 删除普通scanresult
            await window.indexedDBManager.deleteScanResults(fullUrl);
            
            // 删除deep scan相关data（includingresultandstate）
            await window.indexedDBManager.deleteDeepScanData(fullUrl);
            
            // 重置deep scanUIstate
            this.resetDeepScanUI();
            
            // 显示清空success提示
            this.showNotification(`page面 ${tab.url} scandataalready清空`, 'success');
            
            //console.log(`✅ page面 ${pageKey} scandataalready清空`);
            
        } catch (error) {
            console.error('❌ 清空datafailed:', error);
            this.showNotification('清空datafailed: ' + error.message, 'error');
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
            // 构造completeURLfor保存
            const fullUrl = `https://${hostname}`;
            
            // initializeIndexedDBManager
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // useIndexedDB保存普通scanresult
            if (this.results && Object.keys(this.results).length > 0) {
                await window.indexedDBManager.saveScanResults(fullUrl, this.results);
                //console.log(`✅ 普通scanresult保存toIndexedDBsuccess: ${hostname}`);
            }
            
            // 保存deep scanresult
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                await window.indexedDBManager.saveDeepScanResults(fullUrl, this.deepScanResults);
                //console.log('💾 deep scanresult保存toIndexedDB，data条目:', 
                    //Object.values(this.deepScanResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0));
            }
            
            // 保存deep scanstate
            const deepState = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            await window.indexedDBManager.saveDeepScanState(fullUrl, deepState);
            //console.log(`✅ deep scanstate保存toIndexedDBsuccess: ${hostname}`);
            
        } catch (error) {
            console.error('❌ data保存failed:', error);
        }
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
            const pageKey = this.getPageStorageKey(tab.url);
            
            //console.log(`🔄 正inloadpage面data: ${hostname}`);
            
            // fromIndexedDBload普通scanresult
            if (!window.indexedDBManager) {
                window.indexedDBManager = new IndexedDBManager();
            }
            
            // 构造completeURLforload
            const fullUrl = `https://${hostname}`;
            const loadedDataWrapper = await window.indexedDBManager.loadScanResults(fullUrl);
            const indexedDBResults = loadedDataWrapper ? loadedDataWrapper.results : null;
            
            // fromIndexedDBloaddeep scanresultandstate
            const deepScanDataWrapper = await window.indexedDBManager.loadDeepScanResults(fullUrl);
            const deepScanResults = deepScanDataWrapper ? deepScanDataWrapper.results : null;
            
            // 优先use最completedata源
            let bestResults = null;
            let bestSource = '';
            
            // 比较各个data源complete性
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
                //console.log(`✅ fromIndexedDB ${bestSource} load了page面data，共 ${Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} 条record`);
                this.displayResults();
            } else {
                //console.log(`⚠️ page面 ${hostname} 未foundvalidscandata`);
            }
            
            // fromIndexedDB恢复deep scanstate
            const deepState = await window.indexedDBManager.loadDeepScanState(fullUrl);
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                //console.log('🔄 fromIndexedDB恢复deep scanstate:', {
                //    running: this.deepScanRunning,
                //    scannedCount: this.scannedUrls.size,
                //    depth: this.currentDepth
                //});
            }
        } catch (error) {
            console.error('❌ loadresultfailed:', error);
        }
    }

    // initializeJSinjectionpage面
    initJSInjectPage() {
        if (this.jsInjector) {
            // settings全局引for，供HTMLinonclickuse
            window.jsInjector = this.jsInjector;
            // 延迟initialize，确保DOM元素alreadyload
            setTimeout(() => {
                this.jsInjector.init();
            }, 100);
        }
    }
}

const CURRENT_VERSION = 'v1.7.6'; // 请根据实际version修改

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
            <a href="${release.html_url}" target="_blank" style="display:inline-block;padding:8px 18px;background:#00d4aa;color:#222;border-radius:6px;text-decoration:none;font-weight:bold;">前往下载</a>
            <br><button style="margin-top:18px;padding:6px 18px;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;" id="closeUpdateModal">关闭</button>
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
        // found最大version
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

// initialize应for
document.addEventListener('DOMContentLoaded', () => {
    new ILoveYouTranslucent7();
    checkForUpdate();
});
