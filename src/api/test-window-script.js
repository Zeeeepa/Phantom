// 测试窗口脚本 - 独立的JavaScript文件
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// 页面加载完成后的初始化
async function initializePage() {
    //console.log('页面加载完成，准备开始测试');
    
    try {
        // 从chrome.storage读取测试配置
        const result = await chrome.storage.local.get(['testConfig']);
        
        if (!result.testConfig) {
            console.error('找不到测试配置数据');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: 找不到测试配置数据</div>';
            return;
        }
        
        testData = result.testConfig;
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('测试配置加载成功:', testData);
        
        // 更新页面信息
        document.getElementById('testInfo').textContent = 
            `${testData.categoryTitle} | ${testData.method} | ${testData.items.length} 项`;
        document.getElementById('totalCount').textContent = testData.items.length;
        

        // 显示base API路径和自定义域名信息
        const baseUrlInfo = document.getElementById('baseUrlInfo');
        let infoText = `基础URL: ${testData.baseUrl}`;
        
        if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                infoText += ` | Base API路径: ${testData.customBaseApiPaths[0]}`;
            } else {
                infoText += ` | Base API路径: ${testData.customBaseApiPaths.length}个 (${testData.customBaseApiPaths.join(', ')})`;
            }
        }
        
        if (testData.customDomains && testData.customDomains.length > 0) {
            if (testData.customDomains.length === 1) {
                infoText += ` | 自定义域名: ${testData.customDomains[0]}`;
            } else {
                infoText += ` | 自定义域名: ${testData.customDomains.length}个 (${testData.customDomains.join(', ')})`;
            }
        }
        
        baseUrlInfo.textContent = infoText;

    } catch (error) {
        console.error('读取配置数据失败:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: 读取配置数据失败 - ' + error.message + '</div>';
        return;
    }
    
    // 添加事件监听器
    document.getElementById('continueBtn').addEventListener('click', continueTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    document.getElementById('domainFilter').addEventListener('change', filterResults);
    
    // 导出弹窗事件监听器
    document.getElementById('closeModal').addEventListener('click', hideExportModal);
    document.getElementById('exportJSON').addEventListener('click', () => {
        hideExportModal();
        exportAsJSON();
    });
    document.getElementById('exportCSV').addEventListener('click', () => {
        hideExportModal();
        exportAsCSV();
    });
    
    // 点击弹窗外部关闭
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target.id === 'exportModal') {
            hideExportModal();
        }
    });
    
    // 添加表头排序事件监听器
    const tableHeaders = document.querySelectorAll('th[data-column]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = parseInt(this.getAttribute('data-column'));
            //console.log('点击表头，列索引:', columnIndex);
            sortTable(columnIndex);
        });
    });
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('测试数据无效');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: 没有要测试的项目</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// 排序相关变量
let currentSortColumn = -1;
let sortDirection = 'asc'; // 'asc' 或 'desc'

