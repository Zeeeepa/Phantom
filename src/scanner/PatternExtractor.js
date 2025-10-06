/**
 * PatternExtract器 - Only使用Settings界面Configuration的Regular expression
 * Unified化版本 - 去除所有内置正则And降级机制
 */
class PatternExtractor {
    constructor() {
        // 静态FileExtension名列Table - Used forFilterAbsolute pathAndRelative pathAPI
        this.staticFileExtensions = [
            // 图片File
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
            // 样式File
            '.css', '.scss', '.sass', '.less',
            // ScriptFile
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.coffee',
            // 字体File
            '.woff', '.woff2', '.ttf', '.otf', '.eot',
            // 音频File
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
            // 视频File
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
        ];

        // Domain黑名单：不会展示以下Domain
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

        // ContentTypeFilter列Table - Used for静态PathAndRelative pathFilter
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
            // DateType
            'yyyy/mm/dd',
            'dd/mm/yyyy',
            'mm/dd/yy',
            'yy/mm/dd',
            'm/d/Y',
            'm/d/y',
            'xx/xx',
            'zrender/vml/vml',
            // CSS单位AndRegular expressionPattern
            '/rem/g',
            '/vw/g',
            '/vh/g',
            '/-/g',
            '/./g',
            '/f.value',
            '/i.test',
            // 操作SystemDetectPattern
            '/android/i.test',
            '/CrOS/.test',
            '/windows/i.test',
            '/macintosh/i.test',
            '/linux/i.test',
            '/tablet/i.test',
            '/xbox/i.test',
            '/bada/i.test',
            // 浏览器DetectPattern
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
        
        // 引入身份证ValidateFilter
        this.idCardFilter = null;
        this.loadIdCardFilter();
        
        // Current使用的Regular expressionConfiguration - 初始is empty，Only使用Settings界面Configuration
        this.patterns = {};
        
        // CustomRegular expressionConfiguration
        this.customRegexConfig = null;
        
        // Mark是否LoadedCustomConfiguration
        this.customPatternsLoaded = false;
        
        // Settings全局引用，供Settings管理器调用
        window.patternExtractor = this;
        
        // ListenConfigurationUpdate事件
        window.addEventListener('regexConfigUpdated', (event) => {
            //console.log('🔄 收到正则ConfigurationUpdate事件:', event.detail);
            this.updatePatterns(event.detail);
        }, { once: false });
        
        // AsyncLoadCustomConfiguration，但不阻塞构造Function
        this.loadCustomPatterns().catch(error => {
            console.error('❌ AsyncLoadCustomConfigurationFailed:', error);
        });
    }
    
