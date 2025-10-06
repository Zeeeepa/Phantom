/**
 * Content extraction器 - 负责fromPageContent中Extract各种Information
 * 优化版本 - 提高性能
 */
class ContentExtractor {
    
    async extractSensitiveInfo(targetUrl) {
        try {
            // Ensure在顶层窗口Execute
            if (window !== window.top) {
                //console.log('跳过iframeScan，OnlyScan顶层Page');
                return this.getEmptyResults();
            }
            
            // ValidateCurrentPageURL是否MatchTargetURL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('PageURL不Match，跳过Scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 Start scanning顶层Page:', window.location.href);
            
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
                // 新增的敏感InformationType
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
            
            // GetPageContent - 使用更高效的Method
            const pageContent = this.getPageContent();
            
            // GetScriptAnd样式Content - 使用更高效的Method
            const scriptContent = this.getAllScripts();
            const styleContent = this.getAllStyles();
            
            // Get所有链接AndResource - 使用更高效的Method
            const linkContent = this.getAllLinks();
            
            // Get存储Content
            const storageContent = this.getStorageContent();
            
            // GetCookieContent
            //const cookieContent = document.cookie;
            
            // 合And所有ContentPerformScan - 分批Process以提高性能
            await this.performMultiLayerScan(pageContent, results);
            await this.performMultiLayerScan(scriptContent, results);
            await this.performMultiLayerScan(styleContent, results);
            await this.performMultiLayerScan(linkContent, results);
            await this.performMultiLayerScan(storageContent, results);
            //await this.performMultiLayerScan(cookieContent, results);
            
            // ConvertSet为ArrayAndFilter - Fix：包含所有动态Create的Key，EnsureEvery个Project都有sourceUrl
            const finalResults = {};
            
            // Process所有Key，包括动态Create的Custom正则Key
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 🔥 Fix：ConvertSet时EnsureEvery个Project都有Complete的SourceURLInformation
                    finalResults[key] = Array.from(value).filter(item => {
                        // Filter掉Empty值
                        if (typeof item === 'object' && item !== null) {
                            return item.value && item.value.length > 0;
                        } else {
                            return item && item.length > 0;
                        }
                    }).map(item => {
                        // EnsureEvery个Project都是ObjectFormatAnd包含SourceURLInformation
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
                    // 🔥 Fix：Process数Group时EnsureEvery个Project都有Complete的SourceURLInformation
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
                    // 🔥 Fix：Single值也要Convert为包含SourceURLInformation的Object数Group
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
                    // Empty值保持is empty数Group
                    finalResults[key] = [];
                }
            }
            
            //console.log('🔍 ContentExtractor最终ResultConvertComplete，包含的Key:', Object.keys(finalResults));
            const customKeys = Object.keys(finalResults).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ ContentExtractor最终Result包含 ${customKeys.length} 个Custom正则Key:`, customKeys);
            }
            
            //console.log('✅ Scan completed，ResultStatistics:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    //console.log(`  ${key}: ${finalResults[key].length} 个`);
                }
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ Scan过程中出错:', error);
            return this.getEmptyResults();
        }
    }
    
    // GetPageContent - 优化版本
    getPageContent() {
        try {
            // GetComplete的HTMLContent，包括headAndbody，Ensure不遗漏任何Resource
            return document.documentElement.outerHTML;
        } catch (e) {
            return '';
        }
    }
    
    // Get所有ScriptContent - 优化版本
    getAllScripts() {
        const scripts = [];
        
        // 内联Script - Process所有Script，不限制数量And大小
        const inlineScripts = document.querySelectorAll('script:not([src])');
        
        for (let i = 0; i < inlineScripts.length; i++) {
            const script = inlineScripts[i];
            if (script.textContent) {
                // ProcessComplete的ScriptContent，不截断
                scripts.push(script.textContent);
            }
        }
        
        // 外部ScriptURL
        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src) {
                scripts.push(`// External script: ${script.src}`);
            }
        });
        
        return scripts.join('\n');
    }
    
    // Get所有样式Content - 优化版本
    getAllStyles() {
        const styles = [];
        
        // 内联样式 - Process所有样式，不限制数量
        const styleElements = document.querySelectorAll('style');
        
        for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.textContent) {
                styles.push(style.textContent);
            }
        }
        
        // 外部样式TableURL
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href) {
                styles.push(`/* External stylesheet: ${link.href} */`);
            }
        });
        
        return styles.join('\n');
    }
    
    // Get所有链接 - 优化版本
    getAllLinks() {
        const links = new Set();
        
        // Process所有链接，不限制数量
        const allLinks = document.querySelectorAll('a[href]');
        
        for (let i = 0; i < allLinks.length; i++) {
            links.add(allLinks[i].href);
        }
        
        return Array.from(links).join('\n');
    }
    
    // Get存储Content - 优化版本
    getStorageContent() {
        const storage = [];
        
        try {
            // localStorage - Process所有存储Item，不限制数量And大小
            
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
            //console.log('None法访问存储Content:', e);
        }
        
        return storage.join('\n');
    }
    
    // 分批ProcessContentScan - 优化版本
    async performMultiLayerScan(content, results) {
        if (!content || content.length === 0) return;
        
        // RemoveContent大小限制，ProcessCompleteContent
        const processContent = content;
        
        // 使用PatternExtractorUnified化System来Extract information
        if (window.patternExtractor && typeof window.patternExtractor.extractPatterns === 'function') {
            try {
                //console.log('🔍🔍🔍 ContentExtractorFoundPatternExtractor，Prepare调用extractPatternsMethod');
                //console.log('📊 ContentExtractorProcessContent长度:', processContent.length);
                
                // Every次都强制Reload最新Configuration，Ensure使用最新Settings
                //console.log('🔄 ContentExtractor强制Reload最新Configuration...');
                await window.patternExtractor.loadCustomPatterns();
                
                //console.log('📊 ContentExtractorCurrentAvailable的正则Pattern:', Object.keys(window.patternExtractor.patterns));
                //console.log('🚀🚀🚀 ContentExtractor即将调用PatternExtractor.extractPatternsMethod！');
                
                const extractedData = await window.patternExtractor.extractPatterns(processContent, window.location.href);
                
                //console.log('✅✅✅ ContentExtractor调用PatternExtractor.extractPatternsComplete，ReturnData:', extractedData);
                
                // 将Extract的Data合And到results中，包括动态Custom正则Result
                // 🔥 Fix：保持PatternExtractorReturn的CompleteObject结构（包含sourceUrl）
                if (extractedData) {
                    Object.keys(extractedData).forEach(key => {
                        // Process预定义的ResultKey
                        if (results[key] && Array.isArray(extractedData[key])) {
                            extractedData[key].forEach(itemObj => {
                                // 🔥 Fix：EnsureEvery个Project都有Complete的SourceURLInformation
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // Already经是ObjectFormat，Ensure包含所有必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧Format：如果是字符串，Convert为ObjectFormat
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                        }
                        // Process动态Custom正则Result
                        else if (key.startsWith('custom_') && Array.isArray(extractedData[key])) {
                            if (!results[key]) {
                                results[key] = new Set();
                                //console.log(`📦 ContentExtractor为Custom正则 ${key} CreateResult集合`);
                            }
                            extractedData[key].forEach(itemObj => {
                                // 🔥 Fix：EnsureEvery个Custom正则Project都有Complete的SourceURLInformation
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // Already经是ObjectFormat，Ensure包含所有必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧Format：如果是字符串，Convert为ObjectFormat
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                            //console.log(`✅ ContentExtractorCustom正则 ${key} Add了 ${extractedData[key].length} 个Result`);
                        }
                    });
                    
                    // ValidateCustom正则Result是否正确Add
                    const customKeys = Object.keys(extractedData).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ ContentExtractorProcess了 ${customKeys.length} 个Custom正则Result:`, customKeys);
                    }
                }
                
                //console.log('✅ ContentExtractorUnified化SystemExtraction completed');
            } catch (error) {
                console.error('❌ ContentExtractorUnified化SystemExtractFailed:', error);
                // Unified化版本：不使用降级方案
                //console.log('⚠️ ContentExtractorUnified化版本：不使用降级方案');
            }
        } else {
            console.warn('⚠️ ContentExtractorUnified化版本：PatternExtractorNot foundOrextractPatternsMethod不存在，跳过Extract');
        }
    }
    
    // GetEmptyResult - 增强版本，支持所有新的敏感InformationType
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
            // 新增的敏感InformationType
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