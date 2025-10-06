// ==========================================================
// deep scan script window（regex version 统一）
// regex all via 统一 SettingsManager get，any 无硬编码
// ==========================================================

//console.log('🚀 [DEBUG] deep scan script window（regex version 统一）start load ...');

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
let maxConcurrency     = 4; // default 值，settings extension read from in 会
let requestTimeout     = 3000; // default 值，settings extension read from in 会

// log variable related - optimization version
let logEntries         = [];
let maxLogEntries      = 100; //  record(s) to 减少100，memory usage 避免
let logBuffer          = []; // log 缓冲区
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 500; // 500ms refresh log batch

// selector instance
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// performance optimization variable related
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 300; // 🚀 throttle to 增加300ms，update 减少频率
let pendingResults     = {};
let batchSize          = 15; // 🚀 process batch 增加大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 memory variable related 管理
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 seconds cleanup memory time(s) 一

// -------------------- performance optimization function 工具 --------------------

// 🚀 cleanup memory function
function performMemoryCleanup() {
    //console.log('🧹 cleanup memory execute ...');
    
    // URL cleanup content cache， item(s) of 只保留最近50
    if (urlContentCache.size > 50) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-50);
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

// -------------------- selector load 统一 --------------------
async function loadFilters() {
    //console.log('🔍 [DEBUG] selector start load 统一...');

    try {
        // load SettingsManager（必须）
        if (typeof window.SettingsManager === 'undefined') {
            await loadScript('src/utils/SettingsManager.js');
        }

        // load PatternExtractor（必须）
        if (typeof window.PatternExtractor === 'undefined') {
            await loadScript('src/scanner/PatternExtractor.js');
        }

        // waiting parse script
        await new Promise(r => setTimeout(r, 100));

        // instance 化
        if (typeof window.PatternExtractor === 'undefined') {
            throw new Error('PatternExtractor loaded successfully 未');
        }
        patternExtractor = new window.PatternExtractor();

        // custom regex load force
        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
            patternExtractor.ensureCustomPatternsLoaded();
        }

        // update regex settings listen page(s)
        window.addEventListener('regexConfigUpdated', (e) => {
            //console.log('🔄 [DEBUG] update regex configuration event to 收');
            if (patternExtractor?.updatePatterns) {
                patternExtractor.updatePatterns(e.detail);
            } else if (patternExtractor?.loadCustomPatterns) {
                patternExtractor.loadCustomPatterns(e.detail);
            }
        });

        filtersLoaded = true;
        //console.log('✅ [DEBUG] selector load 统一完毕');
    } catch (err) {
        console.error('❌ [DEBUG] failed to load selector:', err);
        filtersLoaded = false;
    }
}

// -------------------- content extracted 统一 --------------------
async function extractFromContent(content, sourceUrl = 'unknown') {
    //console.log('🔍 [DEBUG] start content extracted 统一...');

    if (!patternExtractor || typeof patternExtractor.extractPatterns !== 'function') {
        throw new Error('PatternExtractor.extractPatterns unavailable');
    }

    // configuration load 确保已
    if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
        await patternExtractor.ensureCustomPatternsLoaded();
    }

    // extracted use 统一入口
    const results = await patternExtractor.extractPatterns(content, sourceUrl);

    // 🔥 fixed：use IndexedDB relative path data parse intelligent line(s) 进
    await enhanceRelativePathsWithIndexedDB(results, sourceUrl);

    return results;
}

