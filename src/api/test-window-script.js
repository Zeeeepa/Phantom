// script window test - file of 独立JavaScript
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// initialize complete load page of after
async function initializePage() {
    //console.log('complete load page，start test 准备');
    
    try {
        // configuration test read from chrome.storage
        const result = await chrome.storage.local.get(['testConfig']);
        
        if (!result.testConfig) {
            console.error('data configuration test to 找不');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: data configuration test to 找不</div>';
            return;
        }
        
        testData = result.testConfig;
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('loaded successfully configuration test:', testData);
        
        // update information page
        document.getElementById('testInfo').textContent = 
            `${testData.categoryTitle} | ${testData.method} | ${testData.items.length}  item(s)`;
        document.getElementById('totalCount').textContent = testData.items.length;
        

        // display base API path custom domain information and
        const baseUrlInfo = document.getElementById('baseUrlInfo');
        let infoText = `URL basic: ${testData.baseUrl}`;
        
        if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                infoText += ` | Base API path: ${testData.customBaseApiPaths[0]}`;
            } else {
                infoText += ` | Base API path: ${testData.customBaseApiPaths.length} item(s) (${testData.customBaseApiPaths.join(', ')})`;
            }
        }
        
        if (testData.customDomains && testData.customDomains.length > 0) {
            if (testData.customDomains.length === 1) {
                infoText += ` | custom domain: ${testData.customDomains[0]}`;
            } else {
                infoText += ` | custom domain: ${testData.customDomains.length} item(s) (${testData.customDomains.join(', ')})`;
            }
        }
        
        baseUrlInfo.textContent = infoText;

    } catch (error) {
        console.error('failed data configuration read:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: failed data configuration read - ' + error.message + '</div>';
        return;
    }
    
    // add event listen 器
    document.getElementById('continueBtn').addEventListener('click', continueTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    document.getElementById('domainFilter').addEventListener('change', filterResults);
    
    // export event listen 弹窗器
    document.getElementById('closeModal').addEventListener('click', hideExportModal);
    document.getElementById('exportJSON').addEventListener('click', () => {
        hideExportModal();
        exportAsJSON();
    });
    document.getElementById('exportCSV').addEventListener('click', () => {
        hideExportModal();
        exportAsCSV();
    });
    
    // close 点击弹窗外部
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportModal') {
            hideExportModal();
        }
    });
    
    // add event listen 表头排序器
    const tableHeaders = document.querySelectorAll('th[data-column]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = parseInt(this.getAttribute('data-column'));
            //console.log('点击表头， column(s) 索引:', columnIndex);
            sortTable(columnIndex);
        });
    });
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('data test 无效');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: test project of has 没要</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// variable related 排序
let currentSortColumn = -1;
let sortDirection = 'asc'; // 'asc' 或 'desc'

// 排序表格
function sortTable(columnIndex) {
    const table = document.getElementById('resultsTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // if column(s) of yes 点击同一，切换排序方向
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }
    
    // update 排序指示器
    updateSortIndicators(columnIndex);
    
    //  line(s) 排序
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // process type line(s) column(s) of 根据进不同排序
        switch (columnIndex) {
            case 0: // 序号
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
                break;
            case 3: // status code
                // status code digit(s) 优先，status code digit(s) after 非排在面
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
            case 5: // when 耗
                aValue = parseTimeToMs(aValue);
                bValue = parseTimeToMs(bValue);
                break;
            case 1: // domain
            case 2: // URL
            case 6: // results
            default:
                // characters 串排序
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
        }
        
        let result = 0;
        if (aValue < bValue) result = -1;
        else if (aValue > bValue) result = 1;
        
        return sortDirection === 'asc' ? result : -result;
    });
    
    // re- line(s) of after 插入排序
    rows.forEach(row => tbody.appendChild(row));
}

