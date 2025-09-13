// 完成扫描函数的修改版本
async function completeScan() {
    //console.log('🔍 [DEBUG] completeScan函数被调用');
    
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('深度扫描完成！', 'success');
    
    // 最终保存完整结果到storage
    await saveResultsToStorage();
    
    // 检查DOM元素并更新UI状态
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    console.log('🔍 [DEBUG] completeScan DOM元素检查:', {
        startBtn: !!startBtn,
        pauseBtn: !!pauseBtn,
        stopBtn: !!stopBtn,
        headerTitle: !!headerTitle
    });
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停扫描';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    // 更新标题
    if (headerTitle) {
        headerTitle.textContent = '✅ 深度扫描完成';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`扫描完成！扫描了 ${totalScanned} 个文件，提取了 ${totalResults} 个项目，结果已保存到存储`, 'success');
    
    console.log('🔍 [DEBUG] 扫描完成统计:', {
        totalScanned,
        totalResults,
        scanResults: Object.keys(scanResults).map(key => `${key}: ${scanResults[key]?.length || 0}`)
    });
    
    // 可选：通知主扩展扫描完成（用于实时更新，但不依赖消息传递）
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
        //console.log('通知主扩展失败（可能已关闭），但结果已保存到storage:', error);
    }
}