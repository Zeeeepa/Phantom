/**
 * API test 器 - 负责API interface   batch test feature
 */
class ApiTester {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    /**
     * 获取 custom request 头 settings
     */
    async getCustomHeaders() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getHeadersSetting();
            }
            return [];
        } catch (error) {
            console.error('获取 custom request 头 settings failed:', error);
            return [];
        }
    }

    /**
     * 获取Cookie settings（兼容性 method）
     */
    async getCookieSetting() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getCookieSetting();
            }
            return '';
        } catch (error) {
            console.error('获取Cookie settings failed:', error);
            return '';
        }
    }
    
    /**
     * 检查andautomatic add"/"before缀到baseapipath
     * @param {string} baseApiPath - 输入 baseapi path
     * @returns {string} - process 后 baseapi path
     */
    normalizeBaseApiPath(baseApiPath) {
        if (!baseApiPath || typeof baseApiPath !== 'string') {
            return '';
        }
        
        const trimmedPath = baseApiPath.trim();
        if (trimmedPath === '') {
            return '';
        }
        
        // 如果pathdo not是以"/"开头，automatic add
        if (!trimmedPath.startsWith('/')) {
            return '/' + trimmedPath;
        }
        
        return trimmedPath;
    }
    
    /**
     * process 多个baseapi path（每行一个）
     * @param {string} baseApiPaths - 输入 多个baseapi path，每行一个
     * @returns {Array<string>} - process 后 baseapi path array
     */
    normalizeMultipleBaseApiPaths(baseApiPaths) {
        if (!baseApiPaths || typeof baseApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除 empty 白字符，filter empty string
        const paths = baseApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
        
        // 对每个 path 进行 standard 化 process
        return paths.map(path => this.normalizeBaseApiPath(path));
    }
    
    /**
     * standard 化多个 custom domain 输入
     * @param {string} domains - 多行 domain string
     * @returns {Array<string>} - process 后  domain array
     */
    normalizeMultipleDomains(domains) {
        if (!domains || typeof domains !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除 empty 白字符，filter empty string
        return domains
            .split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0)
            .map(domain => {
                // 确保 domain contains protocol
                if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                    domain = 'http://' + domain;
                }
                // remove 末尾 斜杠
                return domain.replace(/\/$/, '');
            });
    }
    
    // batch request test
    async batchRequestTest() {
        const method = document.getElementById('requestMethod').value;
        const selectedCategory = document.getElementById('categorySelect').value;
        
        // 获取 concurrent 数and timeout 时间 configuration
        const concurrencyInput = document.getElementById('apiConcurrency');
        const timeoutInput = document.getElementById('apiTimeout');

        // 获取base API path configuration
        const baseApiPathInput = document.getElementById('baseApiPath');
        const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
        const customBaseApiPaths = this.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
        
        // 获取 custom domain configuration
        const customDomainsInput = document.getElementById('customDomains');
        const rawCustomDomains = customDomainsInput ? customDomainsInput.value.trim() : '';
        const customDomains = this.normalizeMultipleDomains(rawCustomDomains);
        
        // 如果automatic add了"/"before缀，给出 prompt
        if (rawBaseApiPaths) {
            const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
            const normalizedPaths = customBaseApiPaths;
            
            // check 每个 path 是否passive marker modify
            originalPaths.forEach((originalPath, index) => {
                const normalizedPath = normalizedPaths[index];
                if (originalPath && originalPath !== normalizedPath) {
                    //console.log(`🔧 自动tobaseapipathadd"/"before缀: "${originalPath}" -> "${normalizedPath}"`);
                }
            });
            
            if (customBaseApiPaths.length > 1) {
                //console.log(`🔧 检测到 ${customBaseApiPaths.length} 个baseapi path: ${customBaseApiPaths.join(', ')}`);
            }
        }
        
        // 获取 custom API path configuration
        const customApiPathsInput = document.getElementById('customApiPaths');
        const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
        
        const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
        const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000; // convertto毫秒
        
        //console.log(`🔧 API test configuration: concurrent数=${concurrency}, timeout =${timeout/1000} seconds, Base API path =${customBaseApiPaths.length > 0 ? customBaseApiPaths.join(', ') : '无'}, custom API path =${customApiPaths || '无'}`);

        
        if (!selectedCategory) {
            alert('请先 select 要 test  分类');
            return;
        }
        
        let items = this.srcMiner.results[selectedCategory] || [];
        
        // 如果有 custom API path，add 到 test list in
        if (customApiPaths) {
            const customPaths = this.parseCustomApiPaths(customApiPaths);
            items = this.mergeAndDeduplicateItems(items, customPaths);
            //console.log(`📝 add 了 ${customPaths.length} 个 custom API path，去重后总计 ${items.length} 个 test 项目`);
        }
        
        // 如果 select 了 custom API path 分类，directlyuse scan result in  custom API path
        if (selectedCategory === 'customApis') {
            items = this.srcMiner.results.customApis || [];
            if (items.length === 0) {
                alert('custom API path 分类in没有 data，请先 add custom API path');
                return;
            }
            //console.log(`🔧 use scan result in  custom API path 进行 test，共 ${items.length} 个`);
        }
        
        if (items.length === 0) {
            alert(`选in 分类"${this.getCategoryTitle(selectedCategory)}"in没有data，请先 scan page`);
            return;
        }
        
        if (this.isTestableCategory(selectedCategory)) {
            await this.testSelectedCategory(selectedCategory, items, method, concurrency, timeout, customBaseApiPaths, customDomains);

        } else {
            alert(`分类"${this.getCategoryTitle(selectedCategory)}"do notsupport请求测试`);
        }
    }
    
    // 获取分类标题
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'customApis': 'custom API path',
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
    
    // check 分类是否可以进行 request test
    isTestableCategory(categoryKey) {
        const testableCategories = [
            'customApis', 'absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 
            'images', 'urls', 'paths'
        ];
        return testableCategories.includes(categoryKey);
    }
    
    // test 选in 分类
    async testSelectedCategory(categoryKey, items, method, concurrency = 8, timeout = 5000, customBaseApiPaths = [], customDomains = []) {

        try {
            // 获取 custom request 头 settings
            const customHeaders = await this.getCustomHeaders();
            //console.log('📋 获取到 custom request 头:', customHeaders);
            
            // use新 TestWindow类创建 test window
            const testWindow = new TestWindow();

            await testWindow.createTestWindow(categoryKey, items, method, concurrency, timeout, customHeaders, customBaseApiPaths, customDomains);

            
            // display success prompt
            const modal = document.getElementById('requestResultModal');
            const resultsDiv = document.getElementById('requestResults');
            
            modal.style.display = 'block';
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #00d4aa; margin-bottom: 20px;">
                    <h3>✅ 测试窗口already打开</h3>
                    <p>alreadyin新窗口in启动 ${this.getCategoryTitle(categoryKey)}  批量测试</p>
                    <p>测试项目数: ${items.length} | method: ${method}</p>
                    <p>concurrent 数: ${concurrency} | timeout: ${timeout/1000}秒</p>
                    <br>
                    <button onclick="document.getElementById('requestResultModal').style.display='none'" 
                            style="padding: 10px 20px; background: #00d4aa; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        close此提示
                    </button>
                </div>
            `;
            
            // 3 seconds后 automatic close prompt
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('创建 test window failed:', error);
            alert('创建 test window failed: ' + error.message);
        }
        
        return; // directly返回，do not再 execute 原来  test 逻辑
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        // 真正  concurrent process - 每个 request complete 后立即 display result
        let completedCount = 0;
        let activeRequests = 0;
        let currentIndex = 0;
        
        const processNextBatch = () => {
            // 启动新  request 直到达到 concurrent limit or没有更多项目
            while (activeRequests < concurrency && currentIndex < items.length) {
                const item = items[currentIndex];
                const itemIndex = currentIndex;
                currentIndex++;
                activeRequests++;
                
                // async process single request
                this.processSingleRequest(item, categoryKey, baseUrl, method, timeout, itemIndex)
                    .then(result => {
                        // request complete，update 计数器
                        activeRequests--;
                        completedCount++;
                        
                        if (result.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                        
                        results.push(result);
                        
                        // 立即 update display
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                测试进度: ${completedCount}/${items.length} | success: ${successCount} | failed: ${failCount}
                                <br>current并发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // 如果还有not process  项目，启动下一个 request
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    })
                    .catch(error => {
                        console.error('request process failed:', error);
                        activeRequests--;
                        completedCount++;
                        failCount++;
                        
                        results.push({
                            url: item,
                            fullUrl: item,
                            status: 'Error',
                            statusText: error.message || 'request failed',
                            size: 'N/A',
                            time: 'N/A',
                            success: false
                        });
                        
                        // update display
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                测试进度: ${completedCount}/${items.length} | success: ${successCount} | failed: ${failCount}
                                <br>current并发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // 继续 process 下一个
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    });
            }
        };
        
        // start process
        processNextBatch();
        
        // wait all request complete
        while (completedCount < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const modalTitle = modal.querySelector('h3');
        modalTitle.textContent = 'batch test result';
        
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                test complete: ${successCount} success / ${failCount} failed (共 ${items.length} 个)
                <br>分类: ${this.getCategoryTitle(categoryKey)} | method: ${method}
            </div>
            ${this.renderRequestResults(results)}
        `;
    }
    
    // process single request
    async processSingleRequest(item, categoryKey, baseUrl, method, timeout, index, cookieSetting = null) {
        try {
            let url = await this.buildTestUrl(item, categoryKey, baseUrl);
            
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
            const response = await this.makeRequest(url, method, timeout, cookieSetting);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            
            let size = 'N/A';
            try {
                if (response.headers && response.headers.get('content-length')) {
                    size = this.formatBytes(parseInt(response.headers.get('content-length')));
                }
            } catch (e) {
                // 忽略获取 size failed
            }
            
            // 判断 success status：2xx status 码or者no-cors mode 下 200
            const isSuccess = response.ok || (response.status >= 200 && response.status < 300);
            
            return {
                url: item,
                fullUrl: url,
                status: response.status || 'Unknown',
                statusText: response.statusText || 'OK',
                size: size,
                time: `${duration}ms`,
                success: isSuccess,
                index: index
            };
        } catch (error) {
            // 这里应该很少 execute 到，因tomakeRequestalready经 process 了大 partial error
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
    async buildTestUrl(item, categoryKey, baseUrl) {
        try {
            let url = item;
            
            // fix：如果item是 object，extract value属性
            if (typeof item === 'object' && item !== null) {
                url = item.value || item.url || item;
            }
            
            // fix：确保url是 string type
            if (!url || typeof url !== 'string') {
                console.error('buildTestUrl: url parameter invalid:', url);
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
                            console.log(`🔧 [ApiTester] 去除相对 path开头 "./": "${url}" -> "${cleanedUrl}"`);
                        } else if (cleanedUrl.startsWith('.')) {
                            cleanedUrl = cleanedUrl.substring(1); // 去除单独  "."
                            console.log(`🔧 [ApiTester] 去除相对 path开头 ".": "${url}" -> "${cleanedUrl}"`);
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
    // 发送 request - 通throughbackground script
    async makeRequest(url, method, timeout = 5000, customCookie = null) {
        //console.log(`🌐 API test 通throughbackground script request: ${url}`);
        
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
            const response = await this.makeRequestViaBackground(url, requestOptions);
            return response;
        } catch (error) {
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
    async makeRequestViaBackground(url, options = {}) {
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
                    resolve({
                        ok: response.data.status >= 200 && response.data.status < 300,
                        status: response.data.status,
                        statusText: response.data.statusText,
                        headers: new Map(Object.entries(response.data.headers || {})),
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
    
    // batch test 多个API - 供DisplayManager调用
    async testMultipleApis(items, method, baseUrl) {
        if (!items || items.length === 0) {
            return [];
        }
        
        //console.log(`🔍 start batch test ${items.length} 个API，method: ${method}`);
        
        const results = [];
        const concurrencyLimit = 5; // concurrent limit
        
        // 分批 process
        const chunks = [];
        for (let i = 0; i < items.length; i += concurrencyLimit) {
            chunks.push(items.slice(i, i + concurrencyLimit));
        }
        
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (item) => {
                try {
                    // 构建URL
                    let url = await this.buildTestUrl(item, 'absoluteApis', baseUrl);
                    if (!url) {
                        return {
                            url: item,
                            method: method,
                            status: 'Error',
                            success: false,
                            time: 0,
                            data: null,
                            error: '无法构建 valid URL'
                        };
                    }
                    
                    // 发送 request 并计时
                    const startTime = performance.now();
                    const response = await this.makeRequest(url, method, 5000); // use default 5 seconds timeout
                    const endTime = performance.now();
                    const time = Math.round(endTime - startTime);
                    
                    // 尝试获取 response data
                    let data = null;
                    try {
                        if (response.status !== 0) {
                            const contentType = response.headers.get('content-type') || '';
                            if (contentType.includes('application/json')) {
                                data = await response.json();
                            } else if (contentType.includes('text/')) {
                                const text = await response.text();
                                data = text.substring(0, 5000); // limit text size
                            } else {
                                data = `[${contentType}] 二进制 data`;
                            }
                        }
                    } catch (e) {
                        data = `解析 response failed: ${e.message}`;
                    }
                    
                    return {
                        url: item,
                        fullUrl: url,
                        method: method,
                        status: response.status,
                        statusText: response.statusText,
                        success: response.ok || response.status < 400,
                        time: time,
                        data: data
                    };
                } catch (error) {
                    return {
                        url: item,
                        method: method,
                        status: 'Error',
                        statusText: error.message,
                        success: false,
                        time: 0,
                        data: null,
                        error: error.message
                    };
                }
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }
        
        //console.log(`✅ API test complete，success: ${results.filter(r => r.success).length}/${results.length}`);
        return results;
    }
    
    // 渲染 request result
    renderRequestResults(results) {
        if (!results || results.length === 0) {
            return '<div style="text-align: center; color: #666;">无 result</div>';
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: rgba(0, 212, 170, 0.1);">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #00d4aa;">path</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">status 码</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">size</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">耗时</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        results.forEach(result => {
            const statusColor = result.success ? '#00d4aa' : '#ff4757';
            html += `
                <tr style="border-bottom: 1px solid rgba(0, 212, 170, 0.2);">
                    <td style="padding: 8px; word-break: break-all;">${result.url}</td>
                    <td style="padding: 8px; text-align: center; color: ${statusColor};">${result.status}</td>
                    <td style="padding: 8px; text-align: center;">${result.size}</td>
                    <td style="padding: 8px; text-align: center;">${result.time}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        return html;
    }
    
    // 解析 custom API path
    parseCustomApiPaths(customApiPaths) {
        if (!customApiPaths || typeof customApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除 empty 白字符，filter empty string
        return customApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
    }
    
    // 合并并去重API path
    mergeAndDeduplicateItems(existingItems, customPaths) {
        if (!Array.isArray(existingItems)) {
            existingItems = [];
        }
        if (!Array.isArray(customPaths)) {
            customPaths = [];
        }
        
        // 创建Setfor去重
        const uniqueItems = new Set();
        
        // add 现有项目
        existingItems.forEach(item => {
            if (item && typeof item === 'string') {
                uniqueItems.add(item.trim());
            }
        });
        
        // add custom path
        customPaths.forEach(path => {
            if (path && typeof path === 'string') {
                uniqueItems.add(path.trim());
            }
        });
        
        // convert回 array
        return Array.from(uniqueItems);
    }
    
    // format 化字节 size
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || bytes === 'N/A') return 'N/A';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}