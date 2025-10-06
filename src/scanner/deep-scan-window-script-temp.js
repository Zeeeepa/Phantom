// completescan函数修改version
async function completeScan() {
    //console.log('🔍 [DEBUG] completeScan函数by调for');
    
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('deepscan complete！', 'success');
    
    // 最终保存completeresulttostorage
    await saveResultsToStorage();
    
    // checkDOM元素and更newUIstate
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    console.log('🔍 [DEBUG] completeScan DOM元素check:', {
        startBtn: !!startBtn,
        pauseBtn: !!pauseBtn,
        stopBtn: !!stopBtn,
        headerTitle: !!headerTitle
    });
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停scan';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    // 更new标题
    if (headerTitle) {
        headerTitle.textContent = '✅ deepscan complete';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`scan complete！scan了 ${totalScanned} 个文件，extract了 ${totalResults} 个项目，resultalready保存tostorage`, 'success');
    
    console.log('🔍 [DEBUG] scan complete统计:', {
        totalScanned,
        totalResults,
        scanResults: Object.keys(scanResults).map(key => `${key}: ${scanResults[key]?.length || 0}`)
    });
    
    // 可选：notify主扩展scan complete（for实时更new，butnot依赖message传递）
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
        //console.log('notify主扩展failed（可能already关闭），butresultalready保存tostorage:', error);
    }
}