// -------------------- relative path parse intelligent --------------------
async function enhanceRelativePathsWithIndexedDB(results, currentSourceUrl) {
    console.log('🔍 [DEBUG] relative path start parse intelligent，URL current 源:', currentSourceUrl);
    
    if (!results.relativeApis || results.relativeApis.length === 0) {
        console.log('⚠️ relative path API parse has 没需要');
        return;
    }
    
    try {
        // 🔥 fixed：path data extracted get from by 严格照IndexedDB源
        const baseUrl = scanConfig?.baseUrl || window.location.origin;
        console.log('🔍 [DEBUG] URL basic:', baseUrl);
        
        // scan results data get all，deep scan results 包括
        let allScanData = [];
        
        // method 1：scan results domain get current of 尝试
        try {
            const currentScanData = await window.IndexedDBManager.loadScanResults(baseUrl);
            if (currentScanData && currentScanData.results) {
                allScanData.push(currentScanData);
                console.log('✅ [DEBUG] scan results domain get current to');
            }
        } catch (e) {
            console.warn('⚠️ scan results failed domain get current:', e);
        }
        
        // method 2：scan results get all as 作备选
        try {
            const allResults = await window.IndexedDBManager.getAllScanResults();
            if (allResults && Array.isArray(allResults)) {
                allScanData = allScanData.concat(allResults);
                console.log('✅ [DEBUG] scan results get all to，total', allResults.length, ' item(s)');
            }
        } catch (e) {
            console.warn('⚠️ scan results failed get all:', e);
        }
        
        if (allScanData.length === 0) {
            console.log('⚠️ not found any IndexedDB data，use 传统拼接方式');
            return;
        }
        
        // 🔥 fixed：path data parse item(s) item(s) line(s) in of by 严格照IndexedDB每sourceUrl进
        const sourceUrlToBasePath = new Map();
        const itemToSourceUrlMap = new Map(); // 新增：data item(s) to of 建立sourceUrl映射
        
        console.log('🔍 [DEBUG] start data analysis IndexedDB，total', allScanData.length, 'data item(s) 源');
        
        // scan data all 遍历，of off 建立完整映射系
        allScanData.forEach((scanData, dataIndex) => {
            if (!scanData.results) return;
            
            console.log(`🔍 [DEBUG] data analysis 源 ${dataIndex + 1}:`, {
                url: scanData.url,
                sourceUrl: scanData.sourceUrl,
                domain: scanData.domain,
                pageTitle: scanData.pageTitle
            });
            
            // data type all of 遍历
            Object.entries(scanData.results).forEach(([category, items]) => {
                if (!Array.isArray(items)) return;
                
                items.forEach(item => {
                    if (typeof item === 'object' && item !== null && item.sourceUrl) {
                        // 🔥 fixed off 键：data use item(s) of 自己sourceUrl
                        const itemSourceUrl = item.sourceUrl;
                        const itemValue = item.value || item.text || item.content;
                        
                        if (itemValue && itemSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(itemSourceUrl);
                                // base path extracted（filename 去掉）
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(itemSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(itemValue, itemSourceUrl);
                                
                                console.log(`📋 [DEBUG] 映射建立: "${itemValue}" -> "${itemSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ of 无效sourceUrl:', itemSourceUrl, e);
                            }
                        }
                    } else if (typeof item === 'string') {
                        // data format characters of 对于串，scan results use of sourceUrl
                        const fallbackSourceUrl = scanData.sourceUrl || scanData.url;
                        if (fallbackSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(fallbackSourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(fallbackSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(item, fallbackSourceUrl);
                                
                                console.log(`📋 [DEBUG] 备选映射: "${item}" -> "${fallbackSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ of 无效备选sourceUrl:', fallbackSourceUrl, e);
                            }
                        }
                    }
                });
            });
        });
        
        console.log('📊 [DEBUG] complete 映射建立:', {
            sourceUrlToBasePath: sourceUrlToBasePath.size,
            itemToSourceUrlMap: itemToSourceUrlMap.size
        });
        
        // 🔥 fixed：relative path API parse item(s) line(s) of from by 严格照每源进
        const enhancedRelativeApis = [];
        
        for (const apiItem of results.relativeApis) {
            const apiValue = typeof apiItem === 'object' ? apiItem.value : apiItem;
            let apiSourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : currentSourceUrl;
            
            console.log(`🔍 [DEBUG] relative path API process: "${apiValue}", URL 源: "${apiSourceUrl}"`);
            
            let resolvedUrl = null;
            let usedSourceUrl = null;
            
            // 🔥 method 1：data parse item(s) line(s) of by 严格照sourceUrl进
            if (itemToSourceUrlMap.has(apiValue)) {
                const exactSourceUrl = itemToSourceUrlMap.get(apiValue);
                if (sourceUrlToBasePath.has(exactSourceUrl)) {
                    const basePath = sourceUrlToBasePath.get(exactSourceUrl);
                    resolvedUrl = resolveRelativePath(apiValue, basePath);
                    usedSourceUrl = exactSourceUrl;
                    console.log('✅ [match 精确] data item(s) to of from 找确切源:', apiValue, '->', resolvedUrl, '(源:', exactSourceUrl, ')');
                }
            }
            
            // 🔥 method 2：failed match if 精确，API use project of with 自sourceUrl
            if (!resolvedUrl && apiSourceUrl && sourceUrlToBasePath.has(apiSourceUrl)) {
                const basePath = sourceUrlToBasePath.get(apiSourceUrl);
                resolvedUrl = resolveRelativePath(apiValue, basePath);
                usedSourceUrl = apiSourceUrl;
                console.log('✅ [match directly] API use project of sourceUrl:', apiValue, '->', resolvedUrl, '(源:', apiSourceUrl, ')');
            }
            
            // 🔥 method 3：failed if yes 还，URL find of 尝试相似源（domain match）
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
                                console.log('✅ [domain match] URL domain to of 找同源:', apiValue, '->', resolvedUrl, '(源:', sourceUrl, ')');
                                break;
                            }
                        }
                    } catch (e) {
                        // URL ignore 无效
                    }
                }
            }
            
            // 🔥 method 4：of after 最备选方案，URL basic use 拼接
            if (!resolvedUrl) {
                try {
                    if (apiValue.startsWith('./')) {
                        resolvedUrl = baseUrl + apiValue.substring(1); // 去掉.，保留/
                    } else if (apiValue.startsWith('../')) {
                        // process 简单上级目录
                        const upLevels = (apiValue.match(/\.\.\//g) || []).length;
                        const remainingPath = apiValue.replace(/\.\.\//g, '');
                        const baseUrlObj = new URL(baseUrl);
                        const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                        
                        //  layer(s) 向上移动指定级
                        for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                            pathParts.pop();
                        }
                        
                        resolvedUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                    } else if (!apiValue.startsWith('/') && !apiValue.startsWith('http')) {
                        resolvedUrl = baseUrl + '/' + apiValue;
                    } else {
                        resolvedUrl = apiValue;
                    }
                    
                    // cleanup of 多余斜杠
                    resolvedUrl = resolvedUrl.replace(/\/+/g, '/').replace(':/', '://');
                    usedSourceUrl = baseUrl;
                    
                    console.log('🔄 [parse 备选] URL basic use 拼接:', apiValue, '->', resolvedUrl);
                } catch (e) {
                    resolvedUrl = apiValue; // 保持原值
                    usedSourceUrl = currentSourceUrl;
                    console.warn('⚠️ [failed parse] 保持原值:', apiValue, e.message);
                }
            }
            
            // format original 保持，add parse of after URL URL use of and 实际源
            if (typeof apiItem === 'object') {
                enhancedRelativeApis.push({
                    ...apiItem,
                    resolvedUrl: resolvedUrl,
                    actualSourceUrl: usedSourceUrl || apiItem.sourceUrl // URL record use of 实际源
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
        
        // update results
        results.relativeApis = enhancedRelativeApis;
        
        console.log('✅ [parse intelligent] relative path complete parse，process 了', enhancedRelativeApis.length, 'relative path item(s)');
        console.log('📊 [parse intelligent] statistics parse:', {
            总数: enhancedRelativeApis.length,
            成功解析: enhancedRelativeApis.filter(item => item.resolvedUrl && item.resolvedUrl !== item.value).length,
            使用IndexedDB数据: enhancedRelativeApis.filter(item => item.actualSourceUrl && item.actualSourceUrl !== currentSourceUrl).length
        });
        
    } catch (error) {
        console.error('❌ relative path failed parse intelligent:', error);
        // data original error occurred when 保持不变
    }
}

// function 辅助：relative path parse
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) {
            console.warn('⚠️ relative path parse parameters 无效:', { relativePath, basePath });
            return null;
        }
        
        console.log(`🔧 [parse] relative path start parse: "${relativePath}" 基于 "${basePath}"`);
        
        // with 确保basePath/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        let resolvedPath;
        
        if (relativePath.startsWith('./')) {
            // current 目录：./file.js -> basePath + file.js
            resolvedPath = basePath + relativePath.substring(2);
            console.log(`🔧 [parse] parse current 目录: "${relativePath}" -> "${resolvedPath}"`);
        } else if (relativePath.startsWith('../')) {
            // 上级目录：../file.js -> path process layer(s) 需要级
            const upLevels = (relativePath.match(/\.\.\//g) || []).length;
            const remainingPath = relativePath.replace(/\.\.\//g, '');
            
            console.log(`🔧 [parse] parse 上级目录: 向上${upLevels}级, path 剩余: "${remainingPath}"`);
            
            try {
                const baseUrlObj = new URL(basePath);
                const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                
                console.log(`🔧 [parse] base path 部分:`, pathParts);
                
                //  layer(s) 向上移动指定级
                for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                    pathParts.pop();
                }
                
                console.log(`🔧 [parse] path after 向上移动部分:`, pathParts);
                
                resolvedPath = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                console.log(`🔧 [parse] parse final 上级目录: "${relativePath}" -> "${resolvedPath}"`);
            } catch (e) {
                console.warn('⚠️ failed parse 上级目录，method use 简单:', e);
                // process 简单方式
                const baseUrl = basePath.split('/').slice(0, 3).join('/'); // protocol://host
                resolvedPath = baseUrl + '/' + remainingPath;
            }
        } else if (!relativePath.startsWith('/') && !relativePath.startsWith('http')) {
            // relative path：file.js -> basePath + file.js
            resolvedPath = basePath + relativePath;
            console.log(`🔧 [parse] relative path parse: "${relativePath}" -> "${resolvedPath}"`);
        } else {
            // absolute path yes 已经
            resolvedPath = relativePath;
            console.log(`🔧 [parse] absolute path yes 已: "${relativePath}"`);
        }
        
        // cleanup of 多余斜杠
        const cleanedPath = resolvedPath.replace(/\/+/g, '/').replace(':/', '://');
        
        if (cleanedPath !== resolvedPath) {
            console.log(`🔧 [parse] cleanup path: "${resolvedPath}" -> "${cleanedPath}"`);
        }
        
        console.log(`✅ [parse] relative path complete parse: "${relativePath}" -> "${cleanedPath}"`);
        return cleanedPath;
        
    } catch (error) {
        console.warn('❌ relative path failed parse:', error, { relativePath, basePath });
        return null;
    }
}

// -------------------- results process 传统（备用） --------------------
function convertRelativeApisToAbsolute(results) {
    // 🔥 fixed：remove auto convert 完全逻辑，relative path absolute path API API of and 保持独立性
    // relative path absolute path API API add auto convert to in 不再将并
    // absolute path API add regex data can of 这样避免意外不符合要求
    
    //console.log('🔍 [DEBUG] API complete convert（disabled auto convert）:');
    //console.log('  - relative path API of 保留:', results.relativeApis?.length || 0, ' item(s)');
    //console.log('  - absolute path API of 保留:', results.absoluteApis?.length || 0, ' item(s)');
    
    // feature convert if 需要，regular expression via in from 应该在PatternExtractor实现
    // convert force line(s) yes 而不在这里进
}

// -------------------- performance optimization function --------------------
// update throttle display
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        // update if time(s) when 距离上间太短，update delay
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

// update execute display
function performDisplayUpdate() {
    if (isUpdating) return;
    
    isUpdating = true;
    lastUpdateTime = Date.now();
    displayUpdateCount++;
    
    try {
        // use requestAnimationFrame update 确保在下一帧
        requestAnimationFrame(() => {
            updateResultsDisplay();
            updateStatusDisplay();
            isUpdating = false;
        });
    } catch (error) {
        console.error('failed update display:', error);
        isUpdating = false;
    }
}

// results process batch 合并
function batchMergeResults(newResults) {
    let hasNewData = false;
    
    // add results process column(s) to 将新待队
    Object.keys(newResults).forEach(key => {
        if (!pendingResults[key]) {
            pendingResults[key] = new Map(); // object use from Map存储，with as value键避免重复
        }
        
        if (Array.isArray(newResults[key])) {
            newResults[key].forEach(item => {
                if (item) {
                    // process object structure 化（with sourceUrl）characters and 简单串
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
    
    // data if has 新，update trigger throttle
    if (hasNewData) {
        throttledUpdateDisplay();
    }
    
    return hasNewData;
}

// results results process to in 将待合并主
function flushPendingResults() {
    Object.keys(pendingResults).forEach(key => {
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        // results of has 创建现键集合，for 去重
        const existingKeys = new Set();
        scanResults[key].forEach(item => {
            const itemKey = typeof item === 'object' ? item.value : item;
            existingKeys.add(itemKey);
        });
        
        // add results new item(s)
        pendingResults[key].forEach((itemData, itemKey) => {
            if (!existingKeys.has(itemKey)) {
                scanResults[key].push(itemData);
            }
        });
        
        // clear process column(s) 待队
        pendingResults[key].clear();
    });
}

// -------------------- initialize page --------------------
async function initializePage() {
    //console.log('🔍 [DEBUG] initialize page in ...');

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ API unavailable extension Chrome');
        return;
    }

    await loadFilters();

    try {
        // get baseUrl（scan configuration window current from in of of baseUrl或opener）
        let baseUrl = '';
        if (window.opener) {
            try {
                // URL get window from 尝试opener
                baseUrl = window.opener.location.origin;
            } catch (e) {
                // failed if 跨域访问，default use 方式
                console.warn('URL get from 无法opener，default use 方式');
            }
        }
        
        // deep scan configuration load from IndexedDB
        let deepScanConfig = null;
        if (baseUrl) {
            deepScanConfig = await window.IndexedDBManager.loadDeepScanState(baseUrl);
        }
        
        // configuration if to has 没找，available get configuration all 尝试
        if (!deepScanConfig) {
            console.warn('⚠️ scan configuration URL not found of 指定，get configuration all available 尝试...');
            const allConfigs = await window.IndexedDBManager.getAllDeepScanStates();
            if (allConfigs && allConfigs.length > 0) {
                // configuration latest use of
                deepScanConfig = allConfigs[allConfigs.length - 1];
                console.log('✅ configuration available to 找:', deepScanConfig.baseUrl);
            }
        }
        
        if (!deepScanConfig) throw new Error('scan configuration not found');
        scanConfig = deepScanConfig;

        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout  = (scanConfig.timeout * 1000) || 5000;

        updateConfigDisplay();
        initializeScanResults();
    } catch (err) {
        console.error('❌ initialize failed:', err);
    }

    // button event 绑定
    document.getElementById('startBtn')?.addEventListener('click', startScan);
    document.getElementById('pauseBtn')?.addEventListener('click', pauseScan);
    document.getElementById('stopBtn')?.addEventListener('click', stopScan);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('toggleAllBtn')?.addEventListener('click', toggleAllCategories);
    
    // 🚀 add optimization scroll：detect scroll user no yes 在
    const logSection = document.getElementById('logSection');
    if (logSection) {
        let scrollTimeout;
        logSection.addEventListener('scroll', () => {
            logSection.isUserScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                logSection.isUserScrolling = false;
            }, 1000); // 1 second stop scroll user consider after
        });
        
        // 🚀 performance optimization scroll
        logSection.style.willChange = 'scroll-position';
        logSection.style.transform = 'translateZ(0)'; // acceleration 启用硬件
    }

    // extension listen 消息
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
        if (msg.action === 'stopDeepScan') {
            stopScan();
            reply({ success: true });
        }
    });

    // start auto
    setTimeout(startScan, 1000);
}

// -------------------- configuration display --------------------
function updateConfigDisplay() {
    if (!scanConfig) return;

    document.getElementById('maxDepthDisplay').textContent = scanConfig.maxDepth || 2;
    document.getElementById('concurrencyDisplay').textContent = scanConfig.concurrency || 8;
    document.getElementById('timeoutDisplay').textContent = scanConfig.timeout || 5;
    
    const scanTypes = [];
    if (scanConfig.scanJsFiles) scanTypes.push('file JS');
    if (scanConfig.scanHtmlFiles) scanTypes.push('page HTML');
    if (scanConfig.scanApiFiles) scanTypes.push('API interface');
    
    document.getElementById('scanTypesDisplay').textContent = scanTypes.join(', ') || '全部';
    document.getElementById('scanInfo').textContent = `目标: ${scanConfig.baseUrl}`;
}

// -------------------- scan results initialize --------------------
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
    
    //console.log('🚀 [DEBUG] deep scan start ...');
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    
    // update status UI
    updateButtonStates();
    updateStatusDisplay();
    
    // loading message hide
    document.getElementById('loadingDiv').style.display = 'none';
    
    try {
        // URL collected 初始
        const initialUrls = await collectInitialUrls();
        //console.log(`📋 [DEBUG] collected to ${initialUrls.length} URL item(s) 初始`);
        addLogEntry(`📋 collected to ${initialUrls.length} URL scan item(s) 初始`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ URL scan to of has 没找可', 'warning');
            return;
        }
        
        // 🔥 URL record column(s) 初始表（ item(s) before 几）
        if (initialUrls.length > 0) {
            const urlsToShow = initialUrls.slice(0, 5);
            addLogEntry(`🎯 scan target 初始: ${urlsToShow.join(', ')}${initialUrls.length > 5 ? ` 等${initialUrls.length}个URL` : ''}`, 'info');
        }
        
        // scan configuration record
        addLogEntry(`⚙️ scan configuration - maximum 深度: ${scanConfig.maxDepth}, 并发数: ${scanConfig.concurrency}, timeout: ${scanConfig.timeout}ms`, 'info');
        
        // start scan layer(s) 分
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
    pauseBtn.textContent = isPaused ? 'resume scan' : 'pause scan';
    
    if (isPaused) {
        addLogEntry('⏸️ pause scan 已', 'warning');
        addLogEntry(`📊 pause status when: 已scan${scannedUrls.size}URL item(s)，current 深度${currentDepth}`, 'info');
    } else {
        addLogEntry('▶️ continue scan 已', 'success');
    }
}

function stopScan() {
    isScanRunning = false;
    isPaused = false;
    addLogEntry('⏹️ stop scan user 手动', 'warning');
    addLogEntry(`📊 stop status when: 已scan${scannedUrls.size}URL item(s)，current 深度${currentDepth}`, 'info');
    updateButtonStates();
    completeScan();
}

// -------------------- URL collected 初始 --------------------
async function collectInitialUrls() {
    //console.log('📋 [DEBUG] URL start collected 初始 - scan results get from in 普通');
    
    const urls = new Set();
    
    try {
        // deep scan scan get results configuration from in of 普通
        if (!scanConfig.initialResults) {
            console.warn('⚠️ deep scan scan results not found configuration in 普通，scan page current 将');
            urls.add(scanConfig.baseUrl);
            return Array.from(urls);
        }
        
        const initialResults = scanConfig.initialResults;
        //console.log('📊 [DEBUG] scan results to 找普通:', Object.keys(initialResults));
        console.log('📊 [DEBUG] scan results statistics 普通:', {
            absoluteApis: initialResults.absoluteApis?.length || 0,
            jsFiles: initialResults.jsFiles?.length || 0,
            urls: initialResults.urls?.length || 0,
            domains: initialResults.domains?.length || 0,
            emails: initialResults.emails?.length || 0
        });
        
        // deep scan scan results results as of 将普通作起始
        Object.keys(initialResults).forEach(key => {
            if (scanResults[key] && Array.isArray(initialResults[key])) {
                scanResults[key] = [...initialResults[key]];
            }
        });
        
        // deep scan scan results file collected line(s) from in 普通JS进
        if (scanConfig.scanJsFiles && initialResults.jsFiles) {
            //console.log(`📁 [DEBUG] scan results file collected from 普通JS: ${initialResults.jsFiles.length}  item(s)`);
            for (const jsFile of initialResults.jsFiles) {
                // format 兼容新（object）format and 旧（characters 串）
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] add file JS: ${fullUrl}`);
                }
            }
        }
        
        // deep scan scan results collected page line(s) from in 普通HTML进
        if (scanConfig.scanHtmlFiles && initialResults.urls) {
            //console.log(`🌐 [DEBUG] scan results URL collected from 普通: ${initialResults.urls.length}  item(s)`);
            for (const urlItem of initialResults.urls) {
                // format 兼容新（object）format and 旧（characters 串）
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] URL add page: ${fullUrl}`);
                }
            }
        }
        
        // API interface deep scan scan results collected line(s) from in 普通进
        if (scanConfig.scanApiFiles) {
            // absolute path API
            if (initialResults.absoluteApis) {
                //console.log(`🔗 [DEBUG] scan results API collected from 普通绝对: ${initialResults.absoluteApis.length}  item(s)`);
                for (const apiItem of initialResults.absoluteApis) {
                    // format 兼容新（object）format and 旧（characters 串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] API add 绝对: ${fullUrl}`);
                    }
                }
            }
            
            // relative path API
            if (initialResults.relativeApis) {
                //console.log(`🔗 [DEBUG] scan results API collected from 普通相对: ${initialResults.relativeApis.length}  item(s)`);
                for (const apiItem of initialResults.relativeApis) {
                    // format 兼容新（object）format and 旧（characters 串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] API add 相对: ${fullUrl}`);
                    }
                }
            }
        }
        
        // URL collected if any to has 没，add page current as 作备用
        if (urls.size === 0) {
            console.warn('⚠️ scan results URL collected any to from in 普通未，add page current');
            urls.add(scanConfig.baseUrl);
        }
        
        //console.log(`📊 [DEBUG] URL complete collected 初始，collected total to ${urls.size} URL item(s)`);
        //console.log(`📊 [DEBUG] results quantity 初始: ${Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
        return Array.from(urls);
        
    } catch (error) {
        console.error('❌ URL failed collected 初始:', error);
        // add page current error occurred as when 作备用
        urls.add(scanConfig.baseUrl);
        return Array.from(urls);
    }
}

