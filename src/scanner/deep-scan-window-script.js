// ==========================================================
// deep scan窗口脚本（unifiedregexversion）
// allregexunified通through SettingsManager get，无任何硬编code
// ==========================================================

//console.log('🚀 [DEBUG] deep scan窗口脚本（unifiedregexversion）startload...');

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
let maxConcurrency     = 4; // 默认value，会from扩展settingsinread
let requestTimeout     = 3000; // 默认value，会from扩展settingsinread

// day志相关变量 - 优化version
let logEntries         = [];
let maxLogEntries      = 100; // reduceto100条，避免内存占for
let logBuffer          = []; // day志缓冲区
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 500; // 500ms批量刷newday志

// 筛选器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化相关变量
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 300; // 🚀 addto300ms节流，reduce更new频率
let pendingResults     = {};
let batchSize          = 15; // 🚀 add批量处理大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理相关变量
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30秒清理一次内存

// -------------------- 性能优化工具函数 --------------------

// 🚀 内存清理函数
function performMemoryCleanup() {
    //console.log('🧹 execute内存清理...');
    
    // 清理URL内容缓存，只keep最近50个
    if (urlContentCache.size > 50) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-50);
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

// -------------------- unified筛选器load --------------------
async function loadFilters() {
    //console.log('🔍 [DEBUG] startloadunified筛选器...');

    try {
        // load SettingsManager（必须）
        if (typeof window.SettingsManager === 'undefined') {
            await loadScript('src/utils/SettingsManager.js');
        }

        // load PatternExtractor（必须）
        if (typeof window.PatternExtractor === 'undefined') {
            await loadScript('src/scanner/PatternExtractor.js');
        }

        // wait脚本解析
        await new Promise(r => setTimeout(r, 100));

        // 实例化
        if (typeof window.PatternExtractor === 'undefined') {
            throw new Error('PatternExtractor 未loadsuccess');
        }
        patternExtractor = new window.PatternExtractor();

        // 强制loadcustomregex
        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
            patternExtractor.ensureCustomPatternsLoaded();
        }

        // listensettingspageregex更new
        window.addEventListener('regexConfigUpdated', (e) => {
            //console.log('🔄 [DEBUG] receivedregexconfiguration更newevent');
            if (patternExtractor?.updatePatterns) {
                patternExtractor.updatePatterns(e.detail);
            } else if (patternExtractor?.loadCustomPatterns) {
                patternExtractor.loadCustomPatterns(e.detail);
            }
        });

        filtersLoaded = true;
        //console.log('✅ [DEBUG] unified筛选器load完毕');
    } catch (err) {
        console.error('❌ [DEBUG] 筛选器loadfailed:', err);
        filtersLoaded = false;
    }
}

// -------------------- unified内容extract --------------------
async function extractFromContent(content, sourceUrl = 'unknown') {
    //console.log('🔍 [DEBUG] startunified内容extract...');

    if (!patternExtractor || typeof patternExtractor.extractPatterns !== 'function') {
        throw new Error('PatternExtractor.extractPatterns not可for');
    }

    // 确保configurationalreadyload
    if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
        await patternExtractor.ensureCustomPatternsLoaded();
    }

    // useunified入口extract
    const results = await patternExtractor.extractPatterns(content, sourceUrl);

    // 🔥 fix：use IndexedDB data进行智能相对路径解析
    await enhanceRelativePathsWithIndexedDB(results, sourceUrl);

    return results;
}

