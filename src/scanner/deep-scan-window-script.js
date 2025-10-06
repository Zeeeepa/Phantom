// ==========================================================
// 深度Scan窗口Script（Unified正则版本）
// 所有正则UnifiedThrough SettingsManager Get，None任何硬编码
// ==========================================================

//console.log('🚀 [DEBUG] 深度Scan窗口Script（Unified正则版本）StartLoad...');

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
let maxConcurrency     = 4; // Default值，会fromExtensionSettings中Read
let requestTimeout     = 3000; // Default值，会fromExtensionSettings中Read

// 日志RelatedVariable - 优化版本
let logEntries         = [];
let maxLogEntries      = 100; // 减少到100条，避免内存占用
let logBuffer          = []; // 日志缓冲区
let logFlushTimer      = null;
const LOG_FLUSH_INTERVAL = 500; // 500msBatch刷新日志

// Filter器实例
let apiFilter          = null;
let domainPhoneFilter  = null;
let filtersLoaded      = false;
let patternExtractor   = null;

// 性能优化RelatedVariable
let updateQueue        = [];
let isUpdating         = false;
let lastUpdateTime     = 0;
const UPDATE_THROTTLE  = 300; // 🚀 增加到300ms节流，减少Update频率
let pendingResults     = {};
let batchSize          = 15; // 🚀 增加BatchProcess大小
let updateTimer        = null;
let displayUpdateCount = 0;

// 🚀 内存管理RelatedVariable
let memoryCleanupTimer = null;
const MEMORY_CLEANUP_INTERVAL = 30000; // 30 secondsClean一次内存

// -------------------- 性能优化工具Function --------------------

// 🚀 内存CleanFunction
function performMemoryCleanup() {
    //console.log('🧹 Execute内存Clean...');
    
    // CleanURLContent缓存，Only保留最近的50个
    if (urlContentCache.size > 50) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-50);
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

// -------------------- UnifiedFilter器Load --------------------
async function loadFilters() {
    //console.log('🔍 [DEBUG] StartLoadUnifiedFilter器...');

    try {
        // Load SettingsManager（必须）
        if (typeof window.SettingsManager === 'undefined') {
            await loadScript('src/utils/SettingsManager.js');
        }

        // Load PatternExtractor（必须）
        if (typeof window.PatternExtractor === 'undefined') {
            await loadScript('src/scanner/PatternExtractor.js');
        }

        // 等PendingScriptParse
        await new Promise(r => setTimeout(r, 100));

        // 实例化
        if (typeof window.PatternExtractor === 'undefined') {
            throw new Error('PatternExtractor NotLoadSuccess');
        }
        patternExtractor = new window.PatternExtractor();

        // 强制LoadCustom正则
        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
            patternExtractor.ensureCustomPatternsLoaded();
        }

        // ListenSettings页正则Update
        window.addEventListener('regexConfigUpdated', (e) => {
            //console.log('🔄 [DEBUG] 收到正则ConfigurationUpdate事件');
            if (patternExtractor?.updatePatterns) {
                patternExtractor.updatePatterns(e.detail);
            } else if (patternExtractor?.loadCustomPatterns) {
                patternExtractor.loadCustomPatterns(e.detail);
            }
        });

        filtersLoaded = true;
        //console.log('✅ [DEBUG] UnifiedFilter器Load完毕');
    } catch (err) {
        console.error('❌ [DEBUG] Filter器LoadFailed:', err);
        filtersLoaded = false;
    }
}

// -------------------- UnifiedContent extraction --------------------
async function extractFromContent(content, sourceUrl = 'unknown') {
    //console.log('🔍 [DEBUG] StartUnifiedContent extraction...');

    if (!patternExtractor || typeof patternExtractor.extractPatterns !== 'function') {
        throw new Error('PatternExtractor.extractPatterns 不Available');
    }

    // EnsureConfigurationLoaded
    if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
        await patternExtractor.ensureCustomPatternsLoaded();
    }

    // 使用Unified入口Extract
    const results = await patternExtractor.extractPatterns(content, sourceUrl);

    // 🔥 Fix：使用 IndexedDB DataPerform智能Relative pathParse
    await enhanceRelativePathsWithIndexedDB(results, sourceUrl);

    return results;
}

