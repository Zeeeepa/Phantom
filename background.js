// After台Script
class BackgroundSRCMiner {
    constructor() {
        this.init();
    }
    
    init() {
        // Listen来自content script的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放以支持Async响应
        });
        
        // Listen标签页Update
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab.url);
            }
        });
    }
    
    // Process消息
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
                    
                case 'executeJSInjection':
                    const injectionResult = await this.executeJSInjection(request.tabId, request.code);
                    sendResponse({ success: true, data: injectionResult });
                    break;
                
                // Process深度Scan窗口的消息
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
    
    // Process深度ScanRelated消息
    async handleDeepScanMessage(request, sender) {
        //console.log('🔍 Process深度Scan消息:', request.action);
        
        // 转发消息给主ExtensionPage（popupOrcontent script）
        try {
            // Get所有标签页
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                // 跳过Scan窗口本身And非HTTPPage
                if (tab.url && 
                    tab.url.startsWith('http') && 
                    !tab.url.includes('deep-scan-window.html')) {
                    
                    try {
                        await chrome.tabs.sendMessage(tab.id, request);
                        //console.log(`✅ 消息Already转发到标签页: ${tab.id}`);
                    } catch (error) {
                        // 忽略None法Send消息的标签页（可能Nocontent script）
                        //console.log(`⚠️ None法向标签页 ${tab.id} Send消息:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ 转发深度Scan消息Failed:', error);
        }
    }
    
    // 使用CustomRequest headerSendRequest - ThroughdeclarativeNetRequest动态修改Request header
    async makeRequestWithCookie(url, options = {}) {
        try {
            //console.log(`🌐 After台ScriptPrepareSendRequest: ${url}`);
            
            // GetSave的CustomRequest headerSettings
            ////console.log('🔍 [DEBUG] StartGetCustomRequest header...');
            const result = await chrome.storage.local.get('phantomHeaders');
            ////console.log('🔍 [DEBUG] chrome.storage.local.getResult:', result);
            const customHeaders = result.phantomHeaders || [];
            
            ////console.log(`📋 Get到CustomRequest header:`, customHeaders);
            ////console.log(`📋 Request header数量: ${customHeaders.length}`);
            ////console.log(`📋 Request header详情:`, JSON.stringify(customHeaders, null, 2));
            
            // 尝试AddCustomRequest header规则（如果有的话）
            await this.addCustomHeadersRule(url, customHeaders);
            
            // Ensure离屏文档存在
            await this.ensureOffscreenDocument();
            
            // Through离屏文档SendRequest
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequestWithCookie',
                    url: url,
                    options: options,
                    customHeaders: customHeaders
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ 离屏文档通信Failed:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        //console.log(`✅ 离屏文档RequestSuccess: ${response.data.status}`);
                        resolve(response.data);
                    } else {
                        console.error('❌ 离屏文档RequestFailed:', response?.error);
                        reject(new Error(response?.error || 'Offscreen request failed'));
                    }
                });
            });
            
            // Clean规则（None论是否有CustomRequest header都要Clean，避免残留规则）
            await this.removeCustomHeadersRule();
            
            return response;
        } catch (error) {
            console.error(`❌ After台ScriptRequestFailed: ${error.message}`);
            // EnsureClean规则
            try {
                await this.removeCustomHeadersRule();
            } catch (e) {
                console.warn('Clean规则时出错:', e);
            }
            throw error;
        }
    }
    
    // AddCustomRequest header规则
    async addCustomHeadersRule(url, customHeaders) {
        try {
            // 如果NoCustomRequest header，DirectReturn
            if (!customHeaders || customHeaders.length === 0) {
                //console.log('🔧 NoCustomRequest header，跳过规则Add');
                return;
            }
            
            const urlObj = new URL(url);
            const ruleId = 1; // 使用固定ID，方便After续Delete
            
            //console.log(`🔧 AddCustomRequest header规则: ${urlObj.hostname}`, customHeaders);
            
            // 构建Request header数Group，FilterInvalid的Request header
            const requestHeaders = customHeaders
                .filter(header => header && header.key && header.value)
                .map(header => ({
                    header: header.key,
                    operation: 'set',
                    value: header.value
                }));
            
            // 如果FilterAfterNoValid的Request header，DirectReturn
            if (requestHeaders.length === 0) {
                //console.log('🔧 NoValid的CustomRequest header，跳过规则Add');
                return;
            }
            
            const rule = {
                id: ruleId,
                priority: 1,
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: requestHeaders
                },
                condition: {
                    urlFilter: `*://${urlObj.hostname}/*`,
                    resourceTypes: ['xmlhttprequest', 'other']
                }
            };
            
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [rule],
                removeRuleIds: [ruleId] // FirstDelete可能存在的旧规则
            });
            
            //console.log(`✅ CustomRequest header规则AddSuccess，共${requestHeaders.length}个Request header`);
        } catch (error) {
            console.error('❌ AddCustomRequest header规则Failed:', error);
            // 不要抛出Error，让RequestContinuePerform
        }
    }
    
    // RemoveCustomRequest header规则
    async removeCustomHeadersRule() {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1]
            });
            //console.log('🔧 CustomRequest header规则AlreadyClean');
        } catch (error) {
            // 规则可能不存在，This是正常的，No need to report an error
            //console.log('🔧 CleanCustomRequest header规则（规则可能不存在）');
        }
    }
    
    // Ensure离屏文档存在
    async ensureOffscreenDocument() {
        try {
            // Check是否Already有离屏文档
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (existingContexts.length > 0) {
                //console.log('🔧 离屏文档Already存在');
                return;
            }
            
            // Create离屏文档
            //console.log('🔧 Create离屏文档...');
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: 'Need使用Complete的Web API来Send带Cookie的NetworkRequest'
            });
            
            //console.log('✅ 离屏文档CreateSuccess');
        } catch (error) {
            console.error('❌ 离屏文档CreateFailed:', error);
            throw error;
        }
    }
    
    // Execute深度Scan
    async performDeepScan(baseUrl, options = {}) {
        try {
            const results = {
                urls: [],
                errors: []
            };
            
            // Get要Scan的URL列Table
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
    
    // ExecuteAPI Testing
    async performApiTest(urls, options = {}) {
        try {
            const results = [];
            const concurrency = options.concurrency || 5;
            const timeout = options.timeout || 5000;
            
            // 分批ProcessURL
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
        
        // 安装时的Initialize
        chrome.runtime.onInstalled.addListener(() => {
            //console.log('幻影Already安装');
        });
    }
    
    // JS注入功能 - 使用chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeJSInjection(tabId, code) {
        try {
            console.log('🔧 StartExecuteJS注入 (world: MAIN)...');
            
            // RecordExecute的ScriptContent（Used for调试）
            console.log('✅ PrepareExecuteUser代码，长度:', code.length);

            // 使用 world: 'MAIN' 在主世界ExecuteScript，绕过CSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: 'MAIN',  // 关Key：在主世界Execute，不受PageCSP限制
                args: [code],
                func: (userCode) => {
                    try {
                        // Direct eval 即可，CSP 不会拦截Extension注入
                        eval(userCode);
                        return { success: true, message: 'ScriptExecuteSuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JSScriptExecuteSuccess');
                return { success: true, message: 'ScriptExecuteSuccess (world: MAIN)' };
            } else {
                console.error('❌ JSScriptExecuteFailed:', result?.error);
                return { success: false, error: result?.error || 'Not知Error' };
            }

        } catch (error) {
            console.error('❌ Script注入Failed:', error);
            return { success: false, error: error.message };
        }
    }

    async storeResults(data, url) {
        try {
            const timestamp = new Date().toISOString();
            // 注释掉Create大量垃圾存储的功能
            // const key = `results_${Date.now()}`;
            
            // await chrome.storage.local.set({
            //     [key]: {
            //         url: url,
            //         timestamp: timestamp,
            //         data: data
            //     }
            // });
            
            // Update最新Result
            await chrome.storage.local.set({
                'latestResults': {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            //console.log('Scan resultsSaved:', url);
        } catch (error) {
            console.error('Save resultsFailed:', error);
        }
    }

    // ExecuteScriptContent - 使用chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 StartExecuteJSScript (world: MAIN)...');
            
            // GetCurrent活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('None法GetCurrent标签页');
                return;
            }

            // RecordExecute的ScriptContent（Used for调试）
            console.log('✅ PrepareExecuteUser代码，长度:', scriptContent.length);

            // 使用 world: 'MAIN' 在主世界ExecuteScript，绕过CSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关Key：在主世界Execute，不受PageCSP限制
                args: [scriptContent],
                func: (code) => {
                    try {
                        // Direct eval 即可，CSP 不会拦截Extension注入
                        eval(code);
                        return { success: true, message: 'ScriptExecuteSuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JSScriptExecuteSuccess');
                alert('ScriptExecuteSuccess (world: MAIN)');
            } else {
                console.error('❌ JSScriptExecuteFailed:', result?.error);
                alert('ScriptExecuteFailed: ' + (result?.error || 'Not知Error'));
            }

        } catch (error) {
            console.error('❌ Script注入Failed:', error);
            alert('Script注入Failed: ' + error.message);
        }
    }

    // ExecuteScriptContent - Throughbackground.js使用chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 StartExecuteJSScript (Throughbackground.js)...');
            
            // GetCurrent活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('None法GetCurrent标签页');
                return;
            }

            // Throughbackground.jsExecute注入
            const response = await chrome.runtime.sendMessage({
                action: 'executeJSInjection',
                tabId: tab.id,
                code: scriptContent
            });

            if (response?.success && response.data?.success) {
                console.log('✅ JSScriptExecuteSuccess');
                alert('ScriptExecuteSuccess (world: MAIN)');
            } else {
                const errorMsg = response?.data?.error || response?.error || 'Not知Error';
                console.error('❌ JSScriptExecuteFailed:', errorMsg);
                alert('ScriptExecuteFailed: ' + errorMsg);
            }

        } catch (error) {
            console.error('❌ Script注入Failed:', error);
            alert('Script注入Failed: ' + error.message);
        }
    }
    
    async handleTabUpdate(tabId, url) {
        // 当PageLoading complete时，CanExecute一些After台任务
        if (url.startsWith('http')) {
            //console.log('PageLoaded:', url);
        }
    }
    
    // Clean旧Data
    async cleanOldData() {
        try {
            const data = await chrome.storage.local.get();
            const keys = Object.keys(data);
            const resultKeys = keys.filter(key => key.startsWith('results_'));
            
            // Only保留最近50条Record
            if (resultKeys.length > 50) {
                const sortedKeys = resultKeys.sort().slice(0, -50);
                await chrome.storage.local.remove(sortedKeys);
                //console.log('AlreadyClean旧Data:', sortedKeys.length, '条');
            }
        } catch (error) {
            console.error('CleanDataFailed:', error);
        }
    }
}

// InitializeAfter台Script
new BackgroundSRCMiner();

// 定期CleanData
setInterval(() => {
    new BackgroundSRCMiner().cleanOldData();
}, 24 * 60 * 60 * 1000); // Every24小时Clean一次