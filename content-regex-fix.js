// Fixcontent.js中的正则Configuration问题的补丁

// 在SRCMinerContentClass中AddCustom正则Configuration支持
class SRCMinerContentRegexFix {
    constructor() {
        this.customRegexConfig = null;
        this.loadCustomRegexConfig();
    }

    /**
     * LoadCustomRegular expressionConfiguration
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                //console.log('🔄 Content ScriptLoadregexSettingsConfiguration:', customSettings);
            } else if (result.phantomRegexConfig) {
                // ConvertphantomRegexConfigFormat为regexSettingsFormat
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                //console.log('🔄 Content ScriptfromphantomRegexConfigConvertConfiguration:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                //console.log('✅ Content ScriptRegular expressionConfigurationAlreadyUpdate');
                return true;
            } else {
                //console.log('📋 Content Script使用DefaultRegular expressionConfiguration');
                return false;
            }
        } catch (error) {
            console.error('❌ Content ScriptLoadCustomRegular expressionConfigurationFailed:', error);
            return false;
        }
    }

    /**
     * 使用Custom正则Extract邮箱
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
                //console.log('🔧 使用Custom邮箱Regular expression，Match到', emails.length, '个邮箱');
                return true;
            } catch (error) {
                console.error('Custom邮箱Regular expressionFormatError:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用Custom正则Extract手机号
     */
    extractPhonesWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = content.match(customPhonePattern) || [];
                phones.forEach(phone => {
                    if (phone && phone.length > 3 && phone.length < 50) {
                        results.phoneNumbers.add(phone);
                        //console.log(`🌐 [DEBUG] Custom正则手机号Found - URL: ${window.location.href}, 手机号: ${phone}`);
                    }
                });
                //console.log('🔧 使用Custom手机号Regular expression，Match到', phones.length, '个手机号');
                if (phones.length > 0) {
                    //console.log(`🔍 [DEBUG] Custom正则手机号Extract汇总 - 来SourceURL: ${window.location.href}, 总数: ${phones.length}`);
                }
                return true;
            } catch (error) {
                console.error('Custom手机号Regular expressionFormatError:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用Custom正则ExtractDomain
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
                //console.log('🔧 使用CustomDomainRegular expression，Match到', domains.length, '个Domain');
                return true;
            } catch (error) {
                console.error('CustomDomainRegular expressionFormatError:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * 使用Custom正则ExtractAPI
     */
    extractApisWithCustomRegex(content, results) {
        let hasCustomApi = false;
        
        // Absolute pathAPI
        if (this.customRegexConfig && this.customRegexConfig.absoluteApis && this.customRegexConfig.absoluteApis.trim()) {
            try {
                const customAbsolutePattern = new RegExp(this.customRegexConfig.absoluteApis, 'g');
                const absoluteApis = content.match(customAbsolutePattern) || [];
                absoluteApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.absoluteApis.add(api);
                    }
                });
                //console.log('🔧 使用CustomAbsolute pathAPIRegular expression，Match到', absoluteApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('CustomAbsolute pathAPIRegular expressionFormatError:', error);
            }
        }
        
        // Relative pathAPI
        if (this.customRegexConfig && this.customRegexConfig.relativeApis && this.customRegexConfig.relativeApis.trim()) {
            try {
                const customRelativePattern = new RegExp(this.customRegexConfig.relativeApis, 'g');
                const relativeApis = content.match(customRelativePattern) || [];
                relativeApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.relativeApis.add(api);
                    }
                });
                //console.log('🔧 使用CustomRelative pathAPIRegular expression，Match到', relativeApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('CustomRelative pathAPIRegular expressionFormatError:', error);
            }
        }
        
        return hasCustomApi;
    }

    /**
     * 使用Custom正则Extract敏感Information
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
                //console.log('🔧 使用Custom敏感InformationRegular expression，Match到', credentials.length, '个敏感Information');
                return true;
            } catch (error) {
                console.error('Custom敏感InformationRegular expressionFormatError:', error);
                return false;
            }
        }
        return false;
    }
}

// ExportFixClass
window.SRCMinerContentRegexFix = SRCMinerContentRegexFix;