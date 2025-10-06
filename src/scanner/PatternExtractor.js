/**
 * mode extract 器 - 只use settings 界面 configuration   regular expression
 * unified化 version - 去除all内置 regex and降级机制
 */
class PatternExtractor {
    constructor() {
        // static file extension 名 list - for filter 绝对 path and相对 path API
        this.staticFileExtensions = [
            // image file
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
            // style file
            '.css', '.scss', '.sass', '.less',
            // script file
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.coffee',
            // 字体 file
            '.woff', '.woff2', '.ttf', '.otf', '.eot',
            // audio file
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // video file
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
        ];

        // domain 黑名单：do not会展示以下 domain
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

        // content type filter list - for static path and相对 path filter
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
            // 日期 type
            'yyyy/mm/dd',
            'dd/mm/yyyy',
            'mm/dd/yy',
            'yy/mm/dd',
            'm/d/Y',
            'm/d/y',
            'xx/xx',
            'zrender/vml/vml',
            // CSS单位and regular expression mode
            '/rem/g',
            '/vw/g',
            '/vh/g',
            '/-/g',
            '/./g',
            '/f.value',
            '/i.test',
            // 操作 system 检测 mode
            '/android/i.test',
            '/CrOS/.test',
            '/windows/i.test',
            '/macintosh/i.test',
            '/linux/i.test',
            '/tablet/i.test',
            '/xbox/i.test',
            '/bada/i.test',
            // browser 检测 mode
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
        
        // 引入 ID card validate filter
        this.idCardFilter = null;
        this.loadIdCardFilter();
        
        // current use  regular expression configuration - 初始to empty，只use settings 界面 configuration
        this.patterns = {};
        
        // custom regular expression configuration
        this.customRegexConfig = null;
        
        // 标记是否already load custom configuration
        this.customPatternsLoaded = false;
        
        // settings 全局引用，供 settings manage 器调用
        window.patternExtractor = this;
        
        // listen configuration update event
        window.addEventListener('regexConfigUpdated', (event) => {
            //console.log('🔄 received regex configuration update event:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // async load custom configuration，但do not blocking 构造 function
        this.loadCustomPatterns().catch(error => {
            console.error('❌ async load custom configuration failed:', error);
        });
    }
    
    /**
     * load ID card validate filter
     */
    loadIdCardFilter() {
        try {
            // 尝试from全局 variable 获取
            if (typeof window !== 'undefined' && window.idCardFilter) {
                this.idCardFilter = window.idCardFilter;
                //console.log('✅ ID card filter load success (全局 variable)');
                return;
            }
            
            // 尝试 dynamic load
            const script = document.createElement('script');
            script.src = 'filters/id-card-filter.js';
            script.onload = () => {
                if (window.idCardFilter) {
                    this.idCardFilter = window.idCardFilter;
                    //console.log('✅ ID card filter dynamic load success');
                } else {
                    console.warn('⚠️ ID card filter load failed：未找到 idCardFilter');
                }
            };
            script.onerror = () => {
                console.error('❌ ID card filter script load failed');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('❌ load ID card filter 时出错:', error);
        }
    }
    
    /**
     * 检测URL是否to static file
     * @param {string} url - 要检测 URL
     * @returns {boolean} 是否to static file
     */
    isStaticFile(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        // remove query parameter and锚点
        const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
        
        // check 是否以 static file extension 名结尾
        return this.staticFileExtensions.some(ext => cleanUrl.endsWith(ext));
    }

    /**
     * check domain 是否in黑名单in
     * @param {string} domain - 要 check   domain
     * @returns {boolean} 是否in黑名单in
     */
    isDomainBlacklisted(domain) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }
        
        // cleanup domain，remove protocol、path 等
        const cleanDomain = domain.toLowerCase()
            .replace(/^https?:\/\//, '')  // remove protocol
            .replace(/\/.*$/, '')         // remove path
            .replace(/:\d+$/, '')         // remove port
            .trim();
        
        // check 是否in黑名单in
        const isBlacklisted = this.DOMAIN_BLACKLIST.includes(cleanDomain);
        
        if (isBlacklisted) {
            console.log(`🚫 [PatternExtractor] domain alreadypassive marker黑名单 filter: "${cleanDomain}"`);
        }
        
        return isBlacklisted;
    }

    /**
     * check path 是否 contains require filter   content type
     * @param {string} path - 要 check   path
     * @returns {boolean} 是否 contains require filter   content type
     */
    containsFilteredContentType(path) {
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        const lowerPath = path.toLowerCase();
        
        // check 是否 contains 任何 filter   content type
        const isFiltered = this.FILTERED_CONTENT_TYPES.some(contentType => {
            return lowerPath.includes(contentType.toLowerCase());
        });
        
        if (isFiltered) {
            console.log(`🚫 [PatternExtractor] path contains filter content type，already filter: "${path}"`);
        }
        
        return isFiltered;
    }

    /**
     * filter static file path
     * @param {Array} paths - path array
     * @returns {Array} filter 后  path array
     */
    filterStaticPaths(paths) {
        return paths.filter(path => {
            // check 是否 contains require filter   content type
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // 获取 file extension 名
            const ext = path.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // 没有 extension 名 keep
            
            // check 是否to static file extension 名
            return !this.staticFileExtensions.includes(ext[0]);
        });
    }

    /**
     * filter 相对 path in  static file
     * @param {Array} relativePaths - 相对 path array
     * @returns {Array} filter 后 相对 path array
     */
    filterStaticRelativePaths(relativePaths) {
        return relativePaths.filter(path => {
            // check 是否 contains require filter   content type
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // process 相对 path，可能 contains ../ or ./
            const normalizedPath = path.replace(/^\.\.?\//, '');
            
            // 获取 file extension 名
            const ext = normalizedPath.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // 没有 extension 名 keep
            
            // check 是否to static file extension 名
            const isStaticFile = this.staticFileExtensions.includes(ext[0]);
            
            // 记录 filter   static file（for debug）
            if (isStaticFile) {
                console.log(`🚫 [PatternExtractor] filter 相对 path static file: ${path}`);
            }
            
            return !isStaticFile;
        });
    }

    // process 相对 path API，去除开头 "."符号但keep"/"
    processRelativeApi(api) {
        try {
            // 去除开头 "."符号，但keep"/"
            if (api.startsWith('./')) {
                return api.substring(1); // 去除开头 "."，keep"/"
            } else if (api.startsWith('.') && !api.startsWith('/')) {
                return api.substring(1); // 去除开头 "."
            }
            return api; // 其他情况保持do not变
        } catch (error) {
            console.warn('⚠️ process 相对 path API时出错:', error);
            return api;
        }
    }
    
    /**
     * validate 并 filter ID card number，只keep18-digit valid ID card
     * @param {Array} idCards - extract 到  ID card number array
     * @returns {Array} validate 通through 18-digit ID card number array
     */
    validateIdCards(idCards) {
        if (!this.idCardFilter || !Array.isArray(idCards)) {
            return idCards || [];
        }
        
        const validIdCards = [];
        
        for (const idCard of idCards) {
            try {
                const cleanIdCard = idCard.replace(/['"]/g, '').trim();
                
                // 只 process 18-digit ID card
                if (cleanIdCard.length !== 18) {
                    continue;
                }
                
                const result = this.idCardFilter.validate(cleanIdCard);
                if (result.valid && result.type === '18位身份证') {
                    validIdCards.push(cleanIdCard);
                    //console.log(`✅ ID card validate 通through: ${cleanIdCard} (${result.province}, ${result.gender})`);
                } else {
                    //console.log(`❌ ID card validate failed: ${cleanIdCard} - ${result.error || '格式错误'}`);
                }
            } catch (error) {
                console.error('❌ 身份证验证过程出错:', error, '身份证:', idCard);
            }
        }
        
        return validIdCards;
    }
    
    /**
     * load custom regular expression configuration - unified化 version
     */
    async loadCustomPatterns() {
        try {
            //console.log('🔄 PatternExtractor统一化版本开始加载自定义配置...');
            
            // fix：save 现有  custom regex mode，避免passive marker clear
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] save 现有 custom regex: ${key}`);
                }
            });
            
            // 只重置非 custom   regex mode
            const newPatterns = {};
            Object.keys(existingCustomPatterns).forEach(key => {
                newPatterns[key] = existingCustomPatterns[key];
            });
            this.patterns = newPatterns;
            
            // load all相关 configuration：regexSettings + dynamic custom regex configuration
            const result = await chrome.storage.local.get(['regexSettings', 'customRegexConfigs']);
            
            //console.log('📊 PatternExtractor加载的存储数据:', result);
            
            if (result.regexSettings) {
                //console.log('🔄 PatternExtractor加载regexSettings配置:', result.regexSettings);
                this.updatePatterns(result.regexSettings);
                //console.log('✅ PatternExtractor基础正则表达式配置已更新');
            } else {
                console.warn('⚠️ PatternExtractor未找到regexSettings配置，添加基础资源正则');
                // add basic resource file regex（这些do not dependency settings 界面，是basic feature）
                this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
                this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            }
            
            // load dynamic custom regex configuration - fix：support object and array 两种 storage format
            if (result.customRegexConfigs) {
                //console.log('🔄 PatternExtractor start load dynamic custom regex configuration:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // check storage format：object format 还是 array format
                if (Array.isArray(result.customRegexConfigs)) {
                    // array format
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 PatternExtractor检测到 array format   custom regex configuration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // object format，convertto array
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 PatternExtractor检测到 object format   custom regex configuration，alreadyconvertto array format');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        try {
                            if (config.key && config.pattern && config.name) {
                                // 将 custom regex add 到patternsin
                                const regex = new RegExp(config.pattern, 'g');
                                this.patterns[config.key] = regex;
                                //console.log(`✅ PatternExtractor add custom regex ${index + 1}: ${config.name} (${config.key}) - ${config.pattern}`);
                            } else {
                                console.warn(`⚠️ PatternExtractorskip invalid   custom regex configuration ${index + 1}:`, config);
                            }
                        } catch (error) {
                            console.error(`❌ PatternExtractor custom regex configuration ${index + 1} format error:`, error, config);
                        }
                    });
                    
                    //console.log(`✅ PatternExtractor dynamic custom regex configuration load complete，共 load ${configsToProcess.length} 个 configuration`);
                } else {
                    //console.log('⚠️ PatternExtractor dynamic custom regex configuration to empty');
                }
            } else {
                //console.log('ℹ️ PatternExtractor未找到 dynamic custom regex configuration');
            }
            
            // 标记 configuration already load
            this.customPatternsLoaded = true;
            //console.log('✅ PatternExtractorunified化 version custom configuration load complete');
            //console.log('📊 PatternExtractor current 可用  regex mode:', Object.keys(this.patterns));
            
        } catch (error) {
            console.error('❌ PatternExtractor load custom regular expression configuration failed:', error);
            this.customPatternsLoaded = true; // 即使 failed 也标记toalready load，避免无限 wait
        }
    }
    
    /**
     * 解析 regular expression 输入，support /pattern/flags format and普通 string format
     * @param {string} input - 输入  regular expression string
     * @param {string} defaultFlags - default 标志，default to 'g'
     * @returns {RegExp|null} 解析后  regular expression object
     */
    parseRegexInput(input, defaultFlags = 'g') {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }
        
        const trimmedInput = input.trim();
        
        // check 是否to /pattern/flags format
        const match = trimmedInput.match(/^\/(.*)\/([gimuy]*)$/);
        if (match) {
            const [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags || defaultFlags);
            } catch (error) {
                console.error('❌ regular expression format error (字面量 format):', error, 'Pattern:', pattern, 'Flags:', flags);
                return null;
            }
        } else {
            // 兼容旧写法（非 /.../ 形式）
            try {
                return new RegExp(trimmedInput, defaultFlags);
            } catch (error) {
                console.error('❌ regular expression format error (string format):', error, 'Pattern:', trimmedInput);
                return null;
            }
        }
    }

    /**
     * update regular expression configuration - 只use settings 界面  configuration
     */
    updatePatterns(customSettings) {
        try {
            //console.log('🔧 start update regular expression configuration ...', customSettings);
            
            // save 现有  custom regex mode
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] save 现有 custom regex: ${key}`);
                }
            });
            
            // clear all现有 mode
            this.patterns = {};
            
            // 恢复 custom regex mode
            Object.keys(existingCustomPatterns).forEach(key => {
                this.patterns[key] = existingCustomPatterns[key];
                //console.log(`🔄 [PatternExtractor] 恢复 custom regex: ${key}`);
            });
            
            // update 绝对 path API regex
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                this.patterns.absoluteApi = this.parseRegexInput(customSettings.absoluteApis);
                //console.log('📝 update 绝对 path API regular expression:', customSettings.absoluteApis);
            }
            
            // update 相对 path API regex
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                this.patterns.relativeApi = this.parseRegexInput(customSettings.relativeApis);
                //console.log('📝 update 相对 path API regular expression:', customSettings.relativeApis);
            }
            
