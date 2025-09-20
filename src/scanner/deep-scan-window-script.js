// ==========================================================
// 深度扫描窗口脚本（统一正则版本）
// 所有正则统一通过 SettingsManager 获取，无任何硬编码
// ==========================================================

//console.log('🚀 [DEBUG] 深度扫描窗口脚本（统一正则版本）开始加载...');

// -------------------- 全局变量 --------------------
let scanConfig         = null;
let scanResults        = {};
let isScanRunning      = false;
let isPaused           = false;
let currentDepth       = 0;
let scannedUrls        = new Set();
let pendingUrls        = new Set();
let urlContentCache    = new Map();
let activeRequests     = 0;
let maxConcurrency     = 4; // 默认值，会从扩展设置中读取
let requestTimeout     = 3000; // 默认值，会从扩展设置中读取

// 日志相关变量 - 优化版本
let logEntries         = [];
let maxLogEntries      = 100; // 减少到100条，避免内存占用
let logBuffer          = []; // 日志缓冲区
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 500; // 500ms批量刷新日志

// 筛选器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化相关变量
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 300; // 🚀 增加到300ms节流，减少更新频率
let pendingResults     = {};
let batchSize          = 15; // 🚀 增加批量处理大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理相关变量
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30秒清理一次内存

// -------------------- 性能优化工具函数 --------------------