// -------------------- 智能相对路径解析 --------------------
async function enhanceRelativePathsWithIndexedDB(results, currentSourceUrl) {
    console.log('🔍 [DEBUG] start智能相对路径解析，当before源URL:', currentSourceUrl);
    
    if (!results.relativeApis || results.relativeApis.length === 0) {
        console.log('⚠️ without相对路径APIrequire解析');
        return;
    }
    
    try {
        // 🔥 fix：严格按照IndexedDBdatagetextract来源路径
        const baseUrl = scanConfig?.baseUrl || window.location.origin;
        console.log('🔍 [DEBUG] basicURL:', baseUrl);
        
        // getallscanresultdata，includingdeep scanresult
        let allScanData = [];
        
        // 方法1：尝试get当beforedomainscanresult
        try {
            const currentScanData = await window.IndexedDBManager.loadScanResults(baseUrl);
            if (currentScanData && currentScanData.results) {
                allScanData.push(currentScanData);
                console.log('✅ [DEBUG] getto当beforedomainscanresult');
            }
        } catch (e) {
            console.warn('⚠️ get当beforedomainscanresultfailed:', e);
        }
        
        // 方法2：getallscanresult作为备选
        try {
            const allResults = await window.IndexedDBManager.getAllScanResults();
            if (allResults && Array.isArray(allResults)) {
                allScanData = allScanData.concat(allResults);
                console.log('✅ [DEBUG] gettoallscanresult，共', allResults.length, '个');
            }
        } catch (e) {
            console.warn('⚠️ getallscanresultfailed:', e);
        }
        
        if (allScanData.length === 0) {
            console.log('⚠️ 未found任何 IndexedDB data，use传统拼接方式');
            return;
        }
        
        // 🔥 fix：严格按照IndexedDBin每个data项sourceUrl进行路径解析
        const sourceUrlToBasePath = new Map();
        const itemToSourceUrlMap = new Map(); // new增：建立data项tosourceUrl映射
        
        console.log('🔍 [DEBUG] start分析IndexedDBdata，共', allScanData.length, '个data源');
        
        // 遍历allscandata，建立complete映射关系
        allScanData.forEach((scanData, dataIndex) => {
            if (!scanData.results) return;
            
            console.log(`🔍 [DEBUG] 分析data源 ${dataIndex + 1}:`, {
                url: scanData.url,
                sourceUrl: scanData.sourceUrl,
                domain: scanData.domain,
                pageTitle: scanData.pageTitle
            });
            
            // 遍历allclass型data
            Object.entries(scanData.results).forEach(([category, items]) => {
                if (!Array.isArray(items)) return;
                
                items.forEach(item => {
                    if (typeof item === 'object' && item !== null && item.sourceUrl) {
                        // 🔥 关键fix：usedata项自己sourceUrl
                        const itemSourceUrl = item.sourceUrl;
                        const itemValue = item.value || item.text || item.content;
                        
                        if (itemValue && itemSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(itemSourceUrl);
                                // extractbasic路径（remove文件名）
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(itemSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(itemValue, itemSourceUrl);
                                
                                console.log(`📋 [DEBUG] 映射建立: "${itemValue}" -> "${itemSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ 无效sourceUrl:', itemSourceUrl, e);
                            }
                        }
                    } else if (typeof item === 'string') {
                        // 对于字符串formatdata，usescanresultsourceUrl
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
                                console.warn('⚠️ 无效备选sourceUrl:', fallbackSourceUrl, e);
                            }
                        }
                    }
                });
            });
        });
        
        console.log('📊 [DEBUG] 映射建立complete:', {
            sourceUrlToBasePath: sourceUrlToBasePath.size,
            itemToSourceUrlMap: itemToSourceUrlMap.size
        });
        
        // 🔥 fix：严格按照每个相对路径API来源进行解析
        const enhancedRelativeApis = [];
        
        for (const apiItem of results.relativeApis) {
            const apiValue = typeof apiItem === 'object' ? apiItem.value : apiItem;
            let apiSourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : currentSourceUrl;
            
            console.log(`🔍 [DEBUG] 处理相对路径API: "${apiValue}", 源URL: "${apiSourceUrl}"`);
            
            let resolvedUrl = null;
            let usedSourceUrl = null;
            
            // 🔥 方法1：严格按照data项sourceUrl进行解析
            if (itemToSourceUrlMap.has(apiValue)) {
                const exactSourceUrl = itemToSourceUrlMap.get(apiValue);
                if (sourceUrlToBasePath.has(exactSourceUrl)) {
                    const basePath = sourceUrlToBasePath.get(exactSourceUrl);
                    resolvedUrl = resolveRelativePath(apiValue, basePath);
                    usedSourceUrl = exactSourceUrl;
                    console.log('✅ [精确match] founddata项确切来源:', apiValue, '->', resolvedUrl, '(源:', exactSourceUrl, ')');
                }
            }
            
            // 🔥 方法2：if精确matchfailed，useAPI项目自带sourceUrl
            if (!resolvedUrl && apiSourceUrl && sourceUrlToBasePath.has(apiSourceUrl)) {
                const basePath = sourceUrlToBasePath.get(apiSourceUrl);
                resolvedUrl = resolveRelativePath(apiValue, basePath);
                usedSourceUrl = apiSourceUrl;
                console.log('✅ [directlymatch] useAPI项目sourceUrl:', apiValue, '->', resolvedUrl, '(源:', apiSourceUrl, ')');
            }
            
            // 🔥 方法3：if还是failed，尝试查找相似源URL（domainmatch）
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
                                console.log('✅ [domainmatch] found同domain源URL:', apiValue, '->', resolvedUrl, '(源:', sourceUrl, ')');
                                break;
                            }
                        }
                    } catch (e) {
                        // 忽略无效URL
                    }
                }
            }
            
            // 🔥 方法4：最后备选方案，usebasicURL拼接
            if (!resolvedUrl) {
                try {
                    if (apiValue.startsWith('./')) {
                        resolvedUrl = baseUrl + apiValue.substring(1); // remove.，keep/
                    } else if (apiValue.startsWith('../')) {
                        // 简单处理上级目录
                        const upLevels = (apiValue.match(/\.\.\//g) || []).length;
                        const remainingPath = apiValue.replace(/\.\.\//g, '');
                        const baseUrlObj = new URL(baseUrl);
                        const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                        
                        // 向上mobile指定层级
                        for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                            pathParts.pop();
                        }
                        
                        resolvedUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                    } else if (!apiValue.startsWith('/') && !apiValue.startsWith('http')) {
                        resolvedUrl = baseUrl + '/' + apiValue;
                    } else {
                        resolvedUrl = apiValue;
                    }
                    
                    // 清理多余斜杠
                    resolvedUrl = resolvedUrl.replace(/\/+/g, '/').replace(':/', '://');
                    usedSourceUrl = baseUrl;
                    
                    console.log('🔄 [备选解析] usebasicURL拼接:', apiValue, '->', resolvedUrl);
                } catch (e) {
                    resolvedUrl = apiValue; // keep原value
                    usedSourceUrl = currentSourceUrl;
                    console.warn('⚠️ [解析failed] keep原value:', apiValue, e.message);
                }
            }
            
            // keep原始format，add解析后 URL and实际use源URL
            if (typeof apiItem === 'object') {
                enhancedRelativeApis.push({
                    ...apiItem,
                    resolvedUrl: resolvedUrl,
                    actualSourceUrl: usedSourceUrl || apiItem.sourceUrl // record实际use源URL
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
        
        // 更newresult
        results.relativeApis = enhancedRelativeApis;
        
        console.log('✅ [智能解析] 相对路径解析complete，处理了', enhancedRelativeApis.length, '个相对路径');
        console.log('📊 [智能解析] 解析统计:', {
            总数: enhancedRelativeApis.length,
            成功解析: enhancedRelativeApis.filter(item => item.resolvedUrl && item.resolvedUrl !== item.value).length,
            使用IndexedDB数据: enhancedRelativeApis.filter(item => item.actualSourceUrl && item.actualSourceUrl !== currentSourceUrl).length
        });
        
    } catch (error) {
        console.error('❌ 智能相对路径解析failed:', error);
        // 出错时keep原始datanot变
    }
}

// 辅助函数：解析相对路径
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) {
            console.warn('⚠️ 相对路径解析parameter无效:', { relativePath, basePath });
            return null;
        }
        
        console.log(`🔧 [解析] start解析相对路径: "${relativePath}" 基于 "${basePath}"`);
        
        // 确保basePath以/ending
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        let resolvedPath;
        
        if (relativePath.startsWith('./')) {
            // 当before目录：./file.js -> basePath + file.js
            resolvedPath = basePath + relativePath.substring(2);
            console.log(`🔧 [解析] 当before目录解析: "${relativePath}" -> "${resolvedPath}"`);
        } else if (relativePath.startsWith('../')) {
            // 上级目录：../file.js -> require处理路径层级
            const upLevels = (relativePath.match(/\.\.\//g) || []).length;
            const remainingPath = relativePath.replace(/\.\.\//g, '');
            
            console.log(`🔧 [解析] 上级目录解析: 向上${upLevels}级, 剩余路径: "${remainingPath}"`);
            
            try {
                const baseUrlObj = new URL(basePath);
                const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                
                console.log(`🔧 [解析] basic路径部分:`, pathParts);
                
                // 向上mobile指定层级
                for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                    pathParts.pop();
                }
                
                console.log(`🔧 [解析] 向上mobile后路径部分:`, pathParts);
                
                resolvedPath = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                console.log(`🔧 [解析] 上级目录最终解析: "${relativePath}" -> "${resolvedPath}"`);
            } catch (e) {
                console.warn('⚠️ 上级目录解析failed，use简单方法:', e);
                // 简单处理方式
                const baseUrl = basePath.split('/').slice(0, 3).join('/'); // protocol://host
                resolvedPath = baseUrl + '/' + remainingPath;
            }
        } else if (!relativePath.startsWith('/') && !relativePath.startsWith('http')) {
            // 相对路径：file.js -> basePath + file.js
            resolvedPath = basePath + relativePath;
            console.log(`🔧 [解析] 相对路径解析: "${relativePath}" -> "${resolvedPath}"`);
        } else {
            // already经是绝对路径
            resolvedPath = relativePath;
            console.log(`🔧 [解析] already是绝对路径: "${relativePath}"`);
        }
        
        // 清理多余斜杠
        const cleanedPath = resolvedPath.replace(/\/+/g, '/').replace(':/', '://');
        
        if (cleanedPath !== resolvedPath) {
            console.log(`🔧 [解析] 路径清理: "${resolvedPath}" -> "${cleanedPath}"`);
        }
        
        console.log(`✅ [解析] 相对路径解析complete: "${relativePath}" -> "${cleanedPath}"`);
        return cleanedPath;
        
    } catch (error) {
        console.warn('❌ 相对路径解析failed:', error, { relativePath, basePath });
        return null;
    }
}

// -------------------- 传统result处理（备for） --------------------
function convertRelativeApisToAbsolute(results) {
    // 🔥 fix：完全移除automaticconvert逻辑，keep绝对路径APIand相对路径API独立性
    // not再将相对路径APIautomaticconvertandaddto绝对路径APIin
    // 这样可以避免意外addnot符合绝对路径APIregex要求data
    
    //console.log('🔍 [DEBUG] APIconvertcomplete（already禁forautomaticconvert）:');
    //console.log('  - keep相对路径API:', results.relativeApis?.length || 0, '个');
    //console.log('  - keep绝对路径API:', results.absoluteApis?.length || 0, '个');
    
    // ifrequireconvert功能，应该inPatternExtractorin通throughregexexpression来实现
    // 而not是in这里进行强制convert
}

// -------------------- 性能优化函数 --------------------
// 节流更new显示
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        // if距离上次更new时间太短，延迟更new
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

// execute显示更new
function performDisplayUpdate() {
    if (isUpdating) return;
    
    isUpdating = true;
    lastUpdateTime = Date.now();
    displayUpdateCount++;
    
    try {
        // use requestAnimationFrame 确保in下一帧更new
        requestAnimationFrame(() => {
            updateResultsDisplay();
            updateStatusDisplay();
            isUpdating = false;
        });
    } catch (error) {
        console.error('显示更newfailed:', error);
        isUpdating = false;
    }
}

// 批量处理result合and
function batchMergeResults(newResults) {
    let hasNewData = false;
    
    // 将newresultaddto待处理队列
    Object.keys(newResults).forEach(key => {
        if (!pendingResults[key]) {
            pendingResults[key] = new Map(); // useMap来storageobject，以value为键避免重复
        }
        
        if (Array.isArray(newResults[key])) {
            newResults[key].forEach(item => {
                if (item) {
                    // 处理结构化object（带sourceUrl）and简单字符串
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
    
    // if有newdata，触发节流更new
    if (hasNewData) {
        throttledUpdateDisplay();
    }
    
    return hasNewData;
}

// 将待处理result合andto主resultin
function flushPendingResults() {
    Object.keys(pendingResults).forEach(key => {
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        // create现有result键集合，for去重
        const existingKeys = new Set();
        scanResults[key].forEach(item => {
            const itemKey = typeof item === 'object' ? item.value : item;
            existingKeys.add(itemKey);
        });
        
        // addnewresult项
        pendingResults[key].forEach((itemData, itemKey) => {
            if (!existingKeys.has(itemKey)) {
                scanResults[key].push(itemData);
            }
        });
        
        // 清空待处理队列
        pendingResults[key].clear();
    });
}

// -------------------- page面initialize --------------------
async function initializePage() {
    //console.log('🔍 [DEBUG] page面initializein...');

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ Chrome扩展APInot可for');
        return;
    }

    await loadFilters();

    try {
        // getbaseUrl（fromscanconfigurationinbaseUrlor当before窗口opener）
        let baseUrl = '';
        if (window.opener) {
            try {
                // 尝试fromopener窗口getURL
                baseUrl = window.opener.location.origin;
            } catch (e) {
                // if跨域访问failed，use默认方式
                console.warn('无法fromopenergetURL，use默认方式');
            }
        }
        
        // fromIndexedDBloaddeep scanconfiguration
        let deepScanConfig = null;
        if (baseUrl) {
            deepScanConfig = await window.IndexedDBManager.loadDeepScanState(baseUrl);
        }
        
        // ifwithoutfoundconfiguration，尝试getall可forconfiguration
        if (!deepScanConfig) {
            console.warn('⚠️ 未found指定URLscanconfiguration，尝试getall可forconfiguration...');
            const allConfigs = await window.IndexedDBManager.getAllDeepScanStates();
            if (allConfigs && allConfigs.length > 0) {
                // use最newconfiguration
                deepScanConfig = allConfigs[allConfigs.length - 1];
                console.log('✅ found可forconfiguration:', deepScanConfig.baseUrl);
            }
        }
        
        if (!deepScanConfig) throw new Error('未foundscanconfiguration');
        scanConfig = deepScanConfig;

        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout  = (scanConfig.timeout * 1000) || 5000;

        updateConfigDisplay();
        initializeScanResults();
    } catch (err) {
        console.error('❌ initializefailed:', err);
    }

    // 绑定buttonevent
    document.getElementById('startBtn')?.addEventListener('click', startScan);
    document.getElementById('pauseBtn')?.addEventListener('click', pauseScan);
    document.getElementById('stopBtn')?.addEventListener('click', stopScan);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('toggleAllBtn')?.addEventListener('click', toggleAllCategories);
    
    // 🚀 add滚动优化：detectuser是否in滚动
    const logSection = document.getElementById('logSection');
    if (logSection) {
        let scrollTimeout;
        logSection.addEventListener('scroll', () => {
            logSection.isUserScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                logSection.isUserScrolling = false;
            }, 1000); // 1秒后认为user停止滚动
        });
        
        // 🚀 优化滚动性能
        logSection.style.willChange = 'scroll-position';
        logSection.style.transform = 'translateZ(0)'; // 启for硬件加速
    }

    // listen扩展message
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
        if (msg.action === 'stopDeepScan') {
            stopScan();
            reply({ success: true });
        }
    });

    // automaticstart
    setTimeout(startScan, 1000);
}

// -------------------- configuration显示 --------------------
function updateConfigDisplay() {
    if (!scanConfig) return;

    document.getElementById('maxDepthDisplay').textContent = scanConfig.maxDepth || 2;
    document.getElementById('concurrencyDisplay').textContent = scanConfig.concurrency || 8;
    document.getElementById('timeoutDisplay').textContent = scanConfig.timeout || 5;
    
    const scanTypes = [];
    if (scanConfig.scanJsFiles) scanTypes.push('JS文件');
    if (scanConfig.scanHtmlFiles) scanTypes.push('HTMLpage面');
    if (scanConfig.scanApiFiles) scanTypes.push('API接口');
    
    document.getElementById('scanTypesDisplay').textContent = scanTypes.join(', ') || '全部';
    document.getElementById('scanInfo').textContent = `目标: ${scanConfig.baseUrl}`;
}

// -------------------- scanresultinitialize --------------------
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

// -------------------- scan控制 --------------------
async function startScan() {
    if (isScanRunning) return;
    
    //console.log('🚀 [DEBUG] startdeep scan...');
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    
    // 更newUIstate
    updateButtonStates();
    updateStatusDisplay();
    
    // 隐藏load提示
    document.getElementById('loadingDiv').style.display = 'none';
    
    try {
        // 收集initialURL
        const initialUrls = await collectInitialUrls();
        //console.log(`📋 [DEBUG] 收集to ${initialUrls.length} 个initialURL`);
        addLogEntry(`📋 收集to ${initialUrls.length} 个initialscanURL`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ withoutfound可scanURL', 'warning');
            return;
        }
        
        // 🔥 recordinitialURL列表（before几个）
        if (initialUrls.length > 0) {
            const urlsToShow = initialUrls.slice(0, 5);
            addLogEntry(`🎯 initialscan目标: ${urlsToShow.join(', ')}${initialUrls.length > 5 ? ` 等${initialUrls.length}个URL` : ''}`, 'info');
        }
        
        // recordscanconfiguration
        addLogEntry(`⚙️ scanconfiguration - 最大deep: ${scanConfig.maxDepth}, and发数: ${scanConfig.concurrency}, 超时: ${scanConfig.timeout}ms`, 'info');
        
        // start分层scan
        await performLayeredScan(initialUrls);
        
        // completescan
        completeScan();
        
    } catch (error) {
        console.error('❌ scanfailed:', error);
        addLogEntry(`❌ scanfailed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
    }
}

function pauseScan() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '继续scan' : '暂停scan';
    
    if (isPaused) {
        addLogEntry('⏸️ scanalready暂停', 'warning');
        addLogEntry(`📊 暂停时state: alreadyscan${scannedUrls.size}个URL，当beforedeep${currentDepth}`, 'info');
    } else {
        addLogEntry('▶️ scanalready继续', 'success');
    }
}

function stopScan() {
    isScanRunning = false;
    isPaused = false;
    addLogEntry('⏹️ user手动停止scan', 'warning');
    addLogEntry(`📊 停止时state: alreadyscan${scannedUrls.size}个URL，当beforedeep${currentDepth}`, 'info');
    updateButtonStates();
    completeScan();
}

// -------------------- initialURL收集 --------------------
async function collectInitialUrls() {
    //console.log('📋 [DEBUG] start收集initialURL - from普通scanresultinget');
    
    const urls = new Set();
    
    try {
        // fromdeep scanconfigurationinget普通scanresult
        if (!scanConfig.initialResults) {
            console.warn('⚠️ deep scanconfigurationin未found普通scanresult，将scan当beforepage面');
            urls.add(scanConfig.baseUrl);
            return Array.from(urls);
        }
        
        const initialResults = scanConfig.initialResults;
        //console.log('📊 [DEBUG] found普通scanresult:', Object.keys(initialResults));
        console.log('📊 [DEBUG] 普通scanresult统计:', {
            absoluteApis: initialResults.absoluteApis?.length || 0,
            jsFiles: initialResults.jsFiles?.length || 0,
            urls: initialResults.urls?.length || 0,
            domains: initialResults.domains?.length || 0,
            emails: initialResults.emails?.length || 0
        });
        
        // 将普通scanresult作为deep scan起始result
        Object.keys(initialResults).forEach(key => {
            if (scanResults[key] && Array.isArray(initialResults[key])) {
                scanResults[key] = [...initialResults[key]];
            }
        });
        
        // from普通scanresultin收集JS文件进行deep scan
        if (scanConfig.scanJsFiles && initialResults.jsFiles) {
            //console.log(`📁 [DEBUG] from普通scanresult收集JS文件: ${initialResults.jsFiles.length} 个`);
            for (const jsFile of initialResults.jsFiles) {
                // 兼容newformat（object）and旧format（字符串）
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] addJS文件: ${fullUrl}`);
                }
            }
        }
        
        // from普通scanresultin收集HTMLpage面进行deep scan
        if (scanConfig.scanHtmlFiles && initialResults.urls) {
            //console.log(`🌐 [DEBUG] from普通scanresult收集URL: ${initialResults.urls.length} 个`);
            for (const urlItem of initialResults.urls) {
                // 兼容newformat（object）and旧format（字符串）
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] addpage面URL: ${fullUrl}`);
                }
            }
        }
        
        // from普通scanresultin收集API接口进行deep scan
        if (scanConfig.scanApiFiles) {
            // 绝对路径API
            if (initialResults.absoluteApis) {
                //console.log(`🔗 [DEBUG] from普通scanresult收集绝对API: ${initialResults.absoluteApis.length} 个`);
                for (const apiItem of initialResults.absoluteApis) {
                    // 兼容newformat（object）and旧format（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] add绝对API: ${fullUrl}`);
                    }
                }
            }
            
            // 相对路径API
            if (initialResults.relativeApis) {
                //console.log(`🔗 [DEBUG] from普通scanresult收集相对API: ${initialResults.relativeApis.length} 个`);
                for (const apiItem of initialResults.relativeApis) {
                    // 兼容newformat（object）and旧format（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] add相对API: ${fullUrl}`);
                    }
                }
            }
        }
        
        // ifwithout收集to任何URL，add当beforepage面作为备for
        if (urls.size === 0) {
            console.warn('⚠️ from普通scanresultin未收集to任何URL，add当beforepage面');
            urls.add(scanConfig.baseUrl);
        }
        
        //console.log(`📊 [DEBUG] initialURL收集complete，共收集to ${urls.size} 个URL`);
        //console.log(`📊 [DEBUG] initialresult数量: ${Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
        return Array.from(urls);
        
    } catch (error) {
        console.error('❌ 收集initialURLfailed:', error);
        // 出错时add当beforepage面作为备for
        urls.add(scanConfig.baseUrl);
        return Array.from(urls);
    }
}

// -------------------- 分层scan --------------------
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        
        if (currentUrls.length === 0) {
            //console.log(`第 ${depth} 层withoutURLrequirescan`);
            break;
        }
        
        //console.log(`🔍 start第 ${depth} 层scan，URL数量: ${currentUrls.length}`);
        addLogEntry(`🔍 start第 ${depth} 层scan，URL数量: ${currentUrls.length}`, 'info');
        
        // 🔥 record当before层要scanURL列表（before几个）
        if (currentUrls.length > 0) {
            const urlsToShow = currentUrls.slice(0, 3);
            addLogEntry(`📋 第 ${depth} 层scan目标: ${urlsToShow.join(', ')}${currentUrls.length > 3 ? ` 等${currentUrls.length}个URL` : ''}`, 'info');
        }
        
        // 批量scanURL
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        // 准备下一层URL
        currentUrls = newUrls.filter(url => !scannedUrls.has(url));
        
        //console.log(`✅ 第 ${depth} 层scan complete，发现newURL: ${currentUrls.length} 个`);
        addLogEntry(`✅ 第 ${depth} 层scan complete，发现newURL: ${currentUrls.length} 个`, 'success');
        
        // 🔥 record下一层将要scanURL数量
        if (currentUrls.length > 0 && depth < scanConfig.maxDepth) {
            addLogEntry(`🔄 准备第 ${depth + 1} 层scan，待scanURL: ${currentUrls.length} 个`, 'info');
        }
        
        // 更new显示
        updateResultsDisplay();
        updateStatusDisplay();
    }
}

// -------------------- 批量URLscan --------------------
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    // use队列andand发控制
    const queue = [...urls];
    const activeWorkers = new Set();
    
    // 实时显示计数器
    let lastDisplayUpdate = 0;
    const displayUpdateInterval = 500; // 每0.5秒最多更new一次显示，提高响应速度
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层scan`);
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // getURL内容
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
                            // 🚀 性能优化：移除频繁scanday志
                            // addLogEntry(`🔍 正inscan: ${url}`, 'info');
                            
                            // extractinformation
                            const extractedData = await extractFromContent(content, url);
                            const hasNewData = mergeResults(extractedData);
                            
                            // 🔥 recordextractresultday志
                            if (hasNewData) {
                                const newDataCount = Object.values(extractedData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                                addLogEntry(`✅ from ${url} extractto ${newDataCount} 个newdata项`, 'success');
                            } else {
                                addLogEntry(`ℹ️ from ${url} 未发现newdata`, 'info');
                            }
                            
                            // 🚀 性能优化：reduce显示更new频率，只in批量处理时更new
                            if (hasNewData) {
                                // 每处理10个URL才更new一次显示
                                if (processedCount % 10 === 0) {
                                    throttledUpdateDisplay();
                                }
                            }
                            
                            // 收集newURL
                            const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                            if (discoveredUrls.length > 0) {
                                addLogEntry(`🔗 from ${url} 发现 ${discoveredUrls.length} 个newURL`, 'info');
                            }
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        } else {
                            // 🔥 record无内容情况
                            addLogEntry(`⚠️ ${url} return空内容or无法访问`, 'warning');
                        }
                    } catch (error) {
                        console.error(`scan ${url} failed:`, error);
                        // 🔥 add错误day志record
                        addLogEntry(`❌ scanfailed: ${url} - ${error.message}`, 'error');
                    } finally {
                        processedCount++;
                        // 🚀 性能优化：reduceprogress更new频率，每5个URL更new一次
                        if (processedCount % 5 === 0 || processedCount === totalUrls) {
                            updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层scan`);
                        }
                        activeWorkers.delete(workerPromise);
                    }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 性能优化：控制and发数andadd延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // add延迟，避免through快request导致系统卡顿
            if (activeWorkers.size >= maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 🚀 addto200ms延迟
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

// -------------------- URL内容get --------------------
async function fetchUrlContent(url) {
    try {
        //console.log(`🔥 deep scan - 准备通throughbackground脚本request: ${url}`);
        
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
            // 🔥 addHTTP错误day志
            addLogEntry(`⚠️ HTTP ${response.status} - ${url}`, 'warning');
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        // through滤非文本内容
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf')) {
            // 🔥 add内容class型through滤day志
            addLogEntry(`🚫 skip非文本内容 (${contentType}) - ${url}`, 'info');
            return null;
        }
        
        const text = await response.text();
        // 🔥 addsuccessget内容day志
        const contentSize = text.length;
        const sizeText = contentSize > 1024 ? `${Math.round(contentSize / 1024)}KB` : `${contentSize}B`;
        addLogEntry(`📥 successget内容 (${sizeText}) - ${url}`, 'info');
        return text;
        
    } catch (error) {
        console.error(`无法访问 ${url}:`, error);
        // 🔥 addnetwork错误day志
        addLogEntry(`❌ network错误: ${error.message} - ${url}`, 'error');
        return null;
    }
}

