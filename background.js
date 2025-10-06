// background脚本
class BackgroundSRCMiner {
    constructor() {
        this.init();
    }
    
    init() {
        // listenfromcontent scriptmessage
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // keepmessagechannelopento supportasync响应
        });
        
        // listen标签page更new
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab.url);
            }
        });
    }
    
    // 处理message
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
                
                // 处理deep scan窗口message
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
    
    // 处理deep scan相关message
    async handleDeepScanMessage(request, sender) {
        //console.log('🔍 处理deep scanmessage:', request.action);
        
        // convert发message给主扩展page面（popuporcontent script）
        try {
            // getall标签page
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                // skipscan窗口本身and非HTTPpage面
                if (tab.url && 
                    tab.url.startsWith('http') && 
                    !tab.url.includes('deep-scan-window.html')) {
                    
                    try {
                        await chrome.tabs.sendMessage(tab.id, request);
                        //console.log(`✅ messagealreadyconvert发to标签page: ${tab.id}`);
                    } catch (error) {
                        // 忽略无法sendmessage标签page（可能withoutcontent script）
                        //console.log(`⚠️ 无法向标签page ${tab.id} sendmessage:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ convert发deep scanmessagefailed:', error);
        }
    }
    
    // usecustomrequest头sendrequest - 通throughdeclarativeNetRequest动态修改request头
    async makeRequestWithCookie(url, options = {}) {
        try {
            //console.log(`🌐 background脚本准备sendrequest: ${url}`);
            
            // get保存customrequest头settings
            ////console.log('🔍 [DEBUG] startgetcustomrequest头...');
            const result = await chrome.storage.local.get('phantomHeaders');
            ////console.log('🔍 [DEBUG] chrome.storage.local.getresult:', result);
            const customHeaders = result.phantomHeaders || [];
            
            ////console.log(`📋 gettocustomrequest头:`, customHeaders);
            ////console.log(`📋 request头数量: ${customHeaders.length}`);
            ////console.log(`📋 request头详情:`, JSON.stringify(customHeaders, null, 2));
            
            // 尝试addcustomrequest头规则（if有话）
            await this.addCustomHeadersRule(url, customHeaders);
            
            // 确保offscreendocumentexists
            await this.ensureOffscreenDocument();
            
            // 通throughoffscreendocumentsendrequest
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeRequestWithCookie',
                    url: url,
                    options: options,
                    customHeaders: customHeaders
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ offscreendocument通信failed:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        //console.log(`✅ offscreendocumentrequestsuccess: ${response.data.status}`);
                        resolve(response.data);
                    } else {
                        console.error('❌ offscreendocumentrequestfailed:', response?.error);
                        reject(new Error(response?.error || 'Offscreen request failed'));
                    }
                });
            });
            
            // 清理规则（无论是否有customrequest头都要清理，避免残留规则）
            await this.removeCustomHeadersRule();
            
            return response;
        } catch (error) {
            console.error(`❌ background脚本requestfailed: ${error.message}`);
            // 确保清理规则
            try {
                await this.removeCustomHeadersRule();
            } catch (e) {
                console.warn('清理规则时出错:', e);
            }
            throw error;
        }
    }
    
    // addcustomrequest头规则
    async addCustomHeadersRule(url, customHeaders) {
        try {
            // ifwithoutcustomrequest头，directlyreturn
            if (!customHeaders || customHeaders.length === 0) {
                //console.log('🔧 withoutcustomrequest头，skip规则add');
                return;
            }
            
            const urlObj = new URL(url);
            const ruleId = 1; // use固定ID，方便后续删除
            
            //console.log(`🔧 addcustomrequest头规则: ${urlObj.hostname}`, customHeaders);
            
            // 构建request头数组，through滤无效request头
            const requestHeaders = customHeaders
                .filter(header => header && header.key && header.value)
                .map(header => ({
                    header: header.key,
                    operation: 'set',
                    value: header.value
                }));
            
            // ifthrough滤后withoutvalidrequest头，directlyreturn
            if (requestHeaders.length === 0) {
                //console.log('🔧 withoutvalidcustomrequest头，skip规则add');
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
                removeRuleIds: [ruleId] // 先删除可能exists旧规则
            });
            
            //console.log(`✅ customrequest头规则addsuccess，共${requestHeaders.length}个request头`);
        } catch (error) {
            console.error('❌ addcustomrequest头规则failed:', error);
            // not要抛出错误，让request继续进行
        }
    }
    
    // 移除customrequest头规则
    async removeCustomHeadersRule() {
        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1]
            });
            //console.log('🔧 customrequest头规则already清理');
        } catch (error) {
            // 规则可能notexists，这是正常，notrequire报错
            //console.log('🔧 清理customrequest头规则（规则可能notexists）');
        }
    }
    
    // 确保offscreendocumentexists
    async ensureOffscreenDocument() {
        try {
            // check是否already有offscreendocument
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT']
            });
            
            if (existingContexts.length > 0) {
                //console.log('🔧 offscreendocumentalreadyexists');
                return;
            }
            
            // createoffscreendocument
            //console.log('🔧 createoffscreendocument...');
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: 'requireusecompleteWeb API来send带Cookienetworkrequest'
            });
            
            //console.log('✅ offscreendocumentcreatesuccess');
        } catch (error) {
            console.error('❌ offscreendocumentcreatefailed:', error);
            throw error;
        }
    }
    
    // executedeep scan
    async performDeepScan(baseUrl, options = {}) {
        try {
            const results = {
                urls: [],
                errors: []
            };
            
            // get要scanURL列表
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
    
    // executeAPItest
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
        
        // 安装时initialize
        chrome.runtime.onInstalled.addListener(() => {
            //console.log('phantomalready安装');
        });
    }
    
    // JSinjection功能 - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeJSInjection(tabId, code) {
        try {
            console.log('🔧 startexecuteJSinjection (world: MAIN)...');
            
            // recordexecute脚本内容（for调试）
            console.log('✅ 准备executeusercode，长度:', code.length);

            // use world: 'MAIN' in主世界execute脚本，绕throughCSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                world: 'MAIN',  // 关键：in主世界execute，not受page面CSP限制
                args: [code],
                func: (userCode) => {
                    try {
                        // directly eval 即可，CSP not会拦截扩展injection
                        eval(userCode);
                        return { success: true, message: '脚本executesuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS脚本executesuccess');
                return { success: true, message: '脚本executesuccess (world: MAIN)' };
            } else {
                console.error('❌ JS脚本executefailed:', result?.error);
                return { success: false, error: result?.error || '未知错误' };
            }

        } catch (error) {
            console.error('❌ 脚本injectionfailed:', error);
            return { success: false, error: error.message };
        }
    }

    async storeResults(data, url) {
        try {
            const timestamp = new Date().toISOString();
            // 注释掉create大量垃圾storage功能
            // const key = `results_${Date.now()}`;
            
            // await chrome.storage.local.set({
            //     [key]: {
            //         url: url,
            //         timestamp: timestamp,
            //         data: data
            //     }
            // });
            
            // 更new最newresult
            await chrome.storage.local.set({
                'latestResults': {
                    url: url,
                    timestamp: timestamp,
                    data: data
                }
            });
            
            //console.log('scanresultalready保存:', url);
        } catch (error) {
            console.error('保存resultfailed:', error);
        }
    }

    // execute脚本内容 - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 startexecuteJS脚本 (world: MAIN)...');
            
            // get当before活动标签page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法get当before标签page');
                return;
            }

            // recordexecute脚本内容（for调试）
            console.log('✅ 准备executeusercode，长度:', scriptContent.length);

            // use world: 'MAIN' in主世界execute脚本，绕throughCSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关键：in主世界execute，not受page面CSP限制
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP not会拦截扩展injection
                        eval(code);
                        return { success: true, message: '脚本executesuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS脚本executesuccess');
                alert('脚本executesuccess (world: MAIN)');
            } else {
                console.error('❌ JS脚本executefailed:', result?.error);
                alert('脚本executefailed: ' + (result?.error || '未知错误'));
            }

        } catch (error) {
            console.error('❌ 脚本injectionfailed:', error);
            alert('脚本injectionfailed: ' + error.message);
        }
    }

    // execute脚本内容 - 通throughbackground.jsusechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 startexecuteJS脚本 (通throughbackground.js)...');
            
            // get当before活动标签page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法get当before标签page');
                return;
            }

            // 通throughbackground.jsexecuteinjection
            const response = await chrome.runtime.sendMessage({
                action: 'executeJSInjection',
                tabId: tab.id,
                code: scriptContent
            });

            if (response?.success && response.data?.success) {
                console.log('✅ JS脚本executesuccess');
                alert('脚本executesuccess (world: MAIN)');
            } else {
                const errorMsg = response?.data?.error || response?.error || '未知错误';
                console.error('❌ JS脚本executefailed:', errorMsg);
                alert('脚本executefailed: ' + errorMsg);
            }

        } catch (error) {
            console.error('❌ 脚本injectionfailed:', error);
            alert('脚本injectionfailed: ' + error.message);
        }
    }
    
    async handleTabUpdate(tabId, url) {
        // 当page面loadcomplete时，可以execute一些background任务
        if (url.startsWith('http')) {
            //console.log('page面alreadyload:', url);
        }
    }
    
    // 清理旧data
    async cleanOldData() {
        try {
            const data = await chrome.storage.local.get();
            const keys = Object.keys(data);
            const resultKeys = keys.filter(key => key.startsWith('results_'));
            
            // 只keep最近50条record
            if (resultKeys.length > 50) {
                const sortedKeys = resultKeys.sort().slice(0, -50);
                await chrome.storage.local.remove(sortedKeys);
                //console.log('already清理旧data:', sortedKeys.length, '条');
            }
        } catch (error) {
            console.error('清理datafailed:', error);
        }
    }
}

// initializebackground脚本
new BackgroundSRCMiner();

// 定期清理data
setInterval(() => {
    new BackgroundSRCMiner().cleanOldData();
}, 24 * 60 * 60 * 1000); // 每24小时清理一次