            // update domain regex
            if (customSettings.domains && customSettings.domains.trim()) {
                this.patterns.domain = this.parseRegexInput(customSettings.domains);
                //console.log('📝 update domain regular expression:', customSettings.domains);
            }
            
            // update email regex
            if (customSettings.emails && customSettings.emails.trim()) {
                this.patterns.email = this.parseRegexInput(customSettings.emails);
                //console.log('📝 update email regular expression:', customSettings.emails);
            }
            
            // update 电话 regex
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                this.patterns.phone = this.parseRegexInput(customSettings.phoneNumbers);
                //console.log('📝 update 电话 regular expression:', customSettings.phoneNumbers);
            }
            
            // update 敏感 information regex
            if (customSettings.credentials && customSettings.credentials.trim()) {
                this.patterns.credentials = this.parseRegexInput(customSettings.credentials, 'gi');
                //console.log('📝 update 敏感 information regular expression:', customSettings.credentials);
            }
            
            // update IP address regex
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                this.patterns.ip = this.parseRegexInput(customSettings.ipAddresses);
                //console.log('📝 update IP address regular expression:', customSettings.ipAddresses);
            }
            
            // update path regex
            if (customSettings.paths && customSettings.paths.trim()) {
                this.patterns.paths = this.parseRegexInput(customSettings.paths);
                //console.log('📝 update path regular expression:', customSettings.paths);
            }
            
            // update JWT token regex
            if (customSettings.jwts && customSettings.jwts.trim()) {
                this.patterns.jwt = this.parseRegexInput(customSettings.jwts);
                //console.log('📝 update JWT token regular expression:', customSettings.jwts);
            }
            
            // update GitHub link regex
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                this.patterns.github = this.parseRegexInput(customSettings.githubUrls);
                //console.log('📝 update GitHub link regular expression:', customSettings.githubUrls);
            }
            
            // update Vue file regex
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                this.patterns.vue = this.parseRegexInput(customSettings.vueFiles);
                //console.log('📝 update Vue file regular expression:', customSettings.vueFiles);
            }
            
            // update 公司名称 regex
            if (customSettings.companies && customSettings.companies.trim()) {
                this.patterns.company = this.parseRegexInput(customSettings.companies);
                //console.log('📝 update 公司名称 regular expression:', customSettings.companies);
            }
            
            // update comment regex
            if (customSettings.comments && customSettings.comments.trim()) {
                this.patterns.comments = this.parseRegexInput(customSettings.comments, 'gm');
                //console.log('📝 update comment regular expression:', customSettings.comments);
            }
            
            // update ID card regex
            if (customSettings.idCards && customSettings.idCards.trim()) {
                this.patterns.idCard = this.parseRegexInput(customSettings.idCards);
                //console.log('📝 update ID card regular expression:', customSettings.idCards);
            }
            
            // update Bearer Token regex
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                this.patterns.bearerToken = this.parseRegexInput(customSettings.bearerTokens);
                //console.log('📝 update Bearer Token regular expression:', customSettings.bearerTokens);
            }
            
            // update Basic Auth regex
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                this.patterns.basicAuth = this.parseRegexInput(customSettings.basicAuth);
                //console.log('📝 update Basic Auth regular expression:', customSettings.basicAuth);
            }
            
            // update Authorization Header regex
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                this.patterns.authHeader = this.parseRegexInput(customSettings.authHeaders);
                //console.log('📝 update Authorization Header regular expression:', customSettings.authHeaders);
            }
            
            // update 微信AppID regex
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                this.patterns.wechatAppId = this.parseRegexInput(customSettings.wechatAppIds);
                //console.log('📝 update 微信AppID regular expression:', customSettings.wechatAppIds);
            }
            
            // update AWS key regex
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                this.patterns.awsKey = this.parseRegexInput(customSettings.awsKeys);
                //console.log('📝 update AWS key regular expression:', customSettings.awsKeys);
            }
            
            // update Google API Key regex
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                this.patterns.googleApiKey = this.parseRegexInput(customSettings.googleApiKeys);
                //console.log('📝 update Google API Key regular expression:', customSettings.googleApiKeys);
            }
            
            // update GitHub Token regex
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                this.patterns.githubToken = this.parseRegexInput(customSettings.githubTokens);
                //console.log('📝 update GitHub Token regular expression:', customSettings.githubTokens);
            }
            
            // update GitLab Token regex
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                this.patterns.gitlabToken = this.parseRegexInput(customSettings.gitlabTokens);
                //console.log('📝 update GitLab Token regular expression:', customSettings.gitlabTokens);
            }
            
            // update Webhook URLs regex
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                this.patterns.webhookUrls = this.parseRegexInput(customSettings.webhookUrls);
                //console.log('📝 update Webhook URLs regular expression:', customSettings.webhookUrls);
            }
            
            // update encryption 算法use regex
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                this.patterns.cryptoUsage = this.parseRegexInput(customSettings.cryptoUsage, 'gi');
                //console.log('📝 update encryption 算法use regular expression:', customSettings.cryptoUsage);
            }
            
            // add basic resource file regex（这些do not dependency settings 界面，是basic feature）
            this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
            this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            
            //console.log('✅ regular expression configuration update complete');
            //console.log('📊 current 可用  regex mode:', Object.keys(this.patterns));
            
            // save current configuration status
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ update regular expression configuration failed:', error);
        }
    }
    
    /**
     * 确保 custom configuration already load - unified化 version
     * fix：只in必要时重新 load configuration，避免 clear 现有 configuration
     */
    async ensureCustomPatternsLoaded() {
        if (!this.customPatternsLoaded) {
            //console.log('🔄 PatternExtractorunified化 version：首次 load configuration ...');
            await this.loadCustomPatterns();
        } else {
            //console.log('✅ PatternExtractorunified化 version：configuration already load，skip重复 load');
        }
    }
    
    /**
     * useexec method execute regex match - fix负向断言issue
     */
    executeRegexWithExec(regex, content, results, resultKey, patternKey) {
        //console.log(`🔍 [PatternExtractor] 使用exec方法处理: ${patternKey}`);
        
        // 重置 regular expression status
        regex.lastIndex = 0;
        let match;
        let matchCount = 0;
        let lastIndex = -1;
        
        while ((match = regex.exec(content)) !== null) {
            const matchedText = match[1] || match[0];
            if (matchedText && matchedText.trim()) {
                const trimmedText = matchedText.trim();
                
                // 🔥 特殊 process：filter 绝对 path APIin contains protocol   content
                if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                    //console.log(`🚫 [PatternExtractor] 绝对路径API包含协议，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊 process：filter 绝对 path APIin  static file
                if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊 process：filter domain 黑名单
                if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] 域名在黑名单中，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊 process：filter contains filter content type   content
                if (this.containsFilteredContentType(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] ${patternKey} 包含过滤内容类型，已过滤: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                results[resultKey].add(trimmedText);
                matchCount++;
                //console.log(`✅ [PatternExtractor] ${patternKey} 匹配到 ${matchCount}: "${trimmedText}"`);
            }
            
            // 防止无限循环 - 特别针对负向断言
            if (matchCount > 1000) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 匹配次数过多，停止匹配`);
                break;
            }
            
            // check 是否陷入无限循环
            if (regex.lastIndex === lastIndex) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 检测到无限循环，强制推进`);
                regex.lastIndex = lastIndex + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
            lastIndex = regex.lastIndex;
            
            // 对于非全局 regex or者lastIndexto0 情况，manual 推进
            if (!regex.global || regex.lastIndex === 0) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 非全局正则或lastIndex为0，手动推进`);
                regex.lastIndex = match.index + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
        }
        
        //console.log(`📊 [PatternExtractor] ${patternKey} exec方法提取完成，共找到 ${matchCount} 个`);
    }
    
    // 专门 API extract method
    extractAPIs(content, results) {
        //console.log('🔍 [PatternExtractor] start extract API...');
        //console.log('🔍 [PatternExtractor] current patterns object:', Object.keys(this.patterns));
        //console.log('🔍 [PatternExtractor] absoluteApi configuration:', this.patterns.absoluteApi);
        //console.log('🔍 [PatternExtractor] relativeApi configuration:', this.patterns.relativeApi);
        
        // check 是否有API regex configuration
        if (!this.patterns.absoluteApi && !this.patterns.relativeApi) {
            console.warn('⚠️ [PatternExtractor] not configuration API regular expression，skipAPI extract');
            console.warn('⚠️ [PatternExtractor] absoluteApi存in:', !!this.patterns.absoluteApi);
            console.warn('⚠️ [PatternExtractor] relativeApi存in:', !!this.patterns.relativeApi);
            return;
        }
        
        // remove content size limit，process complete content
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] 处理内容大小: ${processContent.length} 字符`);
        //console.log(`📊 [PatternExtractor] 内容预览: ${processContent.substring(0, 200)}...`);
        
        // extract 绝对 path API - fix：supportRegExp object
        if (this.patterns.absoluteApi) {
            //console.log(`🔍 [PatternExtractor] 开始提取绝对路径API`);
            //console.log(`🔍 [PatternExtractor] 绝对路径API正则类型: ${typeof this.patterns.absoluteApi}`);
            //console.log(`🔍 [PatternExtractor] 绝对路径API正则内容: ${this.patterns.absoluteApi.source || this.patterns.absoluteApi}`);
            
            let absoluteApiCount = 0;
            const regex = this.patterns.absoluteApi;
            
            // 重置 regular expression status
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] 绝对路径API匹配到: "${api}"`);
                if (api && api.trim()) {
                    const trimmedApi = api.trim();
                    // 🔥 add 校验：through滤掉包含http://orhttps:// 绝对 path API
                    if (trimmedApi.includes('http://') || trimmedApi.includes('https://')) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径API包含协议，已过滤: "${trimmedApi}"`);
                    }
                    // 🔥 新增校验：filter 掉 static file（如.jpg, .png, .css等）
                    else if (this.isStaticFile(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径API为静态文件，已过滤: "${trimmedApi}"`);
                    }
                    // 🔥 新增校验：filter 掉 contains filter content type  API
                    else if (this.containsFilteredContentType(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] 绝对路径API包含过滤内容类型，已过滤: "${trimmedApi}"`);
                    } else {
                        results.absoluteApis.add(trimmedApi);
                        absoluteApiCount++;
                        //console.log(`✅ [PatternExtractor] 绝对路径API添加: "${trimmedApi}"`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径API匹配次数过多，停止匹配`);
                    break;
                }
                
                // check 是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 绝对路径API检测到无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] 绝对路径API提取完成，共找到 ${absoluteApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 绝对 path API configuration to empty');
        }
        
        // extract 相对 path API - fix：supportRegExp object
        if (this.patterns.relativeApi) {
            //console.log(`🔍 [PatternExtractor] 开始提取相对路径API`);
            //console.log(`🔍 [PatternExtractor] 相对路径API正则类型: ${typeof this.patterns.relativeApi}`);
            //console.log(`🔍 [PatternExtractor] 相对路径API正则内容: ${this.patterns.relativeApi.source || this.patterns.relativeApi}`);
            
            let relativeApiCount = 0;
            const regex = this.patterns.relativeApi;
            
            // 重置 regular expression status
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] 相对路径API匹配到: "${api}"`);
                if (api && api.trim()) {
                    // 🔥 新增：process 相对 path API，去除开头 "."符号但keep"/"
                    const processedApi = this.processRelativeApi(api.trim());
                    
                    // 🔥 新增特殊 process：filter 相对 path APIin  static file（应用绝对 path API  filter mode）
                    if (this.isStaticFile(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] 相对路径API为静态文件，已过滤: "${processedApi}"`);
                    }
                    // 🔥 新增特殊 process：filter 相对 path APIin contains filter content type  API
                    else if (this.containsFilteredContentType(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] 相对路径API包含过滤内容类型，已过滤: "${processedApi}"`);
                    } else {
                        results.relativeApis.add(processedApi);
                        relativeApiCount++;
                        //console.log(`✅ [PatternExtractor] 相对路径API处理后添加: "${processedApi}" (原始: "${api.trim()}")`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径API匹配次数过多，停止匹配`);
                    break;
                }
                
                // check 是否陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] 相对路径API检测到无限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] 相对路径API提取完成，共找到 ${relativeApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] 相对 path API configuration to empty');
        }
        
        //console.log(`📊 [PatternExtractor] API提取总结 - 绝对路径: ${results.absoluteApis.size}, 相对路径: ${results.relativeApis.size}`);
    }
    
    // extract 其他 resource
    extractOtherResources(content, results, sourceUrl = '') {
        //console.log('📁 [PatternExtractor] start extract 其他 resource ...');
        
        // remove content size limit，process complete content
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] 其他资源处理内容大小: ${processContent.length} 字符`);
        //console.log(`🌐 [PatternExtractor] 当前处理的URL: ${sourceUrl}`);
        
        // extract JS file
        if (this.patterns.jsFile) {
            //console.log('🔍 [PatternExtractor] start extract JS file ...');
            this.patterns.jsFile.lastIndex = 0;
            let match;
            let jsFileCount = 0;
            while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
                const jsFile = match[1] || match[2] || match[3] || match[4];
                if (jsFile) {
                    const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                    results.jsFiles.add(cleanJsFile);
                    jsFileCount++;
                    //console.log(`✅ [PatternExtractor] JS file add: "${cleanJsFile}"`);
                }
            }
            //console.log(`📊 [PatternExtractor] JS file extract complete，共找到 ${jsFileCount} 个`);
        }
        
        // extract CSS file
        if (this.patterns.cssFile) {
            //console.log('🔍 [PatternExtractor] start extract CSS file ...');
            this.patterns.cssFile.lastIndex = 0;
            let match;
            let cssFileCount = 0;
            while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
                const cssFile = match[1];
                if (cssFile) {
                    const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                    // 🔥 应用 filter：check 是否 contains filter content type
                    if (!this.containsFilteredContentType(cleanCssFile)) {
                        results.cssFiles.add(cleanCssFile);
                        cssFileCount++;
                        //console.log(`✅ [PatternExtractor] CSS file add: "${cleanCssFile}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] CSS file contains filter content type，already filter: "${cleanCssFile}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] CSS file extract complete，共找到 ${cssFileCount} 个`);
        }
        
        // extract image
        if (this.patterns.image) {
            //console.log('🔍 [PatternExtractor] start extract image ...');
            this.patterns.image.lastIndex = 0;
            let match;
            let imageCount = 0;
            while ((match = this.patterns.image.exec(processContent)) !== null) {
                const image = match[1];
                if (image) {
                    const cleanImage = image.replace(/["'`]/g, '').trim();
                    // 🔥 应用 filter：check 是否 contains filter content type
                    if (!this.containsFilteredContentType(cleanImage)) {
                        results.images.add(cleanImage);
                        imageCount++;
                        //console.log(`✅ [PatternExtractor] image add: "${cleanImage}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] image contains filter content type，already filter: "${cleanImage}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] image extract complete，共找到 ${imageCount} 个`);
        }
        
        // extract URL
        if (this.patterns.url) {
            //console.log('🔍 [PatternExtractor] 开始提取URL...');
            this.patterns.url.lastIndex = 0;
            let match;
            let urlCount = 0;
            while ((match = this.patterns.url.exec(processContent)) !== null) {
                const url = match[0];
                if (url) {
                    // 🔥 应用 filter：check 是否 contains filter content type
                    if (!this.containsFilteredContentType(url)) {
                        results.urls.add(url);
                        urlCount++;
                        //console.log(`✅ [PatternExtractor] URL add: "${url}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] URL contains filter content type，already filter: "${url}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] URL extract complete，共找到 ${urlCount} 个`);
        }
        
        //console.log('✅ [PatternExtractor] 其他资源提取完成');
    }
    
    /**
     * extract dynamic custom regex mode - unified化 version
     */
    async extractDynamicCustomPatterns(content, results) {
        try {
            //console.log('🔄 [PatternExtractor] 开始提取动态自定义正则模式...');
            
            // 确保 custom configuration already load
            await this.ensureCustomPatternsLoaded();
            
            // 获取 current   custom regex configuration
            const storageResult = await chrome.storage.local.get(['customRegexConfigs']);
            
            if (!storageResult.customRegexConfigs) {
                //console.log('ℹ️ [PatternExtractor] 未找到动态自定义正则配置');
                return;
            }
            
            //console.log('📊 [PatternExtractor] 当前动态自定义正则配置:', storageResult.customRegexConfigs);
            
            let configsToProcess = [];
            
            // check storage format：object format 还是 array format
            if (Array.isArray(storageResult.customRegexConfigs)) {
                // array format
                configsToProcess = storageResult.customRegexConfigs;
                //console.log('📋 [PatternExtractor] 检测到数组格式的自定义正则配置');
            } else if (typeof storageResult.customRegexConfigs === 'object') {
                // object format，convertto array
                configsToProcess = Object.entries(storageResult.customRegexConfigs).map(([key, config]) => ({
                    key: `custom_${key}`, // add custom_ before缀
                    name: config.name,
                    pattern: config.pattern,
                    createdAt: config.createdAt
                }));
                //console.log('📋 [PatternExtractor] 检测到对象格式的自定义正则配置，已转换为数组格式');
            }
            
            if (configsToProcess.length === 0) {
                //console.log('ℹ️ [PatternExtractor] 动态自定义正则配置为空');
                return;
            }
            
            // remove content size limit，process complete content
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] dynamic custom regex process content size: ${processContent.length} 字符`);
            
            // process 每个 custom regex configuration
            configsToProcess.forEach((config, index) => {
                try {
                    if (!config.key || !config.pattern || !config.name) {
                        console.warn(`⚠️ [PatternExtractor] skip invalid   custom regex configuration ${index + 1}:`, config);
                        return;
                    }
                    
                    //console.log(`🔍 [PatternExtractor] process custom regex ${index + 1}: ${config.name} (${config.key})`);
                    //console.log(`📝 [PatternExtractor] regex mode: ${config.pattern}`);
                    
                    // 创建 regular expression
                    const regex = new RegExp(config.pattern, 'g');
                    
                    // 确保resultsin有对应 Set
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`📦 [PatternExtractor] to custom regex ${config.key} 创建 result set`);
                    }
                    
                    //console.log(`🔍 [PatternExtractor] start in content in match custom regex ${config.key}...`);
                    //console.log(`📊 [PatternExtractor] 待 match content length: ${processContent.length} 字符`);
                    
                    // 先in小样本上 test regular expression
                    const testContent = processContent.substring(0, 1000);
                    //console.log(`🧪 [PatternExtractor] test custom regex ${config.key} in小样本上  match ...`);
                    const testRegex = new RegExp(config.pattern, 'g');
                    let testMatch;
                    let testCount = 0;
                    while ((testMatch = testRegex.exec(testContent)) !== null && testCount < 5) {
                        //console.log(`🎯 [PatternExtractor] test match ${testCount + 1}: "${testMatch[0]}"`);
                        testCount++;
                    }
                    //console.log(`📊 [PatternExtractor] 小样本 test complete，match 到 ${testCount} 个 result`);
                    
                    // execute complete match
                    let match;
                    let matchCount = 0;
                    regex.lastIndex = 0; // 重置 regular expression status
                    
                    //console.log(`🔍 [PatternExtractor] start complete content match ...`);
                    while ((match = regex.exec(processContent)) !== null) {
                        const matchedText = match[0];
                        if (matchedText && matchedText.trim()) {
                            results[config.key].add(matchedText.trim());
                            matchCount++;
                            //console.log(`✅ [PatternExtractor] custom regex ${config.key} match 到 ${matchCount}: "${matchedText.trim()}"`);
                        }
                        
                        // 防止无限循环
                        if (matchCount > 1000) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${config.key} match 次数through多，停止 match`);
                            break;
                        }
                        
                        // 防止 regular expression 无限循环
                        if (regex.lastIndex === match.index) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${config.key} 检测到无限循环，停止 match`);
                            break;
                        }
                    }
                    
                    //console.log(`📊 [PatternExtractor] custom regex ${config.key} match complete，共找到 ${matchCount} 个 result`);
                    //console.log(`📦 [PatternExtractor] custom regex ${config.key} result set size: ${results[config.key].size}`);
                    
                    // validate result 是否正确 add 到results object in
                    if (results[config.key].size > 0) {
                        //console.log(`✅ [PatternExtractor] custom regex ${config.key} result already success add 到results object`);
                        //console.log(`🎯 [PatternExtractor] custom regex ${config.key} result preview:`, Array.from(results[config.key]).slice(0, 3));
                    } else {
                        //console.log(`ℹ️ [PatternExtractor] custom regex ${config.key} not match 到任何 result`);
                        // 如果没有 match 到 result，仍然keep empty  Set，确保 key 存in
                        //console.log(`🔧 [PatternExtractor] keep empty   result set 以确保 key ${config.key} 存in`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PatternExtractor] custom regex configuration ${index + 1} process failed:`, error, config);
                    // 即使出错也要确保 key 存in
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`🔧 [PatternExtractor] to出错  custom regex ${config.key} 创建 empty result set`);
                    }
                }
            });
            
            //console.log('✅ [PatternExtractor] 动态自定义正则模式提取完成');
            
        } catch (error) {
            console.error('❌ [PatternExtractor] 提取动态自定义正则模式失败:', error);
        }
    }
    
    /**
     * extract all mode - unified化 version，只use settings 界面 configuration
     */
    async extractPatterns(content, sourceUrl = '') {
        try {
            //console.log('🚀🚀🚀 [PatternExtractor] 统一化版本开始提取模式 - 强制日志！');
            //console.log(`📊 [PatternExtractor] content length: ${content.length} 字符`);
            //console.log(`🌐 [PatternExtractor] 源URL: ${sourceUrl}`);
            //console.log('🔍🔍🔍 [PatternExtractor] 这个方法被调用了！');
            
            // 确保 custom configuration already load
            await this.ensureCustomPatternsLoaded();
            
            // initialize result object，useSet避免重复 - fix：use正确  key 名
            const results = {
                // API相关
                absoluteApis: new Set(),
                relativeApis: new Set(),
                
                // resource file
                jsFiles: new Set(),
                cssFiles: new Set(),
                images: new Set(),
                urls: new Set(),
                
                // 敏感 information - fix：use与DisplayManager一致  key 名
                domains: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(), // fix：fromphones改tophoneNumbers
                credentials: new Set(),
                ipAddresses: new Set(), // fix：fromips改toipAddresses
                paths: new Set(),
                jwts: new Set(),
                githubUrls: new Set(), // fix：fromgithubs改togithubUrls
                vueFiles: new Set(), // fix：fromvues改tovueFiles
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
            
            //console.log('📦 [PatternExtractor] 结果对象初始化完成');
            //console.log('📊 [PatternExtractor] 当前可用的正则模式:', Object.keys(this.patterns));
            
            // remove content size limit，process complete content
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] 实际 process content size: ${processContent.length} 字符`);
            
            // 1. extract API（特殊 process，因to可能有多个 regex）
            this.extractAPIs(processContent, results);
            
            // 2. extract 其他 resource file
            this.extractOtherResources(processContent, results, sourceUrl);
            
            // 3. extract 其他 mode（use settings 界面 configuration   regex） - fix：use正确  key 名 map
            const patternMappings = {
                domain: 'domains',
                email: 'emails', 
                phone: 'phoneNumbers', // fix：fromphones改tophoneNumbers
                credentials: 'credentials',
                ip: 'ipAddresses', // fix：fromips改toipAddresses
                paths: 'paths',
                jwt: 'jwts',
                github: 'githubUrls', // fix：fromgithubs改togithubUrls
                vue: 'vueFiles', // fix：fromvues改tovueFiles
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
            
            //console.log('🔍 [PatternExtractor] 开始提取其他模式...');
            
            Object.entries(patternMappings).forEach(([patternKey, resultKey]) => {
                if (this.patterns[patternKey]) {
                    //console.log(`🔍 [PatternExtractor] extract ${patternKey} -> ${resultKey}`);
                    //console.log(`📝 [PatternExtractor] use regex: ${this.patterns[patternKey].source}`);
                    
                    // fix：针对负向断言 特殊 process
                    const regex = this.patterns[patternKey];
                    const regexSource = regex.source;
                    const hasLookbehind = regexSource.includes('(?<!') || regexSource.includes('(?<=');
                    const hasLookahead = regexSource.includes('(?!') || regexSource.includes('(?=');
                    
                    if (hasLookbehind || hasLookahead) {
                        //console.log(`🔧 [PatternExtractor] 检测到负向断言，use特殊 process: ${patternKey}`);
                        
                        // 对于 contains 负向断言  regex，use matchAll method
                        try {
                            const matches = [...processContent.matchAll(regex)];
                            //console.log(`📊 [PatternExtractor] ${patternKey} usematchAll找到 ${matches.length} 个 match`);
                            
                            matches.forEach((match, index) => {
                                const matchedText = match[1] || match[0];
                                if (matchedText && matchedText.trim()) {
                                    const trimmedText = matchedText.trim();
                                    
                                    // 🔥 特殊 process：filter 绝对 path APIin contains protocol   content
                                    if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                                        //console.log(`🚫 [PatternExtractor] 绝对 path API contains protocol，already filter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊 process：filter 绝对 path APIin  static file
                                    if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] 绝对 path APIto static file，already filter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊 process：filter domain 黑名单
                                    if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] domain in黑名单in，already filter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊 process：filter contains filter content type   content
                                    if (this.containsFilteredContentType(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] ${patternKey} contains filter content type，already filter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    results[resultKey].add(trimmedText);
                                    //console.log(`✅ [PatternExtractor] ${patternKey} match 到 ${index + 1}: "${trimmedText}"`);
                                }
                            });
                            
                            //console.log(`📊 [PatternExtractor] ${patternKey} extract complete，共找到 ${matches.length} 个`);
                        } catch (error) {
                            console.error(`❌ [PatternExtractor] ${patternKey} matchAll failed，回退到exec method:`, error);
                            // 回退到原来 exec method
                            this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                        }
                    } else {
                        // 对于普通 regex，use原来 exec method
                        this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                    }
                } else {
                    //console.log(`⚠️ [PatternExtractor] skipnot configuration   mode: ${patternKey}`);
                }
            });
            
            
            // 4. extract dynamic custom regex mode - fix：directlyusealready load  patterns
            //console.log('🔍 [PatternExtractor] start extract dynamic custom regex mode ...');
            //console.log('🔍 [PatternExtractor] current this.patterns all key:', Object.keys(this.patterns));
            
            // 查找all custom regex mode
            const customPatternKeys = Object.keys(this.patterns).filter(key => key.startsWith('custom_'));
            //console.log(`📊 [PatternExtractor] 发现 ${customPatternKeys.length} 个 custom regex mode:`, customPatternKeys);
            //console.log(`🔍 [PatternExtractor] custom regex mode 详情:`, customPatternKeys.map(key => ({
            //    key,
            //    regex: this.patterns[key] ? this.patterns[key].source : 'null',
            //    type: typeof this.patterns[key]
            //})));
            
            if (customPatternKeys.length > 0) {
                customPatternKeys.forEach(patternKey => {
                    try {
                        //console.log(`🔍 [PatternExtractor] process custom regex: ${patternKey}`);
                        
                        const regex = this.patterns[patternKey];
                        if (!regex) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} 未找到对应  regular expression`);
                            return;
                        }
                        
                        // 确保resultsin有对应 Set
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`📦 [PatternExtractor] to custom regex ${patternKey} 创建 result set`);
                        }
                        
                        //console.log(`🔍 [PatternExtractor] start match custom regex ${patternKey}...`);
                        //console.log(`📝 [PatternExtractor] regular expression: ${regex.source}`);
                        
                        // 重置 regular expression status
                        regex.lastIndex = 0;
                        
                        let match;
                        let matchCount = 0;
                        
                        while ((match = regex.exec(processContent)) !== null) {
                            const matchedText = match[0];
                            if (matchedText && matchedText.trim()) {
                                const trimmedText = matchedText.trim();
                                
                                // 🔥 应用 filter：check 是否 contains filter content type
                                if (!this.containsFilteredContentType(trimmedText)) {
                                    results[patternKey].add(trimmedText);
                                    matchCount++;
                                    //console.log(`✅ [PatternExtractor] custom regex ${patternKey} match 到 ${matchCount}: "${trimmedText}"`);
                                } else {
                                    //console.log(`🚫 [PatternExtractor] custom regex ${patternKey} contains filter content type，already filter: "${trimmedText}"`);
                                }
                            }
                            
                            // 防止无限循环
                            if (matchCount > 1000) {
                                console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} match 次数through多，停止 match`);
                                break;
                            }
                            
                            // 防止 regular expression 无限循环
                            if (regex.lastIndex === match.index) {
                                console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} 检测到无限循环，停止 match`);
                                break;
                            }
                        }
                        
                        //console.log(`📊 [PatternExtractor] custom regex ${patternKey} match complete，共找到 ${matchCount} 个 result`);
                        //console.log(`📦 [PatternExtractor] custom regex ${patternKey} result set size: ${results[patternKey].size}`);
                        
                        if (results[patternKey].size > 0) {
                            //console.log(`✅ [PatternExtractor] custom regex ${patternKey} result preview:`, Array.from(results[patternKey]).slice(0, 3));
                        } else {
                            //console.log(`ℹ️ [PatternExtractor] custom regex ${patternKey} not match 到任何 result`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ [PatternExtractor] custom regex ${patternKey} process failed:`, error);
                        // 即使出错也要确保 key 存in
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`🔧 [PatternExtractor] to出错  custom regex ${patternKey} 创建 empty result set`);
                        }
                    }
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] 未发现 custom regex mode');
            }
            
            //console.log('🔍 [PatternExtractor] dynamic custom regex mode extract complete，current results key:', Object.keys(results));
            
            // 5. 特殊 process ID card validate
            if (results.idCards.size > 0) {
                //console.log(`🔍 [PatternExtractor] start validate ID card，共 ${results.idCards.size} 个`);
                const validatedIdCards = this.validateIdCards(Array.from(results.idCards));
                results.idCards = new Set(validatedIdCards);
                //console.log(`✅ [PatternExtractor] ID card validate complete，valid ID card ${results.idCards.size} 个`);
            }
            
            // 6. convertSettoArray并 add 源URL information，package 括all dynamic 创建  key
            const finalResults = {};
            
            //console.log('🔍 [PatternExtractor] start convert result 并 add 源URL information，current results object  all key:', Object.keys(results));
            
            // fix：遍历all key，package 括 dynamic 创建  custom regex key，并to每个项目 add 源URL
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 将Setconvertto contains 源URL information   object array
                    finalResults[key] = [...value].map(item => {
                        // 🔥 fix：check item是否already经是 contains sourceUrl  object
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            // 如果already经是 object format，确保 contains all必要 field
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || sourceUrl,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            // 如果是 string，convertto object format
                            return {
                                value: item,
                                sourceUrl: sourceUrl,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                    
                    //console.log(`🔄 [PatternExtractor] convert ${key}: Set(${value.size}) -> Array(${finalResults[key].length}) 并 add 源URL`);
                    if (finalResults[key].length > 0) {
                        //console.log(`📊 [PatternExtractor] ${key}: ${finalResults[key].length} 个 result，源URL: ${sourceUrl}`);
                        // 如果是 custom regex result，display 更 detailed   information
                        if (key.startsWith('custom_')) {
                            //console.log(`🎯 [PatternExtractor] custom regex ${key} result preview:`, finalResults[key].slice(0, 3));
                        }
                    } else if (key.startsWith('custom_')) {
                        // 即使是 empty   custom regex result，也要keepin最终 result in
                        //console.log(`📦 [PatternExtractor] keep empty   custom regex key ${key}`);
                    }
                } else if (value) {
                    // 对于非Set type   value，也 add 源URL information
                    if (Array.isArray(value)) {
                        finalResults[key] = value.map(item => {
                            // 🔥 fix：check item是否already经是 contains sourceUrl  object
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
                        // 🔥 fix：single value 也要convertto object format
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
                    //console.log(`🔄 [PatternExtractor] directly copy 并 add 源URL ${key}:`, typeof value);
                } else {
                    // empty value 保持to empty array
                    finalResults[key] = [];
                }
            }
            
            // validate all custom regex key 都passive marker正确 process
            const customKeys = Object.keys(results).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ [PatternExtractor] 发现并 process 了 ${customKeys.length} 个 custom regex key:`, customKeys);
                customKeys.forEach(key => {
                    //console.log(`✅ [PatternExtractor] custom regex key ${key} already正确convert: ${finalResults[key].length} 个 result`);
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] 未发现 custom regex key');
            }
            
            //console.log('✅ [PatternExtractor] unified化 version mode extract complete');
            //console.log('📊 [PatternExtractor] 最终 result key:', Object.keys(finalResults));
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ [PatternExtractor] extract mode failed:', error);
            return {};
        }
    }
}

// export 类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternExtractor;
} else if (typeof window !== 'undefined') {
    window.PatternExtractor = PatternExtractor;
}