// update 排序指示器
function updateSortIndicators(activeColumn) {
    // reset all 指示器
    for (let i = 0; i <= 5; i++) {
        const indicator = document.getElementById(`sort-${i}`);
        if (indicator) {
            indicator.textContent = '↕';
            indicator.classList.remove('active');
        }
    }
    
    // settings current column(s) of 指示器
    const activeIndicator = document.getElementById(`sort-${activeColumn}`);
    if (activeIndicator) {
        activeIndicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
        activeIndicator.classList.add('active');
    }
}

// parse as 大小字节数
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

// parse seconds as when 间毫数
function parseTimeToMs(timeStr) {
    if (timeStr === 'N/A' || !timeStr) return 0;
    
    const match = timeStr.match(/^([0-9.]+)ms$/);
    if (!match) return 0;
    
    return parseFloat(match[1]);
}

// initialize complete load auto page after
document.addEventListener('DOMContentLoaded', initializePage);

// start test
async function startTest() {
    //console.log('startTest call 被');
    
    if (!testData || isTestRunning) return;
    
    if (!testData.items || testData.items.length === 0) {
        console.error('test project of has 没要');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: test project of has 没要</div>';
        return;
    }
    
    //console.log('start test，project 数:', testData.items.length);
    
    // test items path extension item(s) with 支持多baseapi
    const expandedItems = expandItemsForMultipleBasePaths(testData.items, testData.categoryKey, testData.baseUrl);
    testData.items = expandedItems;
    
    //console.log(`🔧 test items original 数: ${testData.items.length}, extension project after 数: ${expandedItems.length}`);
    
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
        console.error('error test when 启动发生:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">failed test 启动: ' + error.message + '</div>';
    }
}

// continue test
function continueTest() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseBtn').textContent = 'pause test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// pause test
function pauseTest() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseBtn').textContent = 'continue test';
        document.getElementById('continueBtn').style.display = 'none';
    } else {
        document.getElementById('pauseBtn').textContent = 'pause test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// process request 下一批
function processNextBatch() {
    //console.log('processNextBatch call 被');
    //console.log('isPaused:', isPaused, 'isTestRunning:', isTestRunning);
    //console.log('activeRequests:', activeRequests, 'maxConcurrency:', maxConcurrency);
    //console.log('currentIndex:', currentIndex, 'items.length:', testData.items.length);
    
    if (isPaused || !isTestRunning) {
        //console.log('pause test line(s) 被或未运，退出');
        return;
    }
    
    if (currentIndex >= testData.items.length) {
        //console.log('complete process all project 已');
        return;
    }
    
    let batchStarted = false;
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        batchStarted = true;
        
        //console.log('start process project:', itemIndex, item);
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                //console.log('complete request:', itemIndex, result);
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('complete request all，call completeTest');
                    completeTest();
                }
            })
            .catch(error => {
                console.error('failed process request:', error);
                activeRequests--;
                // test items process extension of after
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
                    //console.log('complete request all（error 含），call completeTest');
                    completeTest();
                }
            });
    }
    
    if (batchStarted) {
        //console.log(' time(s) 批已启动，request current 活跃数:', activeRequests);
    } else {
        //console.log('new time(s) has 没启动批');
    }
}

