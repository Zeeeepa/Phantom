// ==========================================================
// 深度Scan窗口Script（性能优化版本）
// 减少日志Record、优化DOM操作、控制And发数
// ==========================================================

//console.log('🚀 [DEBUG] 深度Scan窗口Script（性能优化版本）StartLoad...');

// -------------------- 全局Variable --------------------
let scanConfig         = null;
let scanResults        = {};
let isScanRunning      = false;
let isPaused           = false;
let currentDepth       = 0;
let scannedUrls        = new Set();
let pendingUrls        = new Set();
let urlContentCache    = new Map();
let activeRequests     = 0;
let maxConcurrency     = 3; // 🚀 减少And发数
let requestTimeout     = 3000; // 🚀 减少超时Time

// 日志RelatedVariable - 优化版本
let logEntries         = [];
let maxLogEntries      = 50; // 🚀 大幅减少日志条目
let logBuffer          = [];
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 1000; // 🚀 1秒Batch刷新日志

// Filter器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化RelatedVariable
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 500; // 🚀 500ms节流，大幅减少Update频率
let pendingResults     = {};
let batchSize          = 20; // 🚀 增加BatchProcess大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理RelatedVariable
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 secondsClean一次内存

// -------------------- 性能优化工具Function --------------------

// 🚀 内存CleanFunction
function performMemoryCleanup() {
    //console.log('🧹 Execute内存Clean...');
    
    // CleanURLContent缓存，Only保留最近的30个
    if (urlContentCache.size > 30) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-30);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 CleanURL缓存，保留 ${toKeep.length} 个条目`);
    }
    
    // Clean日志缓冲区
    if (logBuffer && logBuffer.length > 0) {
        flushLogBuffer();
    }
    
    // 强制垃圾回收（如果Available）
    if (window.gc) {
        window.gc();
    }
}

// Start内存Clean定时器
function startMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
    }
    memoryCleanupTimer = setInterval(performMemoryCleanup, MEMORY_CLEANUP_INTERVAL);
}

// 停止内存Clean定时器
function stopMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
        memoryCleanupTimer = null;
    }
}

// 🚀 优化的日志AddFunction - 大幅减少日志Record
function addLogEntry(message, type = 'info') {
    // 🚀 OnlyRecord关Key日志，Filter掉大部分Information日志
    if (type === 'info' && (
        message.includes('In progressScan:') || 
        message.includes('SuccessGetContent') ||
        message.includes('NotFound新Data') ||
        message.includes('跳过非文本Content') ||
        message.includes('允许子Domain') ||
        message.includes('允许所有Domain') ||
        message.includes('Found') ||
        message.includes('Extract到')
    )) {
        return; // 跳过This些频繁的Information日志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // Add到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // Batch刷新日志
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            flushLogBuffer();
            logFlushTimer = null;
        }, LOG_FLUSH_INTERVAL);
    }
}

// Batch刷新日志缓冲区
function flushLogBuffer() {
    if (!logBuffer || logBuffer.length === 0) return;
    
    // 将缓冲区ContentAdd到主日志数Group
    logEntries.push(...logBuffer);
    logBuffer = [];
    
    // 限制日志条目数量
    if (logEntries.length > maxLogEntries) {
        logEntries = logEntries.slice(-maxLogEntries);
    }
    
    // UpdateDisplay
    updateLogDisplay();
}

// 🚀 优化的日志DisplayFunction
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // OnlyDisplay最近的20条日志
    const recentLogs = logEntries.slice(-20);
    
    // Check是否NeedUpdate
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        return;
    }
    
    // 使用requestAnimationFrame优化DOMUpdate
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

// 🚀 节流的DisplayUpdateFunction
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

// -------------------- 工具Function --------------------

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

// -------------------- 主要ScanFunction --------------------

// 🚀 优化的ScanFunction
async function startScan() {
    if (isScanRunning) {
        //console.log('ScanAlready在运行中');
        return;
    }

    isScanRunning = true;
    isPaused = false;
    
    try {
        //console.log('🚀 Start深度Scan...');
        addLogEntry('🚀 Start深度Scan', 'success');
        
        // 🚀 Start内存Clean
        startMemoryCleanup();
        
        updateButtonStates();
        
        // LoadConfigurationAndInitialize
        await loadScanConfig();
        await loadFilters();
        
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ NoFound可Scan的URL', 'warning');
            return;
        }
        
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始ScanURL`, 'success');
        
        // Start分层Scan
        let currentUrls = initialUrls;
        
        for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
            currentDepth = depth;
            //console.log(`🔍 Start第 ${depth} 层Scan，URL数量: ${currentUrls.length}`);
            addLogEntry(`🔍 Start第 ${depth} 层Scan，URL数量: ${currentUrls.length}`, 'success');
            
            // 🚀 优化的BatchScan
            const newUrls = await scanUrlBatchOptimized(currentUrls, depth);
            currentUrls = newUrls;
            
            //console.log(`✅ 第 ${depth} 层Scan completed，Found新URL: ${currentUrls.length} 个`);
            addLogEntry(`✅ 第 ${depth} 层Scan completed，Found新URL: ${currentUrls.length} 个`, 'success');
            
            // 🚀 Every层ScanAfter强制UpdateDisplay
            displayResults();
            
            if (currentUrls.length === 0) {
                break;
            }
        }
        
        await completeScan();
        
    } catch (error) {
        console.error('❌ ScanFailed:', error);
        addLogEntry(`❌ ScanFailed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
        // 🚀 停止内存Clean
        stopMemoryCleanup();
    }
}

// 🚀 优化的BatchScanFunction
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
                    // 🚀 Remove频繁的Scan日志
                    const content = await fetchUrlContent(url);
                    
                    if (content) {
                        // ExtractData
                        const extractedData = await extractDataFromContent(content, scanConfig.baseUrl);
                        const hasNewData = addToScanResults(extractedData);
                        
                        // 🚀 减少DisplayUpdate频率，Every20个URLUpdate一次
                        if (hasNewData && processedCount % 20 === 0) {
                            throttledUpdateDisplay();
                        }
                        
                        // 收集新URL
                        const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                    }
                } catch (error) {
                    console.error(`Scan ${url} Failed:`, error);
                    addLogEntry(`❌ ScanFailed: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    // 🚀 减少进度Update频率，Every10个URLUpdate一次
                    if (processedCount % 10 === 0 || processedCount === totalUrls) {
                        updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层Scan`);
                    }
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 控制And发数AndAdd延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 🚀 Add延迟，避免过快Request
            if (i % maxConcurrency === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }
    };
    
    await processQueue();
    
    // 等Pending所有工作Complete
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// 其他必要的Function（简化版本）...
// HereNeed包含其他必要的Function，但都经过性能优化

//console.log('✅ 深度Scan窗口Script（性能优化版本）Loading complete');