// -------------------- backgroundrequest --------------------
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

// -------------------- from内容收集URL --------------------
async function collectUrlsFromContent(content, baseUrl) {
    const urls = new Set();
    
    try {
        const extractedData = await extractFromContent(content, baseUrl);
        
        // 收集JS文件
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
        
        // 收集HTMLpage面
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
        
        // 收集API接口 - use智能解析
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
                    // 🔥 优先use智能解析 URL
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
        console.error('❌ from内容收集URLfailed:', error);
    }
    
    return Array.from(urls);
}

// -------------------- result合and --------------------
function mergeResults(newResults) {
    // use批量合and，避免频繁DOM更new
    return batchMergeResults(newResults);
}

// -------------------- result保存 --------------------
async function saveResultsToStorage() {
    try {
        // generatedomain键
        let domainKey = 'unknown__results';
        if (scanConfig?.baseUrl) {
            try {
                const hostname = new URL(scanConfig.baseUrl).hostname;
                domainKey = `${hostname}__results`;
            } catch (e) {
                console.warn('解析domainfailed，use默认键:', e);
            }
        }
        
        //console.log('📝 [DEBUG] usestorage键:', domainKey);
        
        // fromIndexedDBget当before普通scanresult
        const existingResults = await window.IndexedDBManager.loadScanResults(scanConfig.baseUrl) || {};
        
        // 合anddeep scanresultto普通scanresultin
        const mergedResults = { ...existingResults };
        
        // 将deep scanresult合andto普通scanresultin
        Object.keys(scanResults).forEach(key => {
            if (!mergedResults[key]) {
                mergedResults[key] = [];
            }
            
            // create现有result键集合，for去重
            const existingKeys = new Set();
            mergedResults[key].forEach(item => {
                const itemKey = typeof item === 'object' ? item.value : item;
                existingKeys.add(itemKey);
            });
            
            // 合andnewresult项
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
        
        // addscan元data
        mergedResults.scanMetadata = {
            ...existingResults.scanMetadata,
            lastScanType: 'deep',
            deepScanComplete: true,
            deepScanTimestamp: Date.now(),
            deepScanUrl: scanConfig.baseUrl,
            totalScanned: scannedUrls.size
        };
        
        // 保存合and后resulttoIndexedDB，containsURL位置information
        const pageTitle = scanConfig.pageTitle || document.title || 'Deep Scan Results';
        // usebasicURL作为storage键，butkeep每个result项具体来源URL
        await window.IndexedDBManager.saveScanResults(scanConfig.baseUrl, mergedResults, scanConfig.baseUrl, pageTitle);
        
        //console.log('✅ deep scanresultalready合andto主scanresultin');
        //console.log('📊 storage键:', domainKey);
        console.log('📊 合and后result统计:', {
            总数: Object.values(mergedResults).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            深度扫描贡献: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        console.error('❌ 保存resultfailed:', error);
    }
}

// -------------------- scan complete --------------------
async function completeScan() {
    //console.log('🎉 deepscan complete！');
    
    // 🔥 优化：确保all待处理result都by合and
    flushPendingResults();
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalScanned = scannedUrls.size;
    
    addLogEntry('🎉 deepscan complete！', 'success');
    addLogEntry(`📊 scan统计: scan了 ${totalScanned} 个文件，extract了 ${totalResults} 个项目`, 'success');
    
    // 🔥 优化：reduce详细统计day志，避免卡顿
    const nonEmptyCategories = Object.entries(scanResults).filter(([key, items]) => items && items.length > 0);
    if (nonEmptyCategories.length > 0) {
        const topCategories = nonEmptyCategories
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 5) // 只显示before5个最多class别
            .map(([key, items]) => `${key}: ${items.length}个`);
        addLogEntry(`📈 主要发现: ${topCategories.join(', ')}`, 'success');
    }
    
    // 🔥 recordscan耗时
    const scanDuration = Date.now() - (scanConfig.timestamp || Date.now());
    const durationText = scanDuration > 60000 ? 
        `${Math.floor(scanDuration / 60000)}分${Math.floor((scanDuration % 60000) / 1000)}秒` : 
        `${Math.floor(scanDuration / 1000)}秒`;
    addLogEntry(`⏱️ scan耗时: ${durationText}`, 'info');
    
    // 保存resulttostorage（合andto主scanresultin）
    await saveResultsToStorage();
    
    // notify主page面deepscan complete，让其更new显示
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
                //console.log('主page面可能already关闭，无法sendcompletenotify');
            } else {
                //console.log('✅ alreadynotify主page面deepscan complete');
            }
        });
    } catch (error) {
        //console.log('sendcompletenotifyfailed:', error);
    }
    
    // 🔥 优化：最终更newUI
    performDisplayUpdate();
    
    // 更newprogress显示
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = '✅ deepscan complete！';
        progressText.classList.add('success');
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // 更newbuttonstate
    updateButtonStates();
    
    // 🔥 优化：清理内存and缓存
    setTimeout(() => {
        cleanupMemory();
    }, 5000); // 5秒后清理内存
}

