// script background
class BackgroundSRCMiner {
    constructor() {
        this.init();
    }
    
    init() {
        // listen from 自content of script消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // response async with on 保持消息通道放支持
        });
        
        // tab update listen
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab.url);
            }
        });
    }
    
    // process 消息
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
                
                // deep scan process window of 消息
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
    
    // deep scan process related 消息
    async handleDeepScanMessage(request, sender) {
        //console.log('🔍 deep scan process 消息:', request.action);
        
        // extension page 转发消息给主（popup或content script）
        try {
            // tab get all
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                // skip scan窗口本身和非HTTPpage
                if (tab.url && 
                    tab.url.startsWith('http') && 
                    !tab.url.includes('deep-scan-window.html')) {
                    
                    try {
                        await chrome.tabs.sendMessage(tab.id, request);
                        //console.log(`✅ tab to 消息已转发: ${tab.id}`);
                    } catch (error) {
                        // tab ignore send of 无法消息（has 可能没content script）
                        //console.log(`⚠️ tab 无法向 ${tab.id} send 消息:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ deep scan failed 转发消息:', error);
        }
    }
    
    // custom request request send use 头 - request via dynamic declarativeNetRequest修改头
    async makeRequestWithCookie(url, options = {}) {
        try {
            //console.log(`🌐 request script background send 准备: ${url}`);
            
            // custom save get settings request of 头
            ////console.log('🔍 [DEBUG] custom start get request 头...');
            const result = await chrome.storage.local.get('phantomHeaders');
            ////console.log('🔍 [DEBUG] results chrome.storage.local.get:', result);
            const customHeaders = result.phantomHeaders || [];
            
            ////console.log(`📋 custom get request to 头:`, customHeaders);
            ////console.log(`📋 quantity request 头: ${customHeaders.length}`);
            ////console.log(`📋 details request 头:`, JSON.stringify(customHeaders, null, 2));
            
            // custom add request then 尝试头规（if of has 话）
            await this.addCustomHeadersRule(url, customHeaders);
            
            // documentation 确保离屏存在
            await this.ensureOffscreenDocument();
            
            // documentation request send via 离屏
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequestWithCookie',
                    url: url,
                    options: options,
                    customHeaders: customHeaders
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ failed documentation 离屏通信:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        //console.log(`✅ success documentation request 离屏: ${response.data.status}`);
                        resolve(response.data);
                    } else {
                        console.error('❌ failed documentation request 离屏:', response?.error);
                        reject(new Error(response?.error || 'Offscreen request failed'));
                    }
                });
            });
            
            // cleanup then 规（custom cleanup request no yes has 无论头都要，then 避免残留规）
            await this.removeCustomHeadersRule();
            
            return response;
        } catch (error) {
            console.error(`❌ failed request script background: ${error.message}`);
            // cleanup then 确保规
            try {
                await this.removeCustomHeadersRule();
            } catch (e) {
                console.warn('cleanup error occurred then when 规:', e);
            }
            throw error;
        }
    }
    
    // custom add request then 头规
    async addCustomHeadersRule(url, customHeaders) {
        try {
            // custom request if has 没头，return directly
            if (!customHeaders || customHeaders.length === 0) {
                //console.log('🔧 custom request has 没头，add skip then 规');
                return;
            }
            
            const urlObj = new URL(url);
            const ruleId = 1; // use 固定ID，delete after 方便续
            
            //console.log(`🔧 custom add request then 头规: ${urlObj.hostname}`, customHeaders);
            
            // request array 构建头，filter request of 无效头
            const requestHeaders = customHeaders
                .filter(header => header && header.key && header.value)
                .map(header => ({
                    header: header.key,
                    operation: 'set',
                    value: header.value
                }));
            
            // filter request if of after has has 没效头，return directly
            if (requestHeaders.length === 0) {
                //console.log('🔧 custom request of has has 没效头，add skip then 规');
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
                removeRuleIds: [ruleId] // delete of then 先可能存在旧规
            });
            
            //console.log(`✅ custom success add request then 头规，total${requestHeaders.length} request item(s) 头`);
        } catch (error) {
            console.error('❌ custom failed add request then 头规:', error);
            // error throw 不要，continue request line(s) 让进
        }
    }
    
    // custom remove request then 头规
    async removeCustomHeadersRule() {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1]
            });
            //console.log('🔧 custom cleanup request then 头规已');
        } catch (error) {
            // then 规可能不存在，of yes 这正常，不需要报错
            //console.log('🔧 custom cleanup request then 头规（then 规可能不存在）');
        }
    }
    
    // documentation 确保离屏存在
    async ensureOffscreenDocument() {
        try {
            // documentation check no yes has 已离屏
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (existingContexts.length > 0) {
                //console.log('🔧 documentation 离屏已存在');
                return;
            }
            
            // documentation 创建离屏
            //console.log('🔧 documentation 创建离屏...');
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: 'use of 需要完整Web API request network send of with from Cookie'
            });
            
            //console.log('✅ success documentation 离屏创建');
        } catch (error) {
            console.error('❌ failed documentation 离屏创建:', error);
            throw error;
        }
    }
    
    // deep scan execute
    async performDeepScan(baseUrl, options = {}) {
        try {
            const results = {
                urls: [],
                errors: []
            };
            
            // URL scan get column(s) of 要表
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
    
    // API testing execute
    async performApiTest(urls, options = {}) {
        try {
            const results = [];
            const concurrency = options.concurrency || 5;
            const timeout = options.timeout || 5000;
            
            // URL process 分批
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
        
        // initialize of when 安装
        chrome.runtime.onInstalled.addListener(() => {
            //console.log('幻影已安装');
        });
    }
    
    // feature inject JS - use chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeJSInjection(tabId, code) {
        try {
            console.log('🔧 start inject execute JS (world: MAIN)...');
            
            // content record script execute of（debug for）
            console.log('✅ code execute user 准备，length:', code.length);

            // use world: 'MAIN' script execute 在主世界，limit 绕过CSP
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: 'MAIN',  // off 键：execute 在主世界，page limit 不受CSP
                args: [code],
                func: (userCode) => {
                    try {
                        // directly eval 即可，CSP extension intercept inject 不会
                        eval(userCode);
                        return { success: true, message: 'success script execute' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ success script execute JS');
                return { success: true, message: 'success script execute (world: MAIN)' };
            } else {
                console.error('❌ failed script execute JS:', result?.error);
                return { success: false, error: result?.error || 'error 未知' };
            }

        } catch (error) {
            console.error('❌ failed inject script:', error);
            return { success: false, error: error.message };
        }
    }

    async storeResults(data, url) {
        try {
            const timestamp = new Date().toISOString();
            // comment feature of 掉创建大量垃圾存储
            // const key = `results_${Date.now()}`;
            
            // await chrome.storage.local.set({
            //     [key]: {
            //         url: url,
            //         timestamp: timestamp,
            //         data: data
            //     }
            // });
            
            // update results latest
            await chrome.storage.local.set({
                'latestResults': {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            //console.log('scan results saved:', url);
        } catch (error) {
            console.error('failed save results:', error);
        }
    }

    // content script execute - use chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start script execute JS (world: MAIN)...');
            
            // tab get active current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('tab get current 无法');
                return;
            }

            // content record script execute of（debug for）
            console.log('✅ code execute user 准备，length:', scriptContent.length);

            // use world: 'MAIN' script execute 在主世界，limit 绕过CSP
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // off 键：execute 在主世界，page limit 不受CSP
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP extension intercept inject 不会
                        eval(code);
                        return { success: true, message: 'success script execute' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ success script execute JS');
                alert('success script execute (world: MAIN)');
            } else {
                console.error('❌ failed script execute JS:', result?.error);
                alert('failed script execute: ' + (result?.error || 'error 未知'));
            }

        } catch (error) {
            console.error('❌ failed inject script:', error);
            alert('failed inject script: ' + error.message);
        }
    }

    // content script execute - via use background.jschrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start script execute JS (via background.js)...');
            
            // tab get active current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('tab get current 无法');
                return;
            }

            // inject execute via background.js
            const response = await chrome.runtime.sendMessage({
                action: 'executeJSInjection',
                tabId: tab.id,
                code: scriptContent
            });

            if (response?.success && response.data?.success) {
                console.log('✅ success script execute JS');
                alert('success script execute (world: MAIN)');
            } else {
                const errorMsg = response?.data?.error || response?.error || 'error 未知';
                console.error('❌ failed script execute JS:', errorMsg);
                alert('failed script execute: ' + errorMsg);
            }

        } catch (error) {
            console.error('❌ failed inject script:', error);
            alert('failed inject script: ' + error.message);
        }
    }
    
    async handleTabUpdate(tabId, url) {
        // complete load page when 当，execute background can 一些任务
        if (url.startsWith('http')) {
            //console.log('load page 已:', url);
        }
    }
    
    // cleanup data 旧
    async cleanOldData() {
        try {
            const data = await chrome.storage.local.get();
            const keys = Object.keys(data);
            const resultKeys = keys.filter(key => key.startsWith('results_'));
            
            // record record(s) 只保留最近50
            if (resultKeys.length > 50) {
                const sortedKeys = resultKeys.sort().slice(0, -50);
                await chrome.storage.local.remove(sortedKeys);
                //console.log('cleanup data 已旧:', sortedKeys.length, ' record(s)');
            }
        } catch (error) {
            console.error('failed cleanup data:', error);
        }
    }
}

// initialize script background
new BackgroundSRCMiner();

// cleanup data 定期
setInterval(() => {
    new BackgroundSRCMiner().cleanOldData();
}, 24 * 60 * 60 * 1000); //  hours cleanup time(s) 每24一