// Test窗口Script - 独立的JavaScriptFile
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// PageLoading completeAfter的Initialize
async function initializePage() {
    //console.log('PageLoading complete，PrepareStartTest');
    
    try {
        // fromchrome.storageReadTestConfiguration
        const result = await chrome.storage.local.get(['testConfig']);
        
        if (!result.testConfig) {
            console.error('找不到TestConfigurationData');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">Error: 找不到TestConfigurationData</div>';
            return;
        }
        
        testData = result.testConfig;
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('TestConfigurationLoadSuccess:', testData);
        
        // UpdatePageInformation
        document.getElementById('testInfo').textContent = 
            `${testData.categoryTitle} | ${testData.method} | ${testData.items.length} Item`;
        document.getElementById('totalCount').textContent = testData.items.length;
        

        // Displaybase APIPathAndCustomDomainInformation
        const baseUrlInfo = document.getElementById('baseUrlInfo');
        let infoText = `BasicURL: ${testData.baseUrl}`;
        
        if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                infoText += ` | Base APIPath: ${testData.customBaseApiPaths[0]}`;
            } else {
                infoText += ` | Base APIPath: ${testData.customBaseApiPaths.length} (${testData.customBaseApiPaths.join(', ')})`;
            }
        }
        
        if (testData.customDomains && testData.customDomains.length > 0) {
            if (testData.customDomains.length === 1) {
                infoText += ` | CustomDomain: ${testData.customDomains[0]}`;
            } else {
                infoText += ` | CustomDomain: ${testData.customDomains.length} (${testData.customDomains.join(', ')})`;
            }
        }
        
        baseUrlInfo.textContent = infoText;

    } catch (error) {
        console.error('ReadConfigurationDataFailed:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">Error: ReadConfigurationDataFailed - ' + error.message + '</div>';
        return;
    }
    
    // Add事件Listen器
    document.getElementById('continueBtn').addEventListener('click', continueTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    document.getElementById('domainFilter').addEventListener('change', filterResults);
    
    // Export弹窗事件Listen器
    document.getElementById('closeModal').addEventListener('click', hideExportModal);
    document.getElementById('exportJSON').addEventListener('click', () => {
        hideExportModal();
        exportAsJSON();
    });
    document.getElementById('exportCSV').addEventListener('click', () => {
        hideExportModal();
        exportAsCSV();
    });
    
    // Click弹窗外部Close
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportModal') {
            hideExportModal();
        }
    });
    
    // AddTableHeader排序事件Listen器
    const tableHeaders = document.querySelectorAll('th[data-column]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = parseInt(this.getAttribute('data-column'));
            //console.log('ClickTableHeader，列Index:', columnIndex);
            sortTable(columnIndex);
        });
    });
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('TestDataInvalid');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">Error: No要Test的Project</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// 排序RelatedVariable
let currentSortColumn = -1;
let sortDirection = 'asc'; // 'asc' Or 'desc'

// 排序Table格
function sortTable(columnIndex) {
    const table = document.getElementById('resultsTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 如果Click的是同一列，切换排序方向
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }
    
    // Update排序指示器
    updateSortIndicators(columnIndex);
    
    // 排序行
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // 根据列TypePerform不同的排序Process
        switch (columnIndex) {
            case 0: // 序号
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
                break;
            case 3: // Status code
                // 数字Status code优First，非数字Status code排在After面
                const aIsNum = !isNaN(parseInt(aValue));
                const bIsNum = !isNaN(parseInt(bValue));
                
                if (aIsNum && bIsNum) {
                    aValue = parseInt(aValue);
                    bValue = parseInt(bValue);
                } else if (aIsNum && !bIsNum) {
                    return sortDirection === 'asc' ? -1 : 1;
                } else if (!aIsNum && bIsNum) {
                    return sortDirection === 'asc' ? 1 : -1;
                }
                break;
            case 4: // 大小
                aValue = parseSizeToBytes(aValue);
                bValue = parseSizeToBytes(bValue);
                break;
            case 5: // 耗时
                aValue = parseTimeToMs(aValue);
                bValue = parseTimeToMs(bValue);
                break;
            case 1: // Domain
            case 2: // URL
            case 6: // Result
            default:
                // 字符串排序
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
        }
        
        let result = 0;
        if (aValue < bValue) result = -1;
        else if (aValue > bValue) result = 1;
        
        return sortDirection === 'asc' ? result : -result;
    });
    
    // Re插入排序After的行
    rows.forEach(row => tbody.appendChild(row));
}

