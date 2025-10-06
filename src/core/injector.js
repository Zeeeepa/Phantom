// injector.js - 在Page上下文中Execute的UserScript注入器
// ThisFile会By注入到Page中，绕过CSP限制

(async () => {
    try {
        // Listen来自content script的消息
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'PHANTOM_INJECT_SCRIPT') {
                const { scriptContent, scriptId } = event.data;
                
                try {
                    // 使用Blob URL方式注入Script，绕过CSP限制
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-phantom-script', scriptId);
                    
                    script.onload = () => {
                        URL.revokeObjectURL(url);
                        // Notify注入Success
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: true,
                            message: 'Script注入Success'
                        }, '*');
                    };
                    
                    script.onerror = () => {
                        URL.revokeObjectURL(url);
                        // Notify注入Failed
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: false,
                            message: 'ScriptLoadFailed'
                        }, '*');
                    };
                    
                    // Add到Page
                    (document.head || document.documentElement).appendChild(script);
                    
                } catch (error) {
                    // Notify注入Failed
                    window.postMessage({
                        type: 'PHANTOM_SCRIPT_INJECTED',
                        scriptId: scriptId,
                        success: false,
                        message: error.message
                    }, '*');
                }
            }
        });
        
        // NotifyinjectorAlreadyPrepare就绪
        window.postMessage({
            type: 'PHANTOM_INJECTOR_READY'
        }, '*');
        
    } catch (error) {
        console.error('Phantom injector initialization failed:', error);
    }
})();