/**
 * Settings管理器
 * 负责管理CookieSettingsAndRegular expressionConfiguration
 */
class SettingsManager {
    constructor() {
        this.defaultRegexPatterns = {
            // Absolute pathAPI
            absoluteApi: [
                '(?<![\\w/\\\\.-])(?:/[\\w.-]+(?:/[\\w.-]+)+|/[\\w.-]+\\.\\w+|[a-zA-Z]:[/\\\\][\\w\\s.-]+(?:[/\\\\][\\w\\s.-]+)+|\\\\\\\\[\\w.-]+(?:[/\\\\][\\w.-]+)+)(?![\\w/\\\\])'
            ].join('|'),
            
            // Relative pathAPI
            relativeApi: [
                '(?<![\\w/\\\\-])(?:\\.{1,2}/)+(?:[^/ \\t\\r\\n<>|"\\\']+/)*[^/ \\t\\r\\n<>|"\\\']*(?![\\w/\\\\])'
            ].join('|'),
            
            // DomainAndURL
            domain: [
                '(?<!\\w)(?:[a-zA-Z0-9-]{2,}\\.)+(?:xin|com|cn|net|com\\.cn|vip|top|cc|shop|club|wang|xyz|luxe|site|news|pub|fun|online|win|red|loan|ren|mom|net\\.cn|org|link|biz|bid|help|tech|date|mobi|so|me|tv|co|vc|pw|video|party|pics|website|store|ltd|ink|trade|live|wiki|space|gift|lol|work|band|info|click|photo|market|tel|social|press|game|kim|org\\.cn|games|pro|men|love|studio|rocks|asia|group|science|design|software|engineer|lawyer|fit|beer|tw|我爱你|China|公司|Network|在线|网址|网店|集团|中文网)(?=\\b|(?::\\d{1,5})?(?:\\/|$))(?![.\\w])'
            ].join('|'),
            
            // 邮箱地址（排除静态ResourceDomain）
            email: [
                '([a-zA-Z0-9\\._\\-]*@[a-zA-Z0-9\\._\\-]{1,63}\\.((?!js|css|jpg|jpeg|png|ico)[a-zA-Z]{2,}))'
            ].join('|'),
            
            // China大陆手机号
            phone: [
                '(?<!\\d)1(?:3\\d{2}|4[14-9]\\d|5\\d{2}|66\\d|7[2-35-8]\\d|8\\d{2}|9[89]\\d)\\d{7}(?!\\d)'
            ].join('|'),
            
            // IP地址
            ip: [
                '[\'"](([a-zA-Z0-9]+:)?\\/\\/)?\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(\\/.*?)?[\'"]'
            ].join('|'),
            
            
            // 身份证号
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
            
            // Encryption算法调用Detect
            cryptoUsage: [
                '\\b(?:CryptoJS\\.(?:AES|DES)|Base64\\.(?:encode|decode)|btoa|atob|JSEncrypt|rsa|KJUR|\\$\\.md5|md5|sha1|sha256|sha512)(?:\\.\\w+)*\\s*\\([^)]*\\)'
            ].join('|'),
            
            // 敏感Information（综合Pattern）
            sensitive: [
                // GitHub 各Class Token
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
                // 通用密钥字段
                '[\\w_-]*?password[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?token[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?secret[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?accesskey[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?bucket[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 私钥
                '-{5}BEGIN[\\s\\S]*?-{5}END[\\s\\S]*?-{5}',
                // 华为云 OSS
                'huawei\\.oss\\.(ak|sk|bucket\\.name|endpoint|local\\.path)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 其他服务密钥
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
            
            // VueFile
            vue: [
                '["\'][^"\']*\\.vue["\']'
            ].join('|'),
            
            // 公司名称
            company: [
            // 中文公司名称Pattern
            '(?:[\\u4e00-\\u9fa5\\（\\）]{4,15}(?:公司|中心))',
            '(?:[\\u4e00-\\u9fa5]{2,15}(?:软件|科技|集团))',
    
            // 英文公司名称Pattern（新增）
            '[A-Z][a-zA-Z\\s]{2,30}(?:Inc|Corp|LLC|Ltd|Company|Group|Technology|Systems)',
    
            // Extension的中文公司Type（新增）
            '(?:公司|集团|企业|有限责任公司|股份有限公司|科技|Network|Information|Technical)[\\u4e00-\\u9fa5]{2,20}(?:公司|集团|企业|有限责任公司|股份有限公司)'
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
     * InitializeSettings管理器
     */
    init() {
        this.bindEvents();
        this.loadSettings();
    }

    /**
     * 绑定事件Listen器
     */
    bindEvents() {
        // Request headerRelated按钮
        document.getElementById('addHeaderBtn')?.addEventListener('click', () => this.addHeaderInput());
        document.getElementById('getCookieBtn')?.addEventListener('click', () => this.getCurrentCookie());
        document.getElementById('saveHeadersBtn')?.addEventListener('click', () => this.saveHeaders());
        document.getElementById('clearHeadersBtn')?.addEventListener('click', () => this.clearHeaders());
        
        // 正则ConfigurationRelated按钮
        document.getElementById('saveRegexBtn')?.addEventListener('click', () => this.saveRegexConfig());
        document.getElementById('resetRegexBtn')?.addEventListener('click', () => this.resetRegexConfig());
        
        // Data管理按钮
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearAllData());
        
        // DomainScanSettings
        document.getElementById('allowSubdomains')?.addEventListener('change', () => this.saveDomainScanSettings());
        document.getElementById('allowAllDomains')?.addEventListener('change', () => this.saveDomainScanSettings());
    }

    /**
     * LoadSettings
     */
    async loadSettings() {
        try {
            // LoadRequest headerSettings
            const result = await chrome.storage.local.get(['phantomHeaders', 'phantomRegexConfig', 'regexSettings', 'domainScanSettings']);
            
            // LoadRequest headerConfiguration
            this.loadHeaders(result.phantomHeaders || []);
            
            // Load正则Configuration
            const regexConfig = result.phantomRegexConfig || this.defaultRegexPatterns;

            // 如果 regexSettings 不存在，基于CurrentConfiguration构建AndSave，保证全链路生效
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
                    // ExtensionItem
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
                //console.log('✅ Already构建AndSaveDefault regexSettings（首次Initialize）');
                // Notify其他模块ConfigurationAlreadyUpdate
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
            
            // 新增的Regular expressionInput框
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
            
            // LoadDomainScanSettings
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
            console.error('LoadSettingsFailed:', error);
        }
    }

    /**
     * SaveDomainScanSettings
     */
    async saveDomainScanSettings() {
        try {
            const allowSubdomainsEl = document.getElementById('allowSubdomains');
            const allowAllDomainsEl = document.getElementById('allowAllDomains');
            
            const domainScanSettings = {
                allowSubdomains: allowSubdomainsEl ? allowSubdomainsEl.checked : false,
                allowAllDomains: allowAllDomainsEl ? allowAllDomainsEl.checked : false
            };
            
            // 互斥逻辑：如果选择了"所有Domain"，则AutoEnable"子Domain"
            if (domainScanSettings.allowAllDomains && allowSubdomainsEl) {
                allowSubdomainsEl.checked = true;
                domainScanSettings.allowSubdomains = true;
            }
            
            await chrome.storage.local.set({ domainScanSettings });
            
            let message = 'DomainScanSettingsSaved！';
            if (domainScanSettings.allowAllDomains) {
                message += ' AlreadyEnable所有DomainScan（包含子Domain）';
            } else if (domainScanSettings.allowSubdomains) {
                message += ' AlreadyEnable子DomainScan';
            } else {
                message += ' Already限制为同DomainScan';
            }
            
            this.showMessage(message, 'success');
            
            // 触发事件Notify其他模块
            window.dispatchEvent(new CustomEvent('domainScanSettingsUpdated', { 
                detail: domainScanSettings 
            }));
            
        } catch (error) {
            console.error('SaveDomainScanSettingsFailed:', error);
            this.showMessage('SaveSettingsFailed: ' + error.message, 'error');
        }
    }

    /**
     * GetCurrent网站的CookieAndAdd为Request header
     */
    async getCurrentCookie() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showMessage('None法GetCurrent标签页Information', 'error');
                return;
            }

            const url = new URL(tab.url);
            const cookies = await chrome.cookies.getAll({ domain: url.hostname });
            
            if (cookies.length === 0) {
                this.showMessage('Current网站NoCookie', 'warning');
                return;
            }

            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            // AddCookie作为Request header
            this.addHeaderInput('Cookie', cookieString);
            this.showMessage('CookieAlreadyAdd为Request header', 'success');
            
        } catch (error) {
            console.error('GetCookieFailed:', error);
            this.showMessage('GetCookieFailed: ' + error.message, 'error');
        }
    }

