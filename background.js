// background script
class BackgroundSRCMiner {
    constructor() {
        this.init();
    }
    
    init() {
        // listenfromcontent script  message
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持 message 通道开放以support async response
        });
        
        // listen tab 页 update
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab.url);
            }
        });
    }
    
    // process message
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
                
                // process deep scan window   message
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
    
    // process deep scan 相关 message
    async handleDeepScanMessage(request, sender) {
        //console.log('🔍 process deep scan message:', request.action);
        
        // 转发 message 给主 extension page（popuporcontent script）
        try {
            // 获取all tab 页
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                // skip scan窗口本身and非HTTPpage
                if (tab.url && 
                    tab.url.startsWith('http') && 
                    !tab.url.includes('deep-scan-window.html')) {
                    
                    try {
                        await chrome.tabs.sendMessage(tab.id, request);
                        //console.log(`✅ message already转发到 tab 页: ${tab.id}`);
                    } catch (error) {
                        // 忽略无法发送 message   tab 页（可能没有content script）
                        //console.log(`⚠️ 无法向 tab 页 ${tab.id} 发送 message:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ 转发 deep scan message failed:', error);
        }
    }
    
    // use custom request 头发送 request - 通throughdeclarativeNetRequest dynamic modify request 头
    async makeRequestWithCookie(url, options = {}) {
        try {
            //console.log(`🌐 background script 准备发送 request: ${url}`);
            
            // 获取 save   custom request 头 settings
            ////console.log('🔍 [DEBUG] start 获取 custom request 头...');
            const result = await chrome.storage.local.get('phantomHeaders');
            ////console.log('🔍 [DEBUG] chrome.storage.local.get result:', result);
            const customHeaders = result.phantomHeaders || [];
            
            ////console.log(`📋 获取到 custom request 头:`, customHeaders);
            ////console.log(`📋 request 头 count: ${customHeaders.length}`);
            ////console.log(`📋 request 头详情:`, JSON.stringify(customHeaders, null, 2));
            
            // 尝试 add custom request 头规则（如果有 话）
            await this.addCustomHeadersRule(url, customHeaders);
            
            // 确保offscreen documentation 存in
            await this.ensureOffscreenDocument();
            
            // 通throughoffscreen documentation 发送 request
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequestWithCookie',
                    url: url,
                    options: options,
                    customHeaders: customHeaders
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ offscreen documentation 通信 failed:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        //console.log(`✅ offscreen documentation request success: ${response.data.status}`);
                        resolve(response.data);
                    } else {
                        console.error('❌ offscreen documentation request failed:', response?.error);
                        reject(new Error(response?.error || 'Offscreen request failed'));
                    }
                });
            });
            
            // cleanup 规则（无论是否有 custom request 头都要 cleanup，避免残留规则）
            await this.removeCustomHeadersRule();
            
            return response;
        } catch (error) {
            console.error(`❌ background script request failed: ${error.message}`);
            // 确保 cleanup 规则
            try {
                await this.removeCustomHeadersRule();
            } catch (e) {
                console.warn('cleanup 规则时出错:', e);
            }
            throw error;
        }
    }
    
    // add custom request 头规则
    async addCustomHeadersRule(url, customHeaders) {
        try {
            // 如果没有 custom request 头，directly返回
            if (!customHeaders || customHeaders.length === 0) {
                //console.log('🔧 没有 custom request 头，skip规则 add');
                return;
            }
            
            const urlObj = new URL(url);
            const ruleId = 1; // use固定ID，方便后续 delete
            
            //console.log(`🔧 add custom request 头规则: ${urlObj.hostname}`, customHeaders);
            
            // 构建 request 头 array，filter invalid   request 头
            const requestHeaders = customHeaders
                .filter(header => header && header.key && header.value)
                .map(header => ({
                    header: header.key,
                    operation: 'set',
                    value: header.value
                }));
            
            // 如果 filter 后没有 valid   request 头，directly返回
            if (requestHeaders.length === 0) {
                //console.log('🔧 没有 valid   custom request 头，skip规则 add');
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
                removeRuleIds: [ruleId] // 先 delete 可能存in 旧规则
            });
            
            //console.log(`✅ custom request 头规则 add success，共${requestHeaders.length}个request头`);
        } catch (error) {
            console.error('❌ add custom request 头规则 failed:', error);
            // do not要抛出 error，让 request 继续进行
        }
    }
    
    // remove custom request 头规则
    async removeCustomHeadersRule() {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1]
            });
            //console.log('🔧 custom request 头规则already cleanup');
        } catch (error) {
            // 规则可能do not存in，这是 normal  ，do notrequire报错
            //console.log('🔧 cleanup custom request 头规则（规则可能do not存in）');
        }
    }
    
    // 确保offscreen documentation 存in
    async ensureOffscreenDocument() {
        try {
            // check 是否already有offscreen documentation
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (existingContexts.length > 0) {
                //console.log('🔧 offscreen documentation already存in');
                return;
            }
            
            // 创建offscreen documentation
            //console.log('🔧 创建offscreen documentation ...');
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: 'requireusecomplete Web API来发送带Cookie network request'
            });
            
            //console.log('✅ offscreen documentation 创建 success');
        } catch (error) {
            console.error('❌ offscreen documentation 创建 failed:', error);
            throw error;
        }
    }
    
    // execute deep scan
    async performDeepScan(baseUrl, options = {}) {
        try {
            const results = {
                urls: [],
                errors: []
            };
            
            // 获取要 scan  URL list
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
    
    // execute API test
    async performApiTest(urls, options = {}) {
        try {
            const results = [];
            const concurrency = options.concurrency || 5;
            const timeout = options.timeout || 5000;
            
            // 分批 process URL
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
        
        // 安装时  initialize
        chrome.runtime.onInstalled.addListener(() => {
            //console.log('phantomalready安装');
        });
    }
    
    // JS inject feature - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeJSInjection(tabId, code) {
        try {
            console.log('🔧 start execute JS inject (world: MAIN)...');
            
            // 记录 execute   script content（for debug）
            console.log('✅ 准备 execute user code，length:', code.length);

            // use world: 'MAIN' in主世界 execute script，绕throughCSP limit
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: 'MAIN',  // 关 key：in主世界 execute，do not受 page CSP limit
                args: [code],
                func: (userCode) => {
                    try {
                        // directly eval 即可，CSP do not会 intercept extension inject
                        eval(userCode);
                        return { success: true, message: 'script execute success' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS script execute success');
                return { success: true, message: 'script execute success (world: MAIN)' };
            } else {
                console.error('❌ JS script execute failed:', result?.error);
                return { success: false, error: result?.error || '未知 error' };
            }

        } catch (error) {
            console.error('❌ script inject failed:', error);
            return { success: false, error: error.message };
        }
    }

    async storeResults(data, url) {
        try {
            const timestamp = new Date().toISOString();
            // comment 掉创建大量垃圾 storage   feature
            // const key = `results_${Date.now()}`;
            
            // await chrome.storage.local.set({
            //     [key]: {
            //         url: url,
            //         timestamp: timestamp,
            //         data: data
            //     }
            // });
            
            // update 最新 result
            await chrome.storage.local.set({
                'latestResults': {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            //console.log('scan result already save:', url);
        } catch (error) {
            console.error('save result failed:', error);
        }
    }

    // execute script content - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start execute JS script (world: MAIN)...');
            
            // 获取 current 活动 tab 页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法获取 current tab 页');
                return;
            }

            // 记录 execute   script content（for debug）
            console.log('✅ 准备 execute user code，length:', scriptContent.length);

            // use world: 'MAIN' in主世界 execute script，绕throughCSP limit
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关 key：in主世界 execute，do not受 page CSP limit
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP do not会 intercept extension inject
                        eval(code);
                        return { success: true, message: 'script execute success' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS script execute success');
                alert('script execute success (world: MAIN)');
            } else {
                console.error('❌ JS script execute failed:', result?.error);
                alert('script execute failed: ' + (result?.error || '未知 error'));
            }

        } catch (error) {
            console.error('❌ script inject failed:', error);
            alert('script inject failed: ' + error.message);
        }
    }

    // execute script content - 通throughbackground.jsusechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start execute JS script (通throughbackground.js)...');
            
            // 获取 current 活动 tab 页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法获取 current tab 页');
                return;
            }

            // 通throughbackground.js execute inject
            const response = await chrome.runtime.sendMessage({
                action: 'executeJSInjection',
                tabId: tab.id,
                code: scriptContent
            });

            if (response?.success && response.data?.success) {
                console.log('✅ JS script execute success');
                alert('script execute success (world: MAIN)');
            } else {
                const errorMsg = response?.data?.error || response?.error || '未知 error';
                console.error('❌ JS script execute failed:', errorMsg);
                alert('script execute failed: ' + errorMsg);
            }

        } catch (error) {
            console.error('❌ script inject failed:', error);
            alert('script inject failed: ' + error.message);
        }
    }
    
    async handleTabUpdate(tabId, url) {
        // 当 page load complete 时，可以 execute 一些background task
        if (url.startsWith('http')) {
            //console.log('page already load:', url);
        }
    }
    
    // cleanup 旧 data
    async cleanOldData() {
        try {
            const data = await chrome.storage.local.get();
            const keys = Object.keys(data);
            const resultKeys = keys.filter(key => key.startsWith('results_'));
            
            // 只keep最近50条记录
            if (resultKeys.length > 50) {
                const sortedKeys = resultKeys.sort().slice(0, -50);
                await chrome.storage.local.remove(sortedKeys);
                //console.log('already cleanup 旧 data:', sortedKeys.length, '条');
            }
        } catch (error) {
            console.error('cleanup data failed:', error);
        }
    }
}

// initialize background script
new BackgroundSRCMiner();

// 定期 cleanup data
setInterval(() => {
    new BackgroundSRCMiner().cleanOldData();
}, 24 * 60 * 60 * 1000); // 每24小时 cleanup 一次