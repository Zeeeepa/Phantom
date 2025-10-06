class APIFilter {
    constructor() {
        this.regexCache = this.initRegexCache();
        this.config = this.initConfig();
        // filter initialize domain and 手机号
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
            
            // API recognition mode
            apiPathPattern: /^\/(?:api|admin|manage|backend|service|rest|graphql|v\d+)\//,
            dynamicApiPattern: /\.(php|asp|aspx|jsp|do|action)(\?.*)?$/i,
            queryApiPattern: /\?[^#\s]+/,
            
            // path module mode
            relativeModulePattern: /^\.{1,2}\//,
            nodeModulePattern: /node_modules/,
            
            // filter mode
            staticResourcePattern: /^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/,
            shortPathPattern: /^.{1,4}$/,
            invalidCharsPattern: /[A-Z\.\/\#\+\?23]/,
            
            // domain mode of and 增强手机号
            domainPattern: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/i,
            cnMobilePattern: /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/,
            intlMobilePattern: /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,14}(?!\d)/,
            emailPattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        };
    }
    
    initConfig() {
        return {
            // content filter type of 被
            filteredContentTypes: [
                'text/css', 'text/javascript', 'application/javascript',
                'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
                'font/woff', 'font/woff2', 'application/font-woff',
                'audio/mpeg', 'video/mp4', 'application/octet-stream'
            ],
            
            // path minimum length
            minPathLength: 2,
            maxPathLength: 500,
            
            // API keyword
            apiKeywords: [
                'api', 'admin', 'manage', 'backend', 'service', 'rest', 
                'graphql', 'ajax', 'json', 'xml', 'data', 'query',
                'search', 'upload', 'download', 'export', 'import'
            ],
            
            // path exclude of before 缀
            excludedPrefixes: [
                'chrome-extension://', 'moz-extension://', 'about:',
                'data:', 'javascript:', 'mailto:', 'tel:', 'ftp:'
            ],
            
            // domain of after 无效缀（extension file resource yes 通常）
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
     * API filter function main of
     * @param {string} match - matched path of
     * @param {Object} resultsSet - results 集合
     * @returns {boolean} - path no yes 应该保留此
     */
    filterAPI(match, resultsSet) {
        // remove 引号
        const cleanPath = this.cleanPath(match);
        if (!cleanPath) return false;
        
        // validate basic
        if (!this.isValidPath(cleanPath)) return false;
        
        // file filter 字体
        if (this.regexCache.fontPattern.test(cleanPath)) {
            return false;
        }
        
        // file type class 分
        if (this.classifyFileType(cleanPath, resultsSet)) {
            return true;
        }
        
        // content filter type
        if (this.isFilteredContentType(cleanPath)) {
            return false;
        }
        
        // path process class and 分
        return this.classifyAndProcessPath(cleanPath, resultsSet);
    }
    
    /**
     * cleanup path characters 串
     */
    cleanPath(path) {
        if (!path || typeof path !== 'string') return null;
        
        // remove 首尾引号
        let cleaned = path.replace(/^['"`]|['"`]$/g, '');
        
        // exclude check of before 缀
        if (this.config.excludedPrefixes.some(prefix => cleaned.startsWith(prefix))) {
            return null;
        }
        
        // check length
        if (cleaned.length < this.config.minPathLength || 
            cleaned.length > this.config.maxPathLength) {
            return null;
        }
        
        return cleaned;
    }
    
    /**
     * path validate has 效性
     */
    isValidPath(path) {
        // path check empty
        if (!path || path.trim() === '') return false;
        
        // check special characters（path 针对短）
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // resource check before 静态缀
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * file type class 分
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
     * resource as no yes 静态（extension 根据判断）
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
     * content filter check type as of no yes 被
     */
    isFilteredContentType(path) {
        const lowerPath = path.toLowerCase();
        return this.config.filteredContentTypes.some(type => 
            lowerPath.includes(type.toLowerCase())
        );
    }
    
    /**
     * path process class and 分
     */
    classifyAndProcessPath(path, resultsSet) {
        // file process special Vue
        if (path.endsWith('.vue')) {
            resultsSet?.vueFiles?.add(path);
            return true;
        }
        
        // path process module
        if (this.isModulePath(path)) {
            resultsSet?.moduleFiles?.add(path);
            return true;
        }
        
        // absolute path process
        if (path.startsWith('/')) {
            return this.processAbsolutePath(path, resultsSet);
        }
        
        // relative path process
        return this.processRelativePath(path, resultsSet);
    }
    
    /**
     * path check module
     */
    isModulePath(path) {
        return this.regexCache.relativeModulePattern.test(path) ||
               this.regexCache.nodeModulePattern.test(path);
    }
    
    /**
     * absolute path process
     */
    processAbsolutePath(path, resultsSet) {
        // path filter 短
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // file resource directly class as 静态分，API 不进入集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API path recognition
        if (this.isAPIPath(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // file recognition dynamic
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // absolute path 其他
        resultsSet?.absolutePaths?.add(path);
        return true;
    }
    
    /**
     * relative path process
     */
    processRelativePath(path, resultsSet) {
        // path filter 短
        if (path.length <= 4) return false;
        
        // resource filter before 静态缀
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        // file resource directly class as 静态分，API 不进入集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API path recognition
        if (this.isAPIPath(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // file recognition dynamic
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // relative path 其他
        resultsSet?.relativePaths?.add(path);
        return true;
    }
    
    /**
     * API path recognition
     */
    isAPIPath(path) {
        // API resource as 静态不视
        if (this.isStaticResource(path)) {
            return false;
        }
        // API path match mode directly
        if (this.regexCache.apiPathPattern.test(path)) {
            return true;
        }
        
        // keyword match
        const lowerPath = path.toLowerCase();
        return this.config.apiKeywords.some(keyword => 
            lowerPath.includes(`/${keyword}/`) || 
            lowerPath.includes(`${keyword}.`) ||
            lowerPath.startsWith(`${keyword}/`)
        );
    }
    
    /**
     * API path filter batch
     * @param {Array} paths - path array
     * @param {Object} resultsSet - results 集合
     * @returns {Object} - results class 分
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
                // path 被保留
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
     * results of empty 创建集
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
            // domain related and 新增手机号集合
            domains: new Set(),
            phoneNumbers: new Set(),
            emails: new Set()
        };
    }
    
    /**
     * convert as 将SetArray
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
     * information get statistics
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
     * domain text extracted from in、and 手机号邮箱
     * @param {string} text - text analysis of 要
     * @param {Object} resultsSet - results 集合
     * @returns {Object} - domain contains、results object of and 手机号邮箱
     */
    extractSensitiveInfo(text, resultsSet = null) {
        if (!resultsSet) {
            resultsSet = this.createEmptyResultSet();
        }
        
        if (!text || typeof text !== 'string') {
            return this.convertSetsToArrays(resultsSet);
        }
        
        try {
            // filter domain information extracted use and 手机号
            if (this.domainPhoneFilter) {
                // domain extracted
                const domainMatches = this.extractDomainsFromText(text);
                if (domainMatches && domainMatches.length > 0) {
                    // domain filter domain filter use of has 增强器效
                    const validDomains = this.domainPhoneFilter.filterDomains(domainMatches);
                    validDomains.forEach(domain => resultsSet.domains.add(domain));
                }
                
                // extracted 手机号（in 仅保留国大陆）
                const phoneMatches = this.extractPhonesFromText(text);
                if (phoneMatches && phoneMatches.length > 0) {
                    // filter use of 增强手机号，in 仅保留国大陆手机号
                    const validPhones = this.domainPhoneFilter.filterPhones(phoneMatches, true);
                    validPhones.forEach(phone => resultsSet.phoneNumbers.add(phone));
                }
                
                // extracted 邮箱
                const emailMatches = this.extractEmailsFromText(text);
                if (emailMatches && emailMatches.length > 0) {
                    // filter filter use of has 增强邮箱效邮箱
                    const validEmails = this.domainPhoneFilter.filterEmails(emailMatches);
                    validEmails.forEach(email => resultsSet.emails.add(email));
                }
            } else {
                // filter unavailable domain if and 手机号，regular expression use of 内置
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
     * domain text extracted from in
     */
    extractDomainsFromText(text) {
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // domain extracted 部分（path parameters query and 不包括）
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
     * text extracted from in 手机号
     */
    extractPhonesFromText(text) {
        const matches = [];
        
        // mode in 国手机号：starts with digit(s) digit(s) of 111
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // mode 国际手机号：code digit(s) digit(s) of with has 可能国家6-15
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // in 避免与国手机号重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * text extracted from in 邮箱
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
     * regular expression domain extracted use
     */
    extractDomainsWithRegex(text, resultsSet) {
        const matches = text.match(this.regexCache.domainPattern) || [];
        
        for (let match of matches) {
            // cleanup results match
            match = match.trim();
            
            // remove before 协议缀
            match = match.replace(/^https?:\/\//i, '');
            
            // remove path parameters query and
            match = match.split('/')[0].split('?')[0].split('#')[0];
            
            // domain check no yes yes has 效
            if (this.isValidDomainName(match)) {
                resultsSet.domains.add(match);
            }
        }
    }
    
    /**
     * domain check no yes yes has 效
     */
    isValidDomainName(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // check length
        if (domain.length < 4 || domain.length > 253) {
            return false;
        }
        
        // contains check item(s) no yes 至少一点
        if (!domain.includes('.')) return false;
        
        // domain check no yes has 顶级效
        const parts = domain.split('.');
        const tld = parts[parts.length - 1].toLowerCase();
        
        // extension file check of no yes yes 无效
        if (this.config.invalidDomainSuffixes.has(tld)) {
            return false;
        }
        
        // domain check format
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * regular expression extracted use 手机号（in 仅国大陆）
     */
    extractPhonesWithRegex(text, resultsSet) {
        // match in 仅国手机号
        const cnMatches = text.match(this.regexCache.cnMobilePattern) || [];
        for (let match of cnMatches) {
            if (this.isValidChinesePhoneNumber(match)) {
                resultsSet.phoneNumbers.add(match);
            }
        }
    }
    
    /**
     * check in of no yes yes has 效国手机号
     */
    isValidChinesePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove digit(s) all characters 非
        const cleaned = phone.replace(/\D/g, '');
        
        //  digit(s) in yes 国手机号必须11，starts with with 且1
        if (cleaned.length !== 11 || !cleaned.startsWith('1')) {
            return false;
        }
        
        // second digit(s) yes 必须3-9
        const secondDigit = parseInt(cleaned.charAt(1));
        if (secondDigit < 3 || secondDigit > 9) {
            return false;
        }
        
        // check digit(s) column(s) no yes yes 纯序，例如 12345678901
        if (/^1(?:0{10}|1{10}|2{10}|3{10}|4{10}|5{10}|6{10}|7{10}|8{10}|9{10})$/.test(cleaned)) {
            return false;
        }
        
        // check column(s) no yes yes 递增或递减序
        if (/^1(?:0123456789|9876543210)$/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * check of no yes yes has 效国际手机号
     */
    isValidInternationalPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove all empty 格、, etc. 破折号
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // check length
        if (cleaned.length < 10 || cleaned.length > 15) {
            return false;
        }
        
        // check digit(s) of no yes yes 全相同
        if (/^(\+?)\d*(\d)\2{8,}$/.test(cleaned)) {
            return false;
        }
        
        // check column(s) of no yes yes 简单递增或递减序
        if (/^(\+?)\d*(?:0123456789|9876543210)/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * regular expression extracted use 邮箱
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
     * check address of no yes yes has 效邮箱
     */
    isValidEmailAddress(email) {
        if (!email || typeof email !== 'string') return false;
        
        // check format 基本
        if (!this.regexCache.emailPattern.test(email)) {
            return false;
        }
        
        // address 分解邮箱
        const [localPart, domain] = email.split('@');
        
        // check 本地部分
        if (localPart.length > 64) {
            return false;
        }
        
        // domain check 部分
        if (!this.isValidDomainName(domain)) {
            return false;
        }
        
        return true;
    }
}

// API filter export
window.APIFilter = APIFilter;

// instance 创建全局
window.apiFilter = new APIFilter();

// interface of 兼容SnowEyes
window.SCANNER_FILTER = window.SCANNER_FILTER || {};
window.SCANNER_FILTER.api = function(match, resultsSet) {
    return window.apiFilter.filterAPI(match, resultsSet);
};

// sensitive information add extracted interface
window.SCANNER_FILTER.extractSensitiveInfo = function(text, resultsSet) {
    return window.apiFilter.extractSensitiveInfo(text, resultsSet);
};