// process request item(s) 单
async function processSingleRequest(item, index) {
    try {
        // test items process extension of after
        let displayItem = item;
        let url;
        
        if (typeof item === 'object' && item.fullUrl) {
            // extension project of yes after 这
            displayItem = item.displayText || item.originalItem;
            url = item.fullUrl;
        } else {
            // original project yes 这
            url = buildTestUrl(item, testData.categoryKey, testData.baseUrl);
        }
        
        if (!url) {
            return {
                url: displayItem,
                fullUrl: 'Invalid URL',
                status: 'Error',
                statusText: 'URL has 无法构建效',
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
        // text get 始终尝试预览
        try {
            textContentOuter = await (response.clone ? response.clone().text() : response.text());
        } catch (_) {
            textContentOuter = '';
        }
        // response 计算大小：return background of 优先 use byteSize；再 otherwise Content-Length；用 UTF-8 length 字节
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

        // extracted headers content 与预览
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
            statusText: error.message || 'exception 未知',
            size: 'N/A',
            time: 'N/A',
            success: false,
            index: index
        };
    }
}

// URL test 构建
function buildTestUrl(item, categoryKey, baseUrl) {
    try {
        let url = item;
        
        // fixed：object if yes item，extracted value属性
        if (typeof item === 'object' && item !== null) {
            url = item.value || item.url || item;
            console.log('buildTestUrl: URL extracted object from:', url, 'object original:', item);
        }
        
        // fixed：type characters yes 确保url串
        if (!url || typeof url !== 'string') {
            console.error('buildTestUrl: parameters url无效:', url);
            return baseUrl || 'https://example.com';
        }

        // custom get base API path
        const customBaseApiPaths = testData.customBaseApiPaths || [];
        
        console.log(`🔧 [buildTestUrl] URL 构建: original="${url}", 分类="${categoryKey}", URL basic="${baseUrl}", API path Base=${JSON.stringify(customBaseApiPaths)}`);

        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {
                    // custom if has base API path，add 先它
                    if (customBaseApiPaths.length > 0) {
                        // path use first item(s) baseapi（after 保持向兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // starts with with with 确保baseApiPath/但不/结尾（path yes 除非根）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + url;
                        console.log(`🔧 [buildTestUrl] absolute path API +Base: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + url;
                        console.log(`🔧 [buildTestUrl] absolute path: "${baseUrl}" + "${item}" = "${url}"`);
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                    // 🔥 fixed：自动去除relative path开头的"."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [buildTestUrl] 去除relative path开头的"./": "${url}" -> "${cleanedUrl}"`);
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
                        console.log(`🔧 [buildTestUrl] 去除relative path开头的".": "${url}" -> "${cleanedUrl}"`);
                    }
                    
                    // custom if has base API path，add 先它
                    if (customBaseApiPaths.length > 0) {
                        // path use first item(s) baseapi（after 保持向兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // starts with with with 确保baseApiPath/但不/结尾（path yes 除非根）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] relative path API +Base: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${cleanedUrl}" = "${url}"`);
                    } else {
                        url = baseUrl + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] relative path: "${baseUrl}" + "/" + "${cleanedUrl}" = "${url}"`);
                    }
                }
                break;
                
            case 'urls':
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                    console.log(`🔧 [buildTestUrl] URL 完整: "http://" + "${item}" = "${url}"`);
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !url.startsWith('http')) {
                    if (url.startsWith('/')) {
                        // custom if has base API path，add 先它
                        if (customBaseApiPaths.length > 0) {
                            // path use first item(s) baseapi（after 保持向兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + url;
                            console.log(`🔧 [buildTestUrl] file path API +Base: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + url;
                            console.log(`🔧 [buildTestUrl] file path: "${baseUrl}" + "${item}" = "${url}"`);
                        }
                    } else {
                        // custom if has base API path，add 先它
                        if (customBaseApiPaths.length > 0) {
                            // path use first item(s) baseapi（after 保持向兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + '/' + url;
                            console.log(`🔧 [buildTestUrl] API file 相对+Base: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + '/' + url;
                            console.log(`🔧 [buildTestUrl] file 相对: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !url.startsWith('http')) {
                    // custom if has base API path，add 先它
                    if (customBaseApiPaths.length > 0) {
                        // path use first item(s) baseapi（after 保持向兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] API default +Base: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] default: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                    }
                }
        }
        
        // cleanup of 多余斜杠
        url = url.replace(/([^:]\/)\/+/g, '$1');
        
        console.log(`✅ [buildTestUrl] URL final: "${url}"`);
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('URL failed 构建:', error, item);
        return null;
    }
}

/**
 * test items custom path domain item(s) as and 多baseapi生成
 * @param {Array} items - test items original
 * @param {string} categoryKey - class 分键
 * @param {string} baseUrl - URL basic
 * @returns {Array} - test items extension of after
 */
function expandItemsForMultipleBasePaths(items, categoryKey, baseUrl) {
    const customBaseApiPaths = testData.customBaseApiPaths || [];
    const customDomains = testData.customDomains || [];
    
    // extension project yes 总需要，custom domain domain process original as and when 因我们需要同
    // path if item(s) has 既没多baseapi，custom domain has 也没，return original directly project
    if (customBaseApiPaths.length <= 1 && customDomains.length === 0) {
        return items;
    }
    
    const expandedItems = [];
    
    items.forEach(item => {
        // custom domain process
        if (customDomains.length > 0) {
            customDomains.forEach(customDomain => {
                // custom if has Base API path，custom add domain item(s) item(s) as 每每Base API path
                if (customBaseApiPaths.length > 0) {
                    customBaseApiPaths.forEach(basePath => {
                        let url = item;
                        
                        // fixed：object if yes item，extracted value属性
                        if (typeof item === 'object' && item !== null) {
                            url = item.value || item.url || item;
                        }
                        
                        // fixed：type characters yes 确保url串
                        if (!url || typeof url !== 'string') {
                            console.error('expandItemsForMultipleBasePaths: parameters url无效:', url);
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
                                    // 🔥 fixed：自动去除relative path开头的"."
                                    let cleanedUrl = url;
                                    if (cleanedUrl.startsWith('./')) {
                                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                        console.log(`🔧 [expandItems-customDomain] 去除relative path开头的"./": "${url}" -> "${cleanedUrl}"`);
                                    } else if (cleanedUrl.startsWith('.')) {
                                        cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
                                        console.log(`🔧 [expandItems-customDomain] 去除relative path开头的".": "${url}" -> "${cleanedUrl}"`);
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
                        
                        // custom add domain +Base API path test items of
                        expandedItems.push({
                            originalItem: item,
                            customDomain: customDomain,
                            baseApiPath: basePath,
                            fullUrl: url,
                            displayText: `${item} (${customDomain}${basePath})`
                        });
                    });
                } else {
                    // custom has 没Base API path，custom domain use directly
                    let url = item;
                    
                    // fixed：object if yes item，extracted value属性
                    if (typeof item === 'object' && item !== null) {
                        url = item.value || item.url || item;
                    }
                    
                    // fixed：type characters yes 确保url串
                    if (!url || typeof url !== 'string') {
                        console.error('expandItemsForMultipleBasePaths: parameters url无效:', url);
                        return;
                    }
                    
                    switch (categoryKey) {
                        case 'absoluteApis':
                        case 'paths':
                            // fixed：type characters yes 确保url串
                            if (typeof url === 'string' && url.startsWith('/')) {
                                url = customDomain + url;
                            }
                            break;
                            
                        case 'relativeApis':
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                // 🔥 fixed：自动去除relative path开头的"."
                                let cleanedUrl = url;
                                if (cleanedUrl.startsWith('./')) {
                                    cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除relative path开头的"./": "${url}" -> "${cleanedUrl}"`);
                                } else if (cleanedUrl.startsWith('.')) {
                                    cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除relative path开头的".": "${url}" -> "${cleanedUrl}"`);
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
                    
                    // test items custom add domain of
                    expandedItems.push({
                        originalItem: item,
                        customDomain: customDomain,
                        fullUrl: url,
                        displayText: `${item} (${customDomain})`
                    });
                }
            });
        }
        
        // process Base API path（if item(s) has 多）
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
                            // 🔥 fixed：自动去除relative path开头的"."
                            let cleanedUrl = url;
                            if (cleanedUrl.startsWith('./')) {
                                cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                console.log(`🔧 [expandItems-basePath] 去除relative path开头的"./": "${url}" -> "${cleanedUrl}"`);
                            } else if (cleanedUrl.startsWith('.')) {
                                cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
                                console.log(`🔧 [expandItems-basePath] 去除relative path开头的".": "${url}" -> "${cleanedUrl}"`);
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
                
                // add extension project of after，path information contains original project of and 对应baseapi
                expandedItems.push({
                    originalItem: item,
                    baseApiPath: basePath,
                    fullUrl: url,
                    displayText: `${item} (${basePath})`
                });
            });
        }
        
        // add original project yes 总（domain original use）
        let originalUrl = item;
        
        // fixed：object if yes item，extracted value属性
        if (typeof item === 'object' && item !== null) {
            originalUrl = item.value || item.url || item;
        }
        
        // fixed：type characters yes 确保originalUrl串
        if (!originalUrl || typeof originalUrl !== 'string') {
            console.warn('type characters yes originalUrl不串:', originalUrl);
            return expandedItems; // skip project item(s) 这
        }
        
        // 🔥 fixed：URL domain process original of 构建，path display 确保正确baseapi+
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
                    // 🔥 fixed：自动去除relative path开头的"."
                    let cleanedOriginalUrl = originalUrl;
                    if (cleanedOriginalUrl.startsWith('./')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [expandItems] 去除relative path开头的"./": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
                    } else if (cleanedOriginalUrl.startsWith('.')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(1); // of 去除单独 "."
                        console.log(`🔧 [expandItems] 去除relative path开头的".": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
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
        
        // cleanup of 多余斜杠
        originalUrl = originalUrl.replace(/([^:]\/)\/+/g, '$1');
        
        // test items add domain original of
        expandedItems.push({
            originalItem: item,
            fullUrl: originalUrl,
            displayText: `${item} (domain original)`
        });
    });
    
    return expandedItems;
}

// request send - script background via
async function makeRequest(url, method, timeout = 5000) {
    //console.log(`🌐 request script window background via test: ${url}`);
    
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
        // request script background send via（save auto use of 会Cookie）
        const response = await makeRequestViaBackground(url, requestOptions);
        return response;
    } catch (error) {
        console.error(`❌ failed request window test: ${error.message}`);
        
        // error return response object
        return {
            status: 'Error',
            statusText: error.message || 'failed request',
            ok: false,
            headers: new Headers()
        };
    }
}

// request script background send via
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
                // response object 模拟fetch
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

// add results to 表格
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    
    // 🔥 fixed：URL path display of 正确完整，path 包括baseapi+
    let displayUrl = (result.fullUrl || result.url || '');
    let fullDisplayUrl = displayUrl; // URL save display for 完整title
    
    try {
        if (displayUrl.startsWith('http')) {
            const u = new URL(displayUrl);
            // path display of 完整部分，path 包括baseapi
            displayUrl = u.pathname + (u.search || '') + (u.hash || '');
            fullDisplayUrl = u.href; // URL 完整
        }
    } catch (_) {
        // URL parsing failed if，保持原样
        fullDisplayUrl = displayUrl;
    }
    
    // domain information extracted
    let domainInfo = 'domain original';
    try {
        if (result.fullUrl && result.fullUrl.startsWith('http')) {
            const urlObj = new URL(result.fullUrl);
            domainInfo = urlObj.hostname + (urlObj.port ? ':' + urlObj.port : '');
        }
    } catch (e) {
        domainInfo = 'domain 未知';
    }
    
    // 🔥 fixed：URL path information display column(s) of 确保完整
    row.innerHTML = 
        '<td>' + (result.index + 1) + '</td>' +
        '<td class="url-cell" title="' + domainInfo + '">' + domainInfo + '</td>' +
        '<td class="url-cell" title="' + fullDisplayUrl + '">' + displayUrl + '</td>' +
        '<td class="' + statusClass + '">' + result.status + '</td>' +
        '<td>' + result.size + '</td>' +
        '<td>' + result.time + '</td>' +
        '<td class="' + statusClass + '">' + (result.success ? 'success' : 'failed') + '</td>' +
        '<td><button class="btn btn-primary btn-view" data-index="' + result.index + '">查看</button></td>';
    
    tbody.appendChild(row);
    
    // update domain options 筛选
    updateDomainFilter();

    // content response button 查看
    const viewBtn = row.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            const idx = parseInt(viewBtn.getAttribute('data-index'));
            const res = testResults.find(r => r.index === idx) || result;

            // dynamic 创建弹窗，page of 复用 .modal/.modal-content 样式
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';

            // content 构建（response original 仅展示报文：status line(s) + 头 + original Body；不渲染HTML）
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '900px';
            modalContent.style.width = '95%';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            const titleEl = document.createElement('h3');
            titleEl.textContent = 'details response';
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
                <div><strong>状态:</strong> ${escapeHtml(String(res.status))} ${escapeHtml(res.statusText || '')}</div>
                <div><strong>大小:</strong> ${escapeHtml(res.size || '')} (${res.byteSize || 0} B)</div>
                <div><strong>类型:</strong> ${escapeHtml(res.contentType || '')}</div>
            `;
            modalBody.appendChild(metaDiv);

            // response original 组装报文
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
            pre.textContent = rawResponse; // text 仅，避免HTML渲染
            modalBody.appendChild(pre);

            if (res.rawBodyTruncated) {
                const tip = document.createElement('div');
                tip.style.fontSize = '12px';
                tip.style.color = '#ccc';
                tip.style.marginTop = '6px';
                tip.textContent = 'content 已截断展示（before 256 KB）';
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

// update status 栏
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

// complete test
function completeTest() {
    isTestRunning = false;
    isPaused = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = 'pause test';
    document.getElementById('continueBtn').style.display = 'none';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    

    let completionMessage = 'complete test! success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
    
    // add base API path information
            if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                completionMessage += ' | Base API: ' + testData.customBaseApiPaths[0];
            } else {
                completionMessage += ' | Base APIs: ' + testData.customBaseApiPaths.join(', ');
            }
        }
    
    document.getElementById('testInfo').textContent = completionMessage;

}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain options 筛选
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // domain collected all of 唯一
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save select current of 值
    const currentValue = domainFilter.value;
    
    // clear options has 现（除了"all domains"）
    domainFilter.innerHTML = '<option value="all">all domains</option>';
    
    // add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // select resume of before 之（if 还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// results 筛选
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const domainCell = row.cells[1].textContent.trim(); // domain column(s) column(s) yes # 1（索引1）
        const statusCell = row.cells[3].textContent.trim(); // status code column(s) column(s) yes # 现在3（索引3）
        const resultCell = row.cells[6].textContent.trim(); // results column(s) column(s) yes # 现在6（索引6）
        
        // domain 筛选
        if (domainFilter !== 'all' && domainCell !== domainFilter) {
            show = false;
        }
        
        // status 筛选
        if (show && statusFilter === 'success' && resultCell !== 'success') {
            show = false;
        } else if (show && statusFilter === 'error' && resultCell !== 'failed') {
            show = false;
        }
        
        // status code 筛选 - fixed 逻辑，status code digit(s) line(s) 只对进筛选
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            
            // status code digit(s) line(s) of has 只对效进筛选，status code digit(s) 非（如Timeout、, etc. Error）display 不
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

// export display 弹窗
function showExportModal() {
    if (testResults.length === 0) {
        alert('export results can test has 没');
        return;
    }
    
    document.getElementById('exportModal').style.display = 'flex';
}

// export hide 弹窗
function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// export as JSON
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

// export as CSV
function exportAsCSV() {
    const headers = ['序号', 'url', 'status code', 'text status', '大小', 'when 耗', 'results'];
    const csvContent = [
        headers.join(','),
        ...testResults.map(result => [
            result.index + 1,
            '"' + (result.fullUrl || result.url) + '"',
            result.status,
            '"' + result.statusText + '"',
            result.size,
            result.time,
            result.success ? 'success' : 'failed'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.csv');
}

// download file
function downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// clear results
function clearResults() {
    if (confirm('clear results all test 确定要吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = 'clear results 已';
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
// format 化字节大小
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}