// injector.js - in page 上下文in execute   user script inject 器
// 这个 file 会passive marker inject 到 page in，绕throughCSP limit

(async () => {
    try {
        // listenfromcontent script  message
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'PHANTOM_INJECT_SCRIPT') {
                const { scriptContent, scriptId } = event.data;
                
                try {
                    // useBlob URL方式 inject script，绕throughCSP limit
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-phantom-script', scriptId);
                    
                    script.onload = () => {
                        URL.revokeObjectURL(url);
                        // notification inject success
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: true,
                            message: 'script inject success'
                        }, '*');
                    };
                    
                    script.onerror = () => {
                        URL.revokeObjectURL(url);
                        // notification inject failed
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: false,
                            message: 'script load failed'
                        }, '*');
                    };
                    
                    // add 到 page
                    (document.head || document.documentElement).appendChild(script);
                    
                } catch (error) {
                    // notification inject failed
                    window.postMessage({
                        type: 'PHANTOM_SCRIPT_INJECTED',
                        scriptId: scriptId,
                        success: false,
                        message: error.message
                    }, '*');
                }
            }
        });
        
        // notification injectoralready准备就绪
        window.postMessage({
            type: 'PHANTOM_INJECTOR_READY'
        }, '*');
        
    } catch (error) {
        console.error('Phantom injector initialization failed:', error);
    }
})();