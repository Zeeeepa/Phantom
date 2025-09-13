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
                //console.log('Content script未响应，尝试注入脚本');
            }
            
            // 方法2: 如果content script没有响应，注入必要的脚本文件
            if (!results) {
                try {
                    // 先注入依赖的脚本文件
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: false },
                        files: [
                            'src/scanner/PatternExtractor.js',
                            'src/scanner/ContentExtractor.js'
                        ]
                    });
                    
                    // 然后执行提取函数
                    const injectionResults = await chrome.scripting.executeScript({
                        target: { 
                            tabId: tab.id,
                            allFrames: false
                        },
                        function: this.extractSensitiveInfo,
                        args: [tab.url]
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
            //console.log('🚀🚀🚀 BasicScanner.extractSensitiveInfo 方法被调用！时间戳:', Date.now());
            //console.log('🚀🚀🚀 BasicScanner 目标URL:', targetUrl);
            //console.log('🚀🚀🚀 BasicScanner 当前URL:', window.location.href);
            
            // 确保在顶层窗口执行
            if (window !== window.top) {
                //console.log('跳过iframe扫描，只扫描顶层页面');
                return this.getEmptyResults();
            }
            
            // 验证当前页面URL是否匹配目标URL
            if (targetUrl && window.location.href !== targetUrl) {
                //console.log('页面URL不匹配，跳过扫描');
                return this.getEmptyResults();
            }
            
            //console.log('🔍 BasicScanner开始扫描页面:', window.location.href);
            
            // 检查是否有新的模块化系统可用
            if (typeof PatternExtractor !== 'undefined' && typeof ContentExtractor !== 'undefined') {
                //console.log('🔄 BasicScanner使用统一化正则提取系统');
                try {
                    // 确保PatternExtractor已经初始化并加载了最新配置
                    //console.log('🔧 BasicScanner检查PatternExtractor状态...');
                    
                    if (!window.patternExtractor) {
                        //console.log('🔧 BasicScanner初始化新的PatternExtractor...');
                        window.patternExtractor = new PatternExtractor();
                    }
                    
                    // 每次扫描都强制重新加载最新配置，确保使用最新设置
                    //console.log('🔄 BasicScanner强制重新加载最新配置...');
                    await window.patternExtractor.loadCustomPatterns();
                    
                    //console.log('✅ BasicScanner配置检查完成');
                    //console.log('📊 BasicScanner最终可用的正则模式:', Object.keys(window.patternExtractor.patterns));
                    
                    // 验证自定义正则是否存在
                    const customKeys = Object.keys(window.patternExtractor.patterns).filter(key => key.startsWith('custom_'));
                    if (customKeys.length > 0) {
                        //console.log(`✅ BasicScanner发现 ${customKeys.length} 个自定义正则:`, customKeys);
                    } else {
                        console.warn('⚠️ BasicScanner未发现任何自定义正则');
                    }
                    
                    // 创建ContentExtractor并执行提取
                    const contentExtractor = new ContentExtractor();
                    const results = await contentExtractor.extractSensitiveInfo(window.location.href);
                    //console.log('✅ BasicScanner统一化系统提取完成，结果:', results);
                    //console.log('🌐 [DEBUG] BasicScanner扫描完成 - URL:', window.location.href);
                    return results;
                } catch (error) {
                    console.error('❌ BasicScanner统一化系统提取失败:', error);
                    // 统一化版本：不使用降级方案，直接返回空结果
                    //console.log('⚠️ BasicScanner统一化版本：不使用降级方案，返回空结果');
                    return this.getEmptyResults();
                }
            }
            
            // 统一化版本：如果没有模块化系统，直接返回空结果
            //console.log('⚠️ BasicScanner统一化版本：未找到统一化提取系统，返回空结果');
            return this.getEmptyResults();
            
        } catch (error) {
            console.error('❌ BasicScanner扫描过程中出错:', error);
            return this.getEmptyResults();
        }
    }
    

    getEmptyResults() {
        const baseResults = {
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
        
        // 注意：这里不能异步获取自定义正则配置，因为这是同步函数
        // 自定义正则的空结果会在PatternExtractor中处理
        //console.log('📦 BasicScanner返回基础空结果结构');
        
        return baseResults;
    }
}