// 排序表格
function sortTable(columnIndex) {
    const table = document.getElementById('resultsTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 如果点击的是同一列，切换排序方向
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }
    
    // 更新排序指示器
    updateSortIndicators(columnIndex);
    
    // 排序行
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // 根据列类型进行不同的排序处理
        switch (columnIndex) {
            case 0: // 序号
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
                break;
            case 3: // 状态码
                // 数字状态码优先，非数字状态码排在后面
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
            case 1: // 域名
            case 2: // URL
            case 6: // 结果
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
    
    // 重新插入排序后的行
    rows.forEach(row => tbody.appendChild(row));
}

// 更新排序指示器
function updateSortIndicators(activeColumn) {
    // 重置所有指示器
    for (let i = 0; i <= 5; i++) {
        const indicator = document.getElementById(`sort-${i}`);
        if (indicator) {
            indicator.textContent = '↕';
            indicator.classList.remove('active');
        }
    }
    
    // 设置当前列的指示器
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

// 页面加载完成后自动初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 开始测试
async function startTest() {
    //console.log('startTest 被调用');
    
    if (!testData || isTestRunning) return;
    
    if (!testData.items || testData.items.length === 0) {
        console.error('没有要测试的项目');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">错误: 没有要测试的项目</div>';
        return;
    }
    
    //console.log('开始测试，项目数:', testData.items.length);
    
    // 扩展测试项目以支持多个baseapi路径
    const expandedItems = expandItemsForMultipleBasePaths(testData.items, testData.categoryKey, testData.baseUrl);
    testData.items = expandedItems;
    
    //console.log(`🔧 原始测试项目数: ${testData.items.length}, 扩展后项目数: ${expandedItems.length}`);
    
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
        console.error('启动测试时发生错误:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">启动测试失败: ' + error.message + '</div>';
    }
}

// 继续测试
function continueTest() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停测试';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 暂停测试
function pauseTest() {
    isPaused = !isPaused;
    
    if (isPaused) {
        document.getElementById('pauseBtn').textContent = '继续测试';
        document.getElementById('continueBtn').style.display = 'none';
    } else {
        document.getElementById('pauseBtn').textContent = '暂停测试';
        document.getElementById('continueBtn').style.display = 'none';
        processNextBatch();
    }
}

// 处理下一批请求
function processNextBatch() {
    //console.log('processNextBatch 被调用');
    //console.log('isPaused:', isPaused, 'isTestRunning:', isTestRunning);
    //console.log('activeRequests:', activeRequests, 'maxConcurrency:', maxConcurrency);
    //console.log('currentIndex:', currentIndex, 'items.length:', testData.items.length);
    
    if (isPaused || !isTestRunning) {
        //console.log('测试被暂停或未运行，退出');
        return;
    }
    
    if (currentIndex >= testData.items.length) {
        //console.log('所有项目已处理完成');
        return;
    }
    
    let batchStarted = false;
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        batchStarted = true;
        
        //console.log('开始处理项目:', itemIndex, item);
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                //console.log('请求完成:', itemIndex, result);
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0 && currentIndex >= testData.items.length) {
                    //console.log('所有请求完成，调用 completeTest');
                    completeTest();
                }
            })
            .catch(error => {
                console.error('请求处理失败:', error);
                activeRequests--;
                // 处理扩展后的测试项目
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
                    //console.log('所有请求完成（含错误），调用 completeTest');
                    completeTest();
                }
            });
    }
    
    if (batchStarted) {
        //console.log('批次已启动，当前活跃请求数:', activeRequests);
    } else {
        //console.log('没有启动新的批次');
    }
}

// 处理单个请求
async function processSingleRequest(item, index) {
    try {
        // 处理扩展后的测试项目
        let displayItem = item;
        let url;
        
        if (typeof item === 'object' && item.fullUrl) {
            // 这是扩展后的项目
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
                statusText: '无法构建有效URL',
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
        // 始终尝试获取文本预览
        try {
            textContentOuter = await (response.clone ? response.clone().text() : response.text());
        } catch (_) {
            textContentOuter = '';
        }
        // 计算响应大小：优先后台返回的 byteSize；再使用 Content-Length；否则用 UTF-8 字节长度
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

        // 提取 headers 与内容预览
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
            statusText: error.message || '未知异常',
            size: 'N/A',
            time: 'N/A',
            success: false,
            index: index
        };
    }
}

// 构建测试URL
function buildTestUrl(item, categoryKey, baseUrl) {
    try {
        let url = item;

        // 获取自定义base API路径
        const customBaseApiPaths = testData.customBaseApiPaths || [];

        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {

                    // 如果有自定义base API路径，先添加它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapi路径（保持向后兼容）
                        url = baseUrl + customBaseApiPaths[0] + url;
                    } else {
                        url = baseUrl + url;
                    }

                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                 // 如果有自定义base API路径，先添加它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapi路径（保持向后兼容）
                        url = baseUrl + customBaseApiPaths[0] + (url.startsWith('/') ? '' : '/') + url;
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                    }

                }
                break;
                
            case 'urls':
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !url.startsWith('http')) {
                    if (url.startsWith('/')) {

                        // 如果有自定义base API路径，先添加它
                        if (customBaseApiPaths.length > 0) {
                            // 使用第一个baseapi路径（保持向后兼容）
                            url = baseUrl + customBaseApiPaths[0] + url;
                        } else {
                            url = baseUrl + url;
                        }
                    } else {
                        // 如果有自定义base API路径，先添加它
                        if (customBaseApiPaths.length > 0) {
                            // 使用第一个baseapi路径（保持向后兼容）
                            url = baseUrl + customBaseApiPaths[0] + '/' + url;
                        } else {
                            url = baseUrl + '/' + url;
                        }

                    }
                }
                break;
                
            default:
                if (baseUrl && !url.startsWith('http')) {

                    // 如果有自定义base API路径，先添加它
                    if (customBaseApiPaths.length > 0) {
                        // 使用第一个baseapi路径（保持向后兼容）
                        url = baseUrl + customBaseApiPaths[0] + (url.startsWith('/') ? '' : '/') + url;
                    } else {
                        url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                    }

                }
        }
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('构建URL失败:', error, item);
        return null;
    }
}