// -------------------- 智能Relative pathParse --------------------
async function enhanceRelativePathsWithIndexedDB(results, currentSourceUrl) {
    console.log('🔍 [DEBUG] Start智能Relative pathParse，CurrentSourceURL:', currentSourceUrl);
    
    if (!results.relativeApis || results.relativeApis.length === 0) {
        console.log('⚠️ NoRelative pathAPINeedParse');
        return;
    }
    
    try {
        // 🔥 Fix：严格按照IndexedDBDataGetExtract来SourcePath
        const baseUrl = scanConfig?.baseUrl || window.location.origin;
        console.log('🔍 [DEBUG] BasicURL:', baseUrl);
        
        // Get所有Scan resultsData，包括深度Scan results
        let allScanData = [];
        
        // Method1：尝试GetCurrentDomain的Scan results
        try {
            const currentScanData = await window.IndexedDBManager.loadScanResults(baseUrl);
            if (currentScanData && currentScanData.results) {
                allScanData.push(currentScanData);
                console.log('✅ [DEBUG] Get到CurrentDomainScan results');
            }
        } catch (e) {
            console.warn('⚠️ GetCurrentDomainScan resultsFailed:', e);
        }
        
        // Method2：Get所有Scan results作为备选
        try {
            const allResults = await window.IndexedDBManager.getAllScanResults();
            if (allResults && Array.isArray(allResults)) {
                allScanData = allScanData.concat(allResults);
                console.log('✅ [DEBUG] Get到所有Scan results，共', allResults.length, '个');
            }
        } catch (e) {
            console.warn('⚠️ Get所有Scan resultsFailed:', e);
        }
        
        if (allScanData.length === 0) {
            console.log('⚠️ Not found任何 IndexedDB Data，使用传统拼接方式');
            return;
        }
        
        // 🔥 Fix：严格按照IndexedDB中Every个DataItem的sourceUrlPerformPathParse
        const sourceUrlToBasePath = new Map();
        const itemToSourceUrlMap = new Map(); // 新增：建立DataItem到sourceUrl的映射
        
        console.log('🔍 [DEBUG] Start分析IndexedDBData，共', allScanData.length, '个DataSource');
        
        // Traverse所有ScanData，建立Complete的映射关系
        allScanData.forEach((scanData, dataIndex) => {
            if (!scanData.results) return;
            
            console.log(`🔍 [DEBUG] 分析DataSource ${dataIndex + 1}:`, {
                url: scanData.url,
                sourceUrl: scanData.sourceUrl,
                domain: scanData.domain,
                pageTitle: scanData.pageTitle
            });
            
            // Traverse所有Type的Data
            Object.entries(scanData.results).forEach(([category, items]) => {
                if (!Array.isArray(items)) return;
                
                items.forEach(item => {
                    if (typeof item === 'object' && item !== null && item.sourceUrl) {
                        // 🔥 关KeyFix：使用DataItem自己的sourceUrl
                        const itemSourceUrl = item.sourceUrl;
                        const itemValue = item.value || item.text || item.content;
                        
                        if (itemValue && itemSourceUrl) {
                            try {
                                const sourceUrlObj = new URL(itemSourceUrl);
                                // ExtractBasicPath（去掉File名）
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const fullBasePath = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                
                                sourceUrlToBasePath.set(itemSourceUrl, fullBasePath);
                                itemToSourceUrlMap.set(itemValue, itemSourceUrl);
                                
                                console.log(`📋 [DEBUG] 映射建立: "${itemValue}" -> "${itemSourceUrl}" -> "${fullBasePath}"`);
                            } catch (e) {
                                console.warn('⚠️ Invalid的sourceUrl:', itemSourceUrl, e);
                            }
                        }
                    } else if (typeof item === 'string') {
                        // 对于字符串Format的Data，使用Scan results的sourceUrl
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
                                console.warn('⚠️ Invalid的备选sourceUrl:', fallbackSourceUrl, e);
                            }
                        }
                    }
                });
            });
        });
        
        console.log('📊 [DEBUG] 映射建立Complete:', {
            sourceUrlToBasePath: sourceUrlToBasePath.size,
            itemToSourceUrlMap: itemToSourceUrlMap.size
        });
        
        // 🔥 Fix：严格按照Every个Relative pathAPI的来SourcePerformParse
        const enhancedRelativeApis = [];
        
        for (const apiItem of results.relativeApis) {
            const apiValue = typeof apiItem === 'object' ? apiItem.value : apiItem;
            let apiSourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : currentSourceUrl;
            
            console.log(`🔍 [DEBUG] ProcessRelative pathAPI: "${apiValue}", SourceURL: "${apiSourceUrl}"`);
            
            let resolvedUrl = null;
            let usedSourceUrl = null;
            
            // 🔥 Method1：严格按照DataItem的sourceUrlPerformParse
            if (itemToSourceUrlMap.has(apiValue)) {
                const exactSourceUrl = itemToSourceUrlMap.get(apiValue);
                if (sourceUrlToBasePath.has(exactSourceUrl)) {
                    const basePath = sourceUrlToBasePath.get(exactSourceUrl);
                    resolvedUrl = resolveRelativePath(apiValue, basePath);
                    usedSourceUrl = exactSourceUrl;
                    console.log('✅ [精确Match] FoundDataItem的确切来Source:', apiValue, '->', resolvedUrl, '(Source:', exactSourceUrl, ')');
                }
            }
            
            // 🔥 Method2：如果精确MatchFailed，使用APIProject自带的sourceUrl
            if (!resolvedUrl && apiSourceUrl && sourceUrlToBasePath.has(apiSourceUrl)) {
                const basePath = sourceUrlToBasePath.get(apiSourceUrl);
                resolvedUrl = resolveRelativePath(apiValue, basePath);
                usedSourceUrl = apiSourceUrl;
                console.log('✅ [DirectMatch] 使用APIProject的sourceUrl:', apiValue, '->', resolvedUrl, '(Source:', apiSourceUrl, ')');
            }
            
            // 🔥 Method3：如果还是Failed，尝试Find相似的SourceURL（DomainMatch）
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
                                console.log('✅ [DomainMatch] Found同Domain的SourceURL:', apiValue, '->', resolvedUrl, '(Source:', sourceUrl, ')');
                                break;
                            }
                        }
                    } catch (e) {
                        // 忽略InvalidURL
                    }
                }
            }
            
            // 🔥 Method4：最After的备选方案，使用BasicURL拼接
            if (!resolvedUrl) {
                try {
                    if (apiValue.startsWith('./')) {
                        resolvedUrl = baseUrl + apiValue.substring(1); // 去掉.，保留/
                    } else if (apiValue.startsWith('../')) {
                        // 简单Process上级目录
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
                    
                    // Clean多余的斜杠
                    resolvedUrl = resolvedUrl.replace(/\/+/g, '/').replace(':/', '://');
                    usedSourceUrl = baseUrl;
                    
                    console.log('🔄 [备选Parse] 使用BasicURL拼接:', apiValue, '->', resolvedUrl);
                } catch (e) {
                    resolvedUrl = apiValue; // 保持原值
                    usedSourceUrl = currentSourceUrl;
                    console.warn('⚠️ [ParseFailed] 保持原值:', apiValue, e.message);
                }
            }
            
            // 保持原始Format，AddParseAfter的 URL And实际使用的SourceURL
            if (typeof apiItem === 'object') {
                enhancedRelativeApis.push({
                    ...apiItem,
                    resolvedUrl: resolvedUrl,
                    actualSourceUrl: usedSourceUrl || apiItem.sourceUrl // Record实际使用的SourceURL
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
        
        // UpdateResult
        results.relativeApis = enhancedRelativeApis;
        
        console.log('✅ [智能Parse] Relative pathParseComplete，Process了', enhancedRelativeApis.length, '个Relative path');
        console.log('📊 [智能Parse] ParseStatistics:', {
            总数: enhancedRelativeApis.length,
            SuccessParse: enhancedRelativeApis.filter(item => item.resolvedUrl && item.resolvedUrl !== item.value).length,
            使用IndexedDBData: enhancedRelativeApis.filter(item => item.actualSourceUrl && item.actualSourceUrl !== currentSourceUrl).length
        });
        
    } catch (error) {
        console.error('❌ 智能Relative pathParseFailed:', error);
        // 出错时保持原始Data不变
    }
}

// 辅助Function：ParseRelative path
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) {
            console.warn('⚠️ Relative pathParseParameterInvalid:', { relativePath, basePath });
            return null;
        }
        
        console.log(`🔧 [Parse] StartParseRelative path: "${relativePath}" 基于 "${basePath}"`);
        
        // EnsurebasePath以/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        let resolvedPath;
        
        if (relativePath.startsWith('./')) {
            // Current目录：./file.js -> basePath + file.js
            resolvedPath = basePath + relativePath.substring(2);
            console.log(`🔧 [Parse] Current目录Parse: "${relativePath}" -> "${resolvedPath}"`);
        } else if (relativePath.startsWith('../')) {
            // 上级目录：../file.js -> NeedProcessPath层级
            const upLevels = (relativePath.match(/\.\.\//g) || []).length;
            const remainingPath = relativePath.replace(/\.\.\//g, '');
            
            console.log(`🔧 [Parse] 上级目录Parse: 向上${upLevels}级, 剩余Path: "${remainingPath}"`);
            
            try {
                const baseUrlObj = new URL(basePath);
                const pathParts = baseUrlObj.pathname.split('/').filter(p => p);
                
                console.log(`🔧 [Parse] BasicPath部分:`, pathParts);
                
                // 向上移动指定层级
                for (let i = 0; i < upLevels && pathParts.length > 0; i++) {
                    pathParts.pop();
                }
                
                console.log(`🔧 [Parse] 向上移动AfterPath部分:`, pathParts);
                
                resolvedPath = `${baseUrlObj.protocol}//${baseUrlObj.host}/${pathParts.join('/')}${pathParts.length > 0 ? '/' : ''}${remainingPath}`;
                console.log(`🔧 [Parse] 上级目录最终Parse: "${relativePath}" -> "${resolvedPath}"`);
            } catch (e) {
                console.warn('⚠️ 上级目录ParseFailed，使用简单Method:', e);
                // 简单Process方式
                const baseUrl = basePath.split('/').slice(0, 3).join('/'); // protocol://host
                resolvedPath = baseUrl + '/' + remainingPath;
            }
        } else if (!relativePath.startsWith('/') && !relativePath.startsWith('http')) {
            // Relative path：file.js -> basePath + file.js
            resolvedPath = basePath + relativePath;
            console.log(`🔧 [Parse] Relative pathParse: "${relativePath}" -> "${resolvedPath}"`);
        } else {
            // Already经是Absolute path
            resolvedPath = relativePath;
            console.log(`🔧 [Parse] Already是Absolute path: "${relativePath}"`);
        }
        
        // Clean多余的斜杠
        const cleanedPath = resolvedPath.replace(/\/+/g, '/').replace(':/', '://');
        
        if (cleanedPath !== resolvedPath) {
            console.log(`🔧 [Parse] PathClean: "${resolvedPath}" -> "${cleanedPath}"`);
        }
        
        console.log(`✅ [Parse] Relative pathParseComplete: "${relativePath}" -> "${cleanedPath}"`);
        return cleanedPath;
        
    } catch (error) {
        console.warn('❌ Relative pathParseFailed:', error, { relativePath, basePath });
        return null;
    }
}

// -------------------- 传统ResultProcess（备用） --------------------
function convertRelativeApisToAbsolute(results) {
    // 🔥 Fix：完全RemoveAutoConvert逻辑，保持Absolute pathAPIAndRelative pathAPI的独立性
    // 不再将Relative pathAPIAutoConvertAndAdd到Absolute pathAPI中
    // This样Can避免意外Add不符合Absolute pathAPI正则要求的Data
    
    //console.log('🔍 [DEBUG] APIConvertComplete（AlreadyDisableAutoConvert）:');
    //console.log('  - 保留的Relative pathAPI:', results.relativeApis?.length || 0, '个');
    //console.log('  - 保留的Absolute pathAPI:', results.absoluteApis?.length || 0, '个');
    
    // 如果NeedConvert功能，应该在PatternExtractor中ThroughRegular expression来实现
    // 而不是在HerePerform强制Convert
}

// -------------------- 性能优化Function --------------------
// 节流UpdateDisplay
function throttledUpdateDisplay() {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
        // 如果距离上次UpdateTime太短，延迟Update
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

// ExecuteDisplayUpdate
function performDisplayUpdate() {
    if (isUpdating) return;
    
    isUpdating = true;
    lastUpdateTime = Date.now();
    displayUpdateCount++;
    
    try {
        // 使用 requestAnimationFrame Ensure在下一帧Update
        requestAnimationFrame(() => {
            updateResultsDisplay();
            updateStatusDisplay();
            isUpdating = false;
        });
    } catch (error) {
        console.error('DisplayUpdateFailed:', error);
        isUpdating = false;
    }
}

// BatchProcessResult合And
function batchMergeResults(newResults) {
    let hasNewData = false;
    
    // 将新ResultAdd到PendingProcessQueue
    Object.keys(newResults).forEach(key => {
        if (!pendingResults[key]) {
            pendingResults[key] = new Map(); // 使用Map来存储Object，以value为Key避免重复
        }
        
        if (Array.isArray(newResults[key])) {
            newResults[key].forEach(item => {
                if (item) {
                    // Process结构化Object（带sourceUrl）And简单字符串
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
    
    // 如果有新Data，触发节流Update
    if (hasNewData) {
        throttledUpdateDisplay();
    }
    
    return hasNewData;
}

// 将PendingProcessResult合And到主Result中
function flushPendingResults() {
    Object.keys(pendingResults).forEach(key => {
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        // Create现有Result的Key集合，Used for去重
        const existingKeys = new Set();
        scanResults[key].forEach(item => {
            const itemKey = typeof item === 'object' ? item.value : item;
            existingKeys.add(itemKey);
        });
        
        // Add新的ResultItem
        pendingResults[key].forEach((itemData, itemKey) => {
            if (!existingKeys.has(itemKey)) {
                scanResults[key].push(itemData);
            }
        });
        
        // ClearPendingProcessQueue
        pendingResults[key].clear();
    });
}

// -------------------- PageInitialize --------------------
async function initializePage() {
    //console.log('🔍 [DEBUG] PageInitialize中...');

    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ ChromeExtensionAPI不Available');
        return;
    }

    await loadFilters();

    try {
        // GetbaseUrl（fromScanConfiguration中的baseUrlOrCurrent窗口的opener）
        let baseUrl = '';
        if (window.opener) {
            try {
                // 尝试fromopener窗口GetURL
                baseUrl = window.opener.location.origin;
            } catch (e) {
                // 如果跨域访问Failed，使用Default方式
                console.warn('None法fromopenerGetURL，使用Default方式');
            }
        }
        
        // Load from IndexedDB深度ScanConfiguration
        let deepScanConfig = null;
        if (baseUrl) {
            deepScanConfig = await window.IndexedDBManager.loadDeepScanState(baseUrl);
        }
        
        // 如果NoFoundConfiguration，尝试Get所有Available的Configuration
        if (!deepScanConfig) {
            console.warn('⚠️ Not found指定URL的ScanConfiguration，尝试Get所有AvailableConfiguration...');
            const allConfigs = await window.IndexedDBManager.getAllDeepScanStates();
            if (allConfigs && allConfigs.length > 0) {
                // 使用最新的Configuration
                deepScanConfig = allConfigs[allConfigs.length - 1];
                console.log('✅ FoundAvailableConfiguration:', deepScanConfig.baseUrl);
            }
        }
        
        if (!deepScanConfig) throw new Error('Not foundScanConfiguration');
        scanConfig = deepScanConfig;

        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout  = (scanConfig.timeout * 1000) || 5000;

        updateConfigDisplay();
        initializeScanResults();
    } catch (err) {
        console.error('❌ InitializeFailed:', err);
    }

    // 绑定按钮事件
    document.getElementById('startBtn')?.addEventListener('click', startScan);
    document.getElementById('pauseBtn')?.addEventListener('click', pauseScan);
    document.getElementById('stopBtn')?.addEventListener('click', stopScan);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('toggleAllBtn')?.addEventListener('click', toggleAllCategories);
    
    // 🚀 Add滚动优化：DetectUser是否在滚动
    const logSection = document.getElementById('logSection');
    if (logSection) {
        let scrollTimeout;
        logSection.addEventListener('scroll', () => {
            logSection.isUserScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                logSection.isUserScrolling = false;
            }, 1000); // 1秒After认为User停止滚动
        });
        
        // 🚀 优化滚动性能
        logSection.style.willChange = 'scroll-position';
        logSection.style.transform = 'translateZ(0)'; // Enable硬件加速
    }

    // ListenExtension消息
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
        if (msg.action === 'stopDeepScan') {
            stopScan();
            reply({ success: true });
        }
    });

    // AutoStart
    setTimeout(startScan, 1000);
}

// -------------------- ConfigurationDisplay --------------------
function updateConfigDisplay() {
    if (!scanConfig) return;

    document.getElementById('maxDepthDisplay').textContent = scanConfig.maxDepth || 2;
    document.getElementById('concurrencyDisplay').textContent = scanConfig.concurrency || 8;
    document.getElementById('timeoutDisplay').textContent = scanConfig.timeout || 5;
    
    const scanTypes = [];
    if (scanConfig.scanJsFiles) scanTypes.push('JSFile');
    if (scanConfig.scanHtmlFiles) scanTypes.push('HTMLPage');
    if (scanConfig.scanApiFiles) scanTypes.push('API interface');
    
    document.getElementById('scanTypesDisplay').textContent = scanTypes.join(', ') || 'All';
    document.getElementById('scanInfo').textContent = `Target: ${scanConfig.baseUrl}`;
}

// -------------------- Scan resultsInitialize --------------------
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

// -------------------- Scan控制 --------------------
async function startScan() {
    if (isScanRunning) return;
    
    //console.log('🚀 [DEBUG] Start深度Scan...');
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    
    // UpdateUIStatus
    updateButtonStates();
    updateStatusDisplay();
    
    // 隐藏LoadPrompt
    document.getElementById('loadingDiv').style.display = 'none';
    
    try {
        // 收集初始URL
        const initialUrls = await collectInitialUrls();
        //console.log(`📋 [DEBUG] 收集到 ${initialUrls.length} 个初始URL`);
        addLogEntry(`📋 收集到 ${initialUrls.length} 个初始ScanURL`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('⚠️ NoFound可Scan的URL', 'warning');
            return;
        }
        
        // 🔥 Record初始URL列Table（Before几个）
        if (initialUrls.length > 0) {
            const urlsToShow = initialUrls.slice(0, 5);
            addLogEntry(`🎯 初始ScanTarget: ${urlsToShow.join(', ')}${initialUrls.length > 5 ? ` 等${initialUrls.length}个URL` : ''}`, 'info');
        }
        
        // RecordScanConfiguration
        addLogEntry(`⚙️ ScanConfiguration - 最大深度: ${scanConfig.maxDepth}, And发数: ${scanConfig.concurrency}, 超时: ${scanConfig.timeout}ms`, 'info');
        
        // Start分层Scan
        await performLayeredScan(initialUrls);
        
        // CompleteScan
        completeScan();
        
    } catch (error) {
        console.error('❌ ScanFailed:', error);
        addLogEntry(`❌ ScanFailed: ${error.message}`, 'error');
    } finally {
        isScanRunning = false;
        updateButtonStates();
    }
}

function pauseScan() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? 'ContinueScan' : '暂停Scan';
    
    if (isPaused) {
        addLogEntry('⏸️ ScanAlready暂停', 'warning');
        addLogEntry(`📊 暂停时Status: AlreadyScan${scannedUrls.size}个URL，Current深度${currentDepth}`, 'info');
    } else {
        addLogEntry('▶️ ScanAlreadyContinue', 'success');
    }
}

function stopScan() {
    isScanRunning = false;
    isPaused = false;
    addLogEntry('⏹️ User手动Stop scanning', 'warning');
    addLogEntry(`📊 停止时Status: AlreadyScan${scannedUrls.size}个URL，Current深度${currentDepth}`, 'info');
    updateButtonStates();
    completeScan();
}

// -------------------- 初始URL收集 --------------------
async function collectInitialUrls() {
    //console.log('📋 [DEBUG] Start收集初始URL - from普通Scan results中Get');
    
    const urls = new Set();
    
    try {
        // from深度ScanConfiguration中Get普通Scan的Result
        if (!scanConfig.initialResults) {
            console.warn('⚠️ 深度ScanConfiguration中Not found普通Scan results，将ScanCurrentPage');
            urls.add(scanConfig.baseUrl);
            return Array.from(urls);
        }
        
        const initialResults = scanConfig.initialResults;
        //console.log('📊 [DEBUG] Found普通Scan results:', Object.keys(initialResults));
        console.log('📊 [DEBUG] 普通Scan resultsStatistics:', {
            absoluteApis: initialResults.absoluteApis?.length || 0,
            jsFiles: initialResults.jsFiles?.length || 0,
            urls: initialResults.urls?.length || 0,
            domains: initialResults.domains?.length || 0,
            emails: initialResults.emails?.length || 0
        });
        
        // 将普通Scan results作为深度Scan的起始Result
        Object.keys(initialResults).forEach(key => {
            if (scanResults[key] && Array.isArray(initialResults[key])) {
                scanResults[key] = [...initialResults[key]];
            }
        });
        
        // from普通Scan results中收集JSFilePerform深度Scan
        if (scanConfig.scanJsFiles && initialResults.jsFiles) {
            //console.log(`📁 [DEBUG] from普通Scan results收集JSFile: ${initialResults.jsFiles.length} 个`);
            for (const jsFile of initialResults.jsFiles) {
                // 兼容新Format（Object）And旧Format（字符串）
                const url = typeof jsFile === 'object' ? jsFile.value : jsFile;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] AddJSFile: ${fullUrl}`);
                }
            }
        }
        
        // from普通Scan results中收集HTMLPagePerform深度Scan
        if (scanConfig.scanHtmlFiles && initialResults.urls) {
            //console.log(`🌐 [DEBUG] from普通Scan results收集URL: ${initialResults.urls.length} 个`);
            for (const urlItem of initialResults.urls) {
                // 兼容新Format（Object）And旧Format（字符串）
                const url = typeof urlItem === 'object' ? urlItem.value : urlItem;
                const sourceUrl = typeof urlItem === 'object' ? urlItem.sourceUrl : null;
                const fullUrl = await resolveUrl(url, scanConfig.baseUrl, sourceUrl);
                if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl) && isValidPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                    //console.log(`✅ [DEBUG] AddPageURL: ${fullUrl}`);
                }
            }
        }
        
        // from普通Scan results中收集API interfacePerform深度Scan
        if (scanConfig.scanApiFiles) {
            // Absolute pathAPI
            if (initialResults.absoluteApis) {
                //console.log(`🔗 [DEBUG] from普通Scan results收集绝对API: ${initialResults.absoluteApis.length} 个`);
                for (const apiItem of initialResults.absoluteApis) {
                    // 兼容新Format（Object）And旧Format（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] Add绝对API: ${fullUrl}`);
                    }
                }
            }
            
            // Relative pathAPI
            if (initialResults.relativeApis) {
                //console.log(`🔗 [DEBUG] from普通Scan results收集相对API: ${initialResults.relativeApis.length} 个`);
                for (const apiItem of initialResults.relativeApis) {
                    // 兼容新Format（Object）And旧Format（字符串）
                    const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                    const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                    const fullUrl = await resolveUrl(api, scanConfig.baseUrl, sourceUrl);
                    if (fullUrl && await isSameDomain(fullUrl, scanConfig.baseUrl)) {
                        urls.add(fullUrl);
                        //console.log(`✅ [DEBUG] Add相对API: ${fullUrl}`);
                    }
                }
            }
        }
        
        // 如果No收集到任何URL，AddCurrentPage作为备用
        if (urls.size === 0) {
            console.warn('⚠️ from普通Scan results中Not收集到任何URL，AddCurrentPage');
            urls.add(scanConfig.baseUrl);
        }
        
        //console.log(`📊 [DEBUG] 初始URL收集Complete，共收集到 ${urls.size} 个URL`);
        //console.log(`📊 [DEBUG] 初始Result数量: ${Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)}`);
        return Array.from(urls);
        
    } catch (error) {
        console.error('❌ 收集初始URLFailed:', error);
        // 出错时AddCurrentPage作为备用
        urls.add(scanConfig.baseUrl);
        return Array.from(urls);
    }
}

