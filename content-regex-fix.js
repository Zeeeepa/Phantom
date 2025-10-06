// fixcontent.jsin  regex configuration issue patch

// inSRCMinerContent类in add custom regex configuration support
class SRCMinerContentRegexFix {
    constructor() {
        this.customRegexConfig = null;
        this.loadCustomRegexConfig();
    }

    /**
     * load custom regular expression configuration
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                //console.log('🔄 Content Script load regexSettings configuration:', customSettings);
            } else if (result.phantomRegexConfig) {
                // convertphantomRegexConfig format toregexSettings format
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                //console.log('🔄 Content ScriptfromphantomRegexConfigconvert configuration:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                //console.log('✅ Content Script regular expression configuration already update');
                return true;
            } else {
                //console.log('📋 Content Scriptuse default regular expression configuration');
                return false;
            }
        } catch (error) {
            console.error('❌ Content Script load custom regular expression configuration failed:', error);
            return false;
        }
    }

    /**
     * use custom regex extract email
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
                //console.log('🔧 use custom email regular expression，match 到', emails.length, '个 email');
                return true;
            } catch (error) {
                console.error('custom email regular expression format error:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * use custom regex extract phone number
     */
    extractPhonesWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = content.match(customPhonePattern) || [];
                phones.forEach(phone => {
                    if (phone && phone.length > 3 && phone.length < 50) {
                        results.phoneNumbers.add(phone);
                        //console.log(`🌐 [DEBUG] custom regex phone number 发现 - URL: ${window.location.href}, phone number: ${phone}`);
                    }
                });
                //console.log('🔧 use custom phone number regular expression，match 到', phones.length, '个 phone number');
                if (phones.length > 0) {
                    //console.log(`🔍 [DEBUG] custom regex phone number extract 汇总 - 来源URL: ${window.location.href}, total: ${phones.length}`);
                }
                return true;
            } catch (error) {
                console.error('custom phone number regular expression format error:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * use custom regex extract domain
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
                //console.log('🔧 use custom domain regular expression，match 到', domains.length, '个 domain');
                return true;
            } catch (error) {
                console.error('custom domain regular expression format error:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * use custom regex extract API
     */
    extractApisWithCustomRegex(content, results) {
        let hasCustomApi = false;
        
        // 绝对 path API
        if (this.customRegexConfig && this.customRegexConfig.absoluteApis && this.customRegexConfig.absoluteApis.trim()) {
            try {
                const customAbsolutePattern = new RegExp(this.customRegexConfig.absoluteApis, 'g');
                const absoluteApis = content.match(customAbsolutePattern) || [];
                absoluteApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.absoluteApis.add(api);
                    }
                });
                //console.log('🔧 use custom 绝对 path API regular expression，match 到', absoluteApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('custom 绝对 path API regular expression format error:', error);
            }
        }
        
        // 相对 path API
        if (this.customRegexConfig && this.customRegexConfig.relativeApis && this.customRegexConfig.relativeApis.trim()) {
            try {
                const customRelativePattern = new RegExp(this.customRegexConfig.relativeApis, 'g');
                const relativeApis = content.match(customRelativePattern) || [];
                relativeApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.relativeApis.add(api);
                    }
                });
                //console.log('🔧 use custom 相对 path API regular expression，match 到', relativeApis.length, '个API');
                hasCustomApi = true;
            } catch (error) {
                console.error('custom 相对 path API regular expression format error:', error);
            }
        }
        
        return hasCustomApi;
    }

    /**
     * use custom regex extract 敏感 information
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
                //console.log('🔧 use custom 敏感 information regular expression，match 到', credentials.length, '个敏感 information');
                return true;
            } catch (error) {
                console.error('custom 敏感 information regular expression format error:', error);
                return false;
            }
        }
        return false;
    }
}

// export fix类
window.SRCMinerContentRegexFix = SRCMinerContentRegexFix;