// 🚀 内存清理函数
function performMemoryCleanup() {
    //console.log('🧹 执行内存清理...');
    
    // 清理URL内容缓存，只保留最近的50个
    if (urlContentCache.size > 50) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-50);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 清理URL缓存，保留 ${toKeep.length} 个条目`);
    }
    
    // 清理日志缓冲区
    if (logBuffer && logBuffer.length > 0) {
        flushLogBuffer();
    }
    
    // 强制垃圾回收（如果可用）
    if (window.gc) {
        window.gc();
    }
}

// 启动内存清理定时器
function startMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
    }
    memoryCleanupTimer = setInterval(performMemoryCleanup, MEMORY_CLEANUP_INTERVAL);
}

// 停止内存清理定时器
function stopMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
        memoryCleanupTimer = null;
    }
}

function convertRelativeToAbsolute(relativePath) {
    try {
        const base = scanConfig?.baseUrl || window.location.origin;
        return new URL(relativePath, base).href;
    } catch {
        return relativePath;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL) ? chrome.runtime.getURL(src) : src;
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// -------------------- 统一筛选器加载 --------------------
async function loadFilters() {
    //console.log('🔍 [DEBUG] 开始加载统一筛选器...');

    try {
        // 加载 SettingsManager（必须）
        if (typeof window.SettingsManager === 'undefined') {
            await loadScript('src/utils/SettingsManager.js');
        }

        // 加载 PatternExtractor（必须）
        if (typeof window.PatternExtractor === 'undefined') {
            await loadScript('src/scanner/PatternExtractor.js');
        }

        // 等待脚本解析
        await new Promise(r => setTimeout(r, 100));

        // 实例化
        if (typeof window.PatternExtractor === 'undefined') {
            throw new Error('PatternExtractor 未加载成功');
        }
        patternExtractor = new window.PatternExtractor();

        // 强制加载自定义正则
        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
            patternExtractor.ensureCustomPatternsLoaded();
        }

        // 监听设置页正则更新
        window.addEventListener('regexConfigUpdated', (e) => {
            //console.log('🔄 [DEBUG] 收到正则配置更新事件');
            if (patternExtractor?.updatePatterns) {
                patternExtractor.updatePatterns(e.detail);
            } else if (patternExtractor?.loadCustomPatterns) {
                patternExtractor.loadCustomPatterns(e.detail);
            }
        });

        filtersLoaded = true;
        //console.log('✅ [DEBUG] 统一筛选器加载完毕');
    } catch (err) {
        console.error('❌ [DEBUG] 筛选器加载失败:', err);
        filtersLoaded = false;
    }
}

// -------------------- 统一内容提取 --------------------
async function extractFromContent(content, sourceUrl = 'unknown') {
    //console.log('🔍 [DEBUG] 开始统一内容提取...');

    if (!patternExtractor || typeof patternExtractor.extractPatterns !== 'function') {
        throw new Error('PatternExtractor.extractPatterns 不可用');
    }

    // 确保配置已加载
    if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
        await patternExtractor.ensureCustomPatternsLoaded();
    }

    // 使用统一入口提取
    const results = await patternExtractor.extractPatterns(content, sourceUrl);

    // 🔥 修复：不要清空相对路径API，保持原始数据用于显示
    convertRelativeApisToAbsolute(results);

    return results;
}

// -------------------- 统一结果处理 --------------------
function convertRelativeApisToAbsolute(results) {
    // 🔥 修复：完全移除自动转换逻辑，保持绝对路径API和相对路径API的独立性
    // 不再将相对路径API自动转换并添加到绝对路径API中
    // 这样可以避免意外添加不符合绝对路径API正则要求的数据
    
    //console.log('🔍 [DEBUG] API转换完成（已禁用自动转换）:');
    //console.log('  - 保留的相对路径API:', results.relativeApis?.length || 0, '个');
    //console.log('  - 保留的绝对路径API:', results.absoluteApis?.length || 0, '个');
    
    // 如果需要转换功能，应该在PatternExtractor中通过正则表达式来实现
    // 而不是在这里进行强制转换
}

// -------------------- 性能优化函数 --------------------
// 节流更新显示
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        // 如果距离上次更新时间太短，延迟更新
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(() => {
            performDisplayUpdate();
        }, UPDATE_THROTTLE);
        return;
    }
    
    performDisplayUpdate();
}

// 执行显示更新
function performDisplayUpdate() {
    if (isUpdating) return;
    
    isUpdating = true;
    lastUpdateTime = Date.now();
    displayUpdateCount++;
    
    try {
        // 使用 requestAnimationFrame 确保在下一帧更新
        requestAnimationFrame(() => {
            updateResultsDisplay();
            updateStatusDisplay();
            isUpdating = false;
        });
    } catch (error) {
        console.error('显示更新失败:', error);
        isUpdating = false;
    }
}

// 批量处理结果合并
function batchMergeResults(newResults) {
    let hasNewData = false;
    
    // 将新结果添加到待处理队列
    Object.keys(newResults).forEach(key => {
        if (!pendingResults[key]) {
            pendingResults[key] = new Map(); // 使用Map来存储对象，以value为键避免重复
        }
        
        if (Array.isArray(newResults[key])) {
            newResults[key].forEach(item => {
                if (item) {
                    // 处理结构化对象（带sourceUrl）和简单字符串
                    const itemKey = typeof item === 'object' ? item.value : item;
                    const itemData = typeof item === 'object' ? item : { value: item, sourceUrl: 'unknown' };
                    
                    if (!pendingResults[key].has(itemKey)) {
                        pendingResults[key].set(itemKey, itemData);
                        hasNewData = true;
                    }
                }
            });
        }
    });
    
    // 如果有新数据，触发节流更新
    if (hasNewData) {
        throttledUpdateDisplay();
    }
    
    return hasNewData;
}

// 将待处理结果合并到主结果中
function flushPendingResults() {
    Object.keys(pendingResults).forEach(key => {
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        // 创建现有结果的键集合，用于去重
        const existingKeys = new Set();
        scanResults[key].forEach(item => {
            const itemKey = typeof item === 'object' ? item.value : item;
            existingKeys.add(itemKey);
        });
        
        // 添加新的结果项
        pendingResults[key].forEach((itemData, itemKey) => {
            if (!existingKeys.has(itemKey)) {
                scanResults[key].push(itemData);
            }
        });
        
        // 清空待处理队列
        pendingResults[key].clear();
    });
}

// -------------------- 页面初始化 --------------------
async function initializePage() {
    //console.log('🔍 [DEBUG] 页面初始化中...');

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ Chrome扩展API不可用');
        return;
    }

    await loadFilters();

    try {
        // 获取baseUrl（从扫描配置中的baseUrl或当前窗口的opener）
        let baseUrl = '';
        if (window.opener) {
            try {
                // 尝试从opener窗口获取URL
                baseUrl = window.opener.location.origin;
            } catch (e) {
                // 如果跨域访问失败，使用默认方式
                console.warn('无法从opener获取URL，使用默认方式');
            }
        }
        
        // 从IndexedDB加载深度扫描配置
        let deepScanConfig = null;
        if (baseUrl) {
            deepScanConfig = await window.IndexedDBManager.loadDeepScanState(baseUrl);
        }
        
        // 如果没有找到配置，尝试获取所有可用的配置
        if (!deepScanConfig) {
            console.warn('⚠️ 未找到指定URL的扫描配置，尝试获取所有可用配置...');
            const allConfigs = await window.IndexedDBManager.getAllDeepScanStates();
            if (allConfigs && allConfigs.length > 0) {
                // 使用最新的配置
                deepScanConfig = allConfigs[allConfigs.length - 1];
                console.log('✅ 找到可用配置:', deepScanConfig.baseUrl);
            }
        }
        
        if (!deepScanConfig) throw new Error('未找到扫描配置');
        scanConfig = deepScanConfig;

        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout  = (scanConfig.timeout * 1000) || 5000;

        updateConfigDisplay();
        initializeScanResults();
    } catch (err) {
        console.error('❌ 初始化失败:', err);
    }

    // 绑定按钮事件
    document.getElementById('startBtn')?.addEventListener('click', startScan);
    document.getElementById('pauseBtn')?.addEventListener('click', pauseScan);
    document.getElementById('stopBtn')?.addEventListener('click', stopScan);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('toggleAllBtn')?.addEventListener('click', toggleAllCategories);
    
    // 🚀 添加滚动优化：检测用户是否在滚动
    const logSection = document.getElementById('logSection');
    if (logSection) {
        let scrollTimeout;
        logSection.addEventListener('scroll', () => {
            logSection.isUserScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                logSection.isUserScrolling = false;
            }, 1000); // 1秒后认为用户停止滚动
        });
        
        // 🚀 优化滚动性能
        logSection.style.willChange = 'scroll-position';
        logSection.style.transform = 'translateZ(0)'; // 启用硬件加速
    }

    // 监听扩展消息
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
        if (msg.action === 'stopDeepScan') {
            stopScan();
            reply({ success: true });
        }
    });

    // 自动开始
    setTimeout(startScan, 1000);
}

// -------------------- 配置显示 --------------------
function updateConfigDisplay() {
    if (!scanConfig) return;

    document.getElementById('maxDepthDisplay').textContent = scanConfig.maxDepth || 2;
    document.getElementById('concurrencyDisplay').textContent = scanConfig.concurrency || 8;
    document.getElementById('timeoutDisplay').textContent = scanConfig.timeout || 5;
    
    const scanTypes = [];
    if (scanConfig.scanJsFiles) scanTypes.push('JS文件');
    if (scanConfig.scanHtmlFiles) scanTypes.push('HTML页面');
    if (scanConfig.scanApiFiles) scanTypes.push('API接口');
    
    document.getElementById('scanTypesDisplay').textContent = scanTypes.join(', ') || '全部';
    document.getElementById('scanInfo').textContent = `目标: ${scanConfig.baseUrl}`;
}

// -------------------- 扫描结果初始化 --------------------
function initializeScanResults() {
    scanResults = {
        absoluteApis: [],
        relativeApis: [],
        moduleApis: [],
        domains: [],
        urls: [],
        images: [],
        jsFiles: [],
        cssFiles: [],
        vueFiles: [],
        emails: [],
        phoneNumbers: [],
        ipAddresses: [],
        sensitiveKeywords: [],
        comments: [],
        paths: [],
        parameters: [],
        credentials: [],
        cookies: [],
        idKeys: [],
        companies: [],
        jwts: [],
        githubUrls: [],
        bearerTokens: [],
        basicAuth: [],
        authHeaders: [],
        wechatAppIds: [],
        awsKeys: [],
        googleApiKeys: [],
        githubTokens: [],
        gitlabTokens: [],
        webhookUrls: [],
        idCards: [],
        cryptoUsage: []
    };
}

// -------------------- 扫描控制 --------------------
async function startScan() {
    if (isScanRunning) return;
    
    //console.log('🚀 [DEBUG] 开始深度扫描...');
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    
    // 更新UI状态
    updateButtonStates();
    updateStatusDisplay();
    
    // 隐藏加载提示
    document.getElementById('loadingDiv').style.display = 'none';
    
    try {
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        //console.log(`📋 [DEBUG] 收集到 ${initialUrls.length} 个初始URL`);
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始扫描URL`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ 没有找到可扫描的URL', 'warning');
            return;
        }
        
        // 🔥 记录初始URL列表（前几个）
        if (initialUrls.length > 0) {
            const urlsToShow = initialUrls.slice(0, 5);
            addLogEntry(`🎯 初始扫描目标: ${urlsToShow.join(', ')}${initialUrls.length > 5 ? ` 等${initialUrls.length}个URL` : ''}`, 'info');
        }
        
        // 记录扫描配置
        addLogEntry(`⚙️ 扫描配置 - 最大深度: ${scanConfig.maxDepth}, 并发数: ${scanConfig.concurrency}, 超时: ${scanConfig.timeout}ms`, 'info');
        
        // 开始分层扫描
        await performLayeredScan(initialUrls);
        
        // 完成扫描
        completeScan();
        
    } catch (error) {
        console.error('❌ 扫描失败:', error);
        addLogEntry(`❌ 扫描失败: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
    }
}

function pauseScan() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '继续扫描' : '暂停扫描';
    
    if (isPaused) {
        addLogEntry('⏸️ 扫描已暂停', 'warning');
        addLogEntry(`📊 暂停时状态: 已扫描${scannedUrls.size}个URL，当前深度${currentDepth}`, 'info');
    } else {
        addLogEntry('▶️ 扫描已继续', 'success');
    }
}

function stopScan() {
    isScanRunning = false;
    isPaused = false;
    addLogEntry('⏹️ 用户手动停止扫描', 'warning');
    addLogEntry(`📊 停止时状态: 已扫描${scannedUrls.size}个URL，当前深度${currentDepth}`, 'info');
    updateButtonStates();
    completeScan();
}

// -------------------- 初始URL收集 --------------------
async function collectInitialUrls() {
    //console.log('📋 [DEBUG] 开始收集初始URL - 从普通扫描结果中获取');
    
    const urls = new Set();
    
    try {
        // 从深度扫描配置中获取普通扫描的结果
        if (!scanConfig.initialResults) {
            console.warn('⚠️ 深度扫描配置中未找到普通扫描结果，将扫描当前页面');
            urls.add(scanConfig.baseUrl);
            return Array.from(urls);
        }
        
        const initialResults = scanConfig.initialResults;
        //console.log('📊 [DEBUG] 找到普通扫描结果:', Object.keys(initialResults));
        console.log('📊 [DEBUG] 普通扫描结果统计:', {
            absoluteApis: initialResults.absoluteApis?.length || 0,
            jsFiles: initialResults.jsFiles?.length || 0,
            urls: initialResults.urls?.length || 0,
            domains: initialResults.domains?.length || 0,
            emails: initialResults.emails?.length || 0
        });
        
        // 将普通扫描结果作为深度扫描的起始结果
        Object.keys(initialResults).forEach(key => {
            if (scanResults[key] && Array.isArray(initialResults[key])) {
                scanResults[key] = [...initialResults[key]];
            }
        });
        
        // 从普通扫描结果中收集JS文件进行深度扫描
        if (scanConfig.scanJsFiles && initialResults.jsFiles) {
            //console.log(`📁 [DEBUG] 从普通扫描结果收集JS文件: ${initialResults.jsFiles.length} 个`);
            for (const jsFile of initialResults.jsFiles) {
                // 兼容新格式（对象）和旧格式（字符串）
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const fullUrl = resolveUrl(url, scanConfig.baseUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] 添加JS文件: ${fullUrl}`);
                }
            }
        }
        
        // 从普通扫描结果中收集HTML页面进行深度扫描
        if (scanConfig.scanHtmlFiles && initialResults.urls) {
            //console.log(`🌐 [DEBUG] 从普通扫描结果收集URL: ${initialResults.urls.length} 个`);
            for (const urlItem of initialResults.urls) {
                // 兼容新格式（对象）和旧格式（字符串）
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const fullUrl = resolveUrl(url, scanConfig.baseUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] 添加页面URL: ${fullUrl}`);
                }
            }
        }
        
        // 从普通扫描结果中收集API接口进行深度扫描
        if (scanConfig.scanApiFiles) {
            // 绝对路径API
            if (initialResults.absoluteApis) {
                //console.log(`🔗 [DEBUG] 从普通扫描结果收集绝对API: ${initialResults.absoluteApis.length} 个`);
                for (const apiItem of initialResults.absoluteApis) {
                    // 兼容新格式（对象）和旧格式（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = resolveUrl(api, scanConfig.baseUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] 添加绝对API: ${fullUrl}`);
                    }
                }
            }
            
            // 相对路径API
            if (initialResults.relativeApis) {
                //console.log(`🔗 [DEBUG] 从普通扫描结果收集相对API: ${initialResults.relativeApis.length} 个`);
                for (const apiItem of initialResults.relativeApis) {
                    // 兼容新格式（对象）和旧格式（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const fullUrl = resolveUrl(api, scanConfig.baseUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] 添加相对API: ${fullUrl}`);
                    }
                }
            }
        }
        
        // 如果没有收集到任何URL，添加当前页面作为备用
        if (urls.size === 0) {
            console.warn('⚠️ 从普通扫描结果中未收集到任何URL，添加当前页面');
            urls.add(scanConfig.baseUrl);
        }
        
        //console.log(`📊 [DEBUG] 初始URL收集完成，共收集到 ${urls.size} 个URL`);
        //console.log(`📊 [DEBUG] 初始结果数量: ${Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
        return Array.from(urls);
        
    } catch (error) {
        console.error('❌ 收集初始URL失败:', error);
        // 出错时添加当前页面作为备用
        urls.add(scanConfig.baseUrl);
        return Array.from(urls);
    }
}