// Update排序指示器
function updateSortIndicators(activeColumn) {
    // Reset所有指示器
    for (let i = 0; i <= 5; i++) {
        const indicator = document.getElementById(`sort-${i}`);
        if (indicator) {
            indicator.textContent = '↕';
            indicator.classList.remove('active');
        }
    }
    
    // SettingsCurrent列的指示器
    const activeIndicator = document.getElementById(`sort-${activeColumn}`);
    if (activeIndicator) {
        activeIndicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
        activeIndicator.classList.add('active');
    }
}

// Parse大小为字节数
function parseSizeToBytes(sizeStr) {
    if (sizeStr === 'N/A' || !sizeStr) return 0;
    
    const match = sizeStr.match(/^([0-9.]+)\s*([KMGT]?B)$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
        case 'TB': return value * 1024 * 1024 * 1024 * 1024;
        case 'GB': return value * 1024 * 1024 * 1024;
        case 'MB': return value * 1024 * 1024;
        case 'KB': return value * 1024;
        case 'B':
        default: return value;
    }
}

// ParseTime为毫秒数
function parseTimeToMs(timeStr) {
    if (timeStr === 'N/A' || !timeStr) return 0;
    
    const match = timeStr.match(/^([0-9.]+)ms$/);
    if (!match) return 0;
    
    return parseFloat(match[1]);
}

// PageLoading completeAfterAutoInitialize
document.addEventListener('DOMContentLoaded', initializePage);

// StartTest
async function startTest() {
    //console.log('startTest By调用');
    
    if (!testData || isTestRunning) return;
    
    if (!testData.items || testData.items.length === 0) {
        console.error('No要Test的Project');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">Error: No要Test的Project</div>';
        return;
    }
    
    //console.log('StartTest，Project数:', testData.items.length);
    
    // ExtensionTestProject以支持多个baseapiPath
    const expandedItems = expandItemsForMultipleBasePaths(testData.items, testData.categoryKey, testData.baseUrl);
    testData.items = expandedItems;
    
    //console.log(`🔧 原始TestProject数: ${testData.items.length}, ExtensionAfterProject数: ${expandedItems.length}`);
    
    isTestRunning = true;
    isPaused = false;
    currentIndex = 0;
    activeRequests = 0;
    testResults = [];
    
    try {
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('continueBtn').style.display = 'none';
        document.getElementById('loadingDiv').style.display = 'none';
        document.getElementById('resultsTable').style.display = 'table';
        
        updateStatusBar();
        processNextBatch();
    } catch (error) {
        console.error('StartTest时发生Error:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">StartTestFailed: ' + error.message + '</div>';
    }
}

// ContinueTest
function continueTest() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停Test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 暂停Test
function pauseTest() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseBtn').textContent = 'ContinueTest';
        document.getElementById('continueBtn').style.display = 'none';
    } else {
        document.getElementById('pauseBtn').textContent = '暂停Test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// Process下一批Request
function processNextBatch() {
    //console.log('processNextBatch By调用');
    //console.log('isPaused:', isPaused, 'isTestRunning:', isTestRunning);
    //console.log('activeRequests:', activeRequests, 'maxConcurrency:', maxConcurrency);
    //console.log('currentIndex:', currentIndex, 'items.length:', testData.items.length);
    
    if (isPaused || !isTestRunning) {
        //console.log('TestBy暂停OrNot运行，退出');
        return;
    }
    
    if (currentIndex >= testData.items.length) {
        //console.log('所有ProjectAlreadyProcessComplete');
        return;
    }
    
    let batchStarted = false;
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        batchStarted = true;
        
        //console.log('StartProcessProject:', itemIndex, item);
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                //console.log('RequestComplete:', itemIndex, result);
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('所有RequestComplete，调用 completeTest');
                    completeTest();
                }
            })
            .catch(error => {
                console.error('RequestProcessFailed:', error);
                activeRequests--;
                // ProcessExtensionAfter的TestProject
                let displayItem = item;
                if (typeof item === 'object' && item.displayText) {
                    displayItem = item.displayText;
                }
                
                const errorResult = {
                    url: displayItem,
                    fullUrl: item,
                    status: 'Error',
                    statusText: error.message,
                    size: 'N/A',
                    time: 'N/A',
                    success: false,
                    index: itemIndex
                };
                testResults.push(errorResult);
                addResultToTable(errorResult);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('所有RequestComplete（含Error），调用 completeTest');
                    completeTest();
                }
            });
    }
    
    if (batchStarted) {
        //console.log('批次AlreadyStart，Current活跃Request数:', activeRequests);
    } else {
        //console.log('NoStart新的批次');
    }
}

