/**
 * settings manage 器
 * 负责 manage Cookie settings and regular expression configuration
 */
class SettingsManager {
    constructor() {
        this.defaultRegexPatterns = {
            // 绝对 path API
            absoluteApi: [
                '(?<![\\w/\\\\.-])(?:/[\\w.-]+(?:/[\\w.-]+)+|/[\\w.-]+\\.\\w+|[a-zA-Z]:[/\\\\][\\w\\s.-]+(?:[/\\\\][\\w\\s.-]+)+|\\\\\\\\[\\w.-]+(?:[/\\\\][\\w.-]+)+)(?![\\w/\\\\])'
            ].join('|'),
            
            // 相对 path API
            relativeApi: [
                '(?<![\\w/\\\\-])(?:\\.{1,2}/)+(?:[^/ \\t\\r\\n<>|"\\\']+/)*[^/ \\t\\r\\n<>|"\\\']*(?![\\w/\\\\])'
            ].join('|'),
            
            // domain andURL
            domain: [
                '(?<!\\w)(?:[a-zA-Z0-9-]{2,}\\.)+(?:xin|com|cn|net|com\\.cn|vip|top|cc|shop|club|wang|xyz|luxe|site|news|pub|fun|online|win|red|loan|ren|mom|net\\.cn|org|link|biz|bid|help|tech|date|mobi|so|me|tv|co|vc|pw|video|party|pics|website|store|ltd|ink|trade|live|wiki|space|gift|lol|work|band|info|click|photo|market|tel|social|press|game|kim|org\\.cn|games|pro|men|love|studio|rocks|asia|group|science|design|software|engineer|lawyer|fit|beer|tw|我爱你|in国|公司|network|in线|URL|web店|集团|in文web)(?=\\b|(?::\\d{1,5})?(?:\\/|$))(?![.\\w])'
            ].join('|'),
            
            // email address（exclude static resource domain）
            email: [
                '([a-zA-Z0-9\\._\\-]*@[a-zA-Z0-9\\._\\-]{1,63}\\.((?!js|css|jpg|jpeg|png|ico)[a-zA-Z]{2,}))'
            ].join('|'),
            
            // in国大陆 phone number
            phone: [
                '(?<!\\d)1(?:3\\d{2}|4[14-9]\\d|5\\d{2}|66\\d|7[2-35-8]\\d|8\\d{2}|9[89]\\d)\\d{7}(?!\\d)'
            ].join('|'),
            
            // IP address
            ip: [
                '[\'"](([a-zA-Z0-9]+:)?\\/\\/)?\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(\\/.*?)?[\'"]'
            ].join('|'),
            
            
            // ID card 号
            idCard: [
                '[\'"](\\d{8}(0\\d|10|11|12)([0-2]\\d|30|31)\\d{3}$)|(\\d{6}(18|19|20)\\d{2}(0[1-9]|10|11|12)([0-2]\\d|30|31)\\d{3}(\\d|X|x))[\'"]'
            ].join('|'),
            
            // JWT Token
            jwt: [
                '[\'""]ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\\/+-]{10,}\\.[A-Za-z0-9._\\/+-]{10,}[\'""]'
            ].join('|'),
            
            // Bearer Token
            bearerToken: [
                '[Bb]earer\\s+[a-zA-Z0-9\\-=._+/\\\\]{20,500}'
            ].join('|'),
            
            // Basic Auth
            basicAuth: [
                '[Bb]asic\\s+[A-Za-z0-9+/]{18,}={0,2}'
            ].join('|'),
            
            // Authorization Header
            authHeader: [
                '["\'\\\[]*[Aa]uthorization["\'\\\]]*\\s*[:=]\\s*[\'"]?\\b(?:[Tt]oken\\s+)?[a-zA-Z0-9\\-_+/]{20,500}[\'"]?'
            ].join('|'),
            
            // 微信AppID
            wechatAppId: [
                '[\'"](wx[a-z0-9]{15,18})[\'"]',
                '[\'"](ww[a-z0-9]{15,18})[\'"]'
            ].join('|'),
            
            // GitHub Token
            githubToken: [
                '((ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255})'
            ].join('|'),
            
            // GitLab Token
            gitlabToken: [
                'glpat-[a-zA-Z0-9\\-=_]{20,22}'
            ].join('|'),
            
            // AWS key
            awsKey: [
                'AKIA[A-Z0-9]{16}',
                'LTAI[A-Za-z\\d]{12,30}',
                'AKID[A-Za-z\\d]{13,40}'
            ].join('|'),
            
            // Google API Key
            googleApiKey: [
                'AIza[0-9A-Za-z_\\-]{35}'
            ].join('|'),
            
            // Webhook URLs
            webhookUrls: [
                'https:\\/\\/qyapi\\.weixin\\.qq\\.com\\/cgi\\-bin\\/webhook\\/send\\?key=[a-zA-Z0-9\\-]{25,50}',
                'https:\\/\\/oapi\\.dingtalk\\.com\\/robot\\/send\\?access_token=[a-z0-9]{50,80}',
                'https:\\/\\/open\\.feishu\\.cn\\/open\\-apis\\/bot\\/v2\\/hook\\/[a-z0-9\\-]{25,50}',
                'https:\\/\\/hooks\\.slack\\.com\\/services\\/[a-zA-Z0-9\\-_]{6,12}\\/[a-zA-Z0-9\\-_]{6,12}\\/[a-zA-Z0-9\\-_]{15,24}'
            ].join('|'),
            
            // encryption 算法调用检测
            cryptoUsage: [
                '\\b(?:CryptoJS\\.(?:AES|DES)|Base64\\.(?:encode|decode)|btoa|atob|JSEncrypt|rsa|KJUR|\\$\\.md5|md5|sha1|sha256|sha512)(?:\\.\\w+)*\\s*\\([^)]*\\)'
            ].join('|'),
            
            // 敏感 information（综合 mode）
            sensitive: [
                // GitHub 各类 Token
                'github[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?oauth[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?api[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?access[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?client[_-]?secret["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // AWS key
                'aws[_-]?access[_-]?key[_-]?id["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'aws[_-]?secret[_-]?access[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'aws[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'awssecretkey["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // Google API Key
                'google[_-]?api[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'google[_-]?client[_-]?secret["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'google[_-]?maps[_-]?api[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // general key field
                '[\\w_-]*?password[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?token[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?secret[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?accesskey[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?bucket[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 私钥
                '-{5}BEGIN[\\s\\S]*?-{5}END[\\s\\S]*?-{5}',
                // 华to云 OSS
                'huawei\\.oss\\.(ak|sk|bucket\\.name|endpoint|local\\.path)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 其他 service key
                'stripe[_-]?(secret|private|publishable)[-_]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'slack[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'twilio[_-]?(token|sid|api[_-]?key|api[_-]?secret)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'firebase[_-]?(token|key|api[_-]?token)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'mailgun[_-]?(api[_-]?key|secret[_-]?api[_-]?key)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'docker[_-]?(token|password|key|hub[_-]?password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'npm[_-]?(token|api[_-]?key|auth[_-]?token|password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?'
            ].join('|'),
            
            // GitHub link
            github: [
                'https?://github\\.com/[a-zA-Z0-9_\\-\\.]+/[a-zA-Z0-9_\\-\\.]+'
            ].join('|'),
            
            // Vue file
            vue: [
                '["\'][^"\']*\\.vue["\']'
            ].join('|'),
            
            // 公司名称
            company: [
            // in文公司名称 mode
            '(?:[\\u4e00-\\u9fa5\\（\\）]{4,15}(?:公司|in心))',
            '(?:[\\u4e00-\\u9fa5]{2,15}(?:软件|科技|集团))',
    
            // 英文公司名称 mode（新增）
            '[A-Z][a-zA-Z\\s]{2,30}(?:Inc|Corp|LLC|Ltd|Company|Group|Technology|Systems)',
    
            // extension  in文公司 type（新增）
            '(?:公司|集团|企业|有限责任公司|股份有限公司|科技|network|information|技术)[\\u4e00-\\u9fa5]{2,20}(?:公司|集团|企业|有限责任公司|股份有限公司)'
            ].join('|'),
            
            // comment
            comment: [
            '<!--(?![\\s\\S]*?Performance optimized)[\\s\\S]*?(?!<|=|\\*)-->',
            '/\\*(?![\\s\\S]*?Performance optimized)(?![\\s\\S]*External (?:script|stylesheet):)[\\s\\S]*?(?!<|=|\\*)\\*/',
            '(?:^|[^\\w"\'\':=/])(?!.*Performance optimized)(?!.*External (?:script|stylesheet))//(?!=|\\*|<)((?:(?!<|=|\\*)[^])*?)(?=<|$)'
            ].join('|')
        };
        
        this.init();
    }

    /**
     * initialize settings manage 器
     */
    init() {
        this.bindEvents();
        this.loadSettings();
    }

    /**
     * 绑定 event listener
     */
    bindEvents() {
        // request 头相关 button
        document.getElementById('addHeaderBtn')?.addEventListener('click', () => this.addHeaderInput());
        document.getElementById('getCookieBtn')?.addEventListener('click', () => this.getCurrentCookie());
        document.getElementById('saveHeadersBtn')?.addEventListener('click', () => this.saveHeaders());
        document.getElementById('clearHeadersBtn')?.addEventListener('click', () => this.clearHeaders());
        
        // regex configuration 相关 button
        document.getElementById('saveRegexBtn')?.addEventListener('click', () => this.saveRegexConfig());
        document.getElementById('resetRegexBtn')?.addEventListener('click', () => this.resetRegexConfig());
        
        // data manage button
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearAllData());
        
        // domain scan settings
        document.getElementById('allowSubdomains')?.addEventListener('change', () => this.saveDomainScanSettings());
        document.getElementById('allowAllDomains')?.addEventListener('change', () => this.saveDomainScanSettings());
    }

    /**
     * load settings
     */
    async loadSettings() {
        try {
            // load request 头 settings
            const result = await chrome.storage.local.get(['phantomHeaders', 'phantomRegexConfig', 'regexSettings', 'domainScanSettings']);
            
            // load request 头 configuration
            this.loadHeaders(result.phantomHeaders || []);
            
            // load regex configuration
            const regexConfig = result.phantomRegexConfig || this.defaultRegexPatterns;

            // 如果 regexSettings do not存in，基于 current configuration 构建并 save，保证全链路生效
            if (!result.regexSettings) {
                const regexSettings = {
                    absoluteApis: regexConfig.absoluteApi || this.defaultRegexPatterns.absoluteApi,
                    relativeApis: regexConfig.relativeApi || this.defaultRegexPatterns.relativeApi,
                    domains: regexConfig.domain || this.defaultRegexPatterns.domain,
                    emails: regexConfig.email || this.defaultRegexPatterns.email,
                    phoneNumbers: regexConfig.phone || this.defaultRegexPatterns.phone,
                    credentials: regexConfig.sensitive || this.defaultRegexPatterns.sensitive,
                    ipAddresses: regexConfig.ip || this.defaultRegexPatterns.ip,
                    jwts: regexConfig.jwt || this.defaultRegexPatterns.jwt,
                    githubUrls: regexConfig.github || this.defaultRegexPatterns.github,
                    vueFiles: regexConfig.vue || this.defaultRegexPatterns.vue,
                    companies: regexConfig.company || this.defaultRegexPatterns.company,
                    comments: regexConfig.comment || this.defaultRegexPatterns.comment,
                    // extension 项
                    idCards: regexConfig.idCard || this.defaultRegexPatterns.idCard,
                    bearerTokens: regexConfig.bearerToken || this.defaultRegexPatterns.bearerToken,
                    basicAuth: regexConfig.basicAuth || this.defaultRegexPatterns.basicAuth,
                    authHeaders: regexConfig.authHeader || this.defaultRegexPatterns.authHeader,
                    wechatAppIds: regexConfig.wechatAppId || this.defaultRegexPatterns.wechatAppId,
                    awsKeys: regexConfig.awsKey || this.defaultRegexPatterns.awsKey,
                    googleApiKeys: regexConfig.googleApiKey || this.defaultRegexPatterns.googleApiKey,
                    githubTokens: regexConfig.githubToken || this.defaultRegexPatterns.githubToken,
                    gitlabTokens: regexConfig.gitlabToken || this.defaultRegexPatterns.gitlabToken,
                    webhookUrls: regexConfig.webhookUrls || this.defaultRegexPatterns.webhookUrls,
                    cryptoUsage: regexConfig.cryptoUsage || this.defaultRegexPatterns.cryptoUsage
                };
                await chrome.storage.local.set({ regexSettings });
                //console.log('✅ already构建并 save default regexSettings（首次 initialize）');
                // notification 其他 module configuration already update
                this.notifyConfigUpdate(regexSettings);
            }
            document.getElementById('absoluteApiRegex').value = regexConfig.absoluteApi || this.defaultRegexPatterns.absoluteApi;
            document.getElementById('relativeApiRegex').value = regexConfig.relativeApi || this.defaultRegexPatterns.relativeApi;
            document.getElementById('domainRegex').value = regexConfig.domain || this.defaultRegexPatterns.domain;
            document.getElementById('emailRegex').value = regexConfig.email || this.defaultRegexPatterns.email;
            document.getElementById('phoneRegex').value = regexConfig.phone || this.defaultRegexPatterns.phone;
            document.getElementById('sensitiveRegex').value = regexConfig.sensitive || this.defaultRegexPatterns.sensitive;
            document.getElementById('ipRegex').value = regexConfig.ip || this.defaultRegexPatterns.ip;
            document.getElementById('jwtRegex').value = regexConfig.jwt || this.defaultRegexPatterns.jwt;
            document.getElementById('githubRegex').value = regexConfig.github || this.defaultRegexPatterns.github;
            document.getElementById('vueRegex').value = regexConfig.vue || this.defaultRegexPatterns.vue;
            document.getElementById('companyRegex').value = regexConfig.company || this.defaultRegexPatterns.company;
            document.getElementById('commentRegex').value = regexConfig.comment || this.defaultRegexPatterns.comment;
            
            // 新增  regular expression input
            document.getElementById('idCardRegex').value = regexConfig.idCard || this.defaultRegexPatterns.idCard;
            document.getElementById('bearerTokenRegex').value = regexConfig.bearerToken || this.defaultRegexPatterns.bearerToken;
            document.getElementById('basicAuthRegex').value = regexConfig.basicAuth || this.defaultRegexPatterns.basicAuth;
            document.getElementById('authHeaderRegex').value = regexConfig.authHeader || this.defaultRegexPatterns.authHeader;
            document.getElementById('wechatAppIdRegex').value = regexConfig.wechatAppId || this.defaultRegexPatterns.wechatAppId;
            document.getElementById('awsKeyRegex').value = regexConfig.awsKey || this.defaultRegexPatterns.awsKey;
            document.getElementById('googleApiKeyRegex').value = regexConfig.googleApiKey || this.defaultRegexPatterns.googleApiKey;
            document.getElementById('githubTokenRegex').value = regexConfig.githubToken || this.defaultRegexPatterns.githubToken;
            document.getElementById('gitlabTokenRegex').value = regexConfig.gitlabToken || this.defaultRegexPatterns.gitlabToken;
            document.getElementById('webhookUrlsRegex').value = regexConfig.webhookUrls || this.defaultRegexPatterns.webhookUrls;
            document.getElementById('cryptoUsageRegex').value = regexConfig.cryptoUsage || this.defaultRegexPatterns.cryptoUsage;
            
            // load domain scan settings
            const domainScanSettings = result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
            
            const allowSubdomainsEl = document.getElementById('allowSubdomains');
            const allowAllDomainsEl = document.getElementById('allowAllDomains');
            
            if (allowSubdomainsEl) {
                allowSubdomainsEl.checked = domainScanSettings.allowSubdomains;
            }
            if (allowAllDomainsEl) {
                allowAllDomainsEl.checked = domainScanSettings.allowAllDomains;
            }
            
        } catch (error) {
            console.error('load settings failed:', error);
        }
    }

    /**
     * save domain scan settings
     */
    async saveDomainScanSettings() {
        try {
            const allowSubdomainsEl = document.getElementById('allowSubdomains');
            const allowAllDomainsEl = document.getElementById('allowAllDomains');
            
            const domainScanSettings = {
                allowSubdomains: allowSubdomainsEl ? allowSubdomainsEl.checked : false,
                allowAllDomains: allowAllDomainsEl ? allowAllDomainsEl.checked : false
            };
            
            // 互斥逻辑：如果选择了"all domain"，则自动启用"子 domain"
            if (domainScanSettings.allowAllDomains && allowSubdomainsEl) {
                allowSubdomainsEl.checked = true;
                domainScanSettings.allowSubdomains = true;
            }
            
            await chrome.storage.local.set({ domainScanSettings });
            
            let message = 'domain scan settings already save！';
            if (domainScanSettings.allowAllDomains) {
                message += ' already enable all domain scan（contains 子 domain）';
            } else if (domainScanSettings.allowSubdomains) {
                message += ' already enable 子 domain scan';
            } else {
                message += ' already limit to同 domain scan';
            }
            
            this.showMessage(message, 'success');
            
            // 触发 event notification 其他 module
            window.dispatchEvent(new CustomEvent('domainScanSettingsUpdated', { 
                detail: domainScanSettings 
            }));
            
        } catch (error) {
            console.error('save domain scan settings failed:', error);
            this.showMessage('save settings failed: ' + error.message, 'error');
        }
    }

    /**
     * 获取 current web站 Cookie并 add to request 头
     */
    async getCurrentCookie() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showMessage('无法获取 current tab 页 information', 'error');
                return;
            }

            const url = new URL(tab.url);
            const cookies = await chrome.cookies.getAll({ domain: url.hostname });
            
            if (cookies.length === 0) {
                this.showMessage('current web站没有Cookie', 'warning');
                return;
            }

            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            // add Cookie作to request 头
            this.addHeaderInput('Cookie', cookieString);
            this.showMessage('Cookiealready add to request 头', 'success');
            
        } catch (error) {
            console.error('获取Cookie failed:', error);
            this.showMessage('获取Cookie failed: ' + error.message, 'error');
        }
    }

    /**
     * save regular expression settings
     */
    async saveRegexSettings() {
        try {
            const regexSettings = {};
            
            // 收集all regular expression settings
            const regexItems = document.querySelectorAll('.regex-item');
            regexItems.forEach(item => {
                const textarea = item.querySelector('textarea');
                const category = textarea.id.replace('regex-', '');
                regexSettings[category] = textarea.value.trim();
            });
            
            // save 到Chrome storage
            await chrome.storage.local.set({ regexSettings });
            
            //console.log('regular expression settings already save:', regexSettings);
            
            // notification PatternExtractor重新 load configuration
            if (window.patternExtractor) {
                await window.patternExtractor.loadCustomPatterns();
                //console.log('✅ PatternExtractoralready重新 load configuration');
            }
            
            this.showMessage('regular expression settings save success！configuration already生效', 'success');
            
        } catch (error) {
            console.error('save regular expression settings failed:', error);
            this.showMessage('save regular expression settings failed: ' + error.message, 'error');
        }
    }

    /**
     * save regex configuration
     */
    async saveRegexConfig() {
        try {
            const regexConfig = {
                absoluteApi: document.getElementById('absoluteApiRegex').value.trim(),
                relativeApi: document.getElementById('relativeApiRegex').value.trim(),
                domain: document.getElementById('domainRegex').value.trim(),
                email: document.getElementById('emailRegex').value.trim(),
                phone: document.getElementById('phoneRegex').value.trim(),
                sensitive: document.getElementById('sensitiveRegex').value.trim(),
                ip: document.getElementById('ipRegex').value.trim(),
                jwt: document.getElementById('jwtRegex').value.trim(),
                github: document.getElementById('githubRegex').value.trim(),
                vue: document.getElementById('vueRegex').value.trim(),
                company: document.getElementById('companyRegex').value.trim(),
                comment: document.getElementById('commentRegex').value.trim(),
                
                idCard: document.getElementById('idCardRegex').value.trim(),
                bearerToken: document.getElementById('bearerTokenRegex').value.trim(),
                basicAuth: document.getElementById('basicAuthRegex').value.trim(),
                authHeader: document.getElementById('authHeaderRegex').value.trim(),
                wechatAppId: document.getElementById('wechatAppIdRegex').value.trim(),
                awsKey: document.getElementById('awsKeyRegex').value.trim(),
                googleApiKey: document.getElementById('googleApiKeyRegex').value.trim(),
                githubToken: document.getElementById('githubTokenRegex').value.trim(),
                gitlabToken: document.getElementById('gitlabTokenRegex').value.trim(),
                webhookUrls: document.getElementById('webhookUrlsRegex').value.trim(),
                cryptoUsage: document.getElementById('cryptoUsageRegex').value.trim()
            };

            // validate regular expression
            for (const [key, pattern] of Object.entries(regexConfig)) {
                if (pattern) {
                    try {
                        new RegExp(pattern, 'gi');
                    } catch (e) {
                        this.showMessage(`${key} regular expression format error: ${e.message}`, 'error');
                        return;
                    }
                }
            }

            // converttoPatternExtractor期望  format
            const regexSettings = {
                absoluteApis: regexConfig.absoluteApi || this.defaultRegexPatterns.absoluteApi,
                relativeApis: regexConfig.relativeApi || this.defaultRegexPatterns.relativeApi,
                domains: regexConfig.domain || this.defaultRegexPatterns.domain,
                emails: regexConfig.email || this.defaultRegexPatterns.email,
                phoneNumbers: regexConfig.phone || this.defaultRegexPatterns.phone,
                credentials: regexConfig.sensitive || this.defaultRegexPatterns.sensitive,
                ipAddresses: regexConfig.ip || this.defaultRegexPatterns.ip,
                jwts: regexConfig.jwt || this.defaultRegexPatterns.jwt,
                githubUrls: regexConfig.github || this.defaultRegexPatterns.github,
                vueFiles: regexConfig.vue || this.defaultRegexPatterns.vue,
                companies: regexConfig.company || this.defaultRegexPatterns.company,
                comments: regexConfig.comment || this.defaultRegexPatterns.comment,
                // 新增  regular expression configuration map
                idCards: regexConfig.idCard || this.defaultRegexPatterns.idCard,
                bearerTokens: regexConfig.bearerToken || this.defaultRegexPatterns.bearerToken,
                basicAuth: regexConfig.basicAuth || this.defaultRegexPatterns.basicAuth,
                authHeaders: regexConfig.authHeader || this.defaultRegexPatterns.authHeader,
                wechatAppIds: regexConfig.wechatAppId || this.defaultRegexPatterns.wechatAppId,
                awsKeys: regexConfig.awsKey || this.defaultRegexPatterns.awsKey,
                googleApiKeys: regexConfig.googleApiKey || this.defaultRegexPatterns.googleApiKey,
                githubTokens: regexConfig.githubToken || this.defaultRegexPatterns.githubToken,
                gitlabTokens: regexConfig.gitlabToken || this.defaultRegexPatterns.gitlabToken,
                webhookUrls: regexConfig.webhookUrls || this.defaultRegexPatterns.webhookUrls,
                cryptoUsage: regexConfig.cryptoUsage || this.defaultRegexPatterns.cryptoUsage
            };

            // 同时 save 两种 format 以保持兼容性
            await chrome.storage.local.set({ 
                phantomRegexConfig: regexConfig,
                regexSettings: regexSettings
            });
            
            //console.log('✅ regex configuration already save:', { regexConfig, regexSettings });
            
            this.showMessage('regex configuration save success', 'success');
            
            // notification 其他 module configuration already update
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('save regex configuration failed:', error);
            this.showMessage('save regex configuration failed: ' + error.message, 'error');
        }
    }

    /**
     * 重置 regex configuration to default value
     */
    async resetRegexConfig() {
        try {
            // check 并 settings 绝对 path and相对 path API regex
            const absoluteApiRegex = document.getElementById('absoluteApiRegex');
            const relativeApiRegex = document.getElementById('relativeApiRegex');
            
            if (absoluteApiRegex) {
                absoluteApiRegex.value = this.defaultRegexPatterns.absoluteApi;
            }
            if (relativeApiRegex) {
                relativeApiRegex.value = this.defaultRegexPatterns.relativeApi;
            }
            
            // check 并 settings 其他 regular expression input
            const regexElements = [
                { id: 'domainRegex', pattern: 'domain' },
                { id: 'emailRegex', pattern: 'email' },
                { id: 'phoneRegex', pattern: 'phone' },
                { id: 'sensitiveRegex', pattern: 'sensitive' },
                { id: 'ipRegex', pattern: 'ip' },
                { id: 'jwtRegex', pattern: 'jwt' },
                { id: 'githubRegex', pattern: 'github' },
                { id: 'vueRegex', pattern: 'vue' },
                { id: 'companyRegex', pattern: 'company' },
                { id: 'commentRegex', pattern: 'comment' },
                { id: 'idCardRegex', pattern: 'idCard' },
                { id: 'bearerTokenRegex', pattern: 'bearerToken' },
                { id: 'basicAuthRegex', pattern: 'basicAuth' },
                { id: 'authHeaderRegex', pattern: 'authHeader' },
                { id: 'wechatAppIdRegex', pattern: 'wechatAppId' },
                { id: 'awsKeyRegex', pattern: 'awsKey' },
                { id: 'googleApiKeyRegex', pattern: 'googleApiKey' },
                { id: 'githubTokenRegex', pattern: 'githubToken' },
                { id: 'gitlabTokenRegex', pattern: 'gitlabToken' },
                { id: 'webhookUrlsRegex', pattern: 'webhookUrls' },
                { id: 'cryptoUsageRegex', pattern: 'cryptoUsage' }
            ];
            
            regexElements.forEach(({ id, pattern }) => {
                const element = document.getElementById(id);
                if (element && this.defaultRegexPatterns[pattern]) {
                    element.value = this.defaultRegexPatterns[pattern];
                }
            });
            
            // converttoPatternExtractor期望  format
            const regexSettings = {
                absoluteApis: this.defaultRegexPatterns.absoluteApi,
                relativeApis: this.defaultRegexPatterns.relativeApi,
                domains: this.defaultRegexPatterns.domain,
                emails: this.defaultRegexPatterns.email,
                phoneNumbers: this.defaultRegexPatterns.phone,
                credentials: this.defaultRegexPatterns.sensitive,
                ipAddresses: this.defaultRegexPatterns.ip,
                jwts: this.defaultRegexPatterns.jwt,
                githubUrls: this.defaultRegexPatterns.github,
                vueFiles: this.defaultRegexPatterns.vue,
                companies: this.defaultRegexPatterns.company,
                comments: this.defaultRegexPatterns.comment,
                // 新增  regular expression configuration map
                idCards: this.defaultRegexPatterns.idCard,
                bearerTokens: this.defaultRegexPatterns.bearerToken,
                basicAuth: this.defaultRegexPatterns.basicAuth,
                authHeaders: this.defaultRegexPatterns.authHeader,
                wechatAppIds: this.defaultRegexPatterns.wechatAppId,
                awsKeys: this.defaultRegexPatterns.awsKey,
                googleApiKeys: this.defaultRegexPatterns.googleApiKey,
                githubTokens: this.defaultRegexPatterns.githubToken,
                gitlabTokens: this.defaultRegexPatterns.gitlabToken,
                webhookUrls: this.defaultRegexPatterns.webhookUrls,
                cryptoUsage: this.defaultRegexPatterns.cryptoUsage
            };
            
            // 同时 save 两种 format
            await chrome.storage.local.set({ 
                phantomRegexConfig: this.defaultRegexPatterns,
                regexSettings: regexSettings
            });
            
            //console.log('✅ regex configuration already重置to default value:', { regexSettings });
            
            this.showMessage('regex configuration already重置to default value', 'success');
            
            // notification 其他 module configuration already update
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('重置 regex configuration failed:', error);
            this.showMessage('重置 regex configuration failed: ' + error.message, 'error');
        }
    }

    /**
     * notification 其他 module configuration already update - unified化 version
     */
    notifyConfigUpdate(regexSettings) {
        //console.log('🔄 [SettingsManager] start notification 其他 module configuration already update:', regexSettings);
        
        // force 重新 load PatternExtractor configuration
        if (window.patternExtractor) {
            //console.log('🔄 [SettingsManager] force 重新 load PatternExtractor configuration ...');
            
            // 清除现有 configuration
            window.patternExtractor.patterns = {};
            window.patternExtractor.customPatternsLoaded = false;
            
            // update configuration
            if (typeof window.patternExtractor.updatePatterns === 'function') {
                window.patternExtractor.updatePatterns(regexSettings);
                //console.log('✅ [SettingsManager] PatternExtractor configuration already force update');
            } else {
                console.warn('⚠️ [SettingsManager] PatternExtractor.updatePatterns method do not存in');
            }
        } else {
            console.warn('⚠️ [SettingsManager] PatternExtractor未找到');
        }
        
        // 触发全局 event，notification 其他可能listen  module
        window.dispatchEvent(new CustomEvent('regexConfigUpdated', { 
            detail: regexSettings 
        }));
        
        //console.log('✅ [SettingsManager] configuration update notification complete');
    }

    /**
     * add request 头 input
     */
    addHeaderInput(key = '', value = '') {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        const headerGroup = document.createElement('div');
        headerGroup.className = 'header-input-group';
        
        headerGroup.innerHTML = `
            <input type="text" class="header-key-input" placeholder="request 头名称 (如: Authorization)" value="${key}">
            <input type="text" class="header-value-input" placeholder="request 头 value (如: Bearer token123)" value="${value}">
            <button class="remove-header-btn">delete</button>
        `;
        
        // to delete button add event listener
        const removeBtn = headerGroup.querySelector('.remove-header-btn');
        removeBtn.addEventListener('click', () => {
            headerGroup.remove();
            // delete 后 automatic save
            this.saveHeaders();
        });
        
        container.appendChild(headerGroup);
    }

    /**
     * load request 头 configuration
     */
    loadHeaders(headers) {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        // clear 现有 content
        container.innerHTML = '';

        // 如果没有 save   request 头，add 一个 empty   input
        if (!headers || headers.length === 0) {
            this.addHeaderInput();
            return;
        }

        // load save   request 头
        headers.forEach(header => {
            this.addHeaderInput(header.key, header.value);
        });
    }

    /**
     * save request 头 settings
     */
    async saveHeaders() {
        try {
            const headerInputs = document.querySelectorAll('.header-input-group');
            const headers = [];

            headerInputs.forEach(group => {
                const keyInput = group.querySelector('.header-key-input');
                const valueInput = group.querySelector('.header-value-input');
                
                // add empty value check，防止访问 null object  属性
                if (keyInput && valueInput && keyInput.value && valueInput.value) {
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (key && value) {
                        headers.push({ key, value });
                    }
                }
            });

            await chrome.storage.local.set({ phantomHeaders: headers });
            this.showMessage(`already save ${headers.length} 个 request 头`, 'success');
            
        } catch (error) {
            console.error('save request 头 failed:', error);
            this.showMessage('save request 头 failed: ' + error.message, 'error');
        }
    }

    /**
     * clear request 头 settings
     */
    async clearHeaders() {
        try {
            const container = document.getElementById('headersContainer');
            if (container) {
                container.innerHTML = '';
                this.addHeaderInput(); // add 一个 empty   input
            }
            
            await chrome.storage.local.remove('phantomHeaders');
            this.showMessage('request 头already clear', 'success');
            
        } catch (error) {
            console.error('clear request 头 failed:', error);
            this.showMessage('clear request 头 failed: ' + error.message, 'error');
        }
    }

    /**
     * 获取 current request 头 settings
     */
    async getHeadersSetting() {
        try {
            const result = await chrome.storage.local.get('phantomHeaders');
            return result.phantomHeaders || [];
        } catch (error) {
            console.error('获取 request 头 settings failed:', error);
            return [];
        }
    }

    /**
     * 获取 current Cookie settings（兼容性 method）
     */
    async getCookieSetting() {
        try {
            // 先尝试from新  request 头 settings in获取Cookie
            const headers = await this.getHeadersSetting();
            const cookieHeader = headers.find(header => 
                header.key.toLowerCase() === 'cookie'
            );
            
            if (cookieHeader) {
                return cookieHeader.value;
            }

            // 如果没有找到，尝试from旧 Cookie settings in获取（向后兼容）
            const result = await chrome.storage.local.get('phantomCookie');
            return result.phantomCookie || '';
        } catch (error) {
            console.error('获取Cookie settings failed:', error);
            return '';
        }
    }

    /**
     * 获取 current regex configuration
     */
    async getRegexConfig() {
        try {
            const result = await chrome.storage.local.get('phantomRegexConfig');
            return result.phantomRegexConfig || this.defaultRegexPatterns;
        } catch (error) {
            console.error('获取 regex configuration failed:', error);
            return this.defaultRegexPatterns;
        }
    }

    /**
     * clear all data - 真正解决 automatic save issue
     */
    async clearAllData() {
        // confirm clear 操作
        if (!confirm('⚠️ warning：此操作将 clear all page   scan data！\n\n package 括：\n• all page   scan result \n• deep scan data \n• scan status information \n\n此操作do not可恢复，确定要继续吗？')) {
            return;
        }
        
        // 二次 confirm
        if (!confirm('请再次 confirm：真 要 clear all data 吗？')) {
            return;
        }
        
        try {
            //console.log('🗑️ start clear all data ...');
            
            // 第一步：暂时 disable automatic save 机制，防止 data passive marker重新写入
            let originalSaveResults = null;
            if (window.srcMiner && typeof window.srcMiner.saveResults === 'function') {
                //console.log('🚫 暂时 disable automatic save 机制...');
                originalSaveResults = window.srcMiner.saveResults;
                window.srcMiner.saveResults = () => {
                    //console.log('🚫 automatic save alreadypassive marker暂时 disable');
                };
            }
            
            // 第二步：彻底 clear SRCMiner 实例 内存 data
            if (window.srcMiner) {
                //console.log('🧹 clear SRCMiner实例内存 data ...');
                
                // check 是否有 deep scan 正in运行
                const isDeepScanRunning = window.srcMiner.deepScanRunning;
                //console.log('deep scan 运行 status:', isDeepScanRunning);
                
                // clear all内存in  data
                window.srcMiner.results = {};
                window.srcMiner.deepScanResults = {};
                window.srcMiner.scannedUrls = new Set();
                window.srcMiner.pendingUrls = new Set();
                
                // 只有in没有 deep scan 运行时才重置 scan status
                if (!isDeepScanRunning) {
                    window.srcMiner.deepScanRunning = false;
                    window.srcMiner.currentDepth = 0;
                    //console.log('✅ already重置 scan status');
                } else {
                    //console.log('⚠️ 检测到 deep scan 正in运行，保持 scan status');
                }
            }
            
            // 第三步：获取all storage   key 并identify scan 相关 data
            const allData = await chrome.storage.local.get(null);
            //console.log('📋 current storage  all data key:', Object.keys(allData));
            
            const keysToRemove = [];
            
            // 找出all与 scan data 相关  key（package 括双下划线 format）
            for (const key in allData) {
                if (
                    // 双下划线 format（实际 storage format）
                    key.endsWith('__results') || 
                    key.endsWith('__lastSave') ||
                    // 单下划线 format（兼容性）
                    key.endsWith('_results') || 
                    key.endsWith('_lastSave') ||
                    // 旧 version  全局 key
                    key === 'srcMinerResults' ||
                    key === 'lastSaveTime' ||
                    // 其他可能  scan 相关 key
                    key === 'deepScanComplete' ||
                    key === 'deepScanTimestamp' ||
                    key === 'deepScanUrl' ||
                    key === 'deepScanCompletedAt' ||
                    key === 'deepScanResultsCount' ||
                    key === 'lastDeepScanCompleted' ||
                    key === 'deepScanRunning' ||
                    // lastScan_ 开头  key（automatic scan 时间记录）
                    key.startsWith('lastScan_')
                ) {
                    keysToRemove.push(key);
                }
            }
            
            //console.log(`🔍 找到 ${keysToRemove.length} 个 data key require clear:`, keysToRemove);
            
            // 第四步：delete chrome.storagein 相关 key（keep非 scan data）
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                //console.log(`✅ already delete chrome.storagein  ${keysToRemove.length} 个 data key`);
            }
            
            // 第五步：clear IndexedDBin all scan data
            try {
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                await window.indexedDBManager.clearAllScanResults();
                //console.log('✅ already clear IndexedDBin all scan data');
            } catch (error) {
                console.error('❌ clear IndexedDB data failed:', error);
            }
            
            // 第六步：validate chrome.storage delete result 并 process 残留 data
            const verifyData = await chrome.storage.local.get(keysToRemove);
            const remainingKeys = Object.keys(verifyData);
            
            if (remainingKeys.length > 0) {
                console.warn('⚠️ 发现chrome.storage残留 data key，尝试 force delete:', remainingKeys);
                // 尝试逐个 delete 剩余  key
                for (const key of remainingKeys) {
                    try {
                        await chrome.storage.local.remove([key]);
                        //console.log(`✅ force delete success: ${key}`);
                    } catch (error) {
                        console.error(`❌ force delete failed: ${key}`, error);
                    }
                }
            }
            
            // 第七步：clear 界面 display
            const resultsDiv = document.getElementById('results');
            const statsDiv = document.getElementById('stats');
            if (resultsDiv) {
                resultsDiv.innerHTML = '';
                //console.log('✅ already clear result display 区域');
            }
            if (statsDiv) {
                statsDiv.textContent = '';
                //console.log('✅ already clear statistics display 区域');
            }
            
            // 第八步：重置UI status
            if (window.srcMiner) {
                // 只有in没有 deep scan 运行时才重置UI status
                if (!window.srcMiner.deepScanRunning) {
                    // 重置 deep scan UI status
                    if (typeof window.srcMiner.resetDeepScanUI === 'function') {
                        window.srcMiner.resetDeepScanUI();
                        //console.log('✅ already重置 deep scan UI status');
                    }
                }
                
                // update 分类 select 器
                if (typeof window.srcMiner.updateCategorySelect === 'function') {
                    window.srcMiner.updateCategorySelect();
                    //console.log('✅ already update 分类 select 器');
                }
                
                // force refresh display
                if (typeof window.srcMiner.displayResults === 'function') {
                    window.srcMiner.displayResults();
                    //console.log('✅ already refresh result display');
                }
            }
            
            // 第九步：最终 validate chrome.storage（只 check 非 scan data 相关 key）
            const finalCheck = await chrome.storage.local.get(null);
            const remainingDataKeys = Object.keys(finalCheck).filter(key => 
                key.endsWith('__results') || 
                key.endsWith('__lastSave') ||
                key.endsWith('_results') || 
                key.endsWith('_deepBackup') || 
                key.endsWith('_deepState') || 
                key.endsWith('_lastSave') ||
                key === 'srcMinerResults' ||
                key === 'deepScanResults' ||
                key === 'deepScanBackup' ||
                key === 'deepScanState' ||
                key === 'lastSaveTime' ||
                key.startsWith('lastScan_')
            );
            
            // 第十步：validate IndexedDB clear result
            try {
                const indexedDBStats = await window.indexedDBManager.getStats();
                //console.log('📊 IndexedDB clear 后 statistics:', indexedDBStats);
            } catch (error) {
                console.error('❌ 获取IndexedDB statistics failed:', error);
            }
            
            // 第九步：恢复 automatic save 机制
            if (originalSaveResults && window.srcMiner) {
                setTimeout(() => {
                    window.srcMiner.saveResults = originalSaveResults;
                    //console.log('✅ automatic save 机制already恢复');
                }, 1000); // 1 seconds后恢复，确保 clear 操作完全 complete
            }
            
            // display result
            if (remainingDataKeys.length > 0) {
                console.warn('⚠️ 最终 check 发现残留 data key:', remainingDataKeys);
                this.showMessage(`clear complete，但发现 ${remainingDataKeys.length} 个残留 data key，可能require manual process`, 'warning');
            } else {
                //console.log('✅ data clear validate 通through，无残留 data');
                this.showMessage(`already success clear ${keysToRemove.length} 个 data 项，all scan data already彻底清除`, 'success');
            }
            
        } catch (error) {
            console.error('❌ clear all data failed:', error);
            this.showMessage('clear data failed: ' + error.message, 'error');
        }
    }