// -------------------- 分层扫描 --------------------
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        
        if (currentUrls.length === 0) {
            //console.log(`第 ${depth} 层没有URL需要扫描`);
            break;
        }
        
        //console.log(`🔍 开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`);
        addLogEntry(`🔍 开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`, 'info');
        
        // 🔥 记录当前层要扫描的URL列表（前几个）
        if (currentUrls.length > 0) {
            const urlsToShow = currentUrls.slice(0, 3);
            addLogEntry(`📋 第 ${depth} 层扫描目标: ${urlsToShow.join(', ')}${currentUrls.length > 3 ? ` 等${currentUrls.length}个URL` : ''}`, 'info');
        }
        
        // 批量扫描URL
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        // 准备下一层URL
        currentUrls = newUrls.filter(url => !scannedUrls.has(url));
        
        //console.log(`✅ 第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`);
        addLogEntry(`✅ 第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`, 'success');
        
        // 🔥 记录下一层将要扫描的URL数量
        if (currentUrls.length > 0 && depth < scanConfig.maxDepth) {
            addLogEntry(`🔄 准备第 ${depth + 1} 层扫描，待扫描URL: ${currentUrls.length} 个`, 'info');
        }
        
        // 更新显示
        updateResultsDisplay();
        updateStatusDisplay();
    }
}