// ProcessSingleRequest
async function processSingleRequest(item, index) {
    try {
        // ProcessExtensionAfter的TestProject
        let displayItem = item;
        let url;
        
        if (typeof item === 'object' && item.fullUrl) {
            // This是ExtensionAfter的Project
            displayItem = item.displayText || item.originalItem;
            url = item.fullUrl;
        } else {
            // This是原始Project
            url = buildTestUrl(item, testData.categoryKey, testData.baseUrl);
        }
        
        if (!url) {
            return {
                url: displayItem,
                fullUrl: 'Invalid URL',
                status: 'Error',
                statusText: 'None法构建ValidURL',
                size: 'N/A',
                time: 'N/A',
                success: false,
                index: index
            };
        }
        
        const startTime = performance.now();
        const response = await makeRequest(url, testData.method, requestTimeout);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        
        let textContentOuter = '';
        // 始终尝试Get文本预览
        try {
            textContentOuter = await (response.clone ? response.clone().text() : response.text());
        } catch (_) {
            textContentOuter = '';
        }
        // Calculate响应大小：优FirstAfter台Return的 byteSize；再使用 Content-Length；否则用 UTF-8 字节长度
        let sizeBytes = 0;
        let sizeFormatted = 'N/A';
        try {
            if (typeof response.byteSize === 'number' && response.byteSize > 0) {
                sizeBytes = response.byteSize;
            } else {
                const cl = response.headers && response.headers.get('content-length');
                if (cl && !isNaN(parseInt(cl))) {
                    sizeBytes = parseInt(cl);
                } else {
                    if (typeof TextEncoder !== 'undefined') {
                        sizeBytes = new TextEncoder().encode(textContentOuter).length;
                    } else {
                        sizeBytes = new Blob([textContentOuter]).size;
                    }
                }
            }
            sizeFormatted = sizeBytes > 0 ? formatBytes(sizeBytes) : 'N/A';
        } catch (e) {
            sizeFormatted = 'N/A';
        }
        
        const isSuccess = response.ok || (response.status >= 200 && response.status < 300);

        // Extract headers 与Content预览
        let headersObj = {};
        try {
            if (response.headers && typeof response.headers.entries === 'function') {
                for (const [k, v] of response.headers.entries()) headersObj[k] = v;
            }
        } catch (_) {}
        const contentType = (response.headers && response.headers.get('content-type')) || '';
        const bodyPreview = (typeof textContentOuter === 'string' ? textContentOuter.slice(0, 2000) : '');
        const bodyTruncated = typeof textContentOuter === 'string' && textContentOuter.length > 2000;
        
        return {
            url: displayItem,
            fullUrl: url,
            status: response.status || 'Unknown',
            statusText: response.statusText || 'OK',
            size: sizeFormatted,
            byteSize: sizeBytes,
            contentType: contentType,
            headers: headersObj,
            bodyPreview: bodyPreview,
            bodyTruncated: bodyTruncated,
            rawBody: (typeof textContentOuter === 'string' ? textContentOuter.slice(0, 262144) : ''),
            rawBodyTruncated: (typeof textContentOuter === 'string' && textContentOuter.length > 262144),
            time: duration + 'ms',
            success: isSuccess,
            index: index
        };
    } catch (error) {
        return {
            url: displayItem,
            fullUrl: item,
            status: 'Exception',
            statusText: error.message || 'Not知异常',
            size: 'N/A',
            time: 'N/A',
            success: false,
            index: index
        };
    }
}

