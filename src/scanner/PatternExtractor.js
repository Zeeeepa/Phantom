/**
 * patternextract器 - 只usesettings界面configurationregexexpression
 * unified化version - 去除all内置regexand降级机制
 */
class PatternExtractor {
    constructor() {
        // 静态文件扩展名列表 - forthrough滤绝对路径and相对路径API
        this.staticFileExtensions = [
            // 图片文件
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
            // 样式文件
            '.css', '.scss', '.sass', '.less',
            // 脚本文件
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.coffee',
            // 字体文件
            '.woff', '.woff2', '.ttf', '.otf', '.eot',
            // 音频文件
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // 视频文件
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
        ];

        // domain黑名单：not会展示以下domain
        this.DOMAIN_BLACKLIST = [
            'el.datepicker.today',
            'obj.style.top',
            'window.top',
            'mydragdiv.style.top',
            'container.style.top',
            'location.host',
            'page.info',
            'res.info',
            'item.info',
            'vuejs.org'
        ];

        // 内容class型through滤列表 - for静态路径and相对路径through滤
        this.FILTERED_CONTENT_TYPES = [  
            'multipart/form-data',
            'node_modules/',
            'pause/break',
            'partial/ajax',
            'chrome/',
            'firefox/',
            'edge/',
            'examples/element-ui',
            'static/js/',
            'static/css/',
            'stylesheet/less',
            'jpg/jpeg/png/pdf',
            // dateclass型
            'yyyy/mm/dd',
            'dd/mm/yyyy',
            'mm/dd/yy',
            'yy/mm/dd',
            'm/d/Y',
            'm/d/y',
            'xx/xx',
            'zrender/vml/vml',
            // CSS单位andregexexpressionpattern
            '/rem/g',
            '/vw/g',
            '/vh/g',
            '/-/g',
            '/./g',
            '/f.value',
            '/i.test',
            // 操作系统detectpattern
            '/android/i.test',
            '/CrOS/.test',
            '/windows/i.test',
            '/macintosh/i.test',
            '/linux/i.test',
            '/tablet/i.test',
            '/xbox/i.test',
            '/bada/i.test',
            // 浏览器detectpattern
            '/silk/i.test',
            '/sailfish/i.test',
            '/tizen/i.test',
            '/SamsungBrowser/i.test',
            '/opera/i.test',
            '/Whale/i.test',
            '/MZBrowser/i.test',
            '/coast/i.test',
            '/focus/i.test',
            '/yabrowser/i.test',
            '/ucbrowser/i.test',
            '/mxios/i.test',
            '/epiphany/i.test',
            '/puffin/i.test',
            '/sleipnir/i.test',
            '/k-meleon/i.test',
            '/vivaldi/i.test',
            '/phantom/i.test',
            '/slimerjs/i.test',
            '/qupzilla/i.test',
            '/chromium/i.test',
            '/googlebot/i.test',
            '/Android/i.exec',
            '/t.getWidth',
            '/t.getHeight',
            '/t.get',
            '/i.exec',
            '/e.offsetWidth',
            '/e.offsetHeight',
            '/e.offset',
            '/t.ratio/a.value',
            '/i.exec',
            '/Mobile/i.exec',
            '/Win64/.exec',
            '/d.count',
            '/Math.LN10',
            '/2-z-Y-Ie-A.mainAxis',
            '/top/.test',
            '/Y/.test'
        ];
        
        // 引入ID cardvalidationthrough滤器
        this.idCardFilter = null;
        this.loadIdCardFilter();
        
        // 当beforeuseregexexpressionconfiguration - initial为空，只usesettings界面configuration
        this.patterns = {};
        
        // customregexexpressionconfiguration
        this.customRegexConfig = null;
        
        // 标记是否alreadyloadcustomconfiguration
        this.customPatternsLoaded = false;
        
        // settings全局引for，供settings管理器调for
        window.patternExtractor = this;
        
        // listenconfiguration更newevent
        window.addEventListener('regexConfigUpdated', (event) => {
            //console.log('🔄 receivedregexconfiguration更newevent:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // asyncloadcustomconfiguration，butnot阻塞构造函数
        this.loadCustomPatterns().catch(error => {
            console.error('❌ asyncloadcustomconfigurationfailed:', error);
        });
    }
    
    /**
     * loadID cardvalidationthrough滤器
     */
    loadIdCardFilter() {
        try {
            // 尝试from全局变量get
            if (typeof window !== 'undefined' && window.idCardFilter) {
                this.idCardFilter = window.idCardFilter;
                //console.log('✅ ID cardthrough滤器loadsuccess (全局变量)');
                return;
            }
            
            // 尝试动态load
            const script = document.createElement('script');
            script.src = 'filters/id-card-filter.js';
            script.onload = () => {
                if (window.idCardFilter) {
                    this.idCardFilter = window.idCardFilter;
                    //console.log('✅ ID cardthrough滤器动态loadsuccess');
                } else {
                    console.warn('⚠️ ID cardthrough滤器loadfailed：未found idCardFilter');
                }
            };
            script.onerror = () => {
                console.error('❌ ID cardthrough滤器脚本loadfailed');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('❌ loadID cardthrough滤器时出错:', error);
        }
    }
    
    /**
     * detectURL是否为静态文件
     * @param {string} url - 要detectURL
     * @returns {boolean} 是否为静态文件
     */
    isStaticFile(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        // 移除查询parameterand锚点
        const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
        
        // check是否以静态文件扩展名ending
        return this.staticFileExtensions.some(ext => cleanUrl.endsWith(ext));
    }

    /**
     * checkdomain是否in黑名单in
     * @param {string} domain - 要checkdomain
     * @returns {boolean} 是否in黑名单in
     */
    isDomainBlacklisted(domain) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }
        
        // 清理domain，移除协议、路径等
        const cleanDomain = domain.toLowerCase()
            .replace(/^https?:\/\//, '')  // 移除协议
            .replace(/\/.*$/, '')         // 移除路径
            .replace(/:\d+$/, '')         // 移除端口
            .trim();
        
        // check是否in黑名单in
        const isBlacklisted = this.DOMAIN_BLACKLIST.includes(cleanDomain);
        
        if (isBlacklisted) {
            console.log(`🚫 [PatternExtractor] domainalreadyby黑名单through滤: "${cleanDomain}"`);
        }
        
        return isBlacklisted;
    }

    /**
     * check路径是否containsrequirethrough滤内容class型
     * @param {string} path - 要check路径
     * @returns {boolean} 是否containsrequirethrough滤内容class型
     */
    containsFilteredContentType(path) {
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        const lowerPath = path.toLowerCase();
        
        // check是否contains任何through滤内容class型
        const isFiltered = this.FILTERED_CONTENT_TYPES.some(contentType => {
            return lowerPath.includes(contentType.toLowerCase());
        });
        
        if (isFiltered) {
            console.log(`🚫 [PatternExtractor] 路径containsthrough滤内容class型，alreadythrough滤: "${path}"`);
        }
        
        return isFiltered;
    }

    /**
     * through滤静态文件路径
     * @param {Array} paths - 路径数组
     * @returns {Array} through滤后路径数组
     */
    filterStaticPaths(paths) {
        return paths.filter(path => {
            // check是否containsrequirethrough滤内容class型
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // get文件扩展名
            const ext = path.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // without扩展名keep
            
            // check是否为静态文件扩展名
            return !this.staticFileExtensions.includes(ext[0]);
        });
    }

    /**
     * through滤相对路径in静态文件
     * @param {Array} relativePaths - 相对路径数组
     * @returns {Array} through滤后相对路径数组
     */
    filterStaticRelativePaths(relativePaths) {
        return relativePaths.filter(path => {
            // check是否containsrequirethrough滤内容class型
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // 处理相对路径，可能contains ../ or ./
            const normalizedPath = path.replace(/^\.\.?\//, '');
            
            // get文件扩展名
            const ext = normalizedPath.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // without扩展名keep
            
            // check是否为静态文件扩展名
            const isStaticFile = this.staticFileExtensions.includes(ext[0]);
            
            // recordthrough滤静态文件（for调试）
            if (isStaticFile) {
                console.log(`🚫 [PatternExtractor] through滤相对路径静态文件: ${path}`);
            }
            
            return !isStaticFile;
        });
    }

    // 处理相对路径API，去除开头"."符号butkeep"/"
    processRelativeApi(api) {
        try {
            // 去除开头"."符号，butkeep"/"
            if (api.startsWith('./')) {
                return api.substring(1); // 去除开头"."，keep"/"
            } else if (api.startsWith('.') && !api.startsWith('/')) {
                return api.substring(1); // 去除开头"."
            }
            return api; // 其他情况keepnot变
        } catch (error) {
            console.warn('⚠️ 处理相对路径API时出错:', error);
            return api;
        }
    }
    
    /**
     * validationandthrough滤ID cardnumber，只keep18-digitvalidID card
     * @param {Array} idCards - extracttoID cardnumber数组
     * @returns {Array} validation通through18-digit ID cardnumber数组
     */
    validateIdCards(idCards) {
        if (!this.idCardFilter || !Array.isArray(idCards)) {
            return idCards || [];
        }
        
        const validIdCards = [];
        
        for (const idCard of idCards) {
            try {
                const cleanIdCard = idCard.replace(/['"]/g, '').trim();
                
                // 只处理18-digit ID card
                if (cleanIdCard.length !== 18) {
                    continue;
                }
                
                const result = this.idCardFilter.validate(cleanIdCard);
                if (result.valid && result.type === '18-digit ID card') {
                    validIdCards.push(cleanIdCard);
                    //console.log(`✅ ID cardvalidation通through: ${cleanIdCard} (${result.province}, ${result.gender})`);
                } else {
                    //console.log(`❌ ID cardvalidationfailed: ${cleanIdCard} - ${result.error || 'format错误'}`);
                }
            } catch (error) {
                console.error('❌ ID cardvalidationthrough程出错:', error, 'ID card:', idCard);
            }
        }
        
        return validIdCards;
    }
    
    /**
     * loadcustomregexexpressionconfiguration - unified化version
     */
    async loadCustomPatterns() {
        try {
            //console.log('🔄 PatternExtractorunified化versionstartloadcustomconfiguration...');
            
            // fix：保存现有customregexpattern，避免by清空
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] 保存现有customregex: ${key}`);
                }
            });
            
            // 只重置非customregexpattern
            const newPatterns = {};
            Object.keys(existingCustomPatterns).forEach(key => {
                newPatterns[key] = existingCustomPatterns[key];
            });
            this.patterns = newPatterns;
            
            // loadall相关configuration：regexSettings + 动态customregexconfiguration
            const result = await chrome.storage.local.get(['regexSettings', 'customRegexConfigs']);
            
            //console.log('📊 PatternExtractorloadstoragedata:', result);
            
            if (result.regexSettings) {
                //console.log('🔄 PatternExtractorloadregexSettingsconfiguration:', result.regexSettings);
                this.updatePatterns(result.regexSettings);
                //console.log('✅ PatternExtractorbasicregexexpressionconfigurationalready更new');
            } else {
                console.warn('⚠️ PatternExtractor未foundregexSettingsconfiguration，addbasic资源regex');
                // addbasic资源文件regex（这些not依赖settings界面，是basic功能）
                this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
                this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            }
            
            // load动态customregexconfiguration - fix：supportobjectand数组两种storageformat
            if (result.customRegexConfigs) {
                //console.log('🔄 PatternExtractorstartload动态customregexconfiguration:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // checkstorageformat：objectformat还是数组format
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数组format
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 PatternExtractordetectto数组formatcustomregexconfiguration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // objectformat，convert为数组
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 PatternExtractordetecttoobjectformatcustomregexconfiguration，alreadyconvert为数组format');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        try {
                            if (config.key && config.pattern && config.name) {
                                // 将customregexaddtopatternsin
                                const regex = new RegExp(config.pattern, 'g');
                                this.patterns[config.key] = regex;
                                //console.log(`✅ PatternExtractoraddcustomregex ${index + 1}: ${config.name} (${config.key}) - ${config.pattern}`);
                            } else {
                                console.warn(`⚠️ PatternExtractorskip无效customregexconfiguration ${index + 1}:`, config);
                            }
                        } catch (error) {
                            console.error(`❌ PatternExtractorcustomregexconfiguration ${index + 1} format错误:`, error, config);
                        }
                    });
                    
                    //console.log(`✅ PatternExtractor动态customregexconfigurationloadcomplete，共load ${configsToProcess.length} 个configuration`);
                } else {
                    //console.log('⚠️ PatternExtractor动态customregexconfiguration为空');
                }
            } else {
                //console.log('ℹ️ PatternExtractor未found动态customregexconfiguration');
            }
            
            // 标记configurationalreadyload
            this.customPatternsLoaded = true;
            //console.log('✅ PatternExtractorunified化versioncustomconfigurationloadcomplete');
            //console.log('📊 PatternExtractor当before可forregexpattern:', Object.keys(this.patterns));
            
        } catch (error) {
            console.error('❌ PatternExtractorloadcustomregexexpressionconfigurationfailed:', error);
            this.customPatternsLoaded = true; // 即使failed也标记为alreadyload，避免无限wait
        }
    }
    
    /**
     * 解析regexexpression输入，support /pattern/flags formatand普通字符串format
     * @param {string} input - 输入regexexpression字符串
     * @param {string} defaultFlags - 默认标志，默认为 'g'
     * @returns {RegExp|null} 解析后regexexpressionobject
     */
    parseRegexInput(input, defaultFlags = 'g') {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }
        
        const trimmedInput = input.trim();
        
        // check是否为 /pattern/flags format
        const match = trimmedInput.match(/^\/(.*)\/([gimuy]*)$/);
        if (match) {
            const [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags || defaultFlags);
            } catch (error) {
                console.error('❌ regexexpressionformat错误 (字面量format):', error, 'Pattern:', pattern, 'Flags:', flags);
                return null;
            }
        } else {
            // 兼容旧写法（非 /.../ 形式）
            try {
                return new RegExp(trimmedInput, defaultFlags);
            } catch (error) {
                console.error('❌ regexexpressionformat错误 (字符串format):', error, 'Pattern:', trimmedInput);
                return null;
            }
        }
    }

    /**
     * 更newregexexpressionconfiguration - 只usesettings界面configuration
     */
    updatePatterns(customSettings) {
        try {
            //console.log('🔧 start更newregexexpressionconfiguration...', customSettings);
            
            // 保存现有customregexpattern
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] 保存现有customregex: ${key}`);
                }
            });
            
            // 清空all现有pattern
            this.patterns = {};
            
            // 恢复customregexpattern
            Object.keys(existingCustomPatterns).forEach(key => {
                this.patterns[key] = existingCustomPatterns[key];
                //console.log(`🔄 [PatternExtractor] 恢复customregex: ${key}`);
            });
            
            // 更new绝对路径APIregex
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                this.patterns.absoluteApi = this.parseRegexInput(customSettings.absoluteApis);
                //console.log('📝 更new绝对路径APIregexexpression:', customSettings.absoluteApis);
            }
            
            // 更new相对路径APIregex
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                this.patterns.relativeApi = this.parseRegexInput(customSettings.relativeApis);
                //console.log('📝 更new相对路径APIregexexpression:', customSettings.relativeApis);
            }
            