    /**
     * SaveRegular expressionSettings
     */
    async saveRegexSettings() {
        try {
            const regexSettings = {};
            
            // 收集所有Regular expressionSettings
            const regexItems = document.querySelectorAll('.regex-item');
            regexItems.forEach(item => {
                const textarea = item.querySelector('textarea');
                const category = textarea.id.replace('regex-', '');
                regexSettings[category] = textarea.value.trim();
            });
            
            // Save到Chrome存储
            await chrome.storage.local.set({ regexSettings });
            
            //console.log('Regular expressionSettingsSaved:', regexSettings);
            
            // NotifyPatternExtractorReloadConfiguration
            if (window.patternExtractor) {
                await window.patternExtractor.loadCustomPatterns();
                //console.log('✅ PatternExtractorAlreadyReloadConfiguration');
            }
            
            this.showMessage('Regular expressionSettingsSaveSuccess！ConfigurationAlready生效', 'success');
            
        } catch (error) {
            console.error('SaveRegular expressionSettingsFailed:', error);
            this.showMessage('SaveRegular expressionSettingsFailed: ' + error.message, 'error');
        }
    }

    /**
     * Save正则Configuration
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

            // ValidateRegular expression
            for (const [key, pattern] of Object.entries(regexConfig)) {
                if (pattern) {
                    try {
                        new RegExp(pattern, 'gi');
                    } catch (e) {
                        this.showMessage(`${key} regular expression format is incorrect: ${e.message}`, 'error');
                        return;
                    }
                }
            }

            // Convert为PatternExtractor期望的Format
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
                // 新增的Regular expressionConfiguration映射
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

            // 同时Save两种Format以保持兼容性
            await chrome.storage.local.set({ 
                phantomRegexConfig: regexConfig,
                regexSettings: regexSettings
            });
            
            //console.log('✅ 正则ConfigurationSaved:', { regexConfig, regexSettings });
            
            this.showMessage('正则ConfigurationSaveSuccess', 'success');
            
            // Notify其他模块ConfigurationAlreadyUpdate
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('Save正则ConfigurationFailed:', error);
            this.showMessage('Save正则ConfigurationFailed: ' + error.message, 'error');
        }
    }

    /**
     * Reset正则Configuration为Default值
     */
    async resetRegexConfig() {
        try {
            // CheckAndSettingsAbsolute pathAndRelative pathAPI正则
            const absoluteApiRegex = document.getElementById('absoluteApiRegex');
            const relativeApiRegex = document.getElementById('relativeApiRegex');
            
            if (absoluteApiRegex) {
                absoluteApiRegex.value = this.defaultRegexPatterns.absoluteApi;
            }
            if (relativeApiRegex) {
                relativeApiRegex.value = this.defaultRegexPatterns.relativeApi;
            }
            
            // CheckAndSettings其他Regular expressionInput框
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
            
            // Convert为PatternExtractor期望的Format
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
                // 新增的Regular expressionConfiguration映射
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
            
            // 同时Save两种Format
            await chrome.storage.local.set({ 
                phantomRegexConfig: this.defaultRegexPatterns,
                regexSettings: regexSettings
            });
            
            //console.log('✅ 正则ConfigurationAlreadyReset为Default值:', { regexSettings });
            
            this.showMessage('正则ConfigurationAlreadyReset为Default值', 'success');
            
            // Notify其他模块ConfigurationAlreadyUpdate
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('Reset正则ConfigurationFailed:', error);
            this.showMessage('Reset正则ConfigurationFailed: ' + error.message, 'error');
        }
    }

