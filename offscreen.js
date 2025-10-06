// documentation script 离屏 - process for 需要完整Web API request network of

//console.log('🔧 documentation load 离屏已');

// script listen background of from 自消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //console.log('🔧 documentation to 离屏收消息:', request.action);
    
    if (request.action === 'makeRequestWithCookie') {
        handleRequestWithCustomHeaders(request.url, request.options, request.customHeaders)
            .then(response => {
                //console.log('🔧 complete documentation request 离屏:', response.status);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('🔧 failed documentation request 离屏:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // on 保持消息通道放
    }
});

// custom documentation process request request in of with 在离屏头
async function handleRequestWithCustomHeaders(url, options = {}, customHeaders = []) {
    try {
        //console.log(`📋 documentation request send 离屏: ${url}`);
        //console.log(`📋 custom request use 头:`, customHeaders);
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,*/*',
                'Cache-Control': 'no-cache',
                ...options.headers
            },
            credentials: 'include', // 重要：contains Cookie
            ...options
        };
        
        // custom request 应用头
        if (customHeaders && customHeaders.length > 0) {
            for (const header of customHeaders) {
                if (header.key && header.value) {
                    fetchOptions.headers[header.key] = header.value;
                    //console.log(`📋 settings request 已头: ${header.key} = ${header.value.substring(0, 50)}${header.value.length > 50 ? '...' : ''}`);
                    
                    // request if yes Cookie头，settings via 尝试document.cookie（request if yes 同域）
                    if (header.key.toLowerCase() === 'cookie') {
                        try {
                            const urlObj = new URL(url);
                            if (urlObj.origin === window.location.origin) {
                                // parse settings characters to Cookie串并document.cookie
                                const cookies = header.value.split(';').map(c => c.trim());
                                for (const cookie of cookies) {
                                    if (cookie) {
                                        document.cookie = cookie;
                                        //console.log(`🍪 settings 已document.cookie: ${cookie.substring(0, 30)}...`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('🍪 settings 无法document.cookie:', e.message);
                        }
                    }
                }
            }
        }
        
        //console.log(`📋 documentation request final 离屏头:`, fetchOptions.headers);
        
        // add timeout 控制
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // use clone original length read 字节，statistics response 更准确大小
        let sizeBytes = 0;
        try {
            const respClone = response.clone();
            const buf = await respClone.arrayBuffer();
            sizeBytes = buf.byteLength;
        } catch (e) {
            sizeBytes = 0;
        }
        const text = await response.text();
        
        //console.log(`✅ complete documentation request 离屏: ${response.status} ${response.statusText}`);
        
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
            throw new Error(`request timeout (${options.timeout || 10000}ms)`);
        }
        console.error(`❌ failed documentation request 离屏: ${error.message}`);
        throw error;
    }
}