            // 更newdomainregex
            if (customSettings.domains && customSettings.domains.trim()) {
                this.patterns.domain = this.parseRegexInput(customSettings.domains);
                //console.log('📝 更newdomainregexexpression:', customSettings.domains);
            }
            
            // 更newemailregex
            if (customSettings.emails && customSettings.emails.trim()) {
                this.patterns.email = this.parseRegexInput(customSettings.emails);
                //console.log('📝 更newemailregexexpression:', customSettings.emails);
            }
            
            // 更newtelephoneregex
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                this.patterns.phone = this.parseRegexInput(customSettings.phoneNumbers);
                //console.log('📝 更newtelephoneregexexpression:', customSettings.phoneNumbers);
            }
            
            // 更new敏感informationregex
            if (customSettings.credentials && customSettings.credentials.trim()) {
                this.patterns.credentials = this.parseRegexInput(customSettings.credentials, 'gi');
                //console.log('📝 更new敏感informationregexexpression:', customSettings.credentials);
            }
            
            // 更newIP地址regex
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                this.patterns.ip = this.parseRegexInput(customSettings.ipAddresses);
                //console.log('📝 更newIP地址regexexpression:', customSettings.ipAddresses);
            }
            
            // 更new路径regex
            if (customSettings.paths && customSettings.paths.trim()) {
                this.patterns.paths = this.parseRegexInput(customSettings.paths);
                //console.log('📝 更new路径regexexpression:', customSettings.paths);
            }
            
            // 更newJWT令牌regex
            if (customSettings.jwts && customSettings.jwts.trim()) {
                this.patterns.jwt = this.parseRegexInput(customSettings.jwts);
                //console.log('📝 更newJWT令牌regexexpression:', customSettings.jwts);
            }
            
            // 更newGitHub链接regex
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                this.patterns.github = this.parseRegexInput(customSettings.githubUrls);
                //console.log('📝 更newGitHub链接regexexpression:', customSettings.githubUrls);
            }
            
            // 更newVue文件regex
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                this.patterns.vue = this.parseRegexInput(customSettings.vueFiles);
                //console.log('📝 更newVue文件regexexpression:', customSettings.vueFiles);
            }
            
            // 更newcompany名称regex
            if (customSettings.companies && customSettings.companies.trim()) {
                this.patterns.company = this.parseRegexInput(customSettings.companies);
                //console.log('📝 更newcompany名称regexexpression:', customSettings.companies);
            }
            
            // 更new注释regex
            if (customSettings.comments && customSettings.comments.trim()) {
                this.patterns.comments = this.parseRegexInput(customSettings.comments, 'gm');
                //console.log('📝 更new注释regexexpression:', customSettings.comments);
            }
            
            // 更newID cardregex
            if (customSettings.idCards && customSettings.idCards.trim()) {
                this.patterns.idCard = this.parseRegexInput(customSettings.idCards);
                //console.log('📝 更newID cardregexexpression:', customSettings.idCards);
            }
            
            // 更newBearer Tokenregex
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                this.patterns.bearerToken = this.parseRegexInput(customSettings.bearerTokens);
                //console.log('📝 更newBearer Tokenregexexpression:', customSettings.bearerTokens);
            }
            
            // 更newBasic Authregex
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                this.patterns.basicAuth = this.parseRegexInput(customSettings.basicAuth);
                //console.log('📝 更newBasic Authregexexpression:', customSettings.basicAuth);
            }
            
            // 更newAuthorization Headerregex
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                this.patterns.authHeader = this.parseRegexInput(customSettings.authHeaders);
                //console.log('📝 更newAuthorization Headerregexexpression:', customSettings.authHeaders);
            }
            
            // 更new微信AppIDregex
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                this.patterns.wechatAppId = this.parseRegexInput(customSettings.wechatAppIds);
                //console.log('📝 更new微信AppIDregexexpression:', customSettings.wechatAppIds);
            }
            
            // 更newAWS密钥regex
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                this.patterns.awsKey = this.parseRegexInput(customSettings.awsKeys);
                //console.log('📝 更newAWS密钥regexexpression:', customSettings.awsKeys);
            }
            
            // 更newGoogle API Keyregex
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                this.patterns.googleApiKey = this.parseRegexInput(customSettings.googleApiKeys);
                //console.log('📝 更newGoogle API Keyregexexpression:', customSettings.googleApiKeys);
            }
            
            // 更newGitHub Tokenregex
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                this.patterns.githubToken = this.parseRegexInput(customSettings.githubTokens);
                //console.log('📝 更newGitHub Tokenregexexpression:', customSettings.githubTokens);
            }
            
            // 更newGitLab Tokenregex
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                this.patterns.gitlabToken = this.parseRegexInput(customSettings.gitlabTokens);
                //console.log('📝 更newGitLab Tokenregexexpression:', customSettings.gitlabTokens);
            }
            
            // 更newWebhook URLsregex
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                this.patterns.webhookUrls = this.parseRegexInput(customSettings.webhookUrls);
                //console.log('📝 更newWebhook URLsregexexpression:', customSettings.webhookUrls);
            }
            
            // 更new加密算法useregex
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                this.patterns.cryptoUsage = this.parseRegexInput(customSettings.cryptoUsage, 'gi');
                //console.log('📝 更new加密算法useregexexpression:', customSettings.cryptoUsage);
            }
            
            // addbasic资源文件regex（这些not依赖settings界面，是basic功能）
            this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
            this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            
            //console.log('✅ regexexpressionconfiguration更newcomplete');
            //console.log('📊 当before可forregexpattern:', Object.keys(this.patterns));
            
            // 保存当beforeconfigurationstate
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ 更newregexexpressionconfigurationfailed:', error);
        }
    }
    
    /**
     * 确保customconfigurationalreadyload - unified化version
     * fix：只in必要时重newloadconfiguration，避免清空现有configuration
     */
    async ensureCustomPatternsLoaded() {
        if (!this.customPatternsLoaded) {
            //console.log('🔄 PatternExtractorunified化version：首次loadconfiguration...');
            await this.loadCustomPatterns();
        } else {
            //console.log('✅ PatternExtractorunified化version：configurationalreadyload，skip重复load');
        }
    }
    
    /**
     * useexec方法executeregexmatch - fix负向断言issue
     */
    executeRegexWithExec(regex, content, results, resultKey, patternKey) {
        //console.log(`🔍 [PatternExtractor] useexec方法处理: ${patternKey}`);
        
        // 重置regexexpressionstate
        regex.lastIndex = 0;
        let match;
        let matchCount = 0;
        let lastIndex = -1;
        
        while ((match = regex.exec(content)) !== null) {
            const matchedText = match[1] || match[0];
            if (matchedText && matchedText.trim()) {
                const trimmedText = matchedText.trim();
                
                // 🔥 special处理：through滤绝对路径APIincontains协议内容
                if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                    //console.log(`🚫 [PatternExtractor] 绝对路径APIcontains协议，alreadythrough滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 new增special处理：through滤绝对路径APIin静态文件
                if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，alreadythrough滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 new增special处理：through滤domain黑名单
                if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] domainin黑名单in，alreadythrough滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 new增special处理：through滤containsthrough滤内容class型内容
                if (this.containsFilteredContentType(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] ${patternKey} containsthrough滤内容class型，alreadythrough滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                results[resultKey].add(trimmedText);
                matchCount++;
                //console.log(`✅ [PatternExtractor] ${patternKey} matchto ${matchCount}: "${trimmedText}"`);
            }
            
            // 防止无限循环 - 特别针对负向断言
            if (matchCount > 1000) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} match次数through多，停止match`);
                break;
            }
            
            // check是否陷入无限循环
            if (regex.lastIndex === lastIndex) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} detectto无限循环，强制推进`);
                regex.lastIndex = lastIndex + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
            lastIndex = regex.lastIndex;
            
            // 对于非全局regexor者lastIndex为0情况，手动推进
            if (!regex.global || regex.lastIndex === 0) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 非全局regexorlastIndex为0，手动推进`);
                regex.lastIndex = match.index + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
        }
        
        //console.log(`📊 [PatternExtractor] ${patternKey} exec方法extractcomplete，共found ${matchCount} 个`);
    }
    
    // 专门APIextract方法
    extractAPIs(content, results) {
        //console.log('🔍 [PatternExtractor] startextractAPI...');
        //console.log('🔍 [PatternExtractor] 当beforepatternsobject:', Object.keys(this.patterns));
        //console.log('🔍 [PatternExtractor] absoluteApiconfiguration:', this.patterns.absoluteApi);
        //console.log('🔍 [PatternExtractor] relativeApiconfiguration:', this.patterns.relativeApi);
        
        // check是否有APIregexconfiguration
        if (!this.patterns.absoluteApi && !this.patterns.relativeApi) {
            console.warn('⚠️ [PatternExtractor] 未configurationAPIregexexpression，skipAPIextract');
            console.warn('⚠️ [PatternExtractor] absoluteApiexists:', !!this.patterns.absoluteApi);
            console.warn('⚠️ [PatternExtractor] relativeApiexists:', !!this.patterns.relativeApi);
            return;
        }
        
        // 移除内容大小限制，处理complete内容
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] 处理内容大小: ${processContent.length} 字符`);
        //console.log(`📊 [PatternExtractor] 内容预览: ${processContent.substring(0, 200)}...`);
        
        // extract绝对路径API - fix：supportRegExpobject
        if (this.patterns.absoluteApi) {
            //console.log(`🔍 [PatternExtractor] startextract绝对路径API`);
            //console.log(`🔍 [PatternExtractor] 绝对路径APIregexclass型: ${typeof this.patterns.absoluteApi}`);
            //console.log(`🔍 [PatternExtractor] 绝对路径APIregex内容: ${this.patterns.absoluteApi.source || this.patterns.absoluteApi}`);
            
            let absoluteApiCount = 0;
            const regex = this.patterns.absoluteApi;
            
            // 重置regexexpressionstate
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] 绝对路径APImatchto: "${api}"`);
                if (api && api.trim()) {
                    const trimmedApi = api.trim();
                    // 🔥 add校验：through滤掉containshttp://orhttps://绝对路径API
                    if (trimmedApi.includes('http://') || trimmedApi.includes('https://')) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径APIcontains协议，alreadythrough滤: "${trimmedApi}"`);
                    }
                    // 🔥 new增校验：through滤掉静态文件（such as.jpg, .png, .css等）
                    else if (this.isStaticFile(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，alreadythrough滤: "${trimmedApi}"`);
                    }
                    // 🔥 new增校验：through滤掉containsthrough滤内容class型API
                    else if (this.containsFilteredContentType(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径APIcontainsthrough滤内容class型，alreadythrough滤: "${trimmedApi}"`);
                    } else {
                        results.absoluteApis.add(trimmedApi);
                        absoluteApiCount++;
                        //console.log(`✅ [PatternExtractor] 绝对路径APIadd: "${trimmedApi}"`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径APImatch次数through多，停止match`);
                    break;
                }
                
                // check是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径APIdetectto无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] 绝对路径APIextractcomplete，共found ${absoluteApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 绝对路径APIconfiguration为空');
        }
        
        // extract相对路径API - fix：supportRegExpobject
        if (this.patterns.relativeApi) {
            //console.log(`🔍 [PatternExtractor] startextract相对路径API`);
            //console.log(`🔍 [PatternExtractor] 相对路径APIregexclass型: ${typeof this.patterns.relativeApi}`);
            //console.log(`🔍 [PatternExtractor] 相对路径APIregex内容: ${this.patterns.relativeApi.source || this.patterns.relativeApi}`);
            
            let relativeApiCount = 0;
            const regex = this.patterns.relativeApi;
            
            // 重置regexexpressionstate
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] 相对路径APImatchto: "${api}"`);
                if (api && api.trim()) {
                    // 🔥 new增：处理相对路径API，去除开头"."符号butkeep"/"
                    const processedApi = this.processRelativeApi(api.trim());
                    
                    // 🔥 new增special处理：through滤相对路径APIin静态文件（应for绝对路径APIthrough滤pattern）
                    if (this.isStaticFile(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] 相对路径API为静态文件，alreadythrough滤: "${processedApi}"`);
                    }
                    // 🔥 new增special处理：through滤相对路径APIincontainsthrough滤内容class型API
                    else if (this.containsFilteredContentType(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] 相对路径APIcontainsthrough滤内容class型，alreadythrough滤: "${processedApi}"`);
                    } else {
                        results.relativeApis.add(processedApi);
                        relativeApiCount++;
                        //console.log(`✅ [PatternExtractor] 相对路径API处理后add: "${processedApi}" (原始: "${api.trim()}")`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径APImatch次数through多，停止match`);
                    break;
                }
                
                // check是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径APIdetectto无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] 相对路径APIextractcomplete，共found ${relativeApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 相对路径APIconfiguration为空');
        }
        
        //console.log(`📊 [PatternExtractor] APIextract总结 - 绝对路径: ${results.absoluteApis.size}, 相对路径: ${results.relativeApis.size}`);
    }
    
    // extract其他资源
    extractOtherResources(content, results, sourceUrl = '') {
        //console.log('📁 [PatternExtractor] startextract其他资源...');
        
        // 移除内容大小限制，处理complete内容
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] 其他资源处理内容大小: ${processContent.length} 字符`);
        //console.log(`🌐 [PatternExtractor] 当before处理URL: ${sourceUrl}`);
        
        // extractJS文件
        if (this.patterns.jsFile) {
            //console.log('🔍 [PatternExtractor] startextractJS文件...');
            this.patterns.jsFile.lastIndex = 0;
            let match;
            let jsFileCount = 0;
            while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
                const jsFile = match[1] || match[2] || match[3] || match[4];
                if (jsFile) {
                    const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                    results.jsFiles.add(cleanJsFile);
                    jsFileCount++;
                    //console.log(`✅ [PatternExtractor] JS文件add: "${cleanJsFile}"`);
                }
            }
            //console.log(`📊 [PatternExtractor] JS文件extractcomplete，共found ${jsFileCount} 个`);
        }
        
        // extractCSS文件
        if (this.patterns.cssFile) {
            //console.log('🔍 [PatternExtractor] startextractCSS文件...');
            this.patterns.cssFile.lastIndex = 0;
            let match;
            let cssFileCount = 0;
            while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
                const cssFile = match[1];
                if (cssFile) {
                    const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                    // 🔥 应forthrough滤：check是否containsthrough滤内容class型
                    if (!this.containsFilteredContentType(cleanCssFile)) {
                        results.cssFiles.add(cleanCssFile);
                        cssFileCount++;
                        //console.log(`✅ [PatternExtractor] CSS文件add: "${cleanCssFile}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] CSS文件containsthrough滤内容class型，alreadythrough滤: "${cleanCssFile}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] CSS文件extractcomplete，共found ${cssFileCount} 个`);
        }
        
        // extract图片
        if (this.patterns.image) {
            //console.log('🔍 [PatternExtractor] startextract图片...');
            this.patterns.image.lastIndex = 0;
            let match;
            let imageCount = 0;
            while ((match = this.patterns.image.exec(processContent)) !== null) {
                const image = match[1];
                if (image) {
                    const cleanImage = image.replace(/["'`]/g, '').trim();
                    // 🔥 应forthrough滤：check是否containsthrough滤内容class型
                    if (!this.containsFilteredContentType(cleanImage)) {
                        results.images.add(cleanImage);
                        imageCount++;
                        //console.log(`✅ [PatternExtractor] 图片add: "${cleanImage}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] 图片containsthrough滤内容class型，alreadythrough滤: "${cleanImage}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] 图片extractcomplete，共found ${imageCount} 个`);
        }
        
        // extractURL
        if (this.patterns.url) {
            //console.log('🔍 [PatternExtractor] startextractURL...');
            this.patterns.url.lastIndex = 0;
            let match;
            let urlCount = 0;
            while ((match = this.patterns.url.exec(processContent)) !== null) {
                const url = match[0];
                if (url) {
                    // 🔥 应forthrough滤：check是否containsthrough滤内容class型
                    if (!this.containsFilteredContentType(url)) {
                        results.urls.add(url);
                        urlCount++;
                        //console.log(`✅ [PatternExtractor] URLadd: "${url}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] URLcontainsthrough滤内容class型，alreadythrough滤: "${url}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] URLextractcomplete，共found ${urlCount} 个`);
        }
        
        //console.log('✅ [PatternExtractor] 其他资源extractcomplete');
    }
    
    /**
     * extract动态customregexpattern - unified化version
     */
    async extractDynamicCustomPatterns(content, results) {
        try {
            //console.log('🔄 [PatternExtractor] startextract动态customregexpattern...');
            
            // 确保customconfigurationalreadyload
            await this.ensureCustomPatternsLoaded();
            
            // get当beforecustomregexconfiguration
            const storageResult = await chrome.storage.local.get(['customRegexConfigs']);
            
            if (!storageResult.customRegexConfigs) {
                //console.log('ℹ️ [PatternExtractor] 未found动态customregexconfiguration');
                return;
            }
            
            //console.log('📊 [PatternExtractor] 当before动态customregexconfiguration:', storageResult.customRegexConfigs);
            
            let configsToProcess = [];
            
            // checkstorageformat：objectformat还是数组format
            if (Array.isArray(storageResult.customRegexConfigs)) {
                // 数组format
                configsToProcess = storageResult.customRegexConfigs;
                //console.log('📋 [PatternExtractor] detectto数组formatcustomregexconfiguration');
            } else if (typeof storageResult.customRegexConfigs === 'object') {
                // objectformat，convert为数组
                configsToProcess = Object.entries(storageResult.customRegexConfigs).map(([key, config]) => ({
                    key: `custom_${key}`, // add custom_ before缀
                    name: config.name,
                    pattern: config.pattern,
                    createdAt: config.createdAt
                }));
                //console.log('📋 [PatternExtractor] detecttoobjectformatcustomregexconfiguration，alreadyconvert为数组format');
            }
            
            if (configsToProcess.length === 0) {
                //console.log('ℹ️ [PatternExtractor] 动态customregexconfiguration为空');
                return;
            }
            
            // 移除内容大小限制，处理complete内容
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] 动态customregex处理内容大小: ${processContent.length} 字符`);
            
            // 处理每个customregexconfiguration
            configsToProcess.forEach((config, index) => {
                try {
                    if (!config.key || !config.pattern || !config.name) {
                        console.warn(`⚠️ [PatternExtractor] skip无效customregexconfiguration ${index + 1}:`, config);
                        return;
                    }
                    
                    //console.log(`🔍 [PatternExtractor] 处理customregex ${index + 1}: ${config.name} (${config.key})`);
                    //console.log(`📝 [PatternExtractor] regexpattern: ${config.pattern}`);
                    
                    // createregexexpression
                    const regex = new RegExp(config.pattern, 'g');
                    
                    // 确保resultsin有correspondSet
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`📦 [PatternExtractor] 为customregex ${config.key} createresult集合`);
                    }
                    
                    //console.log(`🔍 [PatternExtractor] startin内容inmatchcustomregex ${config.key}...`);
                    //console.log(`📊 [PatternExtractor] 待match内容长度: ${processContent.length} 字符`);
                    
                    // 先in小样本上testregexexpression
                    const testContent = processContent.substring(0, 1000);
                    //console.log(`🧪 [PatternExtractor] testcustomregex ${config.key} in小样本上match...`);
                    const testRegex = new RegExp(config.pattern, 'g');
                    let testMatch;
                    let testCount = 0;
                    while ((testMatch = testRegex.exec(testContent)) !== null && testCount < 5) {
                        //console.log(`🎯 [PatternExtractor] testmatch ${testCount + 1}: "${testMatch[0]}"`);
                        testCount++;
                    }
                    //console.log(`📊 [PatternExtractor] 小样本testcomplete，matchto ${testCount} 个result`);
                    
                    // executecompletematch
                    let match;
                    let matchCount = 0;
                    regex.lastIndex = 0; // 重置regexexpressionstate
                    
                    //console.log(`🔍 [PatternExtractor] startcomplete内容match...`);
                    while ((match = regex.exec(processContent)) !== null) {
                        const matchedText = match[0];
                        if (matchedText && matchedText.trim()) {
                            results[config.key].add(matchedText.trim());
                            matchCount++;
                            //console.log(`✅ [PatternExtractor] customregex ${config.key} matchto ${matchCount}: "${matchedText.trim()}"`);
                        }
                        
                        // 防止无限循环
                        if (matchCount > 1000) {
                            console.warn(`⚠️ [PatternExtractor] customregex ${config.key} match次数through多，停止match`);
                            break;
                        }
                        
                        // 防止regexexpression无限循环
                        if (regex.lastIndex === match.index) {
                            console.warn(`⚠️ [PatternExtractor] customregex ${config.key} detectto无限循环，停止match`);
                            break;
                        }
                    }
                    
                    //console.log(`📊 [PatternExtractor] customregex ${config.key} matchcomplete，共found ${matchCount} 个result`);
                    //console.log(`📦 [PatternExtractor] customregex ${config.key} result集合大小: ${results[config.key].size}`);
                    
                    // validationresult是否正确addtoresultsobjectin
                    if (results[config.key].size > 0) {
                        //console.log(`✅ [PatternExtractor] customregex ${config.key} resultalreadysuccessaddtoresultsobject`);
                        //console.log(`🎯 [PatternExtractor] customregex ${config.key} result预览:`, Array.from(results[config.key]).slice(0, 3));
                    } else {
                        //console.log(`ℹ️ [PatternExtractor] customregex ${config.key} 未matchto任何result`);
                        // ifwithoutmatchtoresult，仍然keep空Set，确保键exists
                        //console.log(`🔧 [PatternExtractor] keep空result集合以确保键 ${config.key} exists`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PatternExtractor] customregexconfiguration ${index + 1} 处理failed:`, error, config);
                    // 即使出错也要确保键exists
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`🔧 [PatternExtractor] 为出错customregex ${config.key} create空result集合`);
                    }
                }
            });
            
            //console.log('✅ [PatternExtractor] 动态customregexpatternextractcomplete');
            
        } catch (error) {
            console.error('❌ [PatternExtractor] extract动态customregexpatternfailed:', error);
        }
    }
    
    /**
     * extractallpattern - unified化version，只usesettings界面configuration
     */
    async extractPatterns(content, sourceUrl = '') {
        try {
            //console.log('🚀🚀🚀 [PatternExtractor] unified化versionstartextractpattern - 强制day志！');
            //console.log(`📊 [PatternExtractor] 内容长度: ${content.length} 字符`);
            //console.log(`🌐 [PatternExtractor] 源URL: ${sourceUrl}`);
            //console.log('🔍🔍🔍 [PatternExtractor] 这个方法by调for了！');
            
            // 确保customconfigurationalreadyload
            await this.ensureCustomPatternsLoaded();
            
            // initializeresultobject，useSet避免重复 - fix：use正确键名
            const results = {
                // API相关
                absoluteApis: new Set(),
                relativeApis: new Set(),
                
                // 资源文件
                jsFiles: new Set(),
                cssFiles: new Set(),
                images: new Set(),
                urls: new Set(),
                
                // 敏感information - fix：use与DisplayManager一致键名
                domains: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(), // fix：fromphones改为phoneNumbers
                credentials: new Set(),
                ipAddresses: new Set(), // fix：fromips改为ipAddresses
                paths: new Set(),
                jwts: new Set(),
                githubUrls: new Set(), // fix：fromgithubs改为githubUrls
                vueFiles: new Set(), // fix：fromvues改为vueFiles
                companies: new Set(),
                comments: new Set(),
                idCards: new Set(),
                bearerTokens: new Set(),
                basicAuth: new Set(),
                authHeaders: new Set(),
                wechatAppIds: new Set(),
                awsKeys: new Set(),
                googleApiKeys: new Set(),
                githubTokens: new Set(),
                gitlabTokens: new Set(),
                webhookUrls: new Set(),
                cryptoUsage: new Set()
            };
            
            //console.log('📦 [PatternExtractor] resultobjectinitializecomplete');
            //console.log('📊 [PatternExtractor] 当before可forregexpattern:', Object.keys(this.patterns));
            
            // 移除内容大小限制，处理complete内容
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] 实际处理内容大小: ${processContent.length} 字符`);
            
            // 1. extractAPI（special处理，因为可能有多个regex）
            this.extractAPIs(processContent, results);
            
            // 2. extract其他资源文件
            this.extractOtherResources(processContent, results, sourceUrl);
            
            // 3. extract其他pattern（usesettings界面configurationregex） - fix：use正确键名映射
            const patternMappings = {
                domain: 'domains',
                email: 'emails', 
                phone: 'phoneNumbers', // fix：fromphones改为phoneNumbers
                credentials: 'credentials',
                ip: 'ipAddresses', // fix：fromips改为ipAddresses
                paths: 'paths',
                jwt: 'jwts',
                github: 'githubUrls', // fix：fromgithubs改为githubUrls
                vue: 'vueFiles', // fix：fromvues改为vueFiles
                company: 'companies',
                comments: 'comments',
                idCard: 'idCards',
                bearerToken: 'bearerTokens',
                basicAuth: 'basicAuth',
                authHeader: 'authHeaders',
                wechatAppId: 'wechatAppIds',
                awsKey: 'awsKeys',
                googleApiKey: 'googleApiKeys',
                githubToken: 'githubTokens',
                gitlabToken: 'gitlabTokens',
                webhookUrls: 'webhookUrls',
                cryptoUsage: 'cryptoUsage'
            };
            
            //console.log('🔍 [PatternExtractor] startextract其他pattern...');
            
            Object.entries(patternMappings).forEach(([patternKey, resultKey]) => {
                if (this.patterns[patternKey]) {
                    //console.log(`🔍 [PatternExtractor] extract ${patternKey} -> ${resultKey}`);
                    //console.log(`📝 [PatternExtractor] useregex: ${this.patterns[patternKey].source}`);
                    
                    // fix：针对负向断言special处理
                    const regex = this.patterns[patternKey];
                    const regexSource = regex.source;
                    const hasLookbehind = regexSource.includes('(?<!') || regexSource.includes('(?<=');
                    const hasLookahead = regexSource.includes('(?!') || regexSource.includes('(?=');
                    
                    if (hasLookbehind || hasLookahead) {
                        //console.log(`🔧 [PatternExtractor] detectto负向断言，usespecial处理: ${patternKey}`);
                        
                        // 对于contains负向断言regex，use matchAll 方法
                        try {
                            const matches = [...processContent.matchAll(regex)];
                            //console.log(`📊 [PatternExtractor] ${patternKey} usematchAllfound ${matches.length} 个match`);
                            
                            matches.forEach((match, index) => {
                                const matchedText = match[1] || match[0];
                                if (matchedText && matchedText.trim()) {
                                    const trimmedText = matchedText.trim();
                                    
                                    // 🔥 special处理：through滤绝对路径APIincontains协议内容
                                    if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                                        //console.log(`🚫 [PatternExtractor] 绝对路径APIcontains协议，alreadythrough滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 new增special处理：through滤绝对路径APIin静态文件
                                    if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，alreadythrough滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 new增special处理：through滤domain黑名单
                                    if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] domainin黑名单in，alreadythrough滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 new增special处理：through滤containsthrough滤内容class型内容
                                    if (this.containsFilteredContentType(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] ${patternKey} containsthrough滤内容class型，alreadythrough滤: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    results[resultKey].add(trimmedText);
                                    //console.log(`✅ [PatternExtractor] ${patternKey} matchto ${index + 1}: "${trimmedText}"`);
                                }
                            });
                            
                            //console.log(`📊 [PatternExtractor] ${patternKey} extractcomplete，共found ${matches.length} 个`);
                        } catch (error) {
                            console.error(`❌ [PatternExtractor] ${patternKey} matchAllfailed，回退toexec方法:`, error);
                            // 回退to原来exec方法
                            this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                        }
                    } else {
                        // 对于普通regex，use原来exec方法
                        this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                    }
                } else {
                    //console.log(`⚠️ [PatternExtractor] skip未configurationpattern: ${patternKey}`);
                }
            });
            
            
            // 4. extract动态customregexpattern - fix：directlyusealreadyloadpatterns
            //console.log('🔍 [PatternExtractor] startextract动态customregexpattern...');
            //console.log('🔍 [PatternExtractor] 当beforethis.patternsall键:', Object.keys(this.patterns));
            
            // 查找allcustomregexpattern
            const customPatternKeys = Object.keys(this.patterns).filter(key => key.startsWith('custom_'));
            //console.log(`📊 [PatternExtractor] 发现 ${customPatternKeys.length} 个customregexpattern:`, customPatternKeys);
            //console.log(`🔍 [PatternExtractor] customregexpattern详情:`, customPatternKeys.map(key => ({
            //    key,
            //    regex: this.patterns[key] ? this.patterns[key].source : 'null',
            //    type: typeof this.patterns[key]
            //})));
            
            if (customPatternKeys.length > 0) {
                customPatternKeys.forEach(patternKey => {
                    try {
                        //console.log(`🔍 [PatternExtractor] 处理customregex: ${patternKey}`);
                        
                        const regex = this.patterns[patternKey];
                        if (!regex) {
                            console.warn(`⚠️ [PatternExtractor] customregex ${patternKey} 未foundcorrespondregexexpression`);
                            return;
                        }
                        
                        // 确保resultsin有correspondSet
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`📦 [PatternExtractor] 为customregex ${patternKey} createresult集合`);
                        }
                        
                        //console.log(`🔍 [PatternExtractor] startmatchcustomregex ${patternKey}...`);
                        //console.log(`📝 [PatternExtractor] regexexpression: ${regex.source}`);
                        
                        // 重置regexexpressionstate
                        regex.lastIndex = 0;
                        
                        let match;
                        let matchCount = 0;
                        
                        while ((match = regex.exec(processContent)) !== null) {
                            const matchedText = match[0];
                            if (matchedText && matchedText.trim()) {
                                const trimmedText = matchedText.trim();
                                
                                // 🔥 应forthrough滤：check是否containsthrough滤内容class型
                                if (!this.containsFilteredContentType(trimmedText)) {
                                    results[patternKey].add(trimmedText);
                                    matchCount++;
                                    //console.log(`✅ [PatternExtractor] customregex ${patternKey} matchto ${matchCount}: "${trimmedText}"`);
                                } else {
                                    //console.log(`🚫 [PatternExtractor] customregex ${patternKey} containsthrough滤内容class型，alreadythrough滤: "${trimmedText}"`);
                                }
                            }
                            
                            // 防止无限循环
                            if (matchCount > 1000) {
                                console.warn(`⚠️ [PatternExtractor] customregex ${patternKey} match次数through多，停止match`);
                                break;
                            }
                            
                            // 防止regexexpression无限循环
                            if (regex.lastIndex === match.index) {
                                console.warn(`⚠️ [PatternExtractor] customregex ${patternKey} detectto无限循环，停止match`);
                                break;
                            }
                        }
                        
                        //console.log(`📊 [PatternExtractor] customregex ${patternKey} matchcomplete，共found ${matchCount} 个result`);
                        //console.log(`📦 [PatternExtractor] customregex ${patternKey} result集合大小: ${results[patternKey].size}`);
                        
                        if (results[patternKey].size > 0) {
                            //console.log(`✅ [PatternExtractor] customregex ${patternKey} result预览:`, Array.from(results[patternKey]).slice(0, 3));
                        } else {
                            //console.log(`ℹ️ [PatternExtractor] customregex ${patternKey} 未matchto任何result`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ [PatternExtractor] customregex ${patternKey} 处理failed:`, error);
                        // 即使出错也要确保键exists
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`🔧 [PatternExtractor] 为出错customregex ${patternKey} create空result集合`);
                        }
                    }
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] 未发现customregexpattern');
            }
            
            //console.log('🔍 [PatternExtractor] 动态customregexpatternextractcomplete，当beforeresults键:', Object.keys(results));
            
            // 5. special处理ID cardvalidation
            if (results.idCards.size > 0) {
                //console.log(`🔍 [PatternExtractor] startvalidationID card，共 ${results.idCards.size} 个`);
                const validatedIdCards = this.validateIdCards(Array.from(results.idCards));
                results.idCards = new Set(validatedIdCards);
                //console.log(`✅ [PatternExtractor] ID cardvalidationcomplete，validID card ${results.idCards.size} 个`);
            }
            
            // 6. convertSet为Arrayandadd源URLinformation，includingall动态create键
            const finalResults = {};
            
            //console.log('🔍 [PatternExtractor] startconvertresultandadd源URLinformation，当beforeresultsobjectall键:', Object.keys(results));
            
            // fix：遍历all键，including动态createcustomregex键，and为每个项目add源URL
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 将Setconvert为contains源URLinformationobject数组
                    finalResults[key] = [...value].map(item => {
                        // 🔥 fix：checkitem是否already经是containssourceUrlobject
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            // ifalready经是objectformat，确保containsall必要字段
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || sourceUrl,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            // if是字符串，convert为objectformat
                            return {
                                value: item,
                                sourceUrl: sourceUrl,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                    
                    //console.log(`🔄 [PatternExtractor] convert ${key}: Set(${value.size}) -> Array(${finalResults[key].length}) andadd源URL`);
                    if (finalResults[key].length > 0) {
                        //console.log(`📊 [PatternExtractor] ${key}: ${finalResults[key].length} 个result，源URL: ${sourceUrl}`);
                        // if是customregexresult，显示更详细information
                        if (key.startsWith('custom_')) {
                            //console.log(`🎯 [PatternExtractor] customregex ${key} result预览:`, finalResults[key].slice(0, 3));
                        }
                    } else if (key.startsWith('custom_')) {
                        // 即使是空customregexresult，也要keepin最终resultin
                        //console.log(`📦 [PatternExtractor] keep空customregex键 ${key}`);
                    }
                } else if (value) {
                    // 对于非Setclass型value，也add源URLinformation
                    if (Array.isArray(value)) {
                        finalResults[key] = value.map(item => {
                            // 🔥 fix：checkitem是否already经是containssourceUrlobject
                            if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                                return {
                                    value: item.value,
                                    sourceUrl: item.sourceUrl || sourceUrl,
                                    extractedAt: item.extractedAt || new Date().toISOString(),
                                    pageTitle: item.pageTitle || document.title || 'Unknown Page'
                                };
                            } else {
                                return {
                                    value: item,
                                    sourceUrl: sourceUrl,
                                    extractedAt: new Date().toISOString(),
                                    pageTitle: document.title || 'Unknown Page'
                                };
                            }
                        });
                    } else {
                        // 🔥 fix：单个value也要convert为objectformat
                        if (typeof value === 'object' && value !== null && value.hasOwnProperty('value')) {
                            finalResults[key] = [{
                                value: value.value,
                                sourceUrl: value.sourceUrl || sourceUrl,
                                extractedAt: value.extractedAt || new Date().toISOString(),
                                pageTitle: value.pageTitle || document.title || 'Unknown Page'
                            }];
                        } else {
                            finalResults[key] = [{
                                value: value,
                                sourceUrl: sourceUrl,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            }];
                        }
                    }
                    //console.log(`🔄 [PatternExtractor] directly复制andadd源URL ${key}:`, typeof value);
                } else {
                    // 空valuekeep为空数组
                    finalResults[key] = [];
                }
            }
            
            // validationallcustomregex键都by正确处理
            const customKeys = Object.keys(results).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ [PatternExtractor] 发现and处理了 ${customKeys.length} 个customregex键:`, customKeys);
                customKeys.forEach(key => {
                    //console.log(`✅ [PatternExtractor] customregex键 ${key} already正确convert: ${finalResults[key].length} 个result`);
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] 未发现customregex键');
            }
            
            //console.log('✅ [PatternExtractor] unified化versionpatternextractcomplete');
            //console.log('📊 [PatternExtractor] 最终result键:', Object.keys(finalResults));
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ [PatternExtractor] extractpatternfailed:', error);
            return {};
        }
    }
}

// exportclass
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternExtractor;
} else if (typeof window !== 'undefined') {
    window.PatternExtractor = PatternExtractor;
}
