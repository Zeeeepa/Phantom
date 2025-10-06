/**
 * manager settings
 * regular expression configuration settings and 负责管理Cookie
 */
class SettingsManager {
    constructor() {
        this.defaultRegexPatterns = {
            // absolute path API
            absoluteApi: [
                '(?<![\\w/\\\\.-])(?:/[\\w.-]+(?:/[\\w.-]+)+|/[\\w.-]+\\.\\w+|[a-zA-Z]:[/\\\\][\\w\\s.-]+(?:[/\\\\][\\w\\s.-]+)+|\\\\\\\\[\\w.-]+(?:[/\\\\][\\w.-]+)+)(?![\\w/\\\\])'
            ].join('|'),
            
            // relative path API
            relativeApi: [
                '(?<![\\w/\\\\-])(?:\\.{1,2}/)+(?:[^/ \\t\\r\\n<>|"\\\']+/)*[^/ \\t\\r\\n<>|"\\\']*(?![\\w/\\\\])'
            ].join('|'),
            
            // URL domain and
            domain: [
                '(?<!\\w)(?:[a-zA-Z0-9-]{2,}\\.)+(?:xin|com|cn|net|com\\.cn|vip|top|cc|shop|club|wang|xyz|luxe|site|news|pub|fun|online|win|red|loan|ren|mom|net\\.cn|org|link|biz|bid|help|tech|date|mobi|so|me|tv|co|vc|pw|video|party|pics|website|store|ltd|ink|trade|live|wiki|space|gift|lol|work|band|info|click|photo|market|tel|social|press|game|kim|org\\.cn|games|pro|men|love|studio|rocks|asia|group|science|design|software|engineer|lawyer|fit|beer|tw|我爱你|in 国|公司|network|在线|网址|网店|集团|in 文网)(?=\\b|(?::\\d{1,5})?(?:\\/|$))(?![.\\w])'
            ].join('|'),
            
            // address 邮箱（domain resource exclude 静态）
            email: [
                '([a-zA-Z0-9\\._\\-]*@[a-zA-Z0-9\\._\\-]{1,63}\\.((?!js|css|jpg|jpeg|png|ico)[a-zA-Z]{2,}))'
            ].join('|'),
            
            // in 国大陆手机号
            phone: [
                '(?<!\\d)1(?:3\\d{2}|4[14-9]\\d|5\\d{2}|66\\d|7[2-35-8]\\d|8\\d{2}|9[89]\\d)\\d{7}(?!\\d)'
            ].join('|'),
            
            // address IP
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
            
            // key AWS
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
            
            // detect call 加密算法
            cryptoUsage: [
                '\\b(?:CryptoJS\\.(?:AES|DES)|Base64\\.(?:encode|decode)|btoa|atob|JSEncrypt|rsa|KJUR|\\$\\.md5|md5|sha1|sha256|sha512)(?:\\.\\w+)*\\s*\\([^)]*\\)'
            ].join('|'),
            
            // sensitive information（mode 综合）
            sensitive: [
                // GitHub class 各 Token
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
                // general key 字段
                '[\\w_-]*?password[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?token[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?secret[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?accesskey[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                '[\\w_-]*?bucket[\\w_-]*?["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // 私钥
                '-{5}BEGIN[\\s\\S]*?-{5}END[\\s\\S]*?-{5}',
                // as 华云 OSS
                'huawei\\.oss\\.(ak|sk|bucket\\.name|endpoint|local\\.path)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                // key 其他服务
                'stripe[_-]?(secret|private|publishable)[-_]?key["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'slack[_-]?token["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'twilio[_-]?(token|sid|api[_-]?key|api[_-]?secret)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'firebase[_-]?(token|key|api[_-]?token)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'mailgun[_-]?(api[_-]?key|secret[_-]?api[_-]?key)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'docker[_-]?(token|password|key|hub[_-]?password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?',
                'npm[_-]?(token|api[_-]?key|auth[_-]?token|password)["\']?[^\\S\\r\\n]*[=:][^\\S\\r\\n]*["\']?[\\w-]+["\']?'
            ].join('|'),
            
            // link GitHub
            github: [
                'https?://github\\.com/[a-zA-Z0-9_\\-\\.]+/[a-zA-Z0-9_\\-\\.]+'
            ].join('|'),
            
            // file Vue
            vue: [
                '["\'][^"\']*\\.vue["\']'
            ].join('|'),
            
            // name 公司
            company: [
            // mode name in 文公司
            '(?:[\\u4e00-\\u9fa5\\（\\）]{4,15}(?:公司|in 心))',
            '(?:[\\u4e00-\\u9fa5]{2,15}(?:软件|科技|集团))',
    
            // mode name 英文公司（新增）
            '[A-Z][a-zA-Z\\s]{2,30}(?:Inc|Corp|LLC|Ltd|Company|Group|Technology|Systems)',
    
            // extension type in of 文公司（新增）
            '(?:公司|集团|企业|has 限责任公司|has 股份限公司|科技|network|information|技术)[\\u4e00-\\u9fa5]{2,20}(?:公司|集团|企业|has 限责任公司|has 股份限公司)'
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
     * initialize manager settings
     */
    init() {
        this.bindEvents();
        this.loadSettings();
    }

    /**
     * event listen 绑定器
     */
    bindEvents() {
        // request button related 头
        document.getElementById('addHeaderBtn')?.addEventListener('click', () => this.addHeaderInput());
        document.getElementById('getCookieBtn')?.addEventListener('click', () => this.getCurrentCookie());
        document.getElementById('saveHeadersBtn')?.addEventListener('click', () => this.saveHeaders());
        document.getElementById('clearHeadersBtn')?.addEventListener('click', () => this.clearHeaders());
        
        // regex configuration button related
        document.getElementById('saveRegexBtn')?.addEventListener('click', () => this.saveRegexConfig());
        document.getElementById('resetRegexBtn')?.addEventListener('click', () => this.resetRegexConfig());
        
        // data button 管理
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => this.clearAllData());
        
        // scan settings domain
        document.getElementById('allowSubdomains')?.addEventListener('change', () => this.saveDomainScanSettings());
        document.getElementById('allowAllDomains')?.addEventListener('change', () => this.saveDomainScanSettings());
    }

    /**
     * settings load
     */
    async loadSettings() {
        try {
            // settings request load 头
            const result = await chrome.storage.local.get(['phantomHeaders', 'phantomRegexConfig', 'regexSettings', 'domainScanSettings']);
            
            // configuration request load 头
            this.loadHeaders(result.phantomHeaders || []);
            
            // regex configuration load
            const regexConfig = result.phantomRegexConfig || this.defaultRegexPatterns;

            // if regexSettings 不存在，save configuration current 基于构建并，保证全链路生效
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
                    // extension item(s)
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
                //console.log('✅ save default 已构建并 regexSettings（initialize time(s) 首）');
                // update configuration module 通知其他已
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
            
            // regular expression input field of 新增
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
            
            // scan settings domain load
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
            console.error('failed settings load:', error);
        }
    }

    /**
     * scan settings save domain
     */
    async saveDomainScanSettings() {
        try {
            const allowSubdomainsEl = document.getElementById('allowSubdomains');
            const allowAllDomainsEl = document.getElementById('allowAllDomains');
            
            const domainScanSettings = {
                allowSubdomains: allowSubdomainsEl ? allowSubdomainsEl.checked : false,
                allowAllDomains: allowAllDomainsEl ? allowAllDomainsEl.checked : false
            };
            
            // 互斥逻辑：if选择了"domain all"，则自动启用"subdomain"
            if (domainScanSettings.allowAllDomains && allowSubdomainsEl) {
                allowSubdomainsEl.checked = true;
                domainScanSettings.allowSubdomains = true;
            }
            
            await chrome.storage.local.set({ domainScanSettings });
            
            let message = 'scan settings saved domain！';
            if (domainScanSettings.allowAllDomains) {
                message += ' enabled scan domain all（subdomain contains）';
            } else if (domainScanSettings.allowSubdomains) {
                message += ' enabled subdomain scan';
            } else {
                message += ' scan domain limit as 已同';
            }
            
            this.showMessage(message, 'success');
            
            // module event trigger 通知其他
            window.dispatchEvent(new CustomEvent('domainScanSettingsUpdated', { 
                detail: domainScanSettings 
            }));
            
        } catch (error) {
            console.error('scan settings failed save domain:', error);
            this.showMessage('failed save settings: ' + error.message, 'error');
        }
    }

    /**
     * add get request current as of 网站Cookie并头
     */
    async getCurrentCookie() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                this.showMessage('tab information get current 无法', 'error');
                return;
            }

            const url = new URL(tab.url);
            const cookies = await chrome.cookies.getAll({ domain: url.hostname });
            
            if (cookies.length === 0) {
                this.showMessage('current has 网站没Cookie', 'warning');
                return;
            }

            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            // add request as Cookie作头
            this.addHeaderInput('Cookie', cookieString);
            this.showMessage('added request as Cookie头', 'success');
            
        } catch (error) {
            console.error('failed get Cookie:', error);
            this.showMessage('failed get Cookie: ' + error.message, 'error');
        }
    }

    /**
     * regular expression save settings
     */
    async saveRegexSettings() {
        try {
            const regexSettings = {};
            
            // regular expression collected settings all
            const regexItems = document.querySelectorAll('.regex-item');
            regexItems.forEach(item => {
                const textarea = item.querySelector('textarea');
                const category = textarea.id.replace('regex-', '');
                regexSettings[category] = textarea.value.trim();
            });
            
            // save to Chrome存储
            await chrome.storage.local.set({ regexSettings });
            
            //console.log('regular expression saved settings:', regexSettings);
            
            // configuration load re- 通知PatternExtractor
            if (window.patternExtractor) {
                await window.patternExtractor.loadCustomPatterns();
                //console.log('✅ configuration load re- PatternExtractor已');
            }
            
            this.showMessage('regular expression success save settings！configuration 已生效', 'success');
            
        } catch (error) {
            console.error('regular expression failed save settings:', error);
            this.showMessage('regular expression failed save settings: ' + error.message, 'error');
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

            // regular expression validate
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

            // format convert as of PatternExtractor期望
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
                // regular expression configuration of 新增映射
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

            // save format with when 同两种保持兼容性
            await chrome.storage.local.set({ 
                phantomRegexConfig: regexConfig,
                regexSettings: regexSettings
            });
            
            //console.log('✅ saved regex configuration:', { regexConfig, regexSettings });
            
            this.showMessage('success save regex configuration', 'success');
            
            // update configuration module 通知其他已
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('failed save regex configuration:', error);
            this.showMessage('failed save regex configuration: ' + error.message, 'error');
        }
    }

    /**
     * reset regex configuration default as 值
     */
    async resetRegexConfig() {
        try {
            // relative path absolute path API regex check settings and 并
            const absoluteApiRegex = document.getElementById('absoluteApiRegex');
            const relativeApiRegex = document.getElementById('relativeApiRegex');
            
            if (absoluteApiRegex) {
                absoluteApiRegex.value = this.defaultRegexPatterns.absoluteApi;
            }
            if (relativeApiRegex) {
                relativeApiRegex.value = this.defaultRegexPatterns.relativeApi;
            }
            
            // regular expression input field check settings 并其他
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
            
            // format convert as of PatternExtractor期望
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
                // regular expression configuration of 新增映射
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
            
            // save format when 同两种
            await chrome.storage.local.set({ 
                phantomRegexConfig: this.defaultRegexPatterns,
                regexSettings: regexSettings
            });
            
            //console.log('✅ reset regex configuration default as 已值:', { regexSettings });
            
            this.showMessage('reset regex configuration default as 已值', 'success');
            
            // update configuration module 通知其他已
            this.notifyConfigUpdate(regexSettings);
            
        } catch (error) {
            console.error('failed reset regex configuration:', error);
            this.showMessage('failed reset regex configuration: ' + error.message, 'error');
        }
    }

    /**
     * update configuration module 通知其他已 - unified version
     */
    notifyConfigUpdate(regexSettings) {
        //console.log('🔄 [SettingsManager] update start configuration module 通知其他已:', regexSettings);
        
        // configuration load force re- PatternExtractor
        if (window.patternExtractor) {
            //console.log('🔄 [SettingsManager] configuration load force re- PatternExtractor...');
            
            // clear configuration has 现
            window.patternExtractor.patterns = {};
            window.patternExtractor.customPatternsLoaded = false;
            
            // update configuration
            if (typeof window.patternExtractor.updatePatterns === 'function') {
                window.patternExtractor.updatePatterns(regexSettings);
                //console.log('✅ [SettingsManager] update configuration force PatternExtractor已');
            } else {
                console.warn('⚠️ [SettingsManager] method PatternExtractor.updatePatterns不存在');
            }
        } else {
            console.warn('⚠️ [SettingsManager] not found PatternExtractor');
        }
        
        // event trigger 全局，module listen of 通知其他可能
        window.dispatchEvent(new CustomEvent('regexConfigUpdated', { 
            detail: regexSettings 
        }));
        
        //console.log('✅ [SettingsManager] update complete configuration 通知');
    }

    /**
     * input field add request 头
     */
    addHeaderInput(key = '', value = '') {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        const headerGroup = document.createElement('div');
        headerGroup.className = 'header-input-group';
        
        headerGroup.innerHTML = `
            <input type="text" class="header-key-input" placeholder="request name 头 (如: Authorization)" value="${key}">
            <input type="text" class="header-value-input" placeholder="request 头值 (如: Bearer token123)" value="${value}">
            <button class="remove-header-btn">delete</button>
        `;
        
        // delete add button event listen as 器
        const removeBtn = headerGroup.querySelector('.remove-header-btn');
        removeBtn.addEventListener('click', () => {
            headerGroup.remove();
            // save delete auto after
            this.saveHeaders();
        });
        
        container.appendChild(headerGroup);
    }

    /**
     * configuration request load 头
     */
    loadHeaders(headers) {
        const container = document.getElementById('headersContainer');
        if (!container) return;

        // clear content has 现
        container.innerHTML = '';

        // save request if of has 没头，input field add item(s) of empty 一
        if (!headers || headers.length === 0) {
            this.addHeaderInput();
            return;
        }

        // save request load of 头
        headers.forEach(header => {
            this.addHeaderInput(header.key, header.value);
        });
    }

    /**
     * save settings request 头
     */
    async saveHeaders() {
        try {
            const headerInputs = document.querySelectorAll('.header-input-group');
            const headers = [];

            headerInputs.forEach(group => {
                const keyInput = group.querySelector('.header-key-input');
                const valueInput = group.querySelector('.header-value-input');
                
                // add check empty 值，防止访问 null object of 属性
                if (keyInput && valueInput && keyInput.value && valueInput.value) {
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (key && value) {
                        headers.push({ key, value });
                    }
                }
            });

            await chrome.storage.local.set({ phantomHeaders: headers });
            this.showMessage(`saved ${headers.length} request item(s) 头`, 'success');
            
        } catch (error) {
            console.error('failed save request 头:', error);
            this.showMessage('failed save request 头: ' + error.message, 'error');
        }
    }

    /**
     * clear settings request 头
     */
    async clearHeaders() {
        try {
            const container = document.getElementById('headersContainer');
            if (container) {
                container.innerHTML = '';
                this.addHeaderInput(); // input field add item(s) of empty 一
            }
            
            await chrome.storage.local.remove('phantomHeaders');
            this.showMessage('clear request 头已', 'success');
            
        } catch (error) {
            console.error('failed clear request 头:', error);
            this.showMessage('failed clear request 头: ' + error.message, 'error');
        }
    }

    /**
     * get settings request current 头
     */
    async getHeadersSetting() {
        try {
            const result = await chrome.storage.local.get('phantomHeaders');
            return result.phantomHeaders || [];
        } catch (error) {
            console.error('failed get settings request 头:', error);
            return [];
        }
    }

    /**
     * get settings current Cookie（method 兼容性）
     */
    async getCookieSetting() {
        try {
            // get settings request new from in 先尝试头Cookie
            const headers = await this.getHeadersSetting();
            const cookieHeader = headers.find(header => 
                header.key.toLowerCase() === 'cookie'
            );
            
            if (cookieHeader) {
                return cookieHeader.value;
            }

            // if to has 没找，get settings old from in 尝试Cookie（after 向兼容）
            const result = await chrome.storage.local.get('phantomCookie');
            return result.phantomCookie || '';
        } catch (error) {
            console.error('failed get settings Cookie:', error);
            return '';
        }
    }

    /**
     * regex get configuration current
     */
    async getRegexConfig() {
        try {
            const result = await chrome.storage.local.get('phantomRegexConfig');
            return result.phantomRegexConfig || this.defaultRegexPatterns;
        } catch (error) {
            console.error('failed regex get configuration:', error);
            return this.defaultRegexPatterns;
        }
    }

    /**
     * clear data 全部 - save auto 真正解决问题
     */
    async clearAllData() {
        // confirm clear operation
        if (!confirm('⚠️ warning：clear scan data page all operation of 此将！\n\n包括：\n• scan results page all of \n• deep scan data \n• scan status information resume operation \n\n此不可，continue 确定要吗？')) {
            return;
        }
        
        // confirm time(s) 二
        if (!confirm('confirm time(s) 请再：clear data all of 真要吗？')) {
            return;
        }
        
        try {
            //console.log('🗑️ clear start data 全部...');
            
            // first 步：save auto when 暂禁用机制，data re- write 防止被
            let originalSaveResults = null;
            if (window.srcMiner && typeof window.srcMiner.saveResults === 'function') {
                //console.log('🚫 save auto when 暂禁用机制...');
                originalSaveResults = window.srcMiner.saveResults;
                window.srcMiner.saveResults = () => {
                    //console.log('🚫 save auto when 已被暂禁用');
                };
            }
            
            // second 步：clear 彻底 SRCMiner data memory instance of
            if (window.srcMiner) {
                //console.log('🧹 clear data memory instance SRCMiner...');
                
                // deep scan check line(s) no yes has 正在运
                const isDeepScanRunning = window.srcMiner.deepScanRunning;
                //console.log('deep scan status line(s) 运:', isDeepScanRunning);
                
                // clear data memory all in of
                window.srcMiner.results = {};
                window.srcMiner.deepScanResults = {};
                window.srcMiner.scannedUrls = new Set();
                window.srcMiner.pendingUrls = new Set();
                
                // deep scan scan status reset line(s) when has has 只在没运才
                if (!isDeepScanRunning) {
                    window.srcMiner.deepScanRunning = false;
                    window.srcMiner.currentDepth = 0;
                    //console.log('✅ scan status reset 已');
                } else {
                    //console.log('⚠️ deep scan detected line(s) 正在运，scan status 保持');
                }
            }
            
            // third 步：scan data get recognition all related of 存储键并
            const allData = await chrome.storage.local.get(null);
            //console.log('📋 data current all of 存储键:', Object.keys(allData));
            
            const keysToRemove = [];
            
            // scan data all related of 找出与键（format 包括双下划线）
            for (const key in allData) {
                if (
                    // format 双下划线（format 实际存储）
                    key.endsWith('__results') || 
                    key.endsWith('__lastSave') ||
                    // format 单下划线（兼容性）
                    key.endsWith('_results') || 
                    key.endsWith('_lastSave') ||
                    // version old 全局键
                    key === 'srcMinerResults' ||
                    key === 'lastSaveTime' ||
                    // scan related of 其他可能键
                    key === 'deepScanComplete' ||
                    key === 'deepScanTimestamp' ||
                    key === 'deepScanUrl' ||
                    key === 'deepScanCompletedAt' ||
                    key === 'deepScanResultsCount' ||
                    key === 'lastDeepScanCompleted' ||
                    key === 'deepScanRunning' ||
                    // lastScan_ starts with of 键（scan record auto when 间）
                    key.startsWith('lastScan_')
                ) {
                    keysToRemove.push(key);
                }
            }
            
            //console.log(`🔍 to 找 ${keysToRemove.length} clear data item(s) 键需要:`, keysToRemove);
            
            // # 四步：delete related in of chrome.storage键（scan data 保留非）
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                //console.log(`✅ delete in of 已chrome.storage ${keysToRemove.length} data item(s) 键`);
            }
            
            // # 五步：clear scan data all in of IndexedDB
            try {
                if (!window.indexedDBManager) {
                    window.indexedDBManager = new IndexedDBManager();
                }
                await window.indexedDBManager.clearAllScanResults();
                //console.log('✅ clear scan data all in of 已IndexedDB');
            } catch (error) {
                console.error('❌ failed clear data IndexedDB:', error);
            }
            
            // # 六步：delete data results process validate chrome.storage并残留
            const verifyData = await chrome.storage.local.get(keysToRemove);
            const remainingKeys = Object.keys(verifyData);
            
            if (remainingKeys.length > 0) {
                console.warn('⚠️ data found chrome.storage残留键，delete force 尝试:', remainingKeys);
                // delete item(s) of 尝试逐剩余键
                for (const key of remainingKeys) {
                    try {
                        await chrome.storage.local.remove([key]);
                        //console.log(`✅ success delete force: ${key}`);
                    } catch (error) {
                        console.error(`❌ failed delete force: ${key}`, error);
                    }
                }
            }
            
            // # 七步：clear display 界面
            const resultsDiv = document.getElementById('results');
            const statsDiv = document.getElementById('stats');
            if (resultsDiv) {
                resultsDiv.innerHTML = '';
                //console.log('✅ clear results area display 已');
            }
            if (statsDiv) {
                statsDiv.textContent = '';
                //console.log('✅ clear statistics area display 已');
            }
            
            // # 八步：reset status UI
            if (window.srcMiner) {
                // deep scan reset status line(s) when has has 只在没运才UI
                if (!window.srcMiner.deepScanRunning) {
                    // deep scan reset status UI
                    if (typeof window.srcMiner.resetDeepScanUI === 'function') {
                        window.srcMiner.resetDeepScanUI();
                        //console.log('✅ deep scan reset status 已UI');
                    }
                }
                
                // update select class 分器
                if (typeof window.srcMiner.updateCategorySelect === 'function') {
                    window.srcMiner.updateCategorySelect();
                    //console.log('✅ update select class 已分器');
                }
                
                // refresh force display
                if (typeof window.srcMiner.displayResults === 'function') {
                    window.srcMiner.displayResults();
                    //console.log('✅ refresh results display 已');
                }
            }
            
            // # 九步：validate final chrome.storage（scan data check related 只非键）
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
            
            // # 十步：clear results validate IndexedDB
            try {
                const indexedDBStats = await window.indexedDBManager.getStats();
                //console.log('📊 clear statistics after IndexedDB:', indexedDBStats);
            } catch (error) {
                console.error('❌ failed get statistics IndexedDB:', error);
            }
            
            // # 九步：save resume auto 机制
            if (originalSaveResults && window.srcMiner) {
                setTimeout(() => {
                    window.srcMiner.saveResults = originalSaveResults;
                    //console.log('✅ save resume auto 机制已');
                }, 1000); // 1 second resume after，clear complete operation 确保完全
            }
            
            // results display
            if (remainingDataKeys.length > 0) {
                console.warn('⚠️ data found check final 残留键:', remainingDataKeys);
                this.showMessage(`clear complete，found 但 ${remainingDataKeys.length} data item(s) 残留键，process 可能需要手动`, 'warning');
            } else {
                //console.log('✅ clear data validate via，data 无残留');
                this.showMessage(`success clear 已 ${keysToRemove.length} data item(s) item(s)，clear scan data all 已彻底`, 'success');
            }
            
        } catch (error) {
            console.error('❌ failed clear data 全部:', error);
            this.showMessage('failed clear data: ' + error.message, 'error');
        }
    }

