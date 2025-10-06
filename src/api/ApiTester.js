/**
 * API testing 器 - API interface feature batch test of 负责
 */
class ApiTester {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    /**
     * custom get settings request 头
     */
    async getCustomHeaders() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getHeadersSetting();
            }
            return [];
        } catch (error) {
            console.error('custom failed get settings request 头:', error);
            return [];
        }
    }

    /**
     * get settings Cookie（method 兼容性）
     */
    async getCookieSetting() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getCookieSetting();
            }
            return '';
        } catch (error) {
            console.error('failed get settings Cookie:', error);
            return '';
        }
    }
    
    /**
     * 检查和add auto"/"before 缀到baseapipath
     * @param {string} baseApiPath - path of 输入baseapi
     * @returns {string} - path process of after baseapi
     */
    normalizeBaseApiPath(baseApiPath) {
        if (!baseApiPath || typeof baseApiPath !== 'string') {
            return '';
        }
        
        const trimmedPath = baseApiPath.trim();
        if (trimmedPath === '') {
            return '';
        }
        
        // ifpath不是以"/"开头，add auto
        if (!trimmedPath.startsWith('/')) {
            return '/' + trimmedPath;
        }
        
        return trimmedPath;
    }
    
    /**
     * path process item(s) 多baseapi（ item(s) line(s) 每一）
     * @param {string} baseApiPaths - path item(s) of 输入多baseapi， item(s) line(s) 每一
     * @returns {Array<string>} - path process array of after baseapi
     */
    normalizeMultipleBaseApiPaths(baseApiPaths) {
        if (!baseApiPaths || typeof baseApiPaths !== 'string') {
            return [];
        }
        
        //  line(s) by 换符分割，characters empty 去除白，filter characters empty 串
        const paths = baseApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
        
        // path process item(s) line(s) 对每进标准化
        return paths.map(path => this.normalizeBaseApiPath(path));
    }
    
    /**
     * custom domain item(s) 标准化多输入
     * @param {string} domains - domain characters line(s) 多串
     * @returns {Array<string>} - domain process array of after
     */
    normalizeMultipleDomains(domains) {
        if (!domains || typeof domains !== 'string') {
            return [];
        }
        
        //  line(s) by 换符分割，characters empty 去除白，filter characters empty 串
        return domains
            .split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0)
            .map(domain => {
                // domain contains 确保协议
                if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                    domain = 'http://' + domain;
                }
                // remove of 末尾斜杠
                return domain.replace(/\/$/, '');
            });
    }
    
    // request batch test
    async batchRequestTest() {
        const method = document.getElementById('requestMethod').value;
        const selectedCategory = document.getElementById('categorySelect').value;
        
        // get configuration timeout and when 并发数间
        const concurrencyInput = document.getElementById('apiConcurrency');
        const timeoutInput = document.getElementById('apiTimeout');

        // get base API path configuration
        const baseApiPathInput = document.getElementById('baseApiPath');
        const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
        const customBaseApiPaths = this.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
        
        // custom domain get configuration
        const customDomainsInput = document.getElementById('customDomains');
        const rawCustomDomains = customDomainsInput ? customDomainsInput.value.trim() : '';
        const customDomains = this.normalizeMultipleDomains(rawCustomDomains);
        
        // ifadd auto了"/"before 缀，hint 给出
        if (rawBaseApiPaths) {
            const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
            const normalizedPaths = customBaseApiPaths;
            
            // path check item(s) no yes 每被修改
            originalPaths.forEach((originalPath, index) => {
                const normalizedPath = normalizedPaths[index];
                if (originalPath && originalPath !== normalizedPath) {
                    //console.log(`🔧 自动为baseapipathadd"/"before 缀: "${originalPath}" -> "${normalizedPath}"`);
                }
            });
            
            if (customBaseApiPaths.length > 1) {
                //console.log(`🔧 detected ${customBaseApiPaths.length} path item(s) baseapi: ${customBaseApiPaths.join(', ')}`);
            }
        }
        
        // API path custom get configuration
        const customApiPathsInput = document.getElementById('customApiPaths');
        const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
        
        const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
        const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000; // convert seconds as 毫
        
        //console.log(`🔧 API testing configuration: 并发数=${concurrency}, timeout =${timeout/1000} seconds, Base API path =${customBaseApiPaths.length > 0 ? customBaseApiPaths.join(', ') : '无'}, API path custom =${customApiPaths || '无'}`);

        
        if (!selectedCategory) {
            alert('select test class of 请先要分');
            return;
        }
        
        let items = this.srcMiner.results[selectedCategory] || [];
        
        // API path custom if has，add test column(s) to in 表
        if (customApiPaths) {
            const customPaths = this.parseCustomApiPaths(customApiPaths);
            items = this.mergeAndDeduplicateItems(items, customPaths);
            //console.log(`📝 add 了 ${customPaths.length} API path custom item(s)，after 去重总计 ${items.length} test items item(s)`);
        }
        
        // API path custom select if class 了分，API path scan results custom use directly in of
        if (selectedCategory === 'customApis') {
            items = this.srcMiner.results.customApis || [];
            if (items.length === 0) {
                alert('API path custom data class in has 分没，API path custom add 请先');
                return;
            }
            //console.log(`🔧 API path scan results custom use test line(s) in of 进，total ${items.length}  item(s)`);
        }
        
        if (items.length === 0) {
            alert(`选in的分类"${this.getCategoryTitle(selectedCategory)}"in没有data，scan page 请先`);
            return;
        }
        
        if (this.isTestableCategory(selectedCategory)) {
            await this.testSelectedCategory(selectedCategory, items, method, concurrency, timeout, customBaseApiPaths, customDomains);

        } else {
            alert(`分类"${this.getCategoryTitle(selectedCategory)}"不支持请求测试`);
        }
    }
    
    // get title class 分
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'customApis': 'API path custom',
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
    
    // check request can test line(s) class no yes 分进
    isTestableCategory(categoryKey) {
        const testableCategories = [
            'customApis', 'absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 
            'images', 'urls', 'paths'
        ];
        return testableCategories.includes(categoryKey);
    }
    
    // test class in of 选分
    async testSelectedCategory(categoryKey, items, method, concurrency = 8, timeout = 5000, customBaseApiPaths = [], customDomains = []) {

        try {
            // custom get settings request 头
            const customHeaders = await this.getCustomHeaders();
            //console.log('📋 custom get request to 头:', customHeaders);
            
            // window use new test class TestWindow创建
            const testWindow = new TestWindow();

            await testWindow.createTestWindow(categoryKey, items, method, concurrency, timeout, customHeaders, customBaseApiPaths, customDomains);

            
            // success hint display
            const modal = document.getElementById('requestResultModal');
            const resultsDiv = document.getElementById('requestResults');
            
            modal.style.display = 'block';
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #00d4aa; margin-bottom: 20px;">
                    <h3>✅ 测试窗口已打开</h3>
                    <p>已在新窗口in启动 ${this.getCategoryTitle(categoryKey)} 的批量测试</p>
                    <p>测试project 数: ${items.length} | method: ${method}</p>
                    <p>并发数: ${concurrency} | timeout: ${timeout/1000} seconds</p>
                    <br>
                    <button onclick="document.getElementById('requestResultModal').style.display='none'" 
                            style="padding: 10px 20px; background: #00d4aa; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        close此提示
                    </button>
                </div>
            `;
            
            // 3 seconds close hint auto after
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('failed window test 创建:', error);
            alert('failed window test 创建: ' + error.message);
        }
        
        return; // return directly，execute test of from 不再原逻辑
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        // process of 真正并发 - complete results request display item(s) after 每立即
        let completedCount = 0;
        let activeRequests = 0;
        let currentIndex = 0;
        
        const processNextBatch = () => {
            // request new limit project to to has 启动直达并发或没更多
            while (activeRequests < concurrency && currentIndex < items.length) {
                const item = items[currentIndex];
                const itemIndex = currentIndex;
                currentIndex++;
                activeRequests++;
                
                // process request async item(s) 单
                this.processSingleRequest(item, categoryKey, baseUrl, method, timeout, itemIndex)
                    .then(result => {
                        // complete request，update 计数器
                        activeRequests--;
                        completedCount++;
                        
                        if (result.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                        
                        results.push(result);
                        
                        // update display 立即
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                测试进度: ${completedCount}/${items.length} | success: ${successCount} | failed: ${failCount}
                                <br>current并发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // process if project of has 还未，request item(s) 启动下一
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    })
                    .catch(error => {
                        console.error('failed process request:', error);
                        activeRequests--;
                        completedCount++;
                        failCount++;
                        
                        results.push({
                            url: item,
                            fullUrl: item,
                            status: 'Error',
                            statusText: error.message || 'failed request',
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
                        
                        // continue process item(s) 下一
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    });
            }
        };
        
        // start process
        processNextBatch();
        
        // complete waiting request all
        while (completedCount < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const modalTitle = modal.querySelector('h3');
        modalTitle.textContent = 'results batch test';
        
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                complete test: ${successCount} success / ${failCount} failed (total ${items.length}  item(s))
                <br>分类: ${this.getCategoryTitle(categoryKey)} | method: ${method}
            </div>
            ${this.renderRequestResults(results)}
        `;
    }
    
    // process request item(s) 单
    async processSingleRequest(item, categoryKey, baseUrl, method, timeout, index, cookieSetting = null) {
        try {
            let url = await this.buildTestUrl(item, categoryKey, baseUrl);
            
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
            const response = await this.makeRequest(url, method, timeout, cookieSetting);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            
            let size = 'N/A';
            try {
                if (response.headers && response.headers.get('content-length')) {
                    size = this.formatBytes(parseInt(response.headers.get('content-length')));
                }
            } catch (e) {
                // failed get ignore 大小
            }
            
            // success status 判断：status code mode or of 2xxno-cors下200
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
            // execute to 这里应该很少，error process as 因makeRequest已经了大部分
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
    async buildTestUrl(item, categoryKey, baseUrl) {
        try {
            let url = item;
            
            // fixed：object if yes item，extracted value属性
            if (typeof item === 'object' && item !== null) {
                url = item.value || item.url || item;
            }
            
            // fixed：type characters yes 确保url串
            if (!url || typeof url !== 'string') {
                console.error('buildTestUrl: parameters url无效:', url);
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
                            console.log(`🔧 [ApiTester] 去除relative path开头的"./": "${url}" -> "${cleanedUrl}"`);
                        } else if (cleanedUrl.startsWith('.')) {
                            cleanedUrl = cleanedUrl.substring(1); // of 去除单独 "."
                            console.log(`🔧 [ApiTester] 去除relative path开头的".": "${url}" -> "${cleanedUrl}"`);
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
    // request send - script background via
    async makeRequest(url, method, timeout = 5000, customCookie = null) {
        //console.log(`🌐 API testing request script background via: ${url}`);
        
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
            const response = await this.makeRequestViaBackground(url, requestOptions);
            return response;
        } catch (error) {
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
                    // response object 模拟fetch
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
    
    // API batch test item(s) 多 - call 供DisplayManager
    async testMultipleApis(items, method, baseUrl) {
        if (!items || items.length === 0) {
            return [];
        }
        
        //console.log(`🔍 start batch test ${items.length} API item(s)，method: ${method}`);
        
        const results = [];
        const concurrencyLimit = 5; // limit 并发
        
        // process 分批
        const chunks = [];
        for (let i = 0; i < items.length; i += concurrencyLimit) {
            chunks.push(items.slice(i, i + concurrencyLimit));
        }
        
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (item) => {
                try {
                    // URL 构建
                    let url = await this.buildTestUrl(item, 'absoluteApis', baseUrl);
                    if (!url) {
                        return {
                            url: item,
                            method: method,
                            status: 'Error',
                            success: false,
                            time: 0,
                            data: null,
                            error: 'URL has 无法构建效'
                        };
                    }
                    
                    // request send when 并计
                    const startTime = performance.now();
                    const response = await this.makeRequest(url, method, 5000); // 5 seconds default timeout use
                    const endTime = performance.now();
                    const time = Math.round(endTime - startTime);
                    
                    // data get response 尝试
                    let data = null;
                    try {
                        if (response.status !== 0) {
                            const contentType = response.headers.get('content-type') || '';
                            if (contentType.includes('application/json')) {
                                data = await response.json();
                            } else if (contentType.includes('text/')) {
                                const text = await response.text();
                                data = text.substring(0, 5000); // text limit 大小
                            } else {
                                data = `[${contentType}] data 二进制`;
                            }
                        }
                    } catch (e) {
                        data = `failed parse response: ${e.message}`;
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
        
        //console.log(`✅ API testing complete，success: ${results.filter(r => r.success).length}/${results.length}`);
        return results;
    }
    
    // results request 渲染
    renderRequestResults(results) {
        if (!results || results.length === 0) {
            return '<div style="text-align: center; color: #666;">results 无</div>';
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: rgba(0, 212, 170, 0.1);">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #00d4aa;">path</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">status code</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">大小</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">when 耗</th>
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
    
    // API path custom parse
    parseCustomApiPaths(customApiPaths) {
        if (!customApiPaths || typeof customApiPaths !== 'string') {
            return [];
        }
        
        //  line(s) by 换符分割，characters empty 去除白，filter characters empty 串
        return customApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
    }
    
    // API path 合并并去重
    mergeAndDeduplicateItems(existingItems, customPaths) {
        if (!Array.isArray(existingItems)) {
            existingItems = [];
        }
        if (!Array.isArray(customPaths)) {
            customPaths = [];
        }
        
        // for 创建Set去重
        const uniqueItems = new Set();
        
        // add project has 现
        existingItems.forEach(item => {
            if (item && typeof item === 'string') {
                uniqueItems.add(item.trim());
            }
        });
        
        // custom add path
        customPaths.forEach(path => {
            if (path && typeof path === 'string') {
                uniqueItems.add(path.trim());
            }
        });
        
        // convert array 回
        return Array.from(uniqueItems);
    }
    
    // format 化字节大小
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || bytes === 'N/A') return 'N/A';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}