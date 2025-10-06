// CompleteScanFunction的修改版本
async function completeScan() {
    //console.log('🔍 [DEBUG] completeScanFunctionBy调用');
    
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('深度Scan completed！', 'success');
    
    // 最终SaveCompleteResult到storage
    await saveResultsToStorage();
    
    // CheckDOMElementAndUpdateUIStatus
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    console.log('🔍 [DEBUG] completeScan DOMElementCheck:', {
        startBtn: !!startBtn,
        pauseBtn: !!pauseBtn,
        stopBtn: !!stopBtn,
        headerTitle: !!headerTitle
    });
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停Scan';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    // Update标题
    if (headerTitle) {
        headerTitle.textContent = '✅ 深度Scan completed';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`Scan completed！Scan了 ${totalScanned} 个File，Extract了 ${totalResults} 个Project，ResultSaved到存储`, 'success');
    
    console.log('🔍 [DEBUG] Scan completedStatistics:', {
        totalScanned,
        totalResults,
        scanResults: Object.keys(scanResults).map(key => `${key}: ${scanResults[key]?.length || 0}`)
    });
    
    // 可选：Notify主ExtensionScan completed（Used for实时Update，但不依赖消息传递）
    try {
        chrome.runtime.sendMessage({
            action: 'deepScanCompleted',
            summary: {
                totalScanned,
                totalResults,
                scanDepth: currentDepth
            }
        });
    } catch (error) {
        //console.log('Notify主ExtensionFailed（可能AlreadyClose），但ResultSaved到storage:', error);
    }
}