/**
 * 为多个baseapi路径和自定义域名生成测试项目
 * @param {Array} items - 原始测试项目
 * @param {string} categoryKey - 分类键
 * @param {string} baseUrl - 基础URL
 * @returns {Array} - 扩展后的测试项目
 */
function expandItemsForMultipleBasePaths(items, categoryKey, baseUrl) {
    const customBaseApiPaths = testData.customBaseApiPaths || [];
    const customDomains = testData.customDomains || [];
    
    // 总是需要扩展项目，因为我们需要同时处理原始域名和自定义域名
    // 如果既没有多个baseapi路径，也没有自定义域名，直接返回原始项目
    if (customBaseApiPaths.length <= 1 && customDomains.length === 0) {
        return items;
    }
    
    const expandedItems = [];
    
    items.forEach(item => {
        // 处理自定义域名
        if (customDomains.length > 0) {
            customDomains.forEach(customDomain => {
                // 如果有自定义Base API路径，为每个自定义域名添加每个Base API路径
                if (customBaseApiPaths.length > 0) {
                    customBaseApiPaths.forEach(basePath => {
                        let url = item;
                        
                        switch (categoryKey) {
                            case 'absoluteApis':
                            case 'paths':
                                if (url.startsWith('/')) {
                                    url = customDomain + basePath + url;
                                }
                                break;
                                
                            case 'relativeApis':
                                if (!url.startsWith('http')) {
                                    url = customDomain + basePath + (url.startsWith('/') ? '' : '/') + url;
                                }
                                break;
                                
                            case 'jsFiles':
                            case 'cssFiles':
                            case 'images':
                                if (!url.startsWith('http')) {
                                    if (url.startsWith('/')) {
                                        url = customDomain + basePath + url;
                                    } else {
                                        url = customDomain + basePath + '/' + url;
                                    }
                                }
                                break;
                                
                            default:
                                if (!url.startsWith('http')) {
                                    url = customDomain + basePath + (url.startsWith('/') ? '' : '/') + url;
                                }
                        }
                        
                        // 添加自定义域名+Base API路径的测试项目
                        expandedItems.push({
                            originalItem: item,
                            customDomain: customDomain,
                            baseApiPath: basePath,
                            fullUrl: url,
                            displayText: `${item} (${customDomain}${basePath})`
                        });
                    });
                } else {
                    // 没有自定义Base API路径，直接使用自定义域名
                    let url = item;
                    
                    switch (categoryKey) {
                        case 'absoluteApis':
                        case 'paths':
                            if (url.startsWith('/')) {
                                url = customDomain + url;
                            }
                            break;
                            
                        case 'relativeApis':
                            if (!url.startsWith('http')) {
                                url = customDomain + (url.startsWith('/') ? '' : '/') + url;
                            }
                            break;
                            
                        case 'jsFiles':
                        case 'cssFiles':
                        case 'images':
                            if (!url.startsWith('http')) {
                                if (url.startsWith('/')) {
                                    url = customDomain + url;
                                } else {
                                    url = customDomain + '/' + url;
                                }
                            }
                            break;
                            
                        default:
                            if (!url.startsWith('http')) {
                                url = customDomain + (url.startsWith('/') ? '' : '/') + url;
                            }
                    }
                    
                    // 添加自定义域名的测试项目
                    expandedItems.push({
                        originalItem: item,
                        customDomain: customDomain,
                        fullUrl: url,
                        displayText: `${item} (${customDomain})`
                    });
                }
            });
        }
        
        // 处理Base API路径（如果有多个）
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
                            url = baseUrl + basePath + (url.startsWith('/') ? '' : '/') + url;
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
                
                // 添加扩展后的项目，包含原始项目和对应的baseapi路径信息
                expandedItems.push({
                    originalItem: item,
                    baseApiPath: basePath,
                    fullUrl: url,
                    displayText: `${item} (${basePath})`
                });
            });
        }
        
        // 总是添加原始项目（使用原始域名）
        let originalUrl = item;
        
        // 处理原始域名的URL构建
        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && originalUrl.startsWith('/')) {
                    if (customBaseApiPaths.length > 0) {
                        originalUrl = baseUrl + customBaseApiPaths[0] + originalUrl;
                    } else {
                        originalUrl = baseUrl + originalUrl;
                    }
                }
                break;
                
            case 'relativeApis':
                if (baseUrl && !originalUrl.startsWith('http')) {
                    if (customBaseApiPaths.length > 0) {
                        originalUrl = baseUrl + customBaseApiPaths[0] + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    } else {
                        originalUrl = baseUrl + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    }
                }
                break;
                
            case 'jsFiles':
            case 'cssFiles':
            case 'images':
                if (baseUrl && !originalUrl.startsWith('http')) {
                    if (originalUrl.startsWith('/')) {
                        if (customBaseApiPaths.length > 0) {
                            originalUrl = baseUrl + customBaseApiPaths[0] + originalUrl;
                        } else {
                            originalUrl = baseUrl + originalUrl;
                        }
                    } else {
                        if (customBaseApiPaths.length > 0) {
                            originalUrl = baseUrl + customBaseApiPaths[0] + '/' + originalUrl;
                        } else {
                            originalUrl = baseUrl + '/' + originalUrl;
                        }
                    }
                }
                break;
                
            default:
                if (baseUrl && !originalUrl.startsWith('http')) {
                    if (customBaseApiPaths.length > 0) {
                        originalUrl = baseUrl + customBaseApiPaths[0] + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    } else {
                        originalUrl = baseUrl + (originalUrl.startsWith('/') ? '' : '/') + originalUrl;
                    }
                }
        }
        
        // 添加原始域名的测试项目
        expandedItems.push({
            originalItem: item,
            fullUrl: originalUrl,
            displayText: `${item} (原始域名)`
        });
    });
    
    return expandedItems;
}

