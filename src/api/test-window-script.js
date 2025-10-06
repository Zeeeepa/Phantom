// test window script - 独立 JavaScript file
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// page load complete 后  initialize
async function initializePage() {
    //console.log('page load complete，准备 start test');
    
    try {
        // fromchrome.storageread test configuration
        const result = await chrome.storage.local.get(['testConfig']);
        
        if (!result.testConfig) {
            console.error('找do not到 test configuration data');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 找do not到 test configuration data</div>';
            return;
        }
        
        testData = result.testConfig;
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('test configuration load success:', testData);
        
        // update page information
        document.getElementById('testInfo').textContent = 
            `${testData.categoryTitle} | ${testData.method} | ${testData.items.length} 项`;
        document.getElementById('totalCount').textContent = testData.items.length;
        

        // display base API path and custom domain information
        const baseUrlInfo = document.getElementById('baseUrlInfo');
        let infoText = `basicURL: ${testData.baseUrl}`;
        
        if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                infoText += ` | Base API path: ${testData.customBaseApiPaths[0]}`;
            } else {
                infoText += ` | Base API path: ${testData.customBaseApiPaths.length} items (${testData.customBaseApiPaths.join(', ')})`;
            }
        }
        
        if (testData.customDomains && testData.customDomains.length > 0) {
            if (testData.customDomains.length === 1) {
                infoText += ` | custom domain: ${testData.customDomains[0]}`;
            } else {
                infoText += ` | custom domain: ${testData.customDomains.length} items (${testData.customDomains.join(', ')})`;
            }
        }
        
        baseUrlInfo.textContent = infoText;

    } catch (error) {
        console.error('read configuration data failed:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: read configuration data failed - ' + error.message + '</div>';
        return;
    }
    
    // add event listener
    document.getElementById('continueBtn').addEventListener('click', continueTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    document.getElementById('domainFilter').addEventListener('change', filterResults);
    
    // export popup event listener
    document.getElementById('closeModal').addEventListener('click', hideExportModal);
    document.getElementById('exportJSON').addEventListener('click', () => {
        hideExportModal();
        exportAsJSON();
    });
    document.getElementById('exportCSV').addEventListener('click', () => {
        hideExportModal();
        exportAsCSV();
    });
    
    // 点击popup外部 close
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportModal') {
            hideExportModal();
        }
    });
    
    // add 表头 sort event listener
    const tableHeaders = document.querySelectorAll('th[data-column]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = parseInt(this.getAttribute('data-column'));
            //console.log('点击表头，列索引:', columnIndex);
            sortTable(columnIndex);
        });
    });
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('test data invalid');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 没有要 test  项目</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// sort 相关 variable
let currentSortColumn = -1;
let sortDirection = 'asc'; // 'asc' or 'desc'

// sort table
function sortTable(columnIndex) {
    const table = document.getElementById('resultsTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 如果点击 是同一列，切换 sort 方向
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }
    
    // update sort 指示器
    updateSortIndicators(columnIndex);
    
    // sort 行
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // root 据列 type 进行do not同  sort process
        switch (columnIndex) {
            case 0: // 序号
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
                break;
            case 3: // status 码
                // number status 码优先，非 number status 码排in后面
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
            case 4: // size
                aValue = parseSizeToBytes(aValue);
                bValue = parseSizeToBytes(bValue);
                break;
            case 5: // 耗时
                aValue = parseTimeToMs(aValue);
                bValue = parseTimeToMs(bValue);
                break;
            case 1: // domain
            case 2: // URL
            case 6: // result
            default:
                // string sort
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
        }
        
        let result = 0;
        if (aValue < bValue) result = -1;
        else if (aValue > bValue) result = 1;
        
        return sortDirection === 'asc' ? result : -result;
    });
    
    // 重新插入 sort 后 行
    rows.forEach(row => tbody.appendChild(row));
}

// update sort 指示器
function updateSortIndicators(activeColumn) {
    // 重置all指示器
    for (let i = 0; i <= 5; i++) {
        const indicator = document.getElementById(`sort-${i}`);
        if (indicator) {
            indicator.textContent = '↕';
            indicator.classList.remove('active');
        }
    }
    
    // settings current 列 指示器
    const activeIndicator = document.getElementById(`sort-${activeColumn}`);
    if (activeIndicator) {
        activeIndicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
        activeIndicator.classList.add('active');
    }
}

// 解析 size to字节数
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

