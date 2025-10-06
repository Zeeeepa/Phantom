/**
 * test window manage 器 - 负责创建and manage API test window
 */
class TestWindow {
    constructor() {
        this.testData = null;
        this.testResults = [];
        this.isTestRunning = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.activeRequests = 0;
        this.maxConcurrency = 8;
        this.requestTimeout = 5000;
    }

    // 创建 test window
    async createTestWindow(categoryKey, items, method, concurrency = 8, timeout = 5000, customHeaders = [], customBaseApiPaths = [], customDomains = []) {

        let baseUrl = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
            }
        } catch (error) {
            console.error('获取 current page URL failed:', error);
        }

        // 准备 test configuration data
        const testConfig = {
            categoryKey: categoryKey,
            categoryTitle: this.getCategoryTitle(categoryKey),
            items: items,
            method: method,
            concurrency: concurrency,
            timeout: timeout,
            baseUrl: baseUrl,
            customHeaders: customHeaders,
            customBaseApiPaths: customBaseApiPaths,
            customDomains: customDomains
        };

        // 将 configuration save 到chrome.storage，供 test window read
        try {
            await chrome.storage.local.set({ 'testConfig': testConfig });
            //console.log('test configuration already save 到storage:', testConfig);
        } catch (error) {
            console.error('save test configuration failed:', error);
            throw new Error('save test configuration failed: ' + error.message);
        }

        try {
            // use extension  真实 page 而do not是Blob URL
            const testPageUrl = chrome.runtime.getURL('test-window.html');
            
            // open 新 window
            const newWindow = await chrome.windows.create({
                url: testPageUrl,
                type: 'normal',
                width: 600,
                height: 900,
                focused: true
            });

            //console.log('test window already创建:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('创建 test window failed:', error);
            throw error;
        }
    }

    // 获取分类标题
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'absoluteApis': '绝对 path API',
            'relativeApis': '相对 path API',
            'jsFiles': 'JS file',
            'cssFiles': 'CSS file',
            'images': 'image file',
            'urls': 'completeURL',
            'domains': 'domain',
            'paths': 'path'
        };
        return categoryTitles[categoryKey] || categoryKey;
    }

    // 获取 script content - directly返回JavaScriptcode string，避免CSPissue
    getScriptContent() {
        return `
// test window script - 避免CSPissue
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// page load complete 后  initialize
function initializePage() {
    //console.log('page load complete，准备 start test');
    
    // fromdata属性inread test configuration
    const configElement = document.getElementById('testConfigData');
    if (!configElement) {
        console.error('找do not到 configuration data 元素');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 找do not到 configuration data</div>';
        return;
    }
    
    try {
        const configData = configElement.getAttribute('data-config');
        if (!configData) {
            console.error('configuration data to empty');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: configuration data to empty</div>';
            return;
        }
        
        testData = JSON.parse(decodeURIComponent(configData));
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('test configuration load success:', testData);
        
    } catch (error) {
        console.error('解析 configuration data failed:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 解析 configuration data failed - ' + error.message + '</div>';
        return;
    }
    
    // add event listener
    document.getElementById('startBtn').addEventListener('click', startTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('test data invalid');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: 没有要 test  项目</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// start test
async function startTest() {
    if (!testData || isTestRunning) return;
    
    //console.log('start test，项目数:', testData.items.length);
    
    isTestRunning = true;
    isPaused = false;
    currentIndex = 0;
    activeRequests = 0;
    testResults = [];
    
    try {
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('loadingDiv').style.display = 'none';
        document.getElementById('resultsTable').style.display = 'table';
        
        updateStatusBar();
        processNextBatch();
    } catch (error) {
        console.error('启动 test 时发生 error:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">启动 test failed: ' + error.message + '</div>';
    }
}

// 暂停 test
function pauseTest() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '继续 test' : '暂停 test';
    if (!isPaused) processNextBatch();
}

// process 下一批 request
function processNextBatch() {
    if (isPaused || !isTestRunning || currentIndex >= testData.items.length) return;
    
    while (activeRequests < maxConcurrency && currentIndex < testData.items.length) {
        const item = testData.items[currentIndex];
        const itemIndex = currentIndex;
        currentIndex++;
        activeRequests++;
        
        processSingleRequest(item, itemIndex)
            .then(result => {
                activeRequests--;
                testResults.push(result);
                addResultToTable(result);
                updateStatusBar();
                
                if (currentIndex < testData.items.length && !isPaused) {
                    processNextBatch();
                } else if (activeRequests === 0) {
                    completeTest();
                }
            })
            .catch(error => {
                console.error('request process failed:', error);
                activeRequests--;
                const errorResult = {
                    url: item,
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
                } else if (activeRequests === 0) {
                    completeTest();
                }
            });
    }
}

// process single request
async function processSingleRequest(item, index) {
    try {
        let url = buildTestUrl(item, testData.categoryKey, testData.baseUrl);
        
        if (!url) {
            return {
                url: item,
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
        
        let size = 'N/A';
        try {
            if (response.headers && response.headers.get('content-length')) {
                size = formatBytes(parseInt(response.headers.get('content-length')));
            }
        } catch (e) {}
        
        const isSuccess = response.ok || (response.status >= 200 && response.status < 300);
        
        return {
            url: item,
            fullUrl: url,
            status: response.status || 'Unknown',
            statusText: response.statusText || 'OK',
            size: size,
            time: duration + 'ms',
            success: isSuccess,
            index: index
        };
    } catch (error) {
        return {
            url: item,
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
        }
        
        // fix：确保url是 string type
        if (!url || typeof url !== 'string') {
            console.error('processUrl: url parameter invalid:', url);
            return null;
        }
        
        switch (categoryKey) {
            case 'absoluteApis':
            case 'paths':
                if (baseUrl && url.startsWith('/')) {
                    url = baseUrl + url;
                }
                break;
            case 'relativeApis':
                if (baseUrl && !url.startsWith('http')) {
                    // 🔥 fix：自动去除相对 path开头 "."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                    }
                    
                    url = baseUrl + (cleanedUrl.startsWith('/') ? '' : '/') + cleanedUrl;
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
                        url = baseUrl + url;
                    } else {
                        url = baseUrl + '/' + url;
                    }
                }
                break;
            default:
                if (baseUrl && !url.startsWith('http')) {
                    url = baseUrl + (url.startsWith('/') ? '' : '/') + url;
                }
        }
        
        new URL(url);
        return url;
    } catch (error) {
        console.error('构建URL failed:', error, item);
        return null;
    }
}

// 发送 request
async function makeRequest(url, method, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const options = {
        method: method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
        },
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller.signal
    };
    
    // add Cookiesupport
    if (testData && testData.cookieSetting) {
        options.headers['Cookie'] = testData.cookieSetting;
        options.credentials = 'include';
    }
    
    if (method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({});
    }
    
    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            return {
                status: 'Timeout',
                statusText: 'request timeout (' + (timeout/1000) + '秒)',
                ok: false,
                headers: new Headers()
            };
        }
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            try {
                const noCorsOptions = { ...options, mode: 'no-cors' };
                delete noCorsOptions.signal;
                const response = await fetch(url, noCorsOptions);
                return {
                    status: response.type === 'opaque' ? 200 : 'CORS',
                    statusText: response.type === 'opaque' ? 'OK (no-cors)' : 'CORS Blocked',
                    ok: response.type === 'opaque',
                    headers: new Headers()
                };
            } catch (noCorsError) {
                return {
                    status: 'Network Error',
                    statusText: error.message,
                    ok: false,
                    headers: new Headers()
                };
            }
        }
        
        return {
            status: 'Network Error',
            statusText: error.message,
            ok: false,
            headers: new Headers()
        };
    }
}

// add result 到 table
function addResultToTable(result) {
    const tbody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    const statusClass = result.success ? 'status-success' : 'status-error';
    
    row.innerHTML = 
        '<td>' + (result.index + 1) + '</td>' +
        '<td class="url-cell" title="' + result.url + '">' + result.url + '</td>' +
        '<td class="' + statusClass + '">' + result.status + '</td>' +
        '<td>' + result.size + '</td>' +
        '<td>' + result.time + '</td>' +
        '<td class="' + statusClass + '">' + (result.success ? 'success' : 'failed') + '</td>';
    
    tbody.appendChild(row);
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
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停 test';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    document.getElementById('testInfo').textContent = 
        'test complete! success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
}

// filter result
function filterResults() {
    const statusFilter = document.getElementById('statusFilter').value;
    const statusCodeFilter = document.getElementById('statusCodeFilter').value;
    const rows = document.querySelectorAll('#resultsBody tr');
    
    rows.forEach(row => {
        let show = true;
        const statusCell = row.cells[3].textContent;
        const resultCell = row.cells[6].textContent;
        
        if (statusFilter === 'success' && resultCell !== 'success') {
            show = false;
        } else if (statusFilter === 'error' && resultCell !== 'failed') {
            show = false;
        }
        
        if (show && statusCodeFilter !== 'all') {
            const statusCode = parseInt(statusCell);
            if (!isNaN(statusCode)) {
                switch (statusCodeFilter) {
                    case '2xx': show = statusCode >= 200 && statusCode < 300; break;
                    case '3xx': show = statusCode >= 300 && statusCode < 400; break;
                    case '4xx': show = statusCode >= 400 && statusCode < 500; break;
                    case '5xx': show = statusCode >= 500 && statusCode < 600; break;
                }
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// export result
function exportResults() {
    if (testResults.length === 0) {
        alert('没有 test result 可以 export');
        return;
    }
    
    const format = prompt('select export format:\\n1. JSON\\n2. CSV\\n请输入 1 or 2:', '1');
    
    if (format === '1') {
        exportAsJSON();
    } else if (format === '2') {
        exportAsCSV();
    }
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
            timestamp: new Date().toISOString()
        },
        results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.json');
}

// export toCSV
function exportAsCSV() {
    const headers = ['序号', 'path', 'status 码', 'status text', 'size', '耗时', 'result'];
    const csvContent = [
        headers.join(','),
        ...testResults.map(result => [
            result.index + 1,
            '"' + result.url + '"',
            result.status,
            '"' + result.statusText + '"',
            result.size,
            result.time,
            result.success ? 'success' : 'failed'
        ].join(','))
    ].join('\\n');
    
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

// format 化字节 size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === 'N/A') return 'N/A';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// page load complete 后 automatic initialize
document.addEventListener('DOMContentLoaded', initializePage);
        `;
    }

    // 生成 test window  HTML content
    generateTestWindowHTML(testConfig) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API batch test result</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(0, 212, 170, 0.3);
        }

        .header h1 {
            font-size: 1.8em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #00d4aa, #00a8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .status-bar {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
        }

        .status-item {
            text-align: center;
        }

        .status-number {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .status-label {
            font-size: 0.8em;
            opacity: 0.8;
        }

        .success { color: #00d4aa; }
        .error { color: #ff4757; }
        .total { color: #00a8ff; }
        .progress { color: #ffa502; }

        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: linear-gradient(45deg, #00d4aa, #00a8ff);
            color: white;
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .results-container {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            overflow: hidden;
            max-height: 500px;
            overflow-y: auto;
        }

        .results-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }

        .results-table th {
            background: rgba(0, 212, 170, 0.2);
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid rgba(0, 212, 170, 0.3);
            position: sticky;
            top: 0;
        }

        .results-table td {
            padding: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            word-break: break-all;
        }

        .results-table tr:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .status-success {
            color: #00d4aa;
            font-weight: bold;
        }

        .status-error {
            color: #ff4757;
            font-weight: bold;
        }

        .url-cell {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .loading {
            text-align: center;
            padding: 30px;
            font-size: 1.1em;
        }

        .spinner {
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 3px solid rgba(0, 212, 170, 0.3);
            border-radius: 50%;
            border-top-color: #00d4aa;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 15px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .filter-bar {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
            align-items: center;
            font-size: 12px;
        }

        .filter-select {
            padding: 6px 10px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.2);
            color: white;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>API batch test result</h1>
            <p id="testInfo">${testConfig.categoryTitle} | ${testConfig.method} | ${testConfig.items.length} 项</p>
        </div>

        <div class="status-bar">
            <div class="status-item">
                <div class="status-number total" id="totalCount">${testConfig.items.length}</div>
                <div class="status-label">total</div>
            </div>
            <div class="status-item">
                <div class="status-number progress" id="progressCount">0</div>
                <div class="status-label">already complete</div>
            </div>
            <div class="status-item">
                <div class="status-number success" id="successCount">0</div>
                <div class="status-label">success</div>
            </div>
            <div class="status-item">
                <div class="status-number error" id="errorCount">0</div>
                <div class="status-label">failed</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn btn-primary" id="startBtn">start test</button>
            <button class="btn btn-secondary" id="pauseBtn" disabled>暂停 test</button>
            <button class="btn btn-secondary" id="exportBtn">export result</button>
            <button class="btn btn-secondary" id="clearBtn">clear result</button>
        </div>

        <div class="filter-bar">
            <label>filter:</label>
            <select class="filter-select" id="statusFilter">
                <option value="all">all</option>
                <option value="success">仅 success</option>
                <option value="error">仅 failed</option>
            </select>
            <select class="filter-select" id="statusCodeFilter">
                <option value="all">all status 码</option>
                <option value="2xx">2xx</option>
                <option value="3xx">3xx</option>
                <option value="4xx">4xx</option>
                <option value="5xx">5xx</option>
            </select>
        </div>

        <div class="results-container">
            <div class="loading" id="loadingDiv">
                <div class="spinner"></div>
                <div>准备 start test ...</div>
            </div>
            <table class="results-table" id="resultsTable" style="display: none;">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>path</th>
                        <th>status 码</th>
                        <th>size</th>
                        <th>耗时</th>
                        <th>result</th>
                    </tr>
                </thead>
                <tbody id="resultsBody">
                </tbody>
            </table>
        </div>
    </div>

    <!-- 将测试configurationdata storage indata属性in -->
    <div id="testConfigData" data-config="${encodeURIComponent(JSON.stringify(testConfig))}" style="display: none;"></div>
    
    <!-- use外部脚本内容，避免chrome-extension://protocol -->
    <script>
        ${this.getScriptContent()}
    </script>
</body>
</html>
        `;
    }
}