// 构建TestURL
function buildTestUrl(item, categoryKey, baseUrl) {
    try {
        let url = item;
        
        // Fix：如果item是Object，Extractvalue属性
        if (typeof item === 'object' && item !== null) {
            url = item.value || item.url || item;
            console.log('buildTestUrl: fromObjectExtractURL:', url, '原始Object:', item);
        }
        
        // Fix：Ensureurl是字符串Type
        if (!url || typeof url !== 'string') {
            console.error('buildTestUrl: urlParameterInvalid:', url);
            return baseUrl || 'https://example.com';
        }

        // GetCustombase APIPath
        const customBaseApiPaths = testData.customBaseApiPaths || [];
        
        console.log(`🔧 [buildTestUrl] 构建URL: 原始="${url}", Category="${categoryKey}", BasicURL="${baseUrl}", BaseAPIPath=${JSON.stringify(customBaseApiPaths)}`);

        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {
                    // 如果有Custombase APIPath，FirstAdd它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapiPath（保持向After兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // EnsurebaseApiPath以/开Header但不以/结尾（除非是根Path）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + url;
                        console.log(`🔧 [buildTestUrl] Absolute path+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + url;
                        console.log(`🔧 [buildTestUrl] Absolute path: "${baseUrl}" + "${item}" = "${url}"`);
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                    // 🔥 Fix：Auto去除Relative path开Header的"."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [buildTestUrl] 去除Relative path开Header的"./": "${url}" -> "${cleanedUrl}"`);
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // 去除单独的 "."
                        console.log(`🔧 [buildTestUrl] 去除Relative path开Header的".": "${url}" -> "${cleanedUrl}"`);
                    }
                    
                    // 如果有Custombase APIPath，FirstAdd它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapiPath（保持向After兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // EnsurebaseApiPath以/开Header但不以/结尾（除非是根Path）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] Relative path+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${cleanedUrl}" = "${url}"`);
                    } else {
                        url = baseUrl + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] Relative path: "${baseUrl}" + "/" + "${cleanedUrl}" = "${url}"`);
                    }
                }
                break;
                
            case 'urls':
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                    console.log(`🔧 [buildTestUrl] CompleteURL: "http://" + "${item}" = "${url}"`);
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !url.startsWith('http')) {
                    if (url.startsWith('/')) {
                        // 如果有Custombase APIPath，FirstAdd它
                        if (customBaseApiPaths.length > 0) {
                            // 使用第一个baseapiPath（保持向After兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + url;
                            console.log(`🔧 [buildTestUrl] FilePath+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + url;
                            console.log(`🔧 [buildTestUrl] FilePath: "${baseUrl}" + "${item}" = "${url}"`);
                        }
                    } else {
                        // 如果有Custombase APIPath，FirstAdd它
                        if (customBaseApiPaths.length > 0) {
                            // 使用第一个baseapiPath（保持向After兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对File+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对File: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !url.startsWith('http')) {
                    // 如果有Custombase APIPath，FirstAdd它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapiPath（保持向After兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] Default+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] Default: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                    }
                }
        }
        
        // Clean多余的斜杠
        url = url.replace(/([^:]\/)\/+/g, '$1');
        
        console.log(`✅ [buildTestUrl] 最终URL: "${url}"`);
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('构建URLFailed:', error, item);
        return null;
    }
}

/**
 * 为多个baseapiPathAndCustomDomainGenerateTestProject
 * @param {Array} items - 原始TestProject
 * @param {string} categoryKey - CategoryKey
 * @param {string} baseUrl - BasicURL
 * @returns {Array} - ExtensionAfter的TestProject
 */
