// 后台脚本
class BackgroundSRCMiner {
    constructor() {
        this.init();
    }
    
    init() {
        // 监听来自content script的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放以支持异步响应
        });
        
        // 监听标签页更新
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab.url);
            }
        });
    }
    
    // 处理消息
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'storeResults':
                    await this.storeResults(request.data, request.url);
                    sendResponse({ success: true });
                    break;
                    
                case 'makeRequest':
                    const response = await this.makeRequestWithCookie(request.url, request.options);
                    sendResponse({ success: true, data: response });
                    break;
                    
                case 'deepScan':
                    const scanResult = await this.performDeepScan(request.url, request.options);
                    sendResponse({ success: true, data: scanResult });
                    break;
                    
                case 'apiTest':
                    const testResult = await this.performApiTest(request.urls, request.options);
                    sendResponse({ success: true, data: testResult });
                    break;
                
                // 处理深度扫描窗口的消息
                case 'updateScanResults':
                case 'scanProgress':
                case 'scanComplete':
                case 'scanError':
                case 'stopDeepScan':
                    await this.handleDeepScanMessage(request, sender);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    // 处理深度扫描相关消息
    async handleDeepScanMessage(request, sender) {
        console.log('🔍 处理深度扫描消息:', request.action);
        
        // 转发消息给主扩展页面（popup或content script）
        try {
            // 获取所有标签页
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                // 跳过扫描窗口本身和非HTTP页面
                if (tab.url && 
                    tab.url.startsWith('http') && 
                    !tab.url.includes('deep-scan-window.html')) {
                    
                    try {
                        await chrome.tabs.sendMessage(tab.id, request);
                        console.log(`✅ 消息已转发到标签页: ${tab.id}`);
                    } catch (error) {
                        // 忽略无法发送消息的标签页（可能没有content script）
                        console.log(`⚠️ 无法向标签页 ${tab.id} 发送消息:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ 转发深度扫描消息失败:', error);
        }
    }
    
    // 使用Cookie发送请求 - 通过declarativeNetRequest动态修改请求头
    async makeRequestWithCookie(url, options = {}) {
        try {
            console.log(`🌐 后台脚本准备发送请求: ${url}`);
            
            // 获取保存的Cookie设置
            const result = await chrome.storage.local.get('phantomCookie');
            const cookieSetting = result.phantomCookie || '';
            
            console.log(`🍪 获取到Cookie设置: ${cookieSetting ? cookieSetting.substring(0, 50) + '...' : '无'}`);
            
            if (cookieSetting && cookieSetting.trim()) {
                // 使用declarativeNetRequest动态添加Cookie请求头
                await this.addCookieRule(url, cookieSetting.trim());
            }
            
            // 确保离屏文档存在
            await this.ensureOffscreenDocument();
            
            // 通过离屏文档发送请求
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequestWithCookie',
                    url: url,
                    options: options,
                    cookieSetting: cookieSetting
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ 离屏文档通信失败:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        console.log(`✅ 离屏文档请求成功: ${response.data.status}`);
                        resolve(response.data);
                    } else {
                        console.error('❌ 离屏文档请求失败:', response?.error);
                        reject(new Error(response?.error || 'Offscreen request failed'));
                    }
                });
            });
            
            // 清理规则
            if (cookieSetting && cookieSetting.trim()) {
                await this.removeCookieRule();
            }
            
            return response;
        } catch (error) {
            console.error(`❌ 后台脚本请求失败: ${error.message}`);
            // 确保清理规则
            try {
                await this.removeCookieRule();
            } catch (e) {}
            throw error;
        }
    }
    
    // 添加Cookie规则
    async addCookieRule(url, cookieSetting) {
        try {
            const urlObj = new URL(url);
            const ruleId = 1; // 使用固定ID，方便后续删除
            
            console.log(`🔧 添加Cookie规则: ${urlObj.hostname}`);
            
            const rule = {
                id: ruleId,
                priority: 1,
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        {
                            header: 'Cookie',
                            operation: 'set',
                            value: cookieSetting
                        }
                    ]
                },
                condition: {
                    urlFilter: `*://${urlObj.hostname}/*`,
                    resourceTypes: ['xmlhttprequest', 'other']
                }
            };
            
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [rule],
                removeRuleIds: [ruleId] // 先删除可能存在的旧规则
            });
            
            console.log(`✅ Cookie规则添加成功: ${cookieSetting.substring(0, 30)}...`);
        } catch (error) {
            console.error('❌ 添加Cookie规则失败:', error);
        }
    }
    
    // 移除Cookie规则
    async removeCookieRule() {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1]
            });
            console.log('🔧 Cookie规则已清理');
        } catch (error) {
            console.warn('⚠️ 清理Cookie规则失败:', error);
        }
    }
    
    // 确保离屏文档存在
    async ensureOffscreenDocument() {
        try {
            // 检查是否已有离屏文档
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (existingContexts.length > 0) {
                console.log('🔧 离屏文档已存在');
                return;
            }
            
            // 创建离屏文档
            console.log('🔧 创建离屏文档...');
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: '需要使用完整的Web API来发送带Cookie的网络请求'
            });
            
            console.log('✅ 离屏文档创建成功');
        } catch (error) {
            console.error('❌ 离屏文档创建失败:', error);
            throw error;
        }
    }
    
    // 执行深度扫描
    async performDeepScan(baseUrl, options = {}) {
        try {
            const results = {
                urls: [],
                errors: []
            };
            
            // 获取要扫描的URL列表
            const urlsToScan = options.urls || [baseUrl];
            
            for (const url of urlsToScan) {
                try {
                    const response = await this.makeRequestWithCookie(url, {
                        method: 'GET',
                        timeout: options.timeout || 10000
                    });
                    
                    results.urls.push({
                        url: url,
                        status: response.status,
                        content: response.text,
                        headers: response.headers
                    });
                } catch (error) {
                    results.errors.push({
                        url: url,
                        error: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            throw new Error(`Deep scan failed: ${error.message}`);
        }
    }
    
    // 执行API测试
    async performApiTest(urls, options = {}) {
        try {
            const results = [];
            const concurrency = options.concurrency || 5;
            const timeout = options.timeout || 5000;
            
            // 分批处理URL
            for (let i = 0; i < urls.length; i += concurrency) {
                const batch = urls.slice(i, i + concurrency);
                const batchPromises = batch.map(async (url) => {
                    try {
                        const startTime = Date.now();
                        const response = await this.makeRequestWithCookie(url, {
                            method: options.method || 'GET',
                            timeout: timeout
                        });
                        const endTime = Date.now();
                        
                        return {
                            url: url,
                            status: response.status,
                            statusText: response.statusText,
                            responseTime: endTime - startTime,
                            success: true,
                            headers: response.headers
                        };
                    } catch (error) {
                        return {
                            url: url,
                            status: 0,
                            statusText: error.message,
                            responseTime: 0,
                            success: false,
                            error: error.message
                        };
                    }
                });
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }
            
            return results;
        } catch (error) {
            throw new Error(`API test failed: ${error.message}`);
        }
        
        // 安装时的初始化
        chrome.runtime.onInstalled.addListener(() => {
            console.log('幻影已安装');
        });
    }
    
    async storeResults(data, url) {
        try {
            const timestamp = new Date().toISOString();
            const key = `results_${Date.now()}`;
            
            await chrome.storage.local.set({
                [key]: {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            // 更新最新结果
            await chrome.storage.local.set({
                'latestResults': {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            console.log('扫描结果已保存:', url);
        } catch (error) {
            console.error('保存结果失败:', error);
        }
    }
    
    async handleTabUpdate(tabId, url) {
        // 当页面加载完成时，可以执行一些后台任务
        if (url.startsWith('http')) {
            console.log('页面已加载:', url);
        }
    }
    
    // 清理旧数据
    async cleanOldData() {
        try {
            const data = await chrome.storage.local.get();
            const keys = Object.keys(data);
            const resultKeys = keys.filter(key => key.startsWith('results_'));
            
            // 只保留最近50条记录
            if (resultKeys.length > 50) {
                const sortedKeys = resultKeys.sort().slice(0, -50);
                await chrome.storage.local.remove(sortedKeys);
                console.log('已清理旧数据:', sortedKeys.length, '条');
            }
        } catch (error) {
            console.error('清理数据失败:', error);
        }
    }
}

// 初始化后台脚本
new BackgroundSRCMiner();

// 定期清理数据
setInterval(() => {
    new BackgroundSRCMiner().cleanOldData();
}, 24 * 60 * 60 * 1000); // 每24小时清理一次