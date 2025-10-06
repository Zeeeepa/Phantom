// injector.js - inpage面上下文inexecuteuser脚本injection器
// 这个文件会byinjectiontopage面in，绕throughCSP限制

(async () => {
    try {
        // listenfromcontent scriptmessage
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'PHANTOM_INJECT_SCRIPT') {
                const { scriptContent, scriptId } = event.data;
                
                try {
                    // useBlob URL方式injection脚本，绕throughCSP限制
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    const script = document.createElement('script');
                    script.src = url;
                    script.setAttribute('data-phantom-script', scriptId);
                    
                    script.onload = () => {
                        URL.revokeObjectURL(url);
                        // notifyinjectionsuccess
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: true,
                            message: '脚本injectionsuccess'
                        }, '*');
                    };
                    
                    script.onerror = () => {
                        URL.revokeObjectURL(url);
                        // notifyinjectionfailed
                        window.postMessage({
                            type: 'PHANTOM_SCRIPT_INJECTED',
                            scriptId: scriptId,
                            success: false,
                            message: '脚本loadfailed'
                        }, '*');
                    };
                    
                    // addtopage面
                    (document.head || document.documentElement).appendChild(script);
                    
                } catch (error) {
                    // notifyinjectionfailed
                    window.postMessage({
                        type: 'PHANTOM_SCRIPT_INJECTED',
                        scriptId: scriptId,
                        success: false,
                        message: error.message
                    }, '*');
                }
            }
        });
        
        // notifyinjectoralready准备就绪
        window.postMessage({
            type: 'PHANTOM_INJECTOR_READY'
        }, '*');
        
    } catch (error) {
        console.error('Phantom injector initialization failed:', error);
    }
})();