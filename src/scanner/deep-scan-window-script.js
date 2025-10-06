// ==========================================================
// deep scan window script（unified regex version）
// all regex unified通through SettingsManager 获取，无任何硬编码
// ==========================================================

//console.log('🚀 [DEBUG] deep scan window script（unified regex version）start load ...');

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
let maxConcurrency     = 4; // default value，会from extension settings inread
let requestTimeout     = 3000; // default value，会from extension settings inread

// log 相关 variable - optimization version
let logEntries         = [];
let maxLogEntries      = 100; // reduce到100条，避免内存占用
let logBuffer          = []; // log 缓冲区
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 500; // 500ms batch refresh log

// filter器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// performance optimization 相关 variable
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 300; // 🚀 增加到300ms节流，reduce update 频率
let pendingResults     = {};
let batchSize          = 15; // 🚀 增加 batch process size
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存 manage 相关 variable
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 seconds cleanup 一次内存

// -------------------- performance optimization tool function --------------------

// 🚀 内存 cleanup function
function performMemoryCleanup() {
    //console.log('🧹 execute 内存 cleanup ...');
    
    // cleanup URL content cache，只keep最近 50 items
    if (urlContentCache.size > 50) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-50);
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

// -------------------- unifiedfilter器 load --------------------
async function loadFilters() {
    //console.log('🔍 [DEBUG] start load unifiedfilter器...');

    try {
        // load SettingsManager（必须）
        if (typeof window.SettingsManager === 'undefined') {
            await loadScript('src/utils/SettingsManager.js');
        }

        // load PatternExtractor（必须）
        if (typeof window.PatternExtractor === 'undefined') {
            await loadScript('src/scanner/PatternExtractor.js');
        }

        // wait script 解析
        await new Promise(r => setTimeout(r, 100));

        // 实例化
        if (typeof window.PatternExtractor === 'undefined') {
            throw new Error('PatternExtractor not load success');
        }
        patternExtractor = new window.PatternExtractor();

        // force load custom regex
        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
            patternExtractor.ensureCustomPatternsLoaded();
        }

        // listen settings 页 regex update
        window.addEventListener('regexConfigUpdated', (e) => {
            //console.log('🔄 [DEBUG] received regex configuration update event');
            if (patternExtractor?.updatePatterns) {
                patternExtractor.updatePatterns(e.detail);
            } else if (patternExtractor?.loadCustomPatterns) {
                patternExtractor.loadCustomPatterns(e.detail);
            }
        });

        filtersLoaded = true;
        //console.log('✅ [DEBUG] unifiedfilter器 load 完毕');
    } catch (err) {
        console.error('❌ [DEBUG] filter器 load failed:', err);
        filtersLoaded = false;
    }
}

// -------------------- unified content extract --------------------
async function extractFromContent(content, sourceUrl = 'unknown') {
    //console.log('🔍 [DEBUG] start unified content extract ...');

    if (!patternExtractor || typeof patternExtractor.extractPatterns !== 'function') {
        throw new Error('PatternExtractor.extractPatterns do not可用');
    }

    // 确保 configuration already load
    if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
        await patternExtractor.ensureCustomPatternsLoaded();
    }

    // useunified入口 extract
    const results = await patternExtractor.extractPatterns(content, sourceUrl);

    // 🔥 fix：use IndexedDB data 进行智能相对 path 解析
    await enhanceRelativePathsWithIndexedDB(results, sourceUrl);

    return results;
}