    /**
     * display message prompt
     */
    showMessage(message, type = 'info') {
        // 创建 message prompt 元素
        const messageEl = document.createElement('div');
        messageEl.className = `settings-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 6px;
            color: #fff;
            font-size: 12px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#00d4aa' : type === 'error' ? '#e74c3c' : '#f39c12'};
        `;

        document.body.appendChild(messageEl);

        // 3 seconds后 automatic remove
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 获取 domain scan settings
     */
    async getDomainScanSettings() {
        try {
            const result = await chrome.storage.local.get(['domainScanSettings']);
            return result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
        } catch (error) {
            console.error('获取 domain scan settings failed:', error);
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }

    /**
     * 获取 custom regex configuration
     */
    async getCustomRegexConfigs() {
        try {
            const result = await chrome.storage.local.get('customRegexConfigs');
            return result.customRegexConfigs || {};
        } catch (error) {
            console.error('获取 custom regex configuration failed:', error);
            return {};
        }
    }

    /**
     * save custom regex configuration
     */
    async saveCustomRegexConfig(key, config) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            customConfigs[key] = config;
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ custom regex configuration already save:', { key, config });
        } catch (error) {
            console.error('❌ save custom regex configuration failed:', error);
            throw error;
        }
    }

    /**
     * delete custom regex configuration
     */
    async deleteCustomRegexConfig(key) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            delete customConfigs[key];
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ custom regex configuration already delete:', key);
        } catch (error) {
            console.error('❌ delete custom regex configuration failed:', error);
            throw error;
        }
    }
}

// export settings manage 器
window.SettingsManager = SettingsManager;