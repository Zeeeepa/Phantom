// offscreendocument脚本 - for处理requirecompleteWeb APInetworkrequest

//console.log('🔧 offscreendocumentalreadyload');

// listenfrombackground脚本message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //console.log('🔧 offscreendocumentreceivedmessage:', request.action);
    
    if (request.action === 'makeRequestWithCookie') {
        handleRequestWithCustomHeaders(request.url, request.options, request.customHeaders)
            .then(response => {
                //console.log('🔧 offscreendocumentrequestcomplete:', response.status);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('🔧 offscreendocumentrequestfailed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // keepmessagechannelopen
    }
});

// inoffscreendocumentin处理带customrequest头request
async function handleRequestWithCustomHeaders(url, options = {}, customHeaders = []) {
    try {
        //console.log(`📋 offscreendocumentsendrequest: ${url}`);
        //console.log(`📋 usecustomrequest头:`, customHeaders);
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,*/*',
                'Cache-Control': 'no-cache',
                ...options.headers
            },
            credentials: 'include', // 重要：containsCookie
            ...options
        };
        
        // 应forcustomrequest头
        if (customHeaders && customHeaders.length > 0) {
            for (const header of customHeaders) {
                if (header.key && header.value) {
                    fetchOptions.headers[header.key] = header.value;
                    //console.log(`📋 alreadysettingsrequest头: ${header.key} = ${header.value.substring(0, 50)}${header.value.length > 50 ? '...' : ''}`);
                    
                    // if是Cookierequest头，尝试通throughdocument.cookiesettings（if是同域request）
                    if (header.key.toLowerCase() === 'cookie') {
                        try {
                            const urlObj = new URL(url);
                            if (urlObj.origin === window.location.origin) {
                                // 解析Cookie字符串andsettingstodocument.cookie
                                const cookies = header.value.split(';').map(c => c.trim());
                                for (const cookie of cookies) {
                                    if (cookie) {
                                        document.cookie = cookie;
                                        //console.log(`🍪 alreadysettingsdocument.cookie: ${cookie.substring(0, 30)}...`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('🍪 无法settingsdocument.cookie:', e.message);
                        }
                    }
                }
            }
        }
        
        //console.log(`📋 offscreendocument最终request头:`, fetchOptions.headers);
        
        // add超时控制
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // use clone read原始字节长度，更准确统计响应大小
        let sizeBytes = 0;
        try {
            const respClone = response.clone();
            const buf = await respClone.arrayBuffer();
            sizeBytes = buf.byteLength;
        } catch (e) {
            sizeBytes = 0;
        }
        const text = await response.text();
        
        //console.log(`✅ offscreendocumentrequestcomplete: ${response.status} ${response.statusText}`);
        
        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            text: text,
            url: response.url,
            sizeBytes: sizeBytes
        };
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`request超时 (${options.timeout || 10000}ms)`);
        }
        console.error(`❌ offscreendocumentrequestfailed: ${error.message}`);
        throw error;
    }
}