// 解析时间to毫秒数
function parseTimeToMs(timeStr) {
    if (timeStr === 'N/A' || !timeStr) return 0;
    
    const match = timeStr.match(/^([0-9.]+)ms$/);
    if (!match) return 0;
    
    return parseFloat(match[1]);
}

// page load complete 后 automatic initialize
document.addEventListener('DOMContentLoaded', initializePage);

// start test
async function startTest() {
    //console.log('startTest passive marker调用');
    
    if (!testData || isTestRunning) return;
    
    if (!testData.items || testData.items.length === 0) {
        console.error('没有要 test  项目');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 没有要 test  项目</div>';
        return;
    }
    
    //console.log('start test，项目数:', testData.items.length);
    
    // extension test 项目以support多个baseapi path
    const expandedItems = expandItemsForMultipleBasePaths(testData.items, testData.categoryKey, testData.baseUrl);
    testData.items = expandedItems;
    
    //console.log(`🔧 原始 test 项目数: ${testData.items.length}, extension 后项目数: ${expandedItems.length}`);
    
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
        console.error('启动 test 时发生 error:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">启动 test failed: ' + error.message + '</div>';
    }
}

// 继续 test
function continueTest() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停 test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 暂停 test
function pauseTest() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseBtn').textContent = '继续 test';
        document.getElementById('continueBtn').style.display = 'none';
    } else {
        document.getElementById('pauseBtn').textContent = '暂停 test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// process 下一批 request
function processNextBatch() {
    //console.log('processNextBatch passive marker调用');
    //console.log('isPaused:', isPaused, 'isTestRunning:', isTestRunning);
    //console.log('activeRequests:', activeRequests, 'maxConcurrency:', maxConcurrency);
    //console.log('currentIndex:', currentIndex, 'items.length:', testData.items.length);
    
    if (isPaused || !isTestRunning) {
        //console.log('test passive marker暂停or未运行，退出');
        return;
    }
    
    if (currentIndex >= testData.items.length) {
        //console.log('all项目already process complete');
        return;
    }
    
    let batchStarted = false;
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        batchStarted = true;
        
        //console.log('start process 项目:', itemIndex, item);
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                //console.log('request complete:', itemIndex, result);
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('all request complete，调用 completeTest');
                    completeTest();
                }
            })
            .catch(error => {
                console.error('request process failed:', error);
                activeRequests--;
                // process extension 后  test 项目
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
                    //console.log('all request complete（含 error），调用 completeTest');
                    completeTest();
                }
            });
    }
    
    if (batchStarted) {
        //console.log('批次already启动，current 活跃 request 数:', activeRequests);
    } else {
        //console.log('没有启动新 批次');
    }
}