// -------------------- 分层Scan --------------------
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        
        if (currentUrls.length === 0) {
            //console.log(`第 ${depth} 层NoURLNeedScan`);
            break;
        }
        
        //console.log(`🔍 Start第 ${depth} 层Scan，URL数量: ${currentUrls.length}`);
        addLogEntry(`🔍 Start第 ${depth} 层Scan，URL数量: ${currentUrls.length}`, 'info');
        
        // 🔥 RecordCurrent层要Scan的URL列Table（Before几个）
        if (currentUrls.length > 0) {
            const urlsToShow = currentUrls.slice(0, 3);
            addLogEntry(`📋 第 ${depth} 层ScanTarget: ${urlsToShow.join(', ')}${currentUrls.length > 3 ? ` 等${currentUrls.length}个URL` : ''}`, 'info');
        }
        
        // BatchScanURL
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        // Prepare下一层URL
        currentUrls = newUrls.filter(url => !scannedUrls.has(url));
        
        //console.log(`✅ 第 ${depth} 层Scan completed，Found新URL: ${currentUrls.length} 个`);
        addLogEntry(`✅ 第 ${depth} 层Scan completed，Found新URL: ${currentUrls.length} 个`, 'success');
        
        // 🔥 Record下一层将要Scan的URL数量
        if (currentUrls.length > 0 && depth < scanConfig.maxDepth) {
            addLogEntry(`🔄 Prepare第 ${depth + 1} 层Scan，PendingScanURL: ${currentUrls.length} 个`, 'info');
        }
        
        // UpdateDisplay
        updateResultsDisplay();
        updateStatusDisplay();
    }
}

