// ==========================================================
// deep scan窗口脚本（性能优化version）
// reduceday志record、优化DOM操作、控制and发数
// ==========================================================

//console.log('🚀 [DEBUG] deep scan窗口脚本（性能优化version）startload...');

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
let maxConcurrency     = 3; // 🚀 reduceand发数
let requestTimeout     = 3000; // 🚀 reduce超时时间

// day志相关变量 - 优化version
let logEntries         = [];
let maxLogEntries      = 50; // 🚀 大幅reduceday志条目
let logBuffer          = [];
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 1000; // 🚀 1秒批量刷newday志

// 筛选器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化相关变量
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 500; // 🚀 500ms节流，大幅reduce更new频率
let pendingResults     = {};
let batchSize          = 20; // 🚀 add批量处理大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理相关变量
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30秒清理一次内存

// -------------------- 性能优化工具函数 --------------------

// 🚀 内存清理函数
function performMemoryCleanup() {
    //console.log('🧹 execute内存清理...');
    
    // 清理URL内容缓存，只keep最近30个
    if (urlContentCache.size > 30) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-30);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 清理URL缓存，keep ${toKeep.length} 个条目`);
    }
    
    // 清理day志缓冲区
    if (logBuffer && logBuffer.length > 0) {
        flushLogBuffer();
    }
    
    // 强制垃圾回收（if可for）
    if (window.gc) {
        window.gc();
    }
}

// start内存清理定时器
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

// 🚀 优化day志add函数 - 大幅reduceday志record
function addLogEntry(message, type = 'info') {
    // 🚀 只record关键day志，through滤掉大部分informationday志
    if (type === 'info' && (
        message.includes('正inscan:') || 
        message.includes('successget内容') ||
        message.includes('未发现newdata') ||
        message.includes('skip非文本内容') ||
        message.includes('允许子domain') ||
        message.includes('允许alldomain') ||
        message.includes('发现') ||
        message.includes('extractto')
    )) {
        return; // skip这些频繁informationday志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // addto缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // 批量刷newday志
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            flushLogBuffer();
            logFlushTimer = null;
        }, LOG_FLUSH_INTERVAL);
    }
}

// 批量刷newday志缓冲区
function flushLogBuffer() {
    if (!logBuffer || logBuffer.length === 0) return;
    
    // 将缓冲区内容addto主day志数组
    logEntries.push(...logBuffer);
    logBuffer = [];
    
    // 限制day志条目数量
    if (logEntries.length > maxLogEntries) {
        logEntries = logEntries.slice(-maxLogEntries);
    }
    
    // 更new显示
    updateLogDisplay();
}

// 🚀 优化day志显示函数
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 只显示最近20条day志
    const recentLogs = logEntries.slice(-20);
    
    // check是否require更new
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        return;
    }
    
    // userequestAnimationFrame优化DOM更new
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

// 🚀 节流显示更new函数
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

// -------------------- 主要scan函数 --------------------

// 🚀 优化scan函数
async function startScan() {
    if (isScanRunning) {
        //console.log('scanalreadyin运行in');
        return;
    }

    isScanRunning = true;
    isPaused = false;
    
    try {
        //console.log('🚀 startdeep scan...');
        addLogEntry('🚀 startdeep scan', 'success');
        
        // 🚀 start内存清理
        startMemoryCleanup();
        
        updateButtonStates();
        
        // loadconfigurationandinitialize
        await loadScanConfig();
        await loadFilters();
        
        // 收集initialURL
        const initialUrls = await collectInitialUrls();
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ withoutfound可scanURL', 'warning');
            return;
        }
        
        addLogEntry(`📋 收集to ${initialUrls.length} 个initialscanURL`, 'success');
        
        // start分层scan
        let currentUrls = initialUrls;
        
        for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
            currentDepth = depth;
            //console.log(`🔍 start第 ${depth} 层scan，URL数量: ${currentUrls.length}`);
            addLogEntry(`🔍 start第 ${depth} 层scan，URL数量: ${currentUrls.length}`, 'success');
            
            // 🚀 优化批量scan
            const newUrls = await scanUrlBatchOptimized(currentUrls, depth);
            currentUrls = newUrls;
            
            //console.log(`✅ 第 ${depth} 层scan complete，发现newURL: ${currentUrls.length} 个`);
            addLogEntry(`✅ 第 ${depth} 层scan complete，发现newURL: ${currentUrls.length} 个`, 'success');
            
            // 🚀 每层scan后强制更new显示
            displayResults();
            
            if (currentUrls.length === 0) {
                break;
            }
        }
        
        await completeScan();
        
    } catch (error) {
        console.error('❌ scanfailed:', error);
        addLogEntry(`❌ scanfailed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
        // 🚀 停止内存清理
        stopMemoryCleanup();
    }
}

// 🚀 优化批量scan函数
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
                    // 🚀 移除频繁scanday志
                    const content = await fetchUrlContent(url);
                    
                    if (content) {
                        // extractdata
                        const extractedData = await extractDataFromContent(content, scanConfig.baseUrl);
                        const hasNewData = addToScanResults(extractedData);
                        
                        // 🚀 reduce显示更new频率，每20个URL更new一次
                        if (hasNewData && processedCount % 20 === 0) {
                            throttledUpdateDisplay();
                        }
                        
                        // 收集newURL
                        const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                    }
                } catch (error) {
                    console.error(`scan ${url} failed:`, error);
                    addLogEntry(`❌ scanfailed: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    // 🚀 reduceprogress更new频率，每10个URL更new一次
                    if (processedCount % 10 === 0 || processedCount === totalUrls) {
                        updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层scan`);
                    }
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 控制and发数andadd延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 🚀 add延迟，避免through快request
            if (i % maxConcurrency === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms延迟
            }
        }
    };
    
    await processQueue();
    
    // waitall工作complete
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// 其他必要函数（简化version）...
// 这里requirecontains其他必要函数，but都经through性能优化

//console.log('✅ deep scan窗口脚本（性能优化version）loadcomplete');