// 发送请求 - 通过后台脚本
async function makeRequest(url, method, timeout = 5000) {
    //console.log(`🌐 测试窗口通过后台脚本请求: ${url}`);
    
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
        // 通过后台脚本发送请求（会自动使用保存的Cookie）
        const response = await makeRequestViaBackground(url, requestOptions);
        return response;
    } catch (error) {
        console.error(`❌ 测试窗口请求失败: ${error.message}`);
        
        // 返回错误响应对象
        return {
            status: 'Error',
            statusText: error.message || '请求失败',
            ok: false,
            headers: new Headers()
        };
    }
}

// 通过后台脚本发送请求
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
                // 模拟fetch响应对象
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

// 添加结果到表格
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    let displayUrl = (result.fullUrl || result.url || '');
    try {
        if (displayUrl.startsWith('http')) {
            const u = new URL(displayUrl);
            displayUrl = u.pathname + (u.search || '');
        }
    } catch (_) {}
    
    // 提取域名信息
    let domainInfo = '原始域名';
    try {
        if (result.fullUrl && result.fullUrl.startsWith('http')) {
            const urlObj = new URL(result.fullUrl);
            domainInfo = urlObj.hostname;
        }
    } catch (e) {
        domainInfo = '未知域名';
    }
    
    row.innerHTML = 
        '<td>' + (result.index + 1) + '</td>' +
        '<td class="url-cell" title="' + domainInfo + '">' + domainInfo + '</td>' +
        '<td class="url-cell" title="' + displayUrl + '">' + displayUrl + '</td>' +
        '<td class="' + statusClass + '">' + result.status + '</td>' +
        '<td>' + result.size + '</td>' +
        '<td>' + result.time + '</td>' +
        '<td class="' + statusClass + '">' + (result.success ? '成功' : '失败') + '</td>' +
        '<td><button class="btn btn-primary btn-view" data-index="' + result.index + '">查看</button></td>';
    
    tbody.appendChild(row);
    
    // 更新域名筛选选项
    updateDomainFilter();

    // 查看响应内容按钮
    const viewBtn = row.querySelector('.btn-view');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            const idx = parseInt(viewBtn.getAttribute('data-index'));
            const res = testResults.find(r => r.index === idx) || result;

            // 动态创建弹窗，复用页面的 .modal/.modal-content 样式
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';

            // 构建内容（仅展示原始响应报文：状态行 + 头 + 原始Body；不渲染HTML）
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
                tip.textContent = '内容已截断展示（前 256 KB）';
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

