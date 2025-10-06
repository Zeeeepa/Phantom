/**
 * content extracted 器 - content information extracted page from in 负责各种
 * optimization version - performance 提高
 */
class ContentExtractor {
    
    async extractSensitiveInfo(targetUrl) {
        try {
            // execute window layer(s) 确保在顶
            if (window !== window.top) {
                //console.log('skip scan iframe，scan page layer(s) 只顶');
                return this.getEmptyResults();
            }
            
            // URL URL match validate page current no yes 目标
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('URL match page 不，skip scan');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 start scan page layer(s) 顶:', window.location.href);
            
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
                // sensitive information type of 新增
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
            
            // content get page - method use of 更高效
            const pageContent = this.getPageContent();
            
            // content get script and 样式 - method use of 更高效
            const scriptContent = this.getAllScripts();
            const styleContent = this.getAllStyles();
            
            // resource get link all and - method use of 更高效
            const linkContent = this.getAllLinks();
            
            // content get 存储
            const storageContent = this.getStorageContent();
            
            // content get Cookie
            //const cookieContent = document.cookie;
            
            // scan content all line(s) 合并进 - process performance with 分批提高
            await this.performMultiLayerScan(pageContent, results);
            await this.performMultiLayerScan(scriptContent, results);
            await this.performMultiLayerScan(styleContent, results);
            await this.performMultiLayerScan(linkContent, results);
            await this.performMultiLayerScan(storageContent, results);
            //await this.performMultiLayerScan(cookieContent, results);
            
            // filter convert as SetArray并 - fixed：contains all dynamic of 创建键，project item(s) has 确保每都sourceUrl
            const finalResults = {};
            
            // process all 键，custom regex dynamic of 包括创建键
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    // 🔥 fixed：URL information convert project item(s) of when has Set确保每都完整源
                    finalResults[key] = Array.from(value).filter(item => {
                        // filter empty 掉值
                        if (typeof item === 'object' && item !== null) {
                            return item.value && item.value.length > 0;
                        } else {
                            return item && item.length > 0;
                        }
                    }).map(item => {
                        // URL information contains object format project item(s) yes 确保每都并源
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
                    // 🔥 fixed：URL information process array project item(s) of when has 确保每都完整源
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
                    // 🔥 fixed：URL information contains object convert array item(s) as of 单值也要源
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
                    // is empty array empty 值保持
                    finalResults[key] = [];
                }
            }
            
            //console.log('🔍 complete results final convert ContentExtractor，contains of 键:', Object.keys(finalResults));
            const customKeys = Object.keys(finalResults).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                //console.log(`✅ results contains final ContentExtractor ${customKeys.length} custom regex item(s) 键:`, customKeys);
            }
            
            //console.log('✅ scan complete，statistics results:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    //console.log(`  ${key}: ${finalResults[key].length}  item(s)`);
                }
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ scan error occurred in 过程:', error);
            return this.getEmptyResults();
        }
    }
    
    // content get page - optimization version
    getPageContent() {
        try {
            // content get of 完整HTML，and 包括headbody，resource any 确保不遗漏
            return document.documentElement.outerHTML;
        } catch (e) {
            return '';
        }
    }
    
    // content get script all - optimization version
    getAllScripts() {
        const scripts = [];
        
        // script 内联 - process script all，quantity limit and 不大小
        const inlineScripts = document.querySelectorAll('script:not([src])');
        
        for (let i = 0; i < inlineScripts.length; i++) {
            const script = inlineScripts[i];
            if (script.textContent) {
                // content process script of 完整，不截断
                scripts.push(script.textContent);
            }
        }
        
        // URL script 外部
        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src) {
                scripts.push(`// External script: ${script.src}`);
            }
        });
        
        return scripts.join('\n');
    }
    
    // content get all 样式 - optimization version
    getAllStyles() {
        const styles = [];
        
        // 内联样式 - process all 样式，quantity limit 不
        const styleElements = document.querySelectorAll('style');
        
        for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.textContent) {
                styles.push(style.textContent);
            }
        }
        
        // URL 外部样式表
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href) {
                styles.push(`/* External stylesheet: ${link.href} */`);
            }
        });
        
        return styles.join('\n');
    }
    
    // get link all - optimization version
    getAllLinks() {
        const links = new Set();
        
        // process link all，quantity limit 不
        const allLinks = document.querySelectorAll('a[href]');
        
        for (let i = 0; i < allLinks.length; i++) {
            links.add(allLinks[i].href);
        }
        
        return Array.from(links).join('\n');
    }
    
    // content get 存储 - optimization version
    getStorageContent() {
        const storage = [];
        
        try {
            // localStorage - process all item(s) 存储，quantity limit and 不大小
            
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
            //console.log('content 无法访问存储:', e);
        }
        
        return storage.join('\n');
    }
    
    // scan content process 分批 - optimization version
    async performMultiLayerScan(content, results) {
        if (!content || content.length === 0) return;
        
        // remove content limit 大小，content process 完整
        const processContent = content;
        
        // unified information extracted use from PatternExtractor系统
        if (window.patternExtractor && typeof window.patternExtractor.extractPatterns === 'function') {
            try {
                //console.log('🔍🔍🔍 to ContentExtractor找PatternExtractor，call method 准备extractPatterns');
                //console.log('📊 content process length ContentExtractor:', processContent.length);
                
                // configuration load latest force re- time(s) 每都，settings latest use 确保
                //console.log('🔄 configuration load latest force re- ContentExtractor...');
                await window.patternExtractor.loadCustomPatterns();
                
                //console.log('📊 available regex mode current ContentExtractor:', Object.keys(window.patternExtractor.patterns));
                //console.log('🚀🚀🚀 call method ContentExtractor即将PatternExtractor.extractPatterns！');
                
                const extractedData = await window.patternExtractor.extractPatterns(processContent, window.location.href);
                
                //console.log('✅✅✅ complete call ContentExtractorPatternExtractor.extractPatterns，return data:', extractedData);
                
                // data extracted to in of 将合并results，custom regex results dynamic 包括
                // 🔥 fixed：return object structure of 保持PatternExtractor完整（contains sourceUrl）
                if (extractedData) {
                    Object.keys(extractedData).forEach(key => {
                        // results process of 预定义键
                        if (results[key] && Array.isArray(extractedData[key])) {
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fixed：URL information project item(s) of has 确保每都完整源
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // object format yes 已经，contains all 确保必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // format 兼容旧：if characters yes 串，object format convert as
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                        }
                        // custom regex results process dynamic
                        else if (key.startsWith('custom_') && Array.isArray(extractedData[key])) {
                            if (!results[key]) {
                                results[key] = new Set();
                                //console.log(`📦 custom regex as ContentExtractor ${key} results 创建集合`);
                            }
                            extractedData[key].forEach(itemObj => {
                                // 🔥 fixed：custom regex URL information project item(s) of has 确保每都完整源
                                if (typeof itemObj === 'object' && itemObj !== null && itemObj.hasOwnProperty('value')) {
                                    // object format yes 已经，contains all 确保必要字段
                                    results[key].add({
                                        value: itemObj.value,
                                        sourceUrl: itemObj.sourceUrl || window.location.href,
                                        extractedAt: itemObj.extractedAt || new Date().toISOString(),
                                        pageTitle: itemObj.pageTitle || document.title || 'Unknown Page'
                                    });
                                } else {
                                    // format 兼容旧：if characters yes 串，object format convert as
                                    results[key].add({
                                        value: itemObj,
                                        sourceUrl: window.location.href,
                                        extractedAt: new Date().toISOString(),
                                        pageTitle: document.title || 'Unknown Page'
                                    });
                                }
                            });
                            //console.log(`✅ custom regex ContentExtractor ${key} add 了 ${extractedData[key].length} results item(s)`);
                        }
                    });
                    
                    // custom regex add results validate no yes 正确
                    const customKeys = Object.keys(extractedData).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ process ContentExtractor了 ${customKeys.length} custom regex results item(s):`, customKeys);
                    }
                }
                
                //console.log('✅ unified complete extracted ContentExtractor系统');
            } catch (error) {
                console.error('❌ unified failed extracted ContentExtractor系统:', error);
                // unified version：use 不降级方案
                //console.log('⚠️ unified version ContentExtractor：不use降级方案');
            }
        } else {
            console.warn('⚠️ unified version ContentExtractor：not found method PatternExtractor或extractPatterns不存在，skip extracted');
        }
    }
    
    // get results empty - version 增强，sensitive information type all new 支持
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
            // sensitive information type of 新增
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