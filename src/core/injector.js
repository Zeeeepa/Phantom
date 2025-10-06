// injector.js - inject script execute user page in of 在上下文器
// file inject page item(s) to in 这会被，limit 绕过CSP

(async () => {
    try {
        // listen from 自content of script消息
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'PHANTOM_INJECT_SCRIPT') {
                const { scriptContent, scriptId } = event.data;
                
                try {
                    // use Blob URL inject script 方式，limit 绕过CSP
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-phantom-script', scriptId);
                    
                    script.onload = () => {
                        URL.revokeObjectURL(url);
                        // success inject 通知
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: true,
                            message: 'success inject script'
                        }, '*');
                    };
                    
                    script.onerror = () => {
                        URL.revokeObjectURL(url);
                        // failed inject 通知
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: false,
                            message: 'failed to load script'
                        }, '*');
                    };
                    
                    // add page to
                    (document.head || document.documentElement).appendChild(script);
                    
                } catch (error) {
                    // failed inject 通知
                    window.postMessage({
                        type: 'PHANTOM_SCRIPT_INJECTED',
                        scriptId: scriptId,
                        success: false,
                        message: error.message
                    }, '*');
                }
            }
        });
        
        // ready 通知injector已准备
        window.postMessage({
            type: 'PHANTOM_INJECTOR_READY'
        }, '*');
        
    } catch (error) {
        console.error('Phantom injector initialization failed:', error);
    }
})();