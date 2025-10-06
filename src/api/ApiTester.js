/**
 * API Testing器 - 负责API interface的BatchTest功能
 */
class ApiTester {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    /**
     * GetCustomRequest headerSettings
     */
    async getCustomHeaders() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getHeadersSetting();
            }
            return [];
        } catch (error) {
            console.error('GetCustomRequest headerSettingsFailed:', error);
            return [];
        }
    }

    /**
     * GetCookieSettings（兼容性Method）
     */
    async getCookieSetting() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getCookieSetting();
            }
            return '';
        } catch (error) {
            console.error('GetCookieSettingsFailed:', error);
            return '';
        }
    }
    
    /**
     * CheckAndAutoAdd"/"Before缀到baseapiPath
     * @param {string} baseApiPath - Input的baseapiPath
     * @returns {string} - ProcessAfter的baseapiPath
     */
    normalizeBaseApiPath(baseApiPath) {
        if (!baseApiPath || typeof baseApiPath !== 'string') {
            return '';
        }
        
        const trimmedPath = baseApiPath.trim();
        if (trimmedPath === '') {
            return '';
        }
        
        // 如果Path不是以"/"开Header，AutoAdd
        if (!trimmedPath.startsWith('/')) {
            return '/' + trimmedPath;
        }
        
        return trimmedPath;
    }
    
    /**
     * Process多个baseapiPath（Every行一个）
     * @param {string} baseApiPaths - Input的多个baseapiPath，Every行一个
     * @returns {Array<string>} - ProcessAfter的baseapiPath数Group
     */
    normalizeMultipleBaseApiPaths(baseApiPaths) {
        if (!baseApiPaths || typeof baseApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除Empty白字符，FilterEmpty字符串
        const paths = baseApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
        
        // 对Every个PathPerform标准化Process
        return paths.map(path => this.normalizeBaseApiPath(path));
    }
    
    /**
     * 标准化多个CustomDomainInput
     * @param {string} domains - 多行Domain字符串
     * @returns {Array<string>} - ProcessAfter的Domain数Group
     */
    normalizeMultipleDomains(domains) {
        if (!domains || typeof domains !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除Empty白字符，FilterEmpty字符串
        return domains
            .split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0)
            .map(domain => {
                // EnsureDomain包含Protocol
                if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                    domain = 'http://' + domain;
                }
                // Remove末尾的斜杠
                return domain.replace(/\/$/, '');
            });
    }
    
    // BatchRequestTest
    async batchRequestTest() {
        const method = document.getElementById('requestMethod').value;
        const selectedCategory = document.getElementById('categorySelect').value;
        
        // GetAnd发数And超时TimeConfiguration
        const concurrencyInput = document.getElementById('apiConcurrency');
        const timeoutInput = document.getElementById('apiTimeout');

        // Getbase APIPathConfiguration
        const baseApiPathInput = document.getElementById('baseApiPath');
        const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
        const customBaseApiPaths = this.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
        
        // GetCustomDomainConfiguration
        const customDomainsInput = document.getElementById('customDomains');
        const rawCustomDomains = customDomainsInput ? customDomainsInput.value.trim() : '';
        const customDomains = this.normalizeMultipleDomains(rawCustomDomains);
        
        // 如果AutoAdd了"/"Before缀，给出Prompt
        if (rawBaseApiPaths) {
            const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
            const normalizedPaths = customBaseApiPaths;
            
            // CheckEvery个Path是否By修改
            originalPaths.forEach((originalPath, index) => {
                const normalizedPath = normalizedPaths[index];
                if (originalPath && originalPath !== normalizedPath) {
                    //console.log(`🔧 Auto为baseapiPathAdd"/"Before缀: "${originalPath}" -> "${normalizedPath}"`);
                }
            });
            
            if (customBaseApiPaths.length > 1) {
                //console.log(`🔧 Detect到 ${customBaseApiPaths.length} 个baseapiPath: ${customBaseApiPaths.join(', ')}`);
            }
        }
        
        // GetCustomAPIPathConfiguration
        const customApiPathsInput = document.getElementById('customApiPaths');
        const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
        
        const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
        const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000; // Convert为毫秒
        
        //console.log(`🔧 API TestingConfiguration: And发数=${concurrency}, 超时=${timeout/1000}秒, Base APIPath=${customBaseApiPaths.length > 0 ? customBaseApiPaths.join(', ') : 'None'}, CustomAPIPath=${customApiPaths || 'None'}`);

        
        if (!selectedCategory) {
            alert('请First选择要Test的Category');
            return;
        }
        
        let items = this.srcMiner.results[selectedCategory] || [];
        
        // 如果有CustomAPIPath，Add到Test列Table中
        if (customApiPaths) {
            const customPaths = this.parseCustomApiPaths(customApiPaths);
            items = this.mergeAndDeduplicateItems(items, customPaths);
            //console.log(`📝 Add了 ${customPaths.length} 个CustomAPIPath，去重After总计 ${items.length} 个TestProject`);
        }
        
        // 如果选择了CustomAPIPathCategory，Direct使用Scan results中的CustomAPIPath
        if (selectedCategory === 'customApis') {
            items = this.srcMiner.results.customApis || [];
            if (items.length === 0) {
                alert('CustomAPIPathCategory中NoData，请FirstAddCustomAPIPath');
                return;
            }
            //console.log(`🔧 使用Scan results中的CustomAPIPathPerformTest，共 ${items.length} 个`);
        }
        
        if (items.length === 0) {
            alert(`选中的Category"${this.getCategoryTitle(selectedCategory)}"中NoData，请FirstScanPage`);
            return;
        }
        
        if (this.isTestableCategory(selectedCategory)) {
            await this.testSelectedCategory(selectedCategory, items, method, concurrency, timeout, customBaseApiPaths, customDomains);

        } else {
            alert(`Category"${this.getCategoryTitle(selectedCategory)}"不支持RequestTest`);
        }
    }
    
    // GetCategory标题
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'customApis': 'CustomAPIPath',
            'absoluteApis': 'Absolute pathAPI',
            'relativeApis': 'Relative pathAPI',
            'jsFiles': 'JSFile',
            'cssFiles': 'CSSFile',
            'images': '图片File',
            'urls': 'CompleteURL',
            'domains': 'Domain',
            'paths': 'Path'
        };
        return categoryTitles[categoryKey] || categoryKey;
    }
    
    // CheckCategory是否CanPerformRequestTest
    isTestableCategory(categoryKey) {
        const testableCategories = [
            'customApis', 'absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 
            'images', 'urls', 'paths'
        ];
        return testableCategories.includes(categoryKey);
    }
    
    // Test选中的Category
    async testSelectedCategory(categoryKey, items, method, concurrency = 8, timeout = 5000, customBaseApiPaths = [], customDomains = []) {

        try {
            // GetCustomRequest headerSettings
            const customHeaders = await this.getCustomHeaders();
            //console.log('📋 Get到CustomRequest header:', customHeaders);
            
            // 使用新的TestWindowClassCreateTest窗口
            const testWindow = new TestWindow();

            await testWindow.createTestWindow(categoryKey, items, method, concurrency, timeout, customHeaders, customBaseApiPaths, customDomains);

            
            // DisplaySuccessPrompt
            const modal = document.getElementById('requestResultModal');
            const resultsDiv = document.getElementById('requestResults');
            
            modal.style.display = 'block';
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #00d4aa; margin-bottom: 20px;">
                    <h3>✅ Test窗口Already打开</h3>
                    <p>Already在新窗口中Start ${this.getCategoryTitle(categoryKey)} 的BatchTest</p>
                    <p>TestProject数: ${items.length} | Method: ${method}</p>
                    <p>And发数: ${concurrency} | 超时: ${timeout/1000}秒</p>
                    <br>
                    <button onclick="document.getElementById('requestResultModal').style.display='none'" 
                            style="padding: 10px 20px; background: #00d4aa; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Close此Prompt
                    </button>
                </div>
            `;
            
            // 3 secondsAfterAutoClosePrompt
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('CreateTest窗口Failed:', error);
            alert('CreateTest窗口Failed: ' + error.message);
        }
        
        return; // DirectReturn，不再Execute原来的Test逻辑
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        // 真正的And发Process - Every个RequestCompleteAfter立即DisplayResult
        let completedCount = 0;
        let activeRequests = 0;
        let currentIndex = 0;
        
        const processNextBatch = () => {
            // Start新的Request直到达到And发限制OrNo更多Project
            while (activeRequests < concurrency && currentIndex < items.length) {
                const item = items[currentIndex];
                const itemIndex = currentIndex;
                currentIndex++;
                activeRequests++;
                
                // AsyncProcessSingleRequest
                this.processSingleRequest(item, categoryKey, baseUrl, method, timeout, itemIndex)
                    .then(result => {
                        // RequestComplete，Update计数器
                        activeRequests--;
                        completedCount++;
                        
                        if (result.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                        
                        results.push(result);
                        
                        // 立即UpdateDisplay
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                Test进度: ${completedCount}/${items.length} | Success: ${successCount} | Failed: ${failCount}
                                <br>CurrentAnd发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // 如果还有NotProcess的Project，Start下一个Request
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    })
                    .catch(error => {
                        console.error('RequestProcessFailed:', error);
                        activeRequests--;
                        completedCount++;
                        failCount++;
                        
                        results.push({
                            url: item,
                            fullUrl: item,
                            status: 'Error',
                            statusText: error.message || 'RequestFailed',
                            size: 'N/A',
                            time: 'N/A',
                            success: false
                        });
                        
                        // UpdateDisplay
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                Test进度: ${completedCount}/${items.length} | Success: ${successCount} | Failed: ${failCount}
                                <br>CurrentAnd发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // ContinueProcess下一个
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    });
            }
        };
        
        // StartProcess
        processNextBatch();
        
        // 等Pending所有RequestComplete
        while (completedCount < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const modalTitle = modal.querySelector('h3');
        modalTitle.textContent = 'BatchTestResult';
        
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                TestComplete: ${successCount} Success / ${failCount} Failed (共 ${items.length} 个)
                <br>Category: ${this.getCategoryTitle(categoryKey)} | Method: ${method}
            </div>
            ${this.renderRequestResults(results)}
        `;
    }
    
    // ProcessSingleRequest
    async processSingleRequest(item, categoryKey, baseUrl, method, timeout, index, cookieSetting = null) {
        try {
            let url = await this.buildTestUrl(item, categoryKey, baseUrl);
            
            if (!url) {
                return {
                    url: item,
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
            const response = await this.makeRequest(url, method, timeout, cookieSetting);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            
            let size = 'N/A';
            try {
                if (response.headers && response.headers.get('content-length')) {
                    size = this.formatBytes(parseInt(response.headers.get('content-length')));
                }
            } catch (e) {
                // 忽略Get大小Failed
            }
            
            // 判断SuccessStatus：2xx status code or 200 in no-cors mode
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
            // Here应该很少Execute到，因为makeRequestAlready经Process了大部分Error
            return {
                url: item,
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
    async buildTestUrl(item, categoryKey, baseUrl) {
        try {
            let url = item;
            
            // Fix：如果item是Object，Extractvalue属性
            if (typeof item === 'object' && item !== null) {
                url = item.value || item.url || item;
            }
            
            // Fix：Ensureurl是字符串Type
            if (!url || typeof url !== 'string') {
                console.error('buildTestUrl: urlParameterInvalid:', url);
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
                        // 🔥 Fix：Auto去除Relative path开Header的"."
                        let cleanedUrl = url;
                        if (cleanedUrl.startsWith('./')) {
                            cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                            console.log(`🔧 [ApiTester] 去除Relative path开Header的"./": "${url}" -> "${cleanedUrl}"`);
                        } else if (cleanedUrl.startsWith('.')) {
                            cleanedUrl = cleanedUrl.substring(1); // 去除单独的 "."
                            console.log(`🔧 [ApiTester] 去除Relative path开Header的".": "${url}" -> "${cleanedUrl}"`);
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
            console.error('构建URLFailed:', error, item);
            return null;
        }
    }
    
    // SendRequest
    // SendRequest - ThroughAfter台Script
    async makeRequest(url, method, timeout = 5000, customCookie = null) {
        //console.log(`🌐 API TestingThroughAfter台ScriptRequest: ${url}`);
        
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
            const response = await this.makeRequestViaBackground(url, requestOptions);
            return response;
        } catch (error) {
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
                    // 模拟fetch响应Object
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
    
    // BatchTest多个API - 供DisplayManager调用
    async testMultipleApis(items, method, baseUrl) {
        if (!items || items.length === 0) {
            return [];
        }
        
        //console.log(`🔍 StartBatchTest ${items.length} 个API，Method: ${method}`);
        
        const results = [];
        const concurrencyLimit = 5; // And发限制
        
        // 分批Process
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
                            error: 'None法构建ValidURL'
                        };
                    }
                    
                    // SendRequestAnd计时
                    const startTime = performance.now();
                    const response = await this.makeRequest(url, method, 5000); // 使用Default5 seconds超时
                    const endTime = performance.now();
                    const time = Math.round(endTime - startTime);
                    
                    // 尝试Get响应Data
                    let data = null;
                    try {
                        if (response.status !== 0) {
                            const contentType = response.headers.get('content-type') || '';
                            if (contentType.includes('application/json')) {
                                data = await response.json();
                            } else if (contentType.includes('text/')) {
                                const text = await response.text();
                                data = text.substring(0, 5000); // 限制文本大小
                            } else {
                                data = `[${contentType}] 二进制Data`;
                            }
                        }
                    } catch (e) {
                        data = `Parse响应Failed: ${e.message}`;
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
        
        //console.log(`✅ API TestingComplete，Success: ${results.filter(r => r.success).length}/${results.length}`);
        return results;
    }
    
    // 渲染RequestResult
    renderRequestResults(results) {
        if (!results || results.length === 0) {
            return '<div style="text-align: center; color: #666;">NoneResult</div>';
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: rgba(0, 212, 170, 0.1);">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #00d4aa;">Path</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">Status code</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">大小</th>
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
    
    // ParseCustomAPIPath
    parseCustomApiPaths(customApiPaths) {
        if (!customApiPaths || typeof customApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除Empty白字符，FilterEmpty字符串
        return customApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
    }
    
    // 合AndAnd去重APIPath
    mergeAndDeduplicateItems(existingItems, customPaths) {
        if (!Array.isArray(existingItems)) {
            existingItems = [];
        }
        if (!Array.isArray(customPaths)) {
            customPaths = [];
        }
        
        // CreateSetUsed for去重
        const uniqueItems = new Set();
        
        // Add现有Project
        existingItems.forEach(item => {
            if (item && typeof item === 'string') {
                uniqueItems.add(item.trim());
            }
        });
        
        // AddCustomPath
        customPaths.forEach(path => {
            if (path && typeof path === 'string') {
                uniqueItems.add(path.trim());
            }
        });
        
        // Convert回数Group
        return Array.from(uniqueItems);
    }
    
    // Format字节大小
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || bytes === 'N/A') return 'N/A';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}