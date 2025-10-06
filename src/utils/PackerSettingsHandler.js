/**
 * PackerSettingsHandler.js
 * Handles Packer integration settings UI in the Settings page
 */

class PackerSettingsHandler {
    constructor() {
        this.packerBridge = null;
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
        
        // Get DOM elements
        this.elements = {
            enabled: document.getElementById('packerEnabled'),
            endpoint: document.getElementById('packerEndpoint'),
            apiKey: document.getElementById('packerApiKey'),
            testBtn: document.getElementById('testPackerConnectionBtn'),
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
        // Test connection button
        this.elements.testBtn?.addEventListener('click', () => {
            this.testConnection();
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
    }
    
    /**
     * Test connection to Packer backend
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Packer connection...');
            
            // Show status container
            this.elements.statusContainer.style.display = 'block';
            this.updateStatus('checking', '正在测试连接...');
            
            // Get current values from UI (not saved yet)
            const tempSettings = {
                enabled: this.elements.enabled.checked,
                endpoint: this.elements.endpoint.value.trim(),
                apiKey: this.elements.apiKey.value.trim()
            };
            
            // Temporarily update bridge settings
            const originalEndpoint = this.packerBridge.endpoint;
            const originalApiKey = this.packerBridge.apiKey;
            
            this.packerBridge.endpoint = tempSettings.endpoint;
            this.packerBridge.apiKey = tempSettings.apiKey;
            
            // Test connection
            const result = await this.packerBridge.testConnection();
            
            // Restore original settings
            this.packerBridge.endpoint = originalEndpoint;
            this.packerBridge.apiKey = originalApiKey;
            
            if (result.success) {
                this.updateStatus('connected', `✅ 连接成功! ${result.message || ''}`);
                this.showNotification('连接测试成功', 'success');
            } else {
                this.updateStatus('disconnected', `❌ 连接失败: ${result.error || '未知错误'}`);
                this.showNotification(`连接测试失败: ${result.error}`, 'error');
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
            
            // Validate endpoint
            if (settings.enabled && !settings.endpoint) {
                this.showNotification('请输入API端点地址', 'error');
                return;
            }
            
            // Validate endpoint format
            if (settings.enabled && settings.endpoint) {
                try {
                    new URL(settings.endpoint);
                } catch (e) {
                    this.showNotification('API端点地址格式无效', 'error');
                    return;
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