// -------------------- 智能相对 path 解析 --------------------
async function enhanceRelativePathsWithIndexedDB(results, currentSourceUrl) {
    console.log('🔍 [DEBUG] start 智能相对 path 解析，current 源URL:', currentSourceUrl);
    
    if (!results.relativeApis || results.relativeApis.length === 0) {
        console.log('⚠️ 没有相对 path APIrequire解析');
        return;
    }
    
    try {
        // 🔥 fix：严格按照IndexedDB data 获取 extract 来源 path
        const baseUrl = scanConfig?.baseUrl || window.location.origin;
        console.log('🔍 [DEBUG] basicURL:', baseUrl);
        
        // 获取all scan result data，package 括 deep scan result
        let allScanData = [];
        
        // method 1：尝试获取 current domain   scan result
        try {
            const currentScanData = await window.IndexedDBManager.loadScanResults(baseUrl);
            if (currentScanData && currentScanData.results) {
                allScanData.push(currentScanData);
                console.log('✅ [DEBUG] 获取到 current domain scan result');
            }
        } catch (e) {
            console.warn('⚠️ 获取 current domain scan result failed:', e);
        }
        
        // method 2：获取all scan result 作to备选
        try {
            const allResults = await window.IndexedDBManager.getAllScanResults();
            if (allResults && Array.isArray(allResults)) {
                allScanData = allScanData.concat(allResults);
                console.log('✅ [DEBUG] 获取到all scan result，共', allResults.length, '个');
            }
        } catch (e) {
            console.warn('⚠️ 获取all scan result failed:', e);
        }
        
        if (allScanData.length === 0) {
            console.log('⚠️ 未找到任何 IndexedDB data，use传统拼接方式');
            return;
        }
        
        // 🔥 fix：严格按照IndexedDBin每个 data 项 sourceUrl进行 path 解析
        const sourceUrlToBasePath = new Map();
        const itemToSourceUrlMap = new Map(); // 新增：建立 data 项到sourceUrl  map
        
        console.log('🔍 [DEBUG] start analysis IndexedDB data，共', allScanData.length, '个 data 源');
        
        // 遍历all scan data，建立complete  map 关system
        allScanData.forEach((scanData, dataIndex) => {
            if (!scanData.results) return;
            
            console.log(`🔍 [DEBUG] analysis data 源 ${dataIndex + 1}:`, {
                url: scanData.url,
                sourceUrl: scanData.sourceUrl,
                domain: scanData.domain,
                pageTitle: scanData.pageTitle
            });
            
            // 遍历all type   data
            Object.entries(scanData.results).forEach(([category, items]) => {
                if (!Array.isArray(items)) return;
                
                items.forEach(item => {
                    if (typeof item === 'object' && item !== null && item.sourceUrl) {
                        // 🔥 关 key fix：use data 项自己 sourceUrl
                        const itemSourceUrl = item.sourceUrl;
                        const itemValue = item.value || item.text || item.content;
                        
                        if (itemValue && itemSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(itemSourceUrl);
                                // extract basic path（去掉 file 名）
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(itemSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(itemValue, itemSourceUrl);
                                
                                console.log(`📋 [DEBUG] map 建立: "${itemValue}" -> "${itemSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ invalid  sourceUrl:', itemSourceUrl, e);
                            }
                        }
                    } else if (typeof item === 'string') {
                        // 对于 string format   data，use scan result  sourceUrl
                        const fallbackSourceUrl = scanData.sourceUrl || scanData.url;
                        if (fallbackSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(fallbackSourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(fallbackSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(item, fallbackSourceUrl);
                                
                                console.log(`📋 [DEBUG] 备选 map: "${item}" -> "${fallbackSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ invalid  备选sourceUrl:', fallbackSourceUrl, e);
                            }
                        }
                    }
                });
            });
        });
        
        console.log('📊 [DEBUG] map 建立 complete:', {
            sourceUrlToBasePath: sourceUrlToBasePath.size,
            itemToSourceUrlMap: itemToSourceUrlMap.size
        });
        
        // 🔥 fix：严格按照每个相对 path API 来源进行解析
        const enhancedRelativeApis = [];
        
        for (const apiItem of results.relativeApis) {
            const apiValue = typeof apiItem === 'object' ? apiItem.value : apiItem;
            let apiSourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : currentSourceUrl;
            
            console.log(`🔍 [DEBUG] process 相对 path API: "${apiValue}", 源URL: "${apiSourceUrl}"`);
            
            let resolvedUrl = null;
            let usedSourceUrl = null;
            
            // 🔥 method 1：严格按照 data 项 sourceUrl进行解析
            if (itemToSourceUrlMap.has(apiValue)) {
                const exactSourceUrl = itemToSourceUrlMap.get(apiValue);
                if (sourceUrlToBasePath.has(exactSourceUrl)) {
                    const basePath = sourceUrlToBasePath.get(exactSourceUrl);
                    resolvedUrl = resolveRelativePath(apiValue, basePath);
                    usedSourceUrl = exactSourceUrl;
                    console.log('✅ [精确 match] 找到 data 项 确切来源:', apiValue, '->', resolvedUrl, '(源:', exactSourceUrl, ')');
                }
            }
            
            // 🔥 method 2：如果精确 match failed，useAPI项目自带 sourceUrl
            if (!resolvedUrl && apiSourceUrl && sourceUrlToBasePath.has(apiSourceUrl)) {
                const basePath = sourceUrlToBasePath.get(apiSourceUrl);
                resolvedUrl = resolveRelativePath(apiValue, basePath);
                usedSourceUrl = apiSourceUrl;
                console.log('✅ [directly match] useAPI项目 sourceUrl:', apiValue, '->', resolvedUrl, '(源:', apiSourceUrl, ')');
            }
            
            // 🔥 method 3：如果还是 failed，尝试查找相似 源URL（domain match）
            if (!resolvedUrl && sourceUrlToBasePath.size > 0) {
                const targetDomain = baseUrl ? new URL(baseUrl).hostname : null;
                
                for (const [sourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                    try {
                        const sourceDomain = new URL(sourceUrl).hostname;
                        if (targetDomain && sourceDomain === targetDomain) {
                            const testUrl = resolveRelativePath(apiValue, basePath);
                            if (testUrl) {
                                resolvedUrl = testUrl;
                                usedSourceUrl = sourceUrl;
                                console.log('✅ [domain match] 找到同 domain  源URL:', apiValue, '->', resolvedUrl, '(源:', sourceUrl, ')');
                                break;
                            }
                        }
                    } catch (e) {
                        // 忽略 invalid URL
                    }
                }
            }
            
            // 🔥 method 4：最后 备选方案，usebasicURL拼接
            if (!resolvedUrl) {
                try {
                    if (apiValue.startsWith('./')) {
                        resolvedUrl = baseUrl + apiValue.substring(1); // 去掉.，keep/
                    } else if (apiValue.startsWith('../')) {
                        // simple process 上级目录
                        const upLevels = (apiValue.match(/\.\.\//g) || []).length;
                        const remainingPath = apiValue.replace(/\.\.\//g, '');
                        const baseUrlObj = new URL(baseUrl);
                        const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                        
                        // 向上移动指定层级
                        for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                            pathParts.pop();
                        }
                        
                        resolvedUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                    } else if (!apiValue.startsWith('/') && !apiValue.startsWith('http')) {
                        resolvedUrl = baseUrl + '/' + apiValue;
                    } else {
                        resolvedUrl = apiValue;
                    }
                    
                    // cleanup 多余 斜杠
                    resolvedUrl = resolvedUrl.replace(/\/+/g, '/').replace(':/', '://');
                    usedSourceUrl = baseUrl;
                    
                    console.log('🔄 [备选解析] usebasicURL拼接:', apiValue, '->', resolvedUrl);
                } catch (e) {
                    resolvedUrl = apiValue; // 保持原 value
                    usedSourceUrl = currentSourceUrl;
                    console.warn('⚠️ [解析 failed] 保持原 value:', apiValue, e.message);
                }
            }
            
            // 保持原始 format，add 解析后  URL and实际use 源URL
            if (typeof apiItem === 'object') {
                enhancedRelativeApis.push({
                    ...apiItem,
                    resolvedUrl: resolvedUrl,
                    actualSourceUrl: usedSourceUrl || apiItem.sourceUrl // 记录实际use 源URL
                });
            } else {
                enhancedRelativeApis.push({
                    value: apiItem,
                    sourceUrl: usedSourceUrl || currentSourceUrl,
                    resolvedUrl: resolvedUrl,
                    actualSourceUrl: usedSourceUrl
                });
            }
        }
        
        // update result
        results.relativeApis = enhancedRelativeApis;
        
        console.log('✅ [智能解析] 相对 path 解析 complete，process 了', enhancedRelativeApis.length, '个相对 path');
        console.log('📊 [智能解析] 解析 statistics:', {
            总数: enhancedRelativeApis.length,
            成功解析: enhancedRelativeApis.filter(item => item.resolvedUrl && item.resolvedUrl !== item.value).length,
            使用IndexedDB数据: enhancedRelativeApis.filter(item => item.actualSourceUrl && item.actualSourceUrl !== currentSourceUrl).length
        });
        
    } catch (error) {
        console.error('❌ 智能相对 path 解析 failed:', error);
        // 出错时保持原始 data do not变
    }
}

// 辅助 function：解析相对 path
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) {
            console.warn('⚠️ 相对 path 解析 parameter invalid:', { relativePath, basePath });
            return null;
        }
        
        console.log(`🔧 [解析] start 解析相对 path: "${relativePath}" 基于 "${basePath}"`);
        
        // 确保basePath以/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        let resolvedPath;
        
        if (relativePath.startsWith('./')) {
            // current 目录：./file.js -> basePath + file.js
            resolvedPath = basePath + relativePath.substring(2);
            console.log(`🔧 [解析] current 目录解析: "${relativePath}" -> "${resolvedPath}"`);
        } else if (relativePath.startsWith('../')) {
            // 上级目录：../file.js -> require process path 层级
            const upLevels = (relativePath.match(/\.\.\//g) || []).length;
            const remainingPath = relativePath.replace(/\.\.\//g, '');
            
            console.log(`🔧 [解析] 上级目录解析: 向上${upLevels}级, 剩余 path: "${remainingPath}"`);
            
            try {
                const baseUrlObj = new URL(basePath);
                const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                
                console.log(`🔧 [解析] basic path partial:`, pathParts);
                
                // 向上移动指定层级
                for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                    pathParts.pop();
                }
                
                console.log(`🔧 [解析] 向上移动后 path partial:`, pathParts);
                
                resolvedPath = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                console.log(`🔧 [解析] 上级目录最终解析: "${relativePath}" -> "${resolvedPath}"`);
            } catch (e) {
                console.warn('⚠️ 上级目录解析 failed，use simple method:', e);
                // simple process 方式
                const baseUrl = basePath.split('/').slice(0, 3).join('/'); // protocol://host
                resolvedPath = baseUrl + '/' + remainingPath;
            }
        } else if (!relativePath.startsWith('/') && !relativePath.startsWith('http')) {
            // 相对 path：file.js -> basePath + file.js
            resolvedPath = basePath + relativePath;
            console.log(`🔧 [解析] 相对 path 解析: "${relativePath}" -> "${resolvedPath}"`);
        } else {
            // already经是绝对 path
            resolvedPath = relativePath;
            console.log(`🔧 [解析] already是绝对 path: "${relativePath}"`);
        }
        
        // cleanup 多余 斜杠
        const cleanedPath = resolvedPath.replace(/\/+/g, '/').replace(':/', '://');
        
        if (cleanedPath !== resolvedPath) {
            console.log(`🔧 [解析] path cleanup: "${resolvedPath}" -> "${cleanedPath}"`);
        }
        
        console.log(`✅ [解析] 相对 path 解析 complete: "${relativePath}" -> "${cleanedPath}"`);
        return cleanedPath;
        
    } catch (error) {
        console.warn('❌ 相对 path 解析 failed:', error, { relativePath, basePath });
        return null;
    }
}

// -------------------- 传统 result process（备用） --------------------
function convertRelativeApisToAbsolute(results) {
    // 🔥 fix：完全 remove automatic convert逻辑，保持绝对 path APIand相对 path API 独立性
    // do not再将相对 path API automatic convert并 add 到绝对 path APIin
    // 这样可以避免意外 add do not符合绝对 path API regex 要求  data
    
    //console.log('🔍 [DEBUG] APIconvert complete（already disable automatic convert）:');
    //console.log('  - keep 相对 path API:', results.relativeApis?.length || 0, '个');
    //console.log('  - keep 绝对 path API:', results.absoluteApis?.length || 0, '个');
    
    // 如果requireconvert feature，应该inPatternExtractorin通through regular expression 来实现
    // 而do not是in这里进行 force convert
}

// -------------------- performance optimization function --------------------
// 节流 update display
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        // 如果距离上次 update 时间太短，delay update
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

// execute display update
function performDisplayUpdate() {
    if (isUpdating) return;
    
    isUpdating = true;
    lastUpdateTime = Date.now();
    displayUpdateCount++;
    
    try {
        // use requestAnimationFrame 确保in下一帧 update
        requestAnimationFrame(() => {
            updateResultsDisplay();
            updateStatusDisplay();
            isUpdating = false;
        });
    } catch (error) {
        console.error('display update failed:', error);
        isUpdating = false;
    }
}

// batch process result 合并
function batchMergeResults(newResults) {
    let hasNewData = false;
    
    // 将新 result add 到待 process queue
    Object.keys(newResults).forEach(key => {
        if (!pendingResults[key]) {
            pendingResults[key] = new Map(); // useMap来 storage object，以valueto key 避免重复
        }
        
        if (Array.isArray(newResults[key])) {
            newResults[key].forEach(item => {
                if (item) {
                    // process 结构化 object（带sourceUrl）and simple string
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
    
    // 如果有新 data，触发节流 update
    if (hasNewData) {
        throttledUpdateDisplay();
    }
    
    return hasNewData;
}

// 将待 process result 合并到主 result in
function flushPendingResults() {
    Object.keys(pendingResults).forEach(key => {
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        // 创建现有 result   key set，for去重
        const existingKeys = new Set();
        scanResults[key].forEach(item => {
            const itemKey = typeof item === 'object' ? item.value : item;
            existingKeys.add(itemKey);
        });
        
        // add 新  result 项
        pendingResults[key].forEach((itemData, itemKey) => {
            if (!existingKeys.has(itemKey)) {
                scanResults[key].push(itemData);
            }
        });
        
        // clear 待 process queue
        pendingResults[key].clear();
    });
}

// -------------------- page initialize --------------------
async function initializePage() {
    //console.log('🔍 [DEBUG] page initialize in...');

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ Chrome extension APIdo not可用');
        return;
    }

    await loadFilters();

    try {
        // 获取baseUrl（from scan configuration in baseUrlor current window  opener）
        let baseUrl = '';
        if (window.opener) {
            try {
                // 尝试fromopener window 获取URL
                baseUrl = window.opener.location.origin;
            } catch (e) {
                // 如果跨域访问 failed，use default 方式
                console.warn('无法fromopener获取URL，use default 方式');
            }
        }
        
        // fromIndexedDB load deep scan configuration
        let deepScanConfig = null;
        if (baseUrl) {
            deepScanConfig = await window.IndexedDBManager.loadDeepScanState(baseUrl);
        }
        
        // 如果没有找到 configuration，尝试获取all可用  configuration
        if (!deepScanConfig) {
            console.warn('⚠️ 未找到指定URL  scan configuration，尝试获取all可用 configuration ...');
            const allConfigs = await window.IndexedDBManager.getAllDeepScanStates();
            if (allConfigs && allConfigs.length > 0) {
                // use最新  configuration
                deepScanConfig = allConfigs[allConfigs.length - 1];
                console.log('✅ 找到可用 configuration:', deepScanConfig.baseUrl);
            }
        }
        
        if (!deepScanConfig) throw new Error('未找到 scan configuration');
        scanConfig = deepScanConfig;

        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout  = (scanConfig.timeout * 1000) || 5000;

        updateConfigDisplay();
        initializeScanResults();
    } catch (err) {
        console.error('❌ initialize failed:', err);
    }

    // 绑定 button event
    document.getElementById('startBtn')?.addEventListener('click', startScan);
    document.getElementById('pauseBtn')?.addEventListener('click', pauseScan);
    document.getElementById('stopBtn')?.addEventListener('click', stopScan);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('toggleAllBtn')?.addEventListener('click', toggleAllCategories);
    
    // 🚀 add 滚动 optimization：检测 user 是否in滚动
    const logSection = document.getElementById('logSection');
    if (logSection) {
        let scrollTimeout;
        logSection.addEventListener('scroll', () => {
            logSection.isUserScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                logSection.isUserScrolling = false;
            }, 1000); // 1 seconds后认to user 停止滚动
        });
        
        // 🚀 optimization 滚动 performance
        logSection.style.willChange = 'scroll-position';
        logSection.style.transform = 'translateZ(0)'; // enable 硬件加速
    }

    // listen extension message
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
        if (msg.action === 'stopDeepScan') {
            stopScan();
            reply({ success: true });
        }
    });

    // automatic start
    setTimeout(startScan, 1000);
}

// -------------------- configuration display --------------------
function updateConfigDisplay() {
    if (!scanConfig) return;

    document.getElementById('maxDepthDisplay').textContent = scanConfig.maxDepth || 2;
    document.getElementById('concurrencyDisplay').textContent = scanConfig.concurrency || 8;
    document.getElementById('timeoutDisplay').textContent = scanConfig.timeout || 5;
    
    const scanTypes = [];
    if (scanConfig.scanJsFiles) scanTypes.push('JS file');
    if (scanConfig.scanHtmlFiles) scanTypes.push('HTML page');
    if (scanConfig.scanApiFiles) scanTypes.push('API interface');
    
    document.getElementById('scanTypesDisplay').textContent = scanTypes.join(', ') || 'all';
    document.getElementById('scanInfo').textContent = `目标: ${scanConfig.baseUrl}`;
}

// -------------------- scan result initialize --------------------
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

// -------------------- scan 控制 --------------------
async function startScan() {
    if (isScanRunning) return;
    
    //console.log('🚀 [DEBUG] start deep scan ...');
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    
    // update UI status
    updateButtonStates();
    updateStatusDisplay();
    
    // hide load prompt
    document.getElementById('loadingDiv').style.display = 'none';
    
    try {
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        //console.log(`📋 [DEBUG] 收集到 ${initialUrls.length} 个初始URL`);
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始 scan URL`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ 没有找到can scan  URL', 'warning');
            return;
        }
        
        // 🔥 记录初始URL list（before几个）
        if (initialUrls.length > 0) {
            const urlsToShow = initialUrls.slice(0, 5);
            addLogEntry(`🎯 初始 scan 目标: ${urlsToShow.join(', ')}${initialUrls.length > 5 ? ` 等${initialUrls.length}个URL` : ''}`, 'info');
        }
        
        // 记录 scan configuration
        addLogEntry(`⚙️ scan configuration - maximum 深度: ${scanConfig.maxDepth}, concurrent 数: ${scanConfig.concurrency}, timeout: ${scanConfig.timeout}ms`, 'info');
        
        // start 分层 scan
        await performLayeredScan(initialUrls);
        
        // complete scan
        completeScan();
        
    } catch (error) {
        console.error('❌ scan failed:', error);
        addLogEntry(`❌ scan failed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
    }
}

function pauseScan() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '继续 scan' : '暂停 scan';
    
    if (isPaused) {
        addLogEntry('⏸️ scan already暂停', 'warning');
        addLogEntry(`📊 暂停时 status: already scan ${scannedUrls.size} itemsURL，current深度${currentDepth}`, 'info');
    } else {
        addLogEntry('▶️ scan already继续', 'success');
    }
}

function stopScan() {
    isScanRunning = false;
    isPaused = false;
    addLogEntry('⏹️ user manual 停止 scan', 'warning');
    addLogEntry(`📊 停止时 status: already scan ${scannedUrls.size} itemsURL，current深度${currentDepth}`, 'info');
    updateButtonStates();
    completeScan();
}

// -------------------- 初始URL收集 --------------------
async function collectInitialUrls() {
    //console.log('📋 [DEBUG] start 收集初始URL - from普通 scan result in获取');
    
    const urls = new Set();
    
    try {
        // from deep scan configuration in获取普通 scan   result
        if (!scanConfig.initialResults) {
            console.warn('⚠️ deep scan configuration in未找到普通 scan result，将 scan current page');
            urls.add(scanConfig.baseUrl);
            return Array.from(urls);
        }
        
        const initialResults = scanConfig.initialResults;
        //console.log('📊 [DEBUG] 找到普通 scan result:', Object.keys(initialResults));
        console.log('📊 [DEBUG] 普通 scan result statistics:', {
            absoluteApis: initialResults.absoluteApis?.length || 0,
            jsFiles: initialResults.jsFiles?.length || 0,
            urls: initialResults.urls?.length || 0,
            domains: initialResults.domains?.length || 0,
            emails: initialResults.emails?.length || 0
        });
        
        // 将普通 scan result 作to deep scan  起始 result
        Object.keys(initialResults).forEach(key => {
            if (scanResults[key] && Array.isArray(initialResults[key])) {
                scanResults[key] = [...initialResults[key]];
            }
        });
        
        // from普通 scan result in收集JS file 进行 deep scan
        if (scanConfig.scanJsFiles && initialResults.jsFiles) {
            //console.log(`📁 [DEBUG] from普通 scan result 收集JS file: ${initialResults.jsFiles.length} 个`);
            for (const jsFile of initialResults.jsFiles) {
                // 兼容新 format（object）and旧 format（string）
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] add JS file: ${fullUrl}`);
                }
            }
        }
        
        // from普通 scan result in收集HTML page 进行 deep scan
        if (scanConfig.scanHtmlFiles && initialResults.urls) {
            //console.log(`🌐 [DEBUG] from普通 scan result 收集URL: ${initialResults.urls.length} 个`);
            for (const urlItem of initialResults.urls) {
                // 兼容新 format（object）and旧 format（string）
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] add page URL: ${fullUrl}`);
                }
            }
        }
        
        // from普通 scan result in收集API interface 进行 deep scan
        if (scanConfig.scanApiFiles) {
            // 绝对 path API
            if (initialResults.absoluteApis) {
                //console.log(`🔗 [DEBUG] from普通 scan result 收集绝对API: ${initialResults.absoluteApis.length} 个`);
                for (const apiItem of initialResults.absoluteApis) {
                    // 兼容新 format（object）and旧 format（string）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] add 绝对API: ${fullUrl}`);
                    }
                }
            }
            
            // 相对 path API
            if (initialResults.relativeApis) {
                //console.log(`🔗 [DEBUG] from普通 scan result 收集相对API: ${initialResults.relativeApis.length} 个`);
                for (const apiItem of initialResults.relativeApis) {
                    // 兼容新 format（object）and旧 format（string）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] add 相对API: ${fullUrl}`);
                    }
                }
            }
        }
        
        // 如果没有收集到任何URL，add current page 作to备用
        if (urls.size === 0) {
            console.warn('⚠️ from普通 scan result in未收集到任何URL，add current page');
            urls.add(scanConfig.baseUrl);
        }
        
        //console.log(`📊 [DEBUG] 初始URL收集 complete，共收集到 ${urls.size} 个URL`);
        //console.log(`📊 [DEBUG] 初始 result count: ${Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
        return Array.from(urls);
        
    } catch (error) {
        console.error('❌ 收集初始URL failed:', error);
        // 出错时 add current page 作to备用
        urls.add(scanConfig.baseUrl);
        return Array.from(urls);
    }
}

