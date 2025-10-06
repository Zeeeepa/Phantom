/**
 * settings管理器
 * 负责管理Cookiesettingsandregexexpressionconfiguration
 */
class SettingsManager {
    constructor() {
        this.defaultRegexPatterns = {
            // 绝对路径API
            absoluteApi: [
                '(?<![\\w/\\\\.-])(?:/[\\w.-]+(?:/[\\w.-]+)+|/[\\w.-]+\\.\\w+|[a-zA-Z]:[/\\\\][\\w\\s.-]+(?:[/\\\\][\\w\\s.-]+)+|\\\\\\\\[\\w.-]+(?:[/\\\\][\\w.-]+)+)(?![\\w/\\\\])'
            ].join('|'),
            
            // 相对路径API
            relativeApi: [
                '(?<![\\w/\\\\-])(?:\\.{1,2}/)+(?:[^/ \\t\\r\\n<>|"\\\']+/)*[^/ \\t\\r\\n<>|"\\\']*(?![\\w/\\\\])'
            ].join('|'),
            
            // domainandURL
            domain: [
                '(?<!\\w)(?:[a-zA-Z0-9-]{2,}\\.)+(?:xin|com|cn|net|com\\.cn|vip|top|cc|shop|club|wang|xyz|luxe|site|news|pub|fun|online|win|red|loan|ren|mom|net\\.cn|org|link|biz|bid|help|tech|date|mobi|so|me|tv|co|vc|pw|video|party|pics|website|store|ltd|ink|trade|live|wiki|space|gift|lol|work|band|info|click|photo|market|tel|social|press|game|kim|org\\.cn|games|pro|men|love|studio|rocks|asia|group|science|design|software|engineer|lawyer|fit|beer|tw|我爱你|China|company|network|in线|网址|网店|集团|in文网)(?=\\b|(?::\\d{1,5})?(?:\\/|$))(?![.\\w])'
            ].join('|'),
            
            // email地址（exclude静态资源domain）
            email: [
                '([a-zA-Z0-9\\._\\-]*@[a-zA-Z0-9\\._\\-]{1,63}\\.((?!js|css|jpg|jpeg|png|ico)[a-zA-Z]{2,}))'
            ].join('|'),
            
            // Chinamainlandmobile phone
            phone: [
                '(?<!\\d)1(?:3\\d{2}|4[14-9]\\d|5\\d{2}|66\\d|7[2-35-8]\\d|8\\d{2}|9[89]\\d)\\d{7}(?!\\d)'
            ].join('|'),
            
            // IP地址
            ip: [
                '[\'"](([a-zA-Z0-9]+:)?\\/\\/)?\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(\\/.*?)?[\'"]'
            ].join('|'),
            
            
            // ID card号
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
            
            // AWS密钥
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
            
            // 加密算法调fordetect
            cryptoUsage: [
                '\\b(?:CryptoJS\\.(?:AES|DES)|Base64\\.(?:encode|decode)|btoa|atob|JSEncrypt|rsa|KJUR|\\$\\.md5|md5|sha1|sha256|sha512)(?:\\.\\w+)*\\s*\\([^)]*\\)'
            ].join('|'),
            
            // 敏感information（综合pattern）
            sensitive: [
                // GitHub 各class Token
                'github[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?oauth[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?api[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?access[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'github[_-]?client[_-]?secret["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // AWS 密钥
                'aws[_-]?access[_-]?key[_-]?id["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'aws[_-]?secret[_-]?access[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'aws[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'awssecretkey["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // Google API Key
                'google[_-]?api[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'google[_-]?client[_-]?secret["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'google[_-]?maps[_-]?api[_-]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // general密钥字段
                '[\\w_-]*?password[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?token[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?secret[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?accesskey[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?bucket[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 私钥
                '-{5}BEGIN[\\s\\S]*?-{5}END[\\s\\S]*?-{5}',
                // 华为云 OSS
                'huawei\\.oss\\.(ak|sk|bucket\\.name|endpoint|local\\.path)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 其他service密钥
                'stripe[_-]?(secret|private|publishable)[-_]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'slack[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'twilio[_-]?(token|sid|api[_-]?key|api[_-]?secret)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'firebase[_-]?(token|key|api[_-]?token)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'mailgun[_-]?(api[_-]?key|secret[_-]?api[_-]?key)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'docker[_-]?(token|password|key|hub[_-]?password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'npm[_-]?(token|api[_-]?key|auth[_-]?token|password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?'
            ].join('|'),
            
            // GitHub链接
            github: [
                'https?://github\\.com/[a-zA-Z0-9_\\-\\.]+/[a-zA-Z0-9_\\-\\.]+'
            ].join('|'),
            
            // Vue文件
            vue: [
                '["\'][^"\']*\\.vue["\']'
            ].join('|'),
            
            // company名称
            company: [
            // in文company名称pattern
            '(?:[\\u4e00-\\u9fa5\\（\\）]{4,15}(?:company|in心))',
            '(?:[\\u4e00-\\u9fa5]{2,15}(?:软件|科技|集团))',
    
            // 英文company名称pattern（new增）
            '[A-Z][a-zA-Z\\s]{2,30}(?:Inc|Corp|LLC|Ltd|Company|Group|Technology|Systems)',
    
            // 扩展in文companyclass型（new增）
            '(?:company|集团|enterprise|有限责任company|股份有限company|科技|network|information|技术)[\\u4e00-\\u9fa5]{2,20}(?:company|集团|enterprise|有限责任company|股份有限company)'
            ].join('|'),
            
            // 注释
            comment: [
            '<!--(?![\\s\\S]*?Performance optimized)[\\s\\S]*?(?!<|=|\\*)-->',
            '/\\*(?![\\s\\S]*?Performance optimized)(?![\\s\\S]*External (?:script|stylesheet):)[\\s\\S]*?(?!<|=|\\*)\\*/',
            '(?:^|[^\\w"\'\':=/])(?!.*Performance optimized)(?!.*External (?:script|stylesheet))//(?!=|\\*|<)((?:(?!<|=|\\*)[^])*?)(?=<|$)'
            ].join('|')
        };
        
        this.init();
    }

    /**
     * initializesettings管理器
     */
    init() {
        this.bindEvents();
        this.loadSettings();
    }

    /**
     * 绑定eventlistener
     */
    bindEvents() {
        // request头相关button
        document.getElementById('addHeaderBtn')?.addEventListener('click', () => this.addHeaderInput());
        document.getElementById('getCookieBtn')?.addEventListener('click', () => this.getCurrentCookie());
        document.getElementById('saveHeadersBtn')?.addEventListener('click', () => this.saveHeaders());
        document.getElementById('clearHeadersBtn')?.addEventListener('click', () => this.clearHeaders());
        
        // regexconfiguration相关button
        document.getElementById('saveRegexBtn')?.addEventListener('click', () => this.saveRegexConfig());
        document.getElementById('resetRegexBtn')?.addEventListener('click', () => this.resetRegexConfig());
        
        // data管理button
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearAllData());
        
        // domainscansettings
        document.getElementById('allowSubdomains')?.addEventListener('change', () => this.saveDomainScanSettings());
        document.getElementById('allowAllDomains')?.addEventListener('change', () => this.saveDomainScanSettings());
    }

    /**
     * loadsettings
     */
    async loadSettings() {
        try {
            // loadrequest头settings
            const result = await chrome.storage.local.get(['phantomHeaders', 'phantomRegexConfig', 'regexSettings', 'domainScanSettings']);
            
            // loadrequest头configuration
            this.loadHeaders(result.phantomHeaders || []);
            
            // loadregexconfiguration
            const regexConfig = result.phantomRegexConfig || this.defaultRegexPatterns;

            // if regexSettings notexists，基于当beforeconfiguration构建and保存，保证全链路生效
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
                    // 扩展项
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
                //console.log('✅ already构建and保存默认 regexSettings（首次initialize）');
                // notify其他mod块configurationalready更new
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
            
            // new增regexexpression输入框
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
            
            // loaddomainscansettings
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
            console.error('loadsettingsfailed:', error);
        }
    }

    /**
     * 保存domainscansettings
     */
    async saveDomainScanSettings() {
        try {
            const allowSubdomainsEl = document.getElementById('allowSubdomains');
            const allowAllDomainsEl = document.getElementById('allowAllDomains');
            
            const domainScanSettings = {
                allowSubdomains: allowSubdomainsEl ? allowSubdomainsEl.checked : false,
                allowAllDomains: allowAllDomainsEl ? allowAllDomainsEl.checked : false
            };
            
            // 互斥逻辑：if选择了"alldomain"，则automatic启for"子domain"
            if (domainScanSettings.allowAllDomains && allowSubdomainsEl) {
                allowSubdomainsEl.checked = true;
                domainScanSettings.allowSubdomains = true;
            }
            
            await chrome.storage.local.set({ domainScanSettings });
            
            let message = 'domainscansettingsalready保存！';
            if (domainScanSettings.allowAllDomains) {
                message += ' already启foralldomainscan（contains子domain）';
            } else if (domainScanSettings.allowSubdomains) {
                message += ' already启for子domainscan';
            } else {
                message += ' already限制为同domainscan';
            }
            
            this.showMessage(message, 'success');
            
            // 触发eventnotify其他mod块
            window.dispatchEvent(new CustomEvent('domainScanSettingsUpdated', { 
                detail: domainScanSettings 
            }));
            
        } catch (error) {
            console.error('保存domainscansettingsfailed:', error);
            this.showMessage('保存settingsfailed: ' + error.message, 'error');
        }
    }

    /**
     * get当before网站Cookieandadd为request头
     */
    async getCurrentCookie() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showMessage('无法get当before标签pageinformation', 'error');
                return;
            }

            const url = new URL(tab.url);
            const cookies = await chrome.cookies.getAll({ domain: url.hostname });
            
            if (cookies.length === 0) {
                this.showMessage('当before网站withoutCookie', 'warning');
                return;
            }

            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            // addCookie作为request头
            this.addHeaderInput('Cookie', cookieString);
            this.showMessage('Cookiealreadyadd为request头', 'success');
            
        } catch (error) {
            console.error('getCookiefailed:', error);
            this.showMessage('getCookiefailed: ' + error.message, 'error');
        }
    }

    /**
     * 保存regexexpressionsettings
     */
    async saveRegexSettings() {
        try {
            const regexSettings = {};
            
            // 收集allregexexpressionsettings
            const regexItems = document.querySelectorAll('.regex-item');
            regexItems.forEach(item => {
                const textarea = item.querySelector('textarea');
                const category = textarea.id.replace('regex-', '');
                regexSettings[category] = textarea.value.trim();
            });
            
            // 保存toChromestorage
            await chrome.storage.local.set({ regexSettings });
            
            //console.log('regexexpressionsettingsalready保存:', regexSettings);
            
            // notifyPatternExtractor重newloadconfiguration
            if (window.patternExtractor) {
                await window.patternExtractor.loadCustomPatterns();
                //console.log('✅ PatternExtractoralready重newloadconfiguration');
            }
            
            this.showMessage('regexexpressionsettings保存success！configurationalready生效', 'success');
            
        } catch (error) {
            console.error('保存regexexpressionsettingsfailed:', error);
            this.showMessage('保存regexexpressionsettingsfailed: ' + error.message, 'error');
        }
    }

    /**
     * 保存regexconfiguration
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

            // validationregexexpression
            for (const [key, pattern] of Object.entries(regexConfig)) {
                if (pattern) {
                    try {
                        new RegExp(pattern, 'gi');
                    } catch (e) {
                        this.showMessage(`${key}regexexpressionformat错误: ${e.message}`, 'error');
                        return;
                    }
                }
            }

            // convert为PatternExtractor期望format
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
                // new增regexexpressionconfiguration映射
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

            // 同时保存两种format以keep兼容性
            await chrome.storage.local.set({ 
                phantomRegexConfig: regexConfig,
                regexSettings: regexSettings
            });
            
            //console.log('✅ regexconfigurationalready保存:', { regexConfig, regexSettings });
            
            this.showMessage('regexconfiguration保存success', 'success');
            
            // notify其他mod块configurationalready更new
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('保存regexconfigurationfailed:', error);
            this.showMessage('保存regexconfigurationfailed: ' + error.message, 'error');
        }
    }

    /**
     * 重置regexconfiguration为默认value
     */
    async resetRegexConfig() {
        try {
            // checkandsettings绝对路径and相对路径APIregex
            const absoluteApiRegex = document.getElementById('absoluteApiRegex');
            const relativeApiRegex = document.getElementById('relativeApiRegex');
            
            if (absoluteApiRegex) {
                absoluteApiRegex.value = this.defaultRegexPatterns.absoluteApi;
            }
            if (relativeApiRegex) {
                relativeApiRegex.value = this.defaultRegexPatterns.relativeApi;
            }
            
            // checkandsettings其他regexexpression输入框
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
            
            // convert为PatternExtractor期望format
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
                // new增regexexpressionconfiguration映射
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
            
            // 同时保存两种format
            await chrome.storage.local.set({ 
                phantomRegexConfig: this.defaultRegexPatterns,
                regexSettings: regexSettings
            });
            
            //console.log('✅ regexconfigurationalready重置为默认value:', { regexSettings });
            
            this.showMessage('regexconfigurationalready重置为默认value', 'success');
            
            // notify其他mod块configurationalready更new
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('重置regexconfigurationfailed:', error);
            this.showMessage('重置regexconfigurationfailed: ' + error.message, 'error');
        }
    }

    /**
     * notify其他mod块configurationalready更new - unified化version
     */
    notifyConfigUpdate(regexSettings) {
        //console.log('🔄 [SettingsManager] startnotify其他mod块configurationalready更new:', regexSettings);
        
        // 强制重newloadPatternExtractorconfiguration
        if (window.patternExtractor) {
            //console.log('🔄 [SettingsManager] 强制重newloadPatternExtractorconfiguration...');
            
            // 清除现有configuration
            window.patternExtractor.patterns = {};
            window.patternExtractor.customPatternsLoaded = false;
            
            // 更newconfiguration
            if (typeof window.patternExtractor.updatePatterns === 'function') {
                window.patternExtractor.updatePatterns(regexSettings);
                //console.log('✅ [SettingsManager] PatternExtractorconfigurationalready强制更new');
            } else {
                console.warn('⚠️ [SettingsManager] PatternExtractor.updatePatterns方法notexists');
            }
        } else {
            console.warn('⚠️ [SettingsManager] PatternExtractor未found');
        }
        
        // 触发全局event，notify其他可能listenmod块
        window.dispatchEvent(new CustomEvent('regexConfigUpdated', { 
            detail: regexSettings 
        }));
        
        //console.log('✅ [SettingsManager] configuration更newnotifycomplete');
    }

    /**
     * addrequest头输入框
     */
    addHeaderInput(key = '', value = '') {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        const headerGroup = document.createElement('div');
        headerGroup.className = 'header-input-group';
        
        headerGroup.innerHTML = `
            <input type="text" class="header-key-input" placeholder="request头名称 (such as: Authorization)" value="${key}">
            <input type="text" class="header-value-input" placeholder="request头value (such as: Bearer token123)" value="${value}">
            <button class="remove-header-btn">删除</button>
        `;
        
        // 为删除buttonaddeventlistener
        const removeBtn = headerGroup.querySelector('.remove-header-btn');
        removeBtn.addEventListener('click', () => {
            headerGroup.remove();
            // 删除后automatic保存
            this.saveHeaders();
        });
        
        container.appendChild(headerGroup);
    }

    /**
     * loadrequest头configuration
     */
    loadHeaders(headers) {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        // 清空现有内容
        container.innerHTML = '';

        // ifwithout保存request头，add一个空输入框
        if (!headers || headers.length === 0) {
            this.addHeaderInput();
            return;
        }

        // load保存request头
        headers.forEach(header => {
            this.addHeaderInput(header.key, header.value);
        });
    }

    /**
     * 保存request头settings
     */
    async saveHeaders() {
        try {
            const headerInputs = document.querySelectorAll('.header-input-group');
            const headers = [];

            headerInputs.forEach(group => {
                const keyInput = group.querySelector('.header-key-input');
                const valueInput = group.querySelector('.header-value-input');
                
                // add空valuecheck，防止访问 null object属性
                if (keyInput && valueInput && keyInput.value && valueInput.value) {
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (key && value) {
                        headers.push({ key, value });
                    }
                }
            });

            await chrome.storage.local.set({ phantomHeaders: headers });
            this.showMessage(`already保存 ${headers.length} 个request头`, 'success');
            
        } catch (error) {
            console.error('保存request头failed:', error);
            this.showMessage('保存request头failed: ' + error.message, 'error');
        }
    }

    /**
     * 清空request头settings
     */
    async clearHeaders() {
        try {
            const container = document.getElementById('headersContainer');
            if (container) {
                container.innerHTML = '';
                this.addHeaderInput(); // add一个空输入框
            }
            
            await chrome.storage.local.remove('phantomHeaders');
            this.showMessage('request头already清空', 'success');
            
        } catch (error) {
            console.error('清空request头failed:', error);
            this.showMessage('清空request头failed: ' + error.message, 'error');
        }
    }

    /**
     * get当beforerequest头settings
     */
    async getHeadersSetting() {
        try {
            const result = await chrome.storage.local.get('phantomHeaders');
            return result.phantomHeaders || [];
        } catch (error) {
            console.error('getrequest头settingsfailed:', error);
            return [];
        }
    }

    /**
     * get当beforeCookiesettings（兼容性方法）
     */
    async getCookieSetting() {
        try {
            // 先尝试fromnewrequest头settingsingetCookie
            const headers = await this.getHeadersSetting();
            const cookieHeader = headers.find(header => 
                header.key.toLowerCase() === 'cookie'
            );
            
            if (cookieHeader) {
                return cookieHeader.value;
            }

            // ifwithoutfound，尝试from旧Cookiesettingsinget（向后兼容）
            const result = await chrome.storage.local.get('phantomCookie');
            return result.phantomCookie || '';
        } catch (error) {
            console.error('getCookiesettingsfailed:', error);
            return '';
        }
    }

    /**
     * get当beforeregexconfiguration
     */
    async getRegexConfig() {
        try {
            const result = await chrome.storage.local.get('phantomRegexConfig');
            return result.phantomRegexConfig || this.defaultRegexPatterns;
        } catch (error) {
            console.error('getregexconfigurationfailed:', error);
            return this.defaultRegexPatterns;
        }
    }

    /**
     * 清空全部data - 真正解决automatic保存issue
     */
    async clearAllData() {
        // confirm清空操作
        if (!confirm('⚠️ warning：此操作将清空allpage面scandata！\n\nincluding：\n• allpage面scanresult\n• deep scandata\n• scanstateinformation\n\n此操作not可恢复，确定要继续吗？')) {
            return;
        }
        
        // 二次confirm
        if (!confirm('请再次confirm：真要清空alldata吗？')) {
            return;
        }
        
        try {
            //console.log('🗑️ start清空全部data...');
            
            // 第一步：暂时禁forautomatic保存机制，防止databy重new写入
            let originalSaveResults = null;
            if (window.srcMiner && typeof window.srcMiner.saveResults === 'function') {
                //console.log('🚫 暂时禁forautomatic保存机制...');
                originalSaveResults = window.srcMiner.saveResults;
                window.srcMiner.saveResults = () => {
                    //console.log('🚫 automatic保存alreadyby暂时禁for');
                };
            }
            
            // 第二步：彻底清空 SRCMiner 实例内存data
            if (window.srcMiner) {
                //console.log('🧹 清空SRCMiner实例内存data...');
                
                // check是否有deep scan正in运行
                const isDeepScanRunning = window.srcMiner.deepScanRunning;
                //console.log('deep scan运行state:', isDeepScanRunning);
                
                // 清空all内存indata
                window.srcMiner.results = {};
                window.srcMiner.deepScanResults = {};
                window.srcMiner.scannedUrls = new Set();
                window.srcMiner.pendingUrls = new Set();
                
                // 只有inwithoutdeep scan运行时才重置scanstate
                if (!isDeepScanRunning) {
                    window.srcMiner.deepScanRunning = false;
                    window.srcMiner.currentDepth = 0;
                    //console.log('✅ already重置scanstate');
                } else {
                    //console.log('⚠️ detecttodeep scan正in运行，keepscanstate');
                }
            }
            
            // 第三步：getallstorage键andidentifyscan相关data
            const allData = await chrome.storage.local.get(null);
            //console.log('📋 当beforestoragealldata键:', Object.keys(allData));
            
            const keysToRemove = [];
            
            // 找出all与scandata相关键（including双下划线format）
            for (const key in allData) {
                if (
                    // 双下划线format（实际storageformat）
                    key.endsWith('__results') || 
                    key.endsWith('__lastSave') ||
                    // 单下划线format（兼容性）
                    key.endsWith('_results') || 
                    key.endsWith('_lastSave') ||
                    // 旧version全局键
                    key === 'srcMinerResults' ||
                    key === 'lastSaveTime' ||
                    // 其他可能scan相关键
                    key === 'deepScanComplete' ||
                    key === 'deepScanTimestamp' ||
                    key === 'deepScanUrl' ||
                    key === 'deepScanCompletedAt' ||
                    key === 'deepScanResultsCount' ||
                    key === 'lastDeepScanCompleted' ||
                    key === 'deepScanRunning' ||
                    // lastScan_ 开头键（automaticscan时间record）
                    key.startsWith('lastScan_')
                ) {
                    keysToRemove.push(key);
                }
            }
            
            //console.log(`🔍 found ${keysToRemove.length} 个data键require清空:`, keysToRemove);
            
            // 第四步：删除chrome.storagein相关键（keep非scandata）
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                //console.log(`✅ already删除chrome.storagein ${keysToRemove.length} 个data键`);
            }
            
            // 第五步：清空IndexedDBinallscandata
            try {
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                await window.indexedDBManager.clearAllScanResults();
                //console.log('✅ already清空IndexedDBinallscandata');
            } catch (error) {
                console.error('❌ 清空IndexedDBdatafailed:', error);
            }
            
            // 第六步：validationchrome.storage删除resultand处理残留data
            const verifyData = await chrome.storage.local.get(keysToRemove);
            const remainingKeys = Object.keys(verifyData);
            
            if (remainingKeys.length > 0) {
                console.warn('⚠️ 发现chrome.storage残留data键，尝试强制删除:', remainingKeys);
                // 尝试逐个删除剩余键
                for (const key of remainingKeys) {
                    try {
                        await chrome.storage.local.remove([key]);
                        //console.log(`✅ 强制删除success: ${key}`);
                    } catch (error) {
                        console.error(`❌ 强制删除failed: ${key}`, error);
                    }
                }
            }
            
            // 第七步：清空界面显示
            const resultsDiv = document.getElementById('results');
            const statsDiv = document.getElementById('stats');
            if (resultsDiv) {
                resultsDiv.innerHTML = '';
                //console.log('✅ already清空result显示区域');
            }
            if (statsDiv) {
                statsDiv.textContent = '';
                //console.log('✅ already清空统计显示区域');
            }
            
            // 第八步：重置UIstate
            if (window.srcMiner) {
                // 只有inwithoutdeep scan运行时才重置UIstate
                if (!window.srcMiner.deepScanRunning) {
                    // 重置deep scanUIstate
                    if (typeof window.srcMiner.resetDeepScanUI === 'function') {
                        window.srcMiner.resetDeepScanUI();
                        //console.log('✅ already重置deep scanUIstate');
                    }
                }
                
                // 更new分classselector
                if (typeof window.srcMiner.updateCategorySelect === 'function') {
                    window.srcMiner.updateCategorySelect();
                    //console.log('✅ already更new分classselector');
                }
                
                // 强制刷new显示
                if (typeof window.srcMiner.displayResults === 'function') {
                    window.srcMiner.displayResults();
                    //console.log('✅ already刷newresult显示');
                }
            }
            
            // 第九步：最终validationchrome.storage（只check非scandata相关键）
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
            
            // 第十步：validationIndexedDB清空result
            try {
                const indexedDBStats = await window.indexedDBManager.getStats();
                //console.log('📊 IndexedDB清空后统计:', indexedDBStats);
            } catch (error) {
                console.error('❌ getIndexedDB统计failed:', error);
            }
            
            // 第九步：恢复automatic保存机制
            if (originalSaveResults && window.srcMiner) {
                setTimeout(() => {
                    window.srcMiner.saveResults = originalSaveResults;
                    //console.log('✅ automatic保存机制already恢复');
                }, 1000); // 1秒后恢复，确保清空操作完全complete
            }
            
            // 显示result
            if (remainingDataKeys.length > 0) {
                console.warn('⚠️ 最终check发现残留data键:', remainingDataKeys);
                this.showMessage(`清空complete，but发现 ${remainingDataKeys.length} 个残留data键，可能require手动处理`, 'warning');
            } else {
                //console.log('✅ data清空validation通through，无残留data');
                this.showMessage(`alreadysuccess清空 ${keysToRemove.length} 个data项，allscandataalready彻底清除`, 'success');
            }
            
        } catch (error) {
            console.error('❌ 清空全部datafailed:', error);
            this.showMessage('清空datafailed: ' + error.message, 'error');
        }
    }

    /**
     * 显示message提示
     */
    showMessage(message, type = 'info') {
        // createmessage提示元素
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

        // 3秒后automatic移除
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
     * getdomainscansettings
     */
    async getDomainScanSettings() {
        try {
            const result = await chrome.storage.local.get(['domainScanSettings']);
            return result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
        } catch (error) {
            console.error('getdomainscansettingsfailed:', error);
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }

    /**
     * getcustomregexconfiguration
     */
    async getCustomRegexConfigs() {
        try {
            const result = await chrome.storage.local.get('customRegexConfigs');
            return result.customRegexConfigs || {};
        } catch (error) {
            console.error('getcustomregexconfigurationfailed:', error);
            return {};
        }
    }

    /**
     * 保存customregexconfiguration
     */
    async saveCustomRegexConfig(key, config) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            customConfigs[key] = config;
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ customregexconfigurationalready保存:', { key, config });
        } catch (error) {
            console.error('❌ 保存customregexconfigurationfailed:', error);
            throw error;
        }
    }

    /**
     * 删除customregexconfiguration
     */
    async deleteCustomRegexConfig(key) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            delete customConfigs[key];
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ customregexconfigurationalready删除:', key);
        } catch (error) {
            console.error('❌ 删除customregexconfigurationfailed:', error);
            throw error;
        }
    }
}

// exportsettings管理器
window.SettingsManager = SettingsManager;