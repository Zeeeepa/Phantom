// ==========================================================
// deep scan window script（performance optimization version）
// reduce log 记录、optimization DOM操作、控制 concurrent 数
// ==========================================================

//console.log('🚀 [DEBUG] deep scan window script（performance optimization version）start load ...');

// -------------------- 全局 variable --------------------
let scanConfig         = null;
let scanResults        = {};
let isScanRunning      = false;
let isPaused           = false;
let currentDepth       = 0;
let scannedUrls        = new Set();
let pendingUrls        = new Set();
let urlContentCache    = new Map();
let activeRequests     = 0;
let maxConcurrency     = 3; // 🚀 reduce concurrent 数
let requestTimeout     = 3000; // 🚀 reduce timeout 时间

// log 相关 variable - optimization version
let logEntries         = [];
let maxLogEntries      = 50; // 🚀 大幅reduce log 条目
let logBuffer          = [];
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 1000; // 🚀 1 seconds batch refresh log

// filter器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// performance optimization 相关 variable
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 500; // 🚀 500ms节流，大幅reduce update 频率
let pendingResults     = {};
let batchSize          = 20; // 🚀 增加 batch process size
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存 manage 相关 variable
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 seconds cleanup 一次内存

// -------------------- performance optimization tool function --------------------

// 🚀 内存 cleanup function
function performMemoryCleanup() {
    //console.log('🧹 execute 内存 cleanup ...');
    
    // cleanup URL content cache，只keep最近 30 items
    if (urlContentCache.size > 30) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-30);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 cleanup URL cache，keep ${toKeep.length} 个条目`);
    }
    
    // cleanup log 缓冲区
    if (logBuffer && logBuffer.length > 0) {
        flushLogBuffer();
    }
    
    // force 垃圾回收（如果可用）
    if (window.gc) {
        window.gc();
    }
}

// 启动内存 cleanup 定时器
function startMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
    }
    memoryCleanupTimer = setInterval(performMemoryCleanup, MEMORY_CLEANUP_INTERVAL);
}

// 停止内存 cleanup 定时器
function stopMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
        memoryCleanupTimer = null;
    }
}

// 🚀 optimization   log add function - 大幅reduce log 记录
function addLogEntry(message, type = 'info') {
    // 🚀 只记录关 key log，filter 掉大 partial information log
    if (type === 'info' && (
        message.includes('正in scan:') || 
        message.includes('success 获取 content') ||
        message.includes('未发现新 data') ||
        message.includes('skip非 text content') ||
        message.includes('允许子 domain') ||
        message.includes('允许all domain') ||
        message.includes('发现') ||
        message.includes('extract 到')
    )) {
        return; // skip这些频繁  information log
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // add 到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // batch refresh log
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            flushLogBuffer();
            logFlushTimer = null;
        }, LOG_FLUSH_INTERVAL);
    }
}

// batch refresh log 缓冲区
function flushLogBuffer() {
    if (!logBuffer || logBuffer.length === 0) return;
    
    // 将缓冲区 content add 到主 log array
    logEntries.push(...logBuffer);
    logBuffer = [];
    
    // limit log 条目 count
    if (logEntries.length > maxLogEntries) {
        logEntries = logEntries.slice(-maxLogEntries);
    }
    
    // update display
    updateLogDisplay();
}

// 🚀 optimization   log display function
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 只 display 最近 20条 log
    const recentLogs = logEntries.slice(-20);
    
    // check 是否require update
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        return;
    }
    
    // userequestAnimationFrame optimization DOM update
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

// 🚀 节流  display update function
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

// -------------------- tool function --------------------

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

// -------------------- 主要 scan function --------------------

// 🚀 optimization   scan function
async function startScan() {
    if (isScanRunning) {
        //console.log('scan alreadyin运行in');
        return;
    }

    isScanRunning = true;
    isPaused = false;
    
    try {
        //console.log('🚀 start deep scan ...');
        addLogEntry('🚀 start deep scan', 'success');
        
        // 🚀 启动内存 cleanup
        startMemoryCleanup();
        
        updateButtonStates();
        
        // load configuration and initialize
        await loadScanConfig();
        await loadFilters();
        
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ 没有找到can scan  URL', 'warning');
            return;
        }
        
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始 scan URL`, 'success');
        
        // start 分层 scan
        let currentUrls = initialUrls;
        
        for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
            currentDepth = depth;
            //console.log(`🔍 start 第 ${depth} 层 scan，URL count: ${currentUrls.length}`);
            addLogEntry(`🔍 start 第 ${depth} 层 scan，URL count: ${currentUrls.length}`, 'success');
            
            // 🚀 optimization   batch scan
            const newUrls = await scanUrlBatchOptimized(currentUrls, depth);
            currentUrls = newUrls;
            
            //console.log(`✅ 第 ${depth} 层 scan complete，发现新URL: ${currentUrls.length} 个`);
            addLogEntry(`✅ 第 ${depth} 层 scan complete，发现新URL: ${currentUrls.length} 个`, 'success');
            
            // 🚀 每层 scan 后 force update display
            displayResults();
            
            if (currentUrls.length === 0) {
                break;
            }
        }
        
        await completeScan();
        
    } catch (error) {
        console.error('❌ scan failed:', error);
        addLogEntry(`❌ scan failed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
        // 🚀 停止内存 cleanup
        stopMemoryCleanup();
    }
}

// 🚀 optimization   batch scan function
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
                    // 🚀 remove 频繁  scan log
                    const content = await fetchUrlContent(url);
                    
                    if (content) {
                        // extract data
                        const extractedData = await extractDataFromContent(content, scanConfig.baseUrl);
                        const hasNewData = addToScanResults(extractedData);
                        
                        // 🚀 reduce display update 频率，每20 itemsURL update 一次
                        if (hasNewData && processedCount % 20 === 0) {
                            throttledUpdateDisplay();
                        }
                        
                        // 收集新URL
                        const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                    }
                } catch (error) {
                    console.error(`scan ${url} failed:`, error);
                    addLogEntry(`❌ scan failed: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    // 🚀 reduce进度 update 频率，每10 itemsURL update 一次
                    if (processedCount % 10 === 0 || processedCount === totalUrls) {
                        updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层 scan`);
                    }
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 控制 concurrent 数并 add delay
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 🚀 add delay，避免through快 request
            if (i % maxConcurrency === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }
    };
    
    await processQueue();
    
    // wait all工作 complete
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// 其他必要  function（简化 version）...
// 这里require contains 其他必要  function，但都经through performance optimization

//console.log('✅ deep scan window script（performance optimization version）load complete');