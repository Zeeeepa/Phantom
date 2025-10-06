/**
 * extracted mode 器 - regular expression configuration settings use of 只界面
 * unified version - regex all and 去除内置降级机制
 */
class PatternExtractor {
    constructor() {
        // extension file column(s) 静态表 - relative path absolute path API filter for and
        this.staticFileExtensions = [
            // file 图片
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
            // file 样式
            '.css', '.scss', '.sass', '.less',
            // file script
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.coffee',
            // file 字体
            '.woff', '.woff2', '.ttf', '.otf', '.eot',
            // file 音频
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // file 视频
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
        ];

        // blacklist domain：domain with 不会展示下
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

        // content filter type column(s) 表 - relative path path filter for and 静态
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
            // type 日期
            'yyyy/mm/dd',
            'dd/mm/yyyy',
            'mm/dd/yy',
            'yy/mm/dd',
            'm/d/Y',
            'm/d/y',
            'xx/xx',
            'zrender/vml/vml',
            // regular expression mode digit(s) and CSS单
            '/rem/g',
            '/vw/g',
            '/vh/g',
            '/-/g',
            '/./g',
            '/f.value',
            '/i.test',
            // detect mode operation 系统
            '/android/i.test',
            '/CrOS/.test',
            '/windows/i.test',
            '/macintosh/i.test',
            '/linux/i.test',
            '/tablet/i.test',
            '/xbox/i.test',
            '/bada/i.test',
            // detect mode 浏览器
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
        
        // filter ID card validate 引入
        this.idCardFilter = null;
        this.loadIdCardFilter();
        
        // regular expression configuration current use of - is empty 初始，configuration settings use 只界面
        this.patterns = {};
        
        // regular expression custom configuration
        this.customRegexConfig = null;
        
        // custom marker configuration load no yes 已
        this.customPatternsLoaded = false;
        
        // settings 全局引用，manager settings call 供
        window.patternExtractor = this;
        
        // update configuration event listen
        window.addEventListener('regexConfigUpdated', (event) => {
            //console.log('🔄 update regex configuration event to 收:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // custom configuration async load，function 但不阻塞构造
        this.loadCustomPatterns().catch(error => {
            console.error('❌ custom failed configuration async load:', error);
        });
    }
    
    /**
     * filter ID card validate load
     */
    loadIdCardFilter() {
        try {
            // get variable from 尝试全局
            if (typeof window !== 'undefined' && window.idCardFilter) {
                this.idCardFilter = window.idCardFilter;
                //console.log('✅ loaded successfully filter ID card (variable 全局)');
                return;
            }
            
            // load dynamic 尝试
            const script = document.createElement('script');
            script.src = 'filters/id-card-filter.js';
            script.onload = () => {
                if (window.idCardFilter) {
                    this.idCardFilter = window.idCardFilter;
                    //console.log('✅ loaded successfully filter ID card dynamic');
                } else {
                    console.warn('⚠️ failed to load filter ID card：not found idCardFilter');
                }
            };
            script.onerror = () => {
                console.error('❌ failed to load filter ID card script');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('❌ filter ID card load error occurred when:', error);
        }
    }
    
    /**
     * URL file detect as no yes 静态
     * @param {string} url - URL detect of 要
     * @returns {boolean} file as no yes 静态
     */
    isStaticFile(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        // remove parameters query and 锚点
        const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
        
        // extension file check with no yes 静态结尾
        return this.staticFileExtensions.some(ext => cleanUrl.endsWith(ext));
    }

    /**
     * blacklist domain check in no yes 在
     * @param {string} domain - domain check of 要
     * @returns {boolean} blacklist in no yes 在
     */
    isDomainBlacklisted(domain) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }
        
        // cleanup domain，remove 协议、path , etc.
        const cleanDomain = domain.toLowerCase()
            .replace(/^https?:\/\//, '')  // remove 协议
            .replace(/\/.*$/, '')         // remove path
            .replace(/:\d+$/, '')         // remove 端口
            .trim();
        
        // blacklist check in no yes 在
        const isBlacklisted = this.DOMAIN_BLACKLIST.includes(cleanDomain);
        
        if (isBlacklisted) {
            console.log(`🚫 [PatternExtractor] blacklist domain filter 已被: "${cleanDomain}"`);
        }
        
        return isBlacklisted;
    }

    /**
     * path content filter contains check type of no yes 需要
     * @param {string} path - path check of 要
     * @returns {boolean} content filter contains type of no yes 需要
     */
    containsFilteredContentType(path) {
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        const lowerPath = path.toLowerCase();
        
        // content filter contains check type any of no yes
        const isFiltered = this.FILTERED_CONTENT_TYPES.some(contentType => {
            return lowerPath.includes(contentType.toLowerCase());
        });
        
        if (isFiltered) {
            console.log(`🚫 [PatternExtractor] path content filter contains type，filtered: "${path}"`);
        }
        
        return isFiltered;
    }

    /**
     * file path filter 静态
     * @param {Array} paths - path array
     * @returns {Array} path filter array of after
     */
    filterStaticPaths(paths) {
        return paths.filter(path => {
            // content filter contains check type of no yes 需要
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // extension file get
            const ext = path.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // extension of has 没保留
            
            // extension file check as no yes 静态
            return !this.staticFileExtensions.includes(ext[0]);
        });
    }

    /**
     * relative path file filter in of 静态
     * @param {Array} relativePaths - relative path array
     * @returns {Array} relative path filter array of after
     */
    filterStaticRelativePaths(relativePaths) {
        return relativePaths.filter(path => {
            // content filter contains check type of no yes 需要
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // relative path process，contains 可能 ../ 或 ./
            const normalizedPath = path.replace(/^\.\.?\//, '');
            
            // extension file get
            const ext = normalizedPath.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // extension of has 没保留
            
            // extension file check as no yes 静态
            const isStaticFile = this.staticFileExtensions.includes(ext[0]);
            
            // file filter record of 静态（debug for）
            if (isStaticFile) {
                console.log(`🚫 [PatternExtractor] relative path file filter 静态: ${path}`);
            }
            
            return !isStaticFile;
        });
    }

    // relative path API process，去除开头的"."符号但保留"/"
    processRelativeApi(api) {
        try {
            // 去除开头的"."符号，但保留"/"
            if (api.startsWith('./')) {
                return api.substring(1); // 去除开头的"."，保留"/"
            } else if (api.startsWith('.') && !api.startsWith('/')) {
                return api.substring(1); // 去除开头的"."
            }
            return api; // 其他情况保持不变
        } catch (error) {
            console.warn('⚠️ relative path API process error occurred when:', error);
            return api;
        }
    }
    
    /**
     * ID number filter validate 并，ID card digit(s) has 只保留18效
     * @param {Array} idCards - ID number extracted array to of
     * @returns {Array} ID number validate via array digit(s) of 18
     */
    validateIdCards(idCards) {
        if (!this.idCardFilter || !Array.isArray(idCards)) {
            return idCards || [];
        }
        
        const validIdCards = [];
        
        for (const idCard of idCards) {
            try {
                const cleanIdCard = idCard.replace(/['"]/g, '').trim();
                
                // ID card process digit(s) 只18
                if (cleanIdCard.length !== 18) {
                    continue;
                }
                
                const result = this.idCardFilter.validate(cleanIdCard);
                if (result.valid && result.type === 'ID card digit(s) 18') {
                    validIdCards.push(cleanIdCard);
                    //console.log(`✅ ID card validate via: ${cleanIdCard} (${result.province}, ${result.gender})`);
                } else {
                    //console.log(`❌ ID card failed validate: ${cleanIdCard} - ${result.error || 'format error'}`);
                }
            } catch (error) {
                console.error('❌ ID card validate error occurred 过程:', error, 'ID card:', idCard);
            }
        }
        
        return validIdCards;
    }
    
    /**
     * regular expression custom configuration load - unified version
     */
    async loadCustomPatterns() {
        try {
            //console.log('🔄 custom unified start configuration version load PatternExtractor...');
            
            // fixed：custom regex save mode of has 现，clear 避免被
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] custom regex save has 现: ${key}`);
                }
            });
            
            // custom reset regex mode of 只非
            const newPatterns = {};
            Object.keys(existingCustomPatterns).forEach(key => {
                newPatterns[key] = existingCustomPatterns[key];
            });
            this.patterns = newPatterns;
            
            // configuration load all related：regexSettings + custom regex configuration dynamic
            const result = await chrome.storage.local.get(['regexSettings', 'customRegexConfigs']);
            
            //console.log('📊 data load of PatternExtractor存储:', result);
            
            if (result.regexSettings) {
                //console.log('🔄 configuration load PatternExtractorregexSettings:', result.regexSettings);
                this.updatePatterns(result.regexSettings);
                //console.log('✅ regular expression update configuration basic PatternExtractor已');
            } else {
                console.warn('⚠️ not found configuration PatternExtractorregexSettings，add regex resource basic');
                // add regex file resource basic（settings 这些不依赖界面，basic feature yes）
                this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
                this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            }
            
            // custom regex configuration load dynamic - fixed：object format array and 支持两种存储
            if (result.customRegexConfigs) {
                //console.log('🔄 custom regex start configuration load dynamic PatternExtractor:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // check format 存储：object format format array yes 还
                if (Array.isArray(result.customRegexConfigs)) {
                    // format array
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 custom regex detected configuration format array of PatternExtractor');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // object format，convert array as
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before 缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 custom regex detected configuration object format of PatternExtractor，format convert array as 已');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        try {
                            if (config.key && config.pattern && config.name) {
                                // custom regex add to in 将patterns
                                const regex = new RegExp(config.pattern, 'g');
                                this.patterns[config.key] = regex;
                                //console.log(`✅ custom regex add PatternExtractor ${index + 1}: ${config.name} (${config.key}) - ${config.pattern}`);
                            } else {
                                console.warn(`⚠️ custom regex skip configuration of PatternExtractor无效 ${index + 1}:`, config);
                            }
                        } catch (error) {
                            console.error(`❌ custom regex configuration PatternExtractor ${index + 1} format error:`, error, config);
                        }
                    });
                    
                    //console.log(`✅ custom regex complete configuration load dynamic PatternExtractor，load total ${configsToProcess.length} configuration item(s)`);
                } else {
                    //console.log('⚠️ custom regex configuration is empty dynamic PatternExtractor');
                }
            } else {
                //console.log('ℹ️ custom regex not found configuration dynamic PatternExtractor');
            }
            
            // marker configuration load 已
            this.customPatternsLoaded = true;
            //console.log('✅ custom unified complete configuration version load PatternExtractor');
            //console.log('📊 available regex mode current PatternExtractor:', Object.keys(this.patterns));
            
        } catch (error) {
            console.error('❌ regular expression custom failed configuration load PatternExtractor:', error);
            this.customPatternsLoaded = true; // failed marker load as 即使也已，waiting 避免无限
        }
    }
    
    /**
     * regular expression parse 输入，支持 /pattern/flags format format characters and 普通串
     * @param {string} input - regular expression characters of 输入串
     * @param {string} defaultFlags - default 标志，default as 'g'
     * @returns {RegExp|null} regular expression parse object of after
     */
    parseRegexInput(input, defaultFlags = 'g') {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }
        
        const trimmedInput = input.trim();
        
        // check as no yes /pattern/flags format
        const match = trimmedInput.match(/^\/(.*)\/([gimuy]*)$/);
        if (match) {
            const [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags || defaultFlags);
            } catch (error) {
                console.error('❌ regular expression format error (format 字面量):', error, 'Pattern:', pattern, 'Flags:', flags);
                return null;
            }
        } else {
            // 兼容旧写法（非 /.../ 形式）
            try {
                return new RegExp(trimmedInput, defaultFlags);
            } catch (error) {
                console.error('❌ regular expression format error (format characters 串):', error, 'Pattern:', trimmedInput);
                return null;
            }
        }
    }

    /**
     * regular expression update configuration - configuration settings use of 只界面
     */
    updatePatterns(customSettings) {
        try {
            //console.log('🔧 regular expression update start configuration ...', customSettings);
            
            // custom regex save mode of has 现
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] custom regex save has 现: ${key}`);
                }
            });
            
            // clear mode all has 现
            this.patterns = {};
            
            // custom regex mode resume
            Object.keys(existingCustomPatterns).forEach(key => {
                this.patterns[key] = existingCustomPatterns[key];
                //console.log(`🔄 [PatternExtractor] custom regex resume: ${key}`);
            });
            
            // absolute path API update regex
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                this.patterns.absoluteApi = this.parseRegexInput(customSettings.absoluteApis);
                //console.log('📝 regular expression absolute path API update:', customSettings.absoluteApis);
            }
            
            // relative path API update regex
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                this.patterns.relativeApi = this.parseRegexInput(customSettings.relativeApis);
                //console.log('📝 regular expression relative path API update:', customSettings.relativeApis);
            }
            