    /**
     * Notify其他模块ConfigurationAlreadyUpdate - Unified化版本
     */
    notifyConfigUpdate(regexSettings) {
        //console.log('🔄 [SettingsManager] StartNotify其他模块ConfigurationAlreadyUpdate:', regexSettings);
        
        // 强制ReloadPatternExtractorConfiguration
        if (window.patternExtractor) {
            //console.log('🔄 [SettingsManager] 强制ReloadPatternExtractorConfiguration...');
            
            // 清除现有Configuration
            window.patternExtractor.patterns = {};
            window.patternExtractor.customPatternsLoaded = false;
            
            // UpdateConfiguration
            if (typeof window.patternExtractor.updatePatterns === 'function') {
                window.patternExtractor.updatePatterns(regexSettings);
                //console.log('✅ [SettingsManager] PatternExtractorConfigurationAlready强制Update');
            } else {
                console.warn('⚠️ [SettingsManager] PatternExtractor.updatePatternsMethod不存在');
            }
        } else {
            console.warn('⚠️ [SettingsManager] PatternExtractorNot found');
        }
        
        // 触发全局事件，Notify其他可能Listen的模块
        window.dispatchEvent(new CustomEvent('regexConfigUpdated', { 
            detail: regexSettings 
        }));
        
        //console.log('✅ [SettingsManager] ConfigurationUpdateNotifyComplete');
    }

