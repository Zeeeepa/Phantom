/**
 * PackerIntegrationUI.js
 * Proper Chrome Extension UI integration for Packer-InfoFinder backend
 */

class PackerIntegrationUI {
    constructor() {
        this.packerBridge = new PackerBridge();
        this.analysisInProgress = false;
        this.currentScanId = null;
        this.connectionCheckInterval = null;
    }
    
    /**
     * Initialize Packer integration UI
     */
    async init() {
        console.log('🚀 Initializing Packer Integration UI...');
        
        // Get DOM elements
        this.elements = {
            statusBar: document.getElementById('packerStatusBar'),
            statusDot: document.getElementById('packerStatusDot'),
            statusText: document.getElementById('packerStatusText'),
            refreshBtn: document.getElementById('packerRefreshBtn'),
            buttonContainer: document.getElementById('packerButtonContainer'),
            scanBtn: document.getElementById('packerScanBtn'),
            progressBar: document.getElementById('packerProgressBar'),
            progressText: document.getElementById('packerProgressText'),
            resultsSection: document.getElementById('packerResultsSection'),
            resultsContent: document.getElementById('packerResultsContent'),
            closeResults: document.getElementById('closePackerResults')
        };
        
        // Check if elements exist
        if (!this.elements.statusBar) {
            console.warn('⚠️ Packer UI elements not found in popup.html');
            return;
        }
        
        // Load settings
        await this.packerBridge.loadSettings();
        
        // Show status bar if enabled
        if (this.packerBridge.enabled) {
            this.elements.statusBar.style.display = 'flex';
            this.elements.buttonContainer.style.display = 'block';
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial connection check
        await this.checkConnection();
        
        // Start periodic connection checks (every 30 seconds)
        this.startConnectionMonitoring();
        
        console.log('✅ Packer Integration UI initialized');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        this.elements.refreshBtn?.addEventListener('click', () => {
            this.checkConnection();
        });
        
        // Scan button
        this.elements.scanBtn?.addEventListener('click', () => {
            this.startPackerAnalysis();
        });
        
        // Close results button
        this.elements.closeResults?.addEventListener('click', () => {
            this.elements.resultsSection.style.display = 'none';
        });
    }
    
    /**
     * Check backend connection status
     */
    async checkConnection() {
        console.log('🔍 Checking Packer backend connection...');
        
        // Update UI to checking state
        this.updateConnectionStatus('checking', '检查连接中...');
        
        try {
            const result = await this.packerBridge.testConnection();
            
            if (result.success) {
                this.updateConnectionStatus('connected', '✅ 后端已连接');
                this.elements.scanBtn.disabled = false;
                console.log('✅ Packer backend connected');
            } else {
                this.updateConnectionStatus('disconnected', '❌ 连接失败');
                this.elements.scanBtn.disabled = true;
                console.error('❌ Packer backend disconnected:', result.error);
            }
        } catch (error) {
            this.updateConnectionStatus('disconnected', '❌ 连接失败');
            this.elements.scanBtn.disabled = true;
            console.error('❌ Connection check error:', error);
        }
    }
    
    /**
     * Update connection status UI
     */
    updateConnectionStatus(status, text) {
        // Remove all status classes
        this.elements.statusDot.classList.remove('connected', 'disconnected', 'checking');
        
        // Add appropriate status class
        this.elements.statusDot.classList.add(status);
        
        // Update text
        this.elements.statusText.textContent = text;
    }
    
    /**
     * Start periodic connection monitoring
     */
    startConnectionMonitoring() {
        // Clear existing interval
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
        
        // Check every 30 seconds
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }
    
    /**
     * Stop connection monitoring
     */
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }
    
    /**
     * Start Packer deep analysis
     */
    async startPackerAnalysis() {
        if (this.analysisInProgress) {
            alert('分析正在进行中，请稍候...');
            return;
        }
        
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
                throw new Error('无法分析系统页面');
            }
            
            console.log('🚀 Starting Packer analysis for:', tab.url);
            
            // Update UI
            this.analysisInProgress = true;
            this.elements.scanBtn.disabled = true;
            this.elements.scanBtn.querySelector('.text').textContent = '分析中...';
            this.showProgress('正在启动Packer深度分析...');
            
            // Get cookies if needed (from settings)
            let cookie = '';
            try {
                const cookies = await chrome.cookies.getAll({ url: tab.url });
                cookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            } catch (e) {
                console.warn('Failed to get cookies:', e);
            }
            
            // Call Packer backend
            const result = await this.packerBridge.analyze(tab.url, {
                mode: 'full',
                cookie: cookie,
                headers: {}
            });
            