// -------------------- scan layer(s) 分 --------------------
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        
        if (currentUrls.length === 0) {
            //console.log(`# ${depth} URL scan layer(s) has 没需要`);
            break;
        }
        
        //console.log(`🔍 start # ${depth} scan layer(s)，URL quantity: ${currentUrls.length}`);
        addLogEntry(`🔍 start # ${depth} scan layer(s)，URL quantity: ${currentUrls.length}`, 'info');
        
        // 🔥 URL scan record current layer(s) column(s) of 要表（ item(s) before 几）
        if (currentUrls.length > 0) {
            const urlsToShow = currentUrls.slice(0, 3);
            addLogEntry(`📋 # ${depth} scan target layer(s): ${urlsToShow.join(', ')}${currentUrls.length > 3 ? ` 等${currentUrls.length}个URL` : ''}`, 'info');
        }
        
        // URL scan batch
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        // URL layer(s) 准备下一
        currentUrls = newUrls.filter(url => !scannedUrls.has(url));
        
        //console.log(`✅ # ${depth} scan complete layer(s)，URL found 新: ${currentUrls.length}  item(s)`);
        addLogEntry(`✅ # ${depth} scan complete layer(s)，URL found 新: ${currentUrls.length}  item(s)`, 'success');
        
        // 🔥 URL scan quantity record layer(s) of 下一将要
        if (currentUrls.length > 0 && depth < scanConfig.maxDepth) {
            addLogEntry(`🔄 # 准备 ${depth + 1} scan layer(s)，URL scan 待: ${currentUrls.length}  item(s)`, 'info');
        }
        
        // update display
        updateResultsDisplay();
        updateStatusDisplay();
    }
}

