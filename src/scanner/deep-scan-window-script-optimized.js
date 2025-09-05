// ==========================================================
// 深度扫描窗口脚本（性能优化版本）
// 减少日志记录、优化DOM操作、控制并发数
// ==========================================================

console.log('🚀 [DEBUG] 深度扫描窗口脚本（性能优化版本）开始加载...');

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
let maxConcurrency     = 3; // 🚀 减少并发数
let requestTimeout     = 3000; // 🚀 减少超时时间

// 日志相关变量 - 优化版本
let logEntries         = [];
let maxLogEntries      = 50; // 🚀 大幅减少日志条目
let logBuffer          = [];
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 1000; // 🚀 1秒批量刷新日志

// 筛选器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化相关变量
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 500; // 🚀 500ms节流，大幅减少更新频率
let pendingResults     = {};
let batchSize          = 20; // 🚀 增加批量处理大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理相关变量
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30秒清理一次内存

// -------------------- 性能优化工具函数 --------------------

// 🚀 内存清理函数
function performMemoryCleanup() {
    console.log('🧹 执行内存清理...');
    
    // 清理URL内容缓存，只保留最近的30个
    if (urlContentCache.size > 30) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-30);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        console.log(`🧹 清理URL缓存，保留 ${toKeep.length} 个条目`);
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

// 🚀 优化的日志添加函数 - 大幅减少日志记录
function addLogEntry(message, type = 'info') {
    // 🚀 只记录关键日志，过滤掉大部分信息日志
    if (type === 'info' && (
        message.includes('正在扫描:') || 
        message.includes('成功获取内容') ||
        message.includes('未发现新数据') ||
        message.includes('跳过非文本内容') ||
        message.includes('允许子域名') ||
        message.includes('允许所有域名') ||
        message.includes('发现') ||
        message.includes('提取到')
    )) {
        return; // 跳过这些频繁的信息日志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // 添加到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // 批量刷新日志
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

// 🚀 优化的日志显示函数
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 只显示最近的20条日志
    const recentLogs = logEntries.slice(-20);
    
    // 检查是否需要更新
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        return;
    }
    
    // 使用requestAnimationFrame优化DOM更新
    requestAnimationFrame(() => {
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        logSection.innerHTML = '';
        logSection.appendChild(fragment);
        logSection.scrollTop = logSection.scrollHeight;
    });
}

// 🚀 节流的显示更新函数
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        return;
    }
    
    lastUpdateTime = now;
    requestAnimationFrame(() => {
        displayResults();
    });
}

// -------------------- 工具函数 --------------------

function convertRelativeToAbsolute(relativePath) {
    try {
        const base = scanConfig?.baseUrl || window.location.origin;
        return new URL(relativePath, base).href;
    } catch {
        return relativePath;
    }
}

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

// -------------------- 主要扫描函数 --------------------

// 🚀 优化的扫描函数
async function startScan() {
    if (isScanRunning) {
        console.log('扫描已在运行中');
        return;
    }

    isScanRunning = true;
    isPaused = false;
    
    try {
        console.log('🚀 开始深度扫描...');
        addLogEntry('🚀 开始深度扫描', 'success');
        
        // 🚀 启动内存清理
        startMemoryCleanup();
        
        updateButtonStates();
        
        // 加载配置和初始化
        await loadScanConfig();
        await loadFilters();
        
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ 没有找到可扫描的URL', 'warning');
            return;
        }
        
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始扫描URL`, 'success');
        
        // 开始分层扫描
        let currentUrls = initialUrls;
        
        for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
            currentDepth = depth;
            console.log(`🔍 开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`);
            addLogEntry(`🔍 开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`, 'success');
            
            // 🚀 优化的批量扫描
            const newUrls = await scanUrlBatchOptimized(currentUrls, depth);
            currentUrls = newUrls;
            
            console.log(`✅ 第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`);
            addLogEntry(`✅ 第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`, 'success');
            
            // 🚀 每层扫描后强制更新显示
            displayResults();
            
            if (currentUrls.length === 0) {
                break;
            }
        }
        
        await completeScan();
        
    } catch (error) {
        console.error('❌ 扫描失败:', error);
        addLogEntry(`❌ 扫描失败: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
        // 🚀 停止内存清理
        stopMemoryCleanup();
    }
}

// 🚀 优化的批量扫描函数
async function scanUrlBatchOptimized(urls, depth) {
    const newUrls = new Set();
    const activeWorkers = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    const processQueue = async () => {
        for (let i = 0; i < urls.length && isScanRunning && !isPaused; i++) {
            const url = urls[i];
            
            if (scannedUrls.has(url)) {
                processedCount++;
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // 🚀 移除频繁的扫描日志
                    const content = await fetchUrlContent(url);
                    
                    if (content) {
                        // 提取数据
                        const extractedData = await extractDataFromContent(content, scanConfig.baseUrl);
                        const hasNewData = addToScanResults(extractedData);
                        
                        // 🚀 减少显示更新频率，每20个URL更新一次
                        if (hasNewData && processedCount % 20 === 0) {
                            throttledUpdateDisplay();
                        }
                        
                        // 收集新URL
                        const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                    }
                } catch (error) {
                    console.error(`扫描 ${url} 失败:`, error);
                    addLogEntry(`❌ 扫描失败: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    // 🚀 减少进度更新频率，每10个URL更新一次
                    if (processedCount % 10 === 0 || processedCount === totalUrls) {
                        updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层扫描`);
                    }
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 控制并发数并添加延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 🚀 添加延迟，避免过快请求
            if (i % maxConcurrency === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms延迟
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

// 其他必要的函数（简化版本）...
// 这里需要包含其他必要的函数，但都经过性能优化

console.log('✅ 深度扫描窗口脚本（性能优化版本）加载完成');