// -------------------- 分层 scan --------------------
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        
        if (currentUrls.length === 0) {
            //console.log(`第 ${depth} 层没有URLrequire scan`);
            break;
        }
        
        //console.log(`🔍 start 第 ${depth} 层 scan，URL count: ${currentUrls.length}`);
        addLogEntry(`🔍 start 第 ${depth} 层 scan，URL count: ${currentUrls.length}`, 'info');
        
        // 🔥 记录 current 层要 scan  URL list（before几个）
        if (currentUrls.length > 0) {
            const urlsToShow = currentUrls.slice(0, 3);
            addLogEntry(`📋 第 ${depth} 层 scan 目标: ${urlsToShow.join(', ')}${currentUrls.length > 3 ? ` 等${currentUrls.length}个URL` : ''}`, 'info');
        }
        
        // batch scan URL
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        // 准备下一层URL
        currentUrls = newUrls.filter(url => !scannedUrls.has(url));
        
        //console.log(`✅ 第 ${depth} 层 scan complete，发现新URL: ${currentUrls.length} 个`);
        addLogEntry(`✅ 第 ${depth} 层 scan complete，发现新URL: ${currentUrls.length} 个`, 'success');
        
        // 🔥 记录下一层将要 scan  URL count
        if (currentUrls.length > 0 && depth < scanConfig.maxDepth) {
            addLogEntry(`🔄 准备第 ${depth + 1} 层 scan，待 scan URL: ${currentUrls.length} 个`, 'info');
        }
        
        // update display
        updateResultsDisplay();
        updateStatusDisplay();
    }
}