    /**
     * Load身份证ValidateFilter
     */
    loadIdCardFilter() {
        try {
            // 尝试from全局VariableGet
            if (typeof window !== 'undefined' && window.idCardFilter) {
                this.idCardFilter = window.idCardFilter;
                //console.log('✅ 身份证FilterLoadSuccess (全局Variable)');
                return;
            }
            
            // 尝试动态Load
            const script = document.createElement('script');
            script.src = 'filters/id-card-filter.js';
            script.onload = () => {
                if (window.idCardFilter) {
                    this.idCardFilter = window.idCardFilter;
                    //console.log('✅ 身份证Filter动态LoadSuccess');
                } else {
                    console.warn('⚠️ 身份证FilterLoadFailed：Not found idCardFilter');
                }
            };
            script.onerror = () => {
                console.error('❌ 身份证FilterScriptLoadFailed');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('❌ Load身份证Filter时出错:', error);
        }
    }
    
    /**
     * DetectURL是否为静态File
     * @param {string} url - 要Detect的URL
     * @returns {boolean} 是否为静态File
     */
    isStaticFile(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        // RemoveQueryParameterAnd锚点
        const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
        
        // Check是否以静态FileExtension名结尾
        return this.staticFileExtensions.some(ext => cleanUrl.endsWith(ext));
    }

    /**
     * CheckDomain是否在黑名单中
     * @param {string} domain - 要Check的Domain
     * @returns {boolean} 是否在黑名单中
     */
    isDomainBlacklisted(domain) {
        if (!domain || typeof domain !== 'string') {
            return false;
        }
        
        // CleanDomain，RemoveProtocol、Path等
        const cleanDomain = domain.toLowerCase()
            .replace(/^https?:\/\//, '')  // RemoveProtocol
            .replace(/\/.*$/, '')         // RemovePath
            .replace(/:\d+$/, '')         // Remove端口
            .trim();
        
        // Check是否在黑名单中
        const isBlacklisted = this.DOMAIN_BLACKLIST.includes(cleanDomain);
        
        if (isBlacklisted) {
            console.log(`🚫 [PatternExtractor] DomainAlreadyBy黑名单Filter: "${cleanDomain}"`);
        }
        
        return isBlacklisted;
    }

    /**
     * CheckPath是否包含NeedFilter的ContentType
     * @param {string} path - 要Check的Path
     * @returns {boolean} 是否包含NeedFilter的ContentType
     */
    containsFilteredContentType(path) {
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        const lowerPath = path.toLowerCase();
        
        // Check是否包含任何Filter的ContentType
        const isFiltered = this.FILTERED_CONTENT_TYPES.some(contentType => {
            return lowerPath.includes(contentType.toLowerCase());
        });
        
        if (isFiltered) {
            console.log(`🚫 [PatternExtractor] Path包含FilterContentType，AlreadyFilter: "${path}"`);
        }
        
        return isFiltered;
    }

    /**
     * Filter静态FilePath
     * @param {Array} paths - Path数Group
     * @returns {Array} FilterAfter的Path数Group
     */
    filterStaticPaths(paths) {
        return paths.filter(path => {
            // Check是否包含NeedFilter的ContentType
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // GetFileExtension名
            const ext = path.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // NoExtension名的保留
            
            // Check是否为静态FileExtension名
            return !this.staticFileExtensions.includes(ext[0]);
        });
    }

    /**
     * FilterRelative path中的静态File
     * @param {Array} relativePaths - Relative path数Group
     * @returns {Array} FilterAfter的Relative path数Group
     */
    filterStaticRelativePaths(relativePaths) {
        return relativePaths.filter(path => {
            // Check是否包含NeedFilter的ContentType
            if (this.containsFilteredContentType(path)) {
                return false;
            }
            
            // ProcessRelative path，可能包含 ../ Or ./
            const normalizedPath = path.replace(/^\.\.?\//, '');
            
            // GetFileExtension名
            const ext = normalizedPath.toLowerCase().match(/\.[^.]*$/);
            if (!ext) return true; // NoExtension名的保留
            
            // Check是否为静态FileExtension名
            const isStaticFile = this.staticFileExtensions.includes(ext[0]);
            
            // RecordFilter的静态File（Used for调试）
            if (isStaticFile) {
                console.log(`🚫 [PatternExtractor] FilterRelative path静态File: ${path}`);
            }
            
            return !isStaticFile;
        });
    }

    // ProcessRelative pathAPI，去除开Header的"."符号但保留"/"
    processRelativeApi(api) {
        try {
            // 去除开Header的"."符号，但保留"/"
            if (api.startsWith('./')) {
                return api.substring(1); // 去除开Header的"."，保留"/"
            } else if (api.startsWith('.') && !api.startsWith('/')) {
                return api.substring(1); // 去除开Header的"."
            }
            return api; // 其他情况保持不变
        } catch (error) {
            console.warn('⚠️ ProcessRelative pathAPI时出错:', error);
            return api;
        }
    }
    
    /**
     * ValidateAndFilter身份证号码，Only保留18位Valid身份证
     * @param {Array} idCards - Extract到的身份证号码数Group
     * @returns {Array} ValidateThrough的18-digit ID card号码数Group
     */
    validateIdCards(idCards) {
        if (!this.idCardFilter || !Array.isArray(idCards)) {
            return idCards || [];
        }
        
        const validIdCards = [];
        
        for (const idCard of idCards) {
            try {
                const cleanIdCard = idCard.replace(/['"]/g, '').trim();
                
                // OnlyProcess18-digit ID card
                if (cleanIdCard.length !== 18) {
                    continue;
                }
                
                const result = this.idCardFilter.validate(cleanIdCard);
                if (result.valid && result.type === '18-digit ID card') {
                    validIdCards.push(cleanIdCard);
                    //console.log(`✅ 身份证ValidateThrough: ${cleanIdCard} (${result.province}, ${result.gender})`);
                } else {
                    //console.log(`❌ 身份证ValidateFailed: ${cleanIdCard} - ${result.error || 'FormatError'}`);
                }
            } catch (error) {
                console.error('❌ 身份证Validate过程出错:', error, '身份证:', idCard);
            }
        }
        
        return validIdCards;
    }
    
    /**
     * LoadCustomRegular expressionConfiguration - Unified化版本
     */
    async loadCustomPatterns() {
        try {
            //console.log('🔄 PatternExtractorUnified化版本StartLoadCustomConfiguration...');
            
            // Fix：Save现有的Custom正则Pattern，避免ByClear
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] Save现有Custom正则: ${key}`);
                }
            });
            
            // OnlyReset非Custom的正则Pattern
            const newPatterns = {};
            Object.keys(existingCustomPatterns).forEach(key => {
                newPatterns[key] = existingCustomPatterns[key];
            });
            this.patterns = newPatterns;
            
            // Load所有RelatedConfiguration：regexSettings + 动态Custom正则Configuration
            const result = await chrome.storage.local.get(['regexSettings', 'customRegexConfigs']);
            
            //console.log('📊 PatternExtractorLoad的存储Data:', result);
            
            if (result.regexSettings) {
                //console.log('🔄 PatternExtractorLoadregexSettingsConfiguration:', result.regexSettings);
                this.updatePatterns(result.regexSettings);
                //console.log('✅ PatternExtractorBasicRegular expressionConfigurationAlreadyUpdate');
            } else {
                console.warn('⚠️ PatternExtractorNot foundregexSettingsConfiguration，AddBasicResource正则');
                // AddBasicResourceFile正则（This些不依赖Settings界面，是Basic功能）
                this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
                this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
                this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            }
            
            // Load动态Custom正则Configuration - Fix：支持ObjectAnd数Group两种存储Format
            if (result.customRegexConfigs) {
                //console.log('🔄 PatternExtractorStartLoad动态Custom正则Configuration:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // Check存储Format：ObjectFormat还是数GroupFormat
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数GroupFormat
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 PatternExtractorDetect到数GroupFormat的Custom正则Configuration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // ObjectFormat，Convert为数Group
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // Add custom_ Before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 PatternExtractorDetect到ObjectFormat的Custom正则Configuration，AlreadyConvert为数GroupFormat');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        try {
                            if (config.key && config.pattern && config.name) {
                                // 将Custom正则Add到patterns中
                                const regex = new RegExp(config.pattern, 'g');
                                this.patterns[config.key] = regex;
                                //console.log(`✅ PatternExtractorAddCustom正则 ${index + 1}: ${config.name} (${config.key}) - ${config.pattern}`);
                            } else {
                                console.warn(`⚠️ PatternExtractor跳过Invalid的Custom正则Configuration ${index + 1}:`, config);
                            }
                        } catch (error) {
                            console.error(`❌ PatternExtractorCustom正则Configuration ${index + 1} FormatError:`, error, config);
                        }
                    });
                    
                    //console.log(`✅ PatternExtractor动态Custom正则ConfigurationLoading complete，共Load ${configsToProcess.length} 个Configuration`);
                } else {
                    //console.log('⚠️ PatternExtractor动态Custom正则Configurationis empty');
                }
            } else {
                //console.log('ℹ️ PatternExtractorNot found动态Custom正则Configuration');
            }
            
            // MarkConfigurationLoaded
            this.customPatternsLoaded = true;
            //console.log('✅ PatternExtractorUnified化版本CustomConfigurationLoading complete');
            //console.log('📊 PatternExtractorCurrentAvailable的正则Pattern:', Object.keys(this.patterns));
            
        } catch (error) {
            console.error('❌ PatternExtractorLoadCustomRegular expressionConfigurationFailed:', error);
            this.customPatternsLoaded = true; // 即使Failed也Mark为Loaded，避免None限等Pending
        }
    }
    
    /**
     * ParseRegular expressionInput，支持 /pattern/flags FormatAnd普通字符串Format
     * @param {string} input - Input的Regular expression字符串
     * @param {string} defaultFlags - Default标志，Default为 'g'
     * @returns {RegExp|null} ParseAfter的Regular expressionObject
     */
    parseRegexInput(input, defaultFlags = 'g') {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }
        
        const trimmedInput = input.trim();
        
        // Check是否为 /pattern/flags Format
        const match = trimmedInput.match(/^\/(.*)\/([gimuy]*)$/);
        if (match) {
            const [, pattern, flags] = match;
            try {
                return new RegExp(pattern, flags || defaultFlags);
            } catch (error) {
                console.error('❌ Regular expressionFormatError (字面量Format):', error, 'Pattern:', pattern, 'Flags:', flags);
                return null;
            }
        } else {
            // 兼容旧写法（非 /.../ 形式）
            try {
                return new RegExp(trimmedInput, defaultFlags);
            } catch (error) {
                console.error('❌ Regular expressionFormatError (字符串Format):', error, 'Pattern:', trimmedInput);
                return null;
            }
        }
    }

    /**
     * UpdateRegular expressionConfiguration - Only使用Settings界面的Configuration
     */
    updatePatterns(customSettings) {
        try {
            //console.log('🔧 StartUpdateRegular expressionConfiguration...', customSettings);
            
            // Save现有的Custom正则Pattern
            const existingCustomPatterns = {};
            Object.keys(this.patterns).forEach(key => {
                if (key.startsWith('custom_')) {
                    existingCustomPatterns[key] = this.patterns[key];
                    //console.log(`💾 [PatternExtractor] Save现有Custom正则: ${key}`);
                }
            });
            
            // Clear所有现有Pattern
            this.patterns = {};
            
            // 恢复Custom正则Pattern
            Object.keys(existingCustomPatterns).forEach(key => {
                this.patterns[key] = existingCustomPatterns[key];
                //console.log(`🔄 [PatternExtractor] 恢复Custom正则: ${key}`);
            });
            
            // UpdateAbsolute pathAPI正则
            if (customSettings.absoluteApis && customSettings.absoluteApis.trim()) {
                this.patterns.absoluteApi = this.parseRegexInput(customSettings.absoluteApis);
                //console.log('📝 UpdateAbsolute pathAPIRegular expression:', customSettings.absoluteApis);
            }
            
            // UpdateRelative pathAPI正则
            if (customSettings.relativeApis && customSettings.relativeApis.trim()) {
                this.patterns.relativeApi = this.parseRegexInput(customSettings.relativeApis);
                //console.log('📝 UpdateRelative pathAPIRegular expression:', customSettings.relativeApis);
            }
            
            // UpdateDomain正则
            if (customSettings.domains && customSettings.domains.trim()) {
                this.patterns.domain = this.parseRegexInput(customSettings.domains);
                //console.log('📝 UpdateDomainRegular expression:', customSettings.domains);
            }
            
            // Update邮箱正则
            if (customSettings.emails && customSettings.emails.trim()) {
                this.patterns.email = this.parseRegexInput(customSettings.emails);
                //console.log('📝 Update邮箱Regular expression:', customSettings.emails);
            }
            
            // UpdatePhone正则
            if (customSettings.phoneNumbers && customSettings.phoneNumbers.trim()) {
                this.patterns.phone = this.parseRegexInput(customSettings.phoneNumbers);
                //console.log('📝 UpdatePhoneRegular expression:', customSettings.phoneNumbers);
            }
            
            // Update敏感Information正则
            if (customSettings.credentials && customSettings.credentials.trim()) {
                this.patterns.credentials = this.parseRegexInput(customSettings.credentials, 'gi');
                //console.log('📝 Update敏感InformationRegular expression:', customSettings.credentials);
            }
            
            // UpdateIP地址正则
            if (customSettings.ipAddresses && customSettings.ipAddresses.trim()) {
                this.patterns.ip = this.parseRegexInput(customSettings.ipAddresses);
                //console.log('📝 UpdateIP地址Regular expression:', customSettings.ipAddresses);
            }
            
            // UpdatePath正则
            if (customSettings.paths && customSettings.paths.trim()) {
                this.patterns.paths = this.parseRegexInput(customSettings.paths);
                //console.log('📝 UpdatePathRegular expression:', customSettings.paths);
            }
            
            // UpdateJWT令牌正则
            if (customSettings.jwts && customSettings.jwts.trim()) {
                this.patterns.jwt = this.parseRegexInput(customSettings.jwts);
                //console.log('📝 UpdateJWT令牌Regular expression:', customSettings.jwts);
            }
            
            // UpdateGitHub链接正则
            if (customSettings.githubUrls && customSettings.githubUrls.trim()) {
                this.patterns.github = this.parseRegexInput(customSettings.githubUrls);
                //console.log('📝 UpdateGitHub链接Regular expression:', customSettings.githubUrls);
            }
            
            // UpdateVueFile正则
            if (customSettings.vueFiles && customSettings.vueFiles.trim()) {
                this.patterns.vue = this.parseRegexInput(customSettings.vueFiles);
                //console.log('📝 UpdateVueFileRegular expression:', customSettings.vueFiles);
            }
            
            // Update公司名称正则
            if (customSettings.companies && customSettings.companies.trim()) {
                this.patterns.company = this.parseRegexInput(customSettings.companies);
                //console.log('📝 Update公司名称Regular expression:', customSettings.companies);
            }
            
            // Update注释正则
            if (customSettings.comments && customSettings.comments.trim()) {
                this.patterns.comments = this.parseRegexInput(customSettings.comments, 'gm');
                //console.log('📝 Update注释Regular expression:', customSettings.comments);
            }
            
            // Update身份证正则
            if (customSettings.idCards && customSettings.idCards.trim()) {
                this.patterns.idCard = this.parseRegexInput(customSettings.idCards);
                //console.log('📝 Update身份证Regular expression:', customSettings.idCards);
            }
            
            // UpdateBearer Token正则
            if (customSettings.bearerTokens && customSettings.bearerTokens.trim()) {
                this.patterns.bearerToken = this.parseRegexInput(customSettings.bearerTokens);
                //console.log('📝 UpdateBearer TokenRegular expression:', customSettings.bearerTokens);
            }
            
            // UpdateBasic Auth正则
            if (customSettings.basicAuth && customSettings.basicAuth.trim()) {
                this.patterns.basicAuth = this.parseRegexInput(customSettings.basicAuth);
                //console.log('📝 UpdateBasic AuthRegular expression:', customSettings.basicAuth);
            }
            
            // UpdateAuthorization Header正则
            if (customSettings.authHeaders && customSettings.authHeaders.trim()) {
                this.patterns.authHeader = this.parseRegexInput(customSettings.authHeaders);
                //console.log('📝 UpdateAuthorization HeaderRegular expression:', customSettings.authHeaders);
            }
            
            // Update微信AppID正则
            if (customSettings.wechatAppIds && customSettings.wechatAppIds.trim()) {
                this.patterns.wechatAppId = this.parseRegexInput(customSettings.wechatAppIds);
                //console.log('📝 Update微信AppIDRegular expression:', customSettings.wechatAppIds);
            }
            
            // UpdateAWS密钥正则
            if (customSettings.awsKeys && customSettings.awsKeys.trim()) {
                this.patterns.awsKey = this.parseRegexInput(customSettings.awsKeys);
                //console.log('📝 UpdateAWS密钥Regular expression:', customSettings.awsKeys);
            }
            
            // UpdateGoogle API Key正则
            if (customSettings.googleApiKeys && customSettings.googleApiKeys.trim()) {
                this.patterns.googleApiKey = this.parseRegexInput(customSettings.googleApiKeys);
                //console.log('📝 UpdateGoogle API KeyRegular expression:', customSettings.googleApiKeys);
            }
            
            // UpdateGitHub Token正则
            if (customSettings.githubTokens && customSettings.githubTokens.trim()) {
                this.patterns.githubToken = this.parseRegexInput(customSettings.githubTokens);
                //console.log('📝 UpdateGitHub TokenRegular expression:', customSettings.githubTokens);
            }
            
            // UpdateGitLab Token正则
            if (customSettings.gitlabTokens && customSettings.gitlabTokens.trim()) {
                this.patterns.gitlabToken = this.parseRegexInput(customSettings.gitlabTokens);
                //console.log('📝 UpdateGitLab TokenRegular expression:', customSettings.gitlabTokens);
            }
            
            // UpdateWebhook URLs正则
            if (customSettings.webhookUrls && customSettings.webhookUrls.trim()) {
                this.patterns.webhookUrls = this.parseRegexInput(customSettings.webhookUrls);
                //console.log('📝 UpdateWebhook URLsRegular expression:', customSettings.webhookUrls);
            }
            
            // UpdateEncryption算法使用正则
            if (customSettings.cryptoUsage && customSettings.cryptoUsage.trim()) {
                this.patterns.cryptoUsage = this.parseRegexInput(customSettings.cryptoUsage, 'gi');
                //console.log('📝 UpdateEncryption算法使用Regular expression:', customSettings.cryptoUsage);
            }
            
            // AddBasicResourceFile正则（This些不依赖Settings界面，是Basic功能）
            this.patterns.jsFile = /<script[^>]*\ssrc\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`][^>]*>|(?:src|href)\s*=\s*["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]|import\s+.*?from\s+["'`]([^"'`]*\.js)["'`]|require\s*\(\s*["'`]([^"'`]*\.js)["'`]\s*\)/gi;
            this.patterns.cssFile = /(?:href)\s*=\s*["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.image = /(?:src|href|data-src)\s*=\s*["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/gi;
            this.patterns.url = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
            
            //console.log('✅ Regular expressionConfigurationUpdate completed');
            //console.log('📊 CurrentAvailable的正则Pattern:', Object.keys(this.patterns));
            
            // SaveCurrentConfigurationStatus
            this.customRegexConfig = customSettings;
            
        } catch (error) {
            console.error('❌ UpdateRegular expressionConfigurationFailed:', error);
        }
    }
    
    /**
     * EnsureCustomConfigurationLoaded - Unified化版本
     * Fix：Only在必要时ReloadConfiguration，避免Clear现有Configuration
     */
    async ensureCustomPatternsLoaded() {
        if (!this.customPatternsLoaded) {
            //console.log('🔄 PatternExtractorUnified化版本：首次LoadConfiguration...');
            await this.loadCustomPatterns();
        } else {
            //console.log('✅ PatternExtractorUnified化版本：ConfigurationLoaded，跳过重复Load');
        }
    }
    
    /**
     * 使用execMethodExecute正则Match - Fix负向断言问题
     */
    executeRegexWithExec(regex, content, results, resultKey, patternKey) {
        //console.log(`🔍 [PatternExtractor] 使用execMethodProcess: ${patternKey}`);
        
        // ResetRegular expressionStatus
        regex.lastIndex = 0;
        let match;
        let matchCount = 0;
        let lastIndex = -1;
        
        while ((match = regex.exec(content)) !== null) {
            const matchedText = match[1] || match[0];
            if (matchedText && matchedText.trim()) {
                const trimmedText = matchedText.trim();
                
                // 🔥 特殊Process：FilterAbsolute pathAPI中包含Protocol的Content
                if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                    //console.log(`🚫 [PatternExtractor] Absolute pathAPI包含Protocol，AlreadyFilter: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊Process：FilterAbsolute pathAPI中的静态File
                if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] Absolute pathAPI为静态File，AlreadyFilter: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊Process：FilterDomain黑名单
                if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] Domain在黑名单中，AlreadyFilter: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                // 🔥 新增特殊Process：Filter包含FilterContentType的Content
                if (this.containsFilteredContentType(trimmedText)) {
                    //console.log(`🚫 [PatternExtractor] ${patternKey} 包含FilterContentType，AlreadyFilter: "${trimmedText}"`);
                    matchCount++;
                    continue;
                }
                
                results[resultKey].add(trimmedText);
                matchCount++;
                //console.log(`✅ [PatternExtractor] ${patternKey} Match到 ${matchCount}: "${trimmedText}"`);
            }
            
            // 防止None限循环 - 特别针对负向断言
            if (matchCount > 1000) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} Match次数过多，停止Match`);
                break;
            }
            
            // Check是否陷入None限循环
            if (regex.lastIndex === lastIndex) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} Detect到None限循环，强制推进`);
                regex.lastIndex = lastIndex + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
            lastIndex = regex.lastIndex;
            
            // 对于非全局正则Or者lastIndex为0的情况，手动推进
            if (!regex.global || regex.lastIndex === 0) {
                console.warn(`⚠️ [PatternExtractor] ${patternKey} 非全局正则OrlastIndex为0，手动推进`);
                regex.lastIndex = match.index + 1;
                if (regex.lastIndex >= content.length) {
                    break;
                }
            }
        }
        
        //console.log(`📊 [PatternExtractor] ${patternKey} execMethodExtraction completed，共Found ${matchCount} 个`);
    }
    
