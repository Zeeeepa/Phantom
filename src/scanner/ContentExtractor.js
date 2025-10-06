/**
 * content extract 器 - 负责from page content in extract 各种 information
 * optimization version - 提高 performance
 */
class ContentExtractor {
    
    async extractSensitiveInfo(targetUrl) {
        try {
            // 确保in顶层 window execute
            if (window !== window.top) {
                //console.log('skipiframe scan，只 scan 顶层 page');
                return this.getEmptyResults();
            }
            
            // validate current page URL是否 match 目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('page URLdo not match，skip scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 start scan 顶层 page:', window.location.href);
            
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
                // 新增 敏感 information type
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
            
            // 获取 page content - use更高效  method
            const pageContent = this.getPageContent();
            
            // 获取 script and style content - use更高效  method
            const scriptContent = this.getAllScripts();
            const styleContent = this.getAllStyles();
            
            // 获取all link and resource - use更高效  method
            const linkContent = this.getAllLinks();
            
            // 获取 storage content
            const storageContent = this.getStorageContent();
            
            // 获取Cookie content
            //const cookieContent = document.cookie;
            
            // 合并all content 进行 scan - 分批 process 以提高 performance
            await this.performMultiLayerScan(pageContent, results);
            await this.performMultiLayerScan(scriptContent, results);
            await this.performMultiLayerScan(styleContent, results);
            await this.performMultiLayerScan(linkContent, results);
            await this.performMultiLayerScan(storageContent, results);
            //await this.performMultiLayerScan(cookieContent, results);
            
            // convertSettoArray并 filter - fix：contains all dynamic 创建  key，确保每个项目都有sourceUrl
            const finalResults = {};
            
            // process all key，package 括 dynamic 创建  custom regex key
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 🔥 fix：convertSet时确保每个项目都有complete 源URL information
                    finalResults[key] = Array.from(value).filter(item => {
                        // filter 掉 empty value
                        if (typeof item === 'object' && item !== null) {
                            return item.value && item.value.length > 0;
                        } else {
                            return item && item.length > 0;
                        }
                    }).map(item => {
                        // 确保每个项目都是 object format 并 contains 源URL information
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
                    // 🔥 fix：process array 时确保每个项目都有complete 源URL information
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
                    // 🔥 fix：single value 也要convertto contains 源URL information   object array
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
                    // empty value 保持to empty array
                    finalResults[key] = [];
                }
            }
            
            //console.log('🔍 ContentExtractor最终 result convert complete，contains   key:', Object.keys(finalResults));
            const customKeys = Object.keys(finalResults).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ ContentExtractor最终 result contains ${customKeys.length} 个 custom regex key:`, customKeys);
            }
            
            //console.log('✅ scan complete，result statistics:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    //console.log(`  ${key}: ${finalResults[key].length} 个`);
                }
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ scan through程in出错:', error);
            return this.getEmptyResults();
        }
    }
    
    // 获取 page content - optimization version
    getPageContent() {
        try {
            // 获取complete HTML content，package 括headandbody，确保do not遗漏任何 resource
            return document.documentElement.outerHTML;
        } catch (e) {
            return '';
        }
    }
    
    // 获取all script content - optimization version
    getAllScripts() {
        const scripts = [];
        
        // 内联 script - process all script，do not limit count and size
        const inlineScripts = document.querySelectorAll('script:not([src])');
        
        for (let i = 0; i < inlineScripts.length; i++) {
            const script = inlineScripts[i];
            if (script.textContent) {
                // process complete  script content，do not截断
                scripts.push(script.textContent);
            }
        }
        
        // 外部 script URL
        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src) {
                scripts.push(`// External script: ${script.src}`);
            }
        });
        
        return scripts.join('\n');
    }
    
    // 获取all style content - optimization version
    getAllStyles() {
        const styles = [];
        
        // 内联 style - process all style，do not limit count
        const styleElements = document.querySelectorAll('style');
        
        for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.textContent) {
                styles.push(style.textContent);
            }
        }
        
        // 外部 style 表URL
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href) {
                styles.push(`/* External stylesheet: ${link.href} */`);
            }
        });
        
        return styles.join('\n');
    }
    
    // 获取all link - optimization version
    getAllLinks() {
        const links = new Set();
        
        // process all link，do not limit count
        const allLinks = document.querySelectorAll('a[href]');
        
        for (let i = 0; i < allLinks.length; i++) {
            links.add(allLinks[i].href);
        }
        
        return Array.from(links).join('\n');
    }
    
    // 获取 storage content - optimization version
    getStorageContent() {
        const storage = [];
        
        try {
            // localStorage - process all storage 项，do not limit count and size
            
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
            //console.log('无法访问 storage content:', e);
        }
        
        return storage.join('\n');
    }
    
    // 分批 process content scan - optimization version
    async performMultiLayerScan(content, results) {
        if (!content || content.length === 0) return;
        
        // remove content size limit，process complete content
        const processContent = content;
        
        // usePatternExtractorunified化 system 来 extract information
        if (window.patternExtractor && typeof window.patternExtractor.extractPatterns === 'function') {
            try {
                //console.log('🔍🔍🔍 ContentExtractor找到PatternExtractor，准备调用extractPatterns method');
                //console.log('📊 ContentExtractor process content length:', processContent.length);
                
                // every time都 force 重新 load 最新 configuration，确保use最新 settings
                //console.log('🔄 ContentExtractor force 重新 load 最新 configuration ...');
                await window.patternExtractor.loadCustomPatterns();
                
                //console.log('📊 ContentExtractor current 可用  regex mode:', Object.keys(window.patternExtractor.patterns));
                //console.log('🚀🚀🚀 ContentExtractor即将调用PatternExtractor.extractPatterns method！');
                
                const extractedData = await window.patternExtractor.extractPatterns(processContent, window.location.href);
                
                //console.log('✅✅✅ ContentExtractor调用PatternExtractor.extractPatterns complete，返回 data:', extractedData);
                
                // 将 extract   data 合并到resultsin，package 括 dynamic custom regex result
                // 🔥 fix：保持PatternExtractor返回 complete object 结构（contains sourceUrl）
                if (extractedData) {
                    Object.keys(extractedData).forEach(key => {
                        // process 预定义  result key
                        if (results[key] && Array.isArray(extractedData[key])) {
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fix：确保每个项目都有complete 源URL information
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // already经是 object format，确保 contains all必要 field
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧 format：如果是 string，convertto object format
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                        }
                        // process dynamic custom regex result
                        else if (key.startsWith('custom_') && Array.isArray(extractedData[key])) {
                            if (!results[key]) {
                                results[key] = new Set();
                                //console.log(`📦 ContentExtractorto custom regex ${key} 创建 result set`);
                            }
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fix：确保每个 custom regex 项目都有complete 源URL information
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // already经是 object format，确保 contains all必要 field
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // 兼容旧 format：如果是 string，convertto object format
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                            //console.log(`✅ ContentExtractor custom regex ${key} add 了 ${extractedData[key].length} 个 result`);
                        }
                    });
                    
                    // validate custom regex result 是否正确 add
                    const customKeys = Object.keys(extractedData).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ ContentExtractor process 了 ${customKeys.length} 个 custom regex result:`, customKeys);
                    }
                }
                
                //console.log('✅ ContentExtractorunified化 system extract complete');
            } catch (error) {
                console.error('❌ ContentExtractorunified化 system extract failed:', error);
                // unified化 version：do notuse降级方案
                //console.log('⚠️ ContentExtractorunified化 version：do notuse降级方案');
            }
        } else {
            console.warn('⚠️ ContentExtractorunified化 version：PatternExtractor未找到orextractPatterns method do not存in，skip extract');
        }
    }
    
    // 获取 empty result - enhanced version，supportall新 敏感 information type
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
            // 新增 敏感 information type
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