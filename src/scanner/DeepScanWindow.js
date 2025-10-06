/**
 * deep scan window manage 器 - 负责创建and manage deep scan window
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

    // 创建 deep scan window
    async createDeepScanWindow(config) {
        //console.log('🔍 [DEBUG] start 创建 deep scan window，configuration:', config);
        
        let baseUrl = '';
        let sourceUrl = '';
        let pageTitle = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            //console.log('🔍 [DEBUG] current tab 页:', tab);
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
                sourceUrl = tab.url; // complete 源URL
                pageTitle = tab.title || '';
                //console.log('🔍 [DEBUG] 解析得到baseUrl:', baseUrl);
                //console.log('🔍 [DEBUG] 解析得到sourceUrl:', sourceUrl);
            }
        } catch (error) {
            console.error('❌ [DEBUG] 获取 current page URL failed:', error);
        }

        // 准备 scan configuration data
        const scanConfig = {
            maxDepth: config.maxDepth || 2,
            concurrency: config.concurrency || 8,
            timeout: config.timeout || 5000,
            scanJsFiles: config.scanJsFiles !== false,
            scanHtmlFiles: config.scanHtmlFiles !== false,
            scanApiFiles: config.scanApiFiles !== false,
            baseUrl: baseUrl,
            sourceUrl: sourceUrl, // add complete 源URL
            pageTitle: pageTitle, // add page 标题
            initialResults: this.srcMiner.results || {},
            timestamp: Date.now()
        };

        //console.log('🔍 [DEBUG] 准备 save   scan configuration:', scanConfig);
        console.log('🔍 [DEBUG] 初始 result count statistics:', {
            absoluteApis: scanConfig.initialResults.absoluteApis?.length || 0,
            domains: scanConfig.initialResults.domains?.length || 0,
            emails: scanConfig.initialResults.emails?.length || 0,
            jsFiles: scanConfig.initialResults.jsFiles?.length || 0
        });

        // 将 configuration save 到IndexedDB，供 scan window read
        try {
            //console.log('🔍 [DEBUG] start save configuration 到IndexedDB...');
            await window.IndexedDBManager.saveDeepScanState(baseUrl, scanConfig);
            //console.log('✅ [DEBUG] deep scan configuration already save 到IndexedDB');
            
            // validate save 是否 success
            const verification = await window.IndexedDBManager.loadDeepScanState(baseUrl);
            //console.log('🔍 [DEBUG] validate save result:', verification ? 'success' : 'failed');
            
        } catch (error) {
            console.error('❌ [DEBUG] save deep scan configuration failed:', error);
            throw new Error('save deep scan configuration failed: ' + error.message);
        }

        try {
            // use extension   deep scan page
            const scanPageUrl = chrome.runtime.getURL('deep-scan-window.html');
            
            // open 新 window
            const newWindow = await chrome.windows.create({
                url: scanPageUrl,
                type: 'normal',
                width: 800,
                height: 900,
                focused: true
            });

            //console.log('deep scan window already创建:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('创建 deep scan window failed:', error);
            throw error;
        }
    }

    // start deep scan（from extension page 调用）
    async startDeepScan() {
        if (this.srcMiner.deepScanRunning) {
            //console.log('deep scan alreadyin运行in');
            return;
        }

        //console.log('启动 deep scan window ...');

        // 获取 configuration parameter
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
            // 标记 scan start
            this.srcMiner.deepScanRunning = true;
            
            // update UI status
            const deepScanBtn = document.getElementById('deepScanBtn');
            const configDiv = document.getElementById('deepScanConfig');
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '⏹️ 停止 scan';
                }
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            if (configDiv) {
                configDiv.style.display = 'none';
            }

            // 创建 deep scan window
            await this.createDeepScanWindow(config);

        } catch (error) {
            console.error('❌ 启动 deep scan failed:', error);
            this.srcMiner.deepScanRunning = false;
            
            // 恢复UI status
            const deepScanBtn = document.getElementById('deepScanBtn');
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归 scan';
                }
                deepScanBtn.style.background = '';
            }
            
            throw error;
        }
    }

    // 停止 deep scan
    stopDeepScan() {
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;
        
        // notification scan window 停止
        chrome.runtime.sendMessage({
            action: 'stopDeepScan'
        });

        // update UI status
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归 scan';
            }
            deepScanBtn.style.background = '';
        }

        const configDiv = document.getElementById('deepScanConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
    }

    // process from scan window   message
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

    // update 主 page   scan result
    updateMainPageResults(newResults) {
        if (!newResults) return;

        // 合并 result 到主 page
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

        // 实时 update display
        this.srcMiner.displayResults();
        this.srcMiner.saveResults();

        console.log('🔄 主 page result already update，current result count:', 
            Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0));
    }

    // update scan 进度
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

    // process scan complete
    handleScanComplete(finalResults) {
        //console.log('🎉 deep scan complete！');
        
        // update 最终 result
        if (finalResults) {
            this.updateMainPageResults(finalResults);
        }

        // 重置 status
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
                    deepScanBtnText.textContent = '深度递归 scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }

        // hide 进度条
        const progressDiv = document.getElementById('deepScanProgress');
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 5000);
        }

        // save complete status 到IndexedDB
        const completionState = {
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        };
        
        // 获取 current page URLfor save status
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const baseUrl = new URL(tabs[0].url).origin;
                IndexedDBManager.saveDeepScanState(baseUrl, completionState);
            }
        });
    }

    // process scan error
    handleScanError(errorData) {
        console.error('❌ deep scan 出错:', errorData);
        
        // 重置 status
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
                    deepScanBtnText.textContent = '深度递归 scan';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }
    }
}