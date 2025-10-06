class APIFilter {
    constructor() {
        this.regexCache = this.initRegexCache();
        this.config = this.initConfig();
        // initialize domain and phone number filter
        this.domainPhoneFilter = window.domainPhoneFilter || new DomainPhoneFilter();
    }
    
    initRegexCache() {
        return {
            // basic mode cache
            coordPattern: /^coord/,
            valuePattern: /^\/|true|false|register|signUp|name|basic|http/i,
            chinesePattern: /^[\u4e00-\u9fa5]+$/,
            keywordPattern: /^func|variable|input|true|false|newline|null|http|unexpected|error|data|object|brac|beare|str|self|void|num|atom|opts|token|params|result|con|text|stor|sup|pun|emp|this|key|com|ent|met|opera|return|case|pare|ident|reg|invalid/i,
            camelCasePattern: /\b[_a-z]+(?:[A-Z][a-z]+)+\b/,
            
            // file type mode
            fontPattern: /\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i,
            imagePattern: /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff)(\?.*)?$/i,
            jsPattern: /\.(js|jsx|ts|tsx|vue|mjs|cjs)(\?.*)?$/i,
            cssPattern: /\.(css|scss|sass|less|styl)(\?.*)?$/i,
            docPattern: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)(\?.*)?$/i,
            audioPattern: /\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?.*)?$/i,
            videoPattern: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?.*)?$/i,
            
            // APIidentify mode
            apiPathPattern: /^\/(?:api|admin|manage|backend|service|rest|graphql|v\d+)\//,
            dynamicApiPattern: /\.(php|asp|aspx|jsp|do|action)(\?.*)?$/i,
            queryApiPattern: /\?[^#\s]+/,
            
            // module path mode
            relativeModulePattern: /^\.{1,2}\//,
            nodeModulePattern: /node_modules/,
            
            // filter mode
            staticResourcePattern: /^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/,
            shortPathPattern: /^.{1,4}$/,
            invalidCharsPattern: /[A-Z\.\/\#\+\?23]/,
            
            // enhanced  domain and phone number mode
            domainPattern: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/i,
            cnMobilePattern: /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/,
            intlMobilePattern: /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,14}(?!\d)/,
            emailPattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        };
    }
    
    initConfig() {
        return {
            // passive marker filter   content type
            filteredContentTypes: [
                'text/css', 'text/javascript', 'application/javascript',
                'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
                'font/woff', 'font/woff2', 'application/font-woff',
                'audio/mpeg', 'video/mp4', 'application/octet-stream'
            ],
            
            // minimum path length
            minPathLength: 2,
            maxPathLength: 500,
            
            // API关 key 词
            apiKeywords: [
                'api', 'admin', 'manage', 'backend', 'service', 'rest', 
                'graphql', 'ajax', 'json', 'xml', 'data', 'query',
                'search', 'upload', 'download', 'export', 'import'
            ],
            
            // exclude   path before缀
            excludedPrefixes: [
                'chrome-extension://', 'moz-extension://', 'about:',
                'data:', 'javascript:', 'mailto:', 'tel:', 'ftp:'
            ],
            
            // invalid   domain 后缀（通常是 resource file extension 名）
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
     * 主要 API filter function
     * @param {string} match - match 到  path
     * @param {Object} resultsSet - result set
     * @returns {boolean} - 是否应该keep此 path
     */
    filterAPI(match, resultsSet) {
        // remove 引号
        const cleanPath = this.cleanPath(match);
        if (!cleanPath) return false;
        
        // basic validate
        if (!this.isValidPath(cleanPath)) return false;
        
        // 字体 file filter
        if (this.regexCache.fontPattern.test(cleanPath)) {
            return false;
        }
        
        // file type 分类
        if (this.classifyFileType(cleanPath, resultsSet)) {
            return true;
        }
        
        // content type filter
        if (this.isFilteredContentType(cleanPath)) {
            return false;
        }
        
        // path 分类and process
        return this.classifyAndProcessPath(cleanPath, resultsSet);
    }
    
    /**
     * cleanup path string
     */
    cleanPath(path) {
        if (!path || typeof path !== 'string') return null;
        
        // remove 首尾引号
        let cleaned = path.replace(/^['"`]|['"`]$/g, '');
        
        // check exclude  before缀
        if (this.config.excludedPrefixes.some(prefix => cleaned.startsWith(prefix))) {
            return null;
        }
        
        // length check
        if (cleaned.length < this.config.minPathLength || 
            cleaned.length > this.config.maxPathLength) {
            return null;
        }
        
        return cleaned;
    }
    
    /**
     * validate path valid 性
     */
    isValidPath(path) {
        // empty path check
        if (!path || path.trim() === '') return false;
        
        // 特殊字符 check（针对短 path）
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // static resource before缀 check
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * file type 分类
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
     * 是否to static resource（root 据 extension 名判断）
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
     * check 是否topassive marker filter   content type
     */
    isFilteredContentType(path) {
        const lowerPath = path.toLowerCase();
        return this.config.filteredContentTypes.some(type => 
            lowerPath.includes(type.toLowerCase())
        );
    }
    
    /**
     * path 分类and process
     */
    classifyAndProcessPath(path, resultsSet) {
        // Vue file 特殊 process
        if (path.endsWith('.vue')) {
            resultsSet?.vueFiles?.add(path);
            return true;
        }
        
        // module path process
        if (this.isModulePath(path)) {
            resultsSet?.moduleFiles?.add(path);
            return true;
        }
        
        // 绝对 path process
        if (path.startsWith('/')) {
            return this.processAbsolutePath(path, resultsSet);
        }
        
        // 相对 path process
        return this.processRelativePath(path, resultsSet);
    }
    
    /**
     * module path check
     */
    isModulePath(path) {
        return this.regexCache.relativeModulePattern.test(path) ||
               this.regexCache.nodeModulePattern.test(path);
    }
    
    /**
     * process 绝对 path
     */
    processAbsolutePath(path, resultsSet) {
        // 短 path filter
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // static resource directly分类to file，do not进入API set
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API path identify
        if (this.isAPIPath(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // dynamic file identify
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // 其他绝对 path
        resultsSet?.absolutePaths?.add(path);
        return true;
    }
    
    /**
     * process 相对 path
     */
    processRelativePath(path, resultsSet) {
        // 短 path filter
        if (path.length <= 4) return false;
        
        // static resource before缀 filter
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        // static resource directly分类to file，do not进入API set
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API path identify
        if (this.isAPIPath(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // dynamic file identify
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // 其他相对 path
        resultsSet?.relativePaths?.add(path);
        return true;
    }
    
    /**
     * API path identify
     */
    isAPIPath(path) {
        // static resource do not视toAPI
        if (this.isStaticResource(path)) {
            return false;
        }
        // directlyAPI path mode match
        if (this.regexCache.apiPathPattern.test(path)) {
            return true;
        }
        
        // 关 key 词 match
        const lowerPath = path.toLowerCase();
        return this.config.apiKeywords.some(keyword => 
            lowerPath.includes(`/${keyword}/`) || 
            lowerPath.includes(`${keyword}.`) ||
            lowerPath.startsWith(`${keyword}/`)
        );
    }
    
    /**
     * batch filter API path
     * @param {Array} paths - path array
     * @param {Object} resultsSet - result set
     * @returns {Object} - 分类 result
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
                // path passive markerkeep
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
     * 创建 empty   result 集
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
            // 新增 domain and phone number 相关 set
            domains: new Set(),
            phoneNumbers: new Set(),
            emails: new Set()
        };
    }
    
    /**
     * 将SetconverttoArray
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
     * 获取 statistics
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
     * from text in extract domain、phone number and email
     * @param {string} text - 要 analysis   text
     * @param {Object} resultsSet - result set
     * @returns {Object} - contains domain、phone number and email   result object
     */
    extractSensitiveInfo(text, resultsSet = null) {
        if (!resultsSet) {
            resultsSet = this.createEmptyResultSet();
        }
        
        if (!text || typeof text !== 'string') {
            return this.convertSetsToArrays(resultsSet);
        }
        
        try {
            // use domain and phone number filter extract information
            if (this.domainPhoneFilter) {
                // extract domain
                const domainMatches = this.extractDomainsFromText(text);
                if (domainMatches && domainMatches.length > 0) {
                    // useenhanced  domain filter filter valid domain
                    const validDomains = this.domainPhoneFilter.filterDomains(domainMatches);
                    validDomains.forEach(domain => resultsSet.domains.add(domain));
                }
                
                // extract phone number（仅keepin国大陆）
                const phoneMatches = this.extractPhonesFromText(text);
                if (phoneMatches && phoneMatches.length > 0) {
                    // useenhanced  phone number filter，仅keepin国大陆 phone number
                    const validPhones = this.domainPhoneFilter.filterPhones(phoneMatches, true);
                    validPhones.forEach(phone => resultsSet.phoneNumbers.add(phone));
                }
                
                // extract email
                const emailMatches = this.extractEmailsFromText(text);
                if (emailMatches && emailMatches.length > 0) {
                    // useenhanced  email filter filter valid email
                    const validEmails = this.domainPhoneFilter.filterEmails(emailMatches);
                    validEmails.forEach(email => resultsSet.emails.add(email));
                }
            } else {
                // 如果 domain and phone number filter do not可用，use内置  regular expression
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
     * from text in extract domain
     */
    extractDomainsFromText(text) {
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // extract domain partial（do not package 括 path and query parameter）
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
     * from text in extract phone number
     */
    extractPhonesFromText(text) {
        const matches = [];
        
        // in国 phone number mode：starts with 1 11-digit number
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // 国际 phone number mode：可能带有国家code 6-15-digit number
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // 避免与in国 phone number 重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * from text in extract email
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
     * use regular expression extract domain
     */
    extractDomainsWithRegex(text, resultsSet) {
        const matches = text.match(this.regexCache.domainPattern) || [];
        
        for (let match of matches) {
            // cleanup match result
            match = match.trim();
            
            // remove protocol before缀
            match = match.replace(/^https?:\/\//i, '');
            
            // remove path and query parameter
            match = match.split('/')[0].split('?')[0].split('#')[0];
            
            // check 是否是 valid domain
            if (this.isValidDomainName(match)) {
                resultsSet.domains.add(match);
            }
        }
    }
    
    /**
     * check 是否是 valid domain
     */
    isValidDomainName(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // length check
        if (domain.length < 4 || domain.length > 253) {
            return false;
        }
        
        // check 是否 contains 至少一个点
        if (!domain.includes('.')) return false;
        
        // check top-level domain 是否 valid
        const parts = domain.split('.');
        const tld = parts[parts.length - 1].toLowerCase();
        
        // check 是否是 invalid   file extension 名
        if (this.config.invalidDomainSuffixes.has(tld)) {
            return false;
        }
        
        // check domain format
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * use regular expression extract phone number（仅in国大陆）
     */
    extractPhonesWithRegex(text, resultsSet) {
        // 仅 match in国 phone number
        const cnMatches = text.match(this.regexCache.cnMobilePattern) || [];
        for (let match of cnMatches) {
            if (this.isValidChinesePhoneNumber(match)) {
                resultsSet.phoneNumbers.add(match);
            }
        }
    }
    
    /**
     * check 是否是 valid  in国 phone number
     */
    isValidChinesePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove all非 number 字符
        const cleaned = phone.replace(/\D/g, '');
        
        // in国 phone number 必须是11-digit，且以starts with 1
        if (cleaned.length !== 11 || !cleaned.startsWith('1')) {
            return false;
        }
        
        // 第二位必须是3-9
        const secondDigit = parseInt(cleaned.charAt(1));
        if (secondDigit < 3 || secondDigit > 9) {
            return false;
        }
        
        // check 是否是纯 number 序列，例如 12345678901
        if (/^1(?:0{10}|1{10}|2{10}|3{10}|4{10}|5{10}|6{10}|7{10}|8{10}|9{10})$/.test(cleaned)) {
            return false;
        }
        
        // check 是否是递增or递减序列
        if (/^1(?:0123456789|9876543210)$/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * check 是否是 valid  国际 phone number
     */
    isValidInternationalPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove all empty 格、破折号等
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // length check
        if (cleaned.length < 10 || cleaned.length > 15) {
            return false;
        }
        
        // check 是否全是相同  number
        if (/^(\+?)\d*(\d)\2{8,}$/.test(cleaned)) {
            return false;
        }
        
        // check 是否是 simple  递增or递减序列
        if (/^(\+?)\d*(?:0123456789|9876543210)/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * use regular expression extract email
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
     * check 是否是 valid   email address
     */
    isValidEmailAddress(email) {
        if (!email || typeof email !== 'string') return false;
        
        // 基本 format check
        if (!this.regexCache.emailPattern.test(email)) {
            return false;
        }
        
        // 分解 email address
        const [localPart, domain] = email.split('@');
        
        // 本地 partial check
        if (localPart.length > 64) {
            return false;
        }
        
        // domain partial check
        if (!this.isValidDomainName(domain)) {
            return false;
        }
        
        return true;
    }
}

// export API filter
window.APIFilter = APIFilter;

// 创建全局实例
window.apiFilter = new APIFilter();

// 兼容SnowEyes  interface
window.SCANNER_FILTER = window.SCANNER_FILTER || {};
window.SCANNER_FILTER.api = function(match, resultsSet) {
    return window.apiFilter.filterAPI(match, resultsSet);
};

// add 敏感 information extract interface
window.SCANNER_FILTER.extractSensitiveInfo = function(text, resultsSet) {
    return window.apiFilter.extractSensitiveInfo(text, resultsSet);
};