// -------------------- BatchURLScan --------------------
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    // 使用QueueAndAnd发控制
    const queue = [...urls];
    const activeWorkers = new Set();
    
    // 实时Display计数器
    let lastDisplayUpdate = 0;
    const displayUpdateInterval = 500; // Every0.5 seconds最多Update一次Display，提高响应速度
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层Scan`);
                continue;
            }
            
            scannedUrls.add(url);
            
            const workerPromise = (async () => {
                try {
                    // GetURLContent
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
                            // 🚀 性能优化：Remove频繁的Scan日志
                            // addLogEntry(`🔍 In progressScan: ${url}`, 'info');
                            
                            // Extract information
                            const extractedData = await extractFromContent(content, url);
                            const hasNewData = mergeResults(extractedData);
                            
                            // 🔥 RecordExtractResult日志
                            if (hasNewData) {
                                const newDataCount = Object.values(extractedData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                                addLogEntry(`✅ from ${url} Extract到 ${newDataCount} 个新DataItem`, 'success');
                            } else {
                                addLogEntry(`ℹ️ from ${url} NotFound新Data`, 'info');
                            }
                            
                            // 🚀 性能优化：减少DisplayUpdate频率，Only在BatchProcess时Update
                            if (hasNewData) {
                                // EveryProcess10个URL才Update一次Display
                                if (processedCount % 10 === 0) {
                                    throttledUpdateDisplay();
                                }
                            }
                            
                            // 收集新URL
                            const discoveredUrls = await collectUrlsFromContent(content, scanConfig.baseUrl);
                            if (discoveredUrls.length > 0) {
                                addLogEntry(`🔗 from ${url} Found ${discoveredUrls.length} 个新URL`, 'info');
                            }
                            discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        } else {
                            // 🔥 RecordNoneContent的情况
                            addLogEntry(`⚠️ ${url} ReturnEmptyContentOrNone法访问`, 'warning');
                        }
                    } catch (error) {
                        console.error(`Scan ${url} Failed:`, error);
                        // 🔥 AddError日志Record
                        addLogEntry(`❌ ScanFailed: ${url} - ${error.message}`, 'error');
                    } finally {
                        processedCount++;
                        // 🚀 性能优化：减少进度Update频率，Every5个URLUpdate一次
                        if (processedCount % 5 === 0 || processedCount === totalUrls) {
                            updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层Scan`);
                        }
                        activeWorkers.delete(workerPromise);
                    }
            })();
            
            activeWorkers.add(workerPromise);
            
            // 🚀 性能优化：控制And发数AndAdd延迟
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
            
            // Add延迟，避免过快Request导致System卡顿
            if (activeWorkers.size >= maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 🚀 增加到200ms延迟
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

// -------------------- URLContentGet --------------------
async function fetchUrlContent(url) {
    try {
        //console.log(`🔥 深度Scan - PrepareThroughAfter台ScriptRequest: ${url}`);
        
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
            // 🔥 AddHTTPError日志
            addLogEntry(`⚠️ HTTP ${response.status} - ${url}`, 'warning');
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        // Filter非文本Content
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/zip') ||
            contentType.includes('application/pdf')) {
            // 🔥 AddContentTypeFilter日志
            addLogEntry(`🚫 跳过非文本Content (${contentType}) - ${url}`, 'info');
            return null;
        }
        
        const text = await response.text();
        // 🔥 AddSuccessGetContent的日志
        const contentSize = text.length;
        const sizeText = contentSize > 1024 ? `${Math.round(contentSize / 1024)}KB` : `${contentSize}B`;
        addLogEntry(`📥 SuccessGetContent (${sizeText}) - ${url}`, 'info');
        return text;
        
    } catch (error) {
        console.error(`None法访问 ${url}:`, error);
        // 🔥 AddNetworkError日志
        addLogEntry(`❌ NetworkError: ${error.message} - ${url}`, 'error');
        return null;
    }
}

