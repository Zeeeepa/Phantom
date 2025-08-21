// 离屏文档脚本 - 用于处理需要完整Web API的网络请求

console.log('🔧 离屏文档已加载');

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🔧 离屏文档收到消息:', request.action);
    
    if (request.action === 'makeRequestWithCookie') {
        handleRequestWithCookie(request.url, request.options, request.cookieSetting)
            .then(response => {
                console.log('🔧 离屏文档请求完成:', response.status);
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('🔧 离屏文档请求失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    }
});

// 在离屏文档中处理带Cookie的请求
async function handleRequestWithCookie(url, options = {}, cookieSetting = '') {
    try {
        console.log(`🍪 离屏文档发送请求: ${url}`);
        console.log(`🍪 使用Cookie: ${cookieSetting ? cookieSetting.substring(0, 50) + '...' : '无'}`);
        
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
        
        // 在离屏文档中设置Cookie
        if (cookieSetting && cookieSetting.trim()) {
            // 方法1: 直接设置请求头
            fetchOptions.headers['Cookie'] = cookieSetting.trim();
            console.log(`🍪 已设置Cookie请求头: ${cookieSetting.trim().substring(0, 50)}...`);
            
            // 方法2: 尝试通过document.cookie设置（如果是同域请求）
            try {
                const urlObj = new URL(url);
                if (urlObj.origin === window.location.origin) {
                    // 解析Cookie字符串并设置到document.cookie
                    const cookies = cookieSetting.split(';').map(c => c.trim());
                    for (const cookie of cookies) {
                        if (cookie) {
                            document.cookie = cookie;
                            console.log(`🍪 已设置document.cookie: ${cookie.substring(0, 30)}...`);
                        }
                    }
                }
            } catch (e) {
                console.warn('🍪 无法设置document.cookie:', e.message);
            }
        }
        
        console.log(`🌐 离屏文档请求头:`, fetchOptions.headers);
        
        // 添加超时控制
        const timeout = options.timeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // 使用 clone 读取原始字节长度，更准确统计响应大小
        let sizeBytes = 0;
        try {
            const respClone = response.clone();
            const buf = await respClone.arrayBuffer();
            sizeBytes = buf.byteLength;
        } catch (e) {
            sizeBytes = 0;
        }
        const text = await response.text();
        
        console.log(`✅ 离屏文档请求完成: ${response.status} ${response.statusText}`);
        
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
            throw new Error(`请求超时 (${options.timeout || 10000}ms)`);
        }
        console.error(`❌ 离屏文档请求失败: ${error.message}`);
        throw error;
    }
}