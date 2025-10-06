// test窗口脚本 - 独立JavaScript文件
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// page面loadcomplete后initialize
async function initializePage() {
    //console.log('page面loadcomplete，准备starttest');
    
    try {
        // fromchrome.storagereadtestconfiguration
        const result = await chrome.storage.local.get(['testConfig']);
        
        if (!result.testConfig) {
            console.error('找nottotestconfigurationdata');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: 找nottotestconfigurationdata</div>';
            return;
        }
        
        testData = result.testConfig;
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('testconfigurationloadsuccess:', testData);
        
        // 更newpage面information
        document.getElementById('testInfo').textContent = 
            `${testData.categoryTitle} | ${testData.method} | ${testData.items.length} 项`;
        document.getElementById('totalCount').textContent = testData.items.length;
        

        // 显示base API路径andcustomdomaininformation
        const baseUrlInfo = document.getElementById('baseUrlInfo');
        let infoText = `basicURL: ${testData.baseUrl}`;
        
        if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                infoText += ` | Base API路径: ${testData.customBaseApiPaths[0]}`;
            } else {
                infoText += ` | Base API路径: ${testData.customBaseApiPaths.length}个 (${testData.customBaseApiPaths.join(', ')})`;
            }
        }
        
        if (testData.customDomains && testData.customDomains.length > 0) {
            if (testData.customDomains.length === 1) {
                infoText += ` | customdomain: ${testData.customDomains[0]}`;
            } else {
                infoText += ` | customdomain: ${testData.customDomains.length}个 (${testData.customDomains.join(', ')})`;
            }
        }
        
        baseUrlInfo.textContent = infoText;

    } catch (error) {
        console.error('readconfigurationdatafailed:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: readconfigurationdatafailed - ' + error.message + '</div>';
        return;
    }
    
    // addeventlistener
    document.getElementById('continueBtn').addEventListener('click', continueTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    document.getElementById('domainFilter').addEventListener('change', filterResults);
    
    // exportpopupeventlistener
    document.getElementById('closeModal').addEventListener('click', hideExportModal);
    document.getElementById('exportJSON').addEventListener('click', () => {
        hideExportModal();
        exportAsJSON();
    });
    document.getElementById('exportCSV').addEventListener('click', () => {
        hideExportModal();
        exportAsCSV();
    });
    
    // clickpopup外部关闭
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportModal') {
            hideExportModal();
        }
    });
    
    // add表头排序eventlistener
    const tableHeaders = document.querySelectorAll('th[data-column]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = parseInt(this.getAttribute('data-column'));
            //console.log('click表头，列索引:', columnIndex);
            sortTable(columnIndex);
        });
    });
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('testdata无效');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: without要test项目</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// 排序相关变量
let currentSortColumn = -1;
let sortDirection = 'asc'; // 'asc' or 'desc'

