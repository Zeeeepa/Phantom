/**
 * PackerValidator.js
 * Comprehensive validation and testing utilities for Packer integration
 */

class PackerValidator {
    constructor() {
        this.validationRules = this._initValidationRules();
        this.testResults = {};
    }
    
    /**
     * Initialize validation rules
     */
    _initValidationRules() {
        return {
            endpoint: {
                required: true,
                pattern: /^https?:\/\/.+/,
                portRange: [1, 65535],
                message: 'API端点必须是有效的HTTP/HTTPS URL'
            },
            apiKey: {
                required: false,
                minLength: 8,
                maxLength: 256,
                pattern: /^[a-zA-Z0-9\-_.]+$/,
                message: 'API密钥格式无效'
            }
        };
    }
    
    /**
     * Validate endpoint URL format
     */
    validateEndpoint(endpoint) {
        const errors = [];
        
        // Check if provided
        if (!endpoint || endpoint.trim() === '') {
            return {
                valid: false,
                errors: ['API端点不能为空']
            };
        }
        
        const trimmed = endpoint.trim();
        
        // Check protocol
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            errors.push('URL必须以 http:// 或 https:// 开头');
        }
        
        // Try to parse URL
        try {
            const url = new URL(trimmed);
            
            // Validate hostname
            if (!url.hostname || url.hostname === '') {
                errors.push('URL必须包含有效的主机名或IP地址');
            }
            
            // Validate port if specified
            if (url.port && (parseInt(url.port) < 1 || parseInt(url.port) > 65535)) {
                errors.push('端口号必须在 1-65535 之间');
            }
            
            // Check for common localhost variations
            const isLocal = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(url.hostname);
            
            // Warn about remote endpoints without HTTPS (security)
            if (!isLocal && url.protocol === 'http:') {
                errors.push('警告: 远程端点建议使用 HTTPS 以确保安全');
            }
            
        } catch (e) {
            errors.push('无效的URL格式: ' + e.message);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: errors.filter(e => e.startsWith('警告'))
        };
    }
    
    /**
     * Validate API key format
     */
    validateApiKey(apiKey) {
        // API key is optional
        if (!apiKey || apiKey.trim() === '') {
            return { valid: true, errors: [], warnings: [] };
        }
        
        const errors = [];
        const trimmed = apiKey.trim();
        
        // Check length
        if (trimmed.length < 8) {
            errors.push('API密钥长度至少需要8个字符');
        }
        
        if (trimmed.length > 256) {
            errors.push('API密钥长度不能超过256个字符');
        }
        
        // Check for spaces
        if (trimmed.includes(' ')) {
            errors.push('API密钥不应包含空格');
        }
        
        // Check for only safe characters
        if (!/^[a-zA-Z0-9\-_.]+$/.test(trimmed)) {
            errors.push('API密钥只能包含字母、数字、连字符、下划线和点');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: []
        };
    }
    
    /**
     * Validate all settings at once
     */
    validateSettings(settings) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            fields: {}
        };
        
        // Validate endpoint
        const endpointResult = this.validateEndpoint(settings.endpoint);
        results.fields.endpoint = endpointResult;
        if (!endpointResult.valid) {
            results.valid = false;
            results.errors.push(...endpointResult.errors);
        }
        results.warnings.push(...(endpointResult.warnings || []));
        
        // Validate API key
        const apiKeyResult = this.validateApiKey(settings.apiKey);
        results.fields.apiKey = apiKeyResult;
        if (!apiKeyResult.valid) {
            results.valid = false;
            results.errors.push(...apiKeyResult.errors);
        }
        results.warnings.push(...(apiKeyResult.warnings || []));
        
        return results;
    }
    
    /**
     * Quick connectivity test (< 3 seconds)
     */
    async quickTest(endpoint, apiKey) {
        const testResult = {
            passed: false,
            duration: 0,
            tests: {
                reachability: { passed: false, message: '' },
                authentication: { passed: false, message: '' },
                responseTime: { passed: false, message: '', value: 0 }
            }
        };
        
        const startTime = Date.now();
        
        try {
            // Test 1: Basic reachability
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`${endpoint}/health`, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const responseTime = Date.now() - startTime;
            testResult.duration = responseTime;
            
            // Check reachability
            if (response.status === 200 || response.status === 401) {
                testResult.tests.reachability.passed = true;
                testResult.tests.reachability.message = '✅ 服务器可访问';
            } else {
                testResult.tests.reachability.message = `❌ 服务器返回状态码 ${response.status}`;
            }
            
            // Check authentication
            if (response.status === 200) {
                testResult.tests.authentication.passed = true;
                testResult.tests.authentication.message = '✅ 认证成功';
            } else if (response.status === 401) {
                testResult.tests.authentication.message = '❌ 认证失败 - 请检查API密钥';
            } else {
                testResult.tests.authentication.message = '⚠️ 无法验证认证状态';
            }
            
            // Check response time
            testResult.tests.responseTime.value = responseTime;
            if (responseTime < 1000) {
                testResult.tests.responseTime.passed = true;
                testResult.tests.responseTime.message = `✅ 响应时间正常 (${responseTime}ms)`;
            } else if (responseTime < 3000) {
                testResult.tests.responseTime.passed = true;
                testResult.tests.responseTime.message = `⚠️ 响应较慢 (${responseTime}ms)`;
            } else {
                testResult.tests.responseTime.message = `❌ 响应超时 (${responseTime}ms)`;
            }
            
            // Overall pass if reachability and auth passed
            testResult.passed = testResult.tests.reachability.passed && 
                               testResult.tests.authentication.passed;
            
        } catch (error) {
            testResult.duration = Date.now() - startTime;
            
            if (error.name === 'AbortError') {
                testResult.tests.reachability.message = '❌ 连接超时 (>3秒)';
            } else if (error.message.includes('Failed to fetch')) {
                testResult.tests.reachability.message = '❌ 无法连接 - 请检查服务是否运行';
            } else {
                testResult.tests.reachability.message = `❌ 连接错误: ${error.message}`;
            }
        }
        
        return testResult;
    }
    
    /**
     * Comprehensive test suite (< 10 seconds)
     */
    async comprehensiveTest(endpoint, apiKey) {
        const result = {
            passed: false,
            duration: 0,
            tests: {
                quickTests: null,
                endpointAvailability: { passed: false, message: '' },
                versionCheck: { passed: false, message: '', version: null },
                analyzeEndpoint: { passed: false, message: '' }
            }
        };
        
        const startTime = Date.now();
        
        try {
            // Run quick tests first
            result.tests.quickTests = await this.quickTest(endpoint, apiKey);
            
            if (!result.tests.quickTests.passed) {
                result.duration = Date.now() - startTime;
                return result;
            }
            
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }
            
            // Test 2: Check analyze endpoint
            try {
                const analyzeResponse = await fetch(`${endpoint}/analyze`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: 'https://example.com',
                        mode: 'test'
                    })
                });
                
                if (analyzeResponse.ok || analyzeResponse.status === 400) {
                    result.tests.analyzeEndpoint.passed = true;
                    result.tests.analyzeEndpoint.message = '✅ 分析端点可用';
                } else {
                    result.tests.analyzeEndpoint.message = `⚠️ 分析端点返回 ${analyzeResponse.status}`;
                }
            } catch (e) {
                result.tests.analyzeEndpoint.message = '❌ 分析端点测试失败';
            }
            
            // Test 3: Try to get version (if endpoint exists)
            try {
                const versionResponse = await fetch(`${endpoint}/version`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (versionResponse.ok) {
                    const versionData = await versionResponse.json();
                    result.tests.versionCheck.passed = true;
                    result.tests.versionCheck.version = versionData.version || 'Unknown';
                    result.tests.versionCheck.message = `✅ 后端版本: ${result.tests.versionCheck.version}`;
                } else {
                    result.tests.versionCheck.message = '⚠️ 无法获取版本信息';
                }
            } catch (e) {
                result.tests.versionCheck.message = '⚠️ 版本端点不可用';
            }
            
            // Overall pass
            result.passed = result.tests.quickTests.passed && 
                           result.tests.analyzeEndpoint.passed;
            
        } catch (error) {
            console.error('Comprehensive test error:', error);
        }
        
        result.duration = Date.now() - startTime;
        return result;
    }
    
    /**
     * Generate test report HTML
     */
    generateTestReport(testResult) {
        let html = '<div style="font-family: monospace; font-size: 13px;">';
        
        html += `<div style="margin-bottom: 15px; padding: 10px; background: ${testResult.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 6px;">`;
        html += `<strong style="color: ${testResult.passed ? '#10b981' : '#ef4444'};">`;
        html += testResult.passed ? '✅ 测试通过' : '❌ 测试失败';
        html += `</strong>`;
        html += ` (总耗时: ${testResult.duration}ms)`;
        html += '</div>';
        
        // Show each test result
        for (const [testName, test] of Object.entries(testResult.tests)) {
            if (test && typeof test === 'object') {
                if (testName === 'quickTests') {
                    html += '<div style="margin: 10px 0;"><strong>快速测试:</strong></div>';
                    for (const [subTest, subResult] of Object.entries(test.tests)) {
                        html += `<div style="margin-left: 20px; padding: 5px;">${subResult.message}</div>`;
                    }
                } else {
                    html += `<div style="margin: 10px 0; padding: 5px;">${test.message}</div>`;
                }
            }
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Format validation errors for display
     */
    formatValidationErrors(validationResult) {
        let message = '';
        
        if (validationResult.errors.length > 0) {
            message += '<strong style="color: #ef4444;">❌ 验证错误:</strong><br>';
            validationResult.errors.forEach(error => {
                message += `• ${error}<br>`;
            });
        }
        
        if (validationResult.warnings.length > 0) {
            if (message) message += '<br>';
            message += '<strong style="color: #f59e0b;">⚠️ 警告:</strong><br>';
            validationResult.warnings.forEach(warning => {
                message += `• ${warning}<br>`;
            });
        }
        
        return message;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PackerValidator = PackerValidator;
}

