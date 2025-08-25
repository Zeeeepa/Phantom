/**
 * 内容提取器 - 负责从页面内容中提取各种信息
 * 优化版本 - 提高性能
 */
class ContentExtractor {
    
    async extractSensitiveInfo(targetUrl) {
        try {
            // 确保在顶层窗口执行
            if (window !== window.top) {
                console.log('跳过iframe扫描，只扫描顶层页面');
                return this.getEmptyResults();
            }
            
            // 验证当前页面URL是否匹配目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                console.log('页面URL不匹配，跳过扫描');
                return this.getEmptyResults();
            }
            
            console.log('🔍 开始扫描顶层页面:', window.location.href);
            
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
                // 新增的敏感信息类型
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
            
            // 获取页面内容 - 使用更高效的方法
            const pageContent = this.getPageContent();
            
            // 获取脚本和样式内容 - 使用更高效的方法
            const scriptContent = this.getAllScripts();
            const styleContent = this.getAllStyles();
            
            // 获取所有链接和资源 - 使用更高效的方法
            const linkContent = this.getAllLinks();
            
            // 获取存储内容
            const storageContent = this.getStorageContent();
            
            // 获取Cookie内容
            //const cookieContent = document.cookie;
            
            // 合并所有内容进行扫描 - 分批处理以提高性能
            await this.performMultiLayerScan(pageContent, results);
            await this.performMultiLayerScan(scriptContent, results);
            await this.performMultiLayerScan(styleContent, results);
            await this.performMultiLayerScan(linkContent, results);
            await this.performMultiLayerScan(storageContent, results);
            //await this.performMultiLayerScan(cookieContent, results);
            
            // 转换Set为Array并过滤 - 修复：包含所有动态创建的键
            const finalResults = {};
            
            // 处理所有键，包括动态创建的自定义正则键
            for (const [key, value] of Object.entries(results)) {
                if (value instanceof Set) {
                    finalResults[key] = Array.from(value).filter(item => item && item.length > 0);
                } else if (Array.isArray(value)) {
                    finalResults[key] = value.filter(item => item && item.length > 0);
                } else if (value) {
                    finalResults[key] = value;
                }
            }
            
            console.log('🔍 ContentExtractor最终结果转换完成，包含的键:', Object.keys(finalResults));
            const customKeys = Object.keys(finalResults).filter(key => key.startsWith('custom_'));
            if (customKeys.length > 0) {
                console.log(`✅ ContentExtractor最终结果包含 ${customKeys.length} 个自定义正则键:`, customKeys);
            }
            
            console.log('✅ 扫描完成，结果统计:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    console.log(`  ${key}: ${finalResults[key].length} 个`);
                }
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('❌ 扫描过程中出错:', error);
            return this.getEmptyResults();
        }
    }
    
    // 获取页面内容 - 优化版本
    getPageContent() {
        try {
            // 只获取body内容，避免处理整个HTML
            return document.body.innerHTML;
        } catch (e) {
            return '';
        }
    }
    
    // 获取所有脚本内容 - 优化版本
    getAllScripts() {
        const scripts = [];
        
        // 内联脚本 - 限制数量和大小
        const inlineScripts = document.querySelectorAll('script:not([src])');
        const maxScripts = Math.min(inlineScripts.length, 50); // 最多处理50个脚本
        
        for (let i = 0; i < maxScripts; i++) {
            const script = inlineScripts[i];
            if (script.textContent) {
                // 限制每个脚本的大小
                const content = script.textContent;
                scripts.push(content.length > 10000 ? content.substring(0, 10000) : content);
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
    
    // 获取所有样式内容 - 优化版本
    getAllStyles() {
        const styles = [];
        
        // 内联样式 - 限制数量
        const styleElements = document.querySelectorAll('style');
        const maxStyles = Math.min(styleElements.length, 20); // 最多处理20个样式表
        
        for (let i = 0; i < maxStyles; i++) {
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
    
    // 获取所有链接 - 优化版本
    getAllLinks() {
        const links = new Set();
        
        // 限制处理的链接数量
        const allLinks = document.querySelectorAll('a[href]');
        const maxLinks = Math.min(allLinks.length, 200); // 最多处理200个链接
        
        for (let i = 0; i < maxLinks; i++) {
            links.add(allLinks[i].href);
        }
        
        return Array.from(links).join('\n');
    }
    
    // 获取存储内容 - 优化版本
    getStorageContent() {
        const storage = [];
        
        try {
            // localStorage - 限制数量
            const maxItems = 50; // 最多处理50个存储项
            let count = 0;
            
            // localStorage
            for (let i = 0; i < localStorage.length && count < maxItems; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (value && value.length < 1000) { // 限制值的大小
                    storage.push(`localStorage.${key}=${value}`);
                    count++;
                }
            }
            
            // sessionStorage
            for (let i = 0; i < sessionStorage.length && count < maxItems; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                if (value && value.length < 1000) { // 限制值的大小
                    storage.push(`sessionStorage.${key}=${value}`);
                    count++;
                }
            }
        } catch (e) {
            console.log('无法访问存储内容:', e);
        }
        
        return storage.join('\n');
    }
    
    // 分批处理内容扫描 - 优化版本
    async performMultiLayerScan(content, results) {
        if (!content || content.length === 0) return;
        
        // 限制内容大小
        const maxContentSize = 300000; // 约300KB
        const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
        
        // 使用PatternExtractor统一化系统来提取信息
        if (window.patternExtractor && typeof window.patternExtractor.extractPatterns === 'function') {
            try {
                console.log('🔍🔍🔍 ContentExtractor找到PatternExtractor，准备调用extractPatterns方法');
                console.log('📊 ContentExtractor处理内容长度:', processContent.length);
                
                // 每次都强制重新加载最新配置，确保使用最新设置
                console.log('🔄 ContentExtractor强制重新加载最新配置...');
                await window.patternExtractor.loadCustomPatterns();
                
                console.log('📊 ContentExtractor当前可用的正则模式:', Object.keys(window.patternExtractor.patterns));
                console.log('🚀🚀🚀 ContentExtractor即将调用PatternExtractor.extractPatterns方法！');
                
                const extractedData = await window.patternExtractor.extractPatterns(processContent, window.location.href);
                
                console.log('✅✅✅ ContentExtractor调用PatternExtractor.extractPatterns完成，返回数据:', extractedData);
                
                // 将提取的数据合并到results中，包括动态自定义正则结果
                if (extractedData) {
                    Object.keys(extractedData).forEach(key => {
                        // 处理预定义的结果键
                        if (results[key] && Array.isArray(extractedData[key])) {
                            extractedData[key].forEach(item => results[key].add(item));
                        }
                        // 处理动态自定义正则结果
                        else if (key.startsWith('custom_') && Array.isArray(extractedData[key])) {
                            if (!results[key]) {
                                results[key] = new Set();
                                console.log(`📦 ContentExtractor为自定义正则 ${key} 创建结果集合`);
                            }
                            extractedData[key].forEach(item => results[key].add(item));
                            console.log(`✅ ContentExtractor自定义正则 ${key} 添加了 ${extractedData[key].length} 个结果`);
                        }
                    });
                    
                    // 验证自定义正则结果是否正确添加
                    const customKeys = Object.keys(extractedData).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        console.log(`✅ ContentExtractor处理了 ${customKeys.length} 个自定义正则结果:`, customKeys);
                    }
                }
                
                console.log('✅ ContentExtractor统一化系统提取完成');
            } catch (error) {
                console.error('❌ ContentExtractor统一化系统提取失败:', error);
                // 统一化版本：不使用降级方案
                console.log('⚠️ ContentExtractor统一化版本：不使用降级方案');
            }
        } else {
            console.warn('⚠️ ContentExtractor统一化版本：PatternExtractor未找到或extractPatterns方法不存在，跳过提取');
        }
    }
    
    // 获取空结果 - 增强版本，支持所有新的敏感信息类型
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
            // 新增的敏感信息类型
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