// 内存清理函数
function cleanupMemory() {
    //console.log('🧹 start清理内存...');
    
    // 清理URL内容缓存，只keep最近100个
    if (urlContentCache.size > 100) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-100);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 清理URL缓存，keep ${toKeep.length} 个条目`);
    }
    
    // 清理待处理result
    Object.keys(pendingResults).forEach(key => {
        if (pendingResults[key]) {
            pendingResults[key].clear();
        }
    });
    
    // 清理更new队列
    updateQueue.length = 0;
    
    // 清理定时器
    if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
    }
    
    //console.log('✅ 内存清理complete');
}

// -------------------- UI更new函数 --------------------
function updateButtonStates() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isScanRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = 'scanning...';
        pauseBtn.textContent = isPaused ? '继续scan' : '暂停scan';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = 'startscan';
        pauseBtn.textContent = '暂停scan';
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
    // 🚀 防抖处理：避免频繁更newprogress条
    if (updateProgressDisplay.pending) return;
    updateProgressDisplay.pending = true;
    
    // 🚀 userequestAnimationFrame延迟更new，避免阻塞滚动
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
    // 先合andall待处理result
    flushPendingResults();
    
    //console.log(`🔍 [DEBUG] start更newdeep scanresult显示... (第${displayUpdateCount}次更new)`);
    
    // 🔥 reduce调试day志输出，避免控制台卡顿
    if (displayUpdateCount % 10 === 0) { // 每10次更new才输出详细day志
        //console.log('🔍 [DEBUG] APIdatacheck:');
        //console.log('  - absoluteApis:', scanResults.absoluteApis?.length || 0, '个');
        //console.log('  - relativeApis:', scanResults.relativeApis?.length || 0, '个');
        if (scanResults.absoluteApis?.length > 0) {
            //console.log('  - absoluteApis example:', scanResults.absoluteApis.slice(0, 3));
        }
        if (scanResults.relativeApis?.length > 0) {
            //console.log('  - relativeApis example:', scanResults.relativeApis.slice(0, 3));
        }
    }
    
    // 🔥 fixAPI显示issue：正确元素ID映射
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
    
    // 🔥 fix显示逻辑：use正确元素ID
    Object.keys(categoryMapping).forEach(key => {
        const items = scanResults[key] || [];
        const mapping = categoryMapping[key];
        
        // 🔥 优化：reduce调试day志，只in必要时输出
        if (displayUpdateCount % 20 === 0) {
            //console.log(`🔍 [DEBUG] 处理class别 ${key}: ${items.length} 个项目`);
        }
        
        if (items.length > 0) {
            // 显示容器
            const resultDiv = document.getElementById(mapping.containerId);
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }
            
            // 更new计数
            const countElement = document.getElementById(mapping.countId);
            if (countElement && countElement.textContent !== items.length.toString()) {
                countElement.textContent = items.length;
            }
            
            // 🔥 优化：只in列表内容真正改变时才更newDOM
            const listElement = document.getElementById(mapping.listId);
            if (listElement) {
                const currentItemCount = listElement.children.length;
                if (currentItemCount !== items.length) {
                    // usedocument片段批量更newDOM
                    const fragment = document.createDocumentFragment();
                    items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'result-item';
                        
                        // 🔥 fix：use每个项目自己sourceUrl进行悬停显示，support智能解析URL
                        if (typeof item === 'object' && item !== null) {
                            // 处理带有sourceUrl结构化object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                            if (item.value !== undefined && item.sourceUrl) {
                                const itemValue = String(item.value);
                                const itemSourceUrl = String(item.sourceUrl);
                                
                                // 🔥 new增：if是相对路径API且有智能解析URL，显示额外information
                                if (key === 'relativeApis' && item.resolvedUrl) {
                                    li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                                    li.title = `原始值: ${itemValue}