// process single request
async function processSingleRequest(item, index) {
    try {
        // process extension 后  test 项目
        let displayItem = item;
        let url;
        
        if (typeof item === 'object' && item.fullUrl) {
            // 这是 extension 后 项目
            displayItem = item.displayText || item.originalItem;
            url = item.fullUrl;
        } else {
            // 这是原始项目
            url = buildTestUrl(item, testData.categoryKey, testData.baseUrl);
        }
        
        if (!url) {
            return {
                url: displayItem,
                fullUrl: 'Invalid URL',
                status: 'Error',
                statusText: '无法构建 valid URL',
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
        // 始终尝试获取 text preview
        try {
            textContentOuter = await (response.clone ? response.clone().text() : response.text());
        } catch (_) {
            textContentOuter = '';
        }
        // 计算 response size：优先background返回  byteSize；再use Content-Length；否则用 UTF-8 字节 length
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

        // extract headers 与 content preview
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
            statusText: error.message || '未知 abnormal',
            size: 'N/A',
            time: 'N/A',
            success: false,
            index: index
        };
    }
}

// 构建 test URL
function buildTestUrl(item, categoryKey, baseUrl) {
    try {
        let url = item;
        
        // fix：如果item是 object，extract value属性
        if (typeof item === 'object' && item !== null) {
            url = item.value || item.url || item;
            console.log('buildTestUrl: from object extract URL:', url, '原始 object:', item);
        }
        
        // fix：确保url是 string type
        if (!url || typeof url !== 'string') {
            console.error('buildTestUrl: url parameter invalid:', url);
            return baseUrl || 'https://example.com';
        }

        // 获取 custom base API path
        const customBaseApiPaths = testData.customBaseApiPaths || [];
        
        console.log(`🔧 [buildTestUrl] 构建URL: 原始="${url}", 分类="${categoryKey}", basicURL="${baseUrl}", BaseAPI path =${JSON.stringify(customBaseApiPaths)}`);

        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {
                    // 如果有 custom base API path，先 add 它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi path（保持向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // 确保baseApiPath以/开头但do not以/结尾（除非是 root path）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + url;
                        console.log(`🔧 [buildTestUrl] 绝对 path +BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + url;
                        console.log(`🔧 [buildTestUrl] 绝对 path: "${baseUrl}" + "${item}" = "${url}"`);
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                    // 🔥 fix：自动去除相对 path开头 "."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [buildTestUrl] 去除相对 path开头 "./": "${url}" -> "${cleanedUrl}"`);
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                        console.log(`🔧 [buildTestUrl] 去除相对 path开头 ".": "${url}" -> "${cleanedUrl}"`);
                    }
                    
                    // 如果有 custom base API path，先 add 它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi path（保持向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // 确保baseApiPath以/开头但do not以/结尾（除非是 root path）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] 相对 path +BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${cleanedUrl}" = "${url}"`);
                    } else {
                        url = baseUrl + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] 相对 path: "${baseUrl}" + "/" + "${cleanedUrl}" = "${url}"`);
                    }
                }
                break;
                
            case 'urls':
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                    console.log(`🔧 [buildTestUrl] completeURL: "http://" + "${item}" = "${url}"`);
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !url.startsWith('http')) {
                    if (url.startsWith('/')) {
                        // 如果有 custom base API path，先 add 它
                        if (customBaseApiPaths.length > 0) {
                            // use第一个baseapi path（保持向后兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + url;
                            console.log(`🔧 [buildTestUrl] file path +BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + url;
                            console.log(`🔧 [buildTestUrl] file path: "${baseUrl}" + "${item}" = "${url}"`);
                        }
                    } else {
                        // 如果有 custom base API path，先 add 它
                        if (customBaseApiPaths.length > 0) {
                            // use第一个baseapi path（保持向后兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对 file +BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对 file: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !url.startsWith('http')) {
                    // 如果有 custom base API path，先 add 它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi path（保持向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] default +BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] default: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                    }
                }
        }
        
        // cleanup 多余 斜杠
        url = url.replace(/([^:]\/)\/+/g, '$1');
        
        console.log(`✅ [buildTestUrl] 最终URL: "${url}"`);
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('构建URL failed:', error, item);
        return null;
    }
}

/**
 * to多个baseapi path and custom domain 生成 test 项目
 * @param {Array} items - 原始 test 项目
 * @param {string} categoryKey - 分类 key
 * @param {string} baseUrl - basicURL
 * @returns {Array} - extension 后  test 项目
 */