    /**
     * hint display 消息
     */
    showMessage(message, type = 'info') {
        // hint element 创建消息
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

        // 3 seconds remove auto after
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
     * scan settings domain get
     */
    async getDomainScanSettings() {
        try {
            const result = await chrome.storage.local.get(['domainScanSettings']);
            return result.domainScanSettings || {
                allowSubdomains: false,
                allowAllDomains: false
            };
        } catch (error) {
            console.error('scan settings failed domain get:', error);
            return {
                allowSubdomains: false,
                allowAllDomains: false
            };
        }
    }

    /**
     * custom regex get configuration
     */
    async getCustomRegexConfigs() {
        try {
            const result = await chrome.storage.local.get('customRegexConfigs');
            return result.customRegexConfigs || {};
        } catch (error) {
            console.error('custom regex failed get configuration:', error);
            return {};
        }
    }

    /**
     * custom regex save configuration
     */
    async saveCustomRegexConfig(key, config) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            customConfigs[key] = config;
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ custom regex saved configuration:', { key, config });
        } catch (error) {
            console.error('❌ custom regex failed save configuration:', error);
            throw error;
        }
    }

    /**
     * custom regex delete configuration
     */
    async deleteCustomRegexConfig(key) {
        try {
            const data = await chrome.storage.local.get('customRegexConfigs');
            const customConfigs = data.customRegexConfigs || {};
            
            delete customConfigs[key];
            
            await chrome.storage.local.set({ customRegexConfigs: customConfigs });
            console.log('✅ custom regex delete configuration 已:', key);
        } catch (error) {
            console.error('❌ custom regex failed delete configuration:', error);
            throw error;
        }
    }
}

// manager export settings
window.SettingsManager = SettingsManager;