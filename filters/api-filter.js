class APIFilter {
    constructor() {
        this.regexCache = this.initRegexCache();
        this.config = this.initConfig();
        // InitializeDomainAnd手机号Filter
        this.domainPhoneFilter = window.domainPhoneFilter || new DomainPhoneFilter();
    }
    
    initRegexCache() {
        return {
            // BasicPattern缓存
            coordPattern: /^coord/,
            valuePattern: /^\/|true|false|register|signUp|name|basic|http/i,
            chinesePattern: /^[\u4e00-\u9fa5]+$/,
            keywordPattern: /^func|variable|input|true|false|newline|null|http|unexpected|error|data|object|brac|beare|str|self|void|num|atom|opts|token|params|result|con|text|stor|sup|pun|emp|this|key|com|ent|met|opera|return|case|pare|ident|reg|invalid/i,
            camelCasePattern: /\b[_a-z]+(?:[A-Z][a-z]+)+\b/,
            
            // FileTypePattern
            fontPattern: /\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i,
            imagePattern: /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff)(\?.*)?$/i,
            jsPattern: /\.(js|jsx|ts|tsx|vue|mjs|cjs)(\?.*)?$/i,
            cssPattern: /\.(css|scss|sass|less|styl)(\?.*)?$/i,
            docPattern: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)(\?.*)?$/i,
            audioPattern: /\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?.*)?$/i,
            videoPattern: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?.*)?$/i,
            
            // API识别Pattern
            apiPathPattern: /^\/(?:api|admin|manage|backend|service|rest|graphql|v\d+)\//,
            dynamicApiPattern: /\.(php|asp|aspx|jsp|do|action)(\?.*)?$/i,
            queryApiPattern: /\?[^#\s]+/,
            
            // 模块PathPattern
            relativeModulePattern: /^\.{1,2}\//,
            nodeModulePattern: /node_modules/,
            
            // FilterPattern
            staticResourcePattern: /^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/,
            shortPathPattern: /^.{1,4}$/,
            invalidCharsPattern: /[A-Z\.\/\#\+\?23]/,
            
            // 增强的DomainAnd手机号Pattern
            domainPattern: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/i,
            cnMobilePattern: /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/,
            intlMobilePattern: /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,14}(?!\d)/,
            emailPattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        };
    }
    
    initConfig() {
        return {
            // ByFilter的ContentType
            filteredContentTypes: [
                'text/css', 'text/javascript', 'application/javascript',
                'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
                'font/woff', 'font/woff2', 'application/font-woff',
                'audio/mpeg', 'video/mp4', 'application/octet-stream'
            ],
            
            // 最小Path长度
            minPathLength: 2,
            maxPathLength: 500,
            
            // API Keywords
            apiKeywords: [
                'api', 'admin', 'manage', 'backend', 'service', 'rest', 
                'graphql', 'ajax', 'json', 'xml', 'data', 'query',
                'search', 'upload', 'download', 'export', 'import'
            ],
            
            // 排除的PathBefore缀
            excludedPrefixes: [
                'chrome-extension://', 'moz-extension://', 'about:',
                'data:', 'javascript:', 'mailto:', 'tel:', 'ftp:'
            ],
            
            // Invalid的DomainAfter缀（通常是ResourceFileExtension名）
            invalidDomainSuffixes: new Set([
                'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 
                'ttf', 'eot', 'mp3', 'mp4', 'webm', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 
                'pptx', 'zip', 'rar', 'tar', 'gz', '7z', 'exe', 'dll', 'bin', 'iso', 'dmg', 'apk',
                'ts', 'jsx', 'vue', 'scss', 'less', 'sass', 'json', 'xml', 'csv', 'md', 'txt',
                'log', 'bak', 'tmp', 'temp', 'swf', 'flv', 'avi', 'mov', 'wmv', 'mkv'
            ])
        };
    }
    
    /**
     * 主要的APIFilterFunction
     * @param {string} match - Match到的Path
     * @param {Object} resultsSet - Result集合
     * @returns {boolean} - 是否应该保留此Path
     */
    filterAPI(match, resultsSet) {
        // Remove引号
        const cleanPath = this.cleanPath(match);
        if (!cleanPath) return false;
        
        // BasicValidate
        if (!this.isValidPath(cleanPath)) return false;
        
        // 字体FileFilter
        if (this.regexCache.fontPattern.test(cleanPath)) {
            return false;
        }
        
        // FileTypeCategory
        if (this.classifyFileType(cleanPath, resultsSet)) {
            return true;
        }
        
        // ContentTypeFilter
        if (this.isFilteredContentType(cleanPath)) {
            return false;
        }
        
        // PathCategoryAndProcess
        return this.classifyAndProcessPath(cleanPath, resultsSet);
    }
    
    /**
     * CleanPath字符串
     */
    cleanPath(path) {
        if (!path || typeof path !== 'string') return null;
        
        // Remove首尾引号
        let cleaned = path.replace(/^['"`]|['"`]$/g, '');
        
        // Check排除的Before缀
        if (this.config.excludedPrefixes.some(prefix => cleaned.startsWith(prefix))) {
            return null;
        }
        
        // 长度Check
        if (cleaned.length < this.config.minPathLength || 
            cleaned.length > this.config.maxPathLength) {
            return null;
        }
        
        return cleaned;
    }
    
    /**
     * ValidatePathValid性
     */
    isValidPath(path) {
        // EmptyPathCheck
        if (!path || path.trim() === '') return false;
        
        // 特殊字符Check（针对短Path）
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // 静态ResourceBefore缀Check
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * FileTypeCategory
     */
    classifyFileType(path, resultsSet) {
        const classifications = [
            { pattern: this.regexCache.imagePattern, set: 'imageFiles' },
            { pattern: this.regexCache.jsPattern, set: 'jsFiles' },
            { pattern: this.regexCache.cssPattern, set: 'cssFiles' },
            { pattern: this.regexCache.docPattern, set: 'docFiles' },
            { pattern: this.regexCache.audioPattern, set: 'audioFiles' },
            { pattern: this.regexCache.videoPattern, set: 'videoFiles' }
        ];
        
        for (const { pattern, set } of classifications) {
            if (pattern.test(path)) {
                resultsSet?.[set]?.add(path);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 是否为静态Resource（根据Extension名判断）
     */
    isStaticResource(path) {
        return this.regexCache.imagePattern.test(path) ||
               this.regexCache.jsPattern.test(path) ||
               this.regexCache.cssPattern.test(path) ||
               this.regexCache.docPattern.test(path) ||
               this.regexCache.audioPattern.test(path) ||
               this.regexCache.videoPattern.test(path) ||
               this.regexCache.fontPattern.test(path);
    }
    
    /**
     * Check是否为ByFilter的ContentType
     */
    isFilteredContentType(path) {
        const lowerPath = path.toLowerCase();
        return this.config.filteredContentTypes.some(type => 
            lowerPath.includes(type.toLowerCase())
        );
    }
    
    /**
     * PathCategoryAndProcess
     */
    classifyAndProcessPath(path, resultsSet) {
        // VueFile特殊Process
        if (path.endsWith('.vue')) {
            resultsSet?.vueFiles?.add(path);
            return true;
        }
        
        // 模块PathProcess
        if (this.isModulePath(path)) {
            resultsSet?.moduleFiles?.add(path);
            return true;
        }
        
        // Absolute pathProcess
        if (path.startsWith('/')) {
            return this.processAbsolutePath(path, resultsSet);
        }
        
        // Relative pathProcess
        return this.processRelativePath(path, resultsSet);
    }
    
    /**
     * 模块PathCheck
     */
    isModulePath(path) {
        return this.regexCache.relativeModulePattern.test(path) ||
               this.regexCache.nodeModulePattern.test(path);
    }
    
    /**
     * ProcessAbsolute path
     */
    processAbsolutePath(path, resultsSet) {
        // 短PathFilter
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // 静态ResourceDirectCategory为File，不进入API集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // APIPath识别
        if (this.isAPIPath(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // 动态File识别
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // 其他Absolute path
        resultsSet?.absolutePaths?.add(path);
        return true;
    }
    
    /**
     * ProcessRelative path
     */
    processRelativePath(path, resultsSet) {
        // 短PathFilter
        if (path.length <= 4) return false;
        
        // 静态ResourceBefore缀Filter
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        // 静态ResourceDirectCategory为File，不进入API集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // APIPath识别
        if (this.isAPIPath(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // 动态File识别
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // 其他Relative path
        resultsSet?.relativePaths?.add(path);
        return true;
    }
    
    /**
     * APIPath识别
     */
    isAPIPath(path) {
        // 静态Resource不视为API
        if (this.isStaticResource(path)) {
            return false;
        }
        // DirectAPIPathPatternMatch
        if (this.regexCache.apiPathPattern.test(path)) {
            return true;
        }
        
        // 关Key词Match
        const lowerPath = path.toLowerCase();
        return this.config.apiKeywords.some(keyword => 
            lowerPath.includes(`/${keyword}/`) || 
            lowerPath.includes(`${keyword}.`) ||
            lowerPath.startsWith(`${keyword}/`)
        );
    }
    
    /**
     * BatchFilterAPIPath
     * @param {Array} paths - Path数Group
     * @param {Object} resultsSet - Result集合
     * @returns {Object} - CategoryResult
     */
    batchFilter(paths, resultsSet = null) {
        if (!resultsSet) {
            resultsSet = this.createEmptyResultSet();
        }
        
        let processed = 0;
        let filtered = 0;
        
        paths.forEach(path => {
            processed++;
            if (this.filterAPI(path, resultsSet)) {
                // PathBy保留
            } else {
                filtered++;
            }
        });
        
        return {
            processed,
            filtered,
            results: this.convertSetsToArrays(resultsSet)
        };
    }
    
    /**
     * CreateEmpty的Result集
     */
    createEmptyResultSet() {
        return {
            absoluteApis: new Set(),
            relativeApis: new Set(),
            absolutePaths: new Set(),
            relativePaths: new Set(),
            moduleFiles: new Set(),
            jsFiles: new Set(),
            cssFiles: new Set(),
            imageFiles: new Set(),
            audioFiles: new Set(),
            videoFiles: new Set(),
            docFiles: new Set(),
            vueFiles: new Set(),
            // 新增DomainAnd手机号Related集合
            domains: new Set(),
            phoneNumbers: new Set(),
            emails: new Set()
        };
    }
    
    /**
     * 将SetConvert为Array
     */
    convertSetsToArrays(resultsSet) {
        const result = {};
        Object.keys(resultsSet).forEach(key => {
            if (resultsSet[key] instanceof Set) {
                result[key] = Array.from(resultsSet[key]);
            } else {
                result[key] = resultsSet[key];
            }
        });
        return result;
    }
    
    /**
     * GetStatisticsInformation
     */
    getStats(resultsSet) {
        const stats = {};
        Object.keys(resultsSet).forEach(key => {
            if (resultsSet[key] instanceof Set) {
                stats[key] = resultsSet[key].size;
            } else if (Array.isArray(resultsSet[key])) {
                stats[key] = resultsSet[key].length;
            }
        });
        return stats;
    }
    
    /**
     * Extract from textDomain、手机号And邮箱
     * @param {string} text - 要分析的文本
     * @param {Object} resultsSet - Result集合
     * @returns {Object} - 包含Domain、手机号And邮箱的ResultObject
     */
    extractSensitiveInfo(text, resultsSet = null) {
        if (!resultsSet) {
            resultsSet = this.createEmptyResultSet();
        }
        
        if (!text || typeof text !== 'string') {
            return this.convertSetsToArrays(resultsSet);
        }
        
        try {
            // 使用DomainAnd手机号FilterExtract information
            if (this.domainPhoneFilter) {
                // ExtractDomain
                const domainMatches = this.extractDomainsFromText(text);
                if (domainMatches && domainMatches.length > 0) {
                    // 使用增强的DomainFilterFilterValidDomain
                    const validDomains = this.domainPhoneFilter.filterDomains(domainMatches);
                    validDomains.forEach(domain => resultsSet.domains.add(domain));
                }
                
                // Extract手机号（仅保留China大陆）
                const phoneMatches = this.extractPhonesFromText(text);
                if (phoneMatches && phoneMatches.length > 0) {
                    // 使用增强的手机号Filter，仅保留China大陆手机号
                    const validPhones = this.domainPhoneFilter.filterPhones(phoneMatches, true);
                    validPhones.forEach(phone => resultsSet.phoneNumbers.add(phone));
                }
                
                // Extract邮箱
                const emailMatches = this.extractEmailsFromText(text);
                if (emailMatches && emailMatches.length > 0) {
                    // 使用增强的邮箱FilterFilterValid邮箱
                    const validEmails = this.domainPhoneFilter.filterEmails(emailMatches);
                    validEmails.forEach(email => resultsSet.emails.add(email));
                }
            } else {
                // 如果DomainAnd手机号Filter不Available，使用内置的Regular expression
                this.extractDomainsWithRegex(text, resultsSet);
                this.extractPhonesWithRegex(text, resultsSet);
                this.extractEmailsWithRegex(text, resultsSet);
            }
        } catch (error) {
            console.error('Error extracting sensitive info:', error);
        }
        
        return this.convertSetsToArrays(resultsSet);
    }
    
    /**
     * Extract from textDomain
     */
    extractDomainsFromText(text) {
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // ExtractDomain部分（不包括PathAndQueryParameter）
            let domain = match[1] || match[0];
            domain = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
            domain = domain.split('/')[0].split('?')[0].split('#')[0];
            
            if (domain && domain.includes('.')) {
                matches.push(domain);
            }
        }
        
        return matches;
    }
    
    /**
     * Extract from text手机号
     */
    extractPhonesFromText(text) {
        const matches = [];
        
        // China手机号Pattern：1开Header的11 digits
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // 国际手机号Pattern：可能带有国家代码的6-15位数字
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // 避免与China手机号重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * Extract from text邮箱
     */
    extractEmailsFromText(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = [];
        let match;
        
        while ((match = emailRegex.exec(text)) !== null) {
            matches.push(match[0]);
        }
        
        return matches;
    }
    
    /**
     * 使用Regular expressionExtractDomain
     */
    extractDomainsWithRegex(text, resultsSet) {
        const matches = text.match(this.regexCache.domainPattern) || [];
        
        for (let match of matches) {
            // CleanMatchResult
            match = match.trim();
            
            // RemoveProtocolBefore缀
            match = match.replace(/^https?:\/\//i, '');
            
            // RemovePathAndQueryParameter
            match = match.split('/')[0].split('?')[0].split('#')[0];
            
            // Check是否是ValidDomain
            if (this.isValidDomainName(match)) {
                resultsSet.domains.add(match);
            }
        }
    }
    
    /**
     * Check是否是ValidDomain
     */
    isValidDomainName(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // 长度Check
        if (domain.length < 4 || domain.length > 253) {
            return false;
        }
        
        // Check是否包含至少一个点
        if (!domain.includes('.')) return false;
        
        // Check顶级Domain是否Valid
        const parts = domain.split('.');
        const tld = parts[parts.length - 1].toLowerCase();
        
        // Check是否是Invalid的FileExtension名
        if (this.config.invalidDomainSuffixes.has(tld)) {
            return false;
        }
        
        // CheckDomainFormat
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 使用Regular expressionExtract手机号（仅China大陆）
     */
    extractPhonesWithRegex(text, resultsSet) {
        // 仅MatchChina手机号
        const cnMatches = text.match(this.regexCache.cnMobilePattern) || [];
        for (let match of cnMatches) {
            if (this.isValidChinesePhoneNumber(match)) {
                resultsSet.phoneNumbers.add(match);
            }
        }
    }
    
    /**
     * Check是否是Valid的China手机号
     */
    isValidChinesePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove所有非数字字符
        const cleaned = phone.replace(/\D/g, '');
        
        // China手机号必须是11位，且以1开Header
        if (cleaned.length !== 11 || !cleaned.startsWith('1')) {
            return false;
        }
        
        // 第二位必须是3-9
        const secondDigit = parseInt(cleaned.charAt(1));
        if (secondDigit < 3 || secondDigit > 9) {
            return false;
        }
        
        // Check是否是纯数字序列，例如 12345678901
        if (/^1(?:0{10}|1{10}|2{10}|3{10}|4{10}|5{10}|6{10}|7{10}|8{10}|9{10})$/.test(cleaned)) {
            return false;
        }
        
        // Check是否是递增Or递减序列
        if (/^1(?:0123456789|9876543210)$/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check是否是Valid的国际手机号
     */
    isValidInternationalPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove所有Empty格、破折号等
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // 长度Check
        if (cleaned.length < 10 || cleaned.length > 15) {
            return false;
        }
        
        // Check是否全是相同的数字
        if (/^(\+?)\d*(\d)\2{8,}$/.test(cleaned)) {
            return false;
        }
        
        // Check是否是简单的递增Or递减序列
        if (/^(\+?)\d*(?:0123456789|9876543210)/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 使用Regular expressionExtract邮箱
     */
    extractEmailsWithRegex(text, resultsSet) {
        const matches = text.match(this.regexCache.emailPattern) || [];
        
        for (let match of matches) {
            if (this.isValidEmailAddress(match)) {
                resultsSet.emails.add(match);
            }
        }
    }
    
    /**
     * Check是否是Valid的邮箱地址
     */
    isValidEmailAddress(email) {
        if (!email || typeof email !== 'string') return false;
        
        // 基本FormatCheck
        if (!this.regexCache.emailPattern.test(email)) {
            return false;
        }
        
        // 分解邮箱地址
        const [localPart, domain] = email.split('@');
        
        // Local部分Check
        if (localPart.length > 64) {
            return false;
        }
        
        // Domain部分Check
        if (!this.isValidDomainName(domain)) {
            return false;
        }
        
        return true;
    }
}

// ExportAPIFilter
window.APIFilter = APIFilter;

// Create全局实例
window.apiFilter = new APIFilter();

// 兼容SnowEyes的接口
window.SCANNER_FILTER = window.SCANNER_FILTER || {};
window.SCANNER_FILTER.api = function(match, resultsSet) {
    return window.apiFilter.filterAPI(match, resultsSet);
};

// Add敏感InformationExtract接口
window.SCANNER_FILTER.extractSensitiveInfo = function(text, resultsSet) {
    return window.apiFilter.extractSensitiveInfo(text, resultsSet);
};