class APIFilter {
    constructor() {
        this.regexCache = this.initRegexCache();
        this.config = this.initConfig();
        // initializedomainandmobile phonethrough滤器
        this.domainPhoneFilter = window.domainPhoneFilter || new DomainPhoneFilter();
    }
    
    initRegexCache() {
        return {
            // basicpattern缓存
            coordPattern: /^coord/,
            valuePattern: /^\/|true|false|register|signUp|name|basic|http/i,
            chinesePattern: /^[\u4e00-\u9fa5]+$/,
            keywordPattern: /^func|variable|input|true|false|newline|null|http|unexpected|error|data|object|brac|beare|str|self|void|num|atom|opts|token|params|result|con|text|stor|sup|pun|emp|this|key|com|ent|met|opera|return|case|pare|ident|reg|invalid/i,
            camelCasePattern: /\b[_a-z]+(?:[A-Z][a-z]+)+\b/,
            
            // 文件class型pattern
            fontPattern: /\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i,
            imagePattern: /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff)(\?.*)?$/i,
            jsPattern: /\.(js|jsx|ts|tsx|vue|mjs|cjs)(\?.*)?$/i,
            cssPattern: /\.(css|scss|sass|less|styl)(\?.*)?$/i,
            docPattern: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)(\?.*)?$/i,
            audioPattern: /\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?.*)?$/i,
            videoPattern: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?.*)?$/i,
            
            // APIidentifypattern
            apiPathPattern: /^\/(?:api|admin|manage|backend|service|rest|graphql|v\d+)\//,
            dynamicApiPattern: /\.(php|asp|aspx|jsp|do|action)(\?.*)?$/i,
            queryApiPattern: /\?[^#\s]+/,
            
            // mod块路径pattern
            relativeModulePattern: /^\.{1,2}\//,
            nodeModulePattern: /node_modules/,
            
            // through滤pattern
            staticResourcePattern: /^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/,
            shortPathPattern: /^.{1,4}$/,
            invalidCharsPattern: /[A-Z\.\/\#\+\?23]/,
            
            // enhanceddomainandmobile phonepattern
            domainPattern: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/i,
            cnMobilePattern: /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/,
            intlMobilePattern: /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,14}(?!\d)/,
            emailPattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        };
    }
    
    initConfig() {
        return {
            // bythrough滤内容class型
            filteredContentTypes: [
                'text/css', 'text/javascript', 'application/javascript',
                'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
                'font/woff', 'font/woff2', 'application/font-woff',
                'audio/mpeg', 'video/mp4', 'application/octet-stream'
            ],
            
            // 最小路径长度
            minPathLength: 2,
            maxPathLength: 500,
            
            // API关键词
            apiKeywords: [
                'api', 'admin', 'manage', 'backend', 'service', 'rest', 
                'graphql', 'ajax', 'json', 'xml', 'data', 'query',
                'search', 'upload', 'download', 'export', 'import'
            ],
            
            // exclude路径before缀
            excludedPrefixes: [
                'chrome-extension://', 'moz-extension://', 'about:',
                'data:', 'javascript:', 'mailto:', 'tel:', 'ftp:'
            ],
            
            // 无效domain后缀（通常是资源文件扩展名）
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
     * 主要APIthrough滤函数
     * @param {string} match - matchto路径
     * @param {Object} resultsSet - result集合
     * @returns {boolean} - 是否应该keep此路径
     */
    filterAPI(match, resultsSet) {
        // 移除引号
        const cleanPath = this.cleanPath(match);
        if (!cleanPath) return false;
        
        // basicvalidation
        if (!this.isValidPath(cleanPath)) return false;
        
        // 字体文件through滤
        if (this.regexCache.fontPattern.test(cleanPath)) {
            return false;
        }
        
        // 文件class型分class
        if (this.classifyFileType(cleanPath, resultsSet)) {
            return true;
        }
        
        // 内容class型through滤
        if (this.isFilteredContentType(cleanPath)) {
            return false;
        }
        
        // 路径分classand处理
        return this.classifyAndProcessPath(cleanPath, resultsSet);
    }
    
    /**
     * 清理路径字符串
     */
    cleanPath(path) {
        if (!path || typeof path !== 'string') return null;
        
        // 移除首尾引号
        let cleaned = path.replace(/^['"`]|['"`]$/g, '');
        
        // checkexcludebefore缀
        if (this.config.excludedPrefixes.some(prefix => cleaned.startsWith(prefix))) {
            return null;
        }
        
        // 长度check
        if (cleaned.length < this.config.minPathLength || 
            cleaned.length > this.config.maxPathLength) {
            return null;
        }
        
        return cleaned;
    }
    
    /**
     * validation路径valid性
     */
    isValidPath(path) {
        // 空路径check
        if (!path || path.trim() === '') return false;
        
        // special字符check（针对短路径）
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // 静态资源before缀check
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 文件class型分class
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
     * 是否为静态资源（根据扩展名判断）
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
     * check是否为bythrough滤内容class型
     */
    isFilteredContentType(path) {
        const lowerPath = path.toLowerCase();
        return this.config.filteredContentTypes.some(type => 
            lowerPath.includes(type.toLowerCase())
        );
    }
    
    /**
     * 路径分classand处理
     */
    classifyAndProcessPath(path, resultsSet) {
        // Vue文件special处理
        if (path.endsWith('.vue')) {
            resultsSet?.vueFiles?.add(path);
            return true;
        }
        
        // mod块路径处理
        if (this.isModulePath(path)) {
            resultsSet?.moduleFiles?.add(path);
            return true;
        }
        
        // 绝对路径处理
        if (path.startsWith('/')) {
            return this.processAbsolutePath(path, resultsSet);
        }
        
        // 相对路径处理
        return this.processRelativePath(path, resultsSet);
    }
    
    /**
     * mod块路径check
     */
    isModulePath(path) {
        return this.regexCache.relativeModulePattern.test(path) ||
               this.regexCache.nodeModulePattern.test(path);
    }
    
    /**
     * 处理绝对路径
     */
    processAbsolutePath(path, resultsSet) {
        // 短路径through滤
        if (path.length <= 4 && this.regexCache.invalidCharsPattern.test(path.slice(1))) {
            return false;
        }
        
        // 静态资源directly分class为文件，not进入API集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API路径identify
        if (this.isAPIPath(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // 动态文件identify
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.absoluteApis?.add(path);
            return true;
        }
        
        // 其他绝对路径
        resultsSet?.absolutePaths?.add(path);
        return true;
    }
    
    /**
     * 处理相对路径
     */
    processRelativePath(path, resultsSet) {
        // 短路径through滤
        if (path.length <= 4) return false;
        
        // 静态资源before缀through滤
        if (this.regexCache.staticResourcePattern.test(path)) {
            return false;
        }
        
        // 静态资源directly分class为文件，not进入API集合
        if (this.isStaticResource(path)) {
            this.classifyFileType(path, resultsSet);
            return true;
        }
        
        // API路径identify
        if (this.isAPIPath(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // 动态文件identify
        if (this.regexCache.dynamicApiPattern.test(path) || 
            this.regexCache.queryApiPattern.test(path)) {
            resultsSet?.relativeApis?.add(path);
            return true;
        }
        
        // 其他相对路径
        resultsSet?.relativePaths?.add(path);
        return true;
    }
    
    /**
     * API路径identify
     */
    isAPIPath(path) {
        // 静态资源not视为API
        if (this.isStaticResource(path)) {
            return false;
        }
        // directlyAPI路径patternmatch
        if (this.regexCache.apiPathPattern.test(path)) {
            return true;
        }
        
        // 关键词match
        const lowerPath = path.toLowerCase();
        return this.config.apiKeywords.some(keyword => 
            lowerPath.includes(`/${keyword}/`) || 
            lowerPath.includes(`${keyword}.`) ||
            lowerPath.startsWith(`${keyword}/`)
        );
    }
    
    /**
     * 批量through滤API路径
     * @param {Array} paths - 路径数组
     * @param {Object} resultsSet - result集合
     * @returns {Object} - 分classresult
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
                // 路径bykeep
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
     * create空result集
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
            // new增domainandmobile phone相关集合
            domains: new Set(),
            phoneNumbers: new Set(),
            emails: new Set()
        };
    }
    
    /**
     * 将Setconvert为Array
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
     * get统计information
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
     * from文本inextractdomain、mobile phoneandemail
     * @param {string} text - 要分析文本
     * @param {Object} resultsSet - result集合
     * @returns {Object} - containsdomain、mobile phoneandemailresultobject
     */
    extractSensitiveInfo(text, resultsSet = null) {
        if (!resultsSet) {
            resultsSet = this.createEmptyResultSet();
        }
        
        if (!text || typeof text !== 'string') {
            return this.convertSetsToArrays(resultsSet);
        }
        
        try {
            // usedomainandmobile phonethrough滤器extractinformation
            if (this.domainPhoneFilter) {
                // extractdomain
                const domainMatches = this.extractDomainsFromText(text);
                if (domainMatches && domainMatches.length > 0) {
                    // useenhanceddomainthrough滤器through滤validdomain
                    const validDomains = this.domainPhoneFilter.filterDomains(domainMatches);
                    validDomains.forEach(domain => resultsSet.domains.add(domain));
                }
                
                // extractmobile phone（仅keepChinamainland）
                const phoneMatches = this.extractPhonesFromText(text);
                if (phoneMatches && phoneMatches.length > 0) {
                    // useenhancedmobile phonethrough滤器，仅keepChinamainlandmobile phone
                    const validPhones = this.domainPhoneFilter.filterPhones(phoneMatches, true);
                    validPhones.forEach(phone => resultsSet.phoneNumbers.add(phone));
                }
                
                // extractemail
                const emailMatches = this.extractEmailsFromText(text);
                if (emailMatches && emailMatches.length > 0) {
                    // useenhancedemailthrough滤器through滤validemail
                    const validEmails = this.domainPhoneFilter.filterEmails(emailMatches);
                    validEmails.forEach(email => resultsSet.emails.add(email));
                }
            } else {
                // ifdomainandmobile phonethrough滤器not可for，use内置regexexpression
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
     * from文本inextractdomain
     */
    extractDomainsFromText(text) {
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // extractdomain部分（notincluding路径and查询parameter）
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
     * from文本inextractmobile phone
     */
    extractPhonesFromText(text) {
        const matches = [];
        
        // Chinamobile phonepattern：1开头11 digits
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // internationalmobile phonepattern：可能带有countrycode6-15-digit数字
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // 避免与Chinamobile phone重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * from文本inextractemail
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
     * useregexexpressionextractdomain
     */
    extractDomainsWithRegex(text, resultsSet) {
        const matches = text.match(this.regexCache.domainPattern) || [];
        
        for (let match of matches) {
            // 清理matchresult
            match = match.trim();
            
            // 移除协议before缀
            match = match.replace(/^https?:\/\//i, '');
            
            // 移除路径and查询parameter
            match = match.split('/')[0].split('?')[0].split('#')[0];
            
            // check是否是validdomain
            if (this.isValidDomainName(match)) {
                resultsSet.domains.add(match);
            }
        }
    }
    
    /**
     * check是否是validdomain
     */
    isValidDomainName(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // 长度check
        if (domain.length < 4 || domain.length > 253) {
            return false;
        }
        
        // check是否contains至少一个点
        if (!domain.includes('.')) return false;
        
        // checktop-level domain是否valid
        const parts = domain.split('.');
        const tld = parts[parts.length - 1].toLowerCase();
        
        // check是否是无效文件扩展名
        if (this.config.invalidDomainSuffixes.has(tld)) {
            return false;
        }
        
        // checkdomainformat
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * useregexexpressionextractmobile phone（仅Chinamainland）
     */
    extractPhonesWithRegex(text, resultsSet) {
        // 仅matchChinamobile phone
        const cnMatches = text.match(this.regexCache.cnMobilePattern) || [];
        for (let match of cnMatches) {
            if (this.isValidChinesePhoneNumber(match)) {
                resultsSet.phoneNumbers.add(match);
            }
        }
    }
    
    /**
     * check是否是validChinamobile phone
     */
    isValidChinesePhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // 移除all非数字字符
        const cleaned = phone.replace(/\D/g, '');
        
        // Chinamobile phone必须是11位，且以1开头
        if (cleaned.length !== 11 || !cleaned.startsWith('1')) {
            return false;
        }
        
        // 第二位必须是3-9
        const secondDigit = parseInt(cleaned.charAt(1));
        if (secondDigit < 3 || secondDigit > 9) {
            return false;
        }
        
        // check是否是纯数字序列，例such as 12345678901
        if (/^1(?:0{10}|1{10}|2{10}|3{10}|4{10}|5{10}|6{10}|7{10}|8{10}|9{10})$/.test(cleaned)) {
            return false;
        }
        
        // check是否是递增or递减序列
        if (/^1(?:0123456789|9876543210)$/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * check是否是validinternationalmobile phone
     */
    isValidInternationalPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // 移除all空格、破折号等
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // 长度check
        if (cleaned.length < 10 || cleaned.length > 15) {
            return false;
        }
        
        // check是否全是相同数字
        if (/^(\+?)\d*(\d)\2{8,}$/.test(cleaned)) {
            return false;
        }
        
        // check是否是简单递增or递减序列
        if (/^(\+?)\d*(?:0123456789|9876543210)/.test(cleaned)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * useregexexpressionextractemail
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
     * check是否是validemail地址
     */
    isValidEmailAddress(email) {
        if (!email || typeof email !== 'string') return false;
        
        // 基本formatcheck
        if (!this.regexCache.emailPattern.test(email)) {
            return false;
        }
        
        // 分解email地址
        const [localPart, domain] = email.split('@');
        
        // 本地部分check
        if (localPart.length > 64) {
            return false;
        }
        
        // domain部分check
        if (!this.isValidDomainName(domain)) {
            return false;
        }
        
        return true;
    }
}

// exportAPIthrough滤器
window.APIFilter = APIFilter;

// create全局实例
window.apiFilter = new APIFilter();

// 兼容SnowEyes接口
window.SCANNER_FILTER = window.SCANNER_FILTER || {};
window.SCANNER_FILTER.api = function(match, resultsSet) {
    return window.apiFilter.filterAPI(match, resultsSet);
};

// add敏感informationextract接口
window.SCANNER_FILTER.extractSensitiveInfo = function(text, resultsSet) {
    return window.apiFilter.extractSensitiveInfo(text, resultsSet);
};