智能解析: ${item.resolvedUrl}
来源: ${itemSourceUrl}`;
                                } else {
                                    // 只显示value，notdirectly显示来源URL，仅in悬停时显示
                                    li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                                    li.title = `来源: ${itemSourceUrl}`;
                                }
                                li.style.cssText = 'padding: 5px 0;';
                            } else if (item.url || item.path || item.value || item.content) {
                                // 兼容其他objectformat
                                const displayValue = item.url || item.path || item.value || item.content || JSON.stringify(item);
                                li.textContent = String(displayValue);
                                li.title = String(displayValue);
                            } else {
                                const jsonStr = JSON.stringify(item);
                                li.textContent = jsonStr;
                                li.title = jsonStr;
                            }
                        } else {
                            // if是字符串or其他基本class型，directly显示
                            const displayValue = String(item);
                            li.textContent = displayValue;
                            li.title = displayValue;
                        }
                        
                        fragment.appendChild(li);
                    });
                    
                    // 一次性更newDOM
                    listElement.innerHTML = '';
                    listElement.appendChild(fragment);
                }
            }
        }
    });
    
    // 🔥 处理customregexresult - 恢复by删除功能
    //console.log('🔍 [DEBUG] start处理customregexresult...');
    Object.keys(scanResults).forEach(key => {
        if (key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🎯 [DEBUG] 发现customregexresult: ${key}, 数量: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
    
    // 🔥 处理其他未预定义resultclass别
    Object.keys(scanResults).forEach(key => {
        // skipalready处理预定义class别andcustomregex
        if (!categoryMapping[key] && !key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🆕 [DEBUG] 发现newresultclass别: ${key}, 数量: ${scanResults[key].length}`);
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
        title.innerHTML = `🔍 ${key.replace('custom_', 'custom-')} (<span id="${key}Count">0</span>)`;
        
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
            
            // 🔥 fix：use每个项目自己sourceUrl进行悬停显示，support智能解析URL
            if (typeof item === 'object' && item !== null) {
                // 处理带有sourceUrl结构化object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                if (item.value !== undefined && item.sourceUrl) {
                    const itemValue = String(item.value);
                    const itemSourceUrl = String(item.sourceUrl);
                    
                    // 🔥 new增：if是相对路径API且有智能解析URL，显示额外information
                    if (key === 'relativeApis' && item.resolvedUrl) {
                        li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                        li.title = `原始值: ${itemValue}
智能解析: ${item.resolvedUrl}
来源: ${itemSourceUrl}`;
                    } else {
                        // 只显示value，notdirectly显示来源URL，仅in悬停时显示
                        li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                        li.title = `来源: ${itemSourceUrl}`;
                    }
                    li.style.cssText = 'padding: 5px 0;';
                } else {
                    // 兼容其他objectformat
                    const jsonStr = JSON.stringify(item);
                    li.textContent = jsonStr;
                    li.title = jsonStr;
                }
            } else {
                // if是字符串or其他基本class型，directly显示
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
    
    // 🚀 性能优化：只through滤最频繁day志，keep重要information
    if (type === 'info' && (
        message.includes('successget内容') ||
        message.includes('skip非文本内容')
    )) {
        return; // 只skip这些最频繁day志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // addto缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // 批量刷newday志（降低频率）
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

// 🚀 优化day志显示函数 - reduceDOM操作频率
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 🚀 防抖处理：避免频繁更newDOM
    if (updateLogDisplay.pending) return;
    updateLogDisplay.pending = true;
    
    // 只显示最近20条day志，进一步reduceDOM负载
    const recentLogs = logEntries.slice(-20);
    
    // check是否require更new（避免not必要DOM操作）
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        updateLogDisplay.pending = false;
        return; // withoutnewday志，skip更new
    }
    
    // 🚀 usesetTimeout延迟更new，避免阻塞滚动
    setTimeout(() => {
        // usedocument片段批量更new
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        // userequestAnimationFrame优化DOM更new
        requestAnimationFrame(() => {
            logSection.innerHTML = '';
            logSection.appendChild(fragment);
            
            // 🚀 优化滚动：只in必要时滚动
            if (!logSection.isUserScrolling) {
                logSection.scrollTop = logSection.scrollHeight;
            }
            
            updateLogDisplay.pending = false;
        });
    }, 100); // 100ms延迟，避免频繁更new
}