// -------------------- After台Request --------------------
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

// -------------------- fromContent收集URL --------------------
async function collectUrlsFromContent(content, baseUrl) {
    const urls = new Set();
    
    try {
        const extractedData = await extractFromContent(content, baseUrl);
        
        // 收集JSFile
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
        
        // 收集HTMLPage
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
        
        // 收集API interface - 使用智能Parse
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
                    // 🔥 优First使用智能Parse的 URL
                    let fullUrl;
                    if (typeof apiItem === 'object' && apiItem.resolvedUrl) {
                        fullUrl = apiItem.resolvedUrl;
                        //console.log('🎯 [DEBUG] 使用智能ParseURL:', apiItem.value, '->', fullUrl);
                    } else {
                        const api = typeof apiItem === 'object' ? apiItem.value : apiItem;
                        const sourceUrl = typeof apiItem === 'object' ? apiItem.sourceUrl : null;
                        fullUrl = await resolveUrl(api, baseUrl, sourceUrl);
                        //console.log('🔄 [DEBUG] 使用传统ParseURL:', api, '->', fullUrl);
                    }
                    
                    if (fullUrl && await isSameDomain(fullUrl, baseUrl)) {
                        urls.add(fullUrl);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ fromContent收集URLFailed:', error);
    }
    
    return Array.from(urls);
}

// -------------------- Result合And --------------------
function mergeResults(newResults) {
    // 使用Batch合And，避免频繁的DOMUpdate
    return batchMergeResults(newResults);
}

// -------------------- ResultSave --------------------
async function saveResultsToStorage() {
    try {
        // GenerateDomainKey
        let domainKey = 'unknown__results';
        if (scanConfig?.baseUrl) {
            try {
                const hostname = new URL(scanConfig.baseUrl).hostname;
                domainKey = `${hostname}__results`;
            } catch (e) {
                console.warn('ParseDomainFailed，使用DefaultKey:', e);
            }
        }
        
        //console.log('📝 [DEBUG] 使用存储Key:', domainKey);
        
        // fromIndexedDBGetCurrent的普通Scan results
        const existingResults = await window.IndexedDBManager.loadScanResults(scanConfig.baseUrl) || {};
        
        // 合And深度Scan results到普通Scan results中
        const mergedResults = { ...existingResults };
        
        // 将深度Scan的Result合And到普通Scan results中
        Object.keys(scanResults).forEach(key => {
            if (!mergedResults[key]) {
                mergedResults[key] = [];
            }
            
            // Create现有Result的Key集合，Used for去重
            const existingKeys = new Set();
            mergedResults[key].forEach(item => {
                const itemKey = typeof item === 'object' ? item.value : item;
                existingKeys.add(itemKey);
            });
            
            // 合And新的ResultItem
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
        
        // AddScan元Data
        mergedResults.scanMetadata = {
            ...existingResults.scanMetadata,
            lastScanType: 'deep',
            deepScanComplete: true,
            deepScanTimestamp: Date.now(),
            deepScanUrl: scanConfig.baseUrl,
            totalScanned: scannedUrls.size
        };
        
        // Save合AndAfter的Result到IndexedDB，包含URL位置Information
        const pageTitle = scanConfig.pageTitle || document.title || 'Deep Scan Results';
        // 使用BasicURL作为存储Key，但保持Every个ResultItem的具体来SourceURL
        await window.IndexedDBManager.saveScanResults(scanConfig.baseUrl, mergedResults, scanConfig.baseUrl, pageTitle);
        
        //console.log('✅ 深度Scan resultsAlready合And到主Scan results中');
        //console.log('📊 存储Key:', domainKey);
        console.log('📊 合AndAfterResultStatistics:', {
            总数: Object.values(mergedResults).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            深度Scan贡献: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        console.error('❌ Save resultsFailed:', error);
    }
}

// -------------------- Scan completed --------------------
async function completeScan() {
    //console.log('🎉 深度Scan completed！');
    
    // 🔥 优化：Ensure所有PendingProcessResult都By合And
    flushPendingResults();
    
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const totalScanned = scannedUrls.size;
    
    addLogEntry('🎉 深度Scan completed！', 'success');
    addLogEntry(`📊 ScanStatistics: Scan了 ${totalScanned} 个File，Extract了 ${totalResults} 个Project`, 'success');
    
    // 🔥 优化：减少详细Statistics日志，避免卡顿
    const nonEmptyCategories = Object.entries(scanResults).filter(([key, items]) => items && items.length > 0);
    if (nonEmptyCategories.length > 0) {
        const topCategories = nonEmptyCategories
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 5) // OnlyDisplayBefore5个最多的Class别
            .map(([key, items]) => `${key}: ${items.length}`);
        addLogEntry(`📈 Key findings: ${topCategories.join(', ')}`, 'success');
    }
    
    // 🔥 RecordScan耗时
    const scanDuration = Date.now() - (scanConfig.timestamp || Date.now());
    const durationText = scanDuration > 60000 ? 
        `${Math.floor(scanDuration / 60000)}分${Math.floor((scanDuration % 60000) / 1000)}秒` : 
        `${Math.floor(scanDuration / 1000)}秒`;
    addLogEntry(`⏱️ Scan耗时: ${durationText}`, 'info');
    
    // Save results到存储（合And到主Scan results中）
    await saveResultsToStorage();
    
    // Notify主Page深度Scan completed，让其UpdateDisplay
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
                //console.log('主Page可能AlreadyClose，None法SendCompleteNotify');
            } else {
                //console.log('✅ AlreadyNotify主Page深度Scan completed');
            }
        });
    } catch (error) {
        //console.log('SendCompleteNotifyFailed:', error);
    }
    
    // 🔥 优化：最终UpdateUI
    performDisplayUpdate();
    
    // Update进度Display
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = '✅ 深度Scan completed！';
        progressText.classList.add('success');
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // Update按钮Status
    updateButtonStates();
    
    // 🔥 优化：Clean内存And缓存
    setTimeout(() => {
        cleanupMemory();
    }, 5000); // 5 secondsAfterClean内存
}

