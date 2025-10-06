// 离屏文档Script - Used forProcessNeedCompleteWeb API的NetworkRequest

//console.log('🔧 离屏文档Loaded');

// Listen来自After台Script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    //console.log('🔧 离屏文档收到消息:', request.action);
    
    if (request.action === 'makeRequestWithCookie') {
        handleRequestWithCustomHeaders(request.url, request.options, request.customHeaders)
            .then(response => {
                //console.log('🔧 离屏文档RequestComplete:', response.status);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('🔧 离屏文档RequestFailed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    }
});

// 在离屏文档中Process带CustomRequest header的Request
async function handleRequestWithCustomHeaders(url, options = {}, customHeaders = []) {
    try {
        //console.log(`📋 离屏文档SendRequest: ${url}`);
        //console.log(`📋 使用CustomRequest header:`, customHeaders);
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,*/*',
                'Cache-Control': 'no-cache',
                ...options.headers
            },
            credentials: 'include', // 重要：包含Cookie
            ...options
        };
        
        // 应用CustomRequest header
        if (customHeaders && customHeaders.length > 0) {
            for (const header of customHeaders) {
                if (header.key && header.value) {
                    fetchOptions.headers[header.key] = header.value;
                    //console.log(`📋 AlreadySettingsRequest header: ${header.key} = ${header.value.substring(0, 50)}${header.value.length > 50 ? '...' : ''}`);
                    
                    // 如果是CookieRequest header，尝试Throughdocument.cookieSettings（如果是同域Request）
                    if (header.key.toLowerCase() === 'cookie') {
                        try {
                            const urlObj = new URL(url);
                            if (urlObj.origin === window.location.origin) {
                                // ParseCookie字符串AndSettings到document.cookie
                                const cookies = header.value.split(';').map(c => c.trim());
                                for (const cookie of cookies) {
                                    if (cookie) {
                                        document.cookie = cookie;
                                        //console.log(`🍪 AlreadySettingsdocument.cookie: ${cookie.substring(0, 30)}...`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('🍪 None法Settingsdocument.cookie:', e.message);
                        }
                    }
                }
            }
        }
        
        //console.log(`📋 离屏文档最终Request header:`, fetchOptions.headers);
        
        // Add超时控制
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // 使用 clone Read原始字节长度，更准确Statistics响应大小
        let sizeBytes = 0;
        try {
            const respClone = response.clone();
            const buf = await respClone.arrayBuffer();
            sizeBytes = buf.byteLength;
        } catch (e) {
            sizeBytes = 0;
        }
        const text = await response.text();
        
        //console.log(`✅ 离屏文档RequestComplete: ${response.status} ${response.statusText}`);
        
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
            throw new Error(`Request超时 (${options.timeout || 10000}ms)`);
        }
        console.error(`❌ 离屏文档RequestFailed: ${error.message}`);
        throw error;
    }
}