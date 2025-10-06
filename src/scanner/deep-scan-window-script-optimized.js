// ==========================================================
// deep scan script window（performance optimization version）
// log record 减少、optimization operation DOM、控制并发数
// ==========================================================

//console.log('🚀 [DEBUG] deep scan script window（performance optimization version）start load ...');

// -------------------- variable 全局 --------------------
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
let requestTimeout     = 3000; // 🚀 timeout when 减少间

// log variable related - optimization version
let logEntries         = [];
let maxLogEntries      = 50; // 🚀 log record(s) 大幅减少目
let logBuffer          = [];
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 1000; // 🚀 1 second refresh log batch

// selector instance
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// performance optimization variable related
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 500; // 🚀 500ms throttle，update 大幅减少频率
let pendingResults     = {};
let batchSize          = 20; // 🚀 process batch 增加大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 memory variable related 管理
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 seconds cleanup memory time(s) 一

// -------------------- performance optimization function 工具 --------------------

// 🚀 cleanup memory function
function performMemoryCleanup() {
    //console.log('🧹 cleanup memory execute ...');
    
    // URL cleanup content cache， item(s) of 只保留最近30
    if (urlContentCache.size > 30) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-30);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 URL cleanup cache，保留 ${toKeep.length}  item(s) record(s) 目`);
    }
    
    // cleanup log 缓冲区
    if (logBuffer && logBuffer.length > 0) {
        flushLogBuffer();
    }
    
    // force 垃圾回收（available if）
    if (window.gc) {
        window.gc();
    }
}

// cleanup memory when 启动定器
function startMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
    }
    memoryCleanupTimer = setInterval(performMemoryCleanup, MEMORY_CLEANUP_INTERVAL);
}

// cleanup stop memory when 定器
function stopMemoryCleanup() {
    if (memoryCleanupTimer) {
        clearInterval(memoryCleanupTimer);
        memoryCleanupTimer = null;
    }
}

// 🚀 add optimization log function of - log record 大幅减少
function addLogEntry(message, type = 'info') {
    // 🚀 log record off 只键，information filter log 掉大部分
    if (type === 'info' && (
        message.includes('scan 正在:') || 
        message.includes('success content get') ||
        message.includes('not found data 新') ||
        message.includes('skip content text 非') ||
        message.includes('subdomain 允许') ||
        message.includes('domain all 允许') ||
        message.includes('found') ||
        message.includes('extracted to')
    )) {
        return; // skip information log of 这些频繁
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // add to 缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // refresh log batch
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            flushLogBuffer();
            logFlushTimer = null;
        }, LOG_FLUSH_INTERVAL);
    }
}

// refresh log batch 缓冲区
function flushLogBuffer() {
    if (!logBuffer || logBuffer.length === 0) return;
    
    // add content log array to 将缓冲区主
    logEntries.push(...logBuffer);
    logBuffer = [];
    
    // quantity log limit record(s) 目
    if (logEntries.length > maxLogEntries) {
        logEntries = logEntries.slice(-maxLogEntries);
    }
    
    // update display
    updateLogDisplay();
}

// 🚀 optimization log function display of
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // log display record(s) of 只最近20
    const recentLogs = logEntries.slice(-20);
    
    // update check no yes 需要
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        return;
    }
    
    // update optimization use requestAnimationFrameDOM
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

// 🚀 update function throttle display of
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

// -------------------- function 工具 --------------------

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

// -------------------- scan function main --------------------

// 🚀 scan optimization function of
async function startScan() {
    if (isScanRunning) {
        //console.log('running scan 已在');
        return;
    }

    isScanRunning = true;
    isPaused = false;
    
    try {
        //console.log('🚀 deep scan start ...');
        addLogEntry('🚀 deep scan start', 'success');
        
        // 🚀 cleanup memory 启动
        startMemoryCleanup();
        
        updateButtonStates();
        
        // initialize configuration load and
        await loadScanConfig();
        await loadFilters();
        
        // URL collected 初始
        const initialUrls = await collectInitialUrls();
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ URL scan to of has 没找可', 'warning');
            return;
        }
        
        addLogEntry(`📋 collected to ${initialUrls.length} URL scan item(s) 初始`, 'success');
        
        // start scan layer(s) 分
        let currentUrls = initialUrls;
        
        for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
            currentDepth = depth;
            //console.log(`🔍 start # ${depth} scan layer(s)，URL quantity: ${currentUrls.length}`);
            addLogEntry(`🔍 start # ${depth} scan layer(s)，URL quantity: ${currentUrls.length}`, 'success');
            
            // 🚀 scan optimization batch of
            const newUrls = await scanUrlBatchOptimized(currentUrls, depth);
            currentUrls = newUrls;
            
            //console.log(`✅ # ${depth} scan complete layer(s)，URL found 新: ${currentUrls.length}  item(s)`);
            addLogEntry(`✅ # ${depth} scan complete layer(s)，URL found 新: ${currentUrls.length}  item(s)`, 'success');
            
            // 🚀 update scan force display layer(s) after 每
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
        // 🚀 cleanup stop memory
        stopMemoryCleanup();
    }
}

// 🚀 scan optimization function batch of
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
                    // 🚀 scan log remove of 频繁
                    const content = await fetchUrlContent(url);
                    
                    if (content) {
                        // data extracted
                        const extractedData = await extractDataFromContent(content, scanConfig.baseUrl);
                        const hasNewData = addToScanResults(extractedData);
                        
                        // 🚀 update display 减少频率，URL update item(s) time(s) 每20一
                        if (hasNewData && processedCount % 20 === 0) {
                            throttledUpdateDisplay();
                        }
                        
                        // URL collected 新
                        const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                    }
                } catch (error) {
                    console.error(`scan ${url} failed:`, error);
                    addLogEntry(`❌ scan failed: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    // 🚀 update 减少进度频率，URL update item(s) time(s) 每10一
                    if (processedCount % 10 === 0 || processedCount === totalUrls) {
                        updateProgressDisplay(processedCount, totalUrls, `# ${depth} scan layer(s)`);
                    }
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 add delay 控制并发数并
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // 🚀 add delay，request 避免过快
            if (i % maxConcurrency === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }
    };
    
    await processQueue();
    
    // complete waiting all work
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// function of 其他必要（version 简化）...
// contains function of 这里需要其他必要，performance optimization 但都经过

//console.log('✅ deep scan script window（performance optimization version）complete load');