/**
 * 模式提取器 - 负责各种模式的提取逻辑
 * 优化版本 - 提高性能
 */
class PatternExtractor {
    constructor() {
        // 缓存编译好的正则表达式
        this.defaultPatterns = {
            // API提取模式
            absoluteApi: [
                /["'`](\/(?:api|admin|manage|backend|service|rest|graphql|v\d+)\/[^\s"'`]*?)["'`]/g,
                /["'`](\/[a-zA-Z0-9][^\s"'`]*?\.(?:php|asp|aspx|jsp|do|action|json|xml)[^\s"'`]*)["'`]/g,
                /["'`](\/[a-zA-Z0-9][^\s"'`]*?\?[^\s"'`]+)["'`]/g,
                /(?:url|href|action|src)\s*[:=]\s*["'`](\/[^\s"'`]+)["'`]/g,
                /(?:ajax|fetch|post|get|put|delete)\s*\(\s*["'`](\/[^\s"'`]+)["'`]/g
            ],
            
            relativeApi: [
                /["'`]([a-zA-Z][a-zA-Z0-9\/_\-\.]*\/[^\s"'`]*?\.(?:php|asp|aspx|jsp|do|action|json|xml)[^\s"'`]*)["'`]/g,
                /["'`]([a-zA-Z][a-zA-Z0-9\/_\-\.]*\/[^\s"'`]*?\?[^\s"'`]+)["'`]/g,
                /["'`]((?:api|admin|manage|backend|service)\/[^\s"'`]+)["'`]/g
            ],
            
            // 资源提取模式
            jsFile: /(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi,
            cssFile: /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi,
            image: /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi,
            
            // 敏感信息提取模式 - 更新为增强版本
            email: /['"][a-zA-Z0-9\._\-]*@[a-zA-Z0-9\._\-]{1,63}\.((?!js|css|jpg|jpeg|png|ico)[a-zA-Z]{2,})['"]|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Z|a-z]{2,}/g,
            phone: /(?<!\d)(?:['"]1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7}['"]|(?:\+86|86)?[-\s]?1[3-9]\d{9}|(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?!\d)/g,
            ip: /['"]([a-zA-Z0-9]+:)?\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/.*?)?['"]|\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            
            // 身份证号
            idCard: /['"](\d{8}(0\d|10|11|12)([0-2]\d|30|31)\d{3}$)|(\d{6}(18|19|20)\d{2}(0[1-9]|10|11|12)([0-2]\d|30|31)\d{3}(\d|X|x))['"]|[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
            
            // 合并后的URL和域名提取
            url: /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g,
            domain: /['"]([a-zA-Z0-9]+:)?\/\/[a-zA-Z0-9\-\.]*?\.(xin|com|cn|net|com\.cn|vip|top|cc|shop|club|wang|xyz|luxe|site|news|pub|fun|online|win|red|loan|ren|mom|net\.cn|org|link|biz|bid|help|tech|date|mobi|so|me|tv|co|vc|pw|video|party|pics|website|store|ltd|ink|trade|live|wiki|space|gift|lol|work|band|info|click|photo|market|tel|social|press|game|kim|org\.cn|games|pro|men|love|studio|rocks|asia|group|science|design|software|engineer|lawyer|fit|beer|tw|我爱你|中国|公司|网络|在线|网址|网店|集团|中文网)(\:\d{1,5})?(\/)?['"]|(?:https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)/g,
            
            // 路径提取
            paths: /['"](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\{\}\,\'\"\\]([^\>\< \)\(\{\}\,\'\"\\])*?['"]|['"][^\/\>\< \)\(\{\}\,\'\"\\][\w\/]*?\/[\w\/]*?['"]/g,
            
            // 敏感数据提取 - 大幅增强
            credentials: null, // 将在构造函数完成后初始化
            jwt: /['"]ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\/+-]{10,}\.[A-Za-z0-9._\/+-]{10,}['"]|eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g,
            
            // Bearer Token
            bearerToken: /[Bb]earer\s+[a-zA-Z0-9\-=._+/\\]{20,500}/g,
            
            // Basic Auth
            basicAuth: /[Bb]asic\s+[A-Za-z0-9+/]{18,}={0,2}/g,
            
            // Authorization Header
            authHeader: /["''\[]*[Aa]uthorization["''\]]*\s*[:=]\s*[''"]?\b(?:[Tt]oken\s+)?[a-zA-Z0-9\-_+/]{20,500}[''"]?/g,
            
            // 微信相关
            wechatAppId: /['"]wx[a-z0-9]{15,18}['"]|['"]ww[a-z0-9]{15,18}['"]/g,
            
            // 云服务密钥
            awsKey: /AKIA[A-Z0-9]{16}|LTAI[A-Za-z\d]{12,30}|AKID[A-Za-z\d]{13,40}/g,
            
            // Google API Key
            googleApiKey: /AIza[0-9A-Za-z_\-]{35}/g,
            
            // GitHub Token
            githubToken: /(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}/g,
            
            // GitLab Token
            gitlabToken: /glpat-[a-zA-Z0-9\-=_]{20,22}/g,
            
            // Webhook URLs
            webhookUrls: /https:\/\/qyapi\.weixin\.qq\.com\/cgi\-bin\/webhook\/send\?key=[a-zA-Z0-9\-]{25,50}|https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=[a-z0-9]{50,80}|https:\/\/open\.feishu\.cn\/open\-apis\/bot\/v2\/hook\/[a-z0-9\-]{25,50}|https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9\-_]{6,12}\/[a-zA-Z0-9\-_]{6,12}\/[a-zA-Z0-9\-_]{15,24}/g,
            
            // 加密算法调用检测
            cryptoUsage: /\W(Base64\.encode|Base64\.decode|btoa|atob|CryptoJS\.AES|CryptoJS\.DES|JSEncrypt|rsa|KJUR|\$\.md5|md5|sha1|sha256|sha512)[\(\.]/gi,
            
            // 注释提取
            comments: /<!--([\s\S]*?)-->|\/\*([\s\S]*?)\*\/|\/\/(.+)$/gm,
            
            // GitHub链接
            github: /https?:\/\/github\.com\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+/g,
            
            // Vue文件
            vue: /["'][^"']*\.vue["']/g,
            
            // 公司名称
            company: /(?:公司|集团|企业|有限责任公司|股份有限公司|科技|网络|信息|技术)[\u4e00-\u9fa5]{2,20}(?:公司|集团|企业|有限责任公司|股份有限公司)|[A-Z][a-zA-Z\s]{2,30}(?:Inc|Corp|LLC|Ltd|Company|Group|Technology|Systems)/g
        };
        
        // 当前使用的正则表达式配置
        this.patterns = { ...this.defaultPatterns };
        
        // 自定义正则表达式配置
        this.customRegexConfig = null;
        
        // 标记是否已加载自定义配置
        this.customPatternsLoaded = false;
        
        // 设置全局引用，供设置管理器调用
        window.patternExtractor = this;
        
        // 监听配置更新事件
        window.addEventListener('regexConfigUpdated', (event) => {
            console.log('🔄 收到正则配置更新事件:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // 异步加载自定义配置，但不阻塞构造函数
        this.loadCustomPatterns().catch(error => {
            console.error('❌ 异步加载自定义配置失败:', error);
        });
        
        // 初始化credentials模式（在方法定义完成后）
        this.patterns.credentials = this.buildCredentialsPatterns();
    }
    
    /**
     * 构建凭证模式 - 包含所有密钥类型的正则表达式
     */
    buildCredentialsPatterns() {
        const patterns = [
            // GitHub 各类 Token
            /github[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /github[_-]?oauth[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /github[_-]?api[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /github[_-]?access[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /github[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // AWS 密钥
            /aws[_-]?access[_-]?key[_-]?id["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /aws[_-]?secret[_-]?access[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /aws[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /awssecretkey["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Google API Key
            /google[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /google[_-]?client[_-]?secret["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /google[_-]?maps[_-]?api[_-]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Stripe 密钥
            /stripe[_-]?(secret|private|publishable)[-_]?key["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Slack Token
            /slack[_-]?token["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Twilio 密钥
            /twilio[_-]?(token|sid|api[_-]?key|api[_-]?secret)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Firebase 密钥
            /firebase[_-]?(token|key|api[_-]?token)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Mailgun 密钥
            /mailgun[_-]?(api[_-]?key|secret[_-]?api[_-]?key)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // Docker 密钥
            /docker[_-]?(token|password|key|hub[_-]?password)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // NPM 密钥
            /npm[_-]?(token|api[_-]?key|auth[_-]?token|password)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // 华为云 OSS
            /huawei\.oss\.(ak|sk|bucket\.name|endpoint|local\.path)["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // 私钥
            /["']?[-]+BEGIN \w+ PRIVATE KEY[-]+/gi,
            /["']?private[_-]?key[_-]?(id)?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // 通用密钥字段（模糊匹配）
            /[\w_-]*?password[\w_-]*?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /[\w_-]*?token[\w_-]*?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /[\w_-]*?secret[\w_-]*?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /[\w_-]*?accesskey[\w_-]*?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            /[\w_-]*?bucket[\w_-]*?["']?[^\S\r\n]*[=:][^\S\r\n]*["']?[\w-]+["']?/gi,
            
            // 原有的通用模式
            /(?:username|user|login|account|password|passwd|pwd|token|auth|authorization)\s*[:=]\s*["'`]([^"'`\s]+)["'`]/gi
        ];
        
        // 合并所有模式为一个正则表达式
        return new RegExp(patterns.map(p => p.source).join('|'), 'gi');
    }
    
    /**
     * 加载自定义正则表达式配置
     */
    async loadCustomPatterns() {
        try {
            console.log('🔄 PatternExtractor开始加载自定义配置...');
            
            // 优先加载regexSettings，如果不存在则尝试加载phantomRegexConfig并转换
            const result = await chrome.storage.local.get(['regexSettings', 'phantomRegexConfig']);
            
            let customSettings = null;
            
            if (result.regexSettings) {
                customSettings = result.regexSettings;
                console.log('🔄 PatternExtractor加载regexSettings配置:', customSettings);
            } else if (result.phantomRegexConfig) {
                // 转换phantomRegexConfig格式为regexSettings格式
                const phantomConfig = result.phantomRegexConfig;
                customSettings = {
                    absoluteApis: phantomConfig.api || '',
                    relativeApis: phantomConfig.api || '',
                    domains: phantomConfig.domain || '',
                    emails: phantomConfig.email || '',
                    phoneNumbers: phantomConfig.phone || '',
                    credentials: phantomConfig.sensitive || '',
                    ipAddresses: phantomConfig.ip || '',
                    jwts: phantomConfig.jwt || '',
                    githubUrls: phantomConfig.github || '',
                    vueFiles: phantomConfig.vue || '',
                    companies: phantomConfig.company || '',
                    comments: phantomConfig.comment || ''
                };
                console.log('🔄 PatternExtractor从phantomRegexConfig转换配置:', customSettings);
                
                // 保存转换后的配置，避免下次重复转换
                await chrome.storage.local.set({ regexSettings: customSettings });
            }
            
            if (customSettings) {
                this.updatePatterns(customSettings);
                console.log('✅ PatternExtractor正则表达式配置已更新');
            } else {
                console.log('📋 PatternExtractor使用默认正则表达式配置');
            }
            
            // 标记配置已加载
            this.customPatternsLoaded = true;
            console.log('✅ PatternExtractor自定义配置加载完成');
            
        } catch (error) {
            console.error('❌ PatternExtractor加载自定义正则表达式配置失败:', error);
            this.customPatternsLoaded = true; // 即使失败也标记为已加载，避免无限等待
        }
    }
    
    /**
     * 更新正则表达式配置
     */
    updatePatterns(customSettings) {
        try {
            console.log('🔧 开始更新正则表达式配置...', customSettings);
            
            // 更新绝对路径API正则 - 支持多个正则表达式
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                try {
                    // 分割多个正则表达式（用|分隔）
                    const patterns = customSettings.absoluteApis.split('|').filter(p => p.trim());
                    this.patterns.absoluteApi = patterns.map(pattern => new RegExp(pattern.trim(), 'g'));
                    console.log('📝 更新绝对路径API正则表达式:', patterns.length, '个模式');
                } catch (error) {
                    console.error('❌ 绝对路径API正则表达式格式错误:', error);
                }
            }
            
            // 更新相对路径API正则 - 支持多个正则表达式
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                try {
                    const patterns = customSettings.relativeApis.split('|').filter(p => p.trim());
                    this.patterns.relativeApi = patterns.map(pattern => new RegExp(pattern.trim(), 'g'));
                    console.log('📝 更新相对路径API正则表达式:', patterns.length, '个模式');
                } catch (error) {
                    console.error('❌ 相对路径API正则表达式格式错误:', error);
                }
            }
            
            // 更新域名正则
            if (customSettings.domains && customSettings.domains.trim()) {
                try {
                    const domainRegex = new RegExp(customSettings.domains, 'g');
                    this.patterns.domain = domainRegex;
                    console.log('📝 更新域名正则表达式:', customSettings.domains);
                } catch (error) {
                    console.error('❌ 域名正则表达式格式错误:', error);
                }
            }
            
            // 更新邮箱正则
            if (customSettings.emails && customSettings.emails.trim()) {
                try {
                    const emailRegex = new RegExp(customSettings.emails, 'g');
                    this.patterns.email = emailRegex;
                    console.log('📝 更新邮箱正则表达式:', customSettings.emails);
                } catch (error) {
                    console.error('❌ 邮箱正则表达式格式错误:', error);
                }
            }
            
            // 更新电话正则
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                try {
                    const phoneRegex = new RegExp(customSettings.phoneNumbers, 'g');
                    this.patterns.phone = phoneRegex;
                    console.log('📝 更新电话正则表达式:', customSettings.phoneNumbers);
                } catch (error) {
                    console.error('❌ 电话正则表达式格式错误:', error);
                }
            }
            
            // 更新敏感信息正则
            if (customSettings.credentials && customSettings.credentials.trim()) {
                try {
                    const credentialsRegex = new RegExp(customSettings.credentials, 'gi');
                    this.patterns.credentials = credentialsRegex;
                    console.log('📝 更新敏感信息正则表达式:', customSettings.credentials);
                } catch (error) {
                    console.error('❌ 敏感信息正则表达式格式错误:', error);
                }
            }
            
            // 更新IP地址正则
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                try {
                    const ipRegex = new RegExp(customSettings.ipAddresses, 'g');
                    this.patterns.ip = ipRegex;
                    console.log('📝 更新IP地址正则表达式:', customSettings.ipAddresses);
                } catch (error) {
                    console.error('❌ IP地址正则表达式格式错误:', error);
                }
            }
            
            // 更新路径正则
            if (customSettings.paths && customSettings.paths.trim()) {
                try {
                    const pathRegex = new RegExp(customSettings.paths, 'g');
                    this.patterns.paths = pathRegex;
                    console.log('📝 更新路径正则表达式:', customSettings.paths);
                } catch (error) {
                    console.error('❌ 路径正则表达式格式错误:', error);
                }
            }
            
            // 更新JWT令牌正则
            if (customSettings.jwts && customSettings.jwts.trim()) {
                try {
                    const jwtRegex = new RegExp(customSettings.jwts, 'g');
                    this.patterns.jwt = jwtRegex;
                    console.log('📝 更新JWT令牌正则表达式:', customSettings.jwts);
                } catch (error) {
                    console.error('❌ JWT令牌正则表达式格式错误:', error);
                }
            }
            
            // 更新GitHub链接正则
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                try {
                    const githubRegex = new RegExp(customSettings.githubUrls, 'g');
                    this.patterns.github = githubRegex;
                    console.log('📝 更新GitHub链接正则表达式:', customSettings.githubUrls);
                } catch (error) {
                    console.error('❌ GitHub链接正则表达式格式错误:', error);
                }
            }
            
            // 更新Vue文件正则
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                try {
                    const vueRegex = new RegExp(customSettings.vueFiles, 'g');
                    this.patterns.vue = vueRegex;
                    console.log('📝 更新Vue文件正则表达式:', customSettings.vueFiles);
                } catch (error) {
                    console.error('❌ Vue文件正则表达式格式错误:', error);
                }
            }
            
            // 更新公司名称正则
            if (customSettings.companies && customSettings.companies.trim()) {
                try {
                    const companyRegex = new RegExp(customSettings.companies, 'g');
                    this.patterns.company = companyRegex;
                    console.log('📝 更新公司名称正则表达式:', customSettings.companies);
                } catch (error) {
                    console.error('❌ 公司名称正则表达式格式错误:', error);
                }
            }
            
            // 更新注释正则
            if (customSettings.comments && customSettings.comments.trim()) {
                try {
                    const commentRegex = new RegExp(customSettings.comments, 'gm');
                    this.patterns.comments = commentRegex;
                    console.log('📝 更新注释正则表达式:', customSettings.comments);
                } catch (error) {
                    console.error('❌ 注释正则表达式格式错误:', error);
                }
            }
            
            // 更新身份证正则
            if (customSettings.idCards && customSettings.idCards.trim()) {
                try {
                    const idCardRegex = new RegExp(customSettings.idCards, 'g');
                    this.patterns.idCard = idCardRegex;
                    console.log('📝 更新身份证正则表达式:', customSettings.idCards);
                } catch (error) {
                    console.error('❌ 身份证正则表达式格式错误:', error);
                }
            }
            
            // 更新Bearer Token正则
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                try {
                    const bearerTokenRegex = new RegExp(customSettings.bearerTokens, 'g');
                    this.patterns.bearerToken = bearerTokenRegex;
                    console.log('📝 更新Bearer Token正则表达式:', customSettings.bearerTokens);
                } catch (error) {
                    console.error('❌ Bearer Token正则表达式格式错误:', error);
                }
            }
            
            // 更新Basic Auth正则
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                try {
                    const basicAuthRegex = new RegExp(customSettings.basicAuth, 'g');
                    this.patterns.basicAuth = basicAuthRegex;
                    console.log('📝 更新Basic Auth正则表达式:', customSettings.basicAuth);
                } catch (error) {
                    console.error('❌ Basic Auth正则表达式格式错误:', error);
                }
            }
            
            // 更新Authorization Header正则
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                try {
                    const authHeaderRegex = new RegExp(customSettings.authHeaders, 'g');
                    this.patterns.authHeader = authHeaderRegex;
                    console.log('📝 更新Authorization Header正则表达式:', customSettings.authHeaders);
                } catch (error) {
                    console.error('❌ Authorization Header正则表达式格式错误:', error);
                }
            }
            
            // 更新微信AppID正则
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                try {
                    const wechatAppIdRegex = new RegExp(customSettings.wechatAppIds, 'g');
                    this.patterns.wechatAppId = wechatAppIdRegex;
                    console.log('📝 更新微信AppID正则表达式:', customSettings.wechatAppIds);
                } catch (error) {
                    console.error('❌ 微信AppID正则表达式格式错误:', error);
                }
            }
            
            // 更新AWS密钥正则
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                try {
                    const awsKeyRegex = new RegExp(customSettings.awsKeys, 'g');
                    this.patterns.awsKey = awsKeyRegex;
                    console.log('📝 更新AWS密钥正则表达式:', customSettings.awsKeys);
                } catch (error) {
                    console.error('❌ AWS密钥正则表达式格式错误:', error);
                }
            }
            
            // 更新Google API Key正则
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                try {
                    const googleApiKeyRegex = new RegExp(customSettings.googleApiKeys, 'g');
                    this.patterns.googleApiKey = googleApiKeyRegex;
                    console.log('📝 更新Google API Key正则表达式:', customSettings.googleApiKeys);
                } catch (error) {
                    console.error('❌ Google API Key正则表达式格式错误:', error);
                }
            }
            
            // 更新GitHub Token正则
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                try {
                    const githubTokenRegex = new RegExp(customSettings.githubTokens, 'g');
                    this.patterns.githubToken = githubTokenRegex;
                    console.log('📝 更新GitHub Token正则表达式:', customSettings.githubTokens);
                } catch (error) {
                    console.error('❌ GitHub Token正则表达式格式错误:', error);
                }
            }
            
            // 更新GitLab Token正则
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                try {
                    const gitlabTokenRegex = new RegExp(customSettings.gitlabTokens, 'g');
                    this.patterns.gitlabToken = gitlabTokenRegex;
                    console.log('📝 更新GitLab Token正则表达式:', customSettings.gitlabTokens);
                } catch (error) {
                    console.error('❌ GitLab Token正则表达式格式错误:', error);
                }
            }
            
            // 更新Webhook URLs正则
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                try {
                    const webhookUrlsRegex = new RegExp(customSettings.webhookUrls, 'g');
                    this.patterns.webhookUrls = webhookUrlsRegex;
                    console.log('📝 更新Webhook URLs正则表达式:', customSettings.webhookUrls);
                } catch (error) {
                    console.error('❌ Webhook URLs正则表达式格式错误:', error);
                }
            }
            
            // 更新加密算法使用正则
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                try {
                    const cryptoUsageRegex = new RegExp(customSettings.cryptoUsage, 'gi');
                    this.patterns.cryptoUsage = cryptoUsageRegex;
                    console.log('📝 更新加密算法使用正则表达式:', customSettings.cryptoUsage);
                } catch (error) {
                    console.error('❌ 加密算法使用正则表达式格式错误:', error);
                }
            }
            
            console.log('✅ 正则表达式配置更新完成');
            
            // 保存当前配置状态
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ 更新正则表达式配置失败:', error);
        }
    }
    
    // 专门的API提取方法 - 优化版本
    extractAPIs(content, results) {
        console.log('🔍 [PatternExtractor] 开始提取API...');
        
        // 限制内容大小，避免过大的正则匹配
        const maxContentSize = 300000; // 约300KB
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        console.log(`📊 [PatternExtractor] 处理内容大小: ${processContent.length} 字符`);
        
        // 提取绝对路径API
        console.log(`🔍 [PatternExtractor] 开始提取绝对路径API，使用 ${this.patterns.absoluteApi.length} 个正则模式`);
        let absoluteApiCount = 0;
        this.patterns.absoluteApi.forEach((pattern, index) => {
            console.log(`🔍 [PatternExtractor] 使用绝对路径API正则模式 ${index + 1}: ${pattern.source}`);
            pattern.lastIndex = 0; // 重置正则表达式状态
            let match;
            let matchCount = 0;
            while ((match = pattern.exec(processContent)) !== null) {
                const api = match[1];
                console.log(`🎯 [PatternExtractor] 绝对路径API匹配到: "${api}"`);
                if (api && this.isValidAbsoluteApi(api)) {
                    results.absoluteApis.add(api);
                    absoluteApiCount++;
                    matchCount++;
                    console.log(`✅ [PatternExtractor] 绝对路径API验证通过: "${api}"`);
                } else {
                    console.log(`❌ [PatternExtractor] 绝对路径API验证失败: "${api}"`);
                }
            }
            console.log(`📊 [PatternExtractor] 绝对路径API正则模式 ${index + 1} 匹配到 ${matchCount} 个结果`);
        });
        console.log(`✅ [PatternExtractor] 绝对路径API提取完成，共找到 ${absoluteApiCount} 个有效API`);
        
        // 提取相对路径API
        console.log(`🔍 [PatternExtractor] 开始提取相对路径API，使用 ${this.patterns.relativeApi.length} 个正则模式`);
        let relativeApiCount = 0;
        this.patterns.relativeApi.forEach((pattern, index) => {
            console.log(`🔍 [PatternExtractor] 使用相对路径API正则模式 ${index + 1}: ${pattern.source}`);
            pattern.lastIndex = 0; // 重置正则表达式状态
            let match;
            let matchCount = 0;
            while ((match = pattern.exec(processContent)) !== null) {
                const api = match[1];
                console.log(`🎯 [PatternExtractor] 相对路径API匹配到: "${api}"`);
                if (api && this.isValidRelativeApi(api)) {
                    results.relativeApis.add(api);
                    relativeApiCount++;
                    matchCount++;
                    console.log(`✅ [PatternExtractor] 相对路径API验证通过: "${api}"`);
                } else {
                    console.log(`❌ [PatternExtractor] 相对路径API验证失败: "${api}"`);
                }
            }
            console.log(`📊 [PatternExtractor] 相对路径API正则模式 ${index + 1} 匹配到 ${matchCount} 个结果`);
        });
        console.log(`✅ [PatternExtractor] 相对路径API提取完成，共找到 ${relativeApiCount} 个有效API`);
        
        // 提取JavaScript中的API
        this.extractApisFromJavaScript(processContent, results);
    }
    
    // 从JavaScript代码中提取API - 优化版本
    extractApisFromJavaScript(content, results) {
        // 合并多个正则为一个
        const jsApiPattern = /(?:fetch|axios\s*\.\s*(?:get|post|put|delete|patch)|\$\.(?:get|post|ajax)|XMLHttpRequest.*?open)\s*\(\s*["'`]([^"'`]+)["'`]|url\s*:\s*["'`]([^"'`]+)["'`]/g;
        
        let match;
        while ((match = jsApiPattern.exec(content)) !== null) {
            const url = match[1] || match[2];
            if (url) {
                if (url.startsWith('/')) {
                    if (this.isValidAbsoluteApi(url)) {
                        results.absoluteApis.add(url);
                    }
                } else if (!url.startsWith('http') && url.includes('/')) {
                    if (this.isValidRelativeApi(url)) {
                        results.relativeApis.add(url);
                    }
                }
            }
        }
    }
    
    // 从表单中提取API
    extractApisFromForms(results) {
        const forms = document.querySelectorAll('form[action]');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action && action !== '#' && action !== '') {
                if (action.startsWith('/')) {
                    if (this.isValidAbsoluteApi(action)) {
                        results.absoluteApis.add(action);
                    }
                } else if (!action.startsWith('http') && action.includes('/')) {
                    if (this.isValidRelativeApi(action)) {
                        results.relativeApis.add(action);
                    }
                }
            }
        });
    }
    
    // 验证绝对路径API - 优化版本
    isValidAbsoluteApi(path) {
        if (!path || !path.startsWith('/') || path.length < 2) return false;
        
        // 静态资源过滤
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i.test(path)) {
            return false;
        }
        
        // 静态路径过滤
        if (/^\/(css|js|img|images|assets|static|public|fonts|favicon)/i.test(path)) {
            return false;
        }
        
        // 快速匹配API特征
        if (/\/(api|admin|manage|backend|service|rest|graphql|v\d+)\//i.test(path) || 
            /\.(php|asp|aspx|jsp|do|action|json|xml)(\?|$)/i.test(path) ||
            (path.includes('?') && path.includes('='))) {
            return true;
        }
        
        // 其他可能的API路径
        return path.length > 3 && path.length < 200 && /^\/[a-zA-Z0-9\/_\-]+$/.test(path);
    }
    
    // 验证相对路径API - 优化版本
    isValidRelativeApi(path) {
        if (!path || path.startsWith('/') || path.startsWith('.') || path.includes('://')) {
            return false;
        }
        
        if (!path.includes('/')) return false;
        
        // 静态资源过滤
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map)$/i.test(path)) {
            return false;
        }
        
        // 快速匹配API特征
        if (/^(api|admin|manage|backend|service)\//i.test(path) || 
            /\.(php|asp|aspx|jsp|do|action|json|xml)(\?|$)/i.test(path) ||
            (path.includes('?') && path.includes('='))) {
            return true;
        }
        
        // 其他可能的API路径
        return path.length > 3 && path.length < 200 && /^[a-zA-Z][a-zA-Z0-9\/_\-]*\/[a-zA-Z0-9\/_\-]+$/.test(path);
    }
    
    // 提取其他资源 - 优化版本
    // 提取其他资源 - 优化版本
    extractOtherResources(content, results) {
        console.log('📁 [PatternExtractor] 开始提取其他资源...');
        
        // 限制内容大小
        const maxContentSize = 300000;
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        console.log(`📊 [PatternExtractor] 其他资源处理内容大小: ${processContent.length} 字符`);
        
        // 提取JS文件
        console.log('🔍 [PatternExtractor] 开始提取JS文件...');
        console.log(`🔍 [PatternExtractor] 使用JS文件正则: ${this.patterns.jsFile.source}`);
        this.patterns.jsFile.lastIndex = 0;
        let match;
        let jsFileCount = 0;
        while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
            const jsFile = match[1] || match[2] || match[3];
            console.log(`🎯 [PatternExtractor] JS文件匹配到: "${jsFile}"`);
            if (jsFile) {
                const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                results.jsFiles.add(cleanJsFile);
                jsFileCount++;
                console.log(`✅ [PatternExtractor] JS文件添加: "${cleanJsFile}"`);
            }
        }
        console.log(`📊 [PatternExtractor] JS文件提取完成，共找到 ${jsFileCount} 个`);
        
        // 提取CSS文件
        console.log('🔍 [PatternExtractor] 开始提取CSS文件...');
        console.log(`🔍 [PatternExtractor] 使用CSS文件正则: ${this.patterns.cssFile.source}`);
        this.patterns.cssFile.lastIndex = 0;
        let cssFileCount = 0;
        while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
            const cssFile = match[1];
            console.log(`🎯 [PatternExtractor] CSS文件匹配到: "${cssFile}"`);
            if (cssFile) {
                const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                results.cssFiles.add(cleanCssFile);
                cssFileCount++;
                console.log(`✅ [PatternExtractor] CSS文件添加: "${cleanCssFile}"`);
            }
        }
        console.log(`📊 [PatternExtractor] CSS文件提取完成，共找到 ${cssFileCount} 个`);
        
        // 提取图片
        console.log('🔍 [PatternExtractor] 开始提取图片...');
        console.log(`🔍 [PatternExtractor] 使用图片正则: ${this.patterns.image.source}`);
        this.patterns.image.lastIndex = 0;
        let imageCount = 0;
        while ((match = this.patterns.image.exec(processContent)) !== null) {
            const image = match[1];
            console.log(`🎯 [PatternExtractor] 图片匹配到: "${image}"`);
            if (image) {
                const cleanImage = image.replace(/["'`]/g, '').trim();
                results.images.add(cleanImage);
                imageCount++;
                console.log(`✅ [PatternExtractor] 图片添加: "${cleanImage}"`);
            }
        }
        console.log(`📊 [PatternExtractor] 图片提取完成，共找到 ${imageCount} 个`);
        
        // 提取URL
        console.log('🔍 [PatternExtractor] 开始提取URL...');
        console.log(`🔍 [PatternExtractor] 使用URL正则: ${this.patterns.url.source}`);
        this.patterns.url.lastIndex = 0;
        let urlCount = 0;
        while ((match = this.patterns.url.exec(processContent)) !== null) {
            const url = match[1];
            console.log(`🎯 [PatternExtractor] URL匹配到: "${url}"`);
            if (url && !url.includes('chrome-extension://') && !url.includes('moz-extension://')) {
                const cleanUrl = url.replace(/["'`]/g, '').trim();
                results.urls.add(cleanUrl);
                urlCount++;
                console.log(`✅ [PatternExtractor] URL添加: "${cleanUrl}"`);
            } else {
                console.log(`❌ [PatternExtractor] URL过滤掉: "${url}"`);
            }
        }
        console.log(`📊 [PatternExtractor] URL提取完成，共找到 ${urlCount} 个`);
        
        // 提取域名 - 使用自定义正则（如果有）
        console.log('🔍 [PatternExtractor] 开始提取域名...');
        const domainPattern = this.patterns.domain;
        console.log(`🔍 [PatternExtractor] 使用域名正则: ${domainPattern.source.substring(0, 100)}...`);
        domainPattern.lastIndex = 0;
        let domainCount = 0;
        while ((match = domainPattern.exec(processContent)) !== null) {
            const domain = match[1] || match[0];
            console.log(`🎯 [PatternExtractor] 域名匹配到: "${domain}"`);
            if (domain && !domain.includes('chrome-extension') && !domain.includes('moz-extension')) {
                const cleanDomain = domain.replace(/["'`]/g, '').trim();
                results.domains.add(cleanDomain);
                domainCount++;
                console.log(`✅ [PatternExtractor] 域名添加: "${cleanDomain}"`);
            } else {
                console.log(`❌ [PatternExtractor] 域名过滤掉: "${domain}"`);
            }
        }
        console.log(`📊 [PatternExtractor] 域名提取完成，共找到 ${domainCount} 个`);
        
        // 提取邮箱 - 使用自定义正则（如果有）
        console.log('🔍 [PatternExtractor] 开始提取邮箱...');
        const emailPattern = this.patterns.email;
        console.log(`🔍 [PatternExtractor] 使用邮箱正则: ${emailPattern.source.substring(0, 100)}...`);
        emailPattern.lastIndex = 0;
        let emailCount = 0;
        while ((match = emailPattern.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] 邮箱匹配到: "${match[0]}"`);
            results.emails.add(match[0]);
            emailCount++;
            console.log(`✅ [PatternExtractor] 邮箱添加: "${match[0]}"`);
        }
        console.log(`📊 [PatternExtractor] 邮箱提取完成，共找到 ${emailCount} 个`);
        
        // 提取电话号码 - 使用自定义正则（如果有）
        console.log('🔍 [PatternExtractor] 开始提取电话号码...');
        const phonePattern = this.patterns.phone;
        console.log(`🔍 [PatternExtractor] 使用电话正则: ${phonePattern.source.substring(0, 100)}...`);
        phonePattern.lastIndex = 0;
        let phoneCount = 0;
        while ((match = phonePattern.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] 电话号码匹配到: "${match[0]}"`);
            results.phoneNumbers.add(match[0]);
            phoneCount++;
            console.log(`✅ [PatternExtractor] 电话号码添加: "${match[0]}"`);
        }
        console.log(`📊 [PatternExtractor] 电话号码提取完成，共找到 ${phoneCount} 个`);
        
        // 提取IP地址
        console.log('🔍 [PatternExtractor] 开始提取IP地址...');
        console.log(`🔍 [PatternExtractor] 使用IP地址正则: ${this.patterns.ip.source.substring(0, 100)}...`);
        this.patterns.ip.lastIndex = 0;
        let ipCount = 0;
        while ((match = this.patterns.ip.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] IP地址匹配到: "${match[0]}"`);
            results.ipAddresses.add(match[0]);
            ipCount++;
            console.log(`✅ [PatternExtractor] IP地址添加: "${match[0]}"`);
        }
        console.log(`📊 [PatternExtractor] IP地址提取完成，共找到 ${ipCount} 个`);
        
        // 提取注释
        console.log('🔍 [PatternExtractor] 开始提取注释...');
        console.log(`🔍 [PatternExtractor] 使用注释正则: ${this.patterns.comments.source}`);
        this.patterns.comments.lastIndex = 0;
        let commentCount = 0;
        while ((match = this.patterns.comments.exec(processContent)) !== null) {
            const comment = (match[1] || match[2] || match[3] || '').trim();
            console.log(`🎯 [PatternExtractor] 注释匹配到: "${comment}"`);
            if (comment && comment.length > 5 && comment.length < 500) {
                results.comments.add(comment);
                commentCount++;
                console.log(`✅ [PatternExtractor] 注释添加: "${comment}"`);
            } else {
                console.log(`❌ [PatternExtractor] 注释验证失败 (长度: ${comment ? comment.length : 0}): "${comment}"`);
            }
        }
        console.log(`📊 [PatternExtractor] 注释提取完成，共找到 ${commentCount} 个`);
        
        console.log('🎉 [PatternExtractor] 其他资源提取完成！');
    }
    
    // 提取敏感数据 - 大幅增强版本
    extractSensitiveData(content, results) {
        console.log('🔐 [PatternExtractor] 开始提取敏感数据...');
        
        // 限制内容大小
        const maxContentSize = 300000;
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        console.log(`📊 [PatternExtractor] 敏感数据处理内容大小: ${processContent.length} 字符`);
        console.log(`🔍 [PatternExtractor] 结果对象包含的字段:`, Object.keys(results));
        
        // 提取凭证信息 - 使用增强的凭证模式
        console.log('🔍 [PatternExtractor] 开始提取凭证信息...');
        if (this.patterns.credentials) {
            console.log(`🔍 [PatternExtractor] 使用凭证正则: ${this.patterns.credentials.source.substring(0, 100)}...`);
            this.patterns.credentials.lastIndex = 0;
            let match;
            let credentialCount = 0;
            while ((match = this.patterns.credentials.exec(processContent)) !== null) {
                const credential = match[0];
                console.log(`🎯 [PatternExtractor] 凭证匹配到: "${credential}"`);
                if (credential && credential.length > 5 && credential.length < 200) {
                    if (results.credentials) {
                        results.credentials.add(credential);
                        credentialCount++;
                        console.log(`✅ [PatternExtractor] 凭证添加到 credentials: "${credential}"`);
                    } else if (results.sensitiveKeywords) {
                        results.sensitiveKeywords.add(credential);
                        credentialCount++;
                        console.log(`✅ [PatternExtractor] 凭证添加到 sensitiveKeywords: "${credential}"`);
                    } else {
                        console.log(`❌ [PatternExtractor] 无法添加凭证，results中没有 credentials 或 sensitiveKeywords 字段`);
                    }
                } else {
                    console.log(`❌ [PatternExtractor] 凭证验证失败 (长度: ${credential ? credential.length : 0}): "${credential}"`);
                }
            }
            console.log(`📊 [PatternExtractor] 凭证提取完成，共找到 ${credentialCount} 个有效凭证`);
        } else {
            console.log('❌ [PatternExtractor] 凭证正则模式未初始化');
        }
        
        
        // 提取JWT令牌
        console.log('🔍 [PatternExtractor] 开始提取JWT令牌...');
        console.log(`🔍 [PatternExtractor] 使用JWT正则: ${this.patterns.jwt.source}`);
        this.patterns.jwt.lastIndex = 0;
        let match;
        let jwtCount = 0;
        while ((match = this.patterns.jwt.exec(processContent)) !== null) {
            const jwt = match[0].replace(/["']/g, '');
            console.log(`🎯 [PatternExtractor] JWT匹配到: "${jwt}"`);
            if (jwt && jwt.split('.').length === 3) {
                if (results.jwts) {
                    results.jwts.add(jwt);
                    jwtCount++;
                    console.log(`✅ [PatternExtractor] JWT添加到 jwts: "${jwt}"`);
                } else if (results.sensitiveKeywords) {
                    results.sensitiveKeywords.add(jwt);
                    jwtCount++;
                    console.log(`✅ [PatternExtractor] JWT添加到 sensitiveKeywords: "${jwt}"`);
                } else {
                    console.log(`❌ [PatternExtractor] 无法添加JWT，results中没有 jwts 或 sensitiveKeywords 字段`);
                }
            } else {
                console.log(`❌ [PatternExtractor] JWT验证失败 (分段数: ${jwt ? jwt.split('.').length : 0}): "${jwt}"`);
            }
        }
        console.log(`📊 [PatternExtractor] JWT提取完成，共找到 ${jwtCount} 个有效JWT`);
        
        // 提取Bearer Token
        console.log('🔍 [PatternExtractor] 开始提取Bearer Token...');
        console.log(`🔍 [PatternExtractor] 使用Bearer Token正则: ${this.patterns.bearerToken.source}`);
        this.patterns.bearerToken.lastIndex = 0;
        let bearerCount = 0;
        while ((match = this.patterns.bearerToken.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] Bearer Token匹配到: "${match[0]}"`);
            if (results.bearerTokens) {
                results.bearerTokens.add(match[0]);
                bearerCount++;
                console.log(`✅ [PatternExtractor] Bearer Token添加到 bearerTokens: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                bearerCount++;
                console.log(`✅ [PatternExtractor] Bearer Token添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加Bearer Token，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] Bearer Token提取完成，共找到 ${bearerCount} 个`);
        
        // 提取Basic Auth
        console.log('🔍 [PatternExtractor] 开始提取Basic Auth...');
        console.log(`🔍 [PatternExtractor] 使用Basic Auth正则: ${this.patterns.basicAuth.source}`);
        this.patterns.basicAuth.lastIndex = 0;
        let basicAuthCount = 0;
        while ((match = this.patterns.basicAuth.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] Basic Auth匹配到: "${match[0]}"`);
            if (results.basicAuth) {
                results.basicAuth.add(match[0]);
                basicAuthCount++;
                console.log(`✅ [PatternExtractor] Basic Auth添加到 basicAuth: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                basicAuthCount++;
                console.log(`✅ [PatternExtractor] Basic Auth添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加Basic Auth，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] Basic Auth提取完成，共找到 ${basicAuthCount} 个`);
        
        // 提取Authorization Header
        console.log('🔍 [PatternExtractor] 开始提取Authorization Header...');
        console.log(`🔍 [PatternExtractor] 使用Authorization Header正则: ${this.patterns.authHeader.source}`);
        this.patterns.authHeader.lastIndex = 0;
        let authHeaderCount = 0;
        while ((match = this.patterns.authHeader.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] Authorization Header匹配到: "${match[0]}"`);
            if (results.authHeaders) {
                results.authHeaders.add(match[0]);
                authHeaderCount++;
                console.log(`✅ [PatternExtractor] Authorization Header添加到 authHeaders: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                authHeaderCount++;
                console.log(`✅ [PatternExtractor] Authorization Header添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加Authorization Header，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] Authorization Header提取完成，共找到 ${authHeaderCount} 个`);
        
        // 提取微信AppID
        console.log('🔍 [PatternExtractor] 开始提取微信AppID...');
        console.log(`🔍 [PatternExtractor] 使用微信AppID正则: ${this.patterns.wechatAppId.source}`);
        this.patterns.wechatAppId.lastIndex = 0;
        let wechatCount = 0;
        while ((match = this.patterns.wechatAppId.exec(processContent)) !== null) {
            const appId = match[0].replace(/["']/g, '');
            console.log(`🎯 [PatternExtractor] 微信AppID匹配到: "${appId}"`);
            if (results.wechatAppIds) {
                results.wechatAppIds.add(appId);
                wechatCount++;
                console.log(`✅ [PatternExtractor] 微信AppID添加到 wechatAppIds: "${appId}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(appId);
                wechatCount++;
                console.log(`✅ [PatternExtractor] 微信AppID添加到 sensitiveKeywords: "${appId}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加微信AppID，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] 微信AppID提取完成，共找到 ${wechatCount} 个`);
        
        // 提取AWS密钥
        console.log('🔍 [PatternExtractor] 开始提取AWS密钥...');
        console.log(`🔍 [PatternExtractor] 使用AWS密钥正则: ${this.patterns.awsKey.source}`);
        this.patterns.awsKey.lastIndex = 0;
        let awsCount = 0;
        while ((match = this.patterns.awsKey.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] AWS密钥匹配到: "${match[0]}"`);
            if (results.awsKeys) {
                results.awsKeys.add(match[0]);
                awsCount++;
                console.log(`✅ [PatternExtractor] AWS密钥添加到 awsKeys: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                awsCount++;
                console.log(`✅ [PatternExtractor] AWS密钥添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加AWS密钥，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] AWS密钥提取完成，共找到 ${awsCount} 个`);
        
        // 提取Google API Key
        console.log('🔍 [PatternExtractor] 开始提取Google API Key...');
        console.log(`🔍 [PatternExtractor] 使用Google API Key正则: ${this.patterns.googleApiKey.source}`);
        this.patterns.googleApiKey.lastIndex = 0;
        let googleCount = 0;
        while ((match = this.patterns.googleApiKey.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] Google API Key匹配到: "${match[0]}"`);
            if (results.googleApiKeys) {
                results.googleApiKeys.add(match[0]);
                googleCount++;
                console.log(`✅ [PatternExtractor] Google API Key添加到 googleApiKeys: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                googleCount++;
                console.log(`✅ [PatternExtractor] Google API Key添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加Google API Key，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] Google API Key提取完成，共找到 ${googleCount} 个`);
        
        // 提取GitHub Token
        console.log('🔍 [PatternExtractor] 开始提取GitHub Token...');
        console.log(`🔍 [PatternExtractor] 使用GitHub Token正则: ${this.patterns.githubToken.source}`);
        this.patterns.githubToken.lastIndex = 0;
        let githubTokenCount = 0;
        while ((match = this.patterns.githubToken.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] GitHub Token匹配到: "${match[0]}"`);
            if (results.githubTokens) {
                results.githubTokens.add(match[0]);
                githubTokenCount++;
                console.log(`✅ [PatternExtractor] GitHub Token添加到 githubTokens: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                githubTokenCount++;
                console.log(`✅ [PatternExtractor] GitHub Token添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加GitHub Token，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] GitHub Token提取完成，共找到 ${githubTokenCount} 个`);
        
        // 提取GitLab Token
        console.log('🔍 [PatternExtractor] 开始提取GitLab Token...');
        console.log(`🔍 [PatternExtractor] 使用GitLab Token正则: ${this.patterns.gitlabToken.source}`);
        this.patterns.gitlabToken.lastIndex = 0;
        let gitlabTokenCount = 0;
        while ((match = this.patterns.gitlabToken.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] GitLab Token匹配到: "${match[0]}"`);
            if (results.gitlabTokens) {
                results.gitlabTokens.add(match[0]);
                gitlabTokenCount++;
                console.log(`✅ [PatternExtractor] GitLab Token添加到 gitlabTokens: "${match[0]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[0]);
                gitlabTokenCount++;
                console.log(`✅ [PatternExtractor] GitLab Token添加到 sensitiveKeywords: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加GitLab Token，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] GitLab Token提取完成，共找到 ${gitlabTokenCount} 个`);
        
        // 提取Webhook URLs
        console.log('🔍 [PatternExtractor] 开始提取Webhook URLs...');
        console.log(`🔍 [PatternExtractor] 使用Webhook URLs正则: ${this.patterns.webhookUrls.source}`);
        this.patterns.webhookUrls.lastIndex = 0;
        let webhookCount = 0;
        while ((match = this.patterns.webhookUrls.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] Webhook URL匹配到: "${match[0]}"`);
            if (results.webhookUrls) {
                results.webhookUrls.add(match[0]);
                webhookCount++;
                console.log(`✅ [PatternExtractor] Webhook URL添加到 webhookUrls: "${match[0]}"`);
            } else if (results.urls) {
                results.urls.add(match[0]);
                webhookCount++;
                console.log(`✅ [PatternExtractor] Webhook URL添加到 urls: "${match[0]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加Webhook URL，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] Webhook URLs提取完成，共找到 ${webhookCount} 个`);
        
        // 提取身份证号
        console.log('🔍 [PatternExtractor] 开始提取身份证号...');
        console.log(`🔍 [PatternExtractor] 使用身份证号正则: ${this.patterns.idCard.source}`);
        this.patterns.idCard.lastIndex = 0;
        let idCardCount = 0;
        while ((match = this.patterns.idCard.exec(processContent)) !== null) {
            const idCard = match[0].replace(/["']/g, '');
            console.log(`🎯 [PatternExtractor] 身份证号匹配到: "${idCard}"`);
            if (idCard && (idCard.length === 15 || idCard.length === 18)) {
                if (results.idCards) {
                    results.idCards.add(idCard);
                    idCardCount++;
                    console.log(`✅ [PatternExtractor] 身份证号添加到 idCards: "${idCard}"`);
                } else if (results.sensitiveKeywords) {
                    results.sensitiveKeywords.add(idCard);
                    idCardCount++;
                    console.log(`✅ [PatternExtractor] 身份证号添加到 sensitiveKeywords: "${idCard}"`);
                } else {
                    console.log(`❌ [PatternExtractor] 无法添加身份证号，results中没有相应字段`);
                }
            } else {
                console.log(`❌ [PatternExtractor] 身份证号验证失败 (长度: ${idCard ? idCard.length : 0}): "${idCard}"`);
            }
        }
        console.log(`📊 [PatternExtractor] 身份证号提取完成，共找到 ${idCardCount} 个`);
        
        // 提取路径
        console.log('🔍 [PatternExtractor] 开始提取路径...');
        console.log(`🔍 [PatternExtractor] 使用路径正则: ${this.patterns.paths.source}`);
        this.patterns.paths.lastIndex = 0;
        let pathCount = 0;
        while ((match = this.patterns.paths.exec(processContent)) !== null) {
            const path = match[0].replace(/["']/g, '');
            console.log(`🎯 [PatternExtractor] 路径匹配到: "${path}"`);
            if (path && path.length > 2 && path.length < 200) {
                if (results.paths) {
                    results.paths.add(path);
                    pathCount++;
                    console.log(`✅ [PatternExtractor] 路径添加到 paths: "${path}"`);
                } else {
                    console.log(`❌ [PatternExtractor] 无法添加路径，results中没有 paths 字段`);
                }
            } else {
                console.log(`❌ [PatternExtractor] 路径验证失败 (长度: ${path ? path.length : 0}): "${path}"`);
            }
        }
        console.log(`📊 [PatternExtractor] 路径提取完成，共找到 ${pathCount} 个`);
        
        // 检测加密算法使用
        console.log('🔍 [PatternExtractor] 开始检测加密算法使用...');
        console.log(`🔍 [PatternExtractor] 使用加密算法正则: ${this.patterns.cryptoUsage.source}`);
        this.patterns.cryptoUsage.lastIndex = 0;
        let cryptoCount = 0;
        while ((match = this.patterns.cryptoUsage.exec(processContent)) !== null) {
            console.log(`🎯 [PatternExtractor] 加密算法匹配到: "${match[1]}"`);
            if (results.cryptoUsage) {
                results.cryptoUsage.add(match[1]);
                cryptoCount++;
                console.log(`✅ [PatternExtractor] 加密算法添加到 cryptoUsage: "${match[1]}"`);
            } else if (results.sensitiveKeywords) {
                results.sensitiveKeywords.add(match[1]);
                cryptoCount++;
                console.log(`✅ [PatternExtractor] 加密算法添加到 sensitiveKeywords: "${match[1]}"`);
            } else {
                console.log(`❌ [PatternExtractor] 无法添加加密算法，results中没有相应字段`);
            }
        }
        console.log(`📊 [PatternExtractor] 加密算法检测完成，共找到 ${cryptoCount} 个`);
        
        console.log('🎉 [PatternExtractor] 敏感数据提取完成！');
        
        // 提取GitHub链接 - 使用动态正则
        if (this.patterns.github) {
            this.patterns.github.lastIndex = 0;
            while ((match = this.patterns.github.exec(processContent)) !== null) {
                results.githubUrls.add(match[0]);
            }
        }
        
        // 提取Vue文件 - 使用动态正则
        if (this.patterns.vue) {
            this.patterns.vue.lastIndex = 0;
            while ((match = this.patterns.vue.exec(processContent)) !== null) {
                const vueFile = match[1] || match[0];
                if (vueFile) {
                    results.vueFiles.add(vueFile.replace(/["'`]/g, ''));
                }
            }
        }
        
        // 提取公司名称 - 使用动态正则
        if (this.patterns.company) {
            this.patterns.company.lastIndex = 0;
            while ((match = this.patterns.company.exec(processContent)) !== null) {
                const company = match[0];
                if (company && company.length > 4 && company.length < 50) {
                    results.companies.add(company);
                }
            }
        }
    }
}