// 排序表格
function sortTable(columnIndex) {
    const table = document.getElementById('resultsTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // ifclick是同一列，切换排序方向
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }
    
    // 更new排序indicator
    updateSortIndicators(columnIndex);
    
    // 排序行
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // 根据列class型进行not同排序处理
        switch (columnIndex) {
            case 0: // 序号
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
                break;
            case 3: // statecode
                // 数字statecode优先，非数字statecode排in后面
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
            case 1: // domain
            case 2: // URL
            case 6: // result
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
    
    // 重new插入排序后行
    rows.forEach(row => tbody.appendChild(row));
}

// 更new排序indicator
function updateSortIndicators(activeColumn) {
    // 重置allindicator
    for (let i = 0; i <= 5; i++) {
        const indicator = document.getElementById(`sort-${i}`);
        if (indicator) {
            indicator.textContent = '↕';
            indicator.classList.remove('active');
        }
    }
    
    // settings当before列indicator
    const activeIndicator = document.getElementById(`sort-${activeColumn}`);
    if (activeIndicator) {
        activeIndicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
        activeIndicator.classList.add('active');
    }
}

// 解析大小为字节数
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

// 解析时间为毫秒数
function parseTimeToMs(timeStr) {
    if (timeStr === 'N/A' || !timeStr) return 0;
    
    const match = timeStr.match(/^([0-9.]+)ms$/);
    if (!match) return 0;
    
    return parseFloat(match[1]);
}

// page面loadcomplete后automaticinitialize
document.addEventListener('DOMContentLoaded', initializePage);

// starttest
async function startTest() {
    //console.log('startTest by调for');
    
    if (!testData || isTestRunning) return;
    
    if (!testData.items || testData.items.length === 0) {
        console.error('without要test项目');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: without要test项目</div>';
        return;
    }
    
    //console.log('starttest，项目数:', testData.items.length);
    
    // 扩展test项目to support多个baseapi路径
    const expandedItems = expandItemsForMultipleBasePaths(testData.items, testData.categoryKey, testData.baseUrl);
    testData.items = expandedItems;
    
    //console.log(`🔧 原始test项目数: ${testData.items.length}, 扩展后项目数: ${expandedItems.length}`);
    
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
        console.error('starttest时发生错误:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">starttestfailed: ' + error.message + '</div>';
    }
}

// 继续test
function continueTest() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 暂停test
function pauseTest() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseBtn').textContent = '继续test';
        document.getElementById('continueBtn').style.display = 'none';
    } else {
        document.getElementById('pauseBtn').textContent = '暂停test';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 处理下一批request
function processNextBatch() {
    //console.log('processNextBatch by调for');
    //console.log('isPaused:', isPaused, 'isTestRunning:', isTestRunning);
    //console.log('activeRequests:', activeRequests, 'maxConcurrency:', maxConcurrency);
    //console.log('currentIndex:', currentIndex, 'items.length:', testData.items.length);
    
    if (isPaused || !isTestRunning) {
        //console.log('testby暂停or未运行，退出');
        return;
    }
    
    if (currentIndex >= testData.items.length) {
        //console.log('all项目already处理complete');
        return;
    }
    
    let batchStarted = false;
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        batchStarted = true;
        
        //console.log('start处理项目:', itemIndex, item);
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                //console.log('requestcomplete:', itemIndex, result);
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('allrequestcomplete，调for completeTest');
                    completeTest();
                }
            })
            .catch(error => {
                console.error('request处理failed:', error);
                activeRequests--;
                // 处理扩展后test项目
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
                    //console.log('allrequestcomplete（含错误），调for completeTest');
                    completeTest();
                }
            });
    }
    
    if (batchStarted) {
        //console.log('批次alreadystart，当before活跃request数:', activeRequests);
    } else {
        //console.log('withoutstartnew批次');
    }
}

// 处理单个request
async function processSingleRequest(item, index) {
    try {
        // 处理扩展后test项目
        let displayItem = item;
        let url;
        
        if (typeof item === 'object' && item.fullUrl) {
            // 这是扩展后项目
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
                statusText: '无法构建validURL',
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
        // 始终尝试get文本预览
        try {
            textContentOuter = await (response.clone ? response.clone().text() : response.text());
        } catch (_) {
            textContentOuter = '';
        }
        // 计算响应大小：优先backgroundreturn byteSize；再use Content-Length；otherwisefor UTF-8 字节长度
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

        // extract headers 与内容预览
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
            statusText: error.message || '未知abnormal',
            size: 'N/A',
            time: 'N/A',
            success: false,
            index: index
        };
    }
}