// -------------------- 工具函数 --------------------

// 辅助函数：解析相对路径
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) return null;
        
        // 确保basePath以/ending
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        // useURL构造函数进行标准解析
        const resolved = new URL(relativePath, basePath);
        return resolved.href;
    } catch (error) {
        console.warn('相对路径解析failed:', error);
        return null;
    }
}

async function resolveUrl(url, baseUrl, sourceUrl = null) {
    try {
        if (!url) return null;
        
        console.log(`🔍 [URL解析] start解析: "${url}", basicURL: "${baseUrl}", 源URL: "${sourceUrl}"`);
        
        // ifalready经是绝对URL，directlyreturn
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log(`✅ [URL解析] already是绝对URL: "${url}"`);
            return url;
        }
        
        if (url.startsWith('//')) {
            const result = new URL(baseUrl).protocol + url;
            console.log(`✅ [URL解析] 协议相对URL: "${url}" -> "${result}"`);
            return result;
        }
        
        // 🔥 fix：严格按照IndexedDBdatagetextract来源路径进行相对路径解析
        if (sourceUrl && (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/'))) {
            console.log(`🔍 [URL解析] detectto相对路径，尝试useIndexedDBdata解析`);
            
            try {
                // getallIndexedDBscandata
                let allScanData = [];
                
                // 方法1: directlyfromIndexedDBManagerget当beforedomaindata
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.loadScanResults) {
                        const currentData = await window.IndexedDBManager.loadScanResults(baseUrl);
                        if (currentData && currentData.results) {
                            allScanData.push(currentData);
                            console.log(`✅ [URL解析] getto当beforedomaindata`);
                        }
                    }
                } catch (error) {
                    console.warn('get当beforedomainIndexedDBdatafailed:', error);
                }
                
                // 方法2: getallscandata作为备选
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.getAllScanResults) {
                        const allData = await window.IndexedDBManager.getAllScanResults();
                        if (Array.isArray(allData)) {
                            allScanData = allScanData.concat(allData);
                            console.log(`✅ [URL解析] gettoallscandata，共 ${allData.length} 个`);
                        }
                    }
                } catch (error) {
                    console.warn('getallIndexedDBdatafailed:', error);
                }
                
                if (allScanData.length > 0) {
                    // 构建sourceUrltobasePath映射
                    const sourceUrlToBasePath = new Map();
                    
                    console.log(`🔍 [URL解析] start分析 ${allScanData.length} 个scandata源`);
                    
                    // 遍历allscandata，建立映射关系
                    allScanData.forEach((scanData, dataIndex) => {
                        if (!scanData.results) return;
                        
                        // 遍历allclass型data，建立 sourceUrl 映射
                        Object.values(scanData.results).forEach(items => {
                            if (Array.isArray(items)) {
                                items.forEach(item => {
                                    if (typeof item === 'object' && item.sourceUrl) {
                                        try {
                                            const sourceUrlObj = new URL(item.sourceUrl);
                                            // extractbasic路径（remove文件名）
                                            const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                            const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                            sourceUrlToBasePath.set(item.sourceUrl, correctBaseUrl);
                                            
                                            console.log(`📋 [URL解析] 映射建立: ${item.sourceUrl} → ${correctBaseUrl}`);
                                        } catch (e) {
                                            console.warn('无效sourceUrl:', item.sourceUrl, e);
                                        }
                                    }
                                });
                            }
                        });
                        
                        // 也addscandata本身sourceUrl作为备选
                        if (scanData.sourceUrl) {
                            try {
                                const sourceUrlObj = new URL(scanData.sourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                sourceUrlToBasePath.set(scanData.sourceUrl, correctBaseUrl);
                                
                                console.log(`📋 [URL解析] 备选映射: ${scanData.sourceUrl} → ${correctBaseUrl}`);
                            } catch (e) {
                                console.warn('无效备选sourceUrl:', scanData.sourceUrl, e);
                            }
                        }
                    });
                    
                    console.log(`📊 [URL解析] 映射建立complete，共 ${sourceUrlToBasePath.size} 个映射`);
                    
                    // 🔥 方法1：精确matchsourceUrl
                    if (sourceUrlToBasePath.has(sourceUrl)) {
                        const correctBasePath = sourceUrlToBasePath.get(sourceUrl);
                        const resolvedUrl = resolveRelativePath(url, correctBasePath);
                        if (resolvedUrl) {
                            console.log(`🎯 [URL解析] 精确matchsuccess: ${url} → ${resolvedUrl} (基于源: ${sourceUrl})`);
                            return resolvedUrl;
                        }
                    }
                    
                    // 🔥 方法2：domainmatch
                    const targetDomain = baseUrl ? new URL(baseUrl).hostname : null;
                    if (targetDomain) {
                        for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                            try {
                                const sourceDomain = new URL(storedSourceUrl).hostname;
                                if (sourceDomain === targetDomain) {
                                    const testUrl = resolveRelativePath(url, basePath);
                                    if (testUrl) {
                                        console.log(`🎯 [URL解析] domainmatchsuccess: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                                        return testUrl;
                                    }
                                }
                            } catch (e) {
                                // 忽略无效URL
                            }
                        }
                    }
                    
                    // 🔥 方法3：尝试任何可for源URL
                    for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                        const testUrl = resolveRelativePath(url, basePath);
                        if (testUrl) {
                            console.log(`🎯 [URL解析] generalmatchsuccess: ${url} → ${testUrl} (基于源: ${storedSourceUrl})`);
                            return testUrl;
                        }
                    }
                }
                
                console.log(`⚠️ [URL解析] IndexedDB智能解析未foundmatch，use默认方法`);
                
            } catch (error) {
                console.warn('IndexedDB智能路径解析failed，use默认方法:', error);
            }
        }
        
        // 🔥 默认方法：directly基于baseUrl解析
        try {
            const resolvedUrl = new URL(url, baseUrl).href;
            console.log(`📍 [URL解析] 默认解析: ${url} → ${resolvedUrl} (基于: ${baseUrl})`);
            return resolvedUrl;
        } catch (error) {
            console.warn('默认URL解析failed:', error);
            return null;
        }
        
    } catch (error) {
        console.warn('URL解析完全failed:', error);
        return null;
    }
}

// check是否为同一domain - support子domainand全部domainsettings
async function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // getdomainscansettings
        const domainSettings = await getDomainScanSettings();
        //console.log('🔍 [deep scan] 当beforedomainsettings:', domainSettings);
        //console.log('🔍 [deep scan] checkURL:', url, '基准URL:', baseUrl);
        
        // if允许scanalldomain
        if (domainSettings.allowAllDomains) {
            //console.log(`🌐 [deep scan] 允许alldomain: ${urlObj.hostname}`);
            addLogEntry(`🌐 允许alldomain: ${urlObj.hostname}`, 'info');
            return true;
        }
        
        // if允许scan子domain
        if (domainSettings.allowSubdomains) {
            const baseHostname = baseUrlObj.hostname;
            const urlHostname = urlObj.hostname;
            
            // check是否为同一domainor子domain
            const isSameOrSubdomain = urlHostname === baseHostname || 
                                    urlHostname.endsWith('.' + baseHostname) ||
                                    baseHostname.endsWith('.' + urlHostname);
            
            if (isSameOrSubdomain) {
                //console.log(`🔗 [deep scan] 允许子domain: ${urlHostname} (基于 ${baseHostname})`);
                //addLogEntry(`🔗 允许子domain: ${urlHostname}`, 'info');
                return true;
            }
        }
        
        // 默认：只允许完全相同domain
        const isSame = urlObj.hostname === baseUrlObj.hostname;
        if (isSame) {
            //console.log(`✅ [deep scan] 同domain: ${urlObj.hostname}`);
        } else {
            //console.log(`❌ [deep scan] not同domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
        }
        return isSame;
        
    } catch (error) {
        console.error('[deep scan] domaincheckfailed:', error);
        return false;
    }
}

// getdomainscansettings
async function getDomainScanSettings() {
    try {
        // ifSettingsManager可for，use它getsettings
        if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
            return await window.SettingsManager.getDomainScanSettings();
        }
        
        // 备for方案：directlyfromchrome.storageget
        const result = await chrome.storage.local.get(['domainScanSettings']);
        const domainSettings = result.domainScanSettings || {
            allowSubdomains: false,
            allowAllDomains: false
        };
        //console.log('🔍 [deep scan] fromstoragegetdomainsettings:', domainSettings);
        return domainSettings;
    } catch (error) {
        console.error('[deep scan] getdomainscansettingsfailed:', error);
        // 默认settings：只允许同domain
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

// -------------------- export功能 --------------------
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

// -------------------- eventlistener --------------------
document.addEventListener('DOMContentLoaded', initializePage);

// exportpopupevent
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
        
        addLogEntry(`✅ JSONexportsuccess: ${filename}`, 'success');
    } catch (error) {
        addLogEntry(`❌ JSONexportfailed: ${error.message}`, 'error');
    }
}

async function exportAsExcel() {
    try {
        const filename = await generateFileName('xlsx');
        
        // check是否有data可export
        const hasData = Object.keys(scanResults).some(key => 
            scanResults[key] && Array.isArray(scanResults[key]) && scanResults[key].length > 0
        );
        
        if (!hasData) {
            addLogEntry(`⚠️ withoutdata可export`, 'warning');
            return;
        }
        
        // generateExcel XMLformat内容
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

        // 为每个分classcreate工作表
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

        // ifwithoutdata，create一个空工作表
        if (!dataExported) {
            xlsContent += `
 <Worksheet ss:Name="无data">
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

        // createanddownload文件
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        addLogEntry(`✅ Excel文件exportsuccess: ${filename}.xls`, 'success');
        
    } catch (error) {
        addLogEntry(`❌ Excelexportfailed: ${error.message}`, 'error');
        console.error('Excelexport错误:', error);
    }
}

// 清理工作表名称（Excel工作表名称有special字符限制）
function sanitizeSheetName(name) {
    // 移除or替换Excelnot允许字符
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    // 限制长度（Excel工作表名称最大31个字符）
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || '未命名';
}

// XMLconvert义函数
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// generate文件名：domain__random数
async function generateFileName(extension = 'json') {
    let domain = 'deep-scan';
    
    try {
        // 优先fromscanconfigurationinget目标domain
        if (scanConfig && scanConfig.baseUrl) {
            const url = new URL(scanConfig.baseUrl);
            domain = url.hostname;
            //console.log('fromscanconfigurationgettodomain:', domain);
        } else {
            // 备选方案：from当before窗口URLparameterinextract目标domain
            if (window.location && window.location.href) {
                const urlParams = new URLSearchParams(window.location.search);
                const targetUrl = urlParams.get('url');
                if (targetUrl) {
                    const url = new URL(targetUrl);
                    domain = url.hostname;
                    //console.log('fromURLparametergettodomain:', domain);
                }
            }
        }
    } catch (e) {
        //console.log('getdomainfailed，use默认名称:', e);
        // use时间戳作为标识
        domain = `deep-scan_${Date.now()}`;
    }
    
    // 清理domain，移除special字符
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // generaterandom数（6位）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${domain}__${randomNum}`;
}

//console.log('✅ [DEBUG] deep scan窗口脚本（unifiedregexversion）loadcomplete');