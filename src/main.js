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
        
        // 初始化功能模块
        this.basicScanner = new BasicScanner(this);
        this.deepScanner = new DeepScanner(this);
        this.displayManager = new DisplayManager(this);
        this.apiTester = new ApiTester(this);
        this.exportManager = new ExportManager(this);
        this.settingsManager = new SettingsManager();
        this.contentExtractor = new ContentExtractor();
        this.patternExtractor = new PatternExtractor();
        
        this.init();
    }
    
    init() {
        // 初始化导航切换
        this.initNavigation();
        
        // 初始化按钮事件
        this.initEventListeners();
        
        // 初始化数据同步机制
        this.initDataSync();
        
        // 初始化消息监听器
        this.initMessageListeners();
        
        // 加载已保存的结果并自动扫描
        this.loadResults();
        this.autoScanIfNeeded();
    }
    
    // 初始化消息监听器
    initMessageListeners() {
        // 监听来自深度扫描窗口的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateScanResults' || 
                message.action === 'scanProgress' || 
                message.action === 'scanComplete' || 
                message.action === 'scanError') {
                
                // 处理深度扫描窗口的消息
                if (this.deepScanner) {
                    return this.deepScanner.handleScanWindowMessage(message, sender, sendResponse);
                }
            }
        });
    }
    
    // 初始化数据同步机制
    initDataSync() {
        // 监听窗口焦点事件
        window.addEventListener('focus', () => {
            console.log('🔄 窗口获得焦点，重新加载数据...');
            this.loadResults().then(() => {
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            });
        });
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 页面变为可见，重新加载数据...');
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
            }
        });
        
        // 定期检查数据完整性
        setInterval(() => {
            this.checkDataIntegrity();
        }, 5000); // 每5秒检查一次
    }
    
    // 检查数据完整性
    async checkDataIntegrity() {
        try {
            // 获取当前页面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                return;
            }
            
            const pageKey = this.getPageStorageKey(tab.url);
            const keysToCheck = [
                `${pageKey}__results`,
                `${pageKey}__deepResults`,
                `${pageKey}__deepBackup`
            ];
            
            const data = await chrome.storage.local.get(keysToCheck);
            
            // 如果存储中有当前页面的数据但内存中没有，重新加载
            if ((data[`${pageKey}__results`] || data[`${pageKey}__deepResults`] || data[`${pageKey}__deepBackup`]) && 
                Object.keys(this.results || {}).length === 0) {
                console.log(`🔧 检测到页面 ${pageKey} 数据丢失，正在恢复...`);
                await this.loadResults();
                if (Object.keys(this.results).length > 0) {
                    this.displayResults();
                }
            }
        } catch (error) {
            console.error('数据完整性检查失败:', error);
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
        
        // 批量请求按钮
        const batchRequestBtn = document.getElementById('batchRequestBtn');
        if (batchRequestBtn) {
            batchRequestBtn.addEventListener('click', () => this.batchRequestTest());
        }
        
        // 模态框关闭按钮
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('requestResultModal').style.display = 'none';
            });
        }
        
        // 新按钮事件处理
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
                
                // 获取所有扫描结果并添加到模态框
                const resultItems = document.querySelectorAll('.result-item');
                resultItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    clone.classList.remove('collapsed');
                    resultsContainer.appendChild(clone);
                });
                
                modal.style.display = 'block';
            });
        }
        
        // 复制所有结果按钮
        const copyAllResultsBtn = document.getElementById('copyAllResultsBtn');
        if (copyAllResultsBtn) {
            copyAllResultsBtn.addEventListener('click', () => {
                const results = document.getElementById('requestResults').innerText;
                navigator.clipboard.writeText(results).then(() => {
                    const textSpan = copyAllResultsBtn.querySelector('.text');
                    if (textSpan) {
                        textSpan.textContent = '✅ 已复制';
                        setTimeout(() => {
                            textSpan.textContent = '复制全部结果';
                        }, 2000);
                    }
                });
            });
        }
    }
    
    // 初始化导航功能
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const pages = document.querySelectorAll('.page');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;
                
                // 更新导航状态
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // 更新页面显示
                pages.forEach(page => {
                    page.classList.remove('active');
                    const pageId = `${targetPage}-page`;
                    if (page.id === pageId) {
                        page.classList.add('active');
                    }
                });
                
                // 页面切换后的特殊处理
                this.handlePageSwitch(targetPage);
            });
        });
    }
    
    // 处理页面切换后的逻辑
    handlePageSwitch(pageName) {
        switch (pageName) {
            case 'scan':
                // 切换到扫描页面时，重新加载并显示结果
                this.loadResults().then(() => {
                    if (Object.keys(this.results).length > 0) {
                        this.displayResults();
                    }
                });
                break;
            case 'deep':
                // 切换到深度扫描页面时，恢复深度扫描状态
                this.loadResults().then(() => {
                    this.restoreDeepScanUI();
                });
                break;
            case 'test':
                // 切换到API测试页面时，更新分类选择器
                this.loadResults().then(() => {
                    this.updateCategorySelect();
                });
                break;
            case 'settings':
                // 切换到设置页面时，加载设置
                if (this.settingsManager) {
                    this.settingsManager.loadSettings();
                }
                break;
            case 'about':
                // 关于页面
                break;
        }
    }
    
    // 恢复深度扫描UI状态
    restoreDeepScanUI() {
        if (this.deepScanRunning) {
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            const configDiv = document.getElementById('deepScanConfig');
            const progressDiv = document.getElementById('deepScanProgress');
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止扫描';
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
        
        // 如果有深度扫描结果，确保显示
        if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
            this.results = this.deepScanResults;
            this.displayResults();
        }
    }
    
    // 更新分类选择器
    updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.results) return;
        
        // 清空现有选项（保留默认选项）
        const defaultOption = categorySelect.querySelector('option[value=""]');
        categorySelect.innerHTML = '';
        if (defaultOption) {
            categorySelect.appendChild(defaultOption);
        }
        
        // 添加有数据的分类
        const categories = [
            { key: 'absoluteApis', title: '🔗 绝对路径API' },
            { key: 'relativeApis', title: '📁 相对路径API' },
            { key: 'jsFiles', title: '📜 JS文件' },
            { key: 'cssFiles', title: '🎨 CSS文件' },
            { key: 'images', title: '🖼️ 图片文件' },
            { key: 'urls', title: '🔗 完整URL' },
            { key: 'domains', title: '🌐 域名' },
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
    
    // 重置深度扫描UI状态
    resetDeepScanUI() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn?.querySelector('.text');
        const configDiv = document.getElementById('deepScanConfig');
        const progressDiv = document.getElementById('deepScanProgress');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '🚀 开始深度扫描';
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
        
        // 重置深度扫描相关的输入框
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        if (maxDepthInput) maxDepthInput.value = '2';
        if (concurrencyInput) concurrencyInput.value = '3';
    }
    
    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // 设置样式
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
        
        // 根据类型设置颜色
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
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 委托方法 - 将功能委托给相应的模块
    async startScan(silent = false) {
        // 重新加载正则表达式配置
        if (this.patternExtractor) {
            await this.patternExtractor.loadCustomPatterns();
            console.log('🔄 已重新加载正则表达式配置');
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
    
    exportResults() {
        return this.exportManager.exportResults();
    }
    
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
                
                // 恢复结果容器的原始高度
                if (resultsContainer) {
                    resultsContainer.classList.remove('expanded');
                }
            } else {
                // 收起按钮
                scanButtonsContainer.classList.add('collapsed');
                toggleIcon.textContent = '▼';
                toggleText.textContent = '展开按钮';
                toggleButton.classList.add('collapsed');
                
                // 扩展结果容器高度，占用原来按钮的空间
                if (resultsContainer) {
                    resultsContainer.classList.add('expanded');
                }
            }
        }
    }
    
    // 核心功能方法
    async autoScanIfNeeded() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 检查是否是有效的网页URL
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                console.log('跳过系统页面的自动扫描');
                return;
            }
            
            // 更新当前扫描域名显示
            this.updateCurrentDomain(tab.url);
            
            const lastScanKey = `lastScan_${tab.url}`;
            const data = await chrome.storage.local.get(lastScanKey);
            
            // 如果没有扫描过当前页面，或者超过5分钟，则自动扫描
            const now = Date.now();
            const lastScanTime = data[lastScanKey] || 0;
            const fiveMinutes = 5 * 60 * 1000;
            
            if (now - lastScanTime > fiveMinutes) {
                setTimeout(() => {
                    this.startScan(true); // 静默扫描
                }, 2000);
                
                // 记录扫描时间
                chrome.storage.local.set({ [lastScanKey]: now });
            }
        } catch (error) {
            console.error('自动扫描检查失败:', error);
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
            console.error('更新域名显示失败:', error);
        }
    }
    
    async clearResults() {
        // 确认清空操作
        if (!confirm('确定要清空当前页面的扫描数据吗？此操作不可恢复。')) {
            return;
        }
        
        try {
            // 获取当前页面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showNotification('无法获取当前页面URL', 'error');
                return;
            }
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // 清空内存中的数据
            this.results = {};
            this.deepScanResults = {};
            this.scannedUrls = new Set();
            this.pendingUrls = new Set();
            this.currentDepth = 0;
            this.deepScanRunning = false;
            
            // 清空界面显示
            document.getElementById('results').innerHTML = '';
            document.getElementById('stats').textContent = '';
            
            // 清空当前页面相关的持久化存储数据
            const keysToRemove = [
                `${pageKey}__results`,
                `${pageKey}__deepResults`, 
                `${pageKey}__deepBackup`,
                `${pageKey}__deepState`,
                `${pageKey}__lastSave`
            ];
            
            await chrome.storage.local.remove(keysToRemove);
            
            // 重置深度扫描UI状态
            this.resetDeepScanUI();
            
            // 显示清空成功提示
            this.showNotification(`页面 ${tab.url} 的扫描数据已清空`, 'success');
            
            console.log(`✅ 页面 ${pageKey} 的扫描数据已清空`);
            
        } catch (error) {
            console.error('❌ 清空数据失败:', error);
            this.showNotification('清空数据失败: ' + error.message, 'error');
        }
    }
    
    // 生成页面存储键 - 统一使用域名作为键
    getPageStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只使用域名作为键，不包含路径，确保同一域名下的所有页面共享存储
            const key = urlObj.hostname;
            // 替换特殊字符，确保键的有效性
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('生成存储键失败:', error);
            // 如果URL解析失败，使用简化的键
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }
    
    async saveResults() {
        try {
            // 获取当前页面URL作为存储键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法获取当前页面URL，跳过保存');
                return;
            }
            
            const pageKey = this.getPageStorageKey(tab.url);
            const saveData = {};
            
            // 为当前页面保存数据 - 使用统一的存储键格式
            saveData[`${pageKey}__results`] = this.results;
            saveData[`${pageKey}__lastSave`] = Date.now();
            
            // 如果有深度扫描结果，保存深度扫描数据
            if (this.deepScanResults && Object.keys(this.deepScanResults).length > 0) {
                saveData[`${pageKey}__deepResults`] = this.deepScanResults;
                saveData[`${pageKey}__deepBackup`] = this.deepScanResults;
                console.log('💾 保存深度扫描结果，数据条目:', 
                    Object.values(this.deepScanResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0));
            }
            
            // 保存深度扫描状态
            saveData[`${pageKey}__deepState`] = {
                running: this.deepScanRunning,
                scannedUrls: Array.from(this.scannedUrls || []),
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth,
                concurrency: this.concurrency
            };
            
            // 执行保存
            await chrome.storage.local.set(saveData);
            console.log(`✅ 页面数据保存成功: ${pageKey}`);
            
        } catch (error) {
            console.error('❌ 数据保存失败:', error);
        }
    }
    
    async loadResults() {
        try {
            // 获取当前页面URL作为存储键
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                console.warn('⚠️ 无法获取当前页面URL，跳过加载');
                return;
            }
            
            const pageKey = this.getPageStorageKey(tab.url);
            
            // 获取当前页面的所有相关数据 - 使用统一的存储键格式
            const keysToLoad = [
                `${pageKey}__results`,
                `${pageKey}__deepResults`,
                `${pageKey}__deepBackup`,
                `${pageKey}__deepState`,
                `${pageKey}__lastSave`
            ];
            
            const data = await chrome.storage.local.get(keysToLoad);
            
            console.log(`🔄 正在加载页面数据: ${pageKey}`, {
                hasBasic: !!data[`${pageKey}__results`],
                hasDeep: !!data[`${pageKey}__deepResults`],
                hasBackup: !!data[`${pageKey}__deepBackup`],
                lastSave: data[`${pageKey}__lastSave`] ? new Date(data[`${pageKey}__lastSave`]).toLocaleString() : '无'
            });
            
            // 优先使用最完整的数据源
            let bestResults = null;
            let bestSource = '';
            
            // 比较各个数据源的完整性
            const sources = [
                { data: data[`${pageKey}__deepResults`], name: 'deepResults' },
                { data: data[`${pageKey}__deepBackup`], name: 'deepBackup' },
                { data: data[`${pageKey}__results`], name: 'results' }
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
                console.log(`✅ 从 ${bestSource} 加载了页面数据，共 ${Object.values(bestResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} 条记录`);
                this.displayResults();
            } else {
                console.log(`⚠️ 页面 ${pageKey} 未找到有效的扫描数据`);
            }
            
            // 恢复深度扫描状态
            const deepState = data[`${pageKey}__deepState`];
            if (deepState) {
                this.deepScanRunning = deepState.running || false;
                this.scannedUrls = new Set(deepState.scannedUrls || []);
                this.currentDepth = deepState.currentDepth || 0;
                this.maxDepth = deepState.maxDepth || 2;
                this.concurrency = deepState.concurrency || 3;
                
                console.log('🔄 恢复深度扫描状态:', {
                    running: this.deepScanRunning,
                    scannedCount: this.scannedUrls.size,
                    depth: this.currentDepth
                });
            }
        } catch (error) {
            console.error('❌ 加载结果失败:', error);
        }
    }
}

const CURRENT_VERSION = 'v1.6.6'; // 请根据实际版本修改

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
        // 找到最大版本
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

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ILoveYouTranslucent7();
    checkForUpdate();
});
