/**
 * PackerIntegrationUI.js
 * UI components for Packer-InfoFinder integration
 */

class PackerIntegrationUI {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
        this.packerBridge = new PackerBridge();
        this.analysisInProgress = false;
        this.currentScanId = null;
    }
    
    /**
     * Initialize Packer integration UI
     */
    async init() {
        // Check if Packer is enabled
        const enabled = await this.packerBridge.isEnabled();
        
        if (!enabled) {
            console.log('Packer integration is disabled');
            return;
        }
        
        // Add Packer analysis button to UI
        this.addPackerButton();
        
        // Add Packer settings section
        this.addPackerSettings();
        
        console.log('✅ Packer integration UI initialized');
    }
    
    /**
     * Add Packer analysis button to scan section
     */
    addPackerButton() {
        // Find the scan buttons container
        const scanSection = document.querySelector('.scan-section');
        if (!scanSection) {
            console.warn('Scan section not found');
            return;
        }
        
        // Create Packer button
        const packerBtn = document.createElement('button');
        packerBtn.id = 'packerAnalysisBtn';
        packerBtn.className = 'scan-btn packer-btn';
        packerBtn.innerHTML = `
            <span class="icon">🚀</span>
            <span class="text">Packer深度分析</span>
        `;
        
        // Add click handler
        packerBtn.addEventListener('click', () => this.startPackerAnalysis());
        
        // Insert after the basic scan button
        const basicScanBtn = document.getElementById('scanBtn');
        if (basicScanBtn && basicScanBtn.parentNode) {
            basicScanBtn.parentNode.insertBefore(packerBtn, basicScanBtn.nextSibling);
        }
    }
    
    /**
     * Add Packer settings to settings panel
     */
    addPackerSettings() {
        const settingsPanel = document.getElementById('settings');
        if (!settingsPanel) {
            console.warn('Settings panel not found');
            return;
        }
        
        // Create Packer settings section
        const packerSection = document.createElement('div');
        packerSection.className = 'settings-section packer-settings';
        packerSection.innerHTML = `
            <h3>🚀 Packer-InfoFinder 集成</h3>
            
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="packerEnabled" checked>
                    启用Packer深度分析
                </label>
                <p class="setting-description">
                    开启后可使用Webpack chunk重构和AST深度分析
                </p>
            </div>
            
            <div class="setting-item">
                <label for="packerEndpoint">API端点:</label>
                <input 
                    type="text" 
                    id="packerEndpoint" 
                    value="http://localhost:8765"
                    placeholder="http://localhost:8765"
                >
                <p class="setting-description">
                    Packer-InfoFinder后端服务地址
                </p>
            </div>
            
            <div class="setting-item">
                <label for="packerApiKey">API密钥 (可选):</label>
                <input 
                    type="password" 
                    id="packerApiKey" 
                    placeholder="留空表示无需认证"
                >
            </div>
            
            <div class="setting-actions">
                <button id="testPackerConnection" class="btn-secondary">
                    测试连接
                </button>
                <button id="savePackerSettings" class="btn-primary">
                    保存配置
                </button>
            </div>
            
            <div id="packerConnectionStatus" class="status-message"></div>
        `;
        
        // Add to settings panel
        settingsPanel.appendChild(packerSection);
        
        // Load current settings
        this.loadPackerSettings();
        
        // Add event listeners
        document.getElementById('testPackerConnection').addEventListener('click', 
            () => this.testPackerConnection());
        document.getElementById('savePackerSettings').addEventListener('click', 
            () => this.savePackerSettings());
    }
    
    /**
     * Load Packer settings into UI
     */
    async loadPackerSettings() {
        try {
            await this.packerBridge.loadSettings();
            
            document.getElementById('packerEnabled').checked = this.packerBridge.enabled;
            document.getElementById('packerEndpoint').value = this.packerBridge.endpoint;
            if (this.packerBridge.apiKey) {
                document.getElementById('packerApiKey').value = this.packerBridge.apiKey;
            }
            
        } catch (error) {
            console.error('Failed to load Packer settings:', error);
        }
    }
    
    /**
     * Save Packer settings
     */
    async savePackerSettings() {
        const statusDiv = document.getElementById('packerConnectionStatus');
        
        try {
            const settings = {
                enabled: document.getElementById('packerEnabled').checked,
                endpoint: document.getElementById('packerEndpoint').value.trim(),
                apiKey: document.getElementById('packerApiKey').value.trim() || null
            };
            
            const result = await this.packerBridge.saveSettings(settings);
            
            if (result.success) {
                this.showStatus(statusDiv, '✅ 配置已保存', 'success');
            } else {
                this.showStatus(statusDiv, '❌ 保存失败: ' + result.error, 'error');
            }
            
        } catch (error) {
            this.showStatus(statusDiv, '❌ 保存失败: ' + error.message, 'error');
        }
    }
    
    /**
     * Test connection to Packer backend
     */
    async testPackerConnection() {
        const statusDiv = document.getElementById('packerConnectionStatus');
        const testBtn = document.getElementById('testPackerConnection');
        
        testBtn.disabled = true;
        this.showStatus(statusDiv, '🔄 正在测试连接...', 'info');
        
        try {
            // Update bridge settings first
            await this.savePackerSettings();
            
            // Test connection
            const result = await this.packerBridge.testConnection();
            
            if (result.success) {
                this.showStatus(statusDiv, 
                    `✅ 连接成功! 状态: ${result.status}`, 'success');
            } else {
                this.showStatus(statusDiv, 
                    `❌ 连接失败: ${result.error}`, 'error');
            }
            
        } catch (error) {
            this.showStatus(statusDiv, 
                `❌ 连接失败: ${error.message}`, 'error');
        } finally {
            testBtn.disabled = false;
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
            
            // Disable button
            const btn = document.getElementById('packerAnalysisBtn');
            const btnText = btn.querySelector('.text');
            this.analysisInProgress = true;
            btn.disabled = true;
            btnText.textContent = '分析中...';
            
            // Show progress
            this.showPackerProgress('正在启动Packer深度分析...');
            
            // Get cookies and headers from settings
            const cookie = await this.srcMiner.settingsManager?.getCookieSetting() || '';
            const headers = await this.srcMiner.settingsManager?.getHeadersSetting() || [];
            
            // Convert headers to object
            const headersObj = {};
            headers.forEach(h => {
                if (h.name && h.value) {
                    headersObj[h.name] = h.value;
                }
            });
            
            // Call Packer backend
            const result = await this.packerBridge.analyze(tab.url, {
                mode: 'full',
                cookie: cookie,
                headers: headersObj
            });
            
            if (result.success) {
                this.currentScanId = result.scanId;
                this.displayPackerResults(result.result);
                this.showPackerProgress('✅ 分析完成!', 'success');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Packer analysis failed:', error);
            this.showPackerProgress('❌ 分析失败: ' + error.message, 'error');
            alert('Packer分析失败: ' + error.message);
            
        } finally {
            // Re-enable button
            const btn = document.getElementById('packerAnalysisBtn');
            const btnText = btn.querySelector('.text');
            this.analysisInProgress = false;
            btn.disabled = false;
            btnText.textContent = 'Packer深度分析';
        }
    }
    
    /**
     * Display Packer analysis results
     */
    displayPackerResults(result) {
        // Create results section if it doesn't exist
        let resultsSection = document.getElementById('packerResults');
        
        if (!resultsSection) {
            resultsSection = document.createElement('div');
            resultsSection.id = 'packerResults';
            resultsSection.className = 'packer-results-section';
            
            // Insert after scan results
            const scanResults = document.querySelector('.scan-results');
            if (scanResults && scanResults.parentNode) {
                scanResults.parentNode.insertBefore(resultsSection, scanResults.nextSibling);
            }
        }
        
        // Build results HTML
        const html = `
            <div class="packer-results-header">
                <h3>🚀 Packer深度分析结果</h3>
                <button class="close-btn" onclick="document.getElementById('packerResults').style.display='none'">×</button>
            </div>
            
            <div class="packer-results-content">
                <div class="result-summary">
                    <div class="summary-item">
                        <span class="label">扫描ID:</span>
                        <span class="value">${this.currentScanId}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">URL:</span>
                        <span class="value">${result.url}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">时间:</span>
                        <span class="value">${new Date(result.timestamp).toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                
                <div class="result-details">
                    ${this.formatPackerResults(result.results)}
                </div>
                
                <div class="result-actions">
                    <button class="btn-secondary" onclick="packerIntegrationUI.exportPackerResults()">
                        导出结果
                    </button>
                </div>
            </div>
        `;
        
        resultsSection.innerHTML = html;
        resultsSection.style.display = 'block';
    }
    
    /**
     * Format Packer results for display
     */
    formatPackerResults(results) {
        if (!results || !results.has_results) {
            return '<p class="no-results">未发现敏感信息</p>';
        }
        
        return `
            <div class="findings">
                <p>✅ 发现敏感信息!</p>
                <p>详细报告已保存</p>
                ${results.finder_report ? 
                    `<p class="report-path">报告路径: ${results.finder_report}</p>` 
                    : ''}
            </div>
        `;
    }
    
    /**
     * Show progress message
     */
    showPackerProgress(message, type = 'info') {
        // Create progress element if it doesn't exist
        let progress = document.getElementById('packerProgress');
        
        if (!progress) {
            progress = document.createElement('div');
            progress.id = 'packerProgress';
            progress.className = 'packer-progress';
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(progress, container.firstChild);
            }
        }
        
        progress.className = `packer-progress ${type}`;
        progress.textContent = message;
        progress.style.display = 'block';
        
        // Auto-hide after 5 seconds for success/error
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                progress.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * Show status message
     */
    showStatus(element, message, type = 'info') {
        element.className = `status-message ${type}`;
        element.textContent = message;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Export Packer results
     */
    async exportPackerResults() {
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
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `packer_analysis_${this.currentScanId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败: ' + error.message);
        }
    }
}

// Global instance
let packerIntegrationUI;

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.PackerIntegrationUI = PackerIntegrationUI;
}

