/**
 * deep scan窗口管理器 - 负责createand管理deep scan窗口
 */
class DeepScanWindow {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        this.scanData = null;
        this.scanResults = {};
        this.isScanRunning = false;
        this.isPaused = false;
        this.currentDepth = 0;
        this.scannedUrls = new Set();
        this.pendingUrls = new Set();
        this.maxDepth = 2;
        this.concurrency = 8;
        this.timeout = 5000;
    }

    // createdeep scan窗口
    async createDeepScanWindow(config) {
        //console.log('🔍 [DEBUG] startcreatedeep scan窗口，configuration:', config);
        
        let baseUrl = '';
        let sourceUrl = '';
        let pageTitle = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            //console.log('🔍 [DEBUG] 当before标签page:', tab);
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
                sourceUrl = tab.url; // complete源URL
                pageTitle = tab.title || '';
                //console.log('🔍 [DEBUG] 解析得tobaseUrl:', baseUrl);
                //console.log('🔍 [DEBUG] 解析得tosourceUrl:', sourceUrl);
            }
        } catch (error) {
            console.error('❌ [DEBUG] get当beforepage面URLfailed:', error);
        }

        // 准备scanconfigurationdata
        const scanConfig = {
            maxDepth: config.maxDepth || 2,
            concurrency: config.concurrency || 8,
            timeout: config.timeout || 5000,
            scanJsFiles: config.scanJsFiles !== false,
            scanHtmlFiles: config.scanHtmlFiles !== false,
            scanApiFiles: config.scanApiFiles !== false,
            baseUrl: baseUrl,
            sourceUrl: sourceUrl, // addcomplete源URL
            pageTitle: pageTitle, // addpage面标题
            initialResults: this.srcMiner.results || {},
            timestamp: Date.now()
        };

        //console.log('🔍 [DEBUG] 准备保存scanconfiguration:', scanConfig);
        console.log('🔍 [DEBUG] initialresult数量统计:', {
            absoluteApis: scanConfig.initialResults.absoluteApis?.length || 0,
            domains: scanConfig.initialResults.domains?.length || 0,
            emails: scanConfig.initialResults.emails?.length || 0,
            jsFiles: scanConfig.initialResults.jsFiles?.length || 0
        });

        // 将configuration保存toIndexedDB，供scan窗口read
        try {
            //console.log('🔍 [DEBUG] start保存configurationtoIndexedDB...');
            await window.IndexedDBManager.saveDeepScanState(baseUrl, scanConfig);
            //console.log('✅ [DEBUG] deep scanconfigurationalready保存toIndexedDB');
            
            // validation保存是否success
            const verification = await window.IndexedDBManager.loadDeepScanState(baseUrl);
            //console.log('🔍 [DEBUG] validation保存result:', verification ? 'success' : 'failed');
            
        } catch (error) {
            console.error('❌ [DEBUG] 保存deep scanconfigurationfailed:', error);
            throw new Error('保存deep scanconfigurationfailed: ' + error.message);
        }

        try {
            // use扩展deep scanpage面
            const scanPageUrl = chrome.runtime.getURL('deep-scan-window.html');
            
            // opennew窗口
            const newWindow = await chrome.windows.create({
                url: scanPageUrl,
                type: 'normal',
                width: 800,
                height: 900,
                focused: true
            });

            //console.log('deep scan窗口alreadycreate:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('createdeep scan窗口failed:', error);
            throw error;
        }
    }

    // startdeep scan（from扩展page面调for）
    async startDeepScan() {
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scanalreadyin运行in');
            return;
        }

        //console.log('startdeep scan窗口...');

        // getconfigurationparameter
        const maxDepthInput = document.getElementById('maxDepth');
        const concurrencyInput = document.getElementById('concurrency');
        const timeoutInput = document.getElementById('timeout');
        const scanJsFilesInput = document.getElementById('scanJsFiles');
        const scanHtmlFilesInput = document.getElementById('scanHtmlFiles');
        const scanApiFilesInput = document.getElementById('scanApiFiles');

        const config = {
            maxDepth: parseInt(maxDepthInput?.value) || 2,
            concurrency: parseInt(concurrencyInput?.value) || 8,
            timeout: parseInt(timeoutInput?.value) || 5,
            scanJsFiles: scanJsFilesInput ? scanJsFilesInput.checked : true,
            scanHtmlFiles: scanHtmlFilesInput ? scanHtmlFilesInput.checked : true,
            scanApiFiles: scanApiFilesInput ? scanApiFilesInput.checked : true
        };

        try {
            // 标记scanstart
            this.srcMiner.deepScanRunning = true;
            
            // 更newUIstate
            const deepScanBtn = document.getElementById('deepScanBtn');
            const configDiv = document.getElementById('deepScanConfig');
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '⏹️ 停止scan';
                }
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            if (configDiv) {
                configDiv.style.display = 'none';
            }

            // createdeep scan窗口
            await this.createDeepScanWindow(config);

        } catch (error) {
            console.error('❌ startdeep scanfailed:', error);
            this.srcMiner.deepScanRunning = false;
            
            // 恢复UIstate
            const deepScanBtn = document.getElementById('deepScanBtn');
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'deep递归scan';
                }
                deepScanBtn.style.background = '';
            }
            
            throw error;
        }
    }

    // 停止deep scan
    stopDeepScan() {
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;
        
        // notifyscan窗口停止
        chrome.runtime.sendMessage({
            action: 'stopDeepScan'
        });

        // 更newUIstate
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'deep递归scan';
            }
            deepScanBtn.style.background = '';
        }

        const configDiv = document.getElementById('deepScanConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
    }

    // 处理fromscan窗口message
    handleScanWindowMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'updateScanResults':
                this.updateMainPageResults(message.data);
                sendResponse({ success: true });
                break;
                
            case 'scanProgress':
                this.updateScanProgress(message.data);
                sendResponse({ success: true });
                break;
                
            case 'scanComplete':
                this.handleScanComplete(message.data);
                sendResponse({ success: true });
                break;
                
            case 'scanError':
                this.handleScanError(message.data);
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    // 更new主page面scanresult
    updateMainPageResults(newResults) {
        if (!newResults) return;

        // 合andresultto主page面
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.results[key]) {
                this.srcMiner.results[key] = [];
            }

            // useSet进行去重
            const existingSet = new Set(this.srcMiner.results[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.results[key].push(item);
                }
            });
        });

        // 实时更new显示
        this.srcMiner.displayResults();
        this.srcMiner.saveResults();

        console.log('🔄 主page面resultalready更new，当beforeresult数量:', 
            Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0));
    }

    // 更newscanprogress
    updateScanProgress(progressData) {
        const progressDiv = document.getElementById('deepScanProgress');
        if (progressDiv && progressData) {
            progressDiv.style.display = 'block';
            
            const progressText = document.getElementById('progressText');
            const progressBar = document.getElementById('progressBar');
            
            if (progressText) {
                progressText.textContent = `${progressData.stage}: ${progressData.current}/${progressData.total} (${progressData.percentage}%)`;
            }
            
            if (progressBar) {
                progressBar.style.width = `${progressData.percentage}%`;
            }
        }
    }

    // 处理scan complete
    handleScanComplete(finalResults) {
        //console.log('🎉 deepscan complete！');
        
        // 更new最终result
        if (finalResults) {
            this.updateMainPageResults(finalResults);
        }

        // 重置state
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // 更newUI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '✅ deepscan complete';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'deep递归scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }

        // 隐藏progress条
        const progressDiv = document.getElementById('deepScanProgress');
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 5000);
        }

        // 保存completestatetoIndexedDB
        const completionState = {
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        };
        
        // get当beforepage面URLfor保存state
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const baseUrl = new URL(tabs[0].url).origin;
                IndexedDBManager.saveDeepScanState(baseUrl, completionState);
            }
        });
    }

    // 处理scan错误
    handleScanError(errorData) {
        console.error('❌ deep scan出错:', errorData);
        
        // 重置state
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // 更newUI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '❌ scanfailed';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'deep递归scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }
    }
}