// fixed regex configuration in of of content.js问题补丁

// custom regex add configuration class in 在SRCMinerContent支持
class SRCMinerContentRegexFix {
    constructor() {
        this.customRegexConfig = null;
        this.loadCustomRegexConfig();
    }

    /**
     * regular expression custom configuration load
     */
    async loadCustomRegexConfig() {
        try {
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                //console.log('🔄 Content configuration load ScriptregexSettings:', customSettings);
            } else if (result.phantomRegexConfig) {
                // format format convert as phantomRegexConfigregexSettings
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || ''
                };
                //console.log('🔄 Content configuration convert from ScriptphantomRegexConfig:', customSettings);
            }
            
            if (customSettings) {
                this.customRegexConfig = customSettings;
                //console.log('✅ Content regular expression update configuration Script已');
                return true;
            } else {
                //console.log('📋 Content regular expression configuration default use Script');
                return false;
            }
        } catch (error) {
            console.error('❌ Content regular expression custom failed configuration load Script:', error);
            return false;
        }
    }

    /**
     * custom regex extracted use 邮箱
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
                //console.log('🔧 regular expression custom use 邮箱，matched', emails.length, ' item(s) 邮箱');
                return true;
            } catch (error) {
                console.error('regular expression format error custom 邮箱:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * custom regex extracted use 手机号
     */
    extractPhonesWithCustomRegex(content, results) {
        if (this.customRegexConfig && this.customRegexConfig.phoneNumbers && this.customRegexConfig.phoneNumbers.trim()) {
            try {
                const customPhonePattern = new RegExp(this.customRegexConfig.phoneNumbers, 'g');
                const phones = content.match(customPhonePattern) || [];
                phones.forEach(phone => {
                    if (phone && phone.length > 3 && phone.length < 50) {
                        results.phoneNumbers.add(phone);
                        //console.log(`🌐 [DEBUG] custom regex found 手机号 - URL: ${window.location.href}, 手机号: ${phone}`);
                    }
                });
                //console.log('🔧 regular expression custom use 手机号，matched', phones.length, ' item(s) 手机号');
                if (phones.length > 0) {
                    //console.log(`🔍 [DEBUG] custom regex extracted aggregated 手机号 - URL from 源: ${window.location.href}, total count: ${phones.length}`);
                }
                return true;
            } catch (error) {
                console.error('regular expression format error custom 手机号:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * custom regex domain extracted use
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
                //console.log('🔧 regular expression custom domain use，matched', domains.length, 'domain item(s)');
                return true;
            } catch (error) {
                console.error('regular expression format error custom domain:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * custom regex API extracted use
     */
    extractApisWithCustomRegex(content, results) {
        let hasCustomApi = false;
        
        // absolute path API
        if (this.customRegexConfig && this.customRegexConfig.absoluteApis && this.customRegexConfig.absoluteApis.trim()) {
            try {
                const customAbsolutePattern = new RegExp(this.customRegexConfig.absoluteApis, 'g');
                const absoluteApis = content.match(customAbsolutePattern) || [];
                absoluteApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.absoluteApis.add(api);
                    }
                });
                //console.log('🔧 regular expression absolute path API custom use，matched', absoluteApis.length, 'API item(s)');
                hasCustomApi = true;
            } catch (error) {
                console.error('regular expression format error absolute path API custom:', error);
            }
        }
        
        // relative path API
        if (this.customRegexConfig && this.customRegexConfig.relativeApis && this.customRegexConfig.relativeApis.trim()) {
            try {
                const customRelativePattern = new RegExp(this.customRegexConfig.relativeApis, 'g');
                const relativeApis = content.match(customRelativePattern) || [];
                relativeApis.forEach(api => {
                    if (api && api.length > 1 && api.length < 200) {
                        results.relativeApis.add(api);
                    }
                });
                //console.log('🔧 regular expression relative path API custom use，matched', relativeApis.length, 'API item(s)');
                hasCustomApi = true;
            } catch (error) {
                console.error('regular expression format error relative path API custom:', error);
            }
        }
        
        return hasCustomApi;
    }

    /**
     * custom regex sensitive information extracted use
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
                //console.log('🔧 regular expression sensitive information custom use，matched', credentials.length, 'sensitive information item(s)');
                return true;
            } catch (error) {
                console.error('regular expression format error sensitive information custom:', error);
                return false;
            }
        }
        return false;
    }
}

// fixed export class
window.SRCMinerContentRegexFix = SRCMinerContentRegexFix;