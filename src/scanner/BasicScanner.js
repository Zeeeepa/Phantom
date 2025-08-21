/**
 * 基础扫描器 - 负责页面内容的基础扫描
 */
class BasicScanner {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async startScan(silent = false) {
        const loading = document.getElementById('loading');
        const scanBtn = document.getElementById('scanBtn');
        const scanBtnText = scanBtn.querySelector('.text');
        
        if (!silent) {
            loading.style.display = 'block';
            scanBtn.disabled = true;
            if (scanBtnText) {
                scanBtnText.textContent = '扫描中...';
            }
            scanBtn.classList.add('scanning');
        }
        
        try {
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 检查URL是否有效
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('无法扫描系统页面');
            }
            
            // 更新当前扫描域名显示
            this.srcMiner.updateCurrentDomain(tab.url);
            
            // 方法1: 尝试直接从content script获取结果
            let results = null;
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractInfo', targetUrl: tab.url });
                if (response) {
                    results = response;
                }
            } catch (contentError) {
                console.log('Content script未响应，尝试注入脚本');
            }
            
            // 方法2: 如果content script没有响应，注入新的脚本到主框架
            if (!results) {
                try {
                    const injectionResults = await chrome.scripting.executeScript({
                        target: { 
                            tabId: tab.id,
                            allFrames: false  // 只在主框架执行，不在iframe中执行
                        },
                        function: this.extractSensitiveInfo,
                        args: [tab.url]  // 传递目标URL
                    });
                    
                    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                        results = injectionResults[0].result;
                    }
                } catch (injectionError) {
                    console.error('脚本注入失败:', injectionError);
                    throw new Error('无法访问页面内容，请刷新页面后重试');
                }
            }
            
            if (results) {
                this.srcMiner.results = results;
                this.srcMiner.saveResults();
                this.srcMiner.displayResults();
                if (!silent) {
                    this.showScanComplete();
                }
            } else {
                throw new Error('未能获取扫描结果');
            }
            
        } catch (error) {
            console.error('扫描失败:', error);
            if (!silent) {
                this.showError(error.message || '扫描失败，请刷新页面后重试');
            }
        } finally {
            if (!silent) {
                loading.style.display = 'none';
                scanBtn.disabled = false;
                if (scanBtnText) {
                    scanBtnText.textContent = '重新扫描';
                }
                scanBtn.classList.remove('scanning');
            }
        }
    }
    
    showScanComplete() {
        const scanBtn = document.getElementById('scanBtn');
        const originalText = scanBtn.textContent;
        scanBtn.textContent = '✅ 扫描完成';
        scanBtn.style.background = 'rgba(0, 212, 170, 0.3)';
        
        setTimeout(() => {
            scanBtn.textContent = originalText;
            scanBtn.style.background = '';
        }, 2000);
    }
    
    showError(message) {
        const scanBtn = document.getElementById('scanBtn');
        scanBtn.textContent = '❌ 扫描失败';
        scanBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        
        // 显示错误详情
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h3>扫描失败</h3>
                <p>${message}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    请尝试以下解决方案：<br>
                    1. 刷新页面后重试<br>
                    2. 确保页面完全加载<br>
                    3. 检查是否为系统页面
                </p>
            </div>
        `;
        
        setTimeout(() => {
            scanBtn.textContent = '重新扫描';
            scanBtn.style.background = '';
        }, 3000);
    }
    
    // 注入到页面中执行的提取函数
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
            
            console.log('🔍 BasicScanner开始扫描页面:', window.location.href);
            
            // 检查是否有新的模块化系统可用
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                console.log('🔄 BasicScanner使用新的模块化提取系统');
                try {
                    // 确保PatternExtractor已经初始化并加载了最新配置
                    if (!window.patternExtractor) {
                        console.log('🔧 BasicScanner初始化PatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                // 重新加载自定义正则并等待生效
                try {
                    if (typeof window.patternExtractor.loadCustomPatterns === 'function') {
                        await window.patternExtractor.loadCustomPatterns();
                    }
                    if (typeof window.patternExtractor.ensureCustomPatternsLoaded === 'function') {
                        await window.patternExtractor.ensureCustomPatternsLoaded();
                    }
                } catch (e) {
                    console.warn('加载自定义正则失败（忽略继续）:', e);
                }
                
                // 创建ContentExtractor并执行提取
                const contentExtractor = new ContentExtractor();
                const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                console.log('✅ BasicScanner新系统提取完成，结果:', results);
                return results;
                } catch (error) {
                    console.error('❌ BasicScanner新系统提取失败，使用降级方案:', error);
                }
            }
            
            // 降级方案：使用基础的提取逻辑
            console.log('📋 BasicScanner使用基础提取逻辑');
            return this.performBasicExtraction();
            
        } catch (error) {
            console.error('❌ BasicScanner扫描过程中出错:', error);
            return this.getEmptyResults();
        }
    }
    
    // 基础提取逻辑（降级方案）
    performBasicExtraction() {
        const results = this.getEmptyResults();
        
        // 获取页面内容
        const content = document.body ? document.body.innerHTML : '';
        const scripts = Array.from(document.scripts).map(s => s.innerHTML || s.textContent || '').join('\n');
        const allContent = content + '\n' + scripts;
        
        if (!allContent) {
            return results;
        }
        
        // 基础API提取
        const apiPattern = /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\{\}\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g;
        let match;
        while ((match = apiPattern.exec(allContent)) !== null) {
            const path = match[0].slice(1, -1); // 移除引号
            if (path.startsWith('/')) {
                results.absoluteApis.push(path);
            } else if (!path.startsWith('http') && path.includes('/')) {
                results.relativeApis.push(path);
            }
        }
        
        // 基础域名提取
        const domainPattern = /([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)/g;
        while ((match = domainPattern.exec(allContent)) !== null) {
            const domain = match[1];
            if (domain && domain.includes('.') && domain.length > 3) {
                results.domains.push(domain);
            }
        }
        
        // 基础邮箱提取
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        while ((match = emailPattern.exec(allContent)) !== null) {
            results.emails.push(match[0]);
        }
        
        // 基础手机号提取
        const phonePattern = /(?:\+86|86)?[-\s]?1[3-9]\d{9}/g;
        while ((match = phonePattern.exec(allContent)) !== null) {
            results.phoneNumbers.push(match[0]);
        }
        
        // 去重并转换为数组
        Object.keys(results).forEach(key => {
            if (Array.isArray(results[key])) {
                results[key] = [...new Set(results[key])].filter(item => item && item.length > 0);
            }
        });
        
        console.log('📊 BasicScanner基础提取完成:', results);
        return results;
    }

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
            vueFiles: []
        };
    }
}