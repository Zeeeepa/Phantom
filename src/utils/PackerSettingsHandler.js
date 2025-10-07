/**
 * PackerSettingsHandler.js
 * Handles Packer integration settings UI in the Settings page
 */

class PackerSettingsHandler {
    constructor() {
        this.packerBridge = null;
        this.validator = null;
        this.elements = {};
    }
    
    /**
     * Initialize settings handler
     */
    async init() {
        console.log('🔧 Initializing Packer Settings Handler...');
        
        // Wait for PackerBridge to be available
        if (typeof PackerBridge !== 'undefined') {
            this.packerBridge = new PackerBridge();
            await this.packerBridge.loadSettings();
        } else {
            console.warn('⚠️ PackerBridge not loaded yet');
            return;
        }
        
        // Initialize validator
        if (typeof PackerValidator !== 'undefined') {
            this.validator = new PackerValidator();
        } else {
            console.warn('⚠️ PackerValidator not loaded yet');
        }
        
        // Get DOM elements
        this.elements = {
            enabled: document.getElementById('packerEnabled'),
            endpoint: document.getElementById('packerEndpoint'),
            apiKey: document.getElementById('packerApiKey'),
            testBtn: document.getElementById('testPackerConnectionBtn'),
            comprehensiveTestBtn: document.getElementById('comprehensivePackerTestBtn'),
            saveBtn: document.getElementById('savePackerSettingsBtn'),
            statusContainer: document.getElementById('packerConnectionStatus'),
            statusIndicator: document.getElementById('packerStatusIndicator'),
            statusMessage: document.getElementById('packerStatusMessage')
        };
        
        // Check if elements exist
        if (!this.elements.enabled) {
            console.warn('⚠️ Packer settings elements not found');
            return;
        }
        
        // Load current settings into UI
        await this.loadSettingsToUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Packer Settings Handler initialized');
    }
    
    /**
     * Load settings from storage to UI
     */
    async loadSettingsToUI() {
        try {
            // Reload settings from storage
            await this.packerBridge.loadSettings();
            
            // Populate UI fields
            this.elements.enabled.checked = this.packerBridge.enabled;
            this.elements.endpoint.value = this.packerBridge.endpoint || 'http://localhost:8765';
            this.elements.apiKey.value = this.packerBridge.apiKey || '';
            
            console.log('✅ Loaded Packer settings to UI');
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Test connection button (quick test)
        this.elements.testBtn?.addEventListener('click', () => {
            this.testConnection();
        });
        
        // Comprehensive test button
        this.elements.comprehensiveTestBtn?.addEventListener('click', () => {
            this.runComprehensiveTest();
        });
        
        // Save settings button
        this.elements.saveBtn?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Enable/disable toggle
        this.elements.enabled?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            // Enable/disable input fields based on toggle
            this.elements.endpoint.disabled = !enabled;
            this.elements.apiKey.disabled = !enabled;
            this.elements.testBtn.disabled = !enabled;
        });
        
        // Real-time validation for endpoint
        this.elements.endpoint?.addEventListener('blur', () => {
            this.validateEndpointField();
        });
        
