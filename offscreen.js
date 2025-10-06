// offscreen documentation script - for process requirecompleteWeb API network request

//console.log('🔧 offscreen documentation already load');

// listenfrombackground script   message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //console.log('🔧 offscreen documentation received message:', request.action);
    
    if (request.action === 'makeRequestWithCookie') {
        handleRequestWithCustomHeaders(request.url, request.options, request.customHeaders)
            .then(response => {
                //console.log('🔧 offscreen documentation request complete:', response.status);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('🔧 offscreen documentation request failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持 message 通道开放
    }
});

// inoffscreen documentation in process 带 custom request 头  request
async function handleRequestWithCustomHeaders(url, options = {}, customHeaders = []) {
    try {
        //console.log(`📋 offscreen documentation 发送 request: ${url}`);
        //console.log(`📋 use custom request 头:`, customHeaders);
        
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
        
        // 应用 custom request 头
        if (customHeaders && customHeaders.length > 0) {
            for (const header of customHeaders) {
                if (header.key && header.value) {
                    fetchOptions.headers[header.key] = header.value;
                    //console.log(`📋 already settings request 头: ${header.key} = ${header.value.substring(0, 50)}${header.value.length > 50 ? '...' : ''}`);
                    
                    // 如果是Cookie request 头，尝试通throughdocument.cookie settings（如果是同域 request）
                    if (header.key.toLowerCase() === 'cookie') {
                        try {
                            const urlObj = new URL(url);
                            if (urlObj.origin === window.location.origin) {
                                // 解析Cookie string 并 settings 到document.cookie
                                const cookies = header.value.split(';').map(c => c.trim());
                                for (const cookie of cookies) {
                                    if (cookie) {
                                        document.cookie = cookie;
                                        //console.log(`🍪 already settings document.cookie: ${cookie.substring(0, 30)}...`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('🍪 无法 settings document.cookie:', e.message);
                        }
                    }
                }
            }
        }
        
        //console.log(`📋 offscreen documentation 最终 request 头:`, fetchOptions.headers);
        
        // add timeout 控制
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // use clone read原始字节 length，更准确 statistics response size
        let sizeBytes = 0;
        try {
            const respClone = response.clone();
            const buf = await respClone.arrayBuffer();
            sizeBytes = buf.byteLength;
        } catch (e) {
            sizeBytes = 0;
        }
        const text = await response.text();
        
        //console.log(`✅ offscreen documentation request complete: ${response.status} ${response.statusText}`);
        
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
        console.error(`❌ offscreen documentation request failed: ${error.message}`);
        throw error;
    }
}