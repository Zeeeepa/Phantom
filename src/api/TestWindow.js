/**
 * manager window test - API testing window and 负责创建管理
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

    // window test 创建
    async createTestWindow(categoryKey, items, method, concurrency = 8, timeout = 5000, customHeaders = [], customBaseApiPaths = [], customDomains = []) {

        let baseUrl = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
            }
        } catch (error) {
            console.error('URL failed get page current:', error);
        }

        // data configuration test 准备
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

        // save configuration to 将chrome.storage，window test read 供
        try {
            await chrome.storage.local.set({ 'testConfig': testConfig });
            //console.log('saved configuration test to storage:', testConfig);
        } catch (error) {
            console.error('failed save configuration test:', error);
            throw new Error('failed save configuration test: ' + error.message);
        }

        try {
            // extension page use of yes 真实而不Blob URL
            const testPageUrl = chrome.runtime.getURL('test-window.html');
            
            // open window 新
            const newWindow = await chrome.windows.create({
                url: testPageUrl,
                type: 'normal',
                width: 600,
                height: 900,
                focused: true
            });

            //console.log('window test 已创建:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('failed window test 创建:', error);
            throw error;
        }
    }

    // get title class 分
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'absoluteApis': 'absolute path API',
            'relativeApis': 'relative path API',
            'jsFiles': 'file JS',
            'cssFiles': 'file CSS',
            'images': 'file 图片',
            'urls': 'URL 完整',
            'domains': 'domain',
            'paths': 'path'
        };
        return categoryTitles[categoryKey] || categoryKey;
    }

    // content get script - return code characters directly JavaScript串，避免CSP问题
    getScriptContent() {
        return `
// script window test - 避免CSP问题
let testData = null;
let testResults = [];
let isTestRunning = false;
let isPaused = false;
let currentIndex = 0;
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// initialize complete load page of after
function initializePage() {
    //console.log('complete load page，start test 准备');
    
    // configuration test read from in data属性
    const configElement = document.getElementById('testConfigData');
    if (!configElement) {
        console.error('data configuration element to 找不');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: data configuration to 找不</div>';
        return;
    }
    
    try {
        const configData = configElement.getAttribute('data-config');
        if (!configData) {
            console.error('data configuration is empty');
            document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: data configuration is empty</div>';
            return;
        }
        
        testData = JSON.parse(decodeURIComponent(configData));
        maxConcurrency = testData.concurrency || 8;
        requestTimeout = testData.timeout || 5000;
        
        //console.log('loaded successfully configuration test:', testData);
        
    } catch (error) {
        console.error('failed data parse configuration:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: failed data parse configuration - ' + error.message + '</div>';
        return;
    }
    
    // add event listen 器
    document.getElementById('startBtn').addEventListener('click', startTest);
    document.getElementById('pauseBtn').addEventListener('click', pauseTest);
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('statusFilter').addEventListener('change', filterResults);
    document.getElementById('statusCodeFilter').addEventListener('change', filterResults);
    
    if (!testData || !testData.items || testData.items.length === 0) {
        console.error('data test 无效');
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">error: test project of has 没要</div>';
        return;
    }
    
    setTimeout(startTest, 1000);
}

// start test
async function startTest() {
    if (!testData || isTestRunning) return;
    
    //console.log('start test，project 数:', testData.items.length);
    
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
        console.error('error test when 启动发生:', error);
        document.getElementById('loadingDiv').innerHTML = '<div style="color: #ff4757;">failed test 启动: ' + error.message + '</div>';
    }
}

// pause test
function pauseTest() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? 'continue test' : 'pause test';
    if (!isPaused) processNextBatch();
}

// process request 下一批
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
                console.error('failed process request:', error);
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

// process request item(s) 单
async function processSingleRequest(item, index) {
    try {
        let url = buildTestUrl(item, testData.categoryKey, testData.baseUrl);
        
        if (!url) {
            return {
                url: item,
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
        }
        
        // fixed：type characters yes 确保url串
        if (!url || typeof url !== 'string') {
            console.error('processUrl: parameters url无效:', url);
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
                    // 🔥 fixed：自动去除relative path开头的"."
                    let cleanedUrl = url;
                    if (cleanedUrl.startsWith('./')) {
                        cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                    } else if (cleanedUrl.startsWith('.')) {
                        cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
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
        console.error('URL failed 构建:', error, item);
        return null;
    }
}

// request send
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
    
    // add Cookie支持
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
                statusText: 'request timeout (' + (timeout/1000) + ' seconds)',
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

// add results to 表格
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
    document.getElementById('pauseBtn').textContent = 'pause test';
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    document.getElementById('testInfo').textContent = 
        'complete test! success: ' + successCount + '/' + totalCount + ' | ' + testData.categoryTitle + ' | ' + testData.method;
}

// results 筛选
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

// export results
function exportResults() {
    if (testResults.length === 0) {
        alert('export results can test has 没');
        return;
    }
    
    const format = prompt('export select format:\\n1. JSON\\n2. please enter CSV\\n 1 或 2:', '1');
    
    if (format === '1') {
        exportAsJSON();
    } else if (format === '2') {
        exportAsCSV();
    }
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
            timestamp: new Date().toISOString()
        },
        results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'api-test-results-' + Date.now() + '.json');
}

// export as CSV
function exportAsCSV() {
    const headers = ['序号', 'path', 'status code', 'text status', '大小', 'when 耗', 'results'];
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

// clear results
function clearResults() {
    if (confirm('clear results all test 确定要吗？')) {
        testResults = [];
        document.getElementById('resultsBody').innerHTML = '';
        updateStatusBar();
        document.getElementById('testInfo').textContent = 'clear results 已';
    }
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

// initialize complete load auto page after
document.addEventListener('DOMContentLoaded', initializePage);
        `;
    }

    // content window test of 生成HTML
    generateTestWindowHTML(testConfig) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API results batch test</title>
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
            <h1>API results batch test</h1>
            <p id="testInfo">${testConfig.categoryTitle} | ${testConfig.method} | ${testConfig.items.length}  item(s)</p>
        </div>

        <div class="status-bar">
            <div class="status-item">
                <div class="status-number total" id="totalCount">${testConfig.items.length}</div>
                <div class="status-label">total count</div>
            </div>
            <div class="status-item">
                <div class="status-number progress" id="progressCount">0</div>
                <div class="status-label">completed</div>
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
            <button class="btn btn-secondary" id="pauseBtn" disabled>pause test</button>
            <button class="btn btn-secondary" id="exportBtn">export results</button>
            <button class="btn btn-secondary" id="clearBtn">clear results</button>
        </div>

        <div class="filter-bar">
            <label>筛选:</label>
            <select class="filter-select" id="statusFilter">
                <option value="all">全部</option>
                <option value="success">success 仅</option>
                <option value="error">failed 仅</option>
            </select>
            <select class="filter-select" id="statusCodeFilter">
                <option value="all">status code 全部</option>
                <option value="2xx">2xx</option>
                <option value="3xx">3xx</option>
                <option value="4xx">4xx</option>
                <option value="5xx">5xx</option>
            </select>
        </div>

        <div class="results-container">
            <div class="loading" id="loadingDiv">
                <div class="spinner"></div>
                <div>start test 准备...</div>
            </div>
            <table class="results-table" id="resultsTable" style="display: none;">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>path</th>
                        <th>status code</th>
                        <th>大小</th>
                        <th>when 耗</th>
                        <th>results</th>
                    </tr>
                </thead>
                <tbody id="resultsBody">
                </tbody>
            </table>
        </div>
    </div>

    <!-- 将测试configurationdata 存储在datain 属性 -->
    <div id="testConfigData" data-config="${encodeURIComponent(JSON.stringify(testConfig))}" style="display: none;"></div>
    
    <!-- use外部脚本内容，避免chrome-extension://协议 -->
    <script>
        ${this.getScriptContent()}
    </script>
</body>
</html>
        `;
    }
}