        // Real-time validation for API key
        this.elements.apiKey?.addEventListener('blur', () => {
            this.validateApiKeyField();
        });
    }
    
    /**
     * Validate endpoint field in real-time
     */
    validateEndpointField() {
        if (!this.validator) return;
        
        const endpoint = this.elements.endpoint.value.trim();
        const result = this.validator.validateEndpoint(endpoint);
        
        // Visual feedback
        if (result.valid) {
            this.elements.endpoint.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        } else {
            this.elements.endpoint.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            // Show first error as tooltip-style message
            if (result.errors.length > 0) {
                this.showFieldError(this.elements.endpoint, result.errors[0]);
            }
        }
    }
    
    /**
     * Validate API key field in real-time
     */
    validateApiKeyField() {
        if (!this.validator) return;
        
        const apiKey = this.elements.apiKey.value.trim();
        const result = this.validator.validateApiKey(apiKey);
        
        // Visual feedback
        if (result.valid) {
            this.elements.apiKey.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        } else {
            this.elements.apiKey.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            if (result.errors.length > 0) {
                this.showFieldError(this.elements.apiKey, result.errors[0]);
            }
        }
    }
    
    /**
     * Show field-specific error message
     */
    showFieldError(field, message) {
        // Create or update error tooltip
        let errorDiv = field.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('field-error')) {
            errorDiv = document.createElement('div');
            errorDiv.classList.add('field-error');
            errorDiv.style.cssText = `
                color: #ef4444;
                font-size: 12px;
                margin-top: 5px;
                padding: 5px;
                background: rgba(239, 68, 68, 0.1);
                border-radius: 4px;
            `;
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Test connection to Packer backend
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Packer connection...');
            
            // Get current values from UI
            const tempSettings = {
                enabled: this.elements.enabled.checked,
                endpoint: this.elements.endpoint.value.trim(),
                apiKey: this.elements.apiKey.value.trim()
            };
            
            // Validate settings first
            if (this.validator) {
                const validationResult = this.validator.validateSettings(tempSettings);
                
                if (!validationResult.valid) {
                    const errorMessage = this.validator.formatValidationErrors(validationResult);
                    this.elements.statusContainer.style.display = 'block';
                    this.updateStatus('disconnected', errorMessage);
                    this.showNotification('配置验证失败', 'error');
                    return;
                }
                
                // Show warnings if any
                if (validationResult.warnings.length > 0) {
                    console.warn('Configuration warnings:', validationResult.warnings);
                }
            }
            
            // Show status container
            this.elements.statusContainer.style.display = 'block';
            this.updateStatus('checking', '正在运行快速测试...');
            
            // Run quick test using validator
            if (this.validator) {
                const testResult = await this.validator.quickTest(
                    tempSettings.endpoint,
                    tempSettings.apiKey
                );
                
                // Show test report
                const reportHtml = this.validator.generateTestReport(testResult);
                this.elements.statusMessage.innerHTML = reportHtml;
                
                if (testResult.passed) {
                    this.elements.statusIndicator.style.background = '#10b981';
                    this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
                    this.showNotification(`连接测试成功 (${testResult.duration}ms)`, 'success');
                } else {
                    this.elements.statusIndicator.style.background = '#ef4444';
                    this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                    this.showNotification('连接测试失败', 'error');
                }
            } else {
                // Fallback to basic test if validator not available
                const originalEndpoint = this.packerBridge.endpoint;
                const originalApiKey = this.packerBridge.apiKey;
                
                this.packerBridge.endpoint = tempSettings.endpoint;
                this.packerBridge.apiKey = tempSettings.apiKey;
                
                const result = await this.packerBridge.testConnection();
                
                this.packerBridge.endpoint = originalEndpoint;
                this.packerBridge.apiKey = originalApiKey;
                
                if (result.success) {
                    this.updateStatus('connected', `✅ 连接成功! ${result.message || ''}`);
                    this.showNotification('连接测试成功', 'success');
                } else {
                    this.updateStatus('disconnected', `❌ 连接失败: ${result.error || '未知错误'}`);
                    this.showNotification(`连接测试失败: ${result.error}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('❌ Connection test error:', error);
            this.updateStatus('disconnected', `❌ 测试出错: ${error.message}`);
            this.showNotification(`测试出错: ${error.message}`, 'error');
        }
    }
    
    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            console.log('💾 Saving Packer settings...');
            
            // Get values from UI
            const settings = {
                enabled: this.elements.enabled.checked,
                endpoint: this.elements.endpoint.value.trim(),
                apiKey: this.elements.apiKey.value.trim()
            };
            
            // Validate settings using validator
            if (this.validator) {
                const validationResult = this.validator.validateSettings(settings);
                
                if (!validationResult.valid) {
                    const errorMessage = this.validator.formatValidationErrors(validationResult);
                    this.showNotification('配置验证失败:<br>' + errorMessage, 'error');
                    return;
                }
                
                // Show warnings but allow save
                if (validationResult.warnings.length > 0) {
                    console.warn('Configuration warnings:', validationResult.warnings);
                    // Could show a confirmation dialog here
                }
            } else {
                // Fallback validation if validator not available
                if (settings.enabled && !settings.endpoint) {
                    this.showNotification('请输入API端点地址', 'error');
                    return;
                }
                
                if (settings.enabled && settings.endpoint) {
                    try {
                        new URL(settings.endpoint);
                    } catch (e) {
                        this.showNotification('API端点地址格式无效', 'error');
                        return;
                    }
                }
            }
            
            // Save to storage via PackerBridge
            const result = await this.packerBridge.saveSettings(settings);
            
            if (result.success) {
                console.log('✅ Settings saved successfully');
                this.showNotification('Packer配置已保存', 'success');
                
                // If PackerIntegrationUI exists, reinitialize it
                if (typeof window.packerUI !== 'undefined' && window.packerUI) {
                    console.log('🔄 Reinitializing Packer UI with new settings...');
                    await window.packerUI.init();
                }
            } else {
                console.error('❌ Failed to save settings:', result.error);
                this.showNotification(`保存失败: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Save settings error:', error);
            this.showNotification(`保存出错: ${error.message}`, 'error');
        }
    }
    
    /**
     * Run comprehensive test suite
     */
    async runComprehensiveTest() {
        if (!this.validator) {
            this.showNotification('验证器未加载', 'error');
            return;
        }
        
        try {
            console.log('🔬 Running comprehensive test suite...');
            
            // Get current values from UI
            const tempSettings = {
                enabled: this.elements.enabled.checked,
                endpoint: this.elements.endpoint.value.trim(),
                apiKey: this.elements.apiKey.value.trim()
            };
            
            // Validate settings first
            const validationResult = this.validator.validateSettings(tempSettings);
            
            if (!validationResult.valid) {
                const errorMessage = this.validator.formatValidationErrors(validationResult);
                this.elements.statusContainer.style.display = 'block';
                this.updateStatus('disconnected', errorMessage);
                this.showNotification('配置验证失败', 'error');
                return;
            }
            
            // Show status container
            this.elements.statusContainer.style.display = 'block';
            this.updateStatus('checking', '正在运行完整测试套件...<br><small>这可能需要10秒钟</small>');
            
            // Disable test buttons during test
            this.elements.testBtn.disabled = true;
            this.elements.comprehensiveTestBtn.disabled = true;
            
            // Run comprehensive test
            const testResult = await this.validator.comprehensiveTest(
                tempSettings.endpoint,
                tempSettings.apiKey
            );
            
            // Show detailed test report
            let reportHtml = this.validator.generateTestReport(testResult);
            
            // Add extra details
            if (testResult.tests.versionCheck?.version) {
                reportHtml += `<div style="margin-top: 10px; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 6px;">`;
                reportHtml += `<strong>📦 后端版本:</strong> ${testResult.tests.versionCheck.version}`;
                reportHtml += `</div>`;
            }
            
            this.elements.statusMessage.innerHTML = reportHtml;
            
            if (testResult.passed) {
                this.elements.statusIndicator.style.background = '#10b981';
                this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
                this.showNotification(`完整测试通过 (${testResult.duration}ms)`, 'success');
            } else {
                this.elements.statusIndicator.style.background = '#ef4444';
                this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                this.showNotification('完整测试失败', 'error');
            }
            
        } catch (error) {
            console.error('❌ Comprehensive test error:', error);
            this.updateStatus('disconnected', `❌ 测试出错: ${error.message}`);
            this.showNotification(`测试出错: ${error.message}`, 'error');
        } finally {
            // Re-enable test buttons
            this.elements.testBtn.disabled = false;
            this.elements.comprehensiveTestBtn.disabled = false;
        }
    }
    
    /**
     * Update connection status display
     */
    updateStatus(status, message) {
        // Remove all status classes
        this.elements.statusIndicator.style.background = '#666';
        
        // Set appropriate color based on status
        switch (status) {
            case 'connected':
                this.elements.statusIndicator.style.background = '#10b981';
                this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
                break;
            case 'disconnected':
                this.elements.statusIndicator.style.background = '#ef4444';
                this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                break;
            case 'checking':
                this.elements.statusIndicator.style.background = '#f59e0b';
                this.elements.statusIndicator.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
                break;
        }
        
        // Update message
        this.elements.statusMessage.textContent = message;
    }
    
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Try to use existing notification system if available
        if (typeof window.showMessage === 'function') {
            window.showMessage(message);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
}

// Initialize when settings page is opened
let packerSettingsHandler = null;

// Export for global access
if (typeof window !== 'undefined') {
    window.PackerSettingsHandler = PackerSettingsHandler;
    
    // Auto-initialize when settings tab is clicked
    document.addEventListener('DOMContentLoaded', () => {
        // Watch for settings tab activation
        const settingsTab = document.querySelector('[data-page="settings"]');
        if (settingsTab) {
            settingsTab.addEventListener('click', async () => {
                // Wait a bit for the page to show
                setTimeout(async () => {
                    if (!packerSettingsHandler) {
                        packerSettingsHandler = new PackerSettingsHandler();
                        await packerSettingsHandler.init();
                    } else {
                        // Reload settings if handler already exists
                        await packerSettingsHandler.loadSettingsToUI();
                    }
                }, 100);
            });
        }
    });
}
