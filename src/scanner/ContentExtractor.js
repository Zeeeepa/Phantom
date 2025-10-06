/**
 * 内容extract器 - 负责frompage面内容inextract各种information
 * 优化version - 提high performance
 */
class ContentExtractor {
    
    async extractSensitiveInfo(targetUrl) {
        try {
            // 确保in顶层窗口execute
            if (window !== window.top) {
                //console.log('skipiframescan，只scan顶层page面');
                return this.getEmptyResults();
            }
            
            // validation当beforepage面URL是否match目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('page面URLnotmatch，skipscan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 startscan顶层page面:', window.location.href);
            
            const results = {
                absoluteApis: new Set(),
                relativeApis: new Set(),
                modulePaths: new Set(),
                domains: new Set(),
                urls: new Set(),
                images: new Set(),
                audios: new Set(),
                videos: new Set(),
                jsFiles: new Set(),
                cssFiles: new Set(),
                emails: new Set(),
                phoneNumbers: new Set(),
                ipAddresses: new Set(),
                sensitiveKeywords: new Set(),
                comments: new Set(),
                subdomains: new Set(),
                ports: new Set(),
                paths: new Set(),
                parameters: new Set(),
                credentials: new Set(),
                cookies: new Set(),
                idKeys: new Set(),
                idcards: new Set(),
                companies: new Set(),
                jwts: new Set(),
                githubUrls: new Set(),
                vueFiles: new Set(),
                // new增敏感informationclass型
                bearerTokens: new Set(),
                basicAuth: new Set(),
                authHeaders: new Set(),
                wechatAppIds: new Set(),
                awsKeys: new Set(),
                googleApiKeys: new Set(),
                githubTokens: new Set(),
                gitlabTokens: new Set(),
                webhookUrls: new Set(),
                idCards: new Set(),
                cryptoUsage: new Set()
            };
            
            // getpage面内容 - use更高效方法
            const pageContent = this.getPageContent();
            
            // get脚本and样式内容 - use更高效方法
            const scriptContent = this.getAllScripts();
            const styleContent = this.getAllStyles();
            
            // getall链接and资源 - use更高效方法
            const linkContent = this.getAllLinks();
            
            // getstorage内容
            const storageContent = this.getStorageContent();
            
            // getCookie内容
            //const cookieContent = document.cookie;
            
            // 合andall内容进行scan - 分批处理以提high performance
            await this.performMultiLayerScan(pageContent, results);
            await this.performMultiLayerScan(scriptContent, results);
            await this.performMultiLayerScan(styleContent, results);
            await this.performMultiLayerScan(linkContent, results);
            await this.performMultiLayerScan(storageContent, results);
            //await this.performMultiLayerScan(cookieContent, results);
            
            // convertSet为Arrayandthrough滤 - fix：containsall动态create键，确保每个项目都有sourceUrl
            const finalResults = {};
            
            // 处理all键，including动态createcustomregex键
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 🔥 fix：convertSet时确保每个项目都有complete源URLinformation
                    finalResults[key] = Array.from(value).filter(item => {
                        // through滤掉空value
                        if (typeof item === 'object' && item !== null) {
                            return item.value && item.value.length > 0;
                        } else {
                            return item && item.length > 0;
                        }
                    }).map(item => {
                        // 确保每个项目都是objectformatandcontains源URLinformation
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || window.location.href,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            return {
                                value: item,
                                sourceUrl: window.location.href,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                } else if (Array.isArray(value)) {
                    // 🔥 fix：处理数组时确保每个项目都有complete源URLinformation
                    finalResults[key] = value.filter(item => {
                        if (typeof item === 'object' && item !== null) {
                            return item.value && item.value.length > 0;
                        } else {
                            return item && item.length > 0;
                        }
                    }).map(item => {
                        if (typeof item === 'object' && item !== null && item.hasOwnProperty('value')) {
                            return {
                                value: item.value,
                                sourceUrl: item.sourceUrl || window.location.href,
                                extractedAt: item.extractedAt || new Date().toISOString(),
                                pageTitle: item.pageTitle || document.title || 'Unknown Page'
                            };
                        } else {
                            return {
                                value: item,
                                sourceUrl: window.location.href,
                                extractedAt: new Date().toISOString(),
                                pageTitle: document.title || 'Unknown Page'
                            };
                        }
                    });
                } else if (value) {
                    // 🔥 fix：单个value也要convert为contains源URLinformationobject数组
                    if (typeof value === 'object' && value !== null && value.hasOwnProperty('value')) {
                        finalResults[key] = [{
                            value: value.value,
                            sourceUrl: value.sourceUrl || window.location.href,
                            extractedAt: value.extractedAt || new Date().toISOString(),
                            pageTitle: value.pageTitle || document.title || 'Unknown Page'
                        }];
                    } else {
                        finalResults[key] = [{
                            value: value,
                            sourceUrl: window.location.href,
                            extractedAt: new Date().toISOString(),
                            pageTitle: document.title || 'Unknown Page'
                        }];
                    }
                } else {
                    // 空valuekeep为空数组
                    finalResults[key] = [];
                }
            }
            
            //console.log('🔍 ContentExtractor最终resultconvertcomplete，contains键:', Object.keys(finalResults));
            const customKeys = Object.keys(finalResults).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ ContentExtractor最终resultcontains ${customKeys.length} 个customregex键:`, customKeys);
            }
            
            //console.log('✅ scan complete，result统计:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    //console.log(`  ${key}: ${finalResults[key].length} 个`);
                }
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ scanthrough程in出错:', error);
            return this.getEmptyResults();
        }
    }
    
    // getpage面内容 - 优化version
    getPageContent() {
        try {
            // getcompleteHTML内容，includingheadandbody，确保not遗漏任何资源
            return document.documentElement.outerHTML;
        } catch (e) {
            return '';
        }
    }
    
    // getall脚本内容 - 优化version
    getAllScripts() {
        const scripts = [];
        
        // 内联脚本 - 处理all脚本，not限制数量and大小
        const inlineScripts = document.querySelectorAll('script:not([src])');
        
        for (let i = 0; i < inlineScripts.length; i++) {
            const script = inlineScripts[i];
            if (script.textContent) {
                // 处理complete脚本内容，not截断
                scripts.push(script.textContent);
            }
        }
        
        // 外部脚本URL
        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src) {
                scripts.push(`// External script: ${script.src}`);
            }
        });
        