// -------------------- URL scan batch --------------------
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    // use column(s) and 队并发控制
    const queue = [...urls];
    const activeWorkers = new Set();
    
    // display when 实计数器
    let lastDisplayUpdate = 0;
    const displayUpdateInterval = 500; // 5 seconds update display time(s) 每0.最多一，response 提高速度
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `# ${depth} scan layer(s)`);
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // URL content get
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
                            // 🚀 performance optimization：scan log remove of 频繁
                            // addLogEntry(`🔍 scan 正在: ${url}`, 'info');
                            
                            // information extracted
                            const extractedData = await extractFromContent(content, url);
                            const hasNewData = mergeResults(extractedData);
                            
                            // 🔥 extracted results log record
                            if (hasNewData) {
                                const newDataCount = Object.values(extractedData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                                addLogEntry(`✅ from ${url} extracted to ${newDataCount} data item(s) item(s) 新`, 'success');
                            } else {
                                addLogEntry(`ℹ️ from ${url} not found data 新`, 'info');
                            }
                            
                            // 🚀 performance optimization：update display 减少频率，update process batch when 只在
                            if (hasNewData) {
                                // URL update process display item(s) time(s) 每10才一
                                if (processedCount % 10 === 0) {
                                    throttledUpdateDisplay();
                                }
                            }
                            
                            // URL collected 新
                            const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                            if (discoveredUrls.length > 0) {
                                addLogEntry(`🔗 from ${url} found ${discoveredUrls.length} URL item(s) 新`, 'info');
                            }
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        } else {
                            // 🔥 content record of 无情况
                            addLogEntry(`⚠️ ${url} return content empty 或无法访问`, 'warning');
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                        // 🔥 error add log record
                        addLogEntry(`❌ scan failed: ${url} - ${error.message}`, 'error');
                    } finally {
                        processedCount++;
                        // 🚀 performance optimization：update 减少进度频率，URL update item(s) time(s) 每5一
                        if (processedCount % 5 === 0 || processedCount === totalUrls) {
                            updateProgressDisplay(processedCount, totalUrls, `# ${depth} scan layer(s)`);
                        }
                        activeWorkers.delete(workerPromise);
                    }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 performance optimization：add delay 控制并发数并
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // add delay，request 避免过快导致系统卡顿
            if (activeWorkers.size >= maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 🚀 delay to 增加200ms
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

// -------------------- URL content get --------------------
async function fetchUrlContent(url) {
    try {
        //console.log(`🔥 deep scan - request script background via 准备: ${url}`);
        
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
        // content text filter 非
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf')) {
            // 🔥 add content filter log type
            addLogEntry(`🚫 skip content text 非 (${contentType}) - ${url}`, 'info');
            return null;
        }
        
        const text = await response.text();
        // 🔥 success add content get log of
        const contentSize = text.length;
        const sizeText = contentSize > 1024 ? `${Math.round(contentSize / 1024)}KB` : `${contentSize}B`;
        addLogEntry(`📥 success content get (${sizeText}) - ${url}`, 'info');
        return text;
        
    } catch (error) {
        console.error(`无法访问 ${url}:`, error);
        // 🔥 error add network log
        addLogEntry(`❌ error network: ${error.message} - ${url}`, 'error');
        return null;
    }
}