            // update regex domain
            if (customSettings.domains && customSettings.domains.trim()) {
                this.patterns.domain = this.parseRegexInput(customSettings.domains);
                //console.log('📝 regular expression update domain:', customSettings.domains);
            }
            
            // update regex 邮箱
            if (customSettings.emails && customSettings.emails.trim()) {
                this.patterns.email = this.parseRegexInput(customSettings.emails);
                //console.log('📝 regular expression update 邮箱:', customSettings.emails);
            }
            
            // update regex 电话
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                this.patterns.phone = this.parseRegexInput(customSettings.phoneNumbers);
                //console.log('📝 regular expression update 电话:', customSettings.phoneNumbers);
            }
            
            // sensitive information update regex
            if (customSettings.credentials && customSettings.credentials.trim()) {
                this.patterns.credentials = this.parseRegexInput(customSettings.credentials, 'gi');
                //console.log('📝 regular expression sensitive information update:', customSettings.credentials);
            }
            
            // update regex address IP
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                this.patterns.ip = this.parseRegexInput(customSettings.ipAddresses);
                //console.log('📝 regular expression update address IP:', customSettings.ipAddresses);
            }
            
            // update regex path
            if (customSettings.paths && customSettings.paths.trim()) {
                this.patterns.paths = this.parseRegexInput(customSettings.paths);
                //console.log('📝 regular expression update path:', customSettings.paths);
            }
            
            // update regex token JWT
            if (customSettings.jwts && customSettings.jwts.trim()) {
                this.patterns.jwt = this.parseRegexInput(customSettings.jwts);
                //console.log('📝 regular expression update token JWT:', customSettings.jwts);
            }
            
            // update regex link GitHub
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                this.patterns.github = this.parseRegexInput(customSettings.githubUrls);
                //console.log('📝 regular expression update link GitHub:', customSettings.githubUrls);
            }
            
            // update regex file Vue
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                this.patterns.vue = this.parseRegexInput(customSettings.vueFiles);
                //console.log('📝 regular expression update file Vue:', customSettings.vueFiles);
            }
            
            // update regex name 公司
            if (customSettings.companies && customSettings.companies.trim()) {
                this.patterns.company = this.parseRegexInput(customSettings.companies);
                //console.log('📝 regular expression update name 公司:', customSettings.companies);
            }
            
            // update regex comment
            if (customSettings.comments && customSettings.comments.trim()) {
                this.patterns.comments = this.parseRegexInput(customSettings.comments, 'gm');
                //console.log('📝 regular expression update comment:', customSettings.comments);
            }
            
            // ID card update regex
            if (customSettings.idCards && customSettings.idCards.trim()) {
                this.patterns.idCard = this.parseRegexInput(customSettings.idCards);
                //console.log('📝 regular expression ID card update:', customSettings.idCards);
            }
            
            // update Bearer regex Token
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                this.patterns.bearerToken = this.parseRegexInput(customSettings.bearerTokens);
                //console.log('📝 update Bearer regular expression Token:', customSettings.bearerTokens);
            }
            
            // update Basic regex Auth
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                this.patterns.basicAuth = this.parseRegexInput(customSettings.basicAuth);
                //console.log('📝 update Basic regular expression Auth:', customSettings.basicAuth);
            }
            
            // update Authorization regex Header
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                this.patterns.authHeader = this.parseRegexInput(customSettings.authHeaders);
                //console.log('📝 update Authorization regular expression Header:', customSettings.authHeaders);
            }
            
            // update regex 微信AppID
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                this.patterns.wechatAppId = this.parseRegexInput(customSettings.wechatAppIds);
                //console.log('📝 regular expression update 微信AppID:', customSettings.wechatAppIds);
            }
            
            // update regex key AWS
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                this.patterns.awsKey = this.parseRegexInput(customSettings.awsKeys);
                //console.log('📝 regular expression update key AWS:', customSettings.awsKeys);
            }
            
            // update Google API regex Key
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                this.patterns.googleApiKey = this.parseRegexInput(customSettings.googleApiKeys);
                //console.log('📝 update Google API regular expression Key:', customSettings.googleApiKeys);
            }
            
            // update GitHub regex Token
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                this.patterns.githubToken = this.parseRegexInput(customSettings.githubTokens);
                //console.log('📝 update GitHub regular expression Token:', customSettings.githubTokens);
            }
            
            // update GitLab regex Token
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                this.patterns.gitlabToken = this.parseRegexInput(customSettings.gitlabTokens);
                //console.log('📝 update GitLab regular expression Token:', customSettings.gitlabTokens);
            }
            
            // update Webhook URL regex s
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                this.patterns.webhookUrls = this.parseRegexInput(customSettings.webhookUrls);
                //console.log('📝 update Webhook regular expression URL s:', customSettings.webhookUrls);
            }
            
            // update regex use 加密算法
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                this.patterns.cryptoUsage = this.parseRegexInput(customSettings.cryptoUsage, 'gi');
                //console.log('📝 regular expression update use 加密算法:', customSettings.cryptoUsage);
            }
            
            // add regex file resource basic（settings 这些不依赖界面，basic feature yes）
            this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
            this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            
            //console.log('✅ regular expression update complete configuration');
            //console.log('📊 available regex mode current:', Object.keys(this.patterns));
            
            // save configuration current status
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ regular expression failed update configuration:', error);
        }
    }
    
    /**
     * custom configuration load 确保已 - unified version
     * fixed：configuration load re- when 只在必要，clear configuration has 避免现
     */
    async ensureCustomPatternsLoaded() {
        if (!this.customPatternsLoaded) {
            //console.log('🔄 unified version PatternExtractor：configuration load time(s) 首...');
            await this.loadCustomPatterns();
        } else {
            //console.log('✅ unified version PatternExtractor：configuration load 已，skip load 重复');
        }
    }
    
    /**
     * regex match execute method use exec - fixed 负向断言问题
     */
    executeRegexWithExec(regex, content, results, resultKey, patternKey) {
        //console.log(`🔍 [PatternExtractor] process method use exec: ${patternKey}`);
        
        // regular expression reset status
        regex.lastIndex = 0;
        let match;
        let matchCount = 0;
        let lastIndex = -1;
        
        while ((match = regex.exec(content)) !== null) {
            const matchedText = match[1] || match[0];
            if (matchedText && matchedText.trim()) {
                const trimmedText = matchedText.trim();
                
                // 🔥 process special：absolute path API content filter contains in of 协议
                if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                    //console.log(`🚫 [PatternExtractor] absolute path API contains 协议，filtered: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 process special 新增：absolute path API file filter in of 静态
                if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] absolute path API file as 静态，filtered: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 process special 新增：blacklist domain filter
                if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] blacklist domain in 在，filtered: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 process special 新增：content content filter filter contains type of
                if (this.containsFilteredContentType(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] ${patternKey} content filter contains type，filtered: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                results[resultKey].add(trimmedText);
                matchCount++;
                //console.log(`✅ [PatternExtractor] ${patternKey} matched ${matchCount}: "${trimmedText}"`);
            }
            
            // 防止无限循环 - 特别针对负向断言
            if (matchCount > 1000) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} match time(s) 数过多，stop match`);
                break;
            }
            
            // check no yes 陷入无限循环
            if (regex.lastIndex === lastIndex) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} detected 无限循环，force 推进`);
                regex.lastIndex = lastIndex + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
            lastIndex = regex.lastIndex;
            
            // regex or as of 对于非全局lastIndex0情况，手动推进
            if (!regex.global || regex.lastIndex === 0) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} regex as 非全局或lastIndex0，手动推进`);
                regex.lastIndex = match.index + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
        }
        
        //console.log(`📊 [PatternExtractor] ${patternKey} complete extracted method exec，found ${matchCount}  item(s)`);
    }
    
    // API extracted method of 专门
    extractAPIs(content, results) {
        //console.log('🔍 [PatternExtractor] API start extracted ...');
        //console.log('🔍 [PatternExtractor] object current patterns:', Object.keys(this.patterns));
        //console.log('🔍 [PatternExtractor] configuration absoluteApi:', this.patterns.absoluteApi);
        //console.log('🔍 [PatternExtractor] configuration relativeApi:', this.patterns.relativeApi);
        
        // API regex check configuration no yes has
        if (!this.patterns.absoluteApi && !this.patterns.relativeApi) {
            console.warn('⚠️ [PatternExtractor] regular expression API configuration 未，API skip extracted');
            console.warn('⚠️ [PatternExtractor] absoluteApi存在:', !!this.patterns.absoluteApi);
            console.warn('⚠️ [PatternExtractor] relativeApi存在:', !!this.patterns.relativeApi);
            return;
        }
        
        // remove content limit 大小，content process 完整
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] content process 大小: ${processContent.length} characters`);
        //console.log(`📊 [PatternExtractor] content 预览: ${processContent.substring(0, 200)}...`);
        
        // absolute path API extracted - fixed：object 支持RegExp
        if (this.patterns.absoluteApi) {
            //console.log(`🔍 [PatternExtractor] absolute path API start extracted`);
            //console.log(`🔍 [PatternExtractor] absolute path API regex type: ${typeof this.patterns.absoluteApi}`);
            //console.log(`🔍 [PatternExtractor] absolute path API regex content: ${this.patterns.absoluteApi.source || this.patterns.absoluteApi}`);
            
            let absoluteApiCount = 0;
            const regex = this.patterns.absoluteApi;
            
            // regular expression reset status
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] absolute path API matched: "${api}"`);
                if (api && api.trim()) {
                    const trimmedApi = api.trim();
                    // 🔥 add verify：过滤掉包含http://或https://的absolute path API
                    if (trimmedApi.includes('http://') || trimmedApi.includes('https://')) {
                        //console.log(`🚫 [PatternExtractor] absolute path API contains 协议，filtered: "${trimmedApi}"`);
                    }
                    // 🔥 verify 新增：file filter 掉静态（如.jpg, .png, , etc. .css）
                    else if (this.isStaticFile(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] absolute path API file as 静态，filtered: "${trimmedApi}"`);
                    }
                    // 🔥 verify 新增：API content filter filter contains type of 掉
                    else if (this.containsFilteredContentType(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] absolute path API content filter contains type，filtered: "${trimmedApi}"`);
                    } else {
                        results.absoluteApis.add(trimmedApi);
                        absoluteApiCount++;
                        //console.log(`✅ [PatternExtractor] absolute path API add: "${trimmedApi}"`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] absolute path API match time(s) 数过多，stop match`);
                    break;
                }
                
                // check no yes 陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] absolute path API detected 无限循环，force 推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] absolute path API complete extracted，found ${absoluteApiCount} API item(s)`);
        } else {
            console.warn('⚠️ [PatternExtractor] absolute path API configuration is empty');
        }
        
        // relative path API extracted - fixed：object 支持RegExp
        if (this.patterns.relativeApi) {
            //console.log(`🔍 [PatternExtractor] relative path API start extracted`);
            //console.log(`🔍 [PatternExtractor] relative path API regex type: ${typeof this.patterns.relativeApi}`);
            //console.log(`🔍 [PatternExtractor] relative path API regex content: ${this.patterns.relativeApi.source || this.patterns.relativeApi}`);
            
            let relativeApiCount = 0;
            const regex = this.patterns.relativeApi;
            
            // regular expression reset status
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] relative path API matched: "${api}"`);
                if (api && api.trim()) {
                    // 🔥 新增：relative path API process，去除开头的"."符号但保留"/"
                    const processedApi = this.processRelativeApi(api.trim());
                    
                    // 🔥 process special 新增：relative path API file filter in of 静态（absolute path API filter mode of 应用）
                    if (this.isStaticFile(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] relative path API file as 静态，filtered: "${processedApi}"`);
                    }
                    // 🔥 process special 新增：relative path API API content filter filter contains type in of
                    else if (this.containsFilteredContentType(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] relative path API content filter contains type，filtered: "${processedApi}"`);
                    } else {
                        results.relativeApis.add(processedApi);
                        relativeApiCount++;
                        //console.log(`✅ [PatternExtractor] relative path API add process after: "${processedApi}" (original: "${api.trim()}")`);
                    }
                    matchCount++;
                }
                
                // 防止无限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] relative path API match time(s) 数过多，stop match`);
                    break;
                }
                
                // check no yes 陷入无限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] relative path API detected 无限循环，force 推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] relative path API complete extracted，found ${relativeApiCount} API item(s)`);
        } else {
            console.warn('⚠️ [PatternExtractor] relative path API configuration is empty');
        }
        
        //console.log(`📊 [PatternExtractor] API extracted summary - absolute path: ${results.absoluteApis.size}, relative path: ${results.relativeApis.size}`);
    }
    
    // resource extracted 其他
    extractOtherResources(content, results, sourceUrl = '') {
        //console.log('📁 [PatternExtractor] start resource extracted 其他...');
        
        // remove content limit 大小，content process 完整
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] content resource process 其他大小: ${processContent.length} characters`);
        //console.log(`🌐 [PatternExtractor] URL process current of: ${sourceUrl}`);
        
        // file extracted JS
        if (this.patterns.jsFile) {
            //console.log('🔍 [PatternExtractor] start file extracted JS...');
            this.patterns.jsFile.lastIndex = 0;
            let match;
            let jsFileCount = 0;
            while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
                const jsFile = match[1] || match[2] || match[3] || match[4];
                if (jsFile) {
                    const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                    results.jsFiles.add(cleanJsFile);
                    jsFileCount++;
                    //console.log(`✅ [PatternExtractor] add file JS: "${cleanJsFile}"`);
                }
            }
            //console.log(`📊 [PatternExtractor] complete file extracted JS，found ${jsFileCount}  item(s)`);
        }
        
        // file extracted CSS
        if (this.patterns.cssFile) {
            //console.log('🔍 [PatternExtractor] start file extracted CSS...');
            this.patterns.cssFile.lastIndex = 0;
            let match;
            let cssFileCount = 0;
            while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
                const cssFile = match[1];
                if (cssFile) {
                    const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                    // 🔥 filter 应用：content filter contains check type no yes
                    if (!this.containsFilteredContentType(cleanCssFile)) {
                        results.cssFiles.add(cleanCssFile);
                        cssFileCount++;
                        //console.log(`✅ [PatternExtractor] add file CSS: "${cleanCssFile}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] content file filter contains type CSS，filtered: "${cleanCssFile}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] complete file extracted CSS，found ${cssFileCount}  item(s)`);
        }
        
        // extracted 图片
        if (this.patterns.image) {
            //console.log('🔍 [PatternExtractor] start extracted 图片...');
            this.patterns.image.lastIndex = 0;
            let match;
            let imageCount = 0;
            while ((match = this.patterns.image.exec(processContent)) !== null) {
                const image = match[1];
                if (image) {
                    const cleanImage = image.replace(/["'`]/g, '').trim();
                    // 🔥 filter 应用：content filter contains check type no yes
                    if (!this.containsFilteredContentType(cleanImage)) {
                        results.images.add(cleanImage);
                        imageCount++;
                        //console.log(`✅ [PatternExtractor] add 图片: "${cleanImage}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] content filter contains type 图片，filtered: "${cleanImage}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] complete extracted 图片，found ${imageCount}  item(s)`);
        }
        
        // URL extracted
        if (this.patterns.url) {
            //console.log('🔍 [PatternExtractor] URL start extracted ...');
            this.patterns.url.lastIndex = 0;
            let match;
            let urlCount = 0;
            while ((match = this.patterns.url.exec(processContent)) !== null) {
                const url = match[0];
                if (url) {
                    // 🔥 filter 应用：content filter contains check type no yes
                    if (!this.containsFilteredContentType(url)) {
                        results.urls.add(url);
                        urlCount++;
                        //console.log(`✅ [PatternExtractor] URL add: "${url}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] URL content filter contains type，filtered: "${url}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] URL extraction complete，found ${urlCount}  item(s)`);
        }
        
        //console.log('✅ [PatternExtractor] complete resource extracted 其他');
    }
    
    /**
     * custom regex extracted mode dynamic - unified version
     */
    async extractDynamicCustomPatterns(content, results) {
        try {
            //console.log('🔄 [PatternExtractor] custom regex start extracted mode dynamic ...');
            
            // custom configuration load 确保已
            await this.ensureCustomPatternsLoaded();
            
            // custom regex get configuration current of
            const storageResult = await chrome.storage.local.get(['customRegexConfigs']);
            
            if (!storageResult.customRegexConfigs) {
                //console.log('ℹ️ [PatternExtractor] custom regex not found configuration dynamic');
                return;
            }
            
            //console.log('📊 [PatternExtractor] custom regex configuration current dynamic:', storageResult.customRegexConfigs);
            
            let configsToProcess = [];
            
            // check format 存储：object format format array yes 还
            if (Array.isArray(storageResult.customRegexConfigs)) {
                // format array
                configsToProcess = storageResult.customRegexConfigs;
                //console.log('📋 [PatternExtractor] custom regex detected configuration format array of');
            } else if (typeof storageResult.customRegexConfigs === 'object') {
                // object format，convert array as
                configsToProcess = Object.entries(storageResult.customRegexConfigs).map(([key, config]) => ({
                    key: `custom_${key}`, // add custom_ before 缀
                    name: config.name,
                    pattern: config.pattern,
                    createdAt: config.createdAt
                }));
                //console.log('📋 [PatternExtractor] custom regex detected configuration object format of，format convert array as 已');
            }
            
            if (configsToProcess.length === 0) {
                //console.log('ℹ️ [PatternExtractor] custom regex configuration is empty dynamic');
                return;
            }
            
            // remove content limit 大小，content process 完整
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] custom regex content process dynamic 大小: ${processContent.length} characters`);
            
            // custom regex process configuration item(s) 每
            configsToProcess.forEach((config, index) => {
                try {
                    if (!config.key || !config.pattern || !config.name) {
                        console.warn(`⚠️ [PatternExtractor] custom regex skip configuration of 无效 ${index + 1}:`, config);
                        return;
                    }
                    
                    //console.log(`🔍 [PatternExtractor] custom regex process ${index + 1}: ${config.name} (${config.key})`);
                    //console.log(`📝 [PatternExtractor] regex mode: ${config.pattern}`);
                    
                    // regular expression 创建
                    const regex = new RegExp(config.pattern, 'g');
                    
                    // in of has 确保results对应Set
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`📦 [PatternExtractor] custom regex as ${config.key} results 创建集合`);
                    }
                    
                    //console.log(`🔍 [PatternExtractor] custom regex start content match in 在 ${config.key}...`);
                    //console.log(`📊 [PatternExtractor] content match length 待: ${processContent.length} characters`);
                    
                    // regular expression test 先在小样本上
                    const testContent = processContent.substring(0, 1000);
                    //console.log(`🧪 [PatternExtractor] custom regex test ${config.key} match of 在小样本上...`);
                    const testRegex = new RegExp(config.pattern, 'g');
                    let testMatch;
                    let testCount = 0;
                    while ((testMatch = testRegex.exec(testContent)) !== null && testCount < 5) {
                        //console.log(`🎯 [PatternExtractor] match test ${testCount + 1}: "${testMatch[0]}"`);
                        testCount++;
                    }
                    //console.log(`📊 [PatternExtractor] complete test 小样本，matched ${testCount} results item(s)`);
                    
                    // match execute 完整
                    let match;
                    let matchCount = 0;
                    regex.lastIndex = 0; // regular expression reset status
                    
                    //console.log(`🔍 [PatternExtractor] start content match 完整...`);
                    while ((match = regex.exec(processContent)) !== null) {
                        const matchedText = match[0];
                        if (matchedText && matchedText.trim()) {
                            results[config.key].add(matchedText.trim());
                            matchCount++;
                            //console.log(`✅ [PatternExtractor] custom regex ${config.key} matched ${matchCount}: "${matchedText.trim()}"`);
                        }
                        
                        // 防止无限循环
                        if (matchCount > 1000) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${config.key} match time(s) 数过多，stop match`);
                            break;
                        }
                        
                        // regular expression 防止无限循环
                        if (regex.lastIndex === match.index) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${config.key} detected 无限循环，stop match`);
                            break;
                        }
                    }
                    
                    //console.log(`📊 [PatternExtractor] custom regex ${config.key} complete match，found ${matchCount} results item(s)`);
                    //console.log(`📦 [PatternExtractor] custom regex ${config.key} results 集合大小: ${results[config.key].size}`);
                    
                    // add results validate object to in no yes 正确results
                    if (results[config.key].size > 0) {
                        //console.log(`✅ [PatternExtractor] custom regex ${config.key} success added results object to results`);
                        //console.log(`🎯 [PatternExtractor] custom regex ${config.key} results 预览:`, Array.from(results[config.key]).slice(0, 3));
                    } else {
                        //console.log(`ℹ️ [PatternExtractor] custom regex ${config.key} matched results any 未`);
                        // matched results if has 没，of empty 仍然保留Set，确保键存在
                        //console.log(`🔧 [PatternExtractor] results with of empty 保留集合确保键 ${config.key} 存在`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PatternExtractor] custom regex configuration ${index + 1} failed process:`, error, config);
                    // error occurred 即使也要确保键存在
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`🔧 [PatternExtractor] custom regex error occurred as of ${config.key} results empty 创建集合`);
                    }
                }
            });
            
            //console.log('✅ [PatternExtractor] custom regex complete extracted mode dynamic');
            
        } catch (error) {
            console.error('❌ [PatternExtractor] custom regex failed extracted mode dynamic:', error);
        }
    }
    
    /**
     * extracted mode all - unified version，configuration settings use 只界面
     */
    async extractPatterns(content, sourceUrl = '') {
        try {
            //console.log('🚀🚀🚀 [PatternExtractor] unified start extracted mode version - log force！');
            //console.log(`📊 [PatternExtractor] content length: ${content.length} characters`);
            //console.log(`🌐 [PatternExtractor] URL 源: ${sourceUrl}`);
            //console.log('🔍🔍🔍 [PatternExtractor] call method item(s) 这被了！');
            
            // custom configuration load 确保已
            await this.ensureCustomPatternsLoaded();
            
            // initialize results object，use Set避免重复 - fixed：use of 正确键名
            const results = {
                // API related
                absoluteApis: new Set(),
                relativeApis: new Set(),
                
                // file resource
                jsFiles: new Set(),
                cssFiles: new Set(),
                images: new Set(),
                urls: new Set(),
                
                // sensitive information - fixed：use of 与DisplayManager一致键名
                domains: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(), // fixed：as from phones改phoneNumbers
                credentials: new Set(),
                ipAddresses: new Set(), // fixed：as from ips改ipAddresses
                paths: new Set(),
                jwts: new Set(),
                githubUrls: new Set(), // fixed：as from githubs改githubUrls
                vueFiles: new Set(), // fixed：as from vues改vueFiles
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
            
            //console.log('📦 [PatternExtractor] initialize complete results object');
            //console.log('📊 [PatternExtractor] available regex mode current:', Object.keys(this.patterns));
            
            // remove content limit 大小，content process 完整
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] content process 实际大小: ${processContent.length} characters`);
            
            // 1. API extracted（process special，regex item(s) as has 因可能多）
            this.extractAPIs(processContent, results);
            
            // 2. file resource extracted 其他
            this.extractOtherResources(processContent, results, sourceUrl);
            
            // 3. extracted mode 其他（regex configuration settings use of 界面） - fixed：use of 正确键名映射
            const patternMappings = {
                domain: 'domains',
                email: 'emails', 
                phone: 'phoneNumbers', // fixed：as from phones改phoneNumbers
                credentials: 'credentials',
                ip: 'ipAddresses', // fixed：as from ips改ipAddresses
                paths: 'paths',
                jwt: 'jwts',
                github: 'githubUrls', // fixed：as from githubs改githubUrls
                vue: 'vueFiles', // fixed：as from vues改vueFiles
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
            
            //console.log('🔍 [PatternExtractor] start extracted mode 其他...');
            
            Object.entries(patternMappings).forEach(([patternKey, resultKey]) => {
                if (this.patterns[patternKey]) {
                    //console.log(`🔍 [PatternExtractor] extracted ${patternKey} -> ${resultKey}`);
                    //console.log(`📝 [PatternExtractor] regex use: ${this.patterns[patternKey].source}`);
                    
                    // fixed：process special of 针对负向断言
                    const regex = this.patterns[patternKey];
                    const regexSource = regex.source;
                    const hasLookbehind = regexSource.includes('(?<!') || regexSource.includes('(?<=');
                    const hasLookahead = regexSource.includes('(?!') || regexSource.includes('(?=');
                    
                    if (hasLookbehind || hasLookahead) {
                        //console.log(`🔧 [PatternExtractor] detected 负向断言，process special use: ${patternKey}`);
                        
                        // regex contains of 对于负向断言，use matchAll method
                        try {
                            const matches = [...processContent.matchAll(regex)];
                            //console.log(`📊 [PatternExtractor] ${patternKey} use to matchAll找 ${matches.length} match item(s)`);
                            
                            matches.forEach((match, index) => {
                                const matchedText = match[1] || match[0];
                                if (matchedText && matchedText.trim()) {
                                    const trimmedText = matchedText.trim();
                                    
                                    // 🔥 process special：absolute path API content filter contains in of 协议
                                    if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                                        //console.log(`🚫 [PatternExtractor] absolute path API contains 协议，filtered: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 process special 新增：absolute path API file filter in of 静态
                                    if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] absolute path API file as 静态，filtered: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 process special 新增：blacklist domain filter
                                    if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] blacklist domain in 在，filtered: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 process special 新增：content content filter filter contains type of
                                    if (this.containsFilteredContentType(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] ${patternKey} content filter contains type，filtered: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    results[resultKey].add(trimmedText);
                                    //console.log(`✅ [PatternExtractor] ${patternKey} matched ${index + 1}: "${trimmedText}"`);
                                }
                            });
                            
                            //console.log(`📊 [PatternExtractor] ${patternKey} complete extracted，found ${matches.length}  item(s)`);
                        } catch (error) {
                            console.error(`❌ [PatternExtractor] ${patternKey} failed matchAll，method to 回退exec:`, error);
                            // method to of from 回退原exec
                            this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                        }
                    } else {
                        // regex 对于普通，method use of from 原exec
                        this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                    }
                } else {
                    //console.log(`⚠️ [PatternExtractor] skip configuration mode of 未: ${patternKey}`);
                }
            });
            
            
            // 4. custom regex extracted mode dynamic - fixed：load use directly of 已patterns
            //console.log('🔍 [PatternExtractor] custom regex start extracted mode dynamic ...');
            //console.log('🔍 [PatternExtractor] current all of this.patterns键:', Object.keys(this.patterns));
            
            // custom regex find mode all
            const customPatternKeys = Object.keys(this.patterns).filter(key => key.startsWith('custom_'));
            //console.log(`📊 [PatternExtractor] found ${customPatternKeys.length} custom regex mode item(s):`, customPatternKeys);
            //console.log(`🔍 [PatternExtractor] custom regex details mode:`, customPatternKeys.map(key => ({
            //    key,
            //    regex: this.patterns[key] ? this.patterns[key].source : 'null',
            //    type: typeof this.patterns[key]
            //})));
            
            if (customPatternKeys.length > 0) {
                customPatternKeys.forEach(patternKey => {
                    try {
                        //console.log(`🔍 [PatternExtractor] custom regex process: ${patternKey}`);
                        
                        const regex = this.patterns[patternKey];
                        if (!regex) {
                            console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} regular expression not found of 对应`);
                            return;
                        }
                        
                        // in of has 确保results对应Set
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`📦 [PatternExtractor] custom regex as ${patternKey} results 创建集合`);
                        }
                        
                        //console.log(`🔍 [PatternExtractor] custom regex start match ${patternKey}...`);
                        //console.log(`📝 [PatternExtractor] regular expression: ${regex.source}`);
                        
                        // regular expression reset status
                        regex.lastIndex = 0;
                        
                        let match;
                        let matchCount = 0;
                        
                        while ((match = regex.exec(processContent)) !== null) {
                            const matchedText = match[0];
                            if (matchedText && matchedText.trim()) {
                                const trimmedText = matchedText.trim();
                                
                                // 🔥 filter 应用：content filter contains check type no yes
                                if (!this.containsFilteredContentType(trimmedText)) {
                                    results[patternKey].add(trimmedText);
                                    matchCount++;
                                    //console.log(`✅ [PatternExtractor] custom regex ${patternKey} matched ${matchCount}: "${trimmedText}"`);
                                } else {
                                    //console.log(`🚫 [PatternExtractor] custom regex ${patternKey} content filter contains type，filtered: "${trimmedText}"`);
                                }
                            }
                            
                            // 防止无限循环
                            if (matchCount > 1000) {
                                console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} match time(s) 数过多，stop match`);
                                break;
                            }
                            
                            // regular expression 防止无限循环
                            if (regex.lastIndex === match.index) {
                                console.warn(`⚠️ [PatternExtractor] custom regex ${patternKey} detected 无限循环，stop match`);
                                break;
                            }
                        }
                        
                        //console.log(`📊 [PatternExtractor] custom regex ${patternKey} complete match，found ${matchCount} results item(s)`);
                        //console.log(`📦 [PatternExtractor] custom regex ${patternKey} results 集合大小: ${results[patternKey].size}`);
                        
                        if (results[patternKey].size > 0) {
                            //console.log(`✅ [PatternExtractor] custom regex ${patternKey} results 预览:`, Array.from(results[patternKey]).slice(0, 3));
                        } else {
                            //console.log(`ℹ️ [PatternExtractor] custom regex ${patternKey} matched results any 未`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ [PatternExtractor] custom regex ${patternKey} failed process:`, error);
                        // error occurred 即使也要确保键存在
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`🔧 [PatternExtractor] custom regex error occurred as of ${patternKey} results empty 创建集合`);
                        }
                    }
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] custom regex not found mode');
            }
            
            //console.log('🔍 [PatternExtractor] custom regex complete extracted mode dynamic，current results键:', Object.keys(results));
            
            // 5. ID card process validate special
            if (results.idCards.size > 0) {
                //console.log(`🔍 [PatternExtractor] ID card start validate，total ${results.idCards.size}  item(s)`);
                const validatedIdCards = this.validateIdCards(Array.from(results.idCards));
                results.idCards = new Set(validatedIdCards);
                //console.log(`✅ [PatternExtractor] ID card complete validate，ID card has 效 ${results.idCards.size}  item(s)`);
            }
            
            // 6. URL add information convert as SetArray并源，all dynamic of 包括创建键
            const finalResults = {};
            
            //console.log('🔍 [PatternExtractor] URL add start information results convert 并源，object current all of results键:', Object.keys(results));
            
            // fixed：all 遍历键，custom regex dynamic of 包括创建键，URL add project item(s) as 并每源
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // URL information contains object convert array as of 将Set源
                    finalResults[key] = [...value].map(item => {
                        // 🔥 fixed：contains check object of no yes yes item已经sourceUrl
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            // object format if yes 已经，contains all 确保必要字段
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || sourceUrl,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            // if characters yes 串，object format convert as
                            return {
                                value: item,
                                sourceUrl: sourceUrl,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                    
                    //console.log(`🔄 [PatternExtractor] convert ${key}: Set(${value.size}) -> Array(${finalResults[key].length}) URL add 并源`);
                    if (finalResults[key].length > 0) {
                        //console.log(`📊 [PatternExtractor] ${key}: ${finalResults[key].length} results item(s)，URL 源: ${sourceUrl}`);
                        // custom regex results if yes，information display of 更详细
                        if (key.startsWith('custom_')) {
                            //console.log(`🎯 [PatternExtractor] custom regex ${key} results 预览:`, finalResults[key].slice(0, 3));
                        }
                    } else if (key.startsWith('custom_')) {
                        // custom regex results of yes empty 即使，results final in 也要保留在
                        //console.log(`📦 [PatternExtractor] custom regex of empty 保留键 ${key}`);
                    }
                } else if (value) {
                    // type of 对于非Set值，URL add information 也源
                    if (Array.isArray(value)) {
                        finalResults[key] = value.map(item => {
                            // 🔥 fixed：contains check object of no yes yes item已经sourceUrl
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
                        // 🔥 fixed：object format convert item(s) as 单值也要
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
                    //console.log(`🔄 [PatternExtractor] URL add copy directly 并源 ${key}:`, typeof value);
                } else {
                    // is empty array empty 值保持
                    finalResults[key] = [];
                }
            }
            
            // custom regex process validate all 键都被正确
            const customKeys = Object.keys(results).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ [PatternExtractor] found process 并了 ${customKeys.length} custom regex item(s) 键:`, customKeys);
                customKeys.forEach(key => {
                    //console.log(`✅ [PatternExtractor] custom regex 键 ${key} convert 已正确: ${finalResults[key].length} results item(s)`);
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] custom regex not found 键');
            }
            
            //console.log('✅ [PatternExtractor] unified complete extracted mode version');
            //console.log('📊 [PatternExtractor] results final 键:', Object.keys(finalResults));
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ [PatternExtractor] failed extracted mode:', error);
            return {};
        }
    }
}

// export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternExtractor;
} else if (typeof window !== 'undefined') {
    window.PatternExtractor = PatternExtractor;
}
