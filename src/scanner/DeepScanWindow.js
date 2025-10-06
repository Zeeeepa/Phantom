/**
 * 深度Scan窗口管理器 - 负责CreateAnd管理深度Scan窗口
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

    // Create深度Scan窗口
    async createDeepScanWindow(config) {
        //console.log('🔍 [DEBUG] StartCreate深度Scan窗口，Configuration:', config);
        
        let baseUrl = '';
        let sourceUrl = '';
        let pageTitle = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            //console.log('🔍 [DEBUG] Current标签页:', tab);
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
                sourceUrl = tab.url; // Complete的SourceURL
                pageTitle = tab.title || '';
                //console.log('🔍 [DEBUG] Parse得到baseUrl:', baseUrl);
                //console.log('🔍 [DEBUG] Parse得到sourceUrl:', sourceUrl);
            }
        } catch (error) {
            console.error('❌ [DEBUG] GetCurrentPageURLFailed:', error);
        }

        // PrepareScanConfigurationData
        const scanConfig = {
            maxDepth: config.maxDepth || 2,
            concurrency: config.concurrency || 8,
            timeout: config.timeout || 5000,
            scanJsFiles: config.scanJsFiles !== false,
            scanHtmlFiles: config.scanHtmlFiles !== false,
            scanApiFiles: config.scanApiFiles !== false,
            baseUrl: baseUrl,
            sourceUrl: sourceUrl, // AddComplete的SourceURL
            pageTitle: pageTitle, // AddPage标题
            initialResults: this.srcMiner.results || {},
            timestamp: Date.now()
        };

        //console.log('🔍 [DEBUG] PrepareSave的ScanConfiguration:', scanConfig);
        console.log('🔍 [DEBUG] 初始Result数量Statistics:', {
            absoluteApis: scanConfig.initialResults.absoluteApis?.length || 0,
            domains: scanConfig.initialResults.domains?.length || 0,
            emails: scanConfig.initialResults.emails?.length || 0,
            jsFiles: scanConfig.initialResults.jsFiles?.length || 0
        });

        // 将ConfigurationSave to IndexedDB，供Scan窗口Read
        try {
            //console.log('🔍 [DEBUG] StartSaveConfiguration到IndexedDB...');
            await window.IndexedDBManager.saveDeepScanState(baseUrl, scanConfig);
            //console.log('✅ [DEBUG] 深度ScanConfigurationAlreadySave to IndexedDB');
            
            // ValidateSave是否Success
            const verification = await window.IndexedDBManager.loadDeepScanState(baseUrl);
            //console.log('🔍 [DEBUG] ValidateSave results:', verification ? 'Success' : 'Failed');
            
        } catch (error) {
            console.error('❌ [DEBUG] Save深度ScanConfigurationFailed:', error);
            throw new Error('Save深度ScanConfigurationFailed: ' + error.message);
        }

        try {
            // 使用Extension的深度ScanPage
            const scanPageUrl = chrome.runtime.getURL('deep-scan-window.html');
            
            // 打开新窗口
            const newWindow = await chrome.windows.create({
                url: scanPageUrl,
                type: 'normal',
                width: 800,
                height: 900,
                focused: true
            });

            //console.log('深度Scan窗口AlreadyCreate:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('Create深度Scan窗口Failed:', error);
            throw error;
        }
    }

    // Start深度Scan（fromExtensionPage调用）
    async startDeepScan() {
        if (this.srcMiner.deepScanRunning) {
            //console.log('深度ScanAlready在运行中');
            return;
        }

        //console.log('Start深度Scan窗口...');

        // GetConfigurationParameter
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
            // MarkScanStart
            this.srcMiner.deepScanRunning = true;
            
            // UpdateUIStatus
            const deepScanBtn = document.getElementById('deepScanBtn');
            const configDiv = document.getElementById('deepScanConfig');
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '⏹️ Stop scanning';
                }
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            if (configDiv) {
                configDiv.style.display = 'none';
            }

            // Create深度Scan窗口
            await this.createDeepScanWindow(config);

        } catch (error) {
            console.error('❌ Start深度ScanFailed:', error);
            this.srcMiner.deepScanRunning = false;
            
            // 恢复UIStatus
            const deepScanBtn = document.getElementById('deepScanBtn');
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归Scan';
                }
                deepScanBtn.style.background = '';
            }
            
            throw error;
        }
    }

    // 停止深度Scan
    stopDeepScan() {
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;
        
        // NotifyScan窗口停止
        chrome.runtime.sendMessage({
            action: 'stopDeepScan'
        });

        // UpdateUIStatus
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归Scan';
            }
            deepScanBtn.style.background = '';
        }

        const configDiv = document.getElementById('deepScanConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
    }

    // Process来自Scan窗口的消息
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

    // Update主Page的Scan results
    updateMainPageResults(newResults) {
        if (!newResults) return;

        // 合AndResult到主Page
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.results[key]) {
                this.srcMiner.results[key] = [];
            }

            // 使用SetPerform去重
            const existingSet = new Set(this.srcMiner.results[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.results[key].push(item);
                }
            });
        });

        // 实时UpdateDisplay
        this.srcMiner.displayResults();
        this.srcMiner.saveResults();

        console.log('🔄 主PageResultAlreadyUpdate，CurrentResult数量:', 
            Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0));
    }

    // UpdateScan进度
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

    // ProcessScan completed
    handleScanComplete(finalResults) {
        //console.log('🎉 深度Scan completed！');
        
        // Update最终Result
        if (finalResults) {
            this.updateMainPageResults(finalResults);
        }

        // ResetStatus
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // UpdateUI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '✅ 深度Scan completed';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归Scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }

        // 隐藏进度条
        const progressDiv = document.getElementById('deepScanProgress');
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 5000);
        }

        // Save completedStatus到IndexedDB
        const completionState = {
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        };
        
        // GetCurrentPageURLUsed forSaveStatus
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const baseUrl = new URL(tabs[0].url).origin;
                IndexedDBManager.saveDeepScanState(baseUrl, completionState);
            }
        });
    }

    // ProcessScanError
    handleScanError(errorData) {
        console.error('❌ 深度Scan出错:', errorData);
        
        // ResetStatus
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // UpdateUI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '❌ ScanFailed';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归Scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }
    }
}