function expandItemsForMultipleBasePaths(items, categoryKey, baseUrl) {
    const customBaseApiPaths = testData.customBaseApiPaths || [];
    const customDomains = testData.customDomains || [];
    
    // 总是NeedExtensionProject，因为我们Need同时Process原始DomainAndCustomDomain
    // 如果既No多个baseapiPath，也NoCustomDomain，DirectReturn原始Project
    if (customBaseApiPaths.length <= 1 && customDomains.length === 0) {
        return items;
    }
    
    const expandedItems = [];
    
    items.forEach(item => {
        // ProcessCustomDomain
        if (customDomains.length > 0) {
            customDomains.forEach(customDomain => {
                // 如果有CustomBase APIPath，为Every个CustomDomainAddEvery个Base APIPath
                if (customBaseApiPaths.length > 0) {
                    customBaseApiPaths.forEach(basePath => {
                        let url = item;
                        
                        // Fix：如果item是Object，Extractvalue属性
                        if (typeof item === 'object' && item !== null) {
                            url = item.value || item.url || item;
                        }
                        
                        // Fix：Ensureurl是字符串Type
                        if (!url || typeof url !== 'string') {
                            console.error('expandItemsForMultipleBasePaths: urlParameterInvalid:', url);
                            return;
                        }
                        
                        switch (categoryKey) {
                            case 'absoluteApis':
                            case 'paths':
                                if (url.startsWith('/')) {
                                    url = customDomain + basePath + url;
                                }
                                break;
                                
                            case 'relativeApis':
                                if (typeof url === 'string' && !url.startsWith('http')) {
                                    // 🔥 Fix：Auto去除Relative path开Header的"."
                                    let cleanedUrl = url;
                                    if (cleanedUrl.startsWith('./')) {
                                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                        console.log(`🔧 [expandItems-customDomain] 去除Relative path开Header的"./": "${url}" -> "${cleanedUrl}"`);
                                    } else if (cleanedUrl.startsWith('.')) {
                                        cleanedUrl = cleanedUrl.substring(1); // 去除单独的 "."
                                        console.log(`🔧 [expandItems-customDomain] 去除Relative path开Header的".": "${url}" -> "${cleanedUrl}"`);
                                    }
                                    
                                    url = customDomain + basePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                                }
                                break;
                                
                            case 'jsFiles':
                            case 'cssFiles':
                            case 'images':
                                if (typeof url === 'string' && !url.startsWith('http')) {
                                    if (url.startsWith('/')) {
                                        url = customDomain + basePath + url;
                                    } else {
                                        url = customDomain + basePath + '/' + url;
                                    }
                                }
                                break;
                                
                            default:
                                if (typeof url === 'string' && !url.startsWith('http')) {
                                    url = customDomain + basePath + (url.startsWith('/') ? '' : '/') + url;
                                }
                        }
                        
                        // AddCustomDomain+Base APIPath的TestProject
                        expandedItems.push({
                            originalItem: item,
                            customDomain: customDomain,
                            baseApiPath: basePath,
                            fullUrl: url,
                            displayText: `${item} (${customDomain}${basePath})`
                        });
                    });
                } else {
                    // NoCustomBase APIPath，Direct使用CustomDomain
                    let url = item;
                    
                    // Fix：如果item是Object，Extractvalue属性
                    if (typeof item === 'object' && item !== null) {
                        url = item.value || item.url || item;
                    }
                    
                    // Fix：Ensureurl是字符串Type
                    if (!url || typeof url !== 'string') {
                        console.error('expandItemsForMultipleBasePaths: urlParameterInvalid:', url);
                        return;
                    }
                    
                    switch (categoryKey) {
                        case 'absoluteApis':
                        case 'paths':
                            // Fix：Ensureurl是字符串Type
                            if (typeof url === 'string' && url.startsWith('/')) {
                                url = customDomain + url;
                            }
                            break;
                            
                        case 'relativeApis':
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                // 🔥 Fix：Auto去除Relative path开Header的"."
                                let cleanedUrl = url;
                                if (cleanedUrl.startsWith('./')) {
                                    cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除Relative path开Header的"./": "${url}" -> "${cleanedUrl}"`);
                                } else if (cleanedUrl.startsWith('.')) {
                                    cleanedUrl = cleanedUrl.substring(1); // 去除单独的 "."
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除Relative path开Header的".": "${url}" -> "${cleanedUrl}"`);
                                }
                                
                                url = customDomain + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                            }
                            break;
                            
                        case 'jsFiles':
                        case 'cssFiles':
                        case 'images':
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                if (url.startsWith('/')) {
                                    url = customDomain + url;
                                } else {
                                    url = customDomain + '/' + url;
                                }
                            }
                            break;
                            
                        default:
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                url = customDomain + (url.startsWith('/') ? '' : '/') + url;
                            }
                    }
                    
                    // AddCustomDomain的TestProject
                    expandedItems.push({
                        originalItem: item,
                        customDomain: customDomain,
                        fullUrl: url,
                        displayText: `${item} (${customDomain})`
                    });
                }
            });
        }
        
        // ProcessBase APIPath（如果有多个）
        if (customBaseApiPaths.length > 1) {
            customBaseApiPaths.forEach(basePath => {
                let url = item;
                
                switch (categoryKey) {
                    case 'absoluteApis':
                    case 'paths':
                        if (baseUrl && url.startsWith('/')) {
                            url = baseUrl + basePath + url;
                        }
                        break;
                        
                    case 'relativeApis':
                        if (baseUrl && !url.startsWith('http')) {
                            // 🔥 Fix：Auto去除Relative path开Header的"."
                            let cleanedUrl = url;
                            if (cleanedUrl.startsWith('./')) {
                                cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                console.log(`🔧 [expandItems-basePath] 去除Relative path开Header的"./": "${url}" -> "${cleanedUrl}"`);
                            } else if (cleanedUrl.startsWith('.')) {
                                cleanedUrl = cleanedUrl.substring(1); // 去除单独的 "."
                                console.log(`🔧 [expandItems-basePath] 去除Relative path开Header的".": "${url}" -> "${cleanedUrl}"`);
                            }
                            
                            url = baseUrl + basePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        }
                        break;
                        
                    case 'jsFiles':
                    case 'cssFiles':
                    case 'images':
                        if (baseUrl && !url.startsWith('http')) {
                            if (url.startsWith('/')) {
                                url = baseUrl + basePath + url;
                            } else {
                                url = baseUrl + basePath + '/' + url;
                            }
                        }
                        break;
                        
                    default:
                        if (baseUrl && !url.startsWith('http')) {
                            url = baseUrl + basePath + (url.startsWith('/') ? '' : '/') + url;
                        }
                }
                
                // AddExtensionAfter的Project，包含原始ProjectAnd对应的baseapiPathInformation
                expandedItems.push({
                    originalItem: item,
                    baseApiPath: basePath,
                    fullUrl: url,
                    displayText: `${item} (${basePath})`
                });
            });
        }
        
        // 总是Add原始Project（使用原始Domain）
        let originalUrl = item;
        
        // Fix：如果item是Object，Extractvalue属性
        if (typeof item === 'object' && item !== null) {
            originalUrl = item.value || item.url || item;
        }
        
        // Fix：EnsureoriginalUrl是字符串Type
        if (!originalUrl || typeof originalUrl !== 'string') {
            console.warn('originalUrl不是字符串Type:', originalUrl);
            return expandedItems; // 跳过ThisProject
        }
        
        // 🔥 Fix：Process原始Domain的URL构建，Ensure正确Displaybaseapi+Path
        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && originalUrl.startsWith('/')) {
                    if (customBaseApiPaths.length > 0) {
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        originalUrl = baseUrl + normalizedBasePath + originalUrl;
                    } else {
                        originalUrl = baseUrl + originalUrl;
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !originalUrl.startsWith('http')) {
                    // 🔥 Fix：Auto去除Relative path开Header的"."
                    let cleanedOriginalUrl = originalUrl;
                    if (cleanedOriginalUrl.startsWith('./')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [expandItems] 去除Relative path开Header的"./": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
                    } else if (cleanedOriginalUrl.startsWith('.')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(1); // 去除单独的 "."
                        console.log(`🔧 [expandItems] 去除Relative path开Header的".": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
                    }
                    
                    if (customBaseApiPaths.length > 0) {
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        originalUrl = baseUrl + normalizedBasePath + (cleanedOriginalUrl.startsWith('/') ? '' : '/') + cleanedOriginalUrl;
                    } else {
                        originalUrl = baseUrl + (cleanedOriginalUrl.startsWith('/') ? '' : '/') + cleanedOriginalUrl;
                    }
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !originalUrl.startsWith('http')) {
                    if (originalUrl.startsWith('/')) {
                        if (customBaseApiPaths.length > 0) {
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            originalUrl = baseUrl + normalizedBasePath + originalUrl;
                        } else {
                            originalUrl = baseUrl + originalUrl;
                        }
                    } else {
                        if (customBaseApiPaths.length > 0) {
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            originalUrl = baseUrl + normalizedBasePath + '/' + originalUrl;
                        } else {
                            originalUrl = baseUrl + '/' + originalUrl;
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !originalUrl.startsWith('http')) {
                    if (customBaseApiPaths.length > 0) {
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        originalUrl = baseUrl + normalizedBasePath + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    } else {
                        originalUrl = baseUrl + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    }
                }
        }
        
        // Clean多余的斜杠
        originalUrl = originalUrl.replace(/([^:]\/)\/+/g, '$1');
        
        // Add原始Domain的TestProject
        expandedItems.push({
            originalItem: item,
            fullUrl: originalUrl,
            displayText: `${item} (原始Domain)`
        });
    });
    
    return expandedItems;
}

// SendRequest - ThroughAfter台Script
async function makeRequest(url, method, timeout = 5000) {
    //console.log(`🌐 Test窗口ThroughAfter台ScriptRequest: ${url}`);
    
    const requestOptions = {
        method: method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
        },
        timeout: timeout
    };
    
    if (method === 'POST') {
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.body = JSON.stringify({});
    }
    
    try {
        // ThroughAfter台ScriptSendRequest（会Auto使用Save的Cookie）
        const response = await makeRequestViaBackground(url, requestOptions);
        return response;
    } catch (error) {
        console.error(`❌ Test窗口RequestFailed: ${error.message}`);
        
        // ReturnError响应Object
        return {
            status: 'Error',
            statusText: error.message || 'RequestFailed',
            ok: false,
            headers: new Headers()
        };
    }
}

// ThroughAfter台ScriptSendRequest
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
                // 模拟fetch响应Object
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
                    byteSize: (typeof response.data.sizeBytes === 'number' ? response.data.sizeBytes : 0),
                    url: response.data.url,
                    clone: () => ({
                        text: () => Promise.resolve(response.data.text),
                        json: () => {
                            try {
                                return Promise.resolve(JSON.parse(response.data.text));
                            } catch (e) {
                                return Promise.reject(new Error('Invalid JSON'));
                            }
                        }
                    })
                });
            } else {
                reject(new Error(response?.error || 'Request failed'));
            }
        });
    });
}

// AddResult到Table格
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    
    // 🔥 Fix：正确DisplayComplete的URLPath，包括baseapi+Path
    let displayUrl = (result.fullUrl || result.url || '');
    let fullDisplayUrl = displayUrl; // SaveCompleteURLUsed fortitleDisplay
    
    try {
        if (displayUrl.startsWith('http')) {
            const u = new URL(displayUrl);
            // DisplayComplete的Path部分，包括baseapiPath
            displayUrl = u.pathname + (u.search || '') + (u.hash || '');
            fullDisplayUrl = u.href; // CompleteURL
        }
    } catch (_) {
        // 如果URLParseFailed，保持原样
        fullDisplayUrl = displayUrl;
    }
    
    // ExtractDomainInformation
    let domainInfo = '原始Domain';
    try {
        if (result.fullUrl && result.fullUrl.startsWith('http')) {
            const urlObj = new URL(result.fullUrl);
            domainInfo = urlObj.hostname + (urlObj.port ? ':' + urlObj.port : '');
        }
    } catch (e) {
        domainInfo = 'Not知Domain';
    }
    
    // 🔥 Fix：EnsureURL列DisplayComplete的PathInformation
    row.innerHTML = 
        '<td>' + (result.index + 1) + '</td>' +
        '<td class="url-cell" title="' + domainInfo + '">' + domainInfo + '</td>' +
        '<td class="url-cell" title="' + fullDisplayUrl + '">' + displayUrl + '</td>' +
        '<td class="' + statusClass + '">' + result.status + '</td>' +
        '<td>' + result.size + '</td>' +
        '<td>' + result.time + '</td>' +
        '<td class="' + statusClass + '">' + (result.success ? 'Success' : 'Failed') + '</td>' +
        '<td><button class="btn btn-primary btn-view" data-index="' + result.index + '">查看</button></td>';
    
    tbody.appendChild(row);
    
    // UpdateDomainFilter选Item
    updateDomainFilter();

    // 查看响应Content按钮
    const viewBtn = row.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            const idx = parseInt(viewBtn.getAttribute('data-index'));
            const res = testResults.find(r => r.index === idx) || result;

            // 动态Create弹窗，复用Page的 .modal/.modal-content 样式
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';

            // 构建Content（仅展示原始响应报文：Status行 + Header + 原始Body；不渲染HTML）
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '900px';
            modalContent.style.width = '95%';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            const titleEl = document.createElement('h3');
            titleEl.textContent = '响应详情';
            const closeBtnEl = document.createElement('span');
            closeBtnEl.className = 'close';
            closeBtnEl.textContent = '×';
            modalHeader.appendChild(titleEl);
            modalHeader.appendChild(closeBtnEl);

            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';

            const metaDiv = document.createElement('div');
            metaDiv.style.marginBottom = '10px';
            metaDiv.style.color = '#fff';
            metaDiv.innerHTML = `
                <div><strong>URL:</strong> ${escapeHtml(res.fullUrl || res.url)}</div>
                <div><strong>Status:</strong> ${escapeHtml(String(res.status))} ${escapeHtml(res.statusText || '')}</div>
                <div><strong>大小:</strong> ${escapeHtml(res.size || '')} (${res.byteSize || 0} B)</div>
                <div><strong>Type:</strong> ${escapeHtml(res.contentType || '')}</div>
            `;
            modalBody.appendChild(metaDiv);

            // Group装原始响应报文
            const headerLines = [];
            if (res.headers && typeof res.headers === 'object') {
                for (const [k, v] of Object.entries(res.headers)) {
                    headerLines.push(`${k}: ${v}`);
                }
            }
            const statusLine = `HTTP/1.1 ${res.status} ${res.statusText || ''}`.trim();
            const rawBody = (typeof res.rawBody === 'string') ? res.rawBody : (res.bodyPreview || '');
            const rawResponse = `${statusLine}\r\n${headerLines.join('\r\n')}\r\n\r\n${rawBody}`;

            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.maxHeight = '480px';
            pre.style.overflow = 'auto';
            pre.style.background = 'rgba(0, 0, 0, 0.3)';
            pre.style.padding = '10px';
            pre.style.borderRadius = '8px';
            pre.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            pre.textContent = rawResponse; // 仅文本，避免HTML渲染
            modalBody.appendChild(pre);

            if (res.rawBodyTruncated) {
                const tip = document.createElement('div');
                tip.style.fontSize = '12px';
                tip.style.color = '#ccc';
                tip.style.marginTop = '6px';
                tip.textContent = 'ContentAlready截断展示（Before 256 KB）';
                modalBody.appendChild(tip);
            }

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modal.appendChild(modalContent);

            document.body.appendChild(modal);
            const closeEl = modal.querySelector('.close');
            const close = () => { document.body.removeChild(modal); };
            closeEl.addEventListener('click', close);
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        });
    }
}

// UpdateStatus栏
function updateStatusBar() {
    const total = testData ? testData.items.length : 0;
    const completed = testResults.length;
    const success = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('progressCount').textContent = completed;
    document.getElementById('successCount').textContent = success;
    document.getElementById('errorCount').textContent = failed;
}

// CompleteTest
function completeTest() {
    isTestRunning = false;
    isPaused = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停Test';
    document.getElementById('continueBtn').style.display = 'none';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    

    let completionMessage = 'TestComplete! Success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
    
    // Addbase APIPathInformation
            if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                completionMessage += ' | Base API: ' + testData.customBaseApiPaths[0];
            } else {
                completionMessage += ' | Base APIs: ' + testData.customBaseApiPaths.join(', ');
            }
        }
    
    document.getElementById('testInfo').textContent = completionMessage;

}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// UpdateDomainFilter选Item
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的Domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // SaveCurrent选择的值
    const currentValue = domainFilter.value;
    
    // Clear现有选Item（除了"AllDomain"）
    domainFilter.innerHTML = '<option value="all">AllDomain</option>';
    
    // AddDomain选Item
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之Before的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// FilterResult
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const domainCell = row.cells[1].textContent.trim(); // Domain列是第1列（Index1）
        const statusCell = row.cells[3].textContent.trim(); // Status code列现在是第3列（Index3）
        const resultCell = row.cells[6].textContent.trim(); // Result列现在是第6列（Index6）
        
        // DomainFilter
        if (domainFilter !== 'all' && domainCell !== domainFilter) {
            show = false;
        }
        
        // StatusFilter
        if (show && statusFilter === 'success' && resultCell !== 'Success') {
            show = false;
        } else if (show && statusFilter === 'error' && resultCell !== 'Failed') {
            show = false;
        }
        
        // Status codeFilter - Fix逻辑，Only对数字Status codePerformFilter
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            
            // Only对Valid的数字Status codePerformFilter，非数字Status code（如Timeout、Error等）Do not display
            if (isNaN(statusCode)) {
                show = false;
            } else {
                switch (statusCodeFilter) {
                    case '2xx':
                        show = statusCode >= 200 && statusCode < 300;
                        break;
                    case '3xx':
                        show = statusCode >= 300 && statusCode < 400;
                        break;
                    case '4xx':
                        show = statusCode >= 400 && statusCode < 500;
                        break;
                    case '5xx':
                        show = statusCode >= 500 && statusCode < 600;
                        break;
                    default:
                        show = false;
                }
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// DisplayExport弹窗
function showExportModal() {
    if (testResults.length === 0) {
        alert('NoTestResultCanExport');
        return;
    }
    
    document.getElementById('exportModal').style.display = 'flex';
}

// 隐藏Export弹窗
function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// Export为JSON
function exportAsJSON() {
    const data = {
        testInfo: {
            category: testData.categoryTitle,
            method: testData.method,
            total: testResults.length,
            success: testResults.filter(r => r.success).length,
            failed: testResults.filter(r => !r.success).length,

            timestamp: new Date().toISOString(),
            baseUrl: testData.baseUrl,
            customBaseApiPaths: testData.customBaseApiPaths || []

        },
        results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.json');
}

// Export为CSV
function exportAsCSV() {
    const headers = ['序号', 'url', 'Status code', 'Status文本', '大小', '耗时', 'Result'];
    const csvContent = [
        headers.join(','),
        ...testResults.map(result => [
            result.index + 1,
            '"' + (result.fullUrl || result.url) + '"',
            result.status,
            '"' + result.statusText + '"',
            result.size,
            result.time,
            result.success ? 'Success' : 'Failed'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.csv');
}

// 下载File
function downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ClearResult
function clearResults() {
    if (confirm('Confirm要Clear所有TestResult吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = 'ResultCleared';
    }
}

function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[m]));
}
function formatHeaders(h) {
    try {
        if (!h) return '';
        if (Array.isArray(h)) return h.map(kv => kv.join(': ')).join('\n');
        if (typeof h === 'object') {
            return Object.entries(h).map(([k,v]) => k + ': ' + v).join('\n');
        }
        return String(h);
    } catch(_) { return ''; }
}
// Format字节大小
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}