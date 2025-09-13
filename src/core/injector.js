// injector.js - 在页面上下文中执行的用户脚本注入器
// 这个文件会被注入到页面中，绕过CSP限制

(async () => {
    try {
        // 监听来自content script的消息
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'PHANTOM_INJECT_SCRIPT') {
                const { scriptContent, scriptId } = event.data;
                
                try {
                    // 使用Blob URL方式注入脚本，绕过CSP限制
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-phantom-script', scriptId);
                    
                    script.onload = () => {
                        URL.revokeObjectURL(url);
                        // 通知注入成功
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: true,
                            message: '脚本注入成功'
                        }, '*');
                    };
                    
                    script.onerror = () => {
                        URL.revokeObjectURL(url);
                        // 通知注入失败
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: false,
                            message: '脚本加载失败'
                        }, '*');
                    };
                    
                    // 添加到页面
                    (document.head || document.documentElement).appendChild(script);
                    
                } catch (error) {
                    // 通知注入失败
                    window.postMessage({
                        type: 'PHANTOM_SCRIPT_INJECTED',
                        scriptId: scriptId,
                        success: false,
                        message: error.message
                    }, '*');
                }
            }
        });
        
        // 通知injector已准备就绪
        window.postMessage({
            type: 'PHANTOM_INJECTOR_READY'
        }, '*');
        
    } catch (error) {
        console.error('Phantom injector initialization failed:', error);
    }
})();