// -------------------- request background --------------------
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

// -------------------- URL content collected from --------------------
async function collectUrlsFromContent(content, baseUrl) {
    const urls = new Set();
    
    try {
        const extractedData = await extractFromContent(content, baseUrl);
        
        // file collected JS
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
        
        // collected page HTML
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
        
        // API interface collected - parse use intelligent
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
                    // 🔥 parse use intelligent of 优先 URL
                    let fullUrl;
                    if (typeof apiItem === 'object' && apiItem.resolvedUrl) {
                        fullUrl = apiItem.resolvedUrl;
                        //console.log('🎯 [DEBUG] URL parse use intelligent:', apiItem.value, '->', fullUrl);
                    } else {
                        const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                        const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                        fullUrl = await resolveUrl(api, baseUrl, sourceUrl);
                        //console.log('🔄 [DEBUG] URL parse use 传统:', api, '->', fullUrl);
                    }
                    
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ URL failed content collected from:', error);
    }
    
    return Array.from(urls);
}

// -------------------- results 合并 --------------------
function mergeResults(newResults) {
    // batch use 合并，update of 避免频繁DOM
    return batchMergeResults(newResults);
}

// -------------------- save results --------------------
async function saveResultsToStorage() {
    try {
        // domain 生成键
        let domainKey = 'unknown__results';
        if (scanConfig?.baseUrl) {
            try {
                const hostname = new URL(scanConfig.baseUrl).hostname;
                domainKey = `${hostname}__results`;
            } catch (e) {
                console.warn('failed domain parse，default use 键:', e);
            }
        }
        
        //console.log('📝 [DEBUG] use 存储键:', domainKey);
        
        // scan results get current from of IndexedDB普通
        const existingResults = await window.IndexedDBManager.loadScanResults(scanConfig.baseUrl) || {};
        
        // deep scan scan results results to in 合并普通
        const mergedResults = { ...existingResults };
        
        // deep scan scan results results to in of 将合并普通
        Object.keys(scanResults).forEach(key => {
            if (!mergedResults[key]) {
                mergedResults[key] = [];
            }
            
            // results of has 创建现键集合，for 去重
            const existingKeys = new Set();
            mergedResults[key].forEach(item => {
                const itemKey = typeof item === 'object' ? item.value : item;
                existingKeys.add(itemKey);
            });
            
            // results new item(s) 合并
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
        
        // add scan data 元
        mergedResults.scanMetadata = {
            ...existingResults.scanMetadata,
            lastScanType: 'deep',
            deepScanComplete: true,
            deepScanTimestamp: Date.now(),
            deepScanUrl: scanConfig.baseUrl,
            totalScanned: scannedUrls.size
        };
        
        // save results to of after 合并IndexedDB，URL information contains digit(s) 置
        const pageTitle = scanConfig.pageTitle || document.title || 'Deep Scan Results';
        // URL basic use as 作存储键，URL results item(s) item(s) of from 但保持每具体源
        await window.IndexedDBManager.saveScanResults(scanConfig.baseUrl, mergedResults, scanConfig.baseUrl, pageTitle);
        
        //console.log('✅ deep scan scan results results to in 已合并主');
        //console.log('📊 存储键:', domainKey);
        console.log('📊 statistics results after 合并:', {
            总数: Object.values(mergedResults).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            深度扫描贡献: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        console.error('❌ failed save results:', error);
    }
}

// -------------------- scan complete --------------------
async function completeScan() {
    //console.log('🎉 deep scan complete！');
    
    // 🔥 optimization：results process all 确保待都被合并
    flushPendingResults();
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalScanned = scannedUrls.size;
    
    addLogEntry('🎉 deep scan complete！', 'success');
    addLogEntry(`📊 scan statistics: scan 了 ${totalScanned} file item(s)，extracted 了 ${totalResults} project item(s)`, 'success');
    
    // 🔥 optimization：statistics log 减少详细，避免卡顿
    const nonEmptyCategories = Object.entries(scanResults).filter(([key, items]) => items && items.length > 0);
    if (nonEmptyCategories.length > 0) {
        const topCategories = nonEmptyCategories
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 5) // display category item(s) of before 只5最多
            .map(([key, items]) => `${key}: ${items.length} item(s)`);
        addLogEntry(`📈 found main: ${topCategories.join(', ')}`, 'success');
    }
    
    // 🔥 scan record when 耗
    const scanDuration = Date.now() - (scanConfig.timestamp || Date.now());
    const durationText = scanDuration > 60000 ? 
        `${Math.floor(scanDuration / 60000)}分${Math.floor((scanDuration % 60000) / 1000)} seconds` : 
        `${Math.floor(scanDuration / 1000)} seconds`;
    addLogEntry(`⏱️ scan when 耗: ${durationText}`, 'info');
    
    // save results to 存储（scan results to in 合并主）
    await saveResultsToStorage();
    
    // deep scan complete page 通知主，update display 让其
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
                //console.log('closed page 主可能，complete send 无法通知');
            } else {
                //console.log('✅ deep scan complete page 已通知主');
            }
        });
    } catch (error) {
        //console.log('failed complete send 通知:', error);
    }
    
    // 🔥 optimization：update final UI
    performDisplayUpdate();
    
    // update display 进度
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
    
    // 🔥 optimization：clear memory cache and
    setTimeout(() => {
        cleanupMemory();
    }, 5000); // clear memory 5 seconds after
}