    /**
     * AddRequest headerInput框
     */
    addHeaderInput(key = '', value = '') {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        const headerGroup = document.createElement('div');
        headerGroup.className = 'header-input-group';
        
        headerGroup.innerHTML = `
            <input type="text" class="header-key-input" placeholder="Request header名称 (如: Authorization)" value="${key}">
            <input type="text" class="header-value-input" placeholder="Request header值 (如: Bearer token123)" value="${value}">
            <button class="remove-header-btn">Delete</button>
        `;
        
        // 为Delete按钮Add事件Listen器
        const removeBtn = headerGroup.querySelector('.remove-header-btn');
        removeBtn.addEventListener('click', () => {
            headerGroup.remove();
            // DeleteAfterAutoSave
            this.saveHeaders();
        });
        
        container.appendChild(headerGroup);
    }

    /**
     * LoadRequest headerConfiguration
     */
    loadHeaders(headers) {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        // Clear现有Content
        container.innerHTML = '';

        // 如果NoSave的Request header，Add一个Empty的Input框
        if (!headers || headers.length === 0) {
            this.addHeaderInput();
            return;
        }

        // LoadSave的Request header
        headers.forEach(header => {
            this.addHeaderInput(header.key, header.value);
        });
    }

    /**
     * SaveRequest headerSettings
     */
    async saveHeaders() {
        try {
            const headerInputs = document.querySelectorAll('.header-input-group');
            const headers = [];

            headerInputs.forEach(group => {
                const keyInput = group.querySelector('.header-key-input');
                const valueInput = group.querySelector('.header-value-input');
                
                // AddEmpty值Check，防止访问 null Object的属性
                if (keyInput && valueInput && keyInput.value && valueInput.value) {
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (key && value) {
                        headers.push({ key, value });
                    }
                }
            });

            await chrome.storage.local.set({ phantomHeaders: headers });
            this.showMessage(`Saved ${headers.length} 个Request header`, 'success');
            
        } catch (error) {
            console.error('SaveRequest headerFailed:', error);
            this.showMessage('SaveRequest headerFailed: ' + error.message, 'error');
        }
    }

    /**
     * ClearRequest headerSettings
     */
    async clearHeaders() {
        try {
            const container = document.getElementById('headersContainer');
            if (container) {
                container.innerHTML = '';
                this.addHeaderInput(); // Add一个Empty的Input框
            }
            
            await chrome.storage.local.remove('phantomHeaders');
            this.showMessage('Request headerCleared', 'success');
            
        } catch (error) {
            console.error('ClearRequest headerFailed:', error);
            this.showMessage('ClearRequest headerFailed: ' + error.message, 'error');
        }
    }

    /**
     * GetCurrentRequest headerSettings
     */
    async getHeadersSetting() {
        try {
            const result = await chrome.storage.local.get('phantomHeaders');
            return result.phantomHeaders || [];
        } catch (error) {
            console.error('GetRequest headerSettingsFailed:', error);
            return [];
        }
    }

    /**
     * GetCurrentCookieSettings（兼容性Method）
     */
    async getCookieSetting() {
        try {
            // First尝试from新的Request headerSettings中GetCookie
            const headers = await this.getHeadersSetting();
            const cookieHeader = headers.find(header => 
                header.key.toLowerCase() === 'cookie'
            );
            
            if (cookieHeader) {
                return cookieHeader.value;
            }

            // 如果NoFound，尝试from旧的CookieSettings中Get（向After兼容）
            const result = await chrome.storage.local.get('phantomCookie');
            return result.phantomCookie || '';
        } catch (error) {
            console.error('GetCookieSettingsFailed:', error);
            return '';
        }
    }

    /**
     * GetCurrent正则Configuration
     */
    async getRegexConfig() {
        try {
            const result = await chrome.storage.local.get('phantomRegexConfig');
            return result.phantomRegexConfig || this.defaultRegexPatterns;
        } catch (error) {
            console.error('Get正则ConfigurationFailed:', error);
            return this.defaultRegexPatterns;
        }
    }