// 内存CleanFunction
function cleanupMemory() {
    //console.log('🧹 StartClean内存...');
    
    // CleanURLContent缓存，Only保留最近的100个
    if (urlContentCache.size > 100) {
        const entries = Array.from(urlContentCache.entries());
        const toKeep = entries.slice(-100);
        urlContentCache.clear();
        toKeep.forEach(([key, value]) => urlContentCache.set(key, value));
        //console.log(`🧹 CleanURL缓存，保留 ${toKeep.length} 个条目`);
    }
    
    // CleanPendingProcessResult
    Object.keys(pendingResults).forEach(key => {
        if (pendingResults[key]) {
            pendingResults[key].clear();
        }
    });
    
    // CleanUpdateQueue
    updateQueue.length = 0;
    
    // Clean定时器
    if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
    }
    
    //console.log('✅ 内存CleanComplete');
}

// -------------------- UIUpdateFunction --------------------
function updateButtonStates() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isScanRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = 'Scan中...';
        pauseBtn.textContent = isPaused ? 'ContinueScan' : '暂停Scan';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = 'Start scanning';
        pauseBtn.textContent = '暂停Scan';
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
    // 🚀 防抖Process：避免频繁Update进度条
    if (updateProgressDisplay.pending) return;
    updateProgressDisplay.pending = true;
    
    // 🚀 使用requestAnimationFrame延迟Update，避免阻塞滚动
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
    // First合And所有PendingProcess的Result
    flushPendingResults();
    
    //console.log(`🔍 [DEBUG] StartUpdate深度Scan resultsDisplay... (第${displayUpdateCount}次Update)`);
    
    // 🔥 减少调试日志Output，避免控制台卡顿
    if (displayUpdateCount % 10 === 0) { // Every10次Update才Output详细日志
        //console.log('🔍 [DEBUG] APIDataCheck:');
        //console.log('  - absoluteApis:', scanResults.absoluteApis?.length || 0, '个');
        //console.log('  - relativeApis:', scanResults.relativeApis?.length || 0, '个');
        if (scanResults.absoluteApis?.length > 0) {
            //console.log('  - absoluteApis 示例:', scanResults.absoluteApis.slice(0, 3));
        }
        if (scanResults.relativeApis?.length > 0) {
            //console.log('  - relativeApis 示例:', scanResults.relativeApis.slice(0, 3));
        }
    }
    
    // 🔥 FixAPIDisplay问题：正确的ElementID映射
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
    
    // 🔥 FixDisplay逻辑：使用正确的ElementID
    Object.keys(categoryMapping).forEach(key => {
        const items = scanResults[key] || [];
        const mapping = categoryMapping[key];
        
        // 🔥 优化：减少调试日志，Only在必要时Output
        if (displayUpdateCount % 20 === 0) {
            //console.log(`🔍 [DEBUG] ProcessClass别 ${key}: ${items.length} 个Project`);
        }
        
        if (items.length > 0) {
            // Display容器
            const resultDiv = document.getElementById(mapping.containerId);
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }
            
            // Update计数
            const countElement = document.getElementById(mapping.countId);
            if (countElement && countElement.textContent !== items.length.toString()) {
                countElement.textContent = items.length;
            }
            
            // 🔥 优化：Only在列TableContent真正改变时才UpdateDOM
            const listElement = document.getElementById(mapping.listId);
            if (listElement) {
                const currentItemCount = listElement.children.length;
                if (currentItemCount !== items.length) {
                    // 使用文档片段BatchUpdateDOM
                    const fragment = document.createDocumentFragment();
                    items.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'result-item';
                        
                        // 🔥 Fix：使用Every个Project自己的sourceUrlPerform悬停Display，支持智能Parse的URL
                        if (typeof item === 'object' && item !== null) {
                            // Process带有sourceUrl的结构化Object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                            if (item.value !== undefined && item.sourceUrl) {
                                const itemValue = String(item.value);
                                const itemSourceUrl = String(item.sourceUrl);
                                
                                // 🔥 新增：如果是Relative pathAPI且有智能Parse的URL，Display额外Information
                                if (key === 'relativeApis' && item.resolvedUrl) {
                                    li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                                    li.title = `原始值: ${itemValue}
智能Parse: ${item.resolvedUrl}
来Source: ${itemSourceUrl}`;
                                } else {
                                    // OnlyDisplay值，不DirectDisplay来SourceURL，仅在悬停时Display
                                    li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                                    li.title = `来Source: ${itemSourceUrl}`;
                                }
                                li.style.cssText = 'padding: 5px 0;';
                            } else if (item.url || item.path || item.value || item.content) {
                                // 兼容其他ObjectFormat
                                const displayValue = item.url || item.path || item.value || item.content || JSON.stringify(item);
                                li.textContent = String(displayValue);
                                li.title = String(displayValue);
                            } else {
                                const jsonStr = JSON.stringify(item);
                                li.textContent = jsonStr;
                                li.title = jsonStr;
                            }
                        } else {
                            // 如果是字符串Or其他基本Type，DirectDisplay
                            const displayValue = String(item);
                            li.textContent = displayValue;
                            li.title = displayValue;
                        }
                        
                        fragment.appendChild(li);
                    });
                    
                    // 一次性UpdateDOM
                    listElement.innerHTML = '';
                    listElement.appendChild(fragment);
                }
            }
        }
    });
    
    // 🔥 ProcessCustom正则Result - 恢复ByDelete的功能
    //console.log('🔍 [DEBUG] StartProcessCustom正则Result...');
    Object.keys(scanResults).forEach(key => {
        if (key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🎯 [DEBUG] FoundCustom正则Result: ${key}, 数量: ${scanResults[key].length}`);
            createCustomResultCategory(key, scanResults[key]);
        }
    });
    
    // 🔥 Process其他Not预定义的ResultClass别
    Object.keys(scanResults).forEach(key => {
        // 跳过AlreadyProcess的预定义Class别AndCustom正则
        if (!categoryMapping[key] && !key.startsWith('custom_') && scanResults[key]?.length > 0) {
            //console.log(`🆕 [DEBUG] Found新的ResultClass别: ${key}, 数量: ${scanResults[key].length}`);
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
        title.innerHTML = `🔍 ${key.replace('custom_', 'Custom-')} (<span id="${key}Count">0</span>)`;
        
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
            
            // 🔥 Fix：使用Every个Project自己的sourceUrlPerform悬停Display，支持智能Parse的URL
            if (typeof item === 'object' && item !== null) {
                // Process带有sourceUrl的结构化Object {value: '/fly/user/login', sourceUrl: 'http://notify.dinnovate.cn/assets/index.esm-USutLI8H.js'}
                if (item.value !== undefined && item.sourceUrl) {
                    const itemValue = String(item.value);
                    const itemSourceUrl = String(item.sourceUrl);
                    
                    // 🔥 新增：如果是Relative pathAPI且有智能Parse的URL，Display额外Information
                    if (key === 'relativeApis' && item.resolvedUrl) {
                        li.innerHTML = `<span class="result-value">${itemValue}</span> <span class="resolved-url" style="color: #666; font-size: 0.9em;">→ ${item.resolvedUrl}</span>`;
                        li.title = `原始值: ${itemValue}
智能Parse: ${item.resolvedUrl}
来Source: ${itemSourceUrl}`;
                    } else {
                        // OnlyDisplay值，不DirectDisplay来SourceURL，仅在悬停时Display
                        li.innerHTML = `<span class="result-value">${itemValue}</span>`;
                        li.title = `来Source: ${itemSourceUrl}`;
                    }
                    li.style.cssText = 'padding: 5px 0;';
                } else {
                    // 兼容其他ObjectFormat
                    const jsonStr = JSON.stringify(item);
                    li.textContent = jsonStr;
                    li.title = jsonStr;
                }
            } else {
                // 如果是字符串Or其他基本Type，DirectDisplay
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
    
    // 🚀 性能优化：OnlyFilter最频繁的日志，保留重要Information
    if (type === 'info' && (
        message.includes('SuccessGetContent') ||
        message.includes('跳过非文本Content')
    )) {
        return; // Only跳过This些最频繁的日志
    }
    
    if (!logEntries) {
        logEntries = [];
    }
    
    // Add到缓冲区
    if (!logBuffer) {
        logBuffer = [];
    }
    logBuffer.push({ message, type, time: new Date().toLocaleTimeString() });
    
    // Batch刷新日志（降低频率）
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

// 🚀 优化的日志DisplayFunction - 减少DOM操作频率
function updateLogDisplay() {
    const logSection = document.getElementById('logSection');
    if (!logSection || !logEntries) return;
    
    // 🚀 防抖Process：避免频繁UpdateDOM
    if (updateLogDisplay.pending) return;
    updateLogDisplay.pending = true;
    
    // OnlyDisplay最近的20条日志，进一步减少DOM负载
    const recentLogs = logEntries.slice(-20);
    
    // Check是否NeedUpdate（避免不必要的DOM操作）
    const currentLogCount = logSection.children.length;
    if (currentLogCount === recentLogs.length) {
        updateLogDisplay.pending = false;
        return; // No新日志，跳过Update
    }
    
    // 🚀 使用setTimeout延迟Update，避免阻塞滚动
    setTimeout(() => {
        // 使用文档片段BatchUpdate
        const fragment = document.createDocumentFragment();
        recentLogs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${log.type}`;
            logEntry.textContent = `[${log.time}] ${log.message}`;
            fragment.appendChild(logEntry);
        });
        
        // 使用requestAnimationFrame优化DOMUpdate
        requestAnimationFrame(() => {
            logSection.innerHTML = '';
            logSection.appendChild(fragment);
            
            // 🚀 优化滚动：Only在必要时滚动
            if (!logSection.isUserScrolling) {
                logSection.scrollTop = logSection.scrollHeight;
            }
            
            updateLogDisplay.pending = false;
        });
    }, 100); // 100ms delay，避免频繁Update
}