// -------------------- 批量URL扫描 --------------------
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    // 使用队列和并发控制
    const queue = [...urls];
    const activeWorkers = new Set();
    
    // 实时显示计数器
    let lastDisplayUpdate = 0;
    const displayUpdateInterval = 500; // 每0.5秒最多更新一次显示，提高响应速度
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层扫描`);
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // 获取URL内容
                    let content;
                    if (urlContentCache.has(url)) {
                        content = urlContentCache.get(url);
                    } else {
                        content = await fetchUrlContent(url);
                        if (content) {
                            urlContentCache.set(url, content);
                        }
                    }
                    
                        if (content) {
                            // 🚀 性能优化：移除频繁的扫描日志
                            // addLogEntry(`🔍 正在扫描: ${url}`, 'info');
                            
                            // 提取信息
                            const extractedData = await extractFromContent(content, url);
                            const hasNewData = mergeResults(extractedData);
                            
                            // 🔥 记录提取结果日志
                            if (hasNewData) {
                                const newDataCount = Object.values(extractedData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                                addLogEntry(`✅ 从 ${url} 提取到 ${newDataCount} 个新数据项`, 'success');
                            } else {
                                addLogEntry(`ℹ️ 从 ${url} 未发现新数据`, 'info');
                            }
                            
                            // 🚀 性能优化：减少显示更新频率，只在批量处理时更新
                            if (hasNewData) {
                                // 每处理10个URL才更新一次显示
                                if (processedCount % 10 === 0) {
                                    throttledUpdateDisplay();
                                }
                            }
                            
                            // 收集新URL
                            const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                            if (discoveredUrls.length > 0) {
                                addLogEntry(`🔗 从 ${url} 发现 ${discoveredUrls.length} 个新URL`, 'info');
                            }
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        } else {
                            // 🔥 记录无内容的情况
                            addLogEntry(`⚠️ ${url} 返回空内容或无法访问`, 'warning');
                        }
                    } catch (error) {
                        console.error(`扫描 ${url} 失败:`, error);
                        // 🔥 添加错误日志记录
                        addLogEntry(`❌ 扫描失败: ${url} - ${error.message}`, 'error');
                    } finally {
                        processedCount++;
                        // 🚀 性能优化：减少进度更新频率，每5个URL更新一次
                        if (processedCount % 5 === 0 || processedCount === totalUrls) {
                            updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层扫描`);
                        }
                        activeWorkers.delete(workerPromise);
                    }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 性能优化：控制并发数并添加延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 添加延迟，避免过快请求导致系统卡顿
            if (activeWorkers.size >= maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 🚀 增加到200ms延迟
            }
        }
    };
    
    await processQueue();
    
    // 等待所有工作完成
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// -------------------- URL内容获取 --------------------
async function fetchUrlContent(url) {
    try {
        //console.log(`🔥 深度扫描 - 准备通过后台脚本请求: ${url}`);
        
        const requestOptions = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                'Cache-Control': 'no-cache'
            },
            timeout: requestTimeout
        };
        
        const response = await makeRequestViaBackground(url, requestOptions);
        
        if (!response.ok) {
            console.warn(`HTTP ${response.status} for ${url}`);
            // 🔥 添加HTTP错误日志
            addLogEntry(`⚠️ HTTP ${response.status} - ${url}`, 'warning');
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        // 过滤非文本内容
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf')) {
            // 🔥 添加内容类型过滤日志
            addLogEntry(`🚫 跳过非文本内容 (${contentType}) - ${url}`, 'info');
            return null;
        }
        
        const text = await response.text();
        // 🔥 添加成功获取内容的日志
        const contentSize = text.length;
        const sizeText = contentSize > 1024 ? `${Math.round(contentSize / 1024)}KB` : `${contentSize}B`;
        addLogEntry(`📥 成功获取内容 (${sizeText}) - ${url}`, 'info');
        return text;
        
    } catch (error) {
        console.error(`无法访问 ${url}:`, error);
        // 🔥 添加网络错误日志
        addLogEntry(`❌ 网络错误: ${error.message} - ${url}`, 'error');
        return null;
    }
}

// -------------------- 后台请求 --------------------
async function makeRequestViaBackground(url, options = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'makeRequest',
            url: url,
            options: options
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
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
                    url: response.data.url
                });
            } else {
                reject(new Error(response?.error || 'Request failed'));
            }
        });
    });
}

