// complete scan function   modify version
async function completeScan() {
    //console.log('🔍 [DEBUG] completeScan function passive marker调用');
    
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('deep scan complete！', 'success');
    
    // 最终 save complete result 到storage
    await saveResultsToStorage();
    
    // check DOM元素并 update UI status
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    console.log('🔍 [DEBUG] completeScan DOM元素 check:', {
        startBtn: !!startBtn,
        pauseBtn: !!pauseBtn,
        stopBtn: !!stopBtn,
        headerTitle: !!headerTitle
    });
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停 scan';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    // update 标题
    if (headerTitle) {
        headerTitle.textContent = '✅ deep scan complete';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`scan complete！scan 了 ${totalScanned} 个 file，extract 了 ${totalResults} 个项目，result already save 到 storage`, 'success');
    
    console.log('🔍 [DEBUG] scan complete statistics:', {
        totalScanned,
        totalResults,
        scanResults: Object.keys(scanResults).map(key => `${key}: ${scanResults[key]?.length || 0}`)
    });
    
    // optional：notification 主 extension scan complete（for实时 update，但do not dependency message 传递）
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
        //console.log('notification 主 extension failed（可能already close），但 result already save 到storage:', error);
    }
}