// -------------------- 工具Function --------------------

// 辅助Function：ParseRelative path
function resolveRelativePath(relativePath, basePath) {
    try {
        if (!relativePath || !basePath) return null;
        
        // EnsurebasePath以/结尾
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }
        
        // 使用URL构造FunctionPerform标准Parse
        const resolved = new URL(relativePath, basePath);
        return resolved.href;
    } catch (error) {
        console.warn('Relative pathParseFailed:', error);
        return null;
    }
}

async function resolveUrl(url, baseUrl, sourceUrl = null) {
    try {
        if (!url) return null;
        
        console.log(`🔍 [URLParse] StartParse: "${url}", BasicURL: "${baseUrl}", SourceURL: "${sourceUrl}"`);
        
        // 如果Already经是绝对URL，DirectReturn
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log(`✅ [URLParse] Already是绝对URL: "${url}"`);
            return url;
        }
        
        if (url.startsWith('//')) {
            const result = new URL(baseUrl).protocol + url;
            console.log(`✅ [URLParse] Protocol相对URL: "${url}" -> "${result}"`);
            return result;
        }
        
        // 🔥 Fix：严格按照IndexedDBDataGetExtract来SourcePathPerformRelative pathParse
        if (sourceUrl && (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/'))) {
            console.log(`🔍 [URLParse] Detect到Relative path，尝试使用IndexedDBDataParse`);
            
            try {
                // Get所有IndexedDBScanData
                let allScanData = [];
                
                // Method1: DirectfromIndexedDBManagerGetCurrentDomainData
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.loadScanResults) {
                        const currentData = await window.IndexedDBManager.loadScanResults(baseUrl);
                        if (currentData && currentData.results) {
                            allScanData.push(currentData);
                            console.log(`✅ [URLParse] Get到CurrentDomainData`);
                        }
                    }
                } catch (error) {
                    console.warn('GetCurrentDomainIndexedDBDataFailed:', error);
                }
                
                // Method2: Get所有ScanData作为备选
                try {
                    if (window.IndexedDBManager && window.IndexedDBManager.getAllScanResults) {
                        const allData = await window.IndexedDBManager.getAllScanResults();
                        if (Array.isArray(allData)) {
                            allScanData = allScanData.concat(allData);
                            console.log(`✅ [URLParse] Get到所有ScanData，共 ${allData.length} 个`);
                        }
                    }
                } catch (error) {
                    console.warn('Get所有IndexedDBDataFailed:', error);
                }
                
                if (allScanData.length > 0) {
                    // 构建sourceUrl到basePath的映射
                    const sourceUrlToBasePath = new Map();
                    
                    console.log(`🔍 [URLParse] Start分析 ${allScanData.length} 个ScanDataSource`);
                    
                    // Traverse所有ScanData，建立映射关系
                    allScanData.forEach((scanData, dataIndex) => {
                        if (!scanData.results) return;
                        
                        // Traverse所有Type的Data，建立 sourceUrl 映射
                        Object.values(scanData.results).forEach(items => {
                            if (Array.isArray(items)) {
                                items.forEach(item => {
                                    if (typeof item === 'object' && item.sourceUrl) {
                                        try {
                                            const sourceUrlObj = new URL(item.sourceUrl);
                                            // ExtractBasicPath（去掉File名）
                                            const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                            const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                            sourceUrlToBasePath.set(item.sourceUrl, correctBaseUrl);
                                            
                                            console.log(`📋 [URLParse] 映射建立: ${item.sourceUrl} → ${correctBaseUrl}`);
                                        } catch (e) {
                                            console.warn('Invalid的sourceUrl:', item.sourceUrl, e);
                                        }
                                    }
                                });
                            }
                        });
                        
                        // 也AddScanData本身的sourceUrl作为备选
                        if (scanData.sourceUrl) {
                            try {
                                const sourceUrlObj = new URL(scanData.sourceUrl);
                                const basePath = sourceUrlObj.pathname.substring(0, sourceUrlObj.pathname.lastIndexOf('/') + 1);
                                const correctBaseUrl = `${sourceUrlObj.protocol}//${sourceUrlObj.host}${basePath}`;
                                sourceUrlToBasePath.set(scanData.sourceUrl, correctBaseUrl);
                                
                                console.log(`📋 [URLParse] 备选映射: ${scanData.sourceUrl} → ${correctBaseUrl}`);
                            } catch (e) {
                                console.warn('Invalid的备选sourceUrl:', scanData.sourceUrl, e);
                            }
                        }
                    });
                    
                    console.log(`📊 [URLParse] 映射建立Complete，共 ${sourceUrlToBasePath.size} 个映射`);
                    
                    // 🔥 Method1：精确MatchsourceUrl
                    if (sourceUrlToBasePath.has(sourceUrl)) {
                        const correctBasePath = sourceUrlToBasePath.get(sourceUrl);
                        const resolvedUrl = resolveRelativePath(url, correctBasePath);
                        if (resolvedUrl) {
                            console.log(`🎯 [URLParse] 精确MatchSuccess: ${url} → ${resolvedUrl} (基于Source: ${sourceUrl})`);
                            return resolvedUrl;
                        }
                    }
                    
                    // 🔥 Method2：DomainMatch
                    const targetDomain = baseUrl ? new URL(baseUrl).hostname : null;
                    if (targetDomain) {
                        for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                            try {
                                const sourceDomain = new URL(storedSourceUrl).hostname;
                                if (sourceDomain === targetDomain) {
                                    const testUrl = resolveRelativePath(url, basePath);
                                    if (testUrl) {
                                        console.log(`🎯 [URLParse] DomainMatchSuccess: ${url} → ${testUrl} (基于Source: ${storedSourceUrl})`);
                                        return testUrl;
                                    }
                                }
                            } catch (e) {
                                // 忽略InvalidURL
                            }
                        }
                    }
                    
                    // 🔥 Method3：尝试任何Available的SourceURL
                    for (const [storedSourceUrl, basePath] of sourceUrlToBasePath.entries()) {
                        const testUrl = resolveRelativePath(url, basePath);
                        if (testUrl) {
                            console.log(`🎯 [URLParse] 通用MatchSuccess: ${url} → ${testUrl} (基于Source: ${storedSourceUrl})`);
                            return testUrl;
                        }
                    }
                }
                
                console.log(`⚠️ [URLParse] IndexedDB智能ParseNot foundMatch，使用DefaultMethod`);
                
            } catch (error) {
                console.warn('IndexedDB智能PathParseFailed，使用DefaultMethod:', error);
            }
        }
        
        // 🔥 DefaultMethod：Direct基于baseUrlParse
        try {
            const resolvedUrl = new URL(url, baseUrl).href;
            console.log(`📍 [URLParse] DefaultParse: ${url} → ${resolvedUrl} (基于: ${baseUrl})`);
            return resolvedUrl;
        } catch (error) {
            console.warn('DefaultURLParseFailed:', error);
            return null;
        }
        
    } catch (error) {
        console.warn('URLParse完全Failed:', error);
        return null;
    }
}