        return scripts.join('\n');
    }
    
    // getall样式内容 - 优化version
    getAllStyles() {
        const styles = [];
        
        // 内联样式 - 处理all样式，not限制数量
        const styleElements = document.querySelectorAll('style');
        
        for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.textContent) {
                styles.push(style.textContent);
            }
        }
        
        // 外部样式表URL
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href) {
                styles.push(`/* External stylesheet: ${link.href} */`);
            }
        });
        
        return styles.join('\n');
    }
    
    // getall链接 - 优化version
    getAllLinks() {
        const links = new Set();
        
        // 处理all链接，not限制数量
        const allLinks = document.querySelectorAll('a[href]');
        
        for (let i = 0; i < allLinks.length; i++) {
            links.add(allLinks[i].href);
        }
        
        return Array.from(links).join('\n');
    }
    
    // getstorage内容 - 优化version
    getStorageContent() {
        const storage = [];
        
        try {
            // localStorage - 处理allstorage项，not限制数量and大小
            
            // localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (value) {
                    storage.push(`localStorage.${key}=${value}`);
                }
            }
            
            // sessionStorage
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                if (value) {
                    storage.push(`sessionStorage.${key}=${value}`);
                }
            }
        } catch (e) {
            //console.log('无法访问storage内容:', e);
        }
        
        return storage.join('\n');
    }
    
    // 分批处理内容scan - 优化version
    async performMultiLayerScan(content, results) {
        if (!content || content.length === 0) return;
        
        // 移除内容大小限制，处理complete内容
        const processContent = content;
        
        // usePatternExtractorunified化系统来extractinformation
        if (window.patternExtractor && typeof window.patternExtractor.extractPatterns === 'function') {
            try {
                //console.log('🔍🔍🔍 ContentExtractorfoundPatternExtractor，准备调forextractPatterns方法');
                //console.log('📊 ContentExtractor处理内容长度:', processContent.length);
                
                // every time都强制重newload最newconfiguration，确保use最newsettings
                //console.log('🔄 ContentExtractor强制重newload最newconfiguration...');
                await window.patternExtractor.loadCustomPatterns();
                
                //console.log('📊 ContentExtractor当before可forregexpattern:', Object.keys(window.patternExtractor.patterns));
                //console.log('🚀🚀🚀 ContentExtractor即将调forPatternExtractor.extractPatterns方法！');
                
                const extractedData = await window.patternExtractor.extractPatterns(processContent, window.location.href);
                
                //console.log('✅✅✅ ContentExtractor调forPatternExtractor.extractPatternscomplete，returndata:', extractedData);
                
                // 将extractdata合andtoresultsin，including动态customregexresult
                // 🔥 fix：keepPatternExtractorreturncompleteobject结构（containssourceUrl）
                if (extractedData) {
                    Object.keys(extractedData).forEach(key => {
                        // 处理预定义result键
                        if (results[key] && Array.isArray(extractedData[key])) {
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fix：确保每个项目都有complete源URLinformation
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // already经是objectformat，确保containsall必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧format：if是字符串，convert为objectformat
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                        }
                        // 处理动态customregexresult
                        else if (key.startsWith('custom_') && Array.isArray(extractedData[key])) {
                            if (!results[key]) {
                                results[key] = new Set();
                                //console.log(`📦 ContentExtractor为customregex ${key} createresult集合`);
                            }
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fix：确保每个customregex项目都有complete源URLinformation
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // already经是objectformat，确保containsall必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧format：if是字符串，convert为objectformat
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                            //console.log(`✅ ContentExtractorcustomregex ${key} add了 ${extractedData[key].length} 个result`);
                        }
                    });
                    
                    // validationcustomregexresult是否正确add
                    const customKeys = Object.keys(extractedData).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ ContentExtractor处理了 ${customKeys.length} 个customregexresult:`, customKeys);
                    }
                }
                
                //console.log('✅ ContentExtractorunified化系统extractcomplete');
            } catch (error) {
                console.error('❌ ContentExtractorunified化系统extractfailed:', error);
                // unified化version：notuse降级方案
                //console.log('⚠️ ContentExtractorunified化version：notuse降级方案');
            }
        } else {
            console.warn('⚠️ ContentExtractorunified化version：PatternExtractor未foundorextractPatterns方法notexists，skipextract');
        }
    }
    
    // get空result - enhancedversion，supportallnew敏感informationclass型
    getEmptyResults() {
        return {
            absoluteApis: [],
            relativeApis: [],
            modulePaths: [],
            domains: [],
            urls: [],
            images: [],
            audios: [],
            videos: [],
            jsFiles: [],
            cssFiles: [],
            emails: [],
            phoneNumbers: [],
            ipAddresses: [],
            sensitiveKeywords: [],
            comments: [],
            subdomains: [],
            ports: [],
            paths: [],
            parameters: [],
            credentials: [],
            cookies: [],
            idKeys: [],
            idcards: [],
            companies: [],
            jwts: [],
            githubUrls: [],
            vueFiles: [],
            // new增敏感informationclass型
            bearerTokens: [],
            basicAuth: [],
            authHeaders: [],
            wechatAppIds: [],
            awsKeys: [],
            googleApiKeys: [],
            githubTokens: [],
            gitlabTokens: [],
            webhookUrls: [],
            idCards: [],
            cryptoUsage: []
        };
    }
}