            if (result.success) {
                this.currentScanId = result.scanId;
                console.log('✅ Packer analysis completed:', result);
                this.displayResults(result.result);
                this.hideProgress();
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('❌ Packer analysis failed:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Packer分析失败';
            let troubleshooting = '';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = '❌ 无法连接到Packer后端服务';
                troubleshooting = '\n\n💡 请确保:\n1. Packer后端正在运行 (python packer_api.py)\n2. 端点地址正确 (设置→Packer集成)\n3. 防火墙未阻止连接';
            } else if (error.message.includes('timeout')) {
                errorMessage = '⏱️ 分析超时';
                troubleshooting = '\n\n💡 可能原因:\n1. 目标网站响应较慢\n2. 后端服务负载过高\n3. 网络连接不稳定';
            } else if (error.message.includes('无法分析系统页面')) {
                errorMessage = '🚫 无法分析Chrome系统页面';
                troubleshooting = '\n\nChrome内部页面(chrome://)不支持扫描';
            } else {
                errorMessage = 'Packer分析失败: ' + error.message;
            }
            
            this.showError(errorMessage + troubleshooting);
            this.hideProgress();
            
        } finally {
            // Re-enable button
            this.analysisInProgress = false;
            this.elements.scanBtn.disabled = false;
            this.elements.scanBtn.querySelector('.text').textContent = '🚀 Packer深度分析';
        }
    }
    
    /**
     * Show progress indicator
     */
    showProgress(message) {
        this.elements.progressText.textContent = message;
        this.elements.progressBar.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
    }
    
    /**
     * Hide progress indicator
     */
    hideProgress() {
        this.elements.progressBar.style.display = 'none';
    }
    
    /**
     * Display analysis results
     */
    displayResults(result) {
        console.log('📊 Displaying Packer results:', result);
        
        // Build results HTML
        let html = `
            <div class="packer-result-item">
                <span class="result-label">扫描ID:</span>
                <span class="result-value">${this.currentScanId || 'N/A'}</span>
            </div>
            
            <div class="packer-result-item">
                <span class="result-label">URL:</span>
                <span class="result-value">${result.url || 'N/A'}</span>
            </div>
            
            <div class="packer-result-item">
                <span class="result-label">时间:</span>
                <span class="result-value">${result.timestamp ? new Date(result.timestamp).toLocaleString('zh-CN') : 'N/A'}</span>
            </div>
            
            <div class="packer-result-item">
                <span class="result-label">状态:</span>
                <span class="result-value">${result.success ? '✅ 成功' : '❌ 失败'}</span>
            </div>
        `;
        
        // Add results details
        if (result.results) {
            if (result.results.has_results) {
                html += `
                    <div class="packer-result-item" style="background: rgba(16, 185, 129, 0.1); border-left-color: #10b981;">
                        <span class="result-label">✅ 发现:</span>
                        <span class="result-value">检测到敏感信息</span>
                    </div>
                `;
                
                if (result.results.finder_report) {
                    html += `
                        <div class="packer-result-item">
                            <span class="result-label">报告:</span>
                            <span class="result-value" style="word-break: break-all; font-size: 12px;">${result.results.finder_report}</span>
                        </div>
                    `;
                }
            } else {
                html += `
                    <div class="packer-result-item" style="background: rgba(245, 158, 11, 0.1); border-left-color: #f59e0b;">
                        <span class="result-label">ℹ️ 结果:</span>
                        <span class="result-value">未发现敏感信息</span>
                    </div>
                `;
            }
        }
        
        // Add export button
        html += `
            <div style="margin-top: 15px; text-align: center;">
                <button id="exportPackerResults" style="padding: 8px 20px; background: #667eea; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 14px;">
                    导出完整结果
                </button>
            </div>
        `;
        
        // Update results content
        this.elements.resultsContent.innerHTML = html;
        
        // Show results section
        this.elements.resultsSection.style.display = 'block';
        
        // Setup export button
        document.getElementById('exportPackerResults')?.addEventListener('click', () => {
            this.exportResults();
        });
    }
    
    /**
     * Export results as JSON
     */
    async exportResults() {
        if (!this.currentScanId) {
            alert('没有可导出的结果');
            return;
        }
        
        try {
            const result = await this.packerBridge.getScanResult(this.currentScanId);
            
            // Create download
            const blob = new Blob([JSON.stringify(result, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `packer_analysis_${this.currentScanId}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Results exported');
            
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败: ' + error.message);
        }
    }
    
    /**
     * Show error message with better UX
     */
    showError(message) {
        // Create a styled error notification instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => errorDiv.remove(), 300);
        }, 8000);
    }
    
    /**
     * Cleanup on extension unload
     */
    destroy() {
        this.stopConnectionMonitoring();
    }
}

// Initialize when DOM is ready
let packerUI = null;

// Wait for DOM and other scripts to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPacker);
} else {
    initPacker();
}

async function initPacker() {
    // Wait a bit for other scripts to initialize
    setTimeout(async () => {
        try {
            packerUI = new PackerIntegrationUI();
            await packerUI.init();
        } catch (error) {
            console.error('Failed to initialize Packer UI:', error);
        }
    }, 500);
}

// Cleanup on window unload
window.addEventListener('unload', () => {
    if (packerUI) {
        packerUI.destroy();
    }
});

// Export for global access
if (typeof window !== 'undefined') {
    window.PackerIntegrationUI = PackerIntegrationUI;
    window.packerUI = packerUI;
}
