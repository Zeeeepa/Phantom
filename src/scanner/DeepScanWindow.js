/**
 * deep scan manager window - deep scan window and 负责创建管理
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

    // deep scan window 创建
    async createDeepScanWindow(config) {
        //console.log('🔍 [DEBUG] deep scan start window 创建，configuration:', config);
        
        let baseUrl = '';
        let sourceUrl = '';
        let pageTitle = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            //console.log('🔍 [DEBUG] tab current:', tab);
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
                sourceUrl = tab.url; // URL of 完整源
                pageTitle = tab.title || '';
                //console.log('🔍 [DEBUG] parse to 得baseUrl:', baseUrl);
                //console.log('🔍 [DEBUG] parse to 得sourceUrl:', sourceUrl);
            }
        } catch (error) {
            console.error('❌ [DEBUG] URL failed get page current:', error);
        }

        // scan configuration data 准备
        const scanConfig = {
            maxDepth: config.maxDepth || 2,
            concurrency: config.concurrency || 8,
            timeout: config.timeout || 5000,
            scanJsFiles: config.scanJsFiles !== false,
            scanHtmlFiles: config.scanHtmlFiles !== false,
            scanApiFiles: config.scanApiFiles !== false,
            baseUrl: baseUrl,
            sourceUrl: sourceUrl, // URL add of 完整源
            pageTitle: pageTitle, // add title page
            initialResults: this.srcMiner.results || {},
            timestamp: Date.now()
        };

        //console.log('🔍 [DEBUG] scan configuration save of 准备:', scanConfig);
        console.log('🔍 [DEBUG] statistics results quantity 初始:', {
            absoluteApis: scanConfig.initialResults.absoluteApis?.length || 0,
            domains: scanConfig.initialResults.domains?.length || 0,
            emails: scanConfig.initialResults.emails?.length || 0,
            jsFiles: scanConfig.initialResults.jsFiles?.length || 0
        });

        // save configuration to 将IndexedDB，scan window read 供
        try {
            //console.log('🔍 [DEBUG] save start configuration to IndexedDB...');
            await window.IndexedDBManager.saveDeepScanState(baseUrl, scanConfig);
            //console.log('✅ [DEBUG] deep scan saved configuration to IndexedDB');
            
            // success save validate no yes
            const verification = await window.IndexedDBManager.loadDeepScanState(baseUrl);
            //console.log('🔍 [DEBUG] save results validate:', verification ? 'success' : 'failed');
            
        } catch (error) {
            console.error('❌ [DEBUG] deep scan failed save configuration:', error);
            throw new Error('deep scan failed save configuration: ' + error.message);
        }

        try {
            // deep scan extension page use of
            const scanPageUrl = chrome.runtime.getURL('deep-scan-window.html');
            
            // open window 新
            const newWindow = await chrome.windows.create({
                url: scanPageUrl,
                type: 'normal',
                width: 800,
                height: 900,
                focused: true
            });

            //console.log('deep scan window 已创建:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('deep scan failed window 创建:', error);
            throw error;
        }
    }

    // deep scan start（extension call page from）
    async startDeepScan() {
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scan running 已在');
            return;
        }

        //console.log('deep scan window 启动...');

        // get configuration parameters
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
            // start scan marker
            this.srcMiner.deepScanRunning = true;
            
            // update status UI
            const deepScanBtn = document.getElementById('deepScanBtn');
            const configDiv = document.getElementById('deepScanConfig');
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '⏹️ stop scan';
                }
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            if (configDiv) {
                configDiv.style.display = 'none';
            }

            // deep scan window 创建
            await this.createDeepScanWindow(config);

        } catch (error) {
            console.error('❌ deep scan failed 启动:', error);
            this.srcMiner.deepScanRunning = false;
            
            // resume status UI
            const deepScanBtn = document.getElementById('deepScanBtn');
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'scan 深度递归';
                }
                deepScanBtn.style.background = '';
            }
            
            throw error;
        }
    }

    // deep scan stop
    stopDeepScan() {
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;
        
        // stop scan window 通知
        chrome.runtime.sendMessage({
            action: 'stopDeepScan'
        });

        // update status UI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = 'scan 深度递归';
            }
            deepScanBtn.style.background = '';
        }

        const configDiv = document.getElementById('deepScanConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
    }

    // scan process window of from 自消息
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

    // scan results update page of 主
    updateMainPageResults(newResults) {
        if (!newResults) return;

        // results page to 合并主
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.results[key]) {
                this.srcMiner.results[key] = [];
            }

            // use line(s) Set进去重
            const existingSet = new Set(this.srcMiner.results[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.results[key].push(item);
                }
            });
        });

        // update display when 实
        this.srcMiner.displayResults();
        this.srcMiner.saveResults();

        console.log('🔄 update results page 主已，results quantity current:', 
            Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0));
    }

    // scan progress update
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

    // scan complete process
    handleScanComplete(finalResults) {
        //console.log('🎉 deep scan complete！');
        
        // update results final
        if (finalResults) {
            this.updateMainPageResults(finalResults);
        }

        // reset status
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // update UI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '✅ deep scan complete';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'scan 深度递归';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }

        // hide record(s) 进度
        const progressDiv = document.getElementById('deepScanProgress');
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 5000);
        }

        // save complete status to IndexedDB
        const completionState = {
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        };
        
        // URL save get page current status for
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const baseUrl = new URL(tabs[0].url).origin;
                IndexedDBManager.saveDeepScanState(baseUrl, completionState);
            }
        });
    }

    // error scan process
    handleScanError(errorData) {
        console.error('❌ deep scan error occurred:', errorData);
        
        // reset status
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // update UI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '❌ scan failed';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = 'scan 深度递归';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }
    }
}