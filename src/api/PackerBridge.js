/**
 * PackerBridge.js
 * Communication bridge between Phantom extension and Packer-InfoFinder backend
 */

class PackerBridge {
    constructor() {
        // Default endpoint (user can configure in settings)
        this.endpoint = 'http://localhost:8765';
        this.apiKey = null;
        this.timeout = 300000; // 5 minutes
        
        // Load settings from storage
        this.loadSettings();
    }
    
    /**
     * Load Packer integration settings
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['packerEndpoint', 'packerApiKey', 'packerEnabled']);
            
            if (result.packerEndpoint) {
                this.endpoint = result.packerEndpoint;
            }
            if (result.packerApiKey) {
                this.apiKey = result.packerApiKey;
            }
            this.enabled = result.packerEnabled !== false; // Default to enabled
            
        } catch (error) {
            console.error('Failed to load Packer settings:', error);
        }
    }
    
    /**
     * Save Packer integration settings
     */
    async saveSettings(settings) {
        try {
            await chrome.storage.local.set({
                packerEndpoint: settings.endpoint || this.endpoint,
                packerApiKey: settings.apiKey || this.apiKey,
                packerEnabled: settings.enabled !== false
            });
            
            // Update instance
            this.endpoint = settings.endpoint || this.endpoint;
            this.apiKey = settings.apiKey || this.apiKey;
            this.enabled = settings.enabled !== false;
            
            return { success: true };
        } catch (error) {
            console.error('Failed to save Packer settings:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Test connection to Packer backend
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.endpoint}/health`, {
                method: 'GET',
                headers: this._buildHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const data = await response.json();
            return {
                success: true,
                status: data.status,
                message: 'Connected successfully'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to connect to Packer backend'
            };
        }
    }
    
    /**
     * Analyze URL with Packer-InfoFinder backend
     */
    async analyze(url, options = {}) {
        if (!this.enabled) {
            return {
                success: false,
                error: 'Packer integration is disabled'
            };
        }
        
        try {
            const requestBody = {
                url: url,
                mode: options.mode || 'full',
                cookie: options.cookie || null,
                headers: options.headers || null,
                proxy: options.proxy || null,
                options: options.options || null
            };
            
            console.log('🚀 Sending analysis request to Packer backend:', url);
            
            const response = await fetch(`${this.endpoint}/analyze`, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server returned ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('✅ Packer analysis completed:', data);
            
            return {
                success: true,
                scanId: data.scan_id,
                result: data.result
            };
            
        } catch (error) {
            console.error('❌ Packer analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Batch analyze multiple URLs
     */
    async batchAnalyze(urls, options = {}) {
        if (!this.enabled) {
            return {
                success: false,
                error: 'Packer integration is disabled'
            };
        }
        
        try {
            const requestBody = {
                urls: urls,
                mode: options.mode || 'full',
                options: options.options || null
            };
            
            console.log('🚀 Sending batch analysis request:', urls.length, 'URLs');
            
            const response = await fetch(`${this.endpoint}/batch`, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server returned ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('✅ Batch analysis completed:', data.completed, '/', data.total);
            
            return {
                success: true,
                total: data.total,
                completed: data.completed,
                failed: data.failed,
                results: data.results
            };
            
        } catch (error) {
            console.error('❌ Batch analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get scan result by ID
     */
    async getScanResult(scanId) {
        try {
            const response = await fetch(`${this.endpoint}/scan/${scanId}`, {
                method: 'GET',
                headers: this._buildHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Failed to get scan result:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * List all available scans
     */
    async listScans() {
        try {
            const response = await fetch(`${this.endpoint}/scans`, {
                method: 'GET',
                headers: this._buildHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Failed to list scans:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Delete scan result
     */
    async deleteScan(scanId) {
        try {
            const response = await fetch(`${this.endpoint}/scan/${scanId}`, {
                method: 'DELETE',
                headers: this._buildHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Failed to delete scan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Build request headers
     */
    _buildHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        
        return headers;
    }
    
    /**
     * Check if Packer integration is enabled
     */
    isEnabled() {
        return this.enabled === true;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PackerBridge = PackerBridge;
}