// cleanup memory function
function cleanupMemory() {
    //console.log('🧹 clear memory start ...');
    
    // URL cleanup content cache， item(s) of 只保留最近100
    if (urlContentCache.size > 100) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-100);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 URL cleanup cache，保留 ${toKeep.length}  item(s) record(s) 目`);
    }
    
    // cleanup results process 待
    Object.keys(pendingResults).forEach(key => {
        if (pendingResults[key]) {
            pendingResults[key].clear();
        }
    });
    
    // cleanup update column(s) 队
    updateQueue.length = 0;
    
    // cleanup when 定器
    if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
    }
    
    //console.log('✅ cleanup complete memory');
}

// -------------------- update function UI --------------------
function updateButtonStates() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isScanRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = 'scanning ...';
        pauseBtn.textContent = isPaused ? 'resume scan' : 'pause scan';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = 'start scan';
        pauseBtn.textContent = 'pause scan';
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
    // 🚀 process debounce：update record(s) 避免频繁进度
    if (updateProgressDisplay.pending) return;
    updateProgressDisplay.pending = true;
    
    // 🚀 update delay use requestAnimationFrame，scroll 避免阻塞
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
    // results process all of 先合并待
    flushPendingResults();
    
    //console.log(`🔍 [DEBUG] deep scan update start results display ... (#${displayUpdateCount} update time(s))`);
    
    // 🔥 log debug output 减少，console 避免卡顿
    if (displayUpdateCount % 10 === 0) { // update log output time(s) 每10才详细
        //console.log('🔍 [DEBUG] API data check:');
        //console.log('  - absoluteApis:', scanResults.absoluteApis?.length || 0, ' item(s)');
        //console.log('  - relativeApis:', scanResults.relativeApis?.length || 0, ' item(s)');
        if (scanResults.absoluteApis?.length > 0) {
            //console.log('  - absoluteApis example:', scanResults.absoluteApis.slice(0, 3));
        }
        if (scanResults.relativeApis?.length > 0) {
            //console.log('  - relativeApis example:', scanResults.relativeApis.slice(0, 3));
        }
    }
    
    // 🔥 API fixed display 问题：element of 正确ID映射
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
    
    // 🔥 fixed display 逻辑：element use of 正确ID
    Object.keys(categoryMapping).forEach(key => {
        const items = scanResults[key] || [];
        const mapping = categoryMapping[key];
        
        // 🔥 optimization：log debug 减少，output when 只在必要
        if (displayUpdateCount % 20 === 0) {
            //console.log(`🔍 [DEBUG] process category ${key}: ${items.length} project item(s)`);
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
            
            // 🔥 optimization：update content column(s) when 只在表真正改变才DOM
            const listElement = document.getElementById(mapping.listId);
            if (listElement) {
                const currentItemCount = listElement.children.length;
                if (currentItemCount !== items.length) {
                    // update documentation batch use 片段DOM
                    const fragment = document.createDocumentFragment();
                    items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'result-item';
                        
                        // 🔥 fixed：use display project item(s) line(s) of 每自己sourceUrl进悬停，URL parse intelligent of 支持
                        if (typeof item === 'object' && item !== null) {
                            // process object structure of with has sourceUrl化 {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                            if (item.value !== undefined && item.sourceUrl) {
                                const itemValue = String(item.value);
                                const itemSourceUrl = String(item.sourceUrl);
                                
                                // 🔥 新增：relative path API URL parse if intelligent of yes has 且，information display 额外
                                if (key === 'relativeApis' && item.resolvedUrl) {
                                    li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                                    li.title = `original值: ${itemValue}
parse intelligent: ${item.resolvedUrl}
from 源: ${itemSourceUrl}`;
                                } else {
                                    // display 只值，URL directly display from 不源，display when 仅在悬停
                                    li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                                    li.title = `from 源: ${itemSourceUrl}`;
                                }
                                li.style.cssText = 'padding: 5px 0;';
                            } else if (item.url || item.path || item.value || item.content) {
                                // object format 兼容其他
                                const displayValue = item.url || item.path || item.value || item.content || JSON.stringify(item);
                                li.textContent = String(displayValue);
                                li.title = String(displayValue);
                            } else {
                                const jsonStr = JSON.stringify(item);
                                li.textContent = jsonStr;
                                li.title = jsonStr;
                            }
                        } else {
                            // type if characters yes 串或其他基本，directly display
                            const displayValue = String(item);
                            li.textContent = displayValue;
                            li.title = displayValue;
                        }
                        
                        fragment.appendChild(li);
                    });
                    
                    // update time(s) 一性DOM
                    listElement.innerHTML = '';
                    listElement.appendChild(fragment);
                }
            }
        }
    });
    
    // 🔥 custom regex results process - delete feature resume of 被
    //console.log('🔍 [DEBUG] custom regex start results process ...');
    Object.keys(scanResults).forEach(key => {
        if (key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🎯 [DEBUG] custom regex found results: ${key}, quantity: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
    
    // 🔥 results process category of 其他未预定义
    Object.keys(scanResults).forEach(key => {
        // custom regex skip process category of and 已预定义
        if (!categoryMapping[key] && !key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🆕 [DEBUG] found results new category: ${key}, quantity: ${scanResults[key].length}`);
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
            
            // 🔥 fixed：use display project item(s) line(s) of 每自己sourceUrl进悬停，URL parse intelligent of 支持
            if (typeof item === 'object' && item !== null) {
                // process object structure of with has sourceUrl化 {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                if (item.value !== undefined && item.sourceUrl) {
                    const itemValue = String(item.value);
                    const itemSourceUrl = String(item.sourceUrl);
                    
                    // 🔥 新增：relative path API URL parse if intelligent of yes has 且，information display 额外
                    if (key === 'relativeApis' && item.resolvedUrl) {
                        li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                        li.title = `original值: ${itemValue}
parse intelligent: ${item.resolvedUrl}
from 源: ${itemSourceUrl}`;
                    } else {
                        // display 只值，URL directly display from 不源，display when 仅在悬停
                        li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                        li.title = `from 源: ${itemSourceUrl}`;
                    }
                    li.style.cssText = 'padding: 5px 0;';
                } else {
                    // object format 兼容其他
                    const jsonStr = JSON.stringify(item);
                    li.textContent = jsonStr;
                    li.title = jsonStr;
                }
            } else {
                // type if characters yes 串或其他基本，directly display
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
    
    // 🚀 performance optimization：filter log of 只最频繁，information 保留重要
    if (type === 'info' && (
        message.includes('success content get') ||
        message.includes('skip content text 非')
    )) {
        return; // skip log of 只这些最频繁
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // add to 缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // refresh log batch（降低频率）
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

// 🚀 optimization log function display of - operation 减少DOM频率
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 🚀 process debounce：update 避免频繁DOM
    if (updateLogDisplay.pending) return;
    updateLogDisplay.pending = true;
    
    // log display record(s) of 只最近20，进一步减少DOM负载
    const recentLogs = logEntries.slice(-20);
    
    // update check no yes 需要（operation of 避免不必要DOM）
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        updateLogDisplay.pending = false;
        return; // log has 没新，update skip
    }
    
    // 🚀 update delay use setTimeout，scroll 避免阻塞
    setTimeout(() => {
        // update documentation batch use 片段
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        // update optimization use requestAnimationFrameDOM
        requestAnimationFrame(() => {
            logSection.innerHTML = '';
            logSection.appendChild(fragment);
            
            // 🚀 optimization scroll：scroll when 只在必要
            if (!logSection.isUserScrolling) {
                logSection.scrollTop = logSection.scrollHeight;
            }
            
            updateLogDisplay.pending = false;
        });
    }, 100); // 100ms delay，update 避免频繁
}

// -------------------- function 工具 --------------------

// function 辅助：relative path parse
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) return null;
        
        // with 确保basePath/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        // URL parse function use line(s) 构造进标准
        const resolved = new URL(relativePath, basePath);
        return resolved.href;
    } catch (error) {
        console.warn('relative path failed parse:', error);
        return null;
    }
}

async function resolveUrl(url, baseUrl, sourceUrl = null) {
    try {
        if (!url) return null;
        
        console.log(`🔍 [URL parsing] start parse: "${url}", URL basic: "${baseUrl}", URL 源: "${sourceUrl}"`);
        
        // URL if yes 已经绝对，return directly
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log(`✅ [URL parsing] URL yes 已绝对: "${url}"`);
            return url;
        }
        
        if (url.startsWith('//')) {
            const result = new URL(baseUrl).protocol + url;
            console.log(`✅ [URL parsing] URL 协议相对: "${url}" -> "${result}"`);
            return result;
        }
        
        // 🔥 fixed：relative path path data extracted get parse line(s) from by 严格照IndexedDB源进
        if (sourceUrl && (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/'))) {
            console.log(`🔍 [URL parsing] relative path detected，data parse use 尝试IndexedDB`);
            
            try {
                // scan data get all IndexedDB
                let allScanData = [];
                
                // method 1: domain data get current directly from IndexedDBManager
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.loadScanResults) {
                        const currentData = await window.IndexedDBManager.loadScanResults(baseUrl);
                        if (currentData && currentData.results) {
                            allScanData.push(currentData);
                            console.log(`✅ [URL parsing] domain data get current to`);
                        }
                    }
                } catch (error) {
                    console.warn('failed domain data get current IndexedDB:', error);
                }
                
                // method 2: scan data get all as 作备选
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.getAllScanResults) {
                        const allData = await window.IndexedDBManager.getAllScanResults();
                        if (Array.isArray(allData)) {
                            allScanData = allScanData.concat(allData);
                            console.log(`✅ [URL parsing] scan data get all to，total ${allData.length}  item(s)`);
                        }
                    }
                } catch (error) {
                    console.warn('failed data get all IndexedDB:', error);
                }
                
                if (allScanData.length > 0) {
                    // to of 构建sourceUrlbasePath映射
                    const sourceUrlToBasePath = new Map();
                    
                    console.log(`🔍 [URL parsing] start analysis ${allScanData.length} scan data item(s) 源`);
                    
                    // scan data all 遍历，off 建立映射系
                    allScanData.forEach((scanData, dataIndex) => {
                        if (!scanData.results) return;
                        
                        // data type all of 遍历，建立 sourceUrl 映射
                        Object.values(scanData.results).forEach(items => {
                            if (Array.isArray(items)) {
                                items.forEach(item => {
                                    if (typeof item === 'object' && item.sourceUrl) {
                                        try {
                                            const sourceUrlObj = new URL(item.sourceUrl);
                                            // base path extracted（filename 去掉）
                                            const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                            const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                            sourceUrlToBasePath.set(item.sourceUrl, correctBaseUrl);
                                            
                                            console.log(`📋 [URL parsing] 映射建立: ${item.sourceUrl} → ${correctBaseUrl}`);
                                        } catch (e) {
                                            console.warn('of 无效sourceUrl:', item.sourceUrl, e);
                                        }
                                    }
                                });
                            }
                        });
                        
                        // add scan data as of 也本身sourceUrl作备选
                        if (scanData.sourceUrl) {
                            try {
                                const sourceUrlObj = new URL(scanData.sourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                sourceUrlToBasePath.set(scanData.sourceUrl, correctBaseUrl);
                                
                                console.log(`📋 [URL parsing] 备选映射: ${scanData.sourceUrl} → ${correctBaseUrl}`);
                            } catch (e) {
                                console.warn('of 无效备选sourceUrl:', scanData.sourceUrl, e);
                            }
                        }
                    });
                    
                    console.log(`📊 [URL parsing] complete 映射建立，total ${sourceUrlToBasePath.size}  item(s) 映射`);
                    
                    // 🔥 method 1：match 精确sourceUrl
                    if (sourceUrlToBasePath.has(sourceUrl)) {
                        const correctBasePath = sourceUrlToBasePath.get(sourceUrl);
                        const resolvedUrl = resolveRelativePath(url, correctBasePath);
                        if (resolvedUrl) {
                            console.log(`🎯 [URL parsing] success match 精确: ${url} → ${resolvedUrl} (基于源: ${sourceUrl})`);
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
                                        console.log(`🎯 [URL parsing] success domain match: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                                        return testUrl;
                                    }
                                }
                            } catch (e) {
                                // URL ignore 无效
                            }
                        }
                    }
                    
                    // 🔥 method 3：URL available any 尝试源
                    for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                        const testUrl = resolveRelativePath(url, basePath);
                        if (testUrl) {
                            console.log(`🎯 [URL parsing] success match general: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                            return testUrl;
                        }
                    }
                }
                
                console.log(`⚠️ [URL parsing] not found match parse intelligent IndexedDB，default method use`);
                
            } catch (error) {
                console.warn('failed path parse intelligent IndexedDB，default method use:', error);
            }
        }
        
        // 🔥 default method：parse directly 基于baseUrl
        try {
            const resolvedUrl = new URL(url, baseUrl).href;
            console.log(`📍 [URL parsing] parse default: ${url} → ${resolvedUrl} (基于: ${baseUrl})`);
            return resolvedUrl;
        } catch (error) {
            console.warn('URL parsing failed default:', error);
            return null;
        }
        
    } catch (error) {
        console.warn('URL parsing failed 完全:', error);
        return null;
    }
}

// domain check as no yes 同一 - all domains subdomain settings and 支持
async function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // scan settings domain get
        const domainSettings = await getDomainScanSettings();
        //console.log('🔍 [deep scan] domain settings current:', domainSettings);
        //console.log('🔍 [deep scan] URL check:', url, 'URL 基准:', baseUrl);
        
        // scan domain all if 允许
        if (domainSettings.allowAllDomains) {
            //console.log(`🌐 [deep scan] domain all 允许: ${urlObj.hostname}`);
            addLogEntry(`🌐 domain all 允许: ${urlObj.hostname}`, 'info');
            return true;
        }
        
        // subdomain scan if 允许
        if (domainSettings.allowSubdomains) {
            const baseHostname = baseUrlObj.hostname;
            const urlHostname = urlObj.hostname;
            
            // subdomain domain check as no yes 同一或
            const isSameOrSubdomain = urlHostname === baseHostname || 
                                    urlHostname.endsWith('.' + baseHostname) ||
                                    baseHostname.endsWith('.' + urlHostname);
            
            if (isSameOrSubdomain) {
                //console.log(`🔗 [deep scan] subdomain 允许: ${urlHostname} (基于 ${baseHostname})`);
                //addLogEntry(`🔗 subdomain 允许: ${urlHostname}`, 'info');
                return true;
            }
        }
        
        // default：domain of 只允许完全相同
        const isSame = urlObj.hostname === baseUrlObj.hostname;
        if (isSame) {
            //console.log(`✅ [deep scan] domain 同: ${urlObj.hostname}`);
        } else {
            //console.log(`❌ [deep scan] domain 不同: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
        }
        return isSame;
        
    } catch (error) {
        console.error('[deep scan] failed domain check:', error);
        return false;
    }
}