    /**
     * ClearAllData - 真正解决AutoSave问题
     */
    async clearAllData() {
        // ConfirmClear操作
        if (!confirm('⚠️ 警告：此操作将Clear所有Page的ScanData！\n\n包括：\n• 所有Page的Scan results\n• 深度ScanData\n• ScanStatusInformation\n\n此操作不可恢复，Confirm要Continue吗？')) {
            return;
        }
        
        // 二次Confirm
        if (!confirm('请再次Confirm：真的要Clear所有Data吗？')) {
            return;
        }
        
        try {
            //console.log('🗑️ StartClearAllData...');
            
            // 第一步：暂时DisableAutoSave机制，防止DataByReWrite
            let originalSaveResults = null;
            if (window.srcMiner && typeof window.srcMiner.saveResults === 'function') {
                //console.log('🚫 暂时DisableAutoSave机制...');
                originalSaveResults = window.srcMiner.saveResults;
                window.srcMiner.saveResults = () => {
                    //console.log('🚫 AutoSaveAlreadyBy暂时Disable');
                };
            }
            
            // 第二步：彻底Clear SRCMiner 实例的内存Data
            if (window.srcMiner) {
                //console.log('🧹 ClearSRCMiner实例内存Data...');
                
                // Check是否有深度ScanIn progress运行
                const isDeepScanRunning = window.srcMiner.deepScanRunning;
                //console.log('深度Scan运行Status:', isDeepScanRunning);
                
                // Clear所有内存中的Data
                window.srcMiner.results = {};
                window.srcMiner.deepScanResults = {};
                window.srcMiner.scannedUrls = new Set();
                window.srcMiner.pendingUrls = new Set();
                
                // Only有在No深度Scan运行时才ResetScanStatus
                if (!isDeepScanRunning) {
                    window.srcMiner.deepScanRunning = false;
                    window.srcMiner.currentDepth = 0;
                    //console.log('✅ AlreadyResetScanStatus');
                } else {
                    //console.log('⚠️ Detect到深度ScanIn progress运行，保持ScanStatus');
                }
            }
            
            // 第三步：Get所有存储的KeyAnd识别ScanRelatedData
            const allData = await chrome.storage.local.get(null);
            //console.log('📋 Current存储的所有DataKey:', Object.keys(allData));
            
            const keysToRemove = [];
            
            // 找出所有与ScanDataRelated的Key（包括双下划线Format）
            for (const key in allData) {
                if (
                    // 双下划线Format（实际存储Format）
                    key.endsWith('__results') || 
                    key.endsWith('__lastSave') ||
                    // 单下划线Format（兼容性）
                    key.endsWith('_results') || 
                    key.endsWith('_lastSave') ||
                    // 旧版本的全局Key
                    key === 'srcMinerResults' ||
                    key === 'lastSaveTime' ||
                    // 其他可能的ScanRelatedKey
                    key === 'deepScanComplete' ||
                    key === 'deepScanTimestamp' ||
                    key === 'deepScanUrl' ||
                    key === 'deepScanCompletedAt' ||
                    key === 'deepScanResultsCount' ||
                    key === 'lastDeepScanCompleted' ||
                    key === 'deepScanRunning' ||
                    // lastScan_ 开Header的Key（AutoScanTimeRecord）
                    key.startsWith('lastScan_')
                ) {
                    keysToRemove.push(key);
                }
            }
            
            //console.log(`🔍 Found ${keysToRemove.length} 个DataKeyNeedClear:`, keysToRemove);
            
            // 第四步：Deletechrome.storage中的RelatedKey（保留非ScanData）
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                //console.log(`✅ Deletedchrome.storage中的 ${keysToRemove.length} 个DataKey`);
            }
            
            // 第五步：ClearIndexedDB中的所有ScanData
            try {
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                await window.indexedDBManager.clearAllScanResults();
                //console.log('✅ ClearedIndexedDB中的所有ScanData');
            } catch (error) {
                console.error('❌ ClearIndexedDBDataFailed:', error);
            }
            
            // 第六步：Validatechrome.storageDeleteResultAndProcess残留Data
            const verifyData = await chrome.storage.local.get(keysToRemove);
            const remainingKeys = Object.keys(verifyData);
            
            if (remainingKeys.length > 0) {
                console.warn('⚠️ Foundchrome.storage残留DataKey，尝试强制Delete:', remainingKeys);
                // 尝试逐个Delete剩余的Key
                for (const key of remainingKeys) {
                    try {
                        await chrome.storage.local.remove([key]);
                        //console.log(`✅ 强制DeleteSuccess: ${key}`);
                    } catch (error) {
                        console.error(`❌ 强制DeleteFailed: ${key}`, error);
                    }
                }
            }
            
            // 第七步：Clear界面Display
            const resultsDiv = document.getElementById('results');
            const statsDiv = document.getElementById('stats');
            if (resultsDiv) {
                resultsDiv.innerHTML = '';
                //console.log('✅ ClearedResultDisplay区域');
            }
            if (statsDiv) {
                statsDiv.textContent = '';
                //console.log('✅ ClearedStatisticsDisplay区域');
            }
            
            // 第八步：ResetUIStatus
            if (window.srcMiner) {
                // Only有在No深度Scan运行时才ResetUIStatus
                if (!window.srcMiner.deepScanRunning) {
                    // Reset深度ScanUIStatus
                    if (typeof window.srcMiner.resetDeepScanUI === 'function') {
                        window.srcMiner.resetDeepScanUI();
                        //console.log('✅ AlreadyReset深度ScanUIStatus');
                    }
                }
                
                // UpdateCategory选择器
                if (typeof window.srcMiner.updateCategorySelect === 'function') {
                    window.srcMiner.updateCategorySelect();
                    //console.log('✅ AlreadyUpdateCategory选择器');
                }
                
                // 强制刷新Display
                if (typeof window.srcMiner.displayResults === 'function') {
                    window.srcMiner.displayResults();
                    //console.log('✅ Already刷新ResultDisplay');
                }
            }
            
            // 第九步：最终Validatechrome.storage（OnlyCheck非ScanDataRelatedKey）
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
            
            // 第十步：ValidateIndexedDBClearResult
            try {
                const indexedDBStats = await window.indexedDBManager.getStats();
                //console.log('📊 IndexedDBClearAfterStatistics:', indexedDBStats);
            } catch (error) {
                console.error('❌ GetIndexedDBStatisticsFailed:', error);
            }
            
            // 第九步：恢复AutoSave机制
            if (originalSaveResults && window.srcMiner) {
                setTimeout(() => {
                    window.srcMiner.saveResults = originalSaveResults;
                    //console.log('✅ AutoSave机制Already恢复');
                }, 1000); // Recover after 1 second，EnsureClear操作完全Complete
            }
            
            // DisplayResult
            if (remainingDataKeys.length > 0) {
                console.warn('⚠️ 最终CheckFound残留DataKey:', remainingDataKeys);
                this.showMessage(`ClearComplete，但Found ${remainingDataKeys.length} 个残留DataKey，可能Need手动Process`, 'warning');
            } else {
                //console.log('✅ DataClearValidateThrough，None残留Data');
                this.showMessage(`AlreadySuccessClear ${keysToRemove.length} 个DataItem，所有ScanDataAlready彻底清除`, 'success');
            }
            
        } catch (error) {
            console.error('❌ ClearAllDataFailed:', error);
            this.showMessage('ClearDataFailed: ' + error.message, 'error');
        }
    }

    /**
     * Display消息Prompt
     */
    showMessage(message, type = 'info') {
        // Create消息PromptElement
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

        // 3 secondsAfterAutoRemove
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
     * GetDomainScanSettings
     */
    async getDomainScanSettings() {
        try {
            const result = await chrome.storage.local.get(['domainScanSettings']);
            return result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
        } catch (error) {
            console.error('GetDomainScanSettingsFailed:', error);
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }

    /**
     * GetCustom正则Configuration
     */
    async getCustomRegexConfigs() {
        try {
            const result = await chrome.storage.local.get('customRegexConfigs');
            return result.customRegexConfigs || {};
        } catch (error) {
            console.error('GetCustom正则ConfigurationFailed:', error);
            return {};
        }
    }

    /**
     * SaveCustom正则Configuration
     */
    async saveCustomRegexConfig(key, config) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            customConfigs[key] = config;
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ Custom正则ConfigurationSaved:', { key, config });
        } catch (error) {
            console.error('❌ SaveCustom正则ConfigurationFailed:', error);
            throw error;
        }
    }

    /**
     * DeleteCustom正则Configuration
     */
    async deleteCustomRegexConfig(key) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            delete customConfigs[key];
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ Custom正则ConfigurationDeleted:', key);
        } catch (error) {
            console.error('❌ DeleteCustom正则ConfigurationFailed:', error);
            throw error;
        }
    }
}

// ExportSettings管理器
window.SettingsManager = SettingsManager;