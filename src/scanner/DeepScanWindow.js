/**
 * 深度扫描窗口管理器 - 负责创建和管理深度扫描窗口
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

    // 创建深度扫描窗口
    async createDeepScanWindow(config) {
        console.log('🔍 [DEBUG] 开始创建深度扫描窗口，配置:', config);
        
        let baseUrl = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('🔍 [DEBUG] 当前标签页:', tab);
            if (tab && tab.url) {
                baseUrl = new URL(tab.url).origin;
                console.log('🔍 [DEBUG] 解析得到baseUrl:', baseUrl);
            }
        } catch (error) {
            console.error('❌ [DEBUG] 获取当前页面URL失败:', error);
        }

        // 准备扫描配置数据
        const scanConfig = {
            maxDepth: config.maxDepth || 2,
            concurrency: config.concurrency || 8,
            timeout: config.timeout || 5000,
            scanJsFiles: config.scanJsFiles !== false,
            scanHtmlFiles: config.scanHtmlFiles !== false,
            scanApiFiles: config.scanApiFiles !== false,
            baseUrl: baseUrl,
            initialResults: this.srcMiner.results || {},
            timestamp: Date.now()
        };

        console.log('🔍 [DEBUG] 准备保存的扫描配置:', scanConfig);
        console.log('🔍 [DEBUG] 初始结果数量统计:', {
            absoluteApis: scanConfig.initialResults.absoluteApis?.length || 0,
            domains: scanConfig.initialResults.domains?.length || 0,
            emails: scanConfig.initialResults.emails?.length || 0,
            jsFiles: scanConfig.initialResults.jsFiles?.length || 0
        });

        // 将配置保存到chrome.storage，供扫描窗口读取
        try {
            console.log('🔍 [DEBUG] 开始保存配置到chrome.storage...');
            await chrome.storage.local.set({ 'deepScanConfig': scanConfig });
            console.log('✅ [DEBUG] 深度扫描配置已保存到storage');
            
            // 验证保存是否成功
            const verification = await chrome.storage.local.get(['deepScanConfig']);
            console.log('🔍 [DEBUG] 验证保存结果:', verification.deepScanConfig ? '成功' : '失败');
            
        } catch (error) {
            console.error('❌ [DEBUG] 保存深度扫描配置失败:', error);
            throw new Error('保存深度扫描配置失败: ' + error.message);
        }

        try {
            // 使用扩展的深度扫描页面
            const scanPageUrl = chrome.runtime.getURL('deep-scan-window.html');
            
            // 打开新窗口
            const newWindow = await chrome.windows.create({
                url: scanPageUrl,
                type: 'normal',
                width: 800,
                height: 900,
                focused: true
            });

            console.log('深度扫描窗口已创建:', newWindow.id);
            return newWindow;
        } catch (error) {
            console.error('创建深度扫描窗口失败:', error);
            throw error;
        }
    }

    // 开始深度扫描（从扩展页面调用）
    async startDeepScan() {
        if (this.srcMiner.deepScanRunning) {
            console.log('深度扫描已在运行中');
            return;
        }

        console.log('启动深度扫描窗口...');

        // 获取配置参数
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
            // 标记扫描开始
            this.srcMiner.deepScanRunning = true;
            
            // 更新UI状态
            const deepScanBtn = document.getElementById('deepScanBtn');
            const configDiv = document.getElementById('deepScanConfig');
            
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '⏹️ 停止扫描';
                }
                deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            if (configDiv) {
                configDiv.style.display = 'none';
            }

            // 创建深度扫描窗口
            await this.createDeepScanWindow(config);

        } catch (error) {
            console.error('❌ 启动深度扫描失败:', error);
            this.srcMiner.deepScanRunning = false;
            
            // 恢复UI状态
            const deepScanBtn = document.getElementById('deepScanBtn');
            if (deepScanBtn) {
                const deepScanBtnText = deepScanBtn.querySelector('.text');
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归扫描';
                }
                deepScanBtn.style.background = '';
            }
            
            throw error;
        }
    }

    // 停止深度扫描
    stopDeepScan() {
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;
        
        // 通知扫描窗口停止
        chrome.runtime.sendMessage({
            action: 'stopDeepScan'
        });

        // 更新UI状态
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '深度递归扫描';
            }
            deepScanBtn.style.background = '';
        }

        const configDiv = document.getElementById('deepScanConfig');
        if (configDiv) {
            configDiv.style.display = 'none';
        }
    }

    // 处理来自扫描窗口的消息
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

    // 更新主页面的扫描结果
    updateMainPageResults(newResults) {
        if (!newResults) return;

        // 合并结果到主页面
        Object.keys(newResults).forEach(key => {
            if (!this.srcMiner.results[key]) {
                this.srcMiner.results[key] = [];
            }

            // 使用Set进行去重
            const existingSet = new Set(this.srcMiner.results[key]);
            newResults[key].forEach(item => {
                if (item && !existingSet.has(item)) {
                    this.srcMiner.results[key].push(item);
                }
            });
        });

        // 实时更新显示
        this.srcMiner.displayResults();
        this.srcMiner.saveResults();

        console.log('🔄 主页面结果已更新，当前结果数量:', 
            Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0));
    }

    // 更新扫描进度
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

    // 处理扫描完成
    handleScanComplete(finalResults) {
        console.log('🎉 深度扫描完成！');
        
        // 更新最终结果
        if (finalResults) {
            this.updateMainPageResults(finalResults);
        }

        // 重置状态
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // 更新UI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '✅ 深度扫描完成';
            }
            deepScanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归扫描';
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

        // 保存完成状态
        chrome.storage.local.set({
            deepScanComplete: true,
            deepScanCompletedAt: Date.now(),
            deepScanResultsCount: Object.values(this.srcMiner.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        });
    }

    // 处理扫描错误
    handleScanError(errorData) {
        console.error('❌ 深度扫描出错:', errorData);
        
        // 重置状态
        this.srcMiner.deepScanRunning = false;
        this.isScanRunning = false;

        // 更新UI
        const deepScanBtn = document.getElementById('deepScanBtn');
        if (deepScanBtn) {
            const deepScanBtnText = deepScanBtn.querySelector('.text');
            if (deepScanBtnText) {
                deepScanBtnText.textContent = '❌ 扫描失败';
            }
            deepScanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            
            setTimeout(() => {
                if (deepScanBtnText) {
                    deepScanBtnText.textContent = '深度递归扫描';
                }
                deepScanBtn.style.background = '';
            }, 3000);
        }
    }
}