function expandItemsForMultipleBasePaths(items, categoryKey, baseUrl) {
    const customBaseApiPaths = testData.customBaseApiPaths || [];
    const customDomains = testData.customDomains || [];
    
    // 总是require extension 项目，因to我们require同时 process 原始 domain and custom domain
    // 如果既没有多个baseapi path，也没有 custom domain，directly返回原始项目
    if (customBaseApiPaths.length <= 1 && customDomains.length === 0) {
        return items;
    }
    
    const expandedItems = [];
    
    items.forEach(item => {
        // process custom domain
        if (customDomains.length > 0) {
            customDomains.forEach(customDomain => {
                // 如果有 custom Base API path，to每个 custom domain add 每个Base API path
                if (customBaseApiPaths.length > 0) {
                    customBaseApiPaths.forEach(basePath => {
                        let url = item;
                        
                        // fix：如果item是 object，extract value属性
                        if (typeof item === 'object' && item !== null) {
                            url = item.value || item.url || item;
                        }
                        
                        // fix：确保url是 string type
                        if (!url || typeof url !== 'string') {
                            console.error('expandItemsForMultipleBasePaths: url parameter invalid:', url);
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
                                    // 🔥 fix：自动去除相对 path开头 "."
                                    let cleanedUrl = url;
                                    if (cleanedUrl.startsWith('./')) {
                                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                        console.log(`🔧 [expandItems-customDomain] 去除相对 path开头 "./": "${url}" -> "${cleanedUrl}"`);
                                    } else if (cleanedUrl.startsWith('.')) {
                                        cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                                        console.log(`🔧 [expandItems-customDomain] 去除相对 path开头 ".": "${url}" -> "${cleanedUrl}"`);
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
                        
                        // add custom domain +Base API path   test 项目
                        expandedItems.push({
                            originalItem: item,
                            customDomain: customDomain,
                            baseApiPath: basePath,
                            fullUrl: url,
                            displayText: `${item} (${customDomain}${basePath})`
                        });
                    });
                } else {
                    // 没有 custom Base API path，directlyuse custom domain
                    let url = item;
                    
                    // fix：如果item是 object，extract value属性
                    if (typeof item === 'object' && item !== null) {
                        url = item.value || item.url || item;
                    }
                    
                    // fix：确保url是 string type
                    if (!url || typeof url !== 'string') {
                        console.error('expandItemsForMultipleBasePaths: url parameter invalid:', url);
                        return;
                    }
                    
                    switch (categoryKey) {
                        case 'absoluteApis':
                        case 'paths':
                            // fix：确保url是 string type
                            if (typeof url === 'string' && url.startsWith('/')) {
                                url = customDomain + url;
                            }
                            break;
                            
                        case 'relativeApis':
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                // 🔥 fix：自动去除相对 path开头 "."
                                let cleanedUrl = url;
                                if (cleanedUrl.startsWith('./')) {
                                    cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除相对 path开头 "./": "${url}" -> "${cleanedUrl}"`);
                                } else if (cleanedUrl.startsWith('.')) {
                                    cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除相对 path开头 ".": "${url}" -> "${cleanedUrl}"`);
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
                    
                    // add custom domain   test 项目
                    expandedItems.push({
                        originalItem: item,
                        customDomain: customDomain,
                        fullUrl: url,
                        displayText: `${item} (${customDomain})`
                    });
                }
            });
        }
        
        // process Base API path（如果有多个）
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
                            // 🔥 fix：自动去除相对 path开头 "."
                            let cleanedUrl = url;
                            if (cleanedUrl.startsWith('./')) {
                                cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                console.log(`🔧 [expandItems-basePath] 去除相对 path开头 "./": "${url}" -> "${cleanedUrl}"`);
                            } else if (cleanedUrl.startsWith('.')) {
                                cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                                console.log(`🔧 [expandItems-basePath] 去除相对 path开头 ".": "${url}" -> "${cleanedUrl}"`);
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
                
                // add extension 后 项目，contains 原始项目and对应 baseapi path information
                expandedItems.push({
                    originalItem: item,
                    baseApiPath: basePath,
                    fullUrl: url,
                    displayText: `${item} (${basePath})`
                });
            });
        }
        
        // 总是 add 原始项目（use原始 domain）
        let originalUrl = item;
        
        // fix：如果item是 object，extract value属性
        if (typeof item === 'object' && item !== null) {
            originalUrl = item.value || item.url || item;
        }
        
        // fix：确保originalUrl是 string type
        if (!originalUrl || typeof originalUrl !== 'string') {
            console.warn('originalUrldo not是 string type:', originalUrl);
            return expandedItems; // skip这个项目
        }
        
        // 🔥 fix：process 原始 domain  URL构建，确保正确 display baseapi+ path
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
                    // 🔥 fix：自动去除相对 path开头 "."
                    let cleanedOriginalUrl = originalUrl;
                    if (cleanedOriginalUrl.startsWith('./')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [expandItems] 去除相对 path开头 "./": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
                    } else if (cleanedOriginalUrl.startsWith('.')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(1); // 去除单独  "."
                        console.log(`🔧 [expandItems] 去除相对 path开头 ".": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
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
        
        // cleanup 多余 斜杠
        originalUrl = originalUrl.replace(/([^:]\/)\/+/g, '$1');
        
        // add 原始 domain   test 项目
        expandedItems.push({
            originalItem: item,
            fullUrl: originalUrl,
            displayText: `${item} (原始 domain)`
        });
    });
    
    return expandedItems;
}

// 发送 request - 通throughbackground script
async function makeRequest(url, method, timeout = 5000) {
    //console.log(`🌐 test window 通throughbackground script request: ${url}`);
    
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
        // 通throughbackground script 发送 request（会 automatic use save  Cookie）
        const response = await makeRequestViaBackground(url, requestOptions);
        return response;
    } catch (error) {
        console.error(`❌ test window request failed: ${error.message}`);
        
        // 返回 error response object
        return {
            status: 'Error',
            statusText: error.message || 'request failed',
            ok: false,
            headers: new Headers()
        };
    }
}

// 通throughbackground script 发送 request
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
                // 模拟fetch response object
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

// add result 到 table
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    
    // 🔥 fix：正确 display complete URL path，package 括baseapi+ path
    let displayUrl = (result.fullUrl || result.url || '');
    let fullDisplayUrl = displayUrl; // save completeURLfortitle display
    
    try {
        if (displayUrl.startsWith('http')) {
            const u = new URL(displayUrl);
            // display complete  path partial，package 括baseapi path
            displayUrl = u.pathname + (u.search || '') + (u.hash || '');
            fullDisplayUrl = u.href; // completeURL
        }
    } catch (_) {
        // 如果URL解析 failed，保持原样
        fullDisplayUrl = displayUrl;
    }
    
    // extract domain information
    let domainInfo = '原始 domain';
    try {
        if (result.fullUrl && result.fullUrl.startsWith('http')) {
            const urlObj = new URL(result.fullUrl);
            domainInfo = urlObj.hostname + (urlObj.port ? ':' + urlObj.port : '');
        }
    } catch (e) {
        domainInfo = '未知 domain';
    }
    
    // 🔥 fix：确保URL列 display complete  path information
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
    
    // update domain filter option
    updateDomainFilter();

    // 查看 response content button
    const viewBtn = row.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            const idx = parseInt(viewBtn.getAttribute('data-index'));
            const res = testResults.find(r => r.index === idx) || result;

            // dynamic 创建popup，复用 page   .modal/.modal-content style
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';

            // 构建 content（仅展示原始 response 报文：status 行 + 头 + 原始Body；do not渲染HTML）
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.maxWidth = '900px';
            modalContent.style.width = '95%';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            const titleEl = document.createElement('h3');
            titleEl.textContent = 'response 详情';
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
                <div><strong>state:</strong> ${escapeHtml(String(res.status))} ${escapeHtml(res.statusText || '')}</div>
                <div><strong>size:</strong> ${escapeHtml(res.size || '')} (${res.byteSize || 0} B)</div>
                <div><strong>type:</strong> ${escapeHtml(res.contentType || '')}</div>
            `;
            modalBody.appendChild(metaDiv);

            // 组装原始 response 报文
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
            pre.textContent = rawResponse; // 仅 text，避免HTML渲染
            modalBody.appendChild(pre);

            if (res.rawBodyTruncated) {
                const tip = document.createElement('div');
                tip.style.fontSize = '12px';
                tip.style.color = '#ccc';
                tip.style.marginTop = '6px';
                tip.textContent = 'content already截断展示（before 256 KB）';
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
    document.getElementById('pauseBtn').textContent = '暂停 test';
    document.getElementById('continueBtn').style.display = 'none';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    

    let completionMessage = 'test complete! success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
    
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

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// update domain filter option
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一  domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // save current select   value
    const currentValue = domainFilter.value;
    
    // clear 现有 option（除了"all domain"）
    domainFilter.innerHTML = '<option value="all">all domain</option>';
    
    // add domain option
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before  select（如果还存in）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// filter result
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const domainCell = row.cells[1].textContent.trim(); // domain 列是第1列（索引1）
        const statusCell = row.cells[3].textContent.trim(); // status 码列现in是第3列（索引3）
        const resultCell = row.cells[6].textContent.trim(); // result 列现in是第6列（索引6）
        
        // domain filter
        if (domainFilter !== 'all' && domainCell !== domainFilter) {
            show = false;
        }
        
        // status filter
        if (show && statusFilter === 'success' && resultCell !== 'success') {
            show = false;
        } else if (show && statusFilter === 'error' && resultCell !== 'failed') {
            show = false;
        }
        
        // status 码filter - fix逻辑，只对 number status 码进行filter
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            
            // 只对 valid   number status 码进行filter，非 number status 码（如Timeout、Error等）do not display
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

// display export popup
function showExportModal() {
    if (testResults.length === 0) {
        alert('没有 test result 可以 export');
        return;
    }
    
    document.getElementById('exportModal').style.display = 'flex';
}

// hide export popup
function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// export toJSON
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

// export toCSV
function exportAsCSV() {
    const headers = ['序号', 'url', 'status 码', 'status text', 'size', '耗时', 'result'];
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

// clear result
function clearResults() {
    if (confirm('确定要 clear all test result 吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = 'result already clear';
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
// format 化字节 size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}