// -------------------- 从内容收集URL --------------------
async function collectUrlsFromContent(content, baseUrl) {
    const urls = new Set();
    
    try {
        const extractedData = await extractFromContent(content, baseUrl);
        
        // 收集JS文件
        if (scanConfig.scanJsFiles && extractedData.jsFiles) {
            for (const jsFile of extractedData.jsFiles) {
                const fullUrl = resolveUrl(jsFile, baseUrl);
                if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // 收集HTML页面
        if (scanConfig.scanHtmlFiles && extractedData.urls) {
            for (const url of extractedData.urls) {
                const fullUrl = resolveUrl(url, baseUrl);
                if (fullUrl && await isSameDomain(fullUrl, baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // 收集API接口
        if (scanConfig.scanApiFiles) {
            if (extractedData.absoluteApis) {
                for (const api of extractedData.absoluteApis) {
                    const fullUrl = resolveUrl(api, baseUrl);
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            if (extractedData.relativeApis) {
                for (const api of extractedData.relativeApis) {
                    const fullUrl = resolveUrl(api, baseUrl);
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ 从内容收集URL失败:', error);
    }
    
    return Array.from(urls);
}

// -------------------- 结果合并 --------------------
function mergeResults(newResults) {
    // 使用批量合并，避免频繁的DOM更新
    return batchMergeResults(newResults);
}

// -------------------- 结果保存 --------------------
async function saveResultsToStorage() {
    try {
        // 生成域名键
        let domainKey = 'unknown__results';
        if (scanConfig?.baseUrl) {
            try {
                const hostname = new URL(scanConfig.baseUrl).hostname;
                domainKey = `${hostname}__results`;
            } catch (e) {
                console.warn('解析域名失败，使用默认键:', e);
            }
        }
        
        //console.log('📝 [DEBUG] 使用存储键:', domainKey);
        
        // 从IndexedDB获取当前的普通扫描结果
        const existingResults = await window.IndexedDBManager.loadScanResults(scanConfig.baseUrl) || {};
        
        // 合并深度扫描结果到普通扫描结果中
        const mergedResults = { ...existingResults };
        
        // 将深度扫描的结果合并到普通扫描结果中
        Object.keys(scanResults).forEach(key => {
            if (!mergedResults[key]) {
                mergedResults[key] = [];
            }
            
            // 创建现有结果的键集合，用于去重
            const existingKeys = new Set();
            mergedResults[key].forEach(item => {
                const itemKey = typeof item === 'object' ? item.value : item;
                existingKeys.add(itemKey);
            });
            
            // 合并新的结果项
            scanResults[key].forEach(item => {
                if (item) {
                    const itemKey = typeof item === 'object' ? item.value : item;
                    if (!existingKeys.has(itemKey)) {
                        mergedResults[key].push(item);
                        existingKeys.add(itemKey);
                    }
                }
            });
        });
        
        // 添加扫描元数据
        mergedResults.scanMetadata = {
            ...existingResults.scanMetadata,
            lastScanType: 'deep',
            deepScanComplete: true,
            deepScanTimestamp: Date.now(),
            deepScanUrl: scanConfig.baseUrl,
            totalScanned: scannedUrls.size
        };
        
        // 保存合并后的结果到IndexedDB，包含URL位置信息
        const pageTitle = scanConfig.pageTitle || document.title || 'Deep Scan Results';
        // 使用基础URL作为存储键，但保持每个结果项的具体来源URL
        await window.IndexedDBManager.saveScanResults(scanConfig.baseUrl, mergedResults, scanConfig.baseUrl, pageTitle);
        
        //console.log('✅ 深度扫描结果已合并到主扫描结果中');
        //console.log('📊 存储键:', domainKey);
        console.log('📊 合并后结果统计:', {
            总数: Object.values(mergedResults).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            深度扫描贡献: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        console.error('❌ 保存结果失败:', error);
    }
}

// -------------------- 扫描完成 --------------------
async function completeScan() {
    //console.log('🎉 深度扫描完成！');
    
    // 🔥 优化：确保所有待处理结果都被合并
    flushPendingResults();
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalScanned = scannedUrls.size;
    
    addLogEntry('🎉 深度扫描完成！', 'success');
    addLogEntry(`📊 扫描统计: 扫描了 ${totalScanned} 个文件，提取了 ${totalResults} 个项目`, 'success');
    
    // 🔥 优化：减少详细统计日志，避免卡顿
    const nonEmptyCategories = Object.entries(scanResults).filter(([key, items]) => items && items.length > 0);
    if (nonEmptyCategories.length > 0) {
        const topCategories = nonEmptyCategories
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 5) // 只显示前5个最多的类别
            .map(([key, items]) => `${key}: ${items.length}个`);
        addLogEntry(`📈 主要发现: ${topCategories.join(', ')}`, 'success');
    }
    
    // 🔥 记录扫描耗时
    const scanDuration = Date.now() - (scanConfig.timestamp || Date.now());
    const durationText = scanDuration > 60000 ? 
        `${Math.floor(scanDuration / 60000)}分${Math.floor((scanDuration % 60000) / 1000)}秒` : 
        `${Math.floor(scanDuration / 1000)}秒`;
    addLogEntry(`⏱️ 扫描耗时: ${durationText}`, 'info');
    
    // 保存结果到存储（合并到主扫描结果中）
    await saveResultsToStorage();
    
    // 通知主页面深度扫描完成，让其更新显示
    try {
        chrome.runtime.sendMessage({
            action: 'deepScanComplete',
            data: {
                results: scanResults,
                totalScanned: totalScanned,
                totalResults: totalResults,
                baseUrl: scanConfig.baseUrl
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                //console.log('主页面可能已关闭，无法发送完成通知');
            } else {
                //console.log('✅ 已通知主页面深度扫描完成');
            }
        });
    } catch (error) {
        //console.log('发送完成通知失败:', error);
    }
    
    // 🔥 优化：最终更新UI
    performDisplayUpdate();
    
    // 更新进度显示
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = '✅ 深度扫描完成！';
        progressText.classList.add('success');
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // 更新按钮状态
    updateButtonStates();
    
    // 🔥 优化：清理内存和缓存
    setTimeout(() => {
        cleanupMemory();
    }, 5000); // 5秒后清理内存
}

// 内存清理函数
function cleanupMemory() {
    //console.log('🧹 开始清理内存...');
    
    // 清理URL内容缓存，只保留最近的100个
    if (urlContentCache.size > 100) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-100);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 清理URL缓存，保留 ${toKeep.length} 个条目`);
    }
    
    // 清理待处理结果
    Object.keys(pendingResults).forEach(key => {
        if (pendingResults[key]) {
            pendingResults[key].clear();
        }
    });
    
    // 清理更新队列
    updateQueue.length = 0;
    
    // 清理定时器
    if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
    }
    
    //console.log('✅ 内存清理完成');
}

// -------------------- UI更新函数 --------------------
function updateButtonStates() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isScanRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = '扫描中...';
        pauseBtn.textContent = isPaused ? '继续扫描' : '暂停扫描';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = '开始扫描';
        pauseBtn.textContent = '暂停扫描';
    }
}

function updateStatusDisplay() {
    document.getElementById('currentDepth').textContent = currentDepth;
    document.getElementById('scannedUrls').textContent = scannedUrls.size;
    document.getElementById('pendingUrls').textContent = pendingUrls.size;
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    document.getElementById('totalResults').textContent = totalResults;
}

function updateProgressDisplay(current, total, stage) {
    // 🚀 防抖处理：避免频繁更新进度条
    if (updateProgressDisplay.pending) return;
    updateProgressDisplay.pending = true;
    
    // 🚀 使用requestAnimationFrame延迟更新，避免阻塞滚动
    requestAnimationFrame(() => {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
            progressBar.style.width = `${percentage}%`;
        }
        
        updateProgressDisplay.pending = false;
    });
}

function updateResultsDisplay() {
    // 先合并所有待处理的结果
    flushPendingResults();
    
    //console.log(`🔍 [DEBUG] 开始更新深度扫描结果显示... (第${displayUpdateCount}次更新)`);
    
    // 🔥 减少调试日志输出，避免控制台卡顿
    if (displayUpdateCount % 10 === 0) { // 每10次更新才输出详细日志
        //console.log('🔍 [DEBUG] API数据检查:');
        //console.log('  - absoluteApis:', scanResults.absoluteApis?.length || 0, '个');
        //console.log('  - relativeApis:', scanResults.relativeApis?.length || 0, '个');
        if (scanResults.absoluteApis?.length > 0) {
            //console.log('  - absoluteApis 示例:', scanResults.absoluteApis.slice(0, 3));
        }
        if (scanResults.relativeApis?.length > 0) {
            //console.log('  - relativeApis 示例:', scanResults.relativeApis.slice(0, 3));
        }
    }
    
    // 🔥 修复API显示问题：正确的元素ID映射
    const categoryMapping = {
        absoluteApis: { containerId: 'absoluteApisResult', countId: 'absoluteApisCount', listId: 'absoluteApisList' },
        relativeApis: { containerId: 'relativeApisResult', countId: 'relativeApisCount', listId: 'relativeApisList' },
        moduleApis: { containerId: 'modulePathsResult', countId: 'modulePathsCount', listId: 'modulePathsList' },
        domains: { containerId: 'domainsResult', countId: 'domainsCount', listId: 'domainsList' },
        urls: { containerId: 'urlsResult', countId: 'urlsCount', listId: 'urlsList' },
        images: { containerId: 'imagesResult', countId: 'imagesCount', listId: 'imagesList' },
        jsFiles: { containerId: 'jsFilesResult', countId: 'jsFilesCount', listId: 'jsFilesList' },
        cssFiles: { containerId: 'cssFilesResult', countId: 'cssFilesCount', listId: 'cssFilesList' },
        vueFiles: { containerId: 'vueFilesResult', countId: 'vueFilesCount', listId: 'vueFilesList' },
        emails: { containerId: 'emailsResult', countId: 'emailsCount', listId: 'emailsList' },
        phoneNumbers: { containerId: 'phoneNumbersResult', countId: 'phoneNumbersCount', listId: 'phoneNumbersList' },
        ipAddresses: { containerId: 'ipAddressesResult', countId: 'ipAddressesCount', listId: 'ipAddressesList' },
        sensitiveKeywords: { containerId: 'sensitiveKeywordsResult', countId: 'sensitiveKeywordsCount', listId: 'sensitiveKeywordsList' },
        comments: { containerId: 'commentsResult', countId: 'commentsCount', listId: 'commentsList' },
        paths: { containerId: 'pathsResult', countId: 'pathsCount', listId: 'pathsList' },
        parameters: { containerId: 'parametersResult', countId: 'parametersCount', listId: 'parametersList' },
        credentials: { containerId: 'credentialsResult', countId: 'credentialsCount', listId: 'credentialsList' },
        cookies: { containerId: 'cookiesResult', countId: 'cookiesCount', listId: 'cookiesList' },
        idKeys: { containerId: 'idKeysResult', countId: 'idKeysCount', listId: 'idKeysList' },
        companies: { containerId: 'companiesResult', countId: 'companiesCount', listId: 'companiesList' },
        jwts: { containerId: 'jwtsResult', countId: 'jwtsCount', listId: 'jwtsList' },
        githubUrls: { containerId: 'githubUrlsResult', countId: 'githubUrlsCount', listId: 'githubUrlsList' },
        bearerTokens: { containerId: 'bearerTokensResult', countId: 'bearerTokensCount', listId: 'bearerTokensList' },
        basicAuth: { containerId: 'basicAuthResult', countId: 'basicAuthCount', listId: 'basicAuthList' },
        authHeaders: { containerId: 'authHeadersResult', countId: 'authHeadersCount', listId: 'authHeadersList' },
        wechatAppIds: { containerId: 'wechatAppIdsResult', countId: 'wechatAppIdsCount', listId: 'wechatAppIdsList' },
        awsKeys: { containerId: 'awsKeysResult', countId: 'awsKeysCount', listId: 'awsKeysList' },
        googleApiKeys: { containerId: 'googleApiKeysResult', countId: 'googleApiKeysCount', listId: 'googleApiKeysList' },
        githubTokens: { containerId: 'githubTokensResult', countId: 'githubTokensCount', listId: 'githubTokensList' },
        gitlabTokens: { containerId: 'gitlabTokensResult', countId: 'gitlabTokensCount', listId: 'gitlabTokensList' },
        webhookUrls: { containerId: 'webhookUrlsResult', countId: 'webhookUrlsCount', listId: 'webhookUrlsList' },
        idCards: { containerId: 'idCardsResult', countId: 'idCardsCount', listId: 'idCardsList' },
        cryptoUsage: { containerId: 'cryptoUsageResult', countId: 'cryptoUsageCount', listId: 'cryptoUsageList' }
    };
    
    // 🔥 修复显示逻辑：使用正确的元素ID
    Object.keys(categoryMapping).forEach(key => {
        const items = scanResults[key] || [];
        const mapping = categoryMapping[key];
        
        // 🔥 优化：减少调试日志，只在必要时输出
        if (displayUpdateCount % 20 === 0) {
            //console.log(`🔍 [DEBUG] 处理类别 ${key}: ${items.length} 个项目`);
        }
        
        if (items.length > 0) {
            // 显示容器
            const resultDiv = document.getElementById(mapping.containerId);
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }
            
            // 更新计数
            const countElement = document.getElementById(mapping.countId);
            if (countElement && countElement.textContent !== items.length.toString()) {
                countElement.textContent = items.length;
            }
            
            // 🔥 优化：只在列表内容真正改变时才更新DOM
            const listElement = document.getElementById(mapping.listId);
            if (listElement) {
                const currentItemCount = listElement.children.length;
                if (currentItemCount !== items.length) {
                    // 使用文档片段批量更新DOM
                    const fragment = document.createDocumentFragment();
                    items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'result-item';
                        
                        // 🔥 修复：使用每个项目自己的sourceUrl进行悬停显示
                        if (typeof item === 'object' && item !== null) {
                            // 处理带有sourceUrl的结构化对象 {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                            if (item.value !== undefined && item.sourceUrl) {
                                const itemValue = String(item.value);
                                const itemSourceUrl = String(item.sourceUrl);
                                // 只显示值，不直接显示来源URL，仅在悬停时显示
                                li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                                li.style.cssText = 'padding: 5px 0;';
                                // 悬停提示显示该项目的sourceUrl
                                li.title = `来源: ${itemSourceUrl}`;
                            } else if (item.url || item.path || item.value || item.content) {
                                // 兼容其他对象格式
                                const displayValue = item.url || item.path || item.value || item.content || JSON.stringify(item);
                                li.textContent = String(displayValue);
                                li.title = String(displayValue);
                            } else {
                                const jsonStr = JSON.stringify(item);
                                li.textContent = jsonStr;
                                li.title = jsonStr;
                            }
                        } else {
                            // 如果是字符串或其他基本类型，直接显示
                            const displayValue = String(item);
                            li.textContent = displayValue;
                            li.title = displayValue;
                        }
                        
                        fragment.appendChild(li);
                    });
                    
                    // 一次性更新DOM
                    listElement.innerHTML = '';
                    listElement.appendChild(fragment);
                }
            }
        }
    });
    
    // 🔥 处理自定义正则结果 - 恢复被删除的功能
    //console.log('🔍 [DEBUG] 开始处理自定义正则结果...');
    Object.keys(scanResults).forEach(key => {
        if (key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🎯 [DEBUG] 发现自定义正则结果: ${key}, 数量: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
    
    // 🔥 处理其他未预定义的结果类别
    Object.keys(scanResults).forEach(key => {
        // 跳过已处理的预定义类别和自定义正则
        if (!categoryMapping[key] && !key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🆕 [DEBUG] 发现新的结果类别: ${key}, 数量: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
}

function createCustomResultCategory(key, items) {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) return;
    
    let resultDiv = document.getElementById(key + 'Result');
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = key + 'Result';
        resultDiv.className = 'result-category';
        
        const title = document.createElement('h3');
        title.innerHTML = `🔍 ${key.replace('custom_', '自定义-')} (<span id="${key}Count">0</span>)`;
        
        const list = document.createElement('ul');
        list.id = key + 'List';
        list.className = 'result-list';
        
        resultDiv.appendChild(title);
        resultDiv.appendChild(list);
        resultsSection.appendChild(resultDiv);
    }
    
    resultDiv.style.display = 'block';
    
    const countElement = document.getElementById(key + 'Count');
    if (countElement) {
        countElement.textContent = items.length;
    }
    
    const listElement = document.getElementById(key + 'List');
    if (listElement) {
        listElement.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'result-item';
            
            // 🔥 修复：使用每个项目自己的sourceUrl进行悬停显示
            if (typeof item === 'object' && item !== null) {
                // 处理带有sourceUrl的结构化对象 {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                if (item.value !== undefined && item.sourceUrl) {
                    const itemValue = String(item.value);
                    const itemSourceUrl = String(item.sourceUrl);
                    // 只显示值，不直接显示来源URL，仅在悬停时显示
                    li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                    li.style.cssText = 'padding: 5px 0;';
                    // 悬停提示显示该项目的sourceUrl
                    li.title = `来源: ${itemSourceUrl}`;
                } else {
                    // 兼容其他对象格式
                    const jsonStr = JSON.stringify(item);
                    li.textContent = jsonStr;
                    li.title = jsonStr;
                }
            } else {
                // 如果是字符串或其他基本类型，直接显示
                const displayValue = String(item);
                li.textContent = displayValue;
                li.title = displayValue;
            }
            
            listElement.appendChild(li);
        });
    }
}

function addLogEntry(message, type = 'info') {
    const logSection = document.getElementById('logSection');
    if (!logSection) return;
    
    // 🚀 性能优化：只过滤最频繁的日志，保留重要信息
    if (type === 'info' && (
        message.includes('成功获取内容') ||
        message.includes('跳过非文本内容')
    )) {
        return; // 只跳过这些最频繁的日志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // 添加到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // 批量刷新日志（降低频率）
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            flushLogBuffer();
            logFlushTimer = null;
        }, LOG_FLUSH_INTERVAL);
    }
}

// 批量刷新日志缓冲区
function flushLogBuffer() {
    if (!logBuffer || logBuffer.length === 0) return;
    
    // 将缓冲区内容添加到主日志数组
    logEntries.push(...logBuffer);
    logBuffer = [];
    
    // 限制日志条目数量
    if (logEntries.length > maxLogEntries) {
        logEntries = logEntries.slice(-maxLogEntries);
    }
    
    // 更新显示
    updateLogDisplay();
}

// 🚀 优化的日志显示函数 - 减少DOM操作频率
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 🚀 防抖处理：避免频繁更新DOM
    if (updateLogDisplay.pending) return;
    updateLogDisplay.pending = true;
    
    // 只显示最近的20条日志，进一步减少DOM负载
    const recentLogs = logEntries.slice(-20);
    
    // 检查是否需要更新（避免不必要的DOM操作）
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        updateLogDisplay.pending = false;
        return; // 没有新日志，跳过更新
    }
    
    // 🚀 使用setTimeout延迟更新，避免阻塞滚动
    setTimeout(() => {
        // 使用文档片段批量更新
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        // 使用requestAnimationFrame优化DOM更新
        requestAnimationFrame(() => {
            logSection.innerHTML = '';
            logSection.appendChild(fragment);
            
            // 🚀 优化滚动：只在必要时滚动
            if (!logSection.isUserScrolling) {
                logSection.scrollTop = logSection.scrollHeight;
            }
            
            updateLogDisplay.pending = false;
        });
    }, 100); // 100ms延迟，避免频繁更新
}

// -------------------- 工具函数 --------------------
function resolveUrl(url, baseUrl) {
    try {
        if (!url) return null;
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        if (url.startsWith('//')) {
            return new URL(baseUrl).protocol + url;
        }
        
        return new URL(url, baseUrl).href;
    } catch (error) {
        return null;
    }
}

// 检查是否为同一域名 - 支持子域名和全部域名设置
async function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // 获取域名扫描设置
        const domainSettings = await getDomainScanSettings();
        //console.log('🔍 [深度扫描] 当前域名设置:', domainSettings);
        //console.log('🔍 [深度扫描] 检查URL:', url, '基准URL:', baseUrl);
        
        // 如果允许扫描所有域名
        if (domainSettings.allowAllDomains) {
            //console.log(`🌐 [深度扫描] 允许所有域名: ${urlObj.hostname}`);
            addLogEntry(`🌐 允许所有域名: ${urlObj.hostname}`, 'info');
            return true;
        }
        
        // 如果允许扫描子域名
        if (domainSettings.allowSubdomains) {
            const baseHostname = baseUrlObj.hostname;
            const urlHostname = urlObj.hostname;
            
            // 检查是否为同一域名或子域名
            const isSameOrSubdomain = urlHostname === baseHostname || 
                                    urlHostname.endsWith('.' + baseHostname) ||
                                    baseHostname.endsWith('.' + urlHostname);
            
            if (isSameOrSubdomain) {
                //console.log(`🔗 [深度扫描] 允许子域名: ${urlHostname} (基于 ${baseHostname})`);
                //addLogEntry(`🔗 允许子域名: ${urlHostname}`, 'info');
                return true;
            }
        }
        
        // 默认：只允许完全相同的域名
        const isSame = urlObj.hostname === baseUrlObj.hostname;
        if (isSame) {
            //console.log(`✅ [深度扫描] 同域名: ${urlObj.hostname}`);
        } else {
            //console.log(`❌ [深度扫描] 不同域名: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
        }
        return isSame;
        
    } catch (error) {
        console.error('[深度扫描] 域名检查失败:', error);
        return false;
    }
}

// 获取域名扫描设置
async function getDomainScanSettings() {
    try {
        // 如果SettingsManager可用，使用它获取设置
        if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
            return await window.SettingsManager.getDomainScanSettings();
        }
        
        // 备用方案：直接从chrome.storage获取
        const result = await chrome.storage.local.get(['domainScanSettings']);
        const domainSettings = result.domainScanSettings || {
            allowSubdomains: false,
            allowAllDomains: false
        };
        //console.log('🔍 [深度扫描] 从storage获取的域名设置:', domainSettings);
        return domainSettings;
    } catch (error) {
        console.error('[深度扫描] 获取域名扫描设置失败:', error);
        // 默认设置：只允许同域名
        return {
            allowSubdomains: false,
            allowAllDomains: false
        };
    }
}

function isValidPageUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
        return false;
    }
    
    const resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
    return !resourceExtensions.test(url.toLowerCase());
}

// -------------------- 导出功能 --------------------
function exportResults() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function toggleAllCategories() {
    const categories = document.querySelectorAll('.result-category');
    const hasVisible = Array.from(categories).some(cat => cat.style.display !== 'none');
    
    categories.forEach(category => {
        category.style.display = hasVisible ? 'none' : 'block';
    });
}

// -------------------- 事件监听器 --------------------
document.addEventListener('DOMContentLoaded', initializePage);

// 导出弹窗事件
document.addEventListener('click', (e) => {
    if (e.target.id === 'closeExportModal' || e.target.id === 'exportModal') {
        document.getElementById('exportModal').style.display = 'none';
    }
    
    if (e.target.id === 'exportJSON') {
        exportAsJSON();
        document.getElementById('exportModal').style.display = 'none';
    }
    
    if (e.target.id === 'exportXLS') {
        exportAsExcel();
        document.getElementById('exportModal').style.display = 'none';
    }
});

async function exportAsJSON() {
    try {
        const filename = await generateFileName('json');
        const dataStr = JSON.stringify(scanResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        addLogEntry(`✅ JSON导出成功: ${filename}`, 'success');
    } catch (error) {
        addLogEntry(`❌ JSON导出失败: ${error.message}`, 'error');
    }
}

async function exportAsExcel() {
    try {
        const filename = await generateFileName('xlsx');
        
        // 检查是否有数据可导出
        const hasData = Object.keys(scanResults).some(key => 
            scanResults[key] && Array.isArray(scanResults[key]) && scanResults[key].length > 0
        );
        
        if (!hasData) {
            addLogEntry(`⚠️ 没有数据可导出`, 'warning');
            return;
        }
        
        // 生成Excel XML格式内容
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影工具-深度扫描</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D4EDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>`;

        // 为每个分类创建工作表
        const categories = Object.keys(scanResults);
        let dataExported = false;

        categories.forEach(category => {
            const items = scanResults[category];
            if (Array.isArray(items) && items.length > 0) {
                dataExported = true;
                const sheetName = sanitizeSheetName(category);
                
                xlsContent += `
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Column ss:Width="50"/>
   <Column ss:Width="400"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">序号</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">内容</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">分类</Data></Cell>
   </Row>`;

                items.forEach((item, index) => {
                    xlsContent += `
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(String(item))}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(category)}</Data></Cell>
   </Row>`;
                });

                xlsContent += `
  </Table>
 </Worksheet>`;
            }
        });

        // 如果没有数据，创建一个空的工作表
        if (!dataExported) {
            xlsContent += `
 <Worksheet ss:Name="无数据">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有找到任何数据</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // 创建并下载文件
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        addLogEntry(`✅ Excel文件导出成功: ${filename}.xls`, 'success');
        
    } catch (error) {
        addLogEntry(`❌ Excel导出失败: ${error.message}`, 'error');
        console.error('Excel导出错误:', error);
    }
}

// 清理工作表名称（Excel工作表名称有特殊字符限制）
function sanitizeSheetName(name) {
    // 移除或替换Excel不允许的字符
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    // 限制长度（Excel工作表名称最大31个字符）
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || '未命名';
}

// XML转义函数
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// 生成文件名：域名__随机数
async function generateFileName(extension = 'json') {
    let domain = 'deep-scan';
    
    try {
        // 优先从扫描配置中获取目标域名
        if (scanConfig && scanConfig.baseUrl) {
            const url = new URL(scanConfig.baseUrl);
            domain = url.hostname;
            //console.log('从扫描配置获取到域名:', domain);
        } else {
            // 备选方案：从当前窗口URL参数中提取目标域名
            if (window.location && window.location.href) {
                const urlParams = new URLSearchParams(window.location.search);
                const targetUrl = urlParams.get('url');
                if (targetUrl) {
                    const url = new URL(targetUrl);
                    domain = url.hostname;
                    //console.log('从URL参数获取到域名:', domain);
                }
            }
        }
    } catch (e) {
        //console.log('获取域名失败，使用默认名称:', e);
        // 使用时间戳作为标识
        domain = `deep-scan_${Date.now()}`;
    }
    
    // 清理域名，移除特殊字符
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 生成随机数（6位）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${domain}__${randomNum}`;
}

//console.log('✅ [DEBUG] 深度扫描窗口脚本（统一正则版本）加载完成');