// 构建testURL
function buildTestUrl(item, categoryKey, baseUrl) {
    try {
        let url = item;
        
        // fix：ifitem是object，extractvalue属性
        if (typeof item === 'object' && item !== null) {
            url = item.value || item.url || item;
            console.log('buildTestUrl: fromobjectextractURL:', url, '原始object:', item);
        }
        
        // fix：确保url是字符串class型
        if (!url || typeof url !== 'string') {
            console.error('buildTestUrl: urlparameter无效:', url);
            return baseUrl || 'https://example.com';
        }

        // getcustombase API路径
        const customBaseApiPaths = testData.customBaseApiPaths || [];
        
        console.log(`🔧 [buildTestUrl] 构建URL: 原始="${url}", 分class="${categoryKey}", basicURL="${baseUrl}", BaseAPI路径=${JSON.stringify(customBaseApiPaths)}`);

        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {
                    // if有custombase API路径，先add它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi路径（keep向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // 确保baseApiPath以/开头butnot以/ending（除非是根路径）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + url;
                        console.log(`🔧 [buildTestUrl] 绝对路径+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + url;
                        console.log(`🔧 [buildTestUrl] 绝对路径: "${baseUrl}" + "${item}" = "${url}"`);
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                    // 🔥 fix：automatic去除相对路径开头"."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [buildTestUrl] 去除相对路径开头"./": "${url}" -> "${cleanedUrl}"`);
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // 去除单独 "."
                        console.log(`🔧 [buildTestUrl] 去除相对路径开头".": "${url}" -> "${cleanedUrl}"`);
                    }
                    
                    // if有custombase API路径，先add它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi路径（keep向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        // 确保baseApiPath以/开头butnot以/ending（除非是根路径）
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] 相对路径+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${cleanedUrl}" = "${url}"`);
                    } else {
                        url = baseUrl + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
                        console.log(`🔧 [buildTestUrl] 相对路径: "${baseUrl}" + "/" + "${cleanedUrl}" = "${url}"`);
                    }
                }
                break;
                
            case 'urls':
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                    console.log(`🔧 [buildTestUrl] 完整URL: "http://" + "${item}" = "${url}"`);
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !url.startsWith('http')) {
                    if (url.startsWith('/')) {
                        // if有custombase API路径，先add它
                        if (customBaseApiPaths.length > 0) {
                            // use第一个baseapi路径（keep向后兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + url;
                            console.log(`🔧 [buildTestUrl] 文件路径+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + url;
                            console.log(`🔧 [buildTestUrl] 文件路径: "${baseUrl}" + "${item}" = "${url}"`);
                        }
                    } else {
                        // if有custombase API路径，先add它
                        if (customBaseApiPaths.length > 0) {
                            // use第一个baseapi路径（keep向后兼容）
                            const baseApiPath = customBaseApiPaths[0];
                            const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                            url = baseUrl + normalizedBasePath + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对文件+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                        } else {
                            url = baseUrl + '/' + url;
                            console.log(`🔧 [buildTestUrl] 相对文件: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !url.startsWith('http')) {
                    // if有custombase API路径，先add它
                    if (customBaseApiPaths.length > 0) {
                        // use第一个baseapi路径（keep向后兼容）
                        const baseApiPath = customBaseApiPaths[0];
                        const normalizedBasePath = baseApiPath === '/' ? '' : (baseApiPath.startsWith('/') ? baseApiPath : '/' + baseApiPath);
                        url = baseUrl + normalizedBasePath + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] 默认+BaseAPI: "${baseUrl}" + "${normalizedBasePath}" + "/" + "${item}" = "${url}"`);
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                        console.log(`🔧 [buildTestUrl] 默认: "${baseUrl}" + "/" + "${item}" = "${url}"`);
                    }
                }
        }
        
        // 清理多余斜杠
        url = url.replace(/([^:]\/)\/+/g, '$1');
        
        console.log(`✅ [buildTestUrl] 最终URL: "${url}"`);
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('构建URLfailed:', error, item);
        return null;
    }
}

/**
 * 为多个baseapi路径andcustomdomaingeneratetest项目
 * @param {Array} items - 原始test项目
 * @param {string} categoryKey - 分class键
 * @param {string} baseUrl - basicURL
 * @returns {Array} - 扩展后test项目
 */
function expandItemsForMultipleBasePaths(items, categoryKey, baseUrl) {
    const customBaseApiPaths = testData.customBaseApiPaths || [];
    const customDomains = testData.customDomains || [];
    
    // 总是require扩展项目，因为我们require同时处理原始domainandcustomdomain
    // if既without多个baseapi路径，也withoutcustomdomain，directlyreturn原始项目
    if (customBaseApiPaths.length <= 1 && customDomains.length === 0) {
        return items;
    }
    
    const expandedItems = [];
    
    items.forEach(item => {
        // 处理customdomain
        if (customDomains.length > 0) {
            customDomains.forEach(customDomain => {
                // if有customBase API路径，为每个customdomainadd每个Base API路径
                if (customBaseApiPaths.length > 0) {
                    customBaseApiPaths.forEach(basePath => {
                        let url = item;
                        
                        // fix：ifitem是object，extractvalue属性
                        if (typeof item === 'object' && item !== null) {
                            url = item.value || item.url || item;
                        }
                        
                        // fix：确保url是字符串class型
                        if (!url || typeof url !== 'string') {
                            console.error('expandItemsForMultipleBasePaths: urlparameter无效:', url);
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
                                    // 🔥 fix：automatic去除相对路径开头"."
                                    let cleanedUrl = url;
                                    if (cleanedUrl.startsWith('./')) {
                                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                        console.log(`🔧 [expandItems-customDomain] 去除相对路径开头"./": "${url}" -> "${cleanedUrl}"`);
                                    } else if (cleanedUrl.startsWith('.')) {
                                        cleanedUrl = cleanedUrl.substring(1); // 去除单独 "."
                                        console.log(`🔧 [expandItems-customDomain] 去除相对路径开头".": "${url}" -> "${cleanedUrl}"`);
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
                        
                        // addcustomdomain+Base API路径test项目
                        expandedItems.push({
                            originalItem: item,
                            customDomain: customDomain,
                            baseApiPath: basePath,
                            fullUrl: url,
                            displayText: `${item} (${customDomain}${basePath})`
                        });
                    });
                } else {
                    // withoutcustomBase API路径，directlyusecustomdomain
                    let url = item;
                    
                    // fix：ifitem是object，extractvalue属性
                    if (typeof item === 'object' && item !== null) {
                        url = item.value || item.url || item;
                    }
                    
                    // fix：确保url是字符串class型
                    if (!url || typeof url !== 'string') {
                        console.error('expandItemsForMultipleBasePaths: urlparameter无效:', url);
                        return;
                    }
                    
                    switch (categoryKey) {
                        case 'absoluteApis':
                        case 'paths':
                            // fix：确保url是字符串class型
                            if (typeof url === 'string' && url.startsWith('/')) {
                                url = customDomain + url;
                            }
                            break;
                            
                        case 'relativeApis':
                            if (typeof url === 'string' && !url.startsWith('http')) {
                                // 🔥 fix：automatic去除相对路径开头"."
                                let cleanedUrl = url;
                                if (cleanedUrl.startsWith('./')) {
                                    cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除相对路径开头"./": "${url}" -> "${cleanedUrl}"`);
                                } else if (cleanedUrl.startsWith('.')) {
                                    cleanedUrl = cleanedUrl.substring(1); // 去除单独 "."
                                    console.log(`🔧 [expandItems-customDomain-noBP] 去除相对路径开头".": "${url}" -> "${cleanedUrl}"`);
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
                    
                    // addcustomdomaintest项目
                    expandedItems.push({
                        originalItem: item,
                        customDomain: customDomain,
                        fullUrl: url,
                        displayText: `${item} (${customDomain})`
                    });
                }
            });
        }
        
        // 处理Base API路径（if有多个）
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
                            // 🔥 fix：automatic去除相对路径开头"."
                            let cleanedUrl = url;
                            if (cleanedUrl.startsWith('./')) {
                                cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                                console.log(`🔧 [expandItems-basePath] 去除相对路径开头"./": "${url}" -> "${cleanedUrl}"`);
                            } else if (cleanedUrl.startsWith('.')) {
                                cleanedUrl = cleanedUrl.substring(1); // 去除单独 "."
                                console.log(`🔧 [expandItems-basePath] 去除相对路径开头".": "${url}" -> "${cleanedUrl}"`);
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
                
                // add扩展后项目，contains原始项目andcorrespondbaseapi路径information
                expandedItems.push({
                    originalItem: item,
                    baseApiPath: basePath,
                    fullUrl: url,
                    displayText: `${item} (${basePath})`
                });
            });
        }
        
        // 总是add原始项目（use原始domain）
        let originalUrl = item;
        
        // fix：ifitem是object，extractvalue属性
        if (typeof item === 'object' && item !== null) {
            originalUrl = item.value || item.url || item;
        }
        
        // fix：确保originalUrl是字符串class型
        if (!originalUrl || typeof originalUrl !== 'string') {
            console.warn('originalUrlnot是字符串class型:', originalUrl);
            return expandedItems; // skip这个项目
        }
        
        // 🔥 fix：处理原始domainURL构建，确保正确显示baseapi+路径
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
                    // 🔥 fix：automatic去除相对路径开头"."
                    let cleanedOriginalUrl = originalUrl;
                    if (cleanedOriginalUrl.startsWith('./')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(2); // 去除 "./"
                        console.log(`🔧 [expandItems] 去除相对路径开头"./": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
                    } else if (cleanedOriginalUrl.startsWith('.')) {
                        cleanedOriginalUrl = cleanedOriginalUrl.substring(1); // 去除单独 "."
                        console.log(`🔧 [expandItems] 去除相对路径开头".": "${originalUrl}" -> "${cleanedOriginalUrl}"`);
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
        
        // 清理多余斜杠
        originalUrl = originalUrl.replace(/([^:]\/)\/+/g, '$1');
        
        // add原始domaintest项目
        expandedItems.push({
            originalItem: item,
            fullUrl: originalUrl,
            displayText: `${item} (原始domain)`
        });
    });
    
    return expandedItems;
}

// sendrequest - 通throughbackground脚本
async function makeRequest(url, method, timeout = 5000) {
    //console.log(`🌐 test窗口通throughbackground脚本request: ${url}`);
    
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
        // 通throughbackground脚本sendrequest（会automaticuse保存Cookie）
        const response = await makeRequestViaBackground(url, requestOptions);
        return response;
    } catch (error) {
        console.error(`❌ test窗口requestfailed: ${error.message}`);
        
        // return错误响应object
        return {
            status: 'Error',
            statusText: error.message || 'requestfailed',
            ok: false,
            headers: new Headers()
        };
    }
}

// 通throughbackground脚本sendrequest
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
                // mod拟fetch响应object
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

// addresultto表格
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    
    // 🔥 fix：正确显示completeURL路径，includingbaseapi+路径
    let displayUrl = (result.fullUrl || result.url || '');
    let fullDisplayUrl = displayUrl; // 保存completeURLfortitle显示
    
    try {
        if (displayUrl.startsWith('http')) {
            const u = new URL(displayUrl);
            // 显示complete路径部分，includingbaseapi路径
            displayUrl = u.pathname + (u.search || '') + (u.hash || '');
            fullDisplayUrl = u.href; // completeURL
        }
    } catch (_) {
        // ifURL解析failed，keep原样
        fullDisplayUrl = displayUrl;
    }
    
    // extractdomaininformation
    let domainInfo = '原始domain';
    try {
        if (result.fullUrl && result.fullUrl.startsWith('http')) {
            const urlObj = new URL(result.fullUrl);
            domainInfo = urlObj.hostname + (urlObj.port ? ':' + urlObj.port : '');
        }
    } catch (e) {
        domainInfo = '未知domain';
    }
    
    // 🔥 fix：确保URL列显示complete路径information
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
    
    // 更newdomain筛选选项
    updateDomainFilter();

    // 查看响应内容button
    const viewBtn = row.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            const idx = parseInt(viewBtn.getAttribute('data-index'));
            const res = testResults.find(r => r.index === idx) || result;

            // 动态createpopup，复forpage面 .modal/.modal-content 样式
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';

            // 构建内容（仅展示原始响应报文：state行 + 头 + 原始Body；not渲染HTML）
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
                <div><strong>状态:</strong> ${escapeHtml(String(res.status))} ${escapeHtml(res.statusText || '')}</div>
                <div><strong>大小:</strong> ${escapeHtml(res.size || '')} (${res.byteSize || 0} B)</div>
                <div><strong>类型:</strong> ${escapeHtml(res.contentType || '')}</div>
            `;
            modalBody.appendChild(metaDiv);

            // 组装原始响应报文
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
                tip.textContent = '内容already截断展示（before 256 KB）';
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

// 更newstate栏
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

// completetest
function completeTest() {
    isTestRunning = false;
    isPaused = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停test';
    document.getElementById('continueBtn').style.display = 'none';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    

    let completionMessage = 'testcomplete! success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
    
    // addbase API路径information
            if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                completionMessage += ' | Base API: ' + testData.customBaseApiPaths[0];
            } else {
                completionMessage += ' | Base APIs: ' + testData.customBaseApiPaths.join(', ');
            }
        }
    
    document.getElementById('testInfo').textContent = completionMessage;

}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更newdomain筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集all唯一domain
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当before选择value
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部domain"）
    domainFilter.innerHTML = '<option value="all">全部domain</option>';
    
    // adddomain选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之before选择（if还exists）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 筛选result
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const domainCell = row.cells[1].textContent.trim(); // domain列是第1列（索引1）
        const statusCell = row.cells[3].textContent.trim(); // statecode列现in是第3列（索引3）
        const resultCell = row.cells[6].textContent.trim(); // result列现in是第6列（索引6）
        
        // domain筛选
        if (domainFilter !== 'all' && domainCell !== domainFilter) {
            show = false;
        }
        
        // state筛选
        if (show && statusFilter === 'success' && resultCell !== 'success') {
            show = false;
        } else if (show && statusFilter === 'error' && resultCell !== 'failed') {
            show = false;
        }
        
        // statecode筛选 - fix逻辑，只对数字statecode进行筛选
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            
            // 只对valid数字statecode进行筛选，非数字statecode（such asTimeout、Error等）not显示
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

// 显示exportpopup
function showExportModal() {
    if (testResults.length === 0) {
        alert('withouttestresult可以export');
        return;
    }
    
    document.getElementById('exportModal').style.display = 'flex';
}

// 隐藏exportpopup
function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// export为JSON
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

// export为CSV
function exportAsCSV() {
    const headers = ['序号', 'url', 'statecode', 'state文本', '大小', '耗时', 'result'];
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

// download文件
function downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 清空result
function clearResults() {
    if (confirm('确定要清空alltestresult吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = 'resultalready清空';
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
// format化字节大小
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}