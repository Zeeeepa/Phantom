// fixcontent.jsinregexconfigurationissuepatch

// inSRCMinerContentclassinaddcustomregexconfigurationsupport
class SRCMinerContentRegexFix {
    constructor() {
        this.customRegexConfig = null;
        this.loadCustomRegexConfig();
    }

    /**
     * loadcustomregexexpressionconfiguration
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                //console.log('🔄 Content ScriptloadregexSettingsconfiguration:', customSettings);
            } else if (result.phantomRegexConfig) {
                // convertphantomRegexConfigformat为regexSettingsformat
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                //console.log('🔄 Content ScriptfromphantomRegexConfigconvertconfiguration:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                //console.log('✅ Content Scriptregexexpressionconfigurationalready更new');
                return true;
            } else {
                //console.log('📋 Content Scriptuse默认regexexpressionconfiguration');
                return false;
            }
        } catch (error) {
            console.error('❌ Content Scriptloadcustomregexexpressionconfigurationfailed:', error);
            return false;
        }
    }

    /**
     * usecustomregexextractemail
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
                //console.log('🔧 usecustomemailregexexpression，matchto', emails.length, '个email');
                return true;
            } catch (error) {
                console.error('customemailregexexpressionformat错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * usecustomregexextractmobile phone
     */
    extractPhonesWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = content.match(customPhonePattern) || [];
                phones.forEach(phone => {
                    if (phone && phone.length > 3 && phone.length < 50) {
                        results.phoneNumbers.add(phone);
                        //console.log(`🌐 [DEBUG] customregexmobile phone发现 - URL: ${window.location.href}, mobile phone: ${phone}`);
                    }
                });
                //console.log('🔧 usecustommobile phoneregexexpression，matchto', phones.length, '个mobile phone');
                if (phones.length > 0) {
                    //console.log(`🔍 [DEBUG] customregexmobile phoneextract汇总 - 来源URL: ${window.location.href}, 总数: ${phones.length}`);
                }
                return true;
            } catch (error) {
                console.error('custommobile phoneregexexpressionformat错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * usecustomregexextractdomain
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
                //console.log('🔧 usecustomdomainregexexpression，matchto', domains.length, '个domain');
                return true;
            } catch (error) {
                console.error('customdomainregexexpressionformat错误:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * usecustomregexextractAPI
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
                //console.log('🔧 usecustom绝对路径APIregexexpression，matchto', absoluteApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('custom绝对路径APIregexexpressionformat错误:', error);
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
                //console.log('🔧 usecustom相对路径APIregexexpression，matchto', relativeApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('custom相对路径APIregexexpressionformat错误:', error);
            }
        }
        
        return hasCustomApi;
    }

    /**
     * usecustomregexextract敏感information
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
                //console.log('🔧 usecustom敏感informationregexexpression，matchto', credentials.length, '个敏感information');
                return true;
            } catch (error) {
                console.error('custom敏感informationregexexpressionformat错误:', error);
                return false;
            }
        }
        return false;
    }
}

// exportfixclass
window.SRCMinerContentRegexFix = SRCMinerContentRegexFix;