// -------------------- batch URL scan --------------------
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    // use queue and concurrent 控制
    const queue = [...urls];
    const activeWorkers = new Set();
    
    // 实时 display 计数器
    let lastDisplayUpdate = 0;
    const displayUpdateInterval = 500; // 每0.5 seconds最多 update 一次 display，提高 response 速度
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层 scan`);
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // 获取URL content
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
                            // 🚀 performance optimization：remove 频繁  scan log
                            // addLogEntry(`🔍 正in scan: ${url}`, 'info');
                            
                            // extract information
                            const extractedData = await extractFromContent(content, url);
                            const hasNewData = mergeResults(extractedData);
                            
                            // 🔥 记录 extract result log
                            if (hasNewData) {
                                const newDataCount = Object.values(extractedData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                                addLogEntry(`✅ from ${url} extract 到 ${newDataCount} 个新 data 项`, 'success');
                            } else {
                                addLogEntry(`ℹ️ from ${url} 未发现新 data`, 'info');
                            }
                            
                            // 🚀 performance optimization：reduce display update 频率，只in batch process 时 update
                            if (hasNewData) {
                                // 每 process 10 itemsURL才 update 一次 display
                                if (processedCount % 10 === 0) {
                                    throttledUpdateDisplay();
                                }
                            }
                            
                            // 收集新URL
                            const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                            if (discoveredUrls.length > 0) {
                                addLogEntry(`🔗 from ${url} 发现 ${discoveredUrls.length} 个新URL`, 'info');
                            }
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        } else {
                            // 🔥 记录无 content  情况
                            addLogEntry(`⚠️ ${url} 返回 empty content or无法访问`, 'warning');
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                        // 🔥 add error log 记录
                        addLogEntry(`❌ scan failed: ${url} - ${error.message}`, 'error');
                    } finally {
                        processedCount++;
                        // 🚀 performance optimization：reduce进度 update 频率，每5 itemsURL update 一次
                        if (processedCount % 5 === 0 || processedCount === totalUrls) {
                            updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层 scan`);
                        }
                        activeWorkers.delete(workerPromise);
                    }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 performance optimization：控制 concurrent 数并 add delay
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // add delay，避免through快 request 导致 system 卡顿
            if (activeWorkers.size >= maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 🚀 增加到200ms delay
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

// -------------------- URL content 获取 --------------------
async function fetchUrlContent(url) {
    try {
        //console.log(`🔥 deep scan - 准备通throughbackground script request: ${url}`);
        
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
            // 🔥 addHTTPerror日志
            addLogEntry(`⚠️ HTTP ${response.status} - ${url}`, 'warning');
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        // filter 非 text content
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf')) {
            // 🔥 add content type filter log
            addLogEntry(`🚫 skip非 text content (${contentType}) - ${url}`, 'info');
            return null;
        }
        
        const text = await response.text();
        // 🔥 add success 获取 content   log
        const contentSize = text.length;
        const sizeText = contentSize > 1024 ? `${Math.round(contentSize / 1024)}KB` : `${contentSize}B`;
        addLogEntry(`📥 success 获取 content (${sizeText}) - ${url}`, 'info');
        return text;
        
    } catch (error) {
        console.error(`无法访问 ${url}:`, error);
        // 🔥 add network error log
        addLogEntry(`❌ network error: ${error.message} - ${url}`, 'error');
        return null;
    }
}