// 更新状态栏
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

// 完成测试
function completeTest() {
    isTestRunning = false;
    isPaused = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停测试';
    document.getElementById('continueBtn').style.display = 'none';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    

    let completionMessage = '测试完成! 成功: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
    
    // 添加base API路径信息
            if (testData.customBaseApiPaths && testData.customBaseApiPaths.length > 0) {
            if (testData.customBaseApiPaths.length === 1) {
                completionMessage += ' | Base API: ' + testData.customBaseApiPaths[0];
            } else {
                completionMessage += ' | Base APIs: ' + testData.customBaseApiPaths.join(', ');
            }
        }
    
    document.getElementById('testInfo').textContent = completionMessage;

}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 更新域名筛选选项
function updateDomainFilter() {
    const domainFilter = document.getElementById('domainFilter');
    if (!domainFilter) return;
    
    const rows = document.querySelectorAll('#resultsBody tr');
    const domains = new Set();
    
    // 收集所有唯一的域名
    rows.forEach(row => {
        if (row.cells && row.cells.length > 1) {
            const domain = row.cells[1].textContent.trim();
            if (domain) {
                domains.add(domain);
            }
        }
    });
    
    // 保存当前选择的值
    const currentValue = domainFilter.value;
    
    // 清空现有选项（除了"全部域名"）
    domainFilter.innerHTML = '<option value="all">全部域名</option>';
    
    // 添加域名选项
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    
    // 恢复之前的选择（如果还存在）
    if (currentValue && Array.from(domains).includes(currentValue)) {
        domainFilter.value = currentValue;
    }
}

// 筛选结果
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const domainCell = row.cells[1].textContent.trim(); // 域名列是第1列（索引1）
        const statusCell = row.cells[3].textContent.trim(); // 状态码列现在是第3列（索引3）
        const resultCell = row.cells[6].textContent.trim(); // 结果列现在是第6列（索引6）
        
        // 域名筛选
        if (domainFilter !== 'all' && domainCell !== domainFilter) {
            show = false;
        }
        
        // 状态筛选
        if (show && statusFilter === 'success' && resultCell !== '成功') {
            show = false;
        } else if (show && statusFilter === 'error' && resultCell !== '失败') {
            show = false;
        }
        
        // 状态码筛选 - 修复逻辑，只对数字状态码进行筛选
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            
            // 只对有效的数字状态码进行筛选，非数字状态码（如Timeout、Error等）不显示
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

// 显示导出弹窗
function showExportModal() {
    if (testResults.length === 0) {
        alert('没有测试结果可以导出');
        return;
    }
    
    document.getElementById('exportModal').style.display = 'flex';
}

// 隐藏导出弹窗
function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// 导出为JSON
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

// 导出为CSV
function exportAsCSV() {
    const headers = ['序号', 'URL', '状态码', '状态文本', '大小', '耗时', '结果'];
    const csvContent = [
        headers.join(','),
        ...testResults.map(result => [
            result.index + 1,
            '"' + (result.fullUrl || result.url) + '"',
            result.status,
            '"' + result.statusText + '"',
            result.size,
            result.time,
            result.success ? '成功' : '失败'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.csv');
}

// 下载文件
function downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 清空结果
function clearResults() {
    if (confirm('确定要清空所有测试结果吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = '结果已清空';
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
// 格式化字节大小
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}