// scan settings domain get
async function getDomainScanSettings() {
    try {
        // available if SettingsManager，get settings use 它
        if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
            return await window.SettingsManager.getDomainScanSettings();
        }
        
        // 备用方案：get directly from chrome.storage
        const result = await chrome.storage.local.get(['domainScanSettings']);
        const domainSettings = result.domainScanSettings || {
            allowSubdomains: false,
            allowAllDomains: false
        };
        //console.log('🔍 [deep scan] domain get settings from of storage:', domainSettings);
        return domainSettings;
    } catch (error) {
        console.error('[deep scan] scan settings failed domain get:', error);
        // settings default：domain 只允许同
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

// -------------------- event listen 器 --------------------
document.addEventListener('DOMContentLoaded', initializePage);

// export event 弹窗
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
        
        addLogEntry(`✅ success export JSON: ${filename}`, 'success');
    } catch (error) {
        addLogEntry(`❌ failed export JSON: ${error.message}`, 'error');
    }
}

async function exportAsExcel() {
    try {
        const filename = await generateFileName('xlsx');
        
        // export data check no yes has 可
        const hasData = Object.keys(scanResults).some(key => 
            scanResults[key] && Array.isArray(scanResults[key]) && scanResults[key].length > 0
        );
        
        if (!hasData) {
            addLogEntry(`⚠️ export data has 没可`, 'warning');
            return;
        }
        
        // 生成Excel content format XML
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影工具-deep scan</Author>
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

        // worksheet item(s) class as 每分创建
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

        // data if has 没，worksheet item(s) of empty 创建一
        if (!dataExported) {
            xlsContent += `
 <Worksheet ss:Name="no data">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有to 找任何data</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // download file 创建并
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        addLogEntry(`✅ success export file Excel: ${filename}.xls`, 'success');
        
    } catch (error) {
        addLogEntry(`❌ failed export Excel: ${error.message}`, 'error');
        console.error('error export Excel:', error);
    }
}

// worksheet cleanup name（worksheet special characters limit name has Excel）
function sanitizeSheetName(name) {
    // remove replace characters of 或Excel不允许
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    // limit length（worksheet maximum characters name item(s) Excel31）
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || '未命名';
}

// function XML转义
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// filename 生成：domain __随机数
async function generateFileName(extension = 'json') {
    let domain = 'deep-scan';
    
    try {
        // scan configuration domain get from in 优先目标
        if (scanConfig && scanConfig.baseUrl) {
            const url = new URL(scanConfig.baseUrl);
            domain = url.hostname;
            //console.log('scan configuration domain get to from:', domain);
        } else {
            // 备选方案：URL domain extracted parameters window current from in 目标
            if (window.location && window.location.href) {
                const urlParams = new URLSearchParams(window.location.search);
                const targetUrl = urlParams.get('url');
                if (targetUrl) {
                    const url = new URL(targetUrl);
                    domain = url.hostname;
                    //console.log('URL domain get parameters to from:', domain);
                }
            }
        }
    } catch (e) {
        //console.log('failed domain get，default use name:', e);
        // use as when 间戳作标识
        domain = `deep-scan_${Date.now()}`;
    }
    
    // cleanup domain，remove special characters
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 生成随机数（ digit(s) 6）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${domain}__${randomNum}`;
}

//console.log('✅ [DEBUG] deep scan script window（regex version 统一）complete load');