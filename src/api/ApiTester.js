/**
 * APItest器 - 负责API接口批量test功能
 */
class ApiTester {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    /**
     * getcustomrequest头settings
     */
    async getCustomHeaders() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getHeadersSetting();
            }
            return [];
        } catch (error) {
            console.error('getcustomrequest头settingsfailed:', error);
            return [];
        }
    }

    /**
     * getCookiesettings（兼容性方法）
     */
    async getCookieSetting() {
        try {
            if (this.srcMiner.settingsManager) {
                return await this.srcMiner.settingsManager.getCookieSetting();
            }
            return '';
        } catch (error) {
            console.error('getCookiesettingsfailed:', error);
            return '';
        }
    }
    
    /**
     * checkandautomaticadd"/"before缀tobaseapi路径
     * @param {string} baseApiPath - 输入baseapi路径
     * @returns {string} - 处理后baseapi路径
     */
    normalizeBaseApiPath(baseApiPath) {
        if (!baseApiPath || typeof baseApiPath !== 'string') {
            return '';
        }
        
        const trimmedPath = baseApiPath.trim();
        if (trimmedPath === '') {
            return '';
        }
        
        // if路径not是以"/"开头，automaticadd
        if (!trimmedPath.startsWith('/')) {
            return '/' + trimmedPath;
        }
        
        return trimmedPath;
    }
    
    /**
     * 处理多个baseapi路径（每行一个）
     * @param {string} baseApiPaths - 输入多个baseapi路径，每行一个
     * @returns {Array<string>} - 处理后baseapi路径数组
     */
    normalizeMultipleBaseApiPaths(baseApiPaths) {
        if (!baseApiPaths || typeof baseApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除空白字符，through滤空字符串
        const paths = baseApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
        
        // 对每个路径进行标准化处理
        return paths.map(path => this.normalizeBaseApiPath(path));
    }
    
    /**
     * 标准化多个customdomain输入
     * @param {string} domains - 多行domain字符串
     * @returns {Array<string>} - 处理后domain数组
     */
    normalizeMultipleDomains(domains) {
        if (!domains || typeof domains !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除空白字符，through滤空字符串
        return domains
            .split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0)
            .map(domain => {
                // 确保domaincontains协议
                if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
                    domain = 'http://' + domain;
                }
                // 移除末尾斜杠
                return domain.replace(/\/$/, '');
            });
    }
    
    // 批量requesttest
    async batchRequestTest() {
        const method = document.getElementById('requestMethod').value;
        const selectedCategory = document.getElementById('categorySelect').value;
        
        // getand发数and超时时间configuration
        const concurrencyInput = document.getElementById('apiConcurrency');
        const timeoutInput = document.getElementById('apiTimeout');

        // getbase API路径configuration
        const baseApiPathInput = document.getElementById('baseApiPath');
        const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
        const customBaseApiPaths = this.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
        
        // getcustomdomainconfiguration
        const customDomainsInput = document.getElementById('customDomains');
        const rawCustomDomains = customDomainsInput ? customDomainsInput.value.trim() : '';
        const customDomains = this.normalizeMultipleDomains(rawCustomDomains);
        
        // ifautomaticadd了"/"before缀，给出提示
        if (rawBaseApiPaths) {
            const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
            const normalizedPaths = customBaseApiPaths;
            
            // check每个路径是否by修改
            originalPaths.forEach((originalPath, index) => {
                const normalizedPath = normalizedPaths[index];
                if (originalPath && originalPath !== normalizedPath) {
                    //console.log(`🔧 automatic为baseapi路径add"/"before缀: "${originalPath}" -> "${normalizedPath}"`);
                }
            });
            
            if (customBaseApiPaths.length > 1) {
                //console.log(`🔧 detectto ${customBaseApiPaths.length} 个baseapi路径: ${customBaseApiPaths.join(', ')}`);
            }
        }
        
        // getcustomAPI路径configuration
        const customApiPathsInput = document.getElementById('customApiPaths');
        const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
        
        const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
        const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000; // convert为毫秒
        
        //console.log(`🔧 APItestconfiguration: and发数=${concurrency}, 超时=${timeout/1000}秒, Base API路径=${customBaseApiPaths.length > 0 ? customBaseApiPaths.join(', ') : '无'}, customAPI路径=${customApiPaths || '无'}`);

        
        if (!selectedCategory) {
            alert('请先选择要test分class');
            return;
        }
        
        let items = this.srcMiner.results[selectedCategory] || [];
        
        // if有customAPI路径，addtotest列表in
        if (customApiPaths) {
            const customPaths = this.parseCustomApiPaths(customApiPaths);
            items = this.mergeAndDeduplicateItems(items, customPaths);
            //console.log(`📝 add了 ${customPaths.length} 个customAPI路径，去重后总计 ${items.length} 个test项目`);
        }
        
        // if选择了customAPI路径分class，directlyusescanresultincustomAPI路径
        if (selectedCategory === 'customApis') {
            items = this.srcMiner.results.customApis || [];
            if (items.length === 0) {
                alert('customAPI路径分classinwithoutdata，请先addcustomAPI路径');
                return;
            }
            //console.log(`🔧 usescanresultincustomAPI路径进行test，共 ${items.length} 个`);
        }
        
        if (items.length === 0) {
            alert(`选in分class"${this.getCategoryTitle(selectedCategory)}"inwithoutdata，请先scanpage面`);
            return;
        }
        
        if (this.isTestableCategory(selectedCategory)) {
            await this.testSelectedCategory(selectedCategory, items, method, concurrency, timeout, customBaseApiPaths, customDomains);

        } else {
            alert(`分class"${this.getCategoryTitle(selectedCategory)}"notsupportrequesttest`);
        }
    }
    
    // get分class标题
    getCategoryTitle(categoryKey) {
        const categoryTitles = {
            'customApis': 'customAPI路径',
            'absoluteApis': '绝对路径API',
            'relativeApis': '相对路径API',
            'jsFiles': 'JS文件',
            'cssFiles': 'CSS文件',
            'images': '图片文件',
            'urls': 'completeURL',
            'domains': 'domain',
            'paths': '路径'
        };
        return categoryTitles[categoryKey] || categoryKey;
    }
    
    // check分class是否可以进行requesttest
    isTestableCategory(categoryKey) {
        const testableCategories = [
            'customApis', 'absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 
            'images', 'urls', 'paths'
        ];
        return testableCategories.includes(categoryKey);
    }
    
    // test选in分class
    async testSelectedCategory(categoryKey, items, method, concurrency = 8, timeout = 5000, customBaseApiPaths = [], customDomains = []) {

        try {
            // getcustomrequest头settings
            const customHeaders = await this.getCustomHeaders();
            //console.log('📋 gettocustomrequest头:', customHeaders);
            
            // usenewTestWindowclasscreatetest窗口
            const testWindow = new TestWindow();

            await testWindow.createTestWindow(categoryKey, items, method, concurrency, timeout, customHeaders, customBaseApiPaths, customDomains);

            
            // 显示success提示
            const modal = document.getElementById('requestResultModal');
            const resultsDiv = document.getElementById('requestResults');
            
            modal.style.display = 'block';
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #00d4aa; margin-bottom: 20px;">
                    <h3>✅ 测试窗口已打开</h3>
                    <p>已在新窗口中启动 ${this.getCategoryTitle(categoryKey)} 的批量测试</p>
                    <p>测试项目数: ${items.length} | 方法: ${method}</p>
                    <p>并发数: ${concurrency} | 超时: ${timeout/1000}秒</p>
                    <br>
                    <button onclick="document.getElementById('requestResultModal').style.display='none'" 
                            style="padding: 10px 20px; background: #00d4aa; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        关闭此提示
                    </button>
                </div>
            `;
            
            // 3秒后automatic关闭提示
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('createtest窗口failed:', error);
            alert('createtest窗口failed: ' + error.message);
        }
        
        return; // directlyreturn，not再execute原来test逻辑
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        // 真正and发处理 - 每个requestcomplete后立即显示result
        let completedCount = 0;
        let activeRequests = 0;
        let currentIndex = 0;
        
        const processNextBatch = () => {
            // startnewrequest直to达toand发限制orwithout更多项目
            while (activeRequests < concurrency && currentIndex < items.length) {
                const item = items[currentIndex];
                const itemIndex = currentIndex;
                currentIndex++;
                activeRequests++;
                
                // async处理单个request
                this.processSingleRequest(item, categoryKey, baseUrl, method, timeout, itemIndex)
                    .then(result => {
                        // requestcomplete，更new计数器
                        activeRequests--;
                        completedCount++;
                        
                        if (result.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                        
                        results.push(result);
                        
                        // 立即更new显示
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                测试进度: ${completedCount}/${items.length} | 成功: ${successCount} | 失败: ${failCount}
                                <br>当前并发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // if还有未处理项目，start下一个request
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    })
                    .catch(error => {
                        console.error('request处理failed:', error);
                        activeRequests--;
                        completedCount++;
                        failCount++;
                        
                        results.push({
                            url: item,
                            fullUrl: item,
                            status: 'Error',
                            statusText: error.message || 'requestfailed',
                            size: 'N/A',
                            time: 'N/A',
                            success: false
                        });
                        
                        // 更new显示
                        resultsDiv.innerHTML = `
                            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                                测试进度: ${completedCount}/${items.length} | 成功: ${successCount} | 失败: ${failCount}
                                <br>当前并发: ${activeRequests}/${concurrency}
                            </div>
                            ${this.renderRequestResults(results)}
                        `;
                        
                        // 继续处理下一个
                        if (currentIndex < items.length) {
                            processNextBatch();
                        }
                    });
            }
        };
        
        // start处理
        processNextBatch();
        
        // waitallrequestcomplete
        while (completedCount < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const modalTitle = modal.querySelector('h3');
        modalTitle.textContent = '批量testresult';
        
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: #00d4aa; margin-bottom: 10px;">
                测试完成: ${successCount} 成功 / ${failCount} 失败 (共 ${items.length} 个)
                <br>分类: ${this.getCategoryTitle(categoryKey)} | 方法: ${method}
            </div>
            ${this.renderRequestResults(results)}
        `;
    }
    
    // 处理单个request
    async processSingleRequest(item, categoryKey, baseUrl, method, timeout, index, cookieSetting = null) {
        try {
            let url = await this.buildTestUrl(item, categoryKey, baseUrl);
            
            if (!url) {
                return {
                    url: item,
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
            const response = await this.makeRequest(url, method, timeout, cookieSetting);
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            
            let size = 'N/A';
            try {
                if (response.headers && response.headers.get('content-length')) {
                    size = this.formatBytes(parseInt(response.headers.get('content-length')));
                }
            } catch (e) {
                // 忽略get大小failed
            }
            
            // 判断success state：2xxstatecodeor者no-corspattern下200
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
            // 这里应该很少executeto，因为makeRequestalready经处理了大部分错误
            return {
                url: item,
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
    async buildTestUrl(item, categoryKey, baseUrl) {
        try {
            let url = item;
            
            // fix：ifitem是object，extractvalue属性
            if (typeof item === 'object' && item !== null) {
                url = item.value || item.url || item;
            }
            
            // fix：确保url是字符串class型
            if (!url || typeof url !== 'string') {
                console.error('buildTestUrl: urlparameter无效:', url);
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
                        // 🔥 fix：automatic去除相对路径开头"."
                        let cleanedUrl = url;
                        if (cleanedUrl.startsWith('./')) {
                            cleanedUrl = cleanedUrl.substring(2); // 去除 "./"
                            console.log(`🔧 [ApiTester] 去除相对路径开头"./": "${url}" -> "${cleanedUrl}"`);
                        } else if (cleanedUrl.startsWith('.')) {
                            cleanedUrl = cleanedUrl.substring(1); // 去除单独 "."
                            console.log(`🔧 [ApiTester] 去除相对路径开头".": "${url}" -> "${cleanedUrl}"`);
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
            console.error('构建URLfailed:', error, item);
            return null;
        }
    }
    
    // sendrequest
    // sendrequest - 通throughbackground脚本
    async makeRequest(url, method, timeout = 5000, customCookie = null) {
        //console.log(`🌐 APItest通throughbackground脚本request: ${url}`);
        
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
            const response = await this.makeRequestViaBackground(url, requestOptions);
            return response;
        } catch (error) {
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
                    // mod拟fetch响应object
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
    
    // 批量test多个API - 供DisplayManager调for
    async testMultipleApis(items, method, baseUrl) {
        if (!items || items.length === 0) {
            return [];
        }
        
        //console.log(`🔍 start批量test ${items.length} 个API，方法: ${method}`);
        
        const results = [];
        const concurrencyLimit = 5; // and发限制
        
        // 分批处理
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
                            error: '无法构建validURL'
                        };
                    }
                    
                    // sendrequestand计时
                    const startTime = performance.now();
                    const response = await this.makeRequest(url, method, 5000); // use默认5秒超时
                    const endTime = performance.now();
                    const time = Math.round(endTime - startTime);
                    
                    // 尝试get响应data
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
                                data = `[${contentType}] 二进制data`;
                            }
                        }
                    } catch (e) {
                        data = `解析响应failed: ${e.message}`;
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
        
        //console.log(`✅ APItestcomplete，success: ${results.filter(r => r.success).length}/${results.length}`);
        return results;
    }
    
    // 渲染requestresult
    renderRequestResults(results) {
        if (!results || results.length === 0) {
            return '<div style="text-align: center; color: #666;">无result</div>';
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: rgba(0, 212, 170, 0.1);">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #00d4aa;">路径</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #00d4aa;">状态码</th>
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
    
    // 解析customAPI路径
    parseCustomApiPaths(customApiPaths) {
        if (!customApiPaths || typeof customApiPaths !== 'string') {
            return [];
        }
        
        // 按换行符分割，去除空白字符，through滤空字符串
        return customApiPaths
            .split('\n')
            .map(path => path.trim())
            .filter(path => path.length > 0);
    }
    
    // 合andand去重API路径
    mergeAndDeduplicateItems(existingItems, customPaths) {
        if (!Array.isArray(existingItems)) {
            existingItems = [];
        }
        if (!Array.isArray(customPaths)) {
            customPaths = [];
        }
        
        // createSetfor去重
        const uniqueItems = new Set();
        
        // add现有项目
        existingItems.forEach(item => {
            if (item && typeof item === 'string') {
                uniqueItems.add(item.trim());
            }
        });
        
        // addcustom路径
        customPaths.forEach(path => {
            if (path && typeof path === 'string') {
                uniqueItems.add(path.trim());
            }
        });
        
        // convert回数组
        return Array.from(uniqueItems);
    }
    
    // format化字节大小
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || bytes === 'N/A') return 'N/A';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}