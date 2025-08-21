// 修复content.js中的正则配置问题的补丁

// 在SRCMinerContent类中添加自定义正则配置支持
class SRCMinerContentRegexFix {
    constructor() {
        this.customRegexConfig = null;
        this.loadCustomRegexConfig();
    }

    /**
     * 加载自定义正则表达式配置
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                console.log('🔄 Content Script加载regexSettings配置:', customSettings);
            } else if (result.phantomRegexConfig) {
                // 转换phantomRegexConfig格式为regexSettings格式
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                console.log('🔄 Content Script从phantomRegexConfig转换配置:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                console.log('✅ Content Script正则表达式配置已更新');
                return true;
            } else {
                console.log('📋 Content Script使用默认正则表达式配置');
                return false;
            }
        } catch (error) {
            console.error('❌ Content Script加载自定义正则表达式配置失败:', error);
            return false;
        }
    }

    /**
     * 使用自定义正则提取邮箱
     */
    extractEmailsWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.emails && this.customRegexConfig.emails.trim()) {
            try {
                const customEmailPattern = new RegExp(this.customRegexConfig.emails, 'g');
                const emails = content.match(customEmailPattern) || [];
                emails.forEach(email => {
                    if (email && email.length > 3 && email.length < 100) {
                        results.emails.add(email);
                    }
                });
                console.log('🔧 使用自定义邮箱正则表达式，匹配到', emails.length, '个邮箱');
                return true;
            } catch (error) {
                console.error('自定义邮箱正则表达式格式错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用自定义正则提取手机号
     */
    extractPhonesWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = content.match(customPhonePattern) || [];
                phones.forEach(phone => {
                    if (phone && phone.length > 3 && phone.length < 50) {
                        results.phoneNumbers.add(phone);
                    }
                });
                console.log('🔧 使用自定义手机号正则表达式，匹配到', phones.length, '个手机号');
                return true;
            } catch (error) {
                console.error('自定义手机号正则表达式格式错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用自定义正则提取域名
     */
    extractDomainsWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.domains && this.customRegexConfig.domains.trim()) {
            try {
                const customDomainPattern = new RegExp(this.customRegexConfig.domains, 'g');
                const domains = content.match(customDomainPattern) || [];
                domains.forEach(domain => {
                    if (domain && domain.includes('.') && domain.length > 3 && domain.length < 100) {
                        results.domains.add(domain);
                    }
                });
                console.log('🔧 使用自定义域名正则表达式，匹配到', domains.length, '个域名');
                return true;
            } catch (error) {
                console.error('自定义域名正则表达式格式错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用自定义正则提取API
     */
    extractApisWithCustomRegex(content, results) {
        let hasCustomApi = false;
        
        // 绝对路径API
        if (this.customRegexConfig && this.customRegexConfig.absoluteApis && this.customRegexConfig.absoluteApis.trim()) {
            try {
                const customAbsolutePattern = new RegExp(this.customRegexConfig.absoluteApis, 'g');
                const absoluteApis = content.match(customAbsolutePattern) || [];
                absoluteApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.absoluteApis.add(api);
                    }
                });
                console.log('🔧 使用自定义绝对路径API正则表达式，匹配到', absoluteApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('自定义绝对路径API正则表达式格式错误:', error);
            }
        }
        
        // 相对路径API
        if (this.customRegexConfig && this.customRegexConfig.relativeApis && this.customRegexConfig.relativeApis.trim()) {
            try {
                const customRelativePattern = new RegExp(this.customRegexConfig.relativeApis, 'g');
                const relativeApis = content.match(customRelativePattern) || [];
                relativeApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.relativeApis.add(api);
                    }
                });
                console.log('🔧 使用自定义相对路径API正则表达式，匹配到', relativeApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('自定义相对路径API正则表达式格式错误:', error);
            }
        }
        
        return hasCustomApi;
    }

    /**
     * 使用自定义正则提取敏感信息
     */
    extractCredentialsWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.credentials && this.customRegexConfig.credentials.trim()) {
            try {
                const customCredentialsPattern = new RegExp(this.customRegexConfig.credentials, 'gi');
                const credentials = content.match(customCredentialsPattern) || [];
                credentials.forEach(credential => {
                    if (credential && credential.length > 3 && credential.length < 100) {
                        results.sensitiveKeywords.add(credential);
                    }
                });
                console.log('🔧 使用自定义敏感信息正则表达式，匹配到', credentials.length, '个敏感信息');
                return true;
            } catch (error) {
                console.error('自定义敏感信息正则表达式格式错误:', error);
                return false;
            }
        }
        return false;
    }
}

// 导出修复类
window.SRCMinerContentRegexFix = SRCMinerContentRegexFix;