/**
 * 深度扫描器 - 负责递归深度扫描功能
 */
class DeepScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        // 添加URL缓存，避免重复处理
        this.urlContentCache = new Map();
        // 添加正则表达式缓存
        this.regexCache = {};
        // 默认超时时间（毫秒）
        this.timeout = 5000;
        // 过滤器状态
        this.filtersLoaded = false;
    }
    
    // 加载增强过滤器
    async loadEnhancedFilters() {
        if (this.filtersLoaded) {
            console.log('🔍 增强过滤器已加载');
            return;
        }
        
        console.log('🔄 开始加载深度扫描增强过滤器...');
        
        try {
            // 检查是否在扩展环境中
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // 加载域名和手机号过滤器
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // 初始化过滤器
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        console.log('✅ 域名手机号过滤器初始化成功');
                    }
                }
                
                // 加载API过滤器
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    console.log('✅ API过滤器加载成功');
                }
                
                this.filtersLoaded = true;
                console.log('🎉 所有过滤器加载完成');
            } else {
                console.warn('⚠️ 非扩展环境，无法加载过滤器');
            }
        } catch (error) {
            console.error('❌ 过滤器加载失败:', error);
        }
    }
    
    // 加载过滤器脚本
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    console.log(`📦 脚本加载成功: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 脚本加载失败: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // 设置超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也继续执行
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ 加载脚本失败: ${scriptPath}`, error);
                resolve(); // 出错时也继续执行
            }
        });
    }
    
    // 切换深度扫描模式 - 使用新的窗口系统
    toggleDeepScan() {
        const configDiv = document.getElementById('deepScanConfig');
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (configDiv.style.display === 'none' || !configDiv.style.display) {
            // 显示配置面板
            configDiv.style.display = 'block';
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '🚀 开始深度扫描';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        } else {
            // 开始深度扫描 - 使用新的窗口系统
            this.startDeepScanWindow();
        }
    }
    
    // 开始深度扫描窗口
    async startDeepScanWindow() {
        console.log('🚀 启动深度扫描窗口...');
        
        try {
            // 获取配置参数
            const maxDepthInput = document.getElementById('maxDepth');
            const concurrencyInput = document.getElementById('concurrency');
            const timeoutInput = document.getElementById('timeout');
            
            const maxDepth = parseInt(maxDepthInput?.value) || 2;
            const concurrency = parseInt(concurrencyInput?.value) || 8;
            const timeout = parseInt(timeoutInput?.value) || 5;
            
            // 初始化深度扫描窗口管理器
            if (!this.srcMiner.deepScanWindow) {
                // 动态加载DeepScanWindow类
                await this.loadDeepScanWindow();
                this.srcMiner.deepScanWindow = new DeepScanWindow(this.srcMiner);
            }
            
            // 获取当前页面URL
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法获取当前页面信息');
            }
            
            // 启动深度扫描窗口
            await this.srcMiner.deepScanWindow.createDeepScanWindow({
                maxDepth: maxDepth,
                concurrency: concurrency,
                timeout: timeout
            });
            
            // 显示成功提示
            this.showSuccessNotification('🚀 深度扫描已在新窗口中启动！请查看新打开的扫描页面。');
            
            // 隐藏配置面板
            const configDiv = document.getElementById('deepScanConfig');
            const deepScanBtn = document.getElementById('deepScanBtn');
            const deepScanBtnText = deepScanBtn?.querySelector('.text');
            
            if (configDiv) {
                configDiv.style.display = 'none';
            }
            
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归扫描';
            }
            
            if (deepScanBtn) {
                deepScanBtn.style.background = '';
            }
            
        } catch (error) {
            console.error('❌ 启动深度扫描窗口失败:', error);
            this.showError('启动深度扫描窗口失败: ' + error.message);
        }
    }
    
    // 动态加载DeepScanWindow类
    async loadDeepScanWindow() {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/scanner/DeepScanWindow.js');
                
                script.onload = () => {
                    console.log('📦 DeepScanWindow类加载成功');
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error('❌ DeepScanWindow类加载失败:', error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // 设置超时保护
                setTimeout(() => {
                    if (typeof DeepScanWindow !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('DeepScanWindow类加载超时'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 处理来自扫描窗口的消息
    handleScanWindowMessage(message, sender, sendResponse) {
        if (!this.srcMiner.deepScanWindow) {
            sendResponse({ success: false, error: 'DeepScanWindow not initialized' });
            return;
        }
        
        return this.srcMiner.deepScanWindow.handleScanWindowMessage(message, sender, sendResponse);
    }
    
    // 兼容性方法 - 保持原有的深度扫描功能作为备用
    async startDeepScan() {
        console.log('🔄 使用传统深度扫描方法作为备用');
        
        if (this.srcMiner.deepScanRunning) {
            console.log('深度扫描已在运行中');
            return;
        }
        
        console.log('🚀 启动传统深度扫描...');
        // 确保过滤器已加载
        await this.loadEnhancedFilters();
        
        // 获取配置参数
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');
        
        // 检查配置元素是否存在
        if (!maxDepthInput || !concurrencyInput) {
            console.error('深度扫描配置元素未找到');
            this.showError('深度扫描配置错误，请检查页面元素');
            return;
        }
        
        this.srcMiner.maxDepth = parseInt(maxDepthInput.value) || 2;
        this.srcMiner.concurrency = parseInt(concurrencyInput.value) || 8;
        
        // 获取超时设置
        if (timeoutInput) {
            this.timeout = parseInt(timeoutInput.value) * 1000; // 转换为毫秒
        } else {
            this.timeout = 5000; // 默认5秒
        }
        
        console.log(`设置超时时间: ${this.timeout/1000}秒`);
        const scanJsFiles = scanJsFilesInput ? scanJsFilesInput.checked : true;
        const scanHtmlFiles = scanHtmlFilesInput ? scanHtmlFilesInput.checked : true;
        const scanApiFiles = scanApiFilesInput ? scanApiFilesInput.checked : true;
        
        console.log('深度扫描配置:', {
            maxDepth: this.srcMiner.maxDepth,
            concurrency: this.srcMiner.concurrency,
            timeout: this.timeout / 1000 + '秒',
            scanJsFiles,
            scanHtmlFiles,
            scanApiFiles
        });
        
        // 重置扫描状态
        this.srcMiner.deepScanRunning = true;
        this.srcMiner.scannedUrls = new Set(); // 使用Set而不是clear()，确保是新实例
        this.srcMiner.pendingUrls = new Set();
        this.urlContentCache.clear(); // 清空URL内容缓存
        
        // 使用引用而不是深拷贝，减少内存使用
        this.srcMiner.deepScanResults = {};
        Object.keys(this.srcMiner.results).forEach(key => {
            this.srcMiner.deepScanResults[key] = [...(this.srcMiner.results[key] || [])];
        });
        
        this.srcMiner.currentDepth = 0;
        
        const deepScanBtn = document.getElementById('deepScanBtn');
        const progressDiv = document.getElementById('deepScanProgress');
        const configDiv = document.getElementById('deepScanConfig');
        
        // 更新UI状态
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '⏹️ 停止扫描';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            deepScanBtn.style.color = '#fff';
        }
        
        if (progressDiv) {
            // 进度条显示已移除
        }
        
        // 保持配置面板显示，以便查看进度条
        if (configDiv) {
            configDiv.style.display = 'block';
            // 禁用配置选项，防止扫描过程中修改
            const configInputs = configDiv.querySelectorAll('input, select');
            configInputs.forEach(input => input.disabled = true);
        }
        
        try {
            // 重新加载正则表达式配置
            if (this.srcMiner.patternExtractor) {
                await this.srcMiner.patternExtractor.loadCustomPatterns();
                if (typeof this.srcMiner.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                    await this.srcMiner.patternExtractor.ensureCustomPatternsLoaded();
                }
                console.log('🔄 深度扫描已重新加载正则表达式配置');
            }
            
            // 获取当前页面信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                throw new Error('无法获取当前页面URL');
            }
            
            const baseUrl = new URL(tab.url).origin;
            const currentUrl = tab.url;
            
            console.log('🎯 深度扫描目标:', {
                baseUrl,
                currentUrl,
                maxDepth: this.srcMiner.maxDepth
            });
            
            // 添加当前页面到已扫描列表
            this.srcMiner.scannedUrls.add(currentUrl);
            
            // 收集初始扫描URL列表
            const initialUrls = this.collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles);
            console.log('📋 初始URL列表 (' + initialUrls.length + ' 个):', initialUrls.slice(0, 5));
            
            if (initialUrls.length === 0) {
                console.log('⚠️ 没有找到可扫描的URL');
                this.updateDeepScanProgress(0, 0, '没有找到可扫描的URL');
                return;
            }
            
            // 开始分层递归扫描
            await this.performLayeredScan(baseUrl, initialUrls, {
                scanJsFiles,
                scanHtmlFiles,
                scanApiFiles
            });
            
            // 更新最终结果并保存
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            this.srcMiner.saveResults();
            
            // 额外保存深度扫描专用数据
            chrome.storage.local.set({
                deepScanComplete: true,
                deepScanTimestamp: Date.now(),
                deepScanUrl: (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.url
            });
            
            this.showDeepScanComplete();
            
        } catch (error) {
            console.error('❌ 深度扫描失败:', error);
            this.showError('深度扫描失败: ' + error.message);
        } finally {
            // 重置UI状态
            this.srcMiner.deepScanRunning = false;
            
            // 最终保存所有数据
            this.srcMiner.saveResults();
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归扫描';
                }
                deepScanBtn.style.background = '';
                deepScanBtn.style.color = '';
            }
            
            if (configDiv) {
                // 重新启用配置选项
                const configInputs = configDiv.querySelectorAll('input, select');
                configInputs.forEach(input => input.disabled = false);
                
                // 延迟隐藏配置面板，让用户看到最终进度
                setTimeout(() => {
                    configDiv.style.display = 'none';
                }, 5000);
            }
            
            if (progressDiv) {
                // 保持进度条显示一段时间
                setTimeout(() => {
                    if (progressDiv.style.display !== 'none') {
                        progressDiv.style.display = 'none';
                    }
                }, 5000);
            }
            
            // 清理缓存
            this.urlContentCache.clear();
            
            // 保存扫描完成状态
            chrome.storage.local.set({
                lastDeepScanCompleted: Date.now(),
                deepScanRunning: false
            });
        }
    }
    
    // 收集初始扫描URL
    collectInitialUrls(baseUrl, scanJsFiles, scanHtmlFiles, scanApiFiles) {
        const urls = new Set();
        
        console.log('🔍 收集初始URL，当前结果:', Object.keys(this.srcMiner.results));
        
        // 从JS文件中收集
        if (scanJsFiles && this.srcMiner.results.jsFiles) {
            this.srcMiner.results.jsFiles.forEach(jsFile => {
                const fullUrl = this.resolveUrl(jsFile, baseUrl);
                if (fullUrl && this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            });
        }
        
        // 从HTML/页面URL中收集
        if (scanHtmlFiles && this.srcMiner.results.urls) {
            this.srcMiner.results.urls.forEach(url => {
                const fullUrl = this.resolveUrl(url, baseUrl);
                if (fullUrl && this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                    // 只收集可能是页面的URL
                    if (this.isPageUrl(fullUrl)) {
                        urls.add(fullUrl);
                    }
                }
            });
        }
        
        // 从API接口中收集
        if (scanApiFiles) {
            // 绝对路径API
            if (this.srcMiner.results.absoluteApis) {
                this.srcMiner.results.absoluteApis.forEach(api => {
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                });
            }
            
            // 相对路径API
            if (this.srcMiner.results.relativeApis) {
                this.srcMiner.results.relativeApis.forEach(api => {
                    const fullUrl = this.resolveUrl(api, baseUrl);
                    if (fullUrl && this.isSameDomain(fullUrl, baseUrl) && !this.srcMiner.scannedUrls.has(fullUrl)) {
                        urls.add(fullUrl);
                    }
                });
            }
        }
        
        const urlArray = Array.from(urls);
        console.log(`📊 收集到 ${urlArray.length} 个初始URL`);
        return urlArray;
    }
    
    // 判断是否为页面URL
    isPageUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            // 使用缓存的正则表达式
            if (!this.regexCache.resourceExtensions) {
                this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i;
            }
            
            // 排除明显的资源文件
            if (this.regexCache.resourceExtensions.test(pathname)) {
                return false;
            }
            
            // 包含页面特征
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
    
    // 执行分层扫描
    async performLayeredScan(baseUrl, initialUrls, options) {
        let currentUrls = [...initialUrls];
        
        for (let depth = 1; depth <= this.srcMiner.maxDepth && this.srcMiner.deepScanRunning; depth++) {
            this.srcMiner.currentDepth = depth;
            
            if (currentUrls.length === 0) {
                console.log(`第 ${depth} 层没有URL需要扫描`);
                break;
            }
            
            console.log(`🔍 开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`);
            this.updateDeepScanProgress(0, currentUrls.length, `第 ${depth} 层扫描`);
            
            // 分批处理URL - 使用优化的批处理方法
            const newUrls = await this.scanUrlBatchOptimized(currentUrls, baseUrl, options, depth);
            
            // 准备下一层的URL - 使用Set进行去重
            const nextUrlsSet = new Set(newUrls);
            currentUrls = Array.from(nextUrlsSet).filter(url => !this.srcMiner.scannedUrls.has(url));
            
            console.log(`✅ 第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`);
            
            // 每层扫描完成后强制更新显示
            this.srcMiner.results = this.srcMiner.deepScanResults;
            this.srcMiner.displayResults();
            console.log(`🔄 第 ${depth} 层扫描完成，已更新显示界面`);
            
            // 每层扫描后释放内存
            if (typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {}
            }
        }
    }
    
    // 优化的批量扫描URL方法 - 支持实时输出
    async scanUrlBatchOptimized(urls, baseUrl, options, depth) {
        const newUrls = new Set();
        let processedCount = 0;
        const totalUrls = urls.length;
        const concurrency = this.srcMiner.concurrency;
        
        // 使用队列和工作线程池模式，而不是简单的分块
        const queue = [...urls];
        const activeWorkers = new Set();
        
        // 实时显示计数器
        let lastDisplayUpdate = 0;
        const displayUpdateInterval = 1000; // 每1秒最多更新一次显示
        
        const processQueue = async () => {
            while (queue.length > 0 && this.srcMiner.deepScanRunning) {
                const url = queue.shift();
                
                // 跳过已扫描的URL
                if (this.srcMiner.scannedUrls.has(url)) {
                    processedCount++;
                    this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层扫描`);
                    continue;
                }
                
                // 标记为已扫描
                this.srcMiner.scannedUrls.add(url);
                
                const workerPromise = (async () => {
                    try {
                        // 获取URL内容 - 使用缓存
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
                            // 提取信息
                            const extractedData = this.extractFromContent(content, url);
                            const hasNewData = await this.mergeDeepScanResults(extractedData);
                            
                            // 如果有新数据且距离上次显示更新超过间隔时间，立即更新显示
                            const now = Date.now();
                            if (hasNewData && (now - lastDisplayUpdate) > displayUpdateInterval) {
                                lastDisplayUpdate = now;
                                // 实时更新显示
                                this.srcMiner.results = this.srcMiner.deepScanResults;
                                this.srcMiner.displayResults();
                                console.log(`🔄 实时更新显示 - 扫描到新数据来源: ${url}`);
                            }
                            
                            // 收集新URL
                            const discoveredUrls = this.collectUrlsFromContent(content, baseUrl, options);
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        }
                    } catch (error) {
                        console.error(`扫描 ${url} 失败:`, error);
                    } finally {
                        processedCount++;
                        this.updateDeepScanProgress(processedCount, totalUrls, `第 ${depth} 层扫描`);
                        activeWorkers.delete(workerPromise);
                    }
                })();
                
                activeWorkers.add(workerPromise);
                
                // 控制并发数
                if (activeWorkers.size >= concurrency) {
                    await Promise.race(Array.from(activeWorkers));
                }
            }
        };
        
        // 启动队列处理
        await processQueue();
        
        // 等待所有活跃工作线程完成
        if (activeWorkers.size > 0) {
            await Promise.all(Array.from(activeWorkers));
        }
        
        return Array.from(newUrls);
    }
    
    // 获取URL内容 - 通过后台脚本发送请求
    async fetchUrlContent(url) {
        try {
            console.log(`🔥 深度扫描 - 准备通过后台脚本请求: ${url}`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                    'Cache-Control': 'no-cache'
                },
                timeout: this.timeout
            };
            
            console.log(`🔥 深度扫描 - 发送消息到后台脚本，URL: ${url}`);
            
            // 通过后台脚本发送请求
            const response = await this.makeRequestViaBackground(url, requestOptions);
            
            console.log(`🔥 深度扫描 - 后台脚本响应: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                console.warn(`HTTP ${response.status} for ${url}`);
                return null;
            }
            
            const contentType = response.headers.get('content-type') || '';
            // 快速过滤非文本内容
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
    
    // 通过后台脚本发送请求
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
                    // 模拟fetch响应对象
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
    
    // 从内容中提取信息 - 优化版本
    extractFromContent(content, sourceUrl) {
        // 内容太大时进行截断，避免处理过大的文件
        const maxContentLength = 500000; // 约500KB
        const processedContent = content.length > maxContentLength ? 
            content.substring(0, maxContentLength) : content;
        
        // 使用PatternExtractor来提取信息
        const results = {
            absoluteApis: new Set(),
            relativeApis: new Set(),
            modulePaths: new Set(),
            domains: new Set(),
            urls: new Set(),
            images: new Set(),
            jsFiles: new Set(),
            cssFiles: new Set(),
            emails: new Set(),
            phoneNumbers: new Set(),
            ipAddresses: new Set(),
            sensitiveKeywords: new Set(),
            comments: new Set(),
            paths: new Set(),
            parameters: new Set(),
            credentials: new Set(),
            cookies: new Set(),
            idKeys: new Set(),
            companies: new Set(),
            jwts: new Set(),
            githubUrls: new Set(),
            vueFiles: new Set(),
            // 补齐所有敏感分类，避免容器缺失导致写入失败
            bearerTokens: new Set(),
            basicAuth: new Set(),
            authHeaders: new Set(),
            wechatAppIds: new Set(),
            awsKeys: new Set(),
            googleApiKeys: new Set(),
            githubTokens: new Set(),
            gitlabTokens: new Set(),
            webhookUrls: new Set(),
            idCards: new Set(),
            cryptoUsage: new Set()
        };
        
        // 使用PatternExtractor的方法
        if (this.srcMiner.patternExtractor) {
            this.srcMiner.patternExtractor.extractAPIs(processedContent, results);
            this.srcMiner.patternExtractor.extractOtherResources(processedContent, results);
            this.srcMiner.patternExtractor.extractSensitiveData(processedContent, results);
        }
        
        // 应用增强过滤器
        this.applyFilters(results, processedContent);
        
        // 转换Set为Array - 优化版本
        const finalResults = {};
        Object.keys(results).forEach(key => {
            finalResults[key] = Array.from(results[key]).filter(Boolean);
        });
        
        return finalResults;
    }
    
    // 从内容中收集新的URL - 优化版本
    collectUrlsFromContent(content, baseUrl, options) {
        const urls = new Set();
        const { scanJsFiles, scanHtmlFiles, scanApiFiles } = options;
        
        // 内容太大时进行截断
        const maxContentLength = 500000; // 约500KB
        const processedContent = content.length > maxContentLength ? 
            content.substring(0, maxContentLength) : content;
        
        // 使用更高效的正则表达式组合
        if (scanJsFiles || scanHtmlFiles || scanApiFiles) {
            // 通用URL提取正则 - 一次性提取所有可能的URL
            const urlPattern = /(?:href|src|import|require|from|url|endpoint|path|location)\s*[:=]\s*["'`]([^"'`]+)["'`]|["'`]([^"'`]*\/[^"'`]*\.[a-zA-Z0-9]{1,5}(?:\?[^"'`]*)?)["'`]/gi;
            
            let match;
            while ((match = urlPattern.exec(processedContent)) !== null) {
                const extractedUrl = match[1] || match[2];
                if (!extractedUrl) continue;
                
                // 快速过滤无效URL
                if (extractedUrl.startsWith('#') || 
                    extractedUrl.startsWith('javascript:') || 
                    extractedUrl.startsWith('mailto:') ||
                    extractedUrl.startsWith('data:')) {
                    continue;
                }
                
                // 根据扫描选项过滤URL
                const isJsResource = /\.(js|ts|jsx|tsx|vue|json)(\?|$)/i.test(extractedUrl);
                const isHtmlResource = this.isValidPageUrl(extractedUrl);
                const isApiResource = this.isValidApiUrl(extractedUrl);
                
                if ((scanJsFiles && isJsResource) || 
                    (scanHtmlFiles && isHtmlResource) || 
                    (scanApiFiles && isApiResource)) {
                    
                    const fullUrl = this.resolveUrl(extractedUrl, baseUrl);
                    if (fullUrl && this.isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
        
        return Array.from(urls);
    }
    
    // 验证页面URL
    isValidPageUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // 使用缓存的正则表达式
        if (!this.regexCache.resourceExtensions) {
            this.regexCache.resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
        }
        
        // 排除资源文件
        if (this.regexCache.resourceExtensions.test(url.toLowerCase())) {
            return false;
        }
        
        return true;
    }
    
    // 验证API URL - 优化版本
    isValidApiUrl(url) {
        if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
            return false;
        }
        
        // 使用缓存的正则表达式
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
    
    // 合并深度扫描结果 - 优化版本，支持实时输出
    async mergeDeepScanResults(newResults) {
        let hasNewData = false;
        
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.deepScanResults[key]) {
                this.srcMiner.deepScanResults[key] = [];
            }
            
            // 使用Set进行去重
            const existingSet = new Set(this.srcMiner.deepScanResults[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.deepScanResults[key].push(item);
                    hasNewData = true;
                }
            });
        });
        
        // 如果有新数据，立即保存到多个位置确保数据持久化
        if (hasNewData) {
            this.srcMiner.results = this.srcMiner.deepScanResults;
            
            // 立即保存到存储，使用统一的存储键格式
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                const pageKey = this.getPageStorageKey(tab.url);
                chrome.storage.local.set({ 
                    [`${pageKey}__results`]: this.srcMiner.deepScanResults,
                    [`${pageKey}__deepResults`]: this.srcMiner.deepScanResults,
                    [`${pageKey}__deepBackup`]: this.srcMiner.deepScanResults,
                    [`${pageKey}__lastSave`]: Date.now()
                });
            }
            
            console.log('🔄 深度扫描数据已保存，当前结果数量:', 
                Object.values(this.srcMiner.deepScanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0));
        }
        
        // 返回是否有新数据的标志，用于实时显示判断
        return hasNewData;
    }
    
    // 应用过滤器处理结果
    applyFilters(results, content) {
        try {
            // 检查过滤器是否可用
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.log('⚠️ 过滤器未加载，跳过过滤步骤');
                return;
            }
            
            // 应用域名和手机号过滤器
            if (window.domainPhoneFilter) {
                // 过滤域名
                if (results.domains.size > 0) {
                    const domains = Array.from(results.domains);
                    const validDomains = window.domainPhoneFilter.filterDomains(domains);
                    results.domains = new Set(validDomains);
                }
                
                // 过滤邮箱
                if (results.emails.size > 0) {
                    const emails = Array.from(results.emails);
                    const validEmails = window.domainPhoneFilter.filterEmails(emails);
                    results.emails = new Set(validEmails);
                }
                
                // 过滤手机号
                if (results.phoneNumbers.size > 0) {
                    const phones = Array.from(results.phoneNumbers);
                    const validPhones = window.domainPhoneFilter.filterPhones(phones, true);
                    results.phoneNumbers = new Set(validPhones);
                }
                
                // 从内容中提取额外的信息
                try {
                    const extractedInfo = window.domainPhoneFilter.processText(content);
                    
                    // 添加有效的邮箱地址
                    extractedInfo.emails.forEach(email => results.emails.add(email));
                    
                    // 添加有效的手机号
                    extractedInfo.phoneNumbers.forEach(phone => results.phoneNumbers.add(phone));
                    
                    // 添加有效的域名
                    extractedInfo.domains.forEach(domain => results.domains.add(domain));
                } catch (e) {
                    console.warn('处理文本提取失败:', e);
                }
            }
            
            // 应用API过滤器
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                try {
                    // 过滤绝对路径API
                    if (results.absoluteApis.size > 0) {
                        const apis = Array.from(results.absoluteApis);
                        const validApis = window.apiFilter.filterAPIs(apis, true);
                        results.absoluteApis = new Set(validApis);
                    }
                    
                    // 过滤相对路径API
                    if (results.relativeApis.size > 0) {
                        const apis = Array.from(results.relativeApis);
                        const validApis = window.apiFilter.filterAPIs(apis, false);
                        results.relativeApis = new Set(validApis);
                    }
                    
                    // 从内容中提取额外的API
                    const extractedAPIs = window.apiFilter.extractAPIsFromText(content);
                    extractedAPIs.absolute.forEach(api => results.absoluteApis.add(api));
                    extractedAPIs.relative.forEach(api => results.relativeApis.add(api));
                } catch (e) {
                    console.warn('API过滤失败:', e);
                }
            }
        } catch (error) {
            console.error('应用过滤器时出错:', error);
        }
    }
    
    // 解析相对URL为绝对URL - 优化版本
    resolveUrl(url, baseUrl) {
        try {
            if (!url) return null;
            
            // 已经是完整URL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // 协议相对URL
            if (url.startsWith('//')) {
                return new URL(baseUrl).protocol + url;
            }
            
            // 绝对路径或相对路径
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            return null;
        }
    }
    
    // 检查是否为同一域名
    isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            return urlObj.hostname === baseUrlObj.hostname;
        } catch (error) {
            return false;
        }
    }
    
    // 更新深度扫描进度
    updateDeepScanProgress(current, total, stage) {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    // 显示深度扫描完成
    showDeepScanComplete() {
        const deepScanBtn = document.getElementById('deepScanBtn');
        const deepScanBtnText = deepScanBtn.querySelector('.text');
        
        if (deepScanBtnText) {
            deepScanBtnText.textContent = '✅ 深度扫描完成';
        }
        deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        // 确保最终结果被保存
        this.srcMiner.saveResults();
        
        // 保存深度扫描完成状态
        chrome.storage.local.set({
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
        setTimeout(() => {
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归扫描';
            }
            deepScanBtn.style.background = '';
        }, 3000);
        
        const totalScanned = this.srcMiner.scannedUrls.size;
        const totalResults = Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        console.log(`🎉 深度扫描完成！扫描了 ${totalScanned} 个文件，提取了 ${totalResults} 个项目`);
    }
    
    showError(message) {
        console.error('深度扫描错误:', message);
        // 可以在这里添加UI提示
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'error');
        }
    }
    
    showSuccessNotification(message) {
        console.log('深度扫描提示:', message);
        // 显示成功提示
        if (typeof this.srcMiner.showNotification === 'function') {
            this.srcMiner.showNotification(message, 'success');
        } else {
            // 备用提示方式
            alert(message);
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
}
