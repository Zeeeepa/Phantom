// complete scan function version of 修改
async function completeScan() {
    //console.log('🔍 [DEBUG] call function completeScan被');
    
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('deep scan complete！', 'success');
    
    // save results final to 完整storage
    await saveResultsToStorage();
    
    // update check element status DOM并UI
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    console.log('🔍 [DEBUG] completeScan check element DOM:', {
        startBtn: !!startBtn,
        pauseBtn: !!pauseBtn,
        stopBtn: !!stopBtn,
        headerTitle: !!headerTitle
    });
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'pause scan';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    // update title
    if (headerTitle) {
        headerTitle.textContent = '✅ deep scan complete';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`scan complete！scan 了 ${totalScanned} file item(s)，extracted 了 ${totalResults} project item(s)，saved results to 存储`, 'success');
    
    console.log('🔍 [DEBUG] scan complete statistics:', {
        totalScanned,
        totalResults,
        scanResults: Object.keys(scanResults).map(key => `${key}: ${scanResults[key]?.length || 0}`)
    });
    
    // 可选：scan complete extension 通知主（update for when 实，但不依赖消息传递）
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
        //console.log('failed extension 通知主（closed 可能），saved results to 但storage:', error);
    }
}