// -------------------- background request --------------------
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

// -------------------- from content 收集URL --------------------
async function collectUrlsFromContent(content, baseUrl) {
    const urls = new Set();
    
    try {
        const extractedData = await extractFromContent(content, baseUrl);
        
        // 收集JS file
        if (scanConfig.scanJsFiles && extractedData.jsFiles) {
            for (const jsFileItem of extractedData.jsFiles) {
                const jsFile = typeof jsFileItem === 'object' ? jsFileItem.value : jsFileItem;
                const sourceUrl = typeof jsFileItem === 'object' ? jsFileItem.sourceUrl : null;
                const fullUrl = await resolveUrl(jsFile, baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // 收集HTML page
        if (scanConfig.scanHtmlFiles && extractedData.urls) {
            for (const urlItem of extractedData.urls) {
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
        
        // 收集API interface - use智能解析
        if (scanConfig.scanApiFiles) {
            if (extractedData.absoluteApis) {
                for (const apiItem of extractedData.absoluteApis) {
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
            
            if (extractedData.relativeApis) {
                for (const apiItem of extractedData.relativeApis) {
                    // 🔥 优先use智能解析  URL
                    let fullUrl;
                    if (typeof apiItem === 'object' && apiItem.resolvedUrl) {
                        fullUrl = apiItem.resolvedUrl;
                        //console.log('🎯 [DEBUG] use智能解析URL:', apiItem.value, '->', fullUrl);
                    } else {
                        const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                        const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                        fullUrl = await resolveUrl(api, baseUrl, sourceUrl);
                        //console.log('🔄 [DEBUG] use传统解析URL:', api, '->', fullUrl);
                    }
                    
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ from content 收集URL failed:', error);
    }
    
    return Array.from(urls);
}

// -------------------- result 合并 --------------------
function mergeResults(newResults) {
    // use batch 合并，避免频繁 DOM update
    return batchMergeResults(newResults);
}

// -------------------- result save --------------------
async function saveResultsToStorage() {
    try {
        // 生成 domain key
        let domainKey = 'unknown__results';
        if (scanConfig?.baseUrl) {
            try {
                const hostname = new URL(scanConfig.baseUrl).hostname;
                domainKey = `${hostname}__results`;
            } catch (e) {
                console.warn('解析 domain failed，use default key:', e);
            }
        }
        
        //console.log('📝 [DEBUG] use storage key:', domainKey);
        
        // fromIndexedDB获取 current  普通 scan result
        const existingResults = await window.IndexedDBManager.loadScanResults(scanConfig.baseUrl) || {};
        
        // 合并 deep scan result 到普通 scan result in
        const mergedResults = { ...existingResults };
        
        // 将 deep scan   result 合并到普通 scan result in
        Object.keys(scanResults).forEach(key => {
            if (!mergedResults[key]) {
                mergedResults[key] = [];
            }
            
            // 创建现有 result   key set，for去重
            const existingKeys = new Set();
            mergedResults[key].forEach(item => {
                const itemKey = typeof item === 'object' ? item.value : item;
                existingKeys.add(itemKey);
            });
            
            // 合并新  result 项
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
        
        // add scan 元 data
        mergedResults.scanMetadata = {
            ...existingResults.scanMetadata,
            lastScanType: 'deep',
            deepScanComplete: true,
            deepScanTimestamp: Date.now(),
            deepScanUrl: scanConfig.baseUrl,
            totalScanned: scannedUrls.size
        };
        
        // save 合并后  result 到IndexedDB，contains URL位置 information
        const pageTitle = scanConfig.pageTitle || document.title || 'Deep Scan Results';
        // usebasicURL作to storage key，但保持每个 result 项 具体来源URL
        await window.IndexedDBManager.saveScanResults(scanConfig.baseUrl, mergedResults, scanConfig.baseUrl, pageTitle);
        
        //console.log('✅ deep scan result already合并到主 scan result in');
        //console.log('📊 storage key:', domainKey);
        console.log('📊 合并后 result statistics:', {
            总数: Object.values(mergedResults).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            深度扫描贡献: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        console.error('❌ save result failed:', error);
    }
}

// -------------------- scan complete --------------------
async function completeScan() {
    //console.log('🎉 deep scan complete！');
    
    // 🔥 optimization：确保all待 process result 都passive marker合并
    flushPendingResults();
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalScanned = scannedUrls.size;
    
    addLogEntry('🎉 deep scan complete！', 'success');
    addLogEntry(`📊 scan statistics: scan 了 ${totalScanned} 个 file，extract 了 ${totalResults} 个项目`, 'success');
    
    // 🔥 optimization：reduce detailed statistics log，避免卡顿
    const nonEmptyCategories = Object.entries(scanResults).filter(([key, items]) => items && items.length > 0);
    if (nonEmptyCategories.length > 0) {
        const topCategories = nonEmptyCategories
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 5) // 只 display before5 items最多 类别
            .map(([key, items]) => `${key}: ${items.length} items`);
        addLogEntry(`📈 主要发现: ${topCategories.join(', ')}`, 'success');
    }
    
    // 🔥 记录 scan 耗时
    const scanDuration = Date.now() - (scanConfig.timestamp || Date.now());
    const durationText = scanDuration > 60000 ? 
        `${Math.floor(scanDuration / 60000)}分${Math.floor((scanDuration % 60000) / 1000)}秒` : 
        `${Math.floor(scanDuration / 1000)}秒`;
    addLogEntry(`⏱️ scan 耗时: ${durationText}`, 'info');
    
    // save result 到 storage（合并到主 scan result in）
    await saveResultsToStorage();
    
    // notification 主 page deep scan complete，让其 update display
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
                //console.log('主 page 可能already close，无法发送 complete notification');
            } else {
                //console.log('✅ already notification 主 page deep scan complete');
            }
        });
    } catch (error) {
        //console.log('发送 complete notification failed:', error);
    }
    
    // 🔥 optimization：最终 update UI
    performDisplayUpdate();
    
    // update 进度 display
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = '✅ deep scan complete！';
        progressText.classList.add('success');
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // update button status
    updateButtonStates();
    
    // 🔥 optimization：cleanup 内存and cache
    setTimeout(() => {
        cleanupMemory();
    }, 5000); // 5 seconds后 cleanup 内存
}

// 内存 cleanup function
function cleanupMemory() {
    //console.log('🧹 start cleanup 内存...');
    
    // cleanup URL content cache，只keep最近 100 items
    if (urlContentCache.size > 100) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-100);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 cleanup URL cache，keep ${toKeep.length} 个条目`);
    }
    
    // cleanup 待 process result
    Object.keys(pendingResults).forEach(key => {
        if (pendingResults[key]) {
            pendingResults[key].clear();
        }
    });
    
    // cleanup update queue
    updateQueue.length = 0;
    
    // cleanup 定时器
    if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
    }
    
    //console.log('✅ 内存 cleanup complete');
}

// -------------------- UI update function --------------------
function updateButtonStates() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isScanRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = 'scan in...';
        pauseBtn.textContent = isPaused ? '继续 scan' : '暂停 scan';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = 'start scan';
        pauseBtn.textContent = '暂停 scan';
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
    // 🚀 防抖 process：避免频繁 update 进度条
    if (updateProgressDisplay.pending) return;
    updateProgressDisplay.pending = true;
    
    // 🚀 userequestAnimationFrame delay update，避免 blocking 滚动
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
    // 先合并all待 process   result
    flushPendingResults();
    
    //console.log(`🔍 [DEBUG] start update deep scan result display ... (第${displayUpdateCount}次update)`);
    
    // 🔥 reduce debug log 输出，避免控制台卡顿
    if (displayUpdateCount % 10 === 0) { // 每10次 update 才输出 detailed log
        //console.log('🔍 [DEBUG] API data check:');
        //console.log('  - absoluteApis:', scanResults.absoluteApis?.length || 0, '个');
        //console.log('  - relativeApis:', scanResults.relativeApis?.length || 0, '个');
        if (scanResults.absoluteApis?.length > 0) {
            //console.log('  - absoluteApis example:', scanResults.absoluteApis.slice(0, 3));
        }
        if (scanResults.relativeApis?.length > 0) {
            //console.log('  - relativeApis example:', scanResults.relativeApis.slice(0, 3));
        }
    }
    
    // 🔥 fixAPI display issue：正确 元素ID map
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
    
    // 🔥 fix display 逻辑：use正确 元素ID
    Object.keys(categoryMapping).forEach(key => {
        const items = scanResults[key] || [];
        const mapping = categoryMapping[key];
        
        // 🔥 optimization：reduce debug log，只in必要时输出
        if (displayUpdateCount % 20 === 0) {
            //console.log(`🔍 [DEBUG] process 类别 ${key}: ${items.length} 个项目`);
        }
        
        if (items.length > 0) {
            // display 容器
            const resultDiv = document.getElementById(mapping.containerId);
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }
            
            // update 计数
            const countElement = document.getElementById(mapping.countId);
            if (countElement && countElement.textContent !== items.length.toString()) {
                countElement.textContent = items.length;
            }
            
            // 🔥 optimization：只in list content 真正改变时才 update DOM
            const listElement = document.getElementById(mapping.listId);
            if (listElement) {
                const currentItemCount = listElement.children.length;
                if (currentItemCount !== items.length) {
                    // use documentation 片段 batch update DOM
                    const fragment = document.createDocumentFragment();
                    items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'result-item';
                        
                        // 🔥 fix：use每个项目自己 sourceUrl进行悬停 display，support智能解析 URL
                        if (typeof item === 'object' && item !== null) {
                            // process 带有sourceUrl 结构化 object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                            if (item.value !== undefined && item.sourceUrl) {
                                const itemValue = String(item.value);
                                const itemSourceUrl = String(item.sourceUrl);
                                
                                // 🔥 新增：如果是相对 path API且有智能解析 URL，display 额外 information
                                if (key === 'relativeApis' && item.resolvedUrl) {
                                    li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                                    li.title = `原始值: ${itemValue}
智能解析: ${item.resolvedUrl}
来源: ${itemSourceUrl}`;
                                } else {
                                    // 只 display value，do notdirectly display 来源URL，仅in悬停时 display
                                    li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                                    li.title = `来源: ${itemSourceUrl}`;
                                }
                                li.style.cssText = 'padding: 5px 0;';
                            } else if (item.url || item.path || item.value || item.content) {
                                // 兼容其他 object format
                                const displayValue = item.url || item.path || item.value || item.content || JSON.stringify(item);
                                li.textContent = String(displayValue);
                                li.title = String(displayValue);
                            } else {
                                const jsonStr = JSON.stringify(item);
                                li.textContent = jsonStr;
                                li.title = jsonStr;
                            }
                        } else {
                            // 如果是 string or其他基本 type，directly display
                            const displayValue = String(item);
                            li.textContent = displayValue;
                            li.title = displayValue;
                        }
                        
                        fragment.appendChild(li);
                    });
                    
                    // 一次性 update DOM
                    listElement.innerHTML = '';
                    listElement.appendChild(fragment);
                }
            }
        }
    });
    
    // 🔥 process custom regex result - 恢复passive marker delete   feature
    //console.log('🔍 [DEBUG] start process custom regex result ...');
    Object.keys(scanResults).forEach(key => {
        if (key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🎯 [DEBUG] 发现 custom regex result: ${key}, count: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
    
    // 🔥 process 其他未预定义  result 类别
    Object.keys(scanResults).forEach(key => {
        // skipalready process  预定义类别and custom regex
        if (!categoryMapping[key] && !key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🆕 [DEBUG] 发现新  result 类别: ${key}, count: ${scanResults[key].length}`);
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
        title.innerHTML = `🔍 ${key.replace('custom_', 'custom -')} (<span id="${key}Count">0</span>)`;
        
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
            
            // 🔥 fix：use每个项目自己 sourceUrl进行悬停 display，support智能解析 URL
            if (typeof item === 'object' && item !== null) {
                // process 带有sourceUrl 结构化 object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                if (item.value !== undefined && item.sourceUrl) {
                    const itemValue = String(item.value);
                    const itemSourceUrl = String(item.sourceUrl);
                    
                    // 🔥 新增：如果是相对 path API且有智能解析 URL，display 额外 information
                    if (key === 'relativeApis' && item.resolvedUrl) {
                        li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                        li.title = `原始值: ${itemValue}
智能解析: ${item.resolvedUrl}
来源: ${itemSourceUrl}`;
                    } else {
                        // 只 display value，do notdirectly display 来源URL，仅in悬停时 display
                        li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                        li.title = `来源: ${itemSourceUrl}`;
                    }
                    li.style.cssText = 'padding: 5px 0;';
                } else {
                    // 兼容其他 object format
                    const jsonStr = JSON.stringify(item);
                    li.textContent = jsonStr;
                    li.title = jsonStr;
                }
            } else {
                // 如果是 string or其他基本 type，directly display
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
    
    // 🚀 performance optimization：只 filter 最频繁  log，keep重要 information
    if (type === 'info' && (
        message.includes('success 获取 content') ||
        message.includes('skip非 text content')
    )) {
        return; // 只skip这些最频繁  log
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // add 到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // batch refresh log（降低频率）
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

// 🚀 optimization   log display function - reduceDOM操作频率
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 🚀 防抖 process：避免频繁 update DOM
    if (updateLogDisplay.pending) return;
    updateLogDisplay.pending = true;
    
    // 只 display 最近 20条 log，进一步reduceDOM负载
    const recentLogs = logEntries.slice(-20);
    
    // check 是否require update（避免do not必要 DOM操作）
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        updateLogDisplay.pending = false;
        return; // 没有新 log，skip update
    }
    
    // 🚀 usesetTimeout delay update，避免 blocking 滚动
    setTimeout(() => {
        // use documentation 片段 batch update
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        // userequestAnimationFrame optimization DOM update
        requestAnimationFrame(() => {
            logSection.innerHTML = '';
            logSection.appendChild(fragment);
            
            // 🚀 optimization 滚动：只in必要时滚动
            if (!logSection.isUserScrolling) {
                logSection.scrollTop = logSection.scrollHeight;
            }
            
            updateLogDisplay.pending = false;
        });
    }, 100); // 100ms delay，避免频繁 update
}

// -------------------- tool function --------------------

// 辅助 function：解析相对 path
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) return null;
        
        // 确保basePath以/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        // useURL构造 function 进行 standard 解析
        const resolved = new URL(relativePath, basePath);
        return resolved.href;
    } catch (error) {
        console.warn('相对 path 解析 failed:', error);
        return null;
    }
}

async function resolveUrl(url, baseUrl, sourceUrl = null) {
    try {
        if (!url) return null;
        
        console.log(`🔍 [URL解析] start 解析: "${url}", basicURL: "${baseUrl}", 源URL: "${sourceUrl}"`);
        
        // 如果already经是绝对URL，directly返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log(`✅ [URL解析] already是绝对URL: "${url}"`);
            return url;
        }
        
        if (url.startsWith('//')) {
            const result = new URL(baseUrl).protocol + url;
            console.log(`✅ [URL解析] protocol 相对URL: "${url}" -> "${result}"`);
            return result;
        }
        
        // 🔥 fix：严格按照IndexedDB data 获取 extract 来源 path 进行相对 path 解析
        if (sourceUrl && (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/'))) {
            console.log(`🔍 [URL解析] 检测到相对 path，尝试useIndexedDB data 解析`);
            
            try {
                // 获取allIndexedDB scan data
                let allScanData = [];
                
                // method 1: directlyfromIndexedDBManager获取 current domain data
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.loadScanResults) {
                        const currentData = await window.IndexedDBManager.loadScanResults(baseUrl);
                        if (currentData && currentData.results) {
                            allScanData.push(currentData);
                            console.log(`✅ [URL解析] 获取到 current domain data`);
                        }
                    }
                } catch (error) {
                    console.warn('获取 current domain IndexedDB data failed:', error);
                }
                
                // method 2: 获取all scan data 作to备选
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.getAllScanResults) {
                        const allData = await window.IndexedDBManager.getAllScanResults();
                        if (Array.isArray(allData)) {
                            allScanData = allScanData.concat(allData);
                            console.log(`✅ [URL解析] 获取到all scan data，共 ${allData.length} 个`);
                        }
                    }
                } catch (error) {
                    console.warn('获取allIndexedDB data failed:', error);
                }
                
                if (allScanData.length > 0) {
                    // 构建sourceUrl到basePath  map
                    const sourceUrlToBasePath = new Map();
                    
                    console.log(`🔍 [URL解析] start analysis ${allScanData.length} 个 scan data 源`);
                    
                    // 遍历all scan data，建立 map 关system
                    allScanData.forEach((scanData, dataIndex) => {
                        if (!scanData.results) return;
                        
                        // 遍历all type   data，建立 sourceUrl map
                        Object.values(scanData.results).forEach(items => {
                            if (Array.isArray(items)) {
                                items.forEach(item => {
                                    if (typeof item === 'object' && item.sourceUrl) {
                                        try {
                                            const sourceUrlObj = new URL(item.sourceUrl);
                                            // extract basic path（去掉 file 名）
                                            const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                            const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                            sourceUrlToBasePath.set(item.sourceUrl, correctBaseUrl);
                                            
                                            console.log(`📋 [URL解析] map 建立: ${item.sourceUrl} → ${correctBaseUrl}`);
                                        } catch (e) {
                                            console.warn('invalid  sourceUrl:', item.sourceUrl, e);
                                        }
                                    }
                                });
                            }
                        });
                        
                        // 也 add scan data 本身 sourceUrl作to备选
                        if (scanData.sourceUrl) {
                            try {
                                const sourceUrlObj = new URL(scanData.sourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                sourceUrlToBasePath.set(scanData.sourceUrl, correctBaseUrl);
                                
                                console.log(`📋 [URL解析] 备选 map: ${scanData.sourceUrl} → ${correctBaseUrl}`);
                            } catch (e) {
                                console.warn('invalid  备选sourceUrl:', scanData.sourceUrl, e);
                            }
                        }
                    });
                    
                    console.log(`📊 [URL解析] map 建立 complete，共 ${sourceUrlToBasePath.size} 个 map`);
                    
                    // 🔥 method 1：精确 match sourceUrl
                    if (sourceUrlToBasePath.has(sourceUrl)) {
                        const correctBasePath = sourceUrlToBasePath.get(sourceUrl);
                        const resolvedUrl = resolveRelativePath(url, correctBasePath);
                        if (resolvedUrl) {
                            console.log(`🎯 [URL解析] 精确 match success: ${url} → ${resolvedUrl} (基于源: ${sourceUrl})`);
                            return resolvedUrl;
                        }
                    }
                    
                    // 🔥 method 2：domain match
                    const targetDomain = baseUrl ? new URL(baseUrl).hostname : null;
                    if (targetDomain) {
                        for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                            try {
                                const sourceDomain = new URL(storedSourceUrl).hostname;
                                if (sourceDomain === targetDomain) {
                                    const testUrl = resolveRelativePath(url, basePath);
                                    if (testUrl) {
                                        console.log(`🎯 [URL解析] domain match success: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                                        return testUrl;
                                    }
                                }
                            } catch (e) {
                                // 忽略 invalid URL
                            }
                        }
                    }
                    
                    // 🔥 method 3：尝试任何可用 源URL
                    for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                        const testUrl = resolveRelativePath(url, basePath);
                        if (testUrl) {
                            console.log(`🎯 [URL解析] general match success: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                            return testUrl;
                        }
                    }
                }
                
                console.log(`⚠️ [URL解析] IndexedDB智能解析未找到 match，use default method`);
                
            } catch (error) {
                console.warn('IndexedDB智能 path 解析 failed，use default method:', error);
            }
        }
        
        // 🔥 default method：directly基于baseUrl解析
        try {
            const resolvedUrl = new URL(url, baseUrl).href;
            console.log(`📍 [URL解析] default 解析: ${url} → ${resolvedUrl} (基于: ${baseUrl})`);
            return resolvedUrl;
        } catch (error) {
            console.warn('default URL解析 failed:', error);
            return null;
        }
        
    } catch (error) {
        console.warn('URL解析完全 failed:', error);
        return null;
    }
}

// check 是否to同一 domain - support子 domain and all domain settings
async function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // 获取 domain scan settings
        const domainSettings = await getDomainScanSettings();
        //console.log('🔍 [deep scan] current domain settings:', domainSettings);
        //console.log('🔍 [deep scan] check URL:', url, '基准URL:', baseUrl);
        
        // 如果允许 scan all domain
        if (domainSettings.allowAllDomains) {
            //console.log(`🌐 [deep scan] 允许all domain: ${urlObj.hostname}`);
            addLogEntry(`🌐 允许all domain: ${urlObj.hostname}`, 'info');
            return true;
        }
        
        // 如果允许 scan 子 domain
        if (domainSettings.allowSubdomains) {
            const baseHostname = baseUrlObj.hostname;
            const urlHostname = urlObj.hostname;
            
            // check 是否to同一 domain or子 domain
            const isSameOrSubdomain = urlHostname === baseHostname || 
                                    urlHostname.endsWith('.' + baseHostname) ||
                                    baseHostname.endsWith('.' + urlHostname);
            
            if (isSameOrSubdomain) {
                //console.log(`🔗 [deep scan] 允许子 domain: ${urlHostname} (基于 ${baseHostname})`);
                //addLogEntry(`🔗 允许子 domain: ${urlHostname}`, 'info');
                return true;
            }
        }
        
        // default：只允许完全相同  domain
        const isSame = urlObj.hostname === baseUrlObj.hostname;
        if (isSame) {
            //console.log(`✅ [deep scan] 同 domain: ${urlObj.hostname}`);
        } else {
            //console.log(`❌ [deep scan] do not同 domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
        }
        return isSame;
        
    } catch (error) {
        console.error('[deep scan] domain check failed:', error);
        return false;
    }
}

// 获取 domain scan settings
async function getDomainScanSettings() {
    try {
        // 如果SettingsManager可用，use它获取 settings
        if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
            return await window.SettingsManager.getDomainScanSettings();
        }
        
        // 备用方案：directlyfromchrome.storage获取
        const result = await chrome.storage.local.get(['domainScanSettings']);
        const domainSettings = result.domainScanSettings || {
            allowSubdomains: false,
            allowAllDomains: false
        };
        //console.log('🔍 [deep scan] fromstorage获取  domain settings:', domainSettings);
        return domainSettings;
    } catch (error) {
        console.error('[deep scan] 获取 domain scan settings failed:', error);
        // default settings：只允许同 domain
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

// -------------------- export feature --------------------
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

// -------------------- event listener --------------------
document.addEventListener('DOMContentLoaded', initializePage);

// export popup event
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
        
        addLogEntry(`✅ JSON export success: ${filename}`, 'success');
    } catch (error) {
        addLogEntry(`❌ JSON export failed: ${error.message}`, 'error');
    }
}

async function exportAsExcel() {
    try {
        const filename = await generateFileName('xlsx');
        
        // check 是否有 data can export
        const hasData = Object.keys(scanResults).some(key => 
            scanResults[key] && Array.isArray(scanResults[key]) && scanResults[key].length > 0
        );
        
        if (!hasData) {
            addLogEntry(`⚠️ 没有 data can export`, 'warning');
            return;
        }
        
        // 生成Excel XML format content
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>phantom工具-deep scan</Author>
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

        // to每个分类创建工作表
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

        // 如果没有 data，创建一个 empty  工作表
        if (!dataExported) {
            xlsContent += `
 <Worksheet ss:Name="无 data">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有找到任何data</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // 创建并 download file
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        addLogEntry(`✅ Excel file export success: ${filename}.xls`, 'success');
        
    } catch (error) {
        addLogEntry(`❌ Excel export failed: ${error.message}`, 'error');
        console.error('Excel export error:', error);
    }
}

// cleanup 工作表名称（Excel工作表名称有特殊字符 limit）
function sanitizeSheetName(name) {
    // remove or replace Exceldo not允许 字符
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    // limit length（Excel工作表名称 maximum 31 items字符）
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || '未命名';
}

// XML转义 function
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// 生成 file 名：domain __随机数
async function generateFileName(extension = 'json') {
    let domain = 'deep-scan';
    
    try {
        // 优先from scan configuration in获取目标 domain
        if (scanConfig && scanConfig.baseUrl) {
            const url = new URL(scanConfig.baseUrl);
            domain = url.hostname;
            //console.log('from scan configuration 获取到 domain:', domain);
        } else {
            // 备选方案：from current window URL parameter in extract 目标 domain
            if (window.location && window.location.href) {
                const urlParams = new URLSearchParams(window.location.search);
                const targetUrl = urlParams.get('url');
                if (targetUrl) {
                    const url = new URL(targetUrl);
                    domain = url.hostname;
                    //console.log('fromURL parameter 获取到 domain:', domain);
                }
            }
        }
    } catch (e) {
        //console.log('获取 domain failed，use default 名称:', e);
        // use时间戳作to标识
        domain = `deep-scan_${Date.now()}`;
    }
    
    // cleanup domain，remove 特殊字符
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 生成随机数（6-digit）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${domain}__${randomNum}`;
}

//console.log('✅ [DEBUG] deep scan window script（unified regex version）load complete');