// Check是否为同一Domain - 支持子DomainAndAllDomainSettings
async function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // GetDomainScanSettings
        const domainSettings = await getDomainScanSettings();
        //console.log('🔍 [深度Scan] CurrentDomainSettings:', domainSettings);
        //console.log('🔍 [深度Scan] CheckURL:', url, '基准URL:', baseUrl);
        
        // 如果允许Scan所有Domain
        if (domainSettings.allowAllDomains) {
            //console.log(`🌐 [深度Scan] 允许所有Domain: ${urlObj.hostname}`);
            addLogEntry(`🌐 允许所有Domain: ${urlObj.hostname}`, 'info');
            return true;
        }
        
        // 如果允许Scan子Domain
        if (domainSettings.allowSubdomains) {
            const baseHostname = baseUrlObj.hostname;
            const urlHostname = urlObj.hostname;
            
            // Check是否为同一DomainOr子Domain
            const isSameOrSubdomain = urlHostname === baseHostname || 
                                    urlHostname.endsWith('.' + baseHostname) ||
                                    baseHostname.endsWith('.' + urlHostname);
            
            if (isSameOrSubdomain) {
                //console.log(`🔗 [深度Scan] 允许子Domain: ${urlHostname} (基于 ${baseHostname})`);
                //addLogEntry(`🔗 允许子Domain: ${urlHostname}`, 'info');
                return true;
            }
        }
        
        // Default：Only允许完全相同的Domain
        const isSame = urlObj.hostname === baseUrlObj.hostname;
        if (isSame) {
            //console.log(`✅ [深度Scan] 同Domain: ${urlObj.hostname}`);
        } else {
            //console.log(`❌ [深度Scan] 不同Domain: ${urlObj.hostname} vs ${baseUrlObj.hostname}`);
        }
        return isSame;
        
    } catch (error) {
        console.error('[深度Scan] DomainCheckFailed:', error);
        return false;
    }
}

// GetDomainScanSettings
async function getDomainScanSettings() {
    try {
        // 如果SettingsManagerAvailable，使用它GetSettings
        if (typeof window.SettingsManager !== 'undefined' && window.SettingsManager.getDomainScanSettings) {
            return await window.SettingsManager.getDomainScanSettings();
        }
        
        // 备用方案：Directfromchrome.storageGet
        const result = await chrome.storage.local.get(['domainScanSettings']);
        const domainSettings = result.domainScanSettings || {
            allowSubdomains: false,
            allowAllDomains: false
        };
        //console.log('🔍 [深度Scan] Get from storage的DomainSettings:', domainSettings);
        return domainSettings;
    } catch (error) {
        console.error('[深度Scan] GetDomainScanSettingsFailed:', error);
        // DefaultSettings：Only允许同Domain
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

// -------------------- Export功能 --------------------
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

// -------------------- 事件Listen器 --------------------
document.addEventListener('DOMContentLoaded', initializePage);

// Export弹窗事件
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
        
        addLogEntry(`✅ JSONExportSuccess: ${filename}`, 'success');
    } catch (error) {
        addLogEntry(`❌ JSONExportFailed: ${error.message}`, 'error');
    }
}

async function exportAsExcel() {
    try {
        const filename = await generateFileName('xlsx');
        
        // Check是否有Data可Export
        const hasData = Object.keys(scanResults).some(key => 
            scanResults[key] && Array.isArray(scanResults[key]) && scanResults[key].length > 0
        );
        
        if (!hasData) {
            addLogEntry(`⚠️ NoData可Export`, 'warning');
            return;
        }
        
        // GenerateExcel XMLFormatContent
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影工具-深度Scan</Author>
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

        // 为Every个CategoryCreate工作Table
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
    <Cell ss:StyleID="Header"><Data ss:Type="String">Content</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell>
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

        // 如果NoData，Create一个Empty的工作Table
        if (!dataExported) {
            xlsContent += `
 <Worksheet ss:Name="NoneData">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Prompt</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">NoFound任何Data</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // CreateAnd下载File
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        addLogEntry(`✅ ExcelFileExportSuccess: ${filename}.xls`, 'success');
        
    } catch (error) {
        addLogEntry(`❌ ExcelExportFailed: ${error.message}`, 'error');
        console.error('ExcelExportError:', error);
    }
}

// Clean工作Table名称（Excel工作Table名称有特殊字符限制）
function sanitizeSheetName(name) {
    // RemoveOrReplaceExcel不允许的字符
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    // 限制长度（Excel工作Table名称最大31个字符）
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || 'Not命名';
}

// XML转义Function
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// GenerateFile名：Domain__随机数
async function generateFileName(extension = 'json') {
    let domain = 'deep-scan';
    
    try {
        // 优FirstfromScanConfiguration中GetTargetDomain
        if (scanConfig && scanConfig.baseUrl) {
            const url = new URL(scanConfig.baseUrl);
            domain = url.hostname;
            //console.log('fromScanConfigurationGet到Domain:', domain);
        } else {
            // 备选方案：fromCurrent窗口URLParameter中ExtractTargetDomain
            if (window.location && window.location.href) {
                const urlParams = new URLSearchParams(window.location.search);
                const targetUrl = urlParams.get('url');
                if (targetUrl) {
                    const url = new URL(targetUrl);
                    domain = url.hostname;
                    //console.log('fromURLParameterGet到Domain:', domain);
                }
            }
        }
    } catch (e) {
        //console.log('GetDomainFailed，使用Default名称:', e);
        // 使用Time戳作为标识
        domain = `deep-scan_${Date.now()}`;
    }
    
    // CleanDomain，Remove特殊字符
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate随机数（6位）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${domain}__${randomNum}`;
}

//console.log('✅ [DEBUG] 深度Scan窗口Script（Unified正则版本）Loading complete');