    // 专门的APIExtractMethod
    extractAPIs(content, results) {
        //console.log('🔍 [PatternExtractor] StartExtractAPI...');
        //console.log('🔍 [PatternExtractor] CurrentpatternsObject:', Object.keys(this.patterns));
        //console.log('🔍 [PatternExtractor] absoluteApiConfiguration:', this.patterns.absoluteApi);
        //console.log('🔍 [PatternExtractor] relativeApiConfiguration:', this.patterns.relativeApi);
        
        // Check是否有API正则Configuration
        if (!this.patterns.absoluteApi && !this.patterns.relativeApi) {
            console.warn('⚠️ [PatternExtractor] NotConfigurationAPIRegular expression，跳过APIExtract');
            console.warn('⚠️ [PatternExtractor] absoluteApi存在:', !!this.patterns.absoluteApi);
            console.warn('⚠️ [PatternExtractor] relativeApi存在:', !!this.patterns.relativeApi);
            return;
        }
        
        // RemoveContent大小限制，ProcessCompleteContent
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] ProcessContent大小: ${processContent.length} 字符`);
        //console.log(`📊 [PatternExtractor] Content预览: ${processContent.substring(0, 200)}...`);
        
        // ExtractAbsolute pathAPI - Fix：支持RegExpObject
        if (this.patterns.absoluteApi) {
            //console.log(`🔍 [PatternExtractor] StartExtractAbsolute pathAPI`);
            //console.log(`🔍 [PatternExtractor] Absolute pathAPI正则Type: ${typeof this.patterns.absoluteApi}`);
            //console.log(`🔍 [PatternExtractor] Absolute pathAPI正则Content: ${this.patterns.absoluteApi.source || this.patterns.absoluteApi}`);
            
            let absoluteApiCount = 0;
            const regex = this.patterns.absoluteApi;
            
            // ResetRegular expressionStatus
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] Absolute pathAPIMatch到: "${api}"`);
                if (api && api.trim()) {
                    const trimmedApi = api.trim();
                    // 🔥 Add校验：Filter掉包含http://Orhttps://的Absolute pathAPI
                    if (trimmedApi.includes('http://') || trimmedApi.includes('https://')) {
                        //console.log(`🚫 [PatternExtractor] Absolute pathAPI包含Protocol，AlreadyFilter: "${trimmedApi}"`);
                    }
                    // 🔥 新增校验：Filter掉静态File（如.jpg, .png, .css, etc.）
                    else if (this.isStaticFile(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] Absolute pathAPI为静态File，AlreadyFilter: "${trimmedApi}"`);
                    }
                    // 🔥 新增校验：Filter掉包含FilterContentType的API
                    else if (this.containsFilteredContentType(trimmedApi)) {
                        //console.log(`🚫 [PatternExtractor] Absolute pathAPI包含FilterContentType，AlreadyFilter: "${trimmedApi}"`);
                    } else {
                        results.absoluteApis.add(trimmedApi);
                        absoluteApiCount++;
                        //console.log(`✅ [PatternExtractor] Absolute pathAPIAdd: "${trimmedApi}"`);
                    }
                    matchCount++;
                }
                
                // 防止None限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] Absolute pathAPIMatch次数过多，停止Match`);
                    break;
                }
                
                // Check是否陷入None限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] Absolute pathAPIDetect到None限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] Absolute pathAPIExtraction completed，共Found ${absoluteApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] Absolute pathAPIConfigurationis empty');
        }
        
        // ExtractRelative pathAPI - Fix：支持RegExpObject
        if (this.patterns.relativeApi) {
            //console.log(`🔍 [PatternExtractor] StartExtractRelative pathAPI`);
            //console.log(`🔍 [PatternExtractor] Relative pathAPI正则Type: ${typeof this.patterns.relativeApi}`);
            //console.log(`🔍 [PatternExtractor] Relative pathAPI正则Content: ${this.patterns.relativeApi.source || this.patterns.relativeApi}`);
            
            let relativeApiCount = 0;
            const regex = this.patterns.relativeApi;
            
            // ResetRegular expressionStatus
            regex.lastIndex = 0;
            let match;
            let matchCount = 0;
            
            while ((match = regex.exec(processContent)) !== null) {
                const api = match[1] || match[0];
                //console.log(`🎯 [PatternExtractor] Relative pathAPIMatch到: "${api}"`);
                if (api && api.trim()) {
                    // 🔥 新增：ProcessRelative pathAPI，去除开Header的"."符号但保留"/"
                    const processedApi = this.processRelativeApi(api.trim());
                    
                    // 🔥 新增特殊Process：FilterRelative pathAPI中的静态File（应用Absolute pathAPI的FilterPattern）
                    if (this.isStaticFile(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] Relative pathAPI为静态File，AlreadyFilter: "${processedApi}"`);
                    }
                    // 🔥 新增特殊Process：FilterRelative pathAPI中包含FilterContentType的API
                    else if (this.containsFilteredContentType(processedApi)) {
                        //console.log(`🚫 [PatternExtractor] Relative pathAPI包含FilterContentType，AlreadyFilter: "${processedApi}"`);
                    } else {
                        results.relativeApis.add(processedApi);
                        relativeApiCount++;
                        //console.log(`✅ [PatternExtractor] Relative pathAPIProcessAfterAdd: "${processedApi}" (原始: "${api.trim()}")`);
                    }
                    matchCount++;
                }
                
                // 防止None限循环
                if (matchCount > 1000) {
                    console.warn(`⚠️ [PatternExtractor] Relative pathAPIMatch次数过多，停止Match`);
                    break;
                }
                
                // Check是否陷入None限循环
                if (regex.lastIndex === match.index) {
                    console.warn(`⚠️ [PatternExtractor] Relative pathAPIDetect到None限循环，强制推进`);
                    regex.lastIndex = match.index + 1;
                    if (regex.lastIndex >= processContent.length) {
                        break;
                    }
                }
            }
            
            //console.log(`✅ [PatternExtractor] Relative pathAPIExtraction completed，共Found ${relativeApiCount} 个API`);
        } else {
            console.warn('⚠️ [PatternExtractor] Relative pathAPIConfigurationis empty');
        }
        
        //console.log(`📊 [PatternExtractor] APIExtract总结 - Absolute path: ${results.absoluteApis.size}, Relative path: ${results.relativeApis.size}`);
    }
    
    // Extract其他Resource
    extractOtherResources(content, results, sourceUrl = '') {
        //console.log('📁 [PatternExtractor] StartExtract其他Resource...');
        
        // RemoveContent大小限制，ProcessCompleteContent
        const processContent = content;
        
        //console.log(`📊 [PatternExtractor] 其他ResourceProcessContent大小: ${processContent.length} 字符`);
        //console.log(`🌐 [PatternExtractor] CurrentProcess的URL: ${sourceUrl}`);
        
        // ExtractJSFile
        if (this.patterns.jsFile) {
            //console.log('🔍 [PatternExtractor] StartExtractJSFile...');
            this.patterns.jsFile.lastIndex = 0;
            let match;
            let jsFileCount = 0;
            while ((match = this.patterns.jsFile.exec(processContent)) !== null) {
                const jsFile = match[1] || match[2] || match[3] || match[4];
                if (jsFile) {
                    const cleanJsFile = jsFile.replace(/["'`]/g, '').trim();
                    results.jsFiles.add(cleanJsFile);
                    jsFileCount++;
                    //console.log(`✅ [PatternExtractor] JSFileAdd: "${cleanJsFile}"`);
                }
            }
            //console.log(`📊 [PatternExtractor] JSFileExtraction completed，共Found ${jsFileCount} 个`);
        }
        
        // ExtractCSSFile
        if (this.patterns.cssFile) {
            //console.log('🔍 [PatternExtractor] StartExtractCSSFile...');
            this.patterns.cssFile.lastIndex = 0;
            let match;
            let cssFileCount = 0;
            while ((match = this.patterns.cssFile.exec(processContent)) !== null) {
                const cssFile = match[1];
                if (cssFile) {
                    const cleanCssFile = cssFile.replace(/["'`]/g, '').trim();
                    // 🔥 应用Filter：Check是否包含FilterContentType
                    if (!this.containsFilteredContentType(cleanCssFile)) {
                        results.cssFiles.add(cleanCssFile);
                        cssFileCount++;
                        //console.log(`✅ [PatternExtractor] CSSFileAdd: "${cleanCssFile}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] CSSFile包含FilterContentType，AlreadyFilter: "${cleanCssFile}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] CSSFileExtraction completed，共Found ${cssFileCount} 个`);
        }
        
        // Extract图片
        if (this.patterns.image) {
            //console.log('🔍 [PatternExtractor] StartExtract图片...');
            this.patterns.image.lastIndex = 0;
            let match;
            let imageCount = 0;
            while ((match = this.patterns.image.exec(processContent)) !== null) {
                const image = match[1];
                if (image) {
                    const cleanImage = image.replace(/["'`]/g, '').trim();
                    // 🔥 应用Filter：Check是否包含FilterContentType
                    if (!this.containsFilteredContentType(cleanImage)) {
                        results.images.add(cleanImage);
                        imageCount++;
                        //console.log(`✅ [PatternExtractor] 图片Add: "${cleanImage}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] 图片包含FilterContentType，AlreadyFilter: "${cleanImage}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] 图片Extraction completed，共Found ${imageCount} 个`);
        }
        
        // ExtractURL
        if (this.patterns.url) {
            //console.log('🔍 [PatternExtractor] StartExtractURL...');
            this.patterns.url.lastIndex = 0;
            let match;
            let urlCount = 0;
            while ((match = this.patterns.url.exec(processContent)) !== null) {
                const url = match[0];
                if (url) {
                    // 🔥 应用Filter：Check是否包含FilterContentType
                    if (!this.containsFilteredContentType(url)) {
                        results.urls.add(url);
                        urlCount++;
                        //console.log(`✅ [PatternExtractor] URLAdd: "${url}"`);
                    } else {
                        //console.log(`🚫 [PatternExtractor] URL包含FilterContentType，AlreadyFilter: "${url}"`);
                    }
                }
            }
            //console.log(`📊 [PatternExtractor] URLExtraction completed，共Found ${urlCount} 个`);
        }
        
        //console.log('✅ [PatternExtractor] 其他ResourceExtraction completed');
    }
    
    /**
     * Extract动态Custom正则Pattern - Unified化版本
     */
    async extractDynamicCustomPatterns(content, results) {
        try {
            //console.log('🔄 [PatternExtractor] StartExtract动态Custom正则Pattern...');
            
            // EnsureCustomConfigurationLoaded
            await this.ensureCustomPatternsLoaded();
            
            // GetCurrent的Custom正则Configuration
            const storageResult = await chrome.storage.local.get(['customRegexConfigs']);
            
            if (!storageResult.customRegexConfigs) {
                //console.log('ℹ️ [PatternExtractor] Not found动态Custom正则Configuration');
                return;
            }
            
            //console.log('📊 [PatternExtractor] Current动态Custom正则Configuration:', storageResult.customRegexConfigs);
            
            let configsToProcess = [];
            
            // Check存储Format：ObjectFormat还是数GroupFormat
            if (Array.isArray(storageResult.customRegexConfigs)) {
                // 数GroupFormat
                configsToProcess = storageResult.customRegexConfigs;
                //console.log('📋 [PatternExtractor] Detect到数GroupFormat的Custom正则Configuration');
            } else if (typeof storageResult.customRegexConfigs === 'object') {
                // ObjectFormat，Convert为数Group
                configsToProcess = Object.entries(storageResult.customRegexConfigs).map(([key, config]) => ({
                    key: `custom_${key}`, // Add custom_ Before缀
                    name: config.name,
                    pattern: config.pattern,
                    createdAt: config.createdAt
                }));
                //console.log('📋 [PatternExtractor] Detect到ObjectFormat的Custom正则Configuration，AlreadyConvert为数GroupFormat');
            }
            
            if (configsToProcess.length === 0) {
                //console.log('ℹ️ [PatternExtractor] 动态Custom正则Configurationis empty');
                return;
            }
            
            // RemoveContent大小限制，ProcessCompleteContent
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] 动态Custom正则ProcessContent大小: ${processContent.length} 字符`);
            
            // ProcessEvery个Custom正则Configuration
            configsToProcess.forEach((config, index) => {
                try {
                    if (!config.key || !config.pattern || !config.name) {
                        console.warn(`⚠️ [PatternExtractor] 跳过Invalid的Custom正则Configuration ${index + 1}:`, config);
                        return;
                    }
                    
                    //console.log(`🔍 [PatternExtractor] ProcessCustom正则 ${index + 1}: ${config.name} (${config.key})`);
                    //console.log(`📝 [PatternExtractor] 正则Pattern: ${config.pattern}`);
                    
                    // CreateRegular expression
                    const regex = new RegExp(config.pattern, 'g');
                    
                    // Ensureresults中有对应的Set
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`📦 [PatternExtractor] 为Custom正则 ${config.key} CreateResult集合`);
                    }
                    
                    //console.log(`🔍 [PatternExtractor] Start在Content中MatchCustom正则 ${config.key}...`);
                    //console.log(`📊 [PatternExtractor] PendingMatchContent长度: ${processContent.length} 字符`);
                    
                    // First在小样本上TestRegular expression
                    const testContent = processContent.substring(0, 1000);
                    //console.log(`🧪 [PatternExtractor] TestCustom正则 ${config.key} 在小样本上的Match...`);
                    const testRegex = new RegExp(config.pattern, 'g');
                    let testMatch;
                    let testCount = 0;
                    while ((testMatch = testRegex.exec(testContent)) !== null && testCount < 5) {
                        //console.log(`🎯 [PatternExtractor] TestMatch ${testCount + 1}: "${testMatch[0]}"`);
                        testCount++;
                    }
                    //console.log(`📊 [PatternExtractor] 小样本TestComplete，Match到 ${testCount} 个Result`);
                    
                    // ExecuteCompleteMatch
                    let match;
                    let matchCount = 0;
                    regex.lastIndex = 0; // ResetRegular expressionStatus
                    
                    //console.log(`🔍 [PatternExtractor] StartCompleteContentMatch...`);
                    while ((match = regex.exec(processContent)) !== null) {
                        const matchedText = match[0];
                        if (matchedText && matchedText.trim()) {
                            results[config.key].add(matchedText.trim());
                            matchCount++;
                            //console.log(`✅ [PatternExtractor] Custom正则 ${config.key} Match到 ${matchCount}: "${matchedText.trim()}"`);
                        }
                        
                        // 防止None限循环
                        if (matchCount > 1000) {
                            console.warn(`⚠️ [PatternExtractor] Custom正则 ${config.key} Match次数过多，停止Match`);
                            break;
                        }
                        
                        // 防止Regular expressionNone限循环
                        if (regex.lastIndex === match.index) {
                            console.warn(`⚠️ [PatternExtractor] Custom正则 ${config.key} Detect到None限循环，停止Match`);
                            break;
                        }
                    }
                    
                    //console.log(`📊 [PatternExtractor] Custom正则 ${config.key} MatchComplete，共Found ${matchCount} 个Result`);
                    //console.log(`📦 [PatternExtractor] Custom正则 ${config.key} Result集合大小: ${results[config.key].size}`);
                    
                    // ValidateResult是否正确Add到resultsObject中
                    if (results[config.key].size > 0) {
                        //console.log(`✅ [PatternExtractor] Custom正则 ${config.key} ResultAlreadySuccessAdd到resultsObject`);
                        //console.log(`🎯 [PatternExtractor] Custom正则 ${config.key} Result预览:`, Array.from(results[config.key]).slice(0, 3));
                    } else {
                        //console.log(`ℹ️ [PatternExtractor] Custom正则 ${config.key} NotMatch到任何Result`);
                        // 如果NoMatch到Result，仍然保留Empty的Set，EnsureKey存在
                        //console.log(`🔧 [PatternExtractor] 保留Empty的Result集合以EnsureKey ${config.key} 存在`);
                    }
                    
                } catch (error) {
                    console.error(`❌ [PatternExtractor] Custom正则Configuration ${index + 1} ProcessFailed:`, error, config);
                    // 即使出错也要EnsureKey存在
                    if (!results[config.key]) {
                        results[config.key] = new Set();
                        //console.log(`🔧 [PatternExtractor] 为出错的Custom正则 ${config.key} CreateEmptyResult集合`);
                    }
                }
            });
            
            //console.log('✅ [PatternExtractor] 动态Custom正则PatternExtraction completed');
            
        } catch (error) {
            console.error('❌ [PatternExtractor] Extract动态Custom正则PatternFailed:', error);
        }
    }
    
    /**
     * Extract所有Pattern - Unified化版本，Only使用Settings界面Configuration
     */
    async extractPatterns(content, sourceUrl = '') {
        try {
            //console.log('🚀🚀🚀 [PatternExtractor] Unified化版本StartExtractPattern - 强制日志！');
            //console.log(`📊 [PatternExtractor] Content长度: ${content.length} 字符`);
            //console.log(`🌐 [PatternExtractor] SourceURL: ${sourceUrl}`);
            //console.log('🔍🔍🔍 [PatternExtractor] ThisMethodBy调用了！');
            
            // EnsureCustomConfigurationLoaded
            await this.ensureCustomPatternsLoaded();
            
            // InitializeResultObject，使用Set避免重复 - Fix：使用正确的Key名
            const results = {
                // APIRelated
                absoluteApis: new Set(),
                relativeApis: new Set(),
                
                // ResourceFile
                jsFiles: new Set(),
                cssFiles: new Set(),
                images: new Set(),
                urls: new Set(),
                
                // 敏感Information - Fix：使用与DisplayManager一致的Key名
                domains: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(), // Fix：fromphones改为phoneNumbers
                credentials: new Set(),
                ipAddresses: new Set(), // Fix：fromips改为ipAddresses
                paths: new Set(),
                jwts: new Set(),
                githubUrls: new Set(), // Fix：fromgithubs改为githubUrls
                vueFiles: new Set(), // Fix：fromvues改为vueFiles
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
            
            //console.log('📦 [PatternExtractor] ResultObjectInitializeComplete');
            //console.log('📊 [PatternExtractor] CurrentAvailable的正则Pattern:', Object.keys(this.patterns));
            
            // RemoveContent大小限制，ProcessCompleteContent
            const processContent = content;
            
            //console.log(`📊 [PatternExtractor] 实际ProcessContent大小: ${processContent.length} 字符`);
            
            // 1. ExtractAPI（特殊Process，因为可能有多个正则）
            this.extractAPIs(processContent, results);
            
            // 2. Extract其他ResourceFile
            this.extractOtherResources(processContent, results, sourceUrl);
            
            // 3. Extract其他Pattern（使用Settings界面Configuration的正则） - Fix：使用正确的Key名映射
            const patternMappings = {
                domain: 'domains',
                email: 'emails', 
                phone: 'phoneNumbers', // Fix：fromphones改为phoneNumbers
                credentials: 'credentials',
                ip: 'ipAddresses', // Fix：fromips改为ipAddresses
                paths: 'paths',
                jwt: 'jwts',
                github: 'githubUrls', // Fix：fromgithubs改为githubUrls
                vue: 'vueFiles', // Fix：fromvues改为vueFiles
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
            
            //console.log('🔍 [PatternExtractor] StartExtract其他Pattern...');
            
            Object.entries(patternMappings).forEach(([patternKey, resultKey]) => {
                if (this.patterns[patternKey]) {
                    //console.log(`🔍 [PatternExtractor] Extract ${patternKey} -> ${resultKey}`);
                    //console.log(`📝 [PatternExtractor] 使用正则: ${this.patterns[patternKey].source}`);
                    
                    // Fix：针对负向断言的特殊Process
                    const regex = this.patterns[patternKey];
                    const regexSource = regex.source;
                    const hasLookbehind = regexSource.includes('(?<!') || regexSource.includes('(?<=');
                    const hasLookahead = regexSource.includes('(?!') || regexSource.includes('(?=');
                    
                    if (hasLookbehind || hasLookahead) {
                        //console.log(`🔧 [PatternExtractor] Detect到负向断言，使用特殊Process: ${patternKey}`);
                        
                        // 对于包含负向断言的正则，使用 matchAll Method
                        try {
                            const matches = [...processContent.matchAll(regex)];
                            //console.log(`📊 [PatternExtractor] ${patternKey} 使用matchAllFound ${matches.length} 个Match`);
                            
                            matches.forEach((match, index) => {
                                const matchedText = match[1] || match[0];
                                if (matchedText && matchedText.trim()) {
                                    const trimmedText = matchedText.trim();
                                    
                                    // 🔥 特殊Process：FilterAbsolute pathAPI中包含Protocol的Content
                                    if (patternKey === 'absoluteApi' && (trimmedText.includes('http://') || trimmedText.includes('https://'))) {
                                        //console.log(`🚫 [PatternExtractor] Absolute pathAPI包含Protocol，AlreadyFilter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊Process：FilterAbsolute pathAPI中的静态File
                                    if (patternKey === 'absoluteApi' && this.isStaticFile(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] Absolute pathAPI为静态File，AlreadyFilter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊Process：FilterDomain黑名单
                                    if (patternKey === 'domain' && this.isDomainBlacklisted(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] Domain在黑名单中，AlreadyFilter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    // 🔥 新增特殊Process：Filter包含FilterContentType的Content
                                    if (this.containsFilteredContentType(trimmedText)) {
                                        //console.log(`🚫 [PatternExtractor] ${patternKey} 包含FilterContentType，AlreadyFilter: "${trimmedText}"`);
                                        return;
                                    }
                                    
                                    results[resultKey].add(trimmedText);
                                    //console.log(`✅ [PatternExtractor] ${patternKey} Match到 ${index + 1}: "${trimmedText}"`);
                                }
                            });
                            
                            //console.log(`📊 [PatternExtractor] ${patternKey} Extraction completed，共Found ${matches.length} 个`);
                        } catch (error) {
                            console.error(`❌ [PatternExtractor] ${patternKey} matchAllFailed，回退到execMethod:`, error);
                            // 回退到原来的execMethod
                            this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                        }
                    } else {
                        // 对于普通正则，使用原来的execMethod
                        this.executeRegexWithExec(regex, processContent, results, resultKey, patternKey);
                    }
                } else {
                    //console.log(`⚠️ [PatternExtractor] 跳过NotConfiguration的Pattern: ${patternKey}`);
                }
            });
            
            
            // 4. Extract动态Custom正则Pattern - Fix：Direct使用Loaded的patterns
            //console.log('🔍 [PatternExtractor] StartExtract动态Custom正则Pattern...');
            //console.log('🔍 [PatternExtractor] Currentthis.patterns的所有Key:', Object.keys(this.patterns));
            
            // Find所有Custom正则Pattern
            const customPatternKeys = Object.keys(this.patterns).filter(key => key.startsWith('custom_'));
            //console.log(`📊 [PatternExtractor] Found ${customPatternKeys.length} 个Custom正则Pattern:`, customPatternKeys);
            //console.log(`🔍 [PatternExtractor] Custom正则Pattern详情:`, customPatternKeys.map(key => ({
            //    key,
            //    regex: this.patterns[key] ? this.patterns[key].source : 'null',
            //    type: typeof this.patterns[key]
            //})));
            
            if (customPatternKeys.length > 0) {
                customPatternKeys.forEach(patternKey => {
                    try {
                        //console.log(`🔍 [PatternExtractor] ProcessCustom正则: ${patternKey}`);
                        
                        const regex = this.patterns[patternKey];
                        if (!regex) {
                            console.warn(`⚠️ [PatternExtractor] Custom正则 ${patternKey} Not found对应的Regular expression`);
                            return;
                        }
                        
                        // Ensureresults中有对应的Set
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`📦 [PatternExtractor] 为Custom正则 ${patternKey} CreateResult集合`);
                        }
                        
                        //console.log(`🔍 [PatternExtractor] StartMatchCustom正则 ${patternKey}...`);
                        //console.log(`📝 [PatternExtractor] Regular expression: ${regex.source}`);
                        
                        // ResetRegular expressionStatus
                        regex.lastIndex = 0;
                        
                        let match;
                        let matchCount = 0;
                        
                        while ((match = regex.exec(processContent)) !== null) {
                            const matchedText = match[0];
                            if (matchedText && matchedText.trim()) {
                                const trimmedText = matchedText.trim();
                                
                                // 🔥 应用Filter：Check是否包含FilterContentType
                                if (!this.containsFilteredContentType(trimmedText)) {
                                    results[patternKey].add(trimmedText);
                                    matchCount++;
                                    //console.log(`✅ [PatternExtractor] Custom正则 ${patternKey} Match到 ${matchCount}: "${trimmedText}"`);
                                } else {
                                    //console.log(`🚫 [PatternExtractor] Custom正则 ${patternKey} 包含FilterContentType，AlreadyFilter: "${trimmedText}"`);
                                }
                            }
                            
                            // 防止None限循环
                            if (matchCount > 1000) {
                                console.warn(`⚠️ [PatternExtractor] Custom正则 ${patternKey} Match次数过多，停止Match`);
                                break;
                            }
                            
                            // 防止Regular expressionNone限循环
                            if (regex.lastIndex === match.index) {
                                console.warn(`⚠️ [PatternExtractor] Custom正则 ${patternKey} Detect到None限循环，停止Match`);
                                break;
                            }
                        }
                        
                        //console.log(`📊 [PatternExtractor] Custom正则 ${patternKey} MatchComplete，共Found ${matchCount} 个Result`);
                        //console.log(`📦 [PatternExtractor] Custom正则 ${patternKey} Result集合大小: ${results[patternKey].size}`);
                        
                        if (results[patternKey].size > 0) {
                            //console.log(`✅ [PatternExtractor] Custom正则 ${patternKey} Result预览:`, Array.from(results[patternKey]).slice(0, 3));
                        } else {
                            //console.log(`ℹ️ [PatternExtractor] Custom正则 ${patternKey} NotMatch到任何Result`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ [PatternExtractor] Custom正则 ${patternKey} ProcessFailed:`, error);
                        // 即使出错也要EnsureKey存在
                        if (!results[patternKey]) {
                            results[patternKey] = new Set();
                            //console.log(`🔧 [PatternExtractor] 为出错的Custom正则 ${patternKey} CreateEmptyResult集合`);
                        }
                    }
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] NotFoundCustom正则Pattern');
            }
            
            //console.log('🔍 [PatternExtractor] 动态Custom正则PatternExtraction completed，CurrentresultsKey:', Object.keys(results));
            
            // 5. 特殊Process身份证Validate
            if (results.idCards.size > 0) {
                //console.log(`🔍 [PatternExtractor] StartValidate身份证，共 ${results.idCards.size} 个`);
                const validatedIdCards = this.validateIdCards(Array.from(results.idCards));
                results.idCards = new Set(validatedIdCards);
                //console.log(`✅ [PatternExtractor] 身份证ValidateComplete，Valid身份证 ${results.idCards.size} 个`);
            }
            
            // 6. ConvertSet为ArrayAndAddSourceURLInformation，包括所有动态Create的Key
            const finalResults = {};
            
            //console.log('🔍 [PatternExtractor] StartConvertResultAndAddSourceURLInformation，CurrentresultsObject的所有Key:', Object.keys(results));
            
            // Fix：Traverse所有Key，包括动态Create的Custom正则Key，And为Every个ProjectAddSourceURL
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 将SetConvert为包含SourceURLInformation的Object数Group
                    finalResults[key] = [...value].map(item => {
                        // 🔥 Fix：Checkitem是否Already经是包含sourceUrl的Object
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            // 如果Already经是ObjectFormat，Ensure包含所有必要字段
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || sourceUrl,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            // 如果是字符串，Convert为ObjectFormat
                            return {
                                value: item,
                                sourceUrl: sourceUrl,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                    
                    //console.log(`🔄 [PatternExtractor] Convert ${key}: Set(${value.size}) -> Array(${finalResults[key].length}) AndAddSourceURL`);
                    if (finalResults[key].length > 0) {
                        //console.log(`📊 [PatternExtractor] ${key}: ${finalResults[key].length} 个Result，SourceURL: ${sourceUrl}`);
                        // 如果是Custom正则Result，Display更详细的Information
                        if (key.startsWith('custom_')) {
                            //console.log(`🎯 [PatternExtractor] Custom正则 ${key} Result预览:`, finalResults[key].slice(0, 3));
                        }
                    } else if (key.startsWith('custom_')) {
                        // 即使是Empty的Custom正则Result，也要保留在最终Result中
                        //console.log(`📦 [PatternExtractor] 保留Empty的Custom正则Key ${key}`);
                    }
                } else if (value) {
                    // 对于非SetType的值，也AddSourceURLInformation
                    if (Array.isArray(value)) {
                        finalResults[key] = value.map(item => {
                            // 🔥 Fix：Checkitem是否Already经是包含sourceUrl的Object
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
                        // 🔥 Fix：Single值也要Convert为ObjectFormat
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
                    //console.log(`🔄 [PatternExtractor] DirectCopyAndAddSourceURL ${key}:`, typeof value);
                } else {
                    // Empty值保持is empty数Group
                    finalResults[key] = [];
                }
            }
            
            // Validate所有Custom正则Key都By正确Process
            const customKeys = Object.keys(results).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ [PatternExtractor] FoundAndProcess了 ${customKeys.length} 个Custom正则Key:`, customKeys);
                customKeys.forEach(key => {
                    //console.log(`✅ [PatternExtractor] Custom正则Key ${key} Already正确Convert: ${finalResults[key].length} 个Result`);
                });
            } else {
                //console.log('ℹ️ [PatternExtractor] NotFoundCustom正则Key');
            }
            
            //console.log('✅ [PatternExtractor] Unified化版本PatternExtraction completed');
            //console.log('📊 [PatternExtractor] 最终ResultKey:', Object.keys(finalResults));
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ [PatternExtractor] ExtractPatternFailed:', error);
            return {};
        }
    }
}

// ExportClass
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternExtractor;
} else if (typeof window !== 'undefined') {
    window.PatternExtractor = PatternExtractor;
}
