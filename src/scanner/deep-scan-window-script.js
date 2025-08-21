// 深度扫描窗口脚本
console.log('🚀 [DEBUG] 深度扫描窗口脚本开始加载...');

// 加载修复补丁 - 确保深度扫描使用所有正则
console.log('🔧 [DEBUG] 准备加载深度扫描修复补丁...');

let scanConfig = null;
let scanResults = {};
let isScanRunning = false;
let isPaused = false;
let currentDepth = 0;
let scannedUrls = new Set();
let pendingUrls = new Set();
let urlContentCache = new Map();
let activeRequests = 0;
let maxConcurrency = 8;
let requestTimeout = 5000;

// 筛选器相关变量
let apiFilter = null;
let domainPhoneFilter = null;
let filtersLoaded = false;
let patternExtractor = null;

// 生成文件名（域名__随机数格式）
async function generateFileName(extension) {
    try {
        let domain = 'scan';
        
        // 深度扫描窗口优先使用配置中的baseUrl获取域名
        if (scanConfig && scanConfig.baseUrl) {
            try {
                const baseUrlObj = new URL(scanConfig.baseUrl);
                domain = baseUrlObj.hostname;
                console.log('使用baseUrl获取域名:', domain);
            } catch (e) {
                console.warn('解析baseUrl失败，尝试其他方式');
                
                // 备选方案：尝试获取原始标签页（非扩展窗口）
                try {
                    const tabs = await chrome.tabs.query({});
                    const webTabs = tabs.filter(tab => 
                        tab.url && 
                        !tab.url.startsWith('chrome-extension://') && 
                        !tab.url.startsWith('chrome://') &&
                        !tab.url.startsWith('moz-extension://')
                    );
                    
                    if (webTabs.length > 0) {
                        const url = new URL(webTabs[0].url);
                        domain = url.hostname;
                        console.log('使用网页标签页获取域名:', domain);
                    }
                } catch (e2) {
                    console.warn('获取网页标签页失败，使用默认域名');
                }
            }
        }
        
        // 生成随机数
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        
        return `${domain}__${randomNum}.${extension}`;
    } catch (error) {
        console.error('生成文件名失败:', error);
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        return `scan__${randomNum}.${extension}`;
    }
}

// 将相对路径转换为完整URL
function convertRelativeToAbsolute(relativePath) {
    try {
        // 获取当前扫描的基础URL
        const baseUrl = scanConfig?.baseUrl || window.location.origin;
        const url = new URL(relativePath, baseUrl);
        return url.href;
    } catch (error) {
        console.error('转换相对路径失败:', error, relativePath);
        // 如果转换失败，返回原始路径
        return relativePath;
    }
}

// 加载筛选器脚本
async function loadFilters() {
    console.log('🔍 [DEBUG] 开始加载筛选器...');
    
    try {
        // 加载域名和手机号筛选器
        await loadScript('filters/domain-phone-filter.js');
        console.log('✅ [DEBUG] 域名和手机号筛选器加载完成');
        
        // 加载API筛选器
        await loadScript('filters/api-filter.js');
        console.log('✅ [DEBUG] API筛选器加载完成');
        
        // 等待筛选器初始化
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 检查筛选器是否可用
        if (typeof window.DomainPhoneFilter !== 'undefined') {
            domainPhoneFilter = new window.DomainPhoneFilter();
            console.log('✅ [DEBUG] 域名和手机号筛选器实例化成功');
        } else {
            console.error('❌ [DEBUG] DomainPhoneFilter未找到');
        }
        
        if (typeof window.APIFilter !== 'undefined') {
            apiFilter = new window.APIFilter();
            console.log('✅ [DEBUG] API筛选器实例化成功');
        } else {
            console.error('❌ [DEBUG] APIFilter未找到');
        }
        
        // 加载 PatternExtractor 并应用自定义正则
        try {
            // 检查并加载SettingsManager（避免重复加载）
            if (typeof window.SettingsManager === 'undefined') {
                await loadScript('src/utils/SettingsManager.js');
                console.log('✅ [DEBUG] SettingsManager 脚本加载成功');
            } else {
                console.log('✅ [DEBUG] SettingsManager 已存在，跳过加载');
            }
            
            // 检查并加载PatternExtractor（避免重复加载）
            if (typeof window.PatternExtractor === 'undefined') {
                await loadScript('src/scanner/PatternExtractor.js');
                console.log('✅ [DEBUG] PatternExtractor 脚本加载成功');
            } else {
                console.log('✅ [DEBUG] PatternExtractor 已存在，跳过加载');
            }
            
            // 等待脚本完全加载
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 等待脚本完全加载
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (typeof window.PatternExtractor !== 'undefined') {
                console.log('✅ [DEBUG] PatternExtractor 类加载成功');
                patternExtractor = new window.PatternExtractor();
                console.log('✅ [DEBUG] PatternExtractor 实例创建成功');
            } else if (typeof PatternExtractor !== 'undefined') {
                console.log('✅ [DEBUG] PatternExtractor 类在全局作用域中找到');
                patternExtractor = new PatternExtractor();
                console.log('✅ [DEBUG] PatternExtractor 实例创建成功');
                
                // 初始化 SettingsManager 来获取自定义正则配置
                let settingsManager = null;
                if (typeof window.SettingsManager !== 'undefined') {
                    try {
                        settingsManager = new window.SettingsManager();
                        console.log('✅ [DEBUG] SettingsManager 实例创建成功');
                    } catch (error) {
                        console.warn('⚠️ [DEBUG] SettingsManager 实例创建失败:', error);
                    }
                }
                
                // 确保自定义正则配置已加载
                if (typeof patternExtractor.loadCustomPatterns === 'function') {
                    try {
                        console.log('🔄 [DEBUG] 开始加载自定义正则配置...');
                        
                        // 如果有 SettingsManager，获取自定义配置
                        if (settingsManager && typeof settingsManager.getCustomPatterns === 'function') {
                            const customPatterns = settingsManager.getCustomPatterns();
                            if (customPatterns && Object.keys(customPatterns).length > 0) {
                                patternExtractor.loadCustomPatterns(customPatterns);
                                console.log('✅ [DEBUG] 从 SettingsManager 加载自定义正则配置成功，配置数量:', Object.keys(customPatterns).length);
                            } else {
                                // 尝试直接从 PatternExtractor 加载
                                patternExtractor.loadCustomPatterns();
                                console.log('✅ [DEBUG] 使用 PatternExtractor 默认方式加载自定义正则配置');
                            }
                        } else {
                            // 尝试直接从 PatternExtractor 加载
                            patternExtractor.loadCustomPatterns();
                            console.log('✅ [DEBUG] 使用 PatternExtractor 默认方式加载自定义正则配置');
                        }
                        
                        // 确保配置已生效
                        if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
                            patternExtractor.ensureCustomPatternsLoaded();
                            console.log('✅ [DEBUG] 自定义正则配置已确保生效');
                        }
                        
                        // 验证配置是否正确加载
                        console.log('🔍 [DEBUG] 当前PatternExtractor配置验证:');
                        console.log('  - customPatternsLoaded:', patternExtractor.customPatternsLoaded);
                        console.log('  - patterns keys:', Object.keys(patternExtractor.patterns || {}));
                        
                        // 验证具体的正则配置
                        if (patternExtractor.patterns) {
                            Object.keys(patternExtractor.patterns).forEach(key => {
                                const patterns = patternExtractor.patterns[key];
                                if (Array.isArray(patterns)) {
                                    console.log(`  - ${key}: ${patterns.length} 个正则`);
                                }
                            });
                        }
                        
                    } catch (e) {
                        console.warn('⚠️ [DEBUG] 加载自定义正则失败，使用默认配置:', e);
                    }
                } else {
                    console.warn('⚠️ [DEBUG] PatternExtractor.loadCustomPatterns 方法不存在');
                }
                
                // 监听设置页的正则更新事件，实时应用
                window.addEventListener('regexConfigUpdated', (e) => {
                    try {
                        console.log('🔄 [DEBUG] 收到正则配置更新事件:', e.detail);
                        if (typeof patternExtractor.updatePatterns === 'function') {
                            patternExtractor.updatePatterns(e.detail);
                            console.log('✅ [DEBUG] PatternExtractor 已应用最新正则配置');
                        } else if (typeof patternExtractor.loadCustomPatterns === 'function') {
                            patternExtractor.loadCustomPatterns(e.detail);
                            console.log('✅ [DEBUG] PatternExtractor 已重新加载正则配置');
                        }
                    } catch (err) {
                        console.error('❌ [DEBUG] 更新 PatternExtractor 配置失败:', err);
                    }
                });
                
                console.log('✅ [DEBUG] PatternExtractor 初始化完成');
                
                // 等待PatternExtractor完全初始化
                const waitForPatternExtractor = () => {
                    return new Promise((resolve) => {
                        if (patternExtractor.customPatternsLoaded) {
                            console.log('✅ [DEBUG] PatternExtractor配置已加载');
                            resolve();
                            return;
                        }
                        
                        console.log('🔄 [DEBUG] 等待PatternExtractor自定义配置加载完成...');
                        let waitCount = 0;
                        const checkPatterns = () => {
                            if (patternExtractor.customPatternsLoaded || waitCount > 50) {
                                console.log('✅ [DEBUG] PatternExtractor配置加载完成或超时');
                                console.log('🔍 [DEBUG] 当前PatternExtractor状态:');
                                console.log('  - customPatternsLoaded:', patternExtractor.customPatternsLoaded);
                                console.log('  - patterns keys:', Object.keys(patternExtractor.patterns || {}));
                                
                                // 验证关键正则是否存在
                                if (patternExtractor.patterns) {
                                    console.log('  - absoluteApi patterns:', Array.isArray(patternExtractor.patterns.absoluteApi) ? patternExtractor.patterns.absoluteApi.length : 'not array');
                                    console.log('  - relativeApi patterns:', Array.isArray(patternExtractor.patterns.relativeApi) ? patternExtractor.patterns.relativeApi.length : 'not array');
                                    console.log('  - email pattern:', !!patternExtractor.patterns.email);
                                    console.log('  - phone pattern:', !!patternExtractor.patterns.phone);
                                    console.log('  - credentials pattern:', !!patternExtractor.patterns.credentials);
                                    console.log('  - domain pattern:', !!patternExtractor.patterns.domain);
                                    console.log('  - jwt pattern:', !!patternExtractor.patterns.jwt);
                                    console.log('  - bearerToken pattern:', !!patternExtractor.patterns.bearerToken);
                                    console.log('  - basicAuth pattern:', !!patternExtractor.patterns.basicAuth);
                                    console.log('  - authHeader pattern:', !!patternExtractor.patterns.authHeader);
                                    console.log('  - wechatAppId pattern:', !!patternExtractor.patterns.wechatAppId);
                                    console.log('  - awsKey pattern:', !!patternExtractor.patterns.awsKey);
                                    console.log('  - googleApiKey pattern:', !!patternExtractor.patterns.googleApiKey);
                                    console.log('  - githubToken pattern:', !!patternExtractor.patterns.githubToken);
                                    console.log('  - gitlabToken pattern:', !!patternExtractor.patterns.gitlabToken);
                                    console.log('  - webhookUrls pattern:', !!patternExtractor.patterns.webhookUrls);
                                    console.log('  - idCard pattern:', !!patternExtractor.patterns.idCard);
                                    console.log('  - cryptoUsage pattern:', !!patternExtractor.patterns.cryptoUsage);
                                }
                                resolve();
                                return;
                            }
                            waitCount++;
                            setTimeout(checkPatterns, 100);
                        };
                        checkPatterns();
                    });
                };
                
                // 异步等待PatternExtractor初始化完成
                waitForPatternExtractor().then(() => {
                    console.log('🎉 [DEBUG] PatternExtractor完全初始化完成');
                }).catch(error => {
                    console.error('❌ [DEBUG] PatternExtractor初始化等待失败:', error);
                });
                
            } else {
                console.error('❌ [DEBUG] PatternExtractor类未找到，尝试重新加载...');
                
                // 尝试重新加载PatternExtractor
                try {
                    // 清除可能的缓存
                    delete window.PatternExtractor;
                    
                    // 重新加载脚本
                    await loadScript('src/scanner/PatternExtractor.js');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    if (typeof window.PatternExtractor !== 'undefined') {
                        console.log('✅ [DEBUG] PatternExtractor 重新加载成功');
                        patternExtractor = new window.PatternExtractor();
                        console.log('✅ [DEBUG] PatternExtractor 实例创建成功');
                    } else if (typeof PatternExtractor !== 'undefined') {
                        console.log('✅ [DEBUG] PatternExtractor 在全局作用域中找到');
                        patternExtractor = new PatternExtractor();
                        console.log('✅ [DEBUG] PatternExtractor 实例创建成功');
                    } else {
                        console.error('❌ [DEBUG] PatternExtractor重新加载失败，将使用基础提取模式');
                        patternExtractor = null;
                    }
                } catch (reloadError) {
                    console.error('❌ [DEBUG] PatternExtractor重新加载出错:', reloadError);
                    patternExtractor = null;
                }
            }
        } catch (e) {
            console.error('❌ [DEBUG] 加载 PatternExtractor 失败:', e);
        }

        filtersLoaded = true;
        console.log('✅ [DEBUG] 所有筛选器和模式提取器加载完成');
        
    } catch (error) {
        console.error('❌ [DEBUG] 加载筛选器失败:', error);
        filtersLoaded = false;
    }
}

// 动态加载脚本
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const url = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function')
            ? chrome.runtime.getURL(src)
            : src;
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 应用筛选器到结果
function applyFiltersToResults(results) {
    console.log('🔍 [DEBUG] 开始应用筛选器，原始数据:', results);
    console.log('🔍 [DEBUG] 其中urls:', results.urls || []);
    console.log('🔍 [DEBUG] urls数量为', (results.urls || []).length);
    
    // 如果筛选器未加载，直接返回原始结果，不进行筛选
    if (!filtersLoaded || !apiFilter || !domainPhoneFilter) {
        console.warn('⚠️ [DEBUG] 筛选器未加载，返回原始数据');
        return results;
    }
    
    // 创建筛选后的结果对象
    const filteredResults = {
        absoluteApis: [],
        relativeApis: [],
        modulePaths: [],
        domains: [],
        urls: [],
        images: [],
        jsFiles: [],
        cssFiles: [],
        emails: [],
        phoneNumbers: [],
        ipAddresses: [],
        sensitiveKeywords: [],
        comments: [],
        paths: [],
        parameters: [],
        credentials: [],
        cookies: [],
        idKeys: [],
        companies: [],
        jwts: [],
        githubUrls: [],
        vueFiles: [],
        // 补齐敏感分类，避免后续丢失
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
    
    // 创建结果集合用于API筛选器
    const resultsSet = apiFilter.createEmptyResultSet();
    
    // 处理所有路径类型的数据
    const pathCategories = ['absoluteApis', 'relativeApis', 'jsFiles', 'cssFiles', 'images', 'urls', 'paths'];
    pathCategories.forEach(category => {
        if (results[category] && Array.isArray(results[category])) {
            console.log(`🔍 [DEBUG] 处理 ${category}: ${results[category].length} 个项目`);
            results[category].forEach(item => {
                if (item && typeof item === 'string') {
                    // 放行 .json/.xml 作为 API（覆盖全局静态资源判断）
                    if (/\.(json|xml)(\?|$)/i.test(item)) {
                        if (/^https?:\/\//i.test(item) || item.startsWith('/')) {
                            resultsSet.absoluteApis.add(item);
                        } else {
                            resultsSet.relativeApis.add(item);
                        }
                        return;
                    }
                    // 使用API筛选器筛选每个项目
                    if (apiFilter.filterAPI(item, resultsSet)) {
                        // 项目已被分类到resultsSet中的相应集合
                    }
                }
            });
        }
    });
    
    // 处理域名、手机号和邮箱 - 直接从原始结果中筛选
    if (results.domains && Array.isArray(results.domains)) {
        console.log(`🔍 [DEBUG] 筛选域名: ${results.domains.length} 个`);
        const validDomains = domainPhoneFilter.filterDomains(results.domains);
        validDomains.forEach(domain => resultsSet.domains.add(domain));
        console.log(`🔍 [DEBUG] 域名筛选结果: ${validDomains.length} 个有效域名`);
    }
    
    if (results.phoneNumbers && Array.isArray(results.phoneNumbers)) {
        console.log(`🔍 [DEBUG] 筛选手机号: ${results.phoneNumbers.length} 个`);
        const validPhones = domainPhoneFilter.filterPhones(results.phoneNumbers, true);
        validPhones.forEach(phone => resultsSet.phoneNumbers.add(phone));
        console.log(`🔍 [DEBUG] 手机号筛选结果: ${validPhones.length} 个有效手机号`);
    }
    
    if (results.emails && Array.isArray(results.emails)) {
        console.log(`🔍 [DEBUG] 筛选邮箱: ${results.emails.length} 个`);
        const validEmails = domainPhoneFilter.filterEmails(results.emails);
        validEmails.forEach(email => resultsSet.emails.add(email));
        console.log(`🔍 [DEBUG] 邮箱筛选结果: ${validEmails.length} 个有效邮箱`);
    }
    
    // 将筛选后的Set转换为Array
    Object.keys(resultsSet).forEach(key => {
        if (resultsSet[key] instanceof Set) {
            filteredResults[key] = Array.from(resultsSet[key]);
        } else if (Array.isArray(resultsSet[key])) {
            filteredResults[key] = resultsSet[key];
        }
    });
    
    // 保留其他未处理的类别（直接复制）
    const otherCategories = [
        'ipAddresses', 'sensitiveKeywords', 'comments', 'parameters', 
        'credentials', 'cookies', 'idKeys', 'companies', 'jwts', 'githubUrls',
        'bearerTokens', 'basicAuth', 'authHeaders', 'wechatAppIds',
        'awsKeys', 'googleApiKeys', 'githubTokens', 'gitlabTokens',
        'webhookUrls', 'idCards', 'cryptoUsage'
    ];
    
    otherCategories.forEach(category => {
        if (results[category] && Array.isArray(results[category])) {
            filteredResults[category] = [...results[category]];
        }
    });
    
    // 统计筛选结果
    const originalCount = Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    const filteredCount = Object.values(filteredResults).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    
    console.log(`✅ [DEBUG] 筛选完成: 原始 ${originalCount} 项 -> 筛选后 ${filteredCount} 项`);
    console.log('🔍 [DEBUG] 筛选后的结果:', filteredResults);
    
    return filteredResults;
}

// 页面加载完成后的初始化
async function initializePage() {
    console.log('🔍 [DEBUG] 深度扫描窗口开始初始化...');
    
    // 检查扩展环境
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error('❌ [DEBUG] Chrome扩展API不可用');
        const loadingDiv = document.getElementById('loadingDiv');
        if (loadingDiv) {
            loadingDiv.innerHTML = '<div style="color: #ff4757;">错误: Chrome扩展API不可用</div>';
        }
        return;
    }
    
    // 首先加载筛选器
    await loadFilters();
    
    try {
        // 从chrome.storage读取扫描配置
        const result = await chrome.storage.local.get(['deepScanConfig']);
        
        if (!result.deepScanConfig) {
            console.error('❌ [DEBUG] 找不到深度扫描配置数据');
            const loadingDiv = document.getElementById('loadingDiv');
            if (loadingDiv) {
                loadingDiv.innerHTML = '<div style="color: #ff4757;">错误: 找不到深度扫描配置数据</div>';
            }
            return;
        }
        
        scanConfig = result.deepScanConfig;
        console.log('✅ [DEBUG] 深度扫描配置加载成功:', scanConfig);
        
        maxConcurrency = scanConfig.concurrency || 8;
        requestTimeout = (scanConfig.timeout * 1000) || 5000;
        
        // 更新页面信息
        updateConfigDisplay();
        
        // 初始化结果结构
        initializeScanResults();
        
    } catch (error) {
        console.error('❌ [DEBUG] 读取配置数据失败:', error);
        const loadingDiv = document.getElementById('loadingDiv');
        if (loadingDiv) {
            loadingDiv.innerHTML = '<div style="color: #ff4757;">错误: 读取配置数据失败<br>' + error.message + '</div>';
        }
        return;
    }
    
    // 添加事件监听器
    try {
        document.getElementById('startBtn').addEventListener('click', startScan);
        document.getElementById('pauseBtn').addEventListener('click', pauseScan);
        document.getElementById('stopBtn').addEventListener('click', stopScan);
        document.getElementById('exportBtn').addEventListener('click', exportResults);
        document.getElementById('toggleAllBtn').addEventListener('click', toggleAllCategories);
    } catch (error) {
        console.error('❌ [DEBUG] 添加事件监听器失败:', error);
    }
    
    // 监听来自主扩展的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'stopDeepScan') {
            stopScan();
            sendResponse({ success: true });
        }
    });
    
    // 自动开始扫描
    setTimeout(() => {
        startScan();
    }, 1000);
}

// 更新配置显示
function updateConfigDisplay() {
    try {
        const elements = {
            maxDepthDisplay: document.getElementById('maxDepthDisplay'),
            concurrencyDisplay: document.getElementById('concurrencyDisplay'),
            timeoutDisplay: document.getElementById('timeoutDisplay'),
            scanTypesDisplay: document.getElementById('scanTypesDisplay'),
            scanInfo: document.getElementById('scanInfo')
        };
        
        if (elements.maxDepthDisplay) {
            elements.maxDepthDisplay.textContent = scanConfig.maxDepth || '未设置';
        }
        if (elements.concurrencyDisplay) {
            elements.concurrencyDisplay.textContent = scanConfig.concurrency || '未设置';
        }
        if (elements.timeoutDisplay) {
            elements.timeoutDisplay.textContent = scanConfig.timeout || '未设置';
        }
        
        const scanTypes = [];
        if (scanConfig.scanJsFiles) scanTypes.push('JS文件');
        if (scanConfig.scanHtmlFiles) scanTypes.push('HTML页面');
        if (scanConfig.scanApiFiles) scanTypes.push('API接口');
        
        if (elements.scanTypesDisplay) {
            elements.scanTypesDisplay.textContent = scanTypes.join(', ') || '无';
        }
        
        if (elements.scanInfo) {
            if (scanConfig.baseUrl) {
                try {
                    const hostname = new URL(scanConfig.baseUrl).hostname;
                    elements.scanInfo.textContent = `目标域名: ${hostname}`;
                } catch (urlError) {
                    elements.scanInfo.textContent = `目标URL: ${scanConfig.baseUrl}`;
                }
            } else {
                elements.scanInfo.textContent = '目标域名: 未设置';
            }
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] 更新配置显示失败:', error);
    }
}

// 初始化扫描结果结构
function initializeScanResults() {
    console.log('🔍 [DEBUG] 开始初始化扫描结果...');
    console.log('🔍 [DEBUG] scanConfig.initialResults:', scanConfig.initialResults);
    
    const categories = [
        'absoluteApis', 'relativeApis', 'modulePaths', 'domains', 'urls', 
        'images', 'jsFiles', 'cssFiles', 'emails', 'phoneNumbers', 
        'ipAddresses', 'sensitiveKeywords', 'comments', 'paths', 
        'parameters', 'credentials', 'cookies', 'idKeys', 'companies', 
        'jwts', 'githubUrls', 'vueFiles',
        'bearerTokens', 'basicAuth', 'authHeaders', 'wechatAppIds',
        'awsKeys', 'googleApiKeys', 'githubTokens', 'gitlabTokens',
        'webhookUrls', 'idCards', 'cryptoUsage'
    ];
    
    let totalInitialResults = 0;
    categories.forEach(category => {
        const initialData = scanConfig.initialResults[category] || [];
        scanResults[category] = [...initialData];
        totalInitialResults += initialData.length;
        console.log(`🔍 [DEBUG] 初始化 ${category}: ${initialData.length} 个项目`);
    });
    
    console.log('🔍 [DEBUG] 初始化扫描结果完成，原始数据:', scanResults);
    console.log('🔍 [DEBUG] urls数组:', scanResults.urls);
    console.log('🔍 [DEBUG] urls数量:', scanResults.urls ? scanResults.urls.length : 0);
    
    // 将相对路径API转换为完整URL并合并到绝对路径API中
    if (scanResults.relativeApis && scanResults.relativeApis.length > 0) {
        console.log('🔍 [DEBUG] 发现相对路径API，开始转换:', scanResults.relativeApis);
        
        const baseUrl = scanConfig.baseUrl;
        if (baseUrl) {
            scanResults.relativeApis.forEach(relativeApi => {
                try {
                    const fullUrl = convertRelativeToAbsolute(relativeApi);
                    if (fullUrl && fullUrl !== relativeApi) {
                        if (!scanResults.absoluteApis) {
                            scanResults.absoluteApis = [];
                        }
                        if (!scanResults.absoluteApis.includes(fullUrl)) {
                            scanResults.absoluteApis.push(fullUrl);
                            console.log('🔄 初始化时转换相对路径API:', relativeApi, '->', fullUrl);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ 初始化时转换相对路径API失败:', relativeApi, error);
                }
            });
            
            // 强制清空相对路径API数组，确保不会在扩展中显示
            scanResults.relativeApis = [];
            console.log('✅ 初始化时已强制清空relativeApis数组，所有API统一存储在absoluteApis中');
        }
    } else {
        // 即使没有相对路径API，也要确保数组为空
        scanResults.relativeApis = [];
        console.log('✅ 初始化时确保relativeApis数组为空');
    }
    
    console.log('🔍 [DEBUG] 转换后的扫描结果:', scanResults);
    console.log('🔍 [DEBUG] relativeApis数组长度:', scanResults.relativeApis.length);
    console.log('🔍 [DEBUG] absoluteApis数组长度:', scanResults.absoluteApis ? scanResults.absoluteApis.length : 0);
    
    // 暂时跳过筛选器应用，直接显示原始数据
    console.log('🔍 [DEBUG] 跳过筛选器应用，直接显示原始数据以便调试');
    
    try {
        updateResultsDisplay();
    } catch (error) {
        console.error('❌ [DEBUG] 更新结果显示失败:', error);
    }
}

// 开始扫描
async function startScan() {
    if (isScanRunning) return;
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const loadingDiv = document.getElementById('loadingDiv');
    
    if (!startBtn || !pauseBtn || !stopBtn) {
        setTimeout(() => startScan(), 500);
        return;
    }
    
    addLogEntry('开始深度扫描...', 'info');
    
    console.log('🔍 [DEBUG] 扫描开始前的scanResults:', scanResults);
    console.log('🔍 [DEBUG] 扫描开始前urls数量:', scanResults.urls ? scanResults.urls.length : 0);
    
    isScanRunning = true;
    isPaused = false;
    currentDepth = 0;
    scannedUrls.clear();
    pendingUrls.clear();
    urlContentCache.clear();
    activeRequests = 0;
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
    
    // 重要：保持初始数据不变，不要在扫描开始时重新应用筛选器
    console.log('🔍 [DEBUG] 保持初始数据不变，跳过筛选器重新应用');
    
    try {
        const initialUrls = collectInitialUrls();
        addLogEntry(`收集到 ${initialUrls.length} 个初始URL`, 'info');
        
        if (initialUrls.length === 0) {
            addLogEntry('没有找到可扫描的URL', 'warning');
            completeScan();
            return;
        }
        
        await performLayeredScan(initialUrls);
        
    } catch (error) {
        console.error('❌ 深度扫描失败:', error);
        addLogEntry(`扫描失败: ${error.message}`, 'error');
        
        chrome.runtime.sendMessage({
            action: 'updateScanResults',
            data: { error: error.message }
        });
    } finally {
        completeScan();
    }
}

// 暂停/继续扫描
function pauseScan() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (!pauseBtn) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseBtn.textContent = '继续扫描';
        addLogEntry('扫描已暂停', 'warning');
    } else {
        pauseBtn.textContent = '暂停扫描';
        addLogEntry('扫描已继续', 'info');
    }
}

// 停止扫描
function stopScan() {
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('扫描已停止', 'warning');
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停扫描';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    chrome.runtime.sendMessage({
        action: 'scanComplete',
        data: scanResults
    });
}

// 收集初始URL
function collectInitialUrls() {
    const urls = new Set();
    const baseUrl = scanConfig.baseUrl;
    
    // 从JS文件中收集
    if (scanConfig.scanJsFiles && scanConfig.initialResults.jsFiles) {
        scanConfig.initialResults.jsFiles.forEach(jsFile => {
            const fullUrl = resolveUrl(jsFile, baseUrl);
            if (fullUrl && isSameDomain(fullUrl, baseUrl) && !scannedUrls.has(fullUrl)) {
                urls.add(fullUrl);
            }
        });
    }
    
    // 从HTML/页面URL中收集
    if (scanConfig.scanHtmlFiles && scanConfig.initialResults.urls) {
        scanConfig.initialResults.urls.forEach(url => {
            const fullUrl = resolveUrl(url, baseUrl);
            if (fullUrl && isSameDomain(fullUrl, baseUrl) && !scannedUrls.has(fullUrl)) {
                if (isPageUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });
    }
    
    // 从API接口中收集
    if (scanConfig.scanApiFiles) {
        if (scanConfig.initialResults.absoluteApis) {
            scanConfig.initialResults.absoluteApis.forEach(api => {
                const fullUrl = resolveUrl(api, baseUrl);
                if (fullUrl && isSameDomain(fullUrl, baseUrl) && !scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            });
        }
        
        if (scanConfig.initialResults.relativeApis) {
            scanConfig.initialResults.relativeApis.forEach(api => {
                const fullUrl = resolveUrl(api, baseUrl);
                if (fullUrl && isSameDomain(fullUrl, baseUrl) && !scannedUrls.has(fullUrl)) {
                    urls.add(fullUrl);
                }
            });
        }
    }
    
    return Array.from(urls);
}

// 执行分层扫描
async function performLayeredScan(initialUrls) {
    let currentUrls = [...initialUrls];
    
    for (let depth = 1; depth <= scanConfig.maxDepth && isScanRunning; depth++) {
        currentDepth = depth;
        updateStatusDisplay();
        
        if (currentUrls.length === 0) {
            addLogEntry(`第 ${depth} 层没有URL需要扫描`, 'info');
            break;
        }
        
        addLogEntry(`开始第 ${depth} 层扫描，URL数量: ${currentUrls.length}`, 'info');
        updateProgressDisplay(0, currentUrls.length, `第 ${depth} 层扫描`);
        
        const newUrls = await scanUrlBatch(currentUrls, depth);
        
        const nextUrlsSet = new Set();
        newUrls.forEach(url => {
            if (!scannedUrls.has(url) && isSameDomain(url, scanConfig.baseUrl)) {
                nextUrlsSet.add(url);
            }
        });
        
        currentUrls = Array.from(nextUrlsSet);
        
        addLogEntry(`第 ${depth} 层扫描完成，发现新URL: ${currentUrls.length} 个`, 'success');
        
        chrome.runtime.sendMessage({
            action: 'updateScanResults',
            data: scanResults
        });
        
        chrome.runtime.sendMessage({
            action: 'scanProgress',
            data: {
                stage: `第 ${depth} 层扫描完成`,
                current: depth,
                total: scanConfig.maxDepth,
                percentage: (depth / scanConfig.maxDepth * 100).toFixed(1)
            }
        });
        
        if (depth >= scanConfig.maxDepth) {
            addLogEntry(`已达到最大扫描深度 ${scanConfig.maxDepth}`, 'info');
            break;
        }
        
        if (currentUrls.length === 0) {
            addLogEntry(`第 ${depth} 层后没有发现新的URL，扫描提前结束`, 'info');
            break;
        }
    }
}

// 批量扫描URL
async function scanUrlBatch(urls, depth) {
    const newUrls = new Set();
    let processedCount = 0;
    const totalUrls = urls.length;
    
    const queue = [...urls];
    const activeWorkers = new Set();
    
    const processQueue = async () => {
        while (queue.length > 0 && isScanRunning && !isPaused) {
            const url = queue.shift();
            
            if (scannedUrls.has(url)) {
                processedCount++;
                updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层扫描`);
                continue;
            }
            
            scannedUrls.add(url);
            updateStatusDisplay();
            
            const workerPromise = (async () => {
                try {
                    let content;
                    if (urlContentCache.has(url)) {
                        content = urlContentCache.get(url);
                    } else {
                        content = await fetchUrlContent(url);
                        if (content) {
                            urlContentCache.set(url, content);
                        }
                    }
                    
                    if (content) {
                        const extractedData = extractFromContent(content, url);
                        const filteredData = applyFiltersToResults(extractedData);
                        mergeResults(filteredData);
                        
                        const discoveredUrls = collectUrlsFromContent(content);
                        discoveredUrls.forEach(newUrl => newUrls.add(newUrl));
                        
                        addLogEntry(`扫描完成: ${url} (发现 ${discoveredUrls.length} 个新URL)`, 'success');
                    }
                } catch (error) {
                    addLogEntry(`扫描失败: ${url} - ${error.message}`, 'error');
                } finally {
                    processedCount++;
                    updateProgressDisplay(processedCount, totalUrls, `第 ${depth} 层扫描`);
                    activeWorkers.delete(workerPromise);
                }
            })();
            
            activeWorkers.add(workerPromise);
            
            if (activeWorkers.size >= maxConcurrency) {
                await Promise.race(Array.from(activeWorkers));
            }
        }
    };
    
    await processQueue();
    
    if (activeWorkers.size > 0) {
        await Promise.all(Array.from(activeWorkers));
    }
    
    return Array.from(newUrls);
}

// 获取URL内容
async function fetchUrlContent(url) {
    try {
        const requestOptions = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,text/javascript,application/javascript,text/css,*/*',
                'Cache-Control': 'no-cache'
            },
            timeout: requestTimeout
        };
        
        const response = await makeRequestViaBackground(url, requestOptions);
        
        if (!response.ok) {
            return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('image/') || 
            contentType.includes('audio/') || 
            contentType.includes('video/') || 
            contentType.includes('application/octet-stream')) {
            return null;
        }
        
        const text = await response.text();
        return text;
        
    } catch (error) {
        console.error(`无法访问 ${url}:`, error);
        return null;
    }
}

// 通过后台脚本发送请求
async function makeRequestViaBackground(url, options = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'makeRequest',
            url: url,
            options: options
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
                const mockHeaders = new Map(Object.entries(response.data.headers || {}));
                
                resolve({
                    ok: response.data.status >= 200 && response.data.status < 300,
                    status: response.data.status,
                    statusText: response.data.statusText,
                    headers: {
                        get: (name) => mockHeaders.get(name.toLowerCase()),
                        has: (name) => mockHeaders.has(name.toLowerCase())
                    },
                    text: () => Promise.resolve(response.data.text),
                    url: response.data.url
                });
            } else {
                reject(new Error(response?.error || 'Request failed'));
            }
        });
    });
}

// 从内容中提取信息
function extractFromContent(content, sourceUrl) {
    console.log('🔍 [DEBUG] extractFromContent 开始提取，内容长度:', content.length);
    console.log('🔍 [DEBUG] PatternExtractor 可用性:', !!patternExtractor);
    
    const maxContentLength = 500000;
    const processedContent = content.length > maxContentLength ? 
        content.substring(0, maxContentLength) : content;
    
    console.log('🔍 [DEBUG] 处理后内容长度:', processedContent.length);
    
    const results = {
        absoluteApis: new Set(),
        relativeApis: new Set(),
        modulePaths: new Set(),
        domains: new Set(),
        urls: new Set(),
        images: new Set(),
        jsFiles: new Set(),
        cssFiles: new Set(),
        emails: new Set(),
        phoneNumbers: new Set(),
        ipAddresses: new Set(),
        sensitiveKeywords: new Set(),
        comments: new Set(),
        paths: new Set(),
        parameters: new Set(),
        credentials: new Set(),
        cookies: new Set(),
        idKeys: new Set(),
        companies: new Set(),
        jwts: new Set(),
        githubUrls: new Set(),
        vueFiles: new Set(),
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
    
    console.log('🔍 [DEBUG] 初始化结果对象，包含字段:', Object.keys(results));
    
    // 优先使用 PatternExtractor 提取
    if (patternExtractor && typeof patternExtractor.extractAPIs === 'function') {
        try {
            console.log('✅ [DEBUG] 使用 PatternExtractor 进行提取...');
            
            // 确保自定义配置已加载
            if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
                try {
                    patternExtractor.ensureCustomPatternsLoaded();
                    console.log('✅ [DEBUG] 确保自定义正则配置已加载');
                } catch (loadError) {
                    console.warn('⚠️ [DEBUG] 加载自定义正则配置失败:', loadError);
                }
            }
            
            // 验证PatternExtractor状态
            console.log('🔍 [DEBUG] 当前PatternExtractor状态:');
            console.log('  - customPatternsLoaded:', patternExtractor.customPatternsLoaded);
            console.log('  - patterns keys:', Object.keys(patternExtractor.patterns || {}));
            
            // 验证关键正则是否存在
            if (patternExtractor.patterns) {
                console.log('  - absoluteApi patterns:', Array.isArray(patternExtractor.patterns.absoluteApi) ? patternExtractor.patterns.absoluteApi.length : 'not array');
                console.log('  - relativeApi patterns:', Array.isArray(patternExtractor.patterns.relativeApi) ? patternExtractor.patterns.relativeApi.length : 'not array');
                console.log('  - email pattern:', !!patternExtractor.patterns.email);
                console.log('  - phone pattern:', !!patternExtractor.patterns.phone);
                console.log('  - credentials pattern:', !!patternExtractor.patterns.credentials);
                console.log('  - domain pattern:', !!patternExtractor.patterns.domain);
                console.log('  - jwt pattern:', !!patternExtractor.patterns.jwt);
                console.log('  - bearerToken pattern:', !!patternExtractor.patterns.bearerToken);
                console.log('  - basicAuth pattern:', !!patternExtractor.patterns.basicAuth);
                console.log('  - authHeader pattern:', !!patternExtractor.patterns.authHeader);
                console.log('  - wechatAppId pattern:', !!patternExtractor.patterns.wechatAppId);
                console.log('  - awsKey pattern:', !!patternExtractor.patterns.awsKey);
                console.log('  - googleApiKey pattern:', !!patternExtractor.patterns.googleApiKey);
                console.log('  - githubToken pattern:', !!patternExtractor.patterns.githubToken);
                console.log('  - gitlabToken pattern:', !!patternExtractor.patterns.gitlabToken);
                console.log('  - webhookUrls pattern:', !!patternExtractor.patterns.webhookUrls);
                console.log('  - idCard pattern:', !!patternExtractor.patterns.idCard);
                console.log('  - cryptoUsage pattern:', !!patternExtractor.patterns.cryptoUsage);
            }
            
            // 执行所有类型的提取
            console.log('🔍 [DEBUG] 开始提取API...');
            patternExtractor.extractAPIs(processedContent, results);
            console.log('🔍 [DEBUG] API提取完成');
            
            console.log('🔍 [DEBUG] 开始提取其他资源...');
            patternExtractor.extractOtherResources(processedContent, results);
            console.log('🔍 [DEBUG] 其他资源提取完成');
            
            console.log('🔍 [DEBUG] 开始提取敏感数据...');
            patternExtractor.extractSensitiveData(processedContent, results);
            console.log('🔍 [DEBUG] 敏感数据提取完成');
            
            // 手动补充一些可能遗漏的敏感信息提取
            console.log('🔍 [DEBUG] 开始补充敏感信息提取...');
            extractAdditionalSensitiveData(processedContent, results);
            console.log('🔍 [DEBUG] 补充敏感信息提取完成');
            
            // 将相对路径API转换为完整URL并合并到绝对路径API中
            convertRelativeApisToAbsolute(results);
            
            const finalResults = {};
            Object.keys(results).forEach(key => {
                finalResults[key] = Array.from(results[key]).filter(Boolean);
            });
            
            console.log('✅ [DEBUG] PatternExtractor 提取完成，结果统计:');
            Object.keys(finalResults).forEach(key => {
                if (finalResults[key].length > 0) {
                    console.log(`  ${key}: ${finalResults[key].length} 个`);
                }
            });
            
            return finalResults;
        } catch (e) {
            console.error('❌ [DEBUG] 使用 PatternExtractor 提取失败，回退基础正则:', e);
        }
    } else {
        console.warn('⚠️ [DEBUG] PatternExtractor 不可用，使用基础正则提取');
    }
    
    // 基础正则提取（降级方案）
    console.log('📋 [DEBUG] 使用基础正则提取...');
    extractBasicPatterns(processedContent, results);
    
    // 将相对路径API转换为完整URL并合并到绝对路径API中
    convertRelativeApisToAbsolute(results);
    
    const finalResults = {};
    Object.keys(results).forEach(key => {
        finalResults[key] = Array.from(results[key]).filter(Boolean);
    });
    
    console.log('✅ [DEBUG] 基础正则提取完成，结果统计:');
    Object.keys(finalResults).forEach(key => {
        if (finalResults[key].length > 0) {
            console.log(`  ${key}: ${finalResults[key].length} 个`);
        }
    });
    
    return finalResults;
}

// 补充敏感信息提取（确保所有敏感信息都被提取到）
function extractAdditionalSensitiveData(content, results) {
    console.log('🔍 [DEBUG] 开始补充敏感信息提取...');
    
    // 限制内容大小
    const maxContentSize = 300000;
    const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
    
    // 补充Bearer Token提取
    console.log('🔍 [DEBUG] 补充Bearer Token提取...');
    const bearerTokenPattern = /[Bb]earer\s+[a-zA-Z0-9\-=._+/\\]{20,500}/g;
    let match;
    let bearerCount = 0;
    while ((match = bearerTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充Bearer Token匹配到: "${match[0]}"`);
        results.bearerTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]); // 同时添加到敏感关键词
        bearerCount++;
    }
    console.log(`📊 [DEBUG] 补充Bearer Token提取完成，共找到 ${bearerCount} 个`);
    
    // 补充Basic Auth提取
    console.log('🔍 [DEBUG] 补充Basic Auth提取...');
    const basicAuthPattern = /[Bb]asic\s+[A-Za-z0-9+/]{18,}={0,2}/g;
    let basicAuthCount = 0;
    while ((match = basicAuthPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充Basic Auth匹配到: "${match[0]}"`);
        results.basicAuth.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        basicAuthCount++;
    }
    console.log(`📊 [DEBUG] 补充Basic Auth提取完成，共找到 ${basicAuthCount} 个`);
    
    // 补充Authorization Header提取
    console.log('🔍 [DEBUG] 补充Authorization Header提取...');
    const authHeaderPattern = /["''\[]*[Aa]uthorization["''\]]*\s*[:=]\s*[''"]?\b(?:[Tt]oken\s+)?[a-zA-Z0-9\-_+/]{20,500}[''"]?/g;
    let authHeaderCount = 0;
    while ((match = authHeaderPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充Authorization Header匹配到: "${match[0]}"`);
        results.authHeaders.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        authHeaderCount++;
    }
    console.log(`📊 [DEBUG] 补充Authorization Header提取完成，共找到 ${authHeaderCount} 个`);
    
    // 补充微信AppID提取
    console.log('🔍 [DEBUG] 补充微信AppID提取...');
    const wechatAppIdPattern = /['"]wx[a-z0-9]{15,18}['"]|['"]ww[a-z0-9]{15,18}['"]/g;
    let wechatCount = 0;
    while ((match = wechatAppIdPattern.exec(processContent)) !== null) {
        const appId = match[0].replace(/["']/g, '');
        console.log(`🎯 [DEBUG] 补充微信AppID匹配到: "${appId}"`);
        results.wechatAppIds.add(appId);
        results.sensitiveKeywords.add(appId);
        wechatCount++;
    }
    console.log(`📊 [DEBUG] 补充微信AppID提取完成，共找到 ${wechatCount} 个`);
    
    // 补充AWS密钥提取
    console.log('🔍 [DEBUG] 补充AWS密钥提取...');
    const awsKeyPattern = /AKIA[A-Z0-9]{16}|LTAI[A-Za-z\d]{12,30}|AKID[A-Za-z\d]{13,40}/g;
    let awsCount = 0;
    while ((match = awsKeyPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充AWS密钥匹配到: "${match[0]}"`);
        results.awsKeys.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        awsCount++;
    }
    console.log(`📊 [DEBUG] 补充AWS密钥提取完成，共找到 ${awsCount} 个`);
    
    // 补充Google API Key提取
    console.log('🔍 [DEBUG] 补充Google API Key提取...');
    const googleApiKeyPattern = /AIza[0-9A-Za-z_\-]{35}/g;
    let googleCount = 0;
    while ((match = googleApiKeyPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充Google API Key匹配到: "${match[0]}"`);
        results.googleApiKeys.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        googleCount++;
    }
    console.log(`📊 [DEBUG] 补充Google API Key提取完成，共找到 ${googleCount} 个`);
    
    // 补充GitHub Token提取
    console.log('🔍 [DEBUG] 补充GitHub Token提取...');
    const githubTokenPattern = /(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}/g;
    let githubTokenCount = 0;
    while ((match = githubTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充GitHub Token匹配到: "${match[0]}"`);
        results.githubTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        githubTokenCount++;
    }
    console.log(`📊 [DEBUG] 补充GitHub Token提取完成，共找到 ${githubTokenCount} 个`);
    
    // 补充GitLab Token提取
    console.log('🔍 [DEBUG] 补充GitLab Token提取...');
    const gitlabTokenPattern = /glpat-[a-zA-Z0-9\-=_]{20,22}/g;
    let gitlabTokenCount = 0;
    while ((match = gitlabTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充GitLab Token匹配到: "${match[0]}"`);
        results.gitlabTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        gitlabTokenCount++;
    }
    console.log(`📊 [DEBUG] 补充GitLab Token提取完成，共找到 ${gitlabTokenCount} 个`);
    
    // 补充Webhook URLs提取
    console.log('🔍 [DEBUG] 补充Webhook URLs提取...');
    const webhookUrlsPattern = /https:\/\/qyapi\.weixin\.qq\.com\/cgi\-bin\/webhook\/send\?key=[a-zA-Z0-9\-]{25,50}|https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=[a-z0-9]{50,80}|https:\/\/open\.feishu\.cn\/open\-apis\/bot\/v2\/hook\/[a-z0-9\-]{25,50}|https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9\-_]{6,12}\/[a-zA-Z0-9\-_]{6,12}\/[a-zA-Z0-9\-_]{15,24}/g;
    let webhookCount = 0;
    while ((match = webhookUrlsPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充Webhook URL匹配到: "${match[0]}"`);
        results.webhookUrls.add(match[0]);
        results.urls.add(match[0]); // 同时添加到URL分类
        webhookCount++;
    }
    console.log(`📊 [DEBUG] 补充Webhook URLs提取完成，共找到 ${webhookCount} 个`);
    
    // 补充身份证号提取
    console.log('🔍 [DEBUG] 补充身份证号提取...');
    const idCardPattern = /['"](\d{8}(0\d|10|11|12)([0-2]\d|30|31)\d{3}$)|(\d{6}(18|19|20)\d{2}(0[1-9]|10|11|12)([0-2]\d|30|31)\d{3}(\d|X|x))['"]|[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g;
    let idCardCount = 0;
    while ((match = idCardPattern.exec(processContent)) !== null) {
        const idCard = match[0].replace(/["']/g, '');
        console.log(`🎯 [DEBUG] 补充身份证号匹配到: "${idCard}"`);
        if (idCard && (idCard.length === 15 || idCard.length === 18)) {
            results.idCards.add(idCard);
            results.sensitiveKeywords.add(idCard);
            idCardCount++;
        }
    }
    console.log(`📊 [DEBUG] 补充身份证号提取完成，共找到 ${idCardCount} 个`);
    
    // 补充加密算法使用检测
    console.log('🔍 [DEBUG] 补充加密算法使用检测...');
    const cryptoUsagePattern = /\W(Base64\.encode|Base64\.decode|btoa|atob|CryptoJS\.AES|CryptoJS\.DES|JSEncrypt|rsa|KJUR|\$\.md5|md5|sha1|sha256|sha512)[\(\.]/gi;
    let cryptoCount = 0;
    while ((match = cryptoUsagePattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 补充加密算法匹配到: "${match[1]}"`);
        results.cryptoUsage.add(match[1]);
        results.sensitiveKeywords.add(match[1]);
        cryptoCount++;
    }
    console.log(`📊 [DEBUG] 补充加密算法检测完成，共找到 ${cryptoCount} 个`);
    
    // 补充Cookie信息提取
    console.log('🔍 [DEBUG] 补充Cookie信息提取...');
    const cookiePattern = /(?:document\.cookie|Cookie|Set-Cookie)\s*[:=]\s*["']?([^"';]+)["']?/gi;
    let cookieCount = 0;
    while ((match = cookiePattern.exec(processContent)) !== null) {
        const cookie = match[1];
        console.log(`🎯 [DEBUG] 补充Cookie匹配到: "${cookie}"`);
        if (cookie && cookie.length > 5 && cookie.length < 200) {
            results.cookies.add(cookie);
            results.sensitiveKeywords.add(cookie);
            cookieCount++;
        }
    }
    console.log(`📊 [DEBUG] 补充Cookie信息提取完成，共找到 ${cookieCount} 个`);
    
    // 补充ID密钥提取
    console.log('🔍 [DEBUG] 补充ID密钥提取...');
    const idKeyPattern = /(?:id|key|token|secret)["']?\s*[:=]\s*["']?([a-zA-Z0-9\-_]{16,64})["']?/gi;
    let idKeyCount = 0;
    while ((match = idKeyPattern.exec(processContent)) !== null) {
        const idKey = match[1];
        console.log(`🎯 [DEBUG] 补充ID密钥匹配到: "${idKey}"`);
        if (idKey && idKey.length >= 16) {
            results.idKeys.add(idKey);
            results.sensitiveKeywords.add(idKey);
            idKeyCount++;
        }
    }
    console.log(`📊 [DEBUG] 补充ID密钥提取完成，共找到 ${idKeyCount} 个`);
    
    console.log('✅ [DEBUG] 补充敏感信息提取完成！');
}

// 将相对路径API转换为完整URL并合并到绝对路径API中
function convertRelativeApisToAbsolute(results) {
    if (!results.relativeApis || results.relativeApis.size === 0) {
        return;
    }
    
    const baseUrl = scanConfig.baseUrl;
    if (!baseUrl) {
        console.warn('⚠️ 没有baseUrl，无法转换相对路径API');
        return;
    }
    
    // 将相对路径API转换为完整URL
    const relativeApis = Array.from(results.relativeApis);
    relativeApis.forEach(relativeApi => {
        try {
            const fullUrl = resolveUrl(relativeApi, baseUrl);
            if (fullUrl && isSameDomain(fullUrl, baseUrl)) {
                results.absoluteApis.add(fullUrl);
                console.log(`🔄 转换相对路径API: ${relativeApi} -> ${fullUrl}`);
            }
        } catch (error) {
            console.warn(`⚠️ 转换相对路径API失败: ${relativeApi}`, error);
        }
    });
    
    // 清空相对路径API集合，因为已经合并到绝对路径API中
    results.relativeApis.clear();
    
    console.log(`✅ 已将 ${relativeApis.length} 个相对路径API转换为完整URL`);
}

// 基础模式提取（降级方案）
function extractBasicPatterns(content, results) {
    console.log('📋 [DEBUG] 使用基础正则提取模式（降级方案）');
    
    // 限制内容大小
    const maxContentSize = 300000;
    const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
    
    // API路径提取 - 将相对路径转换为完整URL
    const apiPatterns = [
        /["'`]([\/][a-zA-Z0-9\/_\-\.]+)["'`]/g,
        /["'`](\/api\/[^"'`\s]+)["'`]/g,
        /["'`](\/admin\/[^"'`\s]+)["'`]/g,
        /["'`](\/manage\/[^"'`\s]+)["'`]/g,
        /["'`](\/backend\/[^"'`\s]+)["'`]/g,
        /["'`](\/service\/[^"'`\s]+)["'`]/g,
        /["'`]([^"'`]*\.(?:php|asp|aspx|jsp|do|action|json|xml)[^"'`]*)["'`]/g
    ];
    
    console.log('🔍 [DEBUG] 基础API提取开始...');
    let apiCount = 0;
    apiPatterns.forEach((pattern, index) => {
        let match;
        while ((match = pattern.exec(processContent)) !== null) {
            const path = match[1];
            if (path && path.startsWith('/')) {
                // 将相对路径转换为完整URL
                const fullUrl = convertRelativeToAbsolute(path);
                results.absoluteApis.add(fullUrl);
                apiCount++;
                console.log(`✅ [DEBUG] 基础API提取 ${index + 1}: ${path} -> ${fullUrl}`);
            }
        }
    });
    console.log(`📊 [DEBUG] 基础API提取完成，共找到 ${apiCount} 个`);
    
    // 域名提取
    console.log('🔍 [DEBUG] 基础域名提取开始...');
    const domainPattern = /(?:https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)/g;
    let match;
    let domainCount = 0;
    while ((match = domainPattern.exec(processContent)) !== null) {
        const domain = match[1];
        if (domain && domain.includes('.') && !domain.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            results.domains.add(domain);
            domainCount++;
            console.log(`✅ [DEBUG] 基础域名提取: ${domain}`);
        }
    }
    console.log(`📊 [DEBUG] 基础域名提取完成，共找到 ${domainCount} 个`);
    
    // 邮箱提取
    console.log('🔍 [DEBUG] 基础邮箱提取开始...');
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailCount = 0;
    while ((match = emailPattern.exec(processContent)) !== null) {
        results.emails.add(match[0]);
        emailCount++;
        console.log(`✅ [DEBUG] 基础邮箱提取: ${match[0]}`);
    }
    console.log(`📊 [DEBUG] 基础邮箱提取完成，共找到 ${emailCount} 个`);
    
    // 手机号提取
    console.log('🔍 [DEBUG] 基础手机号提取开始...');
    const phonePattern = /(?:\+86|86)?[-\s]?1[3-9]\d{9}/g;
    let phoneCount = 0;
    while ((match = phonePattern.exec(processContent)) !== null) {
        results.phoneNumbers.add(match[0]);
        phoneCount++;
        console.log(`✅ [DEBUG] 基础手机号提取: ${match[0]}`);
    }
    console.log(`📊 [DEBUG] 基础手机号提取完成，共找到 ${phoneCount} 个`);
    
    // JS文件提取
    console.log('🔍 [DEBUG] 基础JS文件提取开始...');
    const jsPattern = /["'`]([^"'`]*\.js(?:\?[^"'`]*)?)["'`]/g;
    let jsCount = 0;
    while ((match = jsPattern.exec(processContent)) !== null) {
        results.jsFiles.add(match[1]);
        jsCount++;
        console.log(`✅ [DEBUG] 基础JS文件提取: ${match[1]}`);
    }
    console.log(`📊 [DEBUG] 基础JS文件提取完成，共找到 ${jsCount} 个`);
    
    // CSS文件提取
    console.log('🔍 [DEBUG] 基础CSS文件提取开始...');
    const cssPattern = /["'`]([^"'`]*\.css(?:\?[^"'`]*)?)["'`]/g;
    let cssCount = 0;
    while ((match = cssPattern.exec(processContent)) !== null) {
        results.cssFiles.add(match[1]);
        cssCount++;
        console.log(`✅ [DEBUG] 基础CSS文件提取: ${match[1]}`);
    }
    console.log(`📊 [DEBUG] 基础CSS文件提取完成，共找到 ${cssCount} 个`);
    
    // 图片文件提取
    console.log('🔍 [DEBUG] 基础图片文件提取开始...');
    const imagePattern = /["'`]([^"'`]*\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff)(?:\?[^"'`]*)?)["'`]/g;
    let imageCount = 0;
    while ((match = imagePattern.exec(processContent)) !== null) {
        results.images.add(match[1]);
        imageCount++;
        console.log(`✅ [DEBUG] 基础图片文件提取: ${match[1]}`);
    }
    console.log(`📊 [DEBUG] 基础图片文件提取完成，共找到 ${imageCount} 个`);
    
    // URL提取
    console.log('🔍 [DEBUG] 基础URL提取开始...');
    const urlPattern = /(https?:\/\/[a-zA-Z0-9\-\.]+(?:\:[0-9]+)?(?:\/[^\s"'<>]*)?)/g;
    let urlCount = 0;
    while ((match = urlPattern.exec(processContent)) !== null) {
        const url = match[1];
        if (url && !url.includes('chrome-extension://') && !url.includes('moz-extension://')) {
            results.urls.add(url);
            urlCount++;
            console.log(`✅ [DEBUG] 基础URL提取: ${url}`);
        }
    }
    console.log(`📊 [DEBUG] 基础URL提取完成，共找到 ${urlCount} 个`);
    
    // IP地址提取
    console.log('🔍 [DEBUG] 基础IP地址提取开始...');
    const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    let ipCount = 0;
    while ((match = ipPattern.exec(processContent)) !== null) {
        results.ipAddresses.add(match[0]);
        ipCount++;
        console.log(`✅ [DEBUG] 基础IP地址提取: ${match[0]}`);
    }
    console.log(`📊 [DEBUG] 基础IP地址提取完成，共找到 ${ipCount} 个`);
    
    // JWT令牌提取
    console.log('🔍 [DEBUG] 基础JWT令牌提取开始...');
    const jwtPattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
    let jwtCount = 0;
    while ((match = jwtPattern.exec(processContent)) !== null) {
        results.jwts.add(match[0]);
        jwtCount++;
        console.log(`✅ [DEBUG] 基础JWT令牌提取: ${match[0]}`);
    }
    console.log(`📊 [DEBUG] 基础JWT令牌提取完成，共找到 ${jwtCount} 个`);
    
    // 敏感关键词提取
    console.log('🔍 [DEBUG] 基础敏感关键词提取开始...');
    const sensitivePattern = /(?:password|passwd|pwd|token|auth|authorization|secret|key|api_key|access_key)\s*[:=]\s*["'`]([^"'`\s]+)["'`]/gi;
    let sensitiveCount = 0;
    while ((match = sensitivePattern.exec(processContent)) !== null) {
        results.sensitiveKeywords.add(match[0]);
        sensitiveCount++;
        console.log(`✅ [DEBUG] 基础敏感关键词提取: ${match[0]}`);
    }
    console.log(`📊 [DEBUG] 基础敏感关键词提取完成，共找到 ${sensitiveCount} 个`);
    
    console.log('✅ [DEBUG] 基础正则提取完成');
}

// 从内容中收集新URL
function collectUrlsFromContent(content) {
    const urls = new Set();
    const baseUrl = scanConfig.baseUrl;
    
    const maxContentLength = 500000;
    const processedContent = content.length > maxContentLength ? 
        content.substring(0, maxContentLength) : content;
    
    const urlPatterns = [
        /(?:href|src|import|require|from|url|endpoint|path|location)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
        /["'`]([^"'`]*\/[^"'`]*\.[a-zA-Z0-9]{1,5}(?:\?[^"'`]*)?)["'`]/gi,
        /["'`]([\/][a-zA-Z0-9\/_\-\.]+)["'`]/g,
        /["'`](\.\.[\/\\][^"'`]+)["'`]/g,
        /["'`](https?:\/\/[^"'`\s]+)["'`]/g
    ];
    
    urlPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(processedContent)) !== null) {
            const extractedUrl = match[1];
            if (!extractedUrl) continue;
            
            if (extractedUrl.startsWith('#') || 
                extractedUrl.startsWith('javascript:') || 
                extractedUrl.startsWith('mailto:') ||
                extractedUrl.startsWith('data:') ||
                extractedUrl.length < 2) {
                continue;
            }
            
            const isJsResource = /\.(js|ts|jsx|tsx|vue|json)(\?|$)/i.test(extractedUrl);
            const isHtmlResource = isValidPageUrl(extractedUrl);
            const isApiResource = isValidApiUrl(extractedUrl);
            
            if ((scanConfig.scanJsFiles && isJsResource) || 
                (scanConfig.scanHtmlFiles && isHtmlResource) || 
                (scanConfig.scanApiFiles && isApiResource)) {
                
                const fullUrl = resolveUrl(extractedUrl, baseUrl);
                if (fullUrl && isSameDomain(fullUrl, baseUrl)) {
                    urls.add(fullUrl);
                }
            }
        }
    });
    
    return Array.from(urls);
}

// 合并结果
async function mergeResults(newResults) {
    let hasNewData = false;
    
    // 在合并前，先处理新结果中的相对路径API
    if (newResults.relativeApis && newResults.relativeApis.length > 0) {
        console.log('🔍 [DEBUG] 合并时发现新的相对路径API:', newResults.relativeApis);
        
        if (!newResults.absoluteApis) {
            newResults.absoluteApis = [];
        }
        
        newResults.relativeApis.forEach(relativeApi => {
            try {
                const fullUrl = convertRelativeToAbsolute(relativeApi);
                if (fullUrl && fullUrl !== relativeApi) {
                    if (!newResults.absoluteApis.includes(fullUrl)) {
                        newResults.absoluteApis.push(fullUrl);
                        console.log('🔄 合并时转换新结果中的相对路径API:', relativeApi, '->', fullUrl);
                    }
                }
            } catch (error) {
                console.warn('⚠️ 合并时转换新结果中的相对路径API失败:', relativeApi, error);
            }
        });
        
        // 强制清空新结果中的相对路径API
        newResults.relativeApis = [];
        console.log('✅ 合并时已强制清空新结果中的relativeApis');
    }
    
    // 确保scanResults中的相对路径API也被转换（防止之前遗留）
    if (scanResults.relativeApis && scanResults.relativeApis.length > 0) {
        console.log('🔍 [DEBUG] 合并前发现scanResults中仍有相对路径API，进行转换:', scanResults.relativeApis);
        
        if (!scanResults.absoluteApis) {
            scanResults.absoluteApis = [];
        }
        
        scanResults.relativeApis.forEach(relativeApi => {
            try {
                const fullUrl = convertRelativeToAbsolute(relativeApi);
                if (fullUrl && fullUrl !== relativeApi) {
                    if (!scanResults.absoluteApis.includes(fullUrl)) {
                        scanResults.absoluteApis.push(fullUrl);
                        console.log('🔄 合并前转换scanResults中的相对路径API:', relativeApi, '->', fullUrl);
                        hasNewData = true;
                    }
                }
            } catch (error) {
                console.warn('⚠️ 合并前转换scanResults中的相对路径API失败:', relativeApi, error);
            }
        });
        
        // 强制清空scanResults中的相对路径API
        scanResults.relativeApis = [];
        console.log('✅ 合并前已强制清空scanResults中的relativeApis');
    }
    
    Object.keys(newResults).forEach(key => {
        // 跳过relativeApis，因为已经转换并清空了
        if (key === 'relativeApis') {
            return;
        }
        
        if (!scanResults[key]) {
            scanResults[key] = [];
        }
        
        const existingSet = new Set(scanResults[key]);
        newResults[key].forEach(item => {
            if (item && !existingSet.has(item)) {
                scanResults[key].push(item);
                hasNewData = true;
            }
        });
    });
    
    // 最终确保relativeApis为空数组
    scanResults.relativeApis = [];
    
    if (hasNewData) {
        // 暂时禁用筛选器应用，防止数据丢失
        console.log('🔍 [DEBUG] 跳过筛选器应用，直接更新显示以防止数据丢失');
        console.log('🔍 [DEBUG] 合并后scanResults.urls数量:', scanResults.urls ? scanResults.urls.length : 0);
        
        await saveResultsToStorage();
        
        // 使用防抖机制，避免频繁更新界面导致滚动位置丢失
        if (window.updateDisplayTimeout) {
            clearTimeout(window.updateDisplayTimeout);
        }
        
        window.updateDisplayTimeout = setTimeout(() => {
            updateResultsDisplay();
            updateStatusDisplay();
        }, 300); // 300ms防抖延迟
    }
}

// 保存结果到chrome.storage
async function saveResultsToStorage() {
    try {
        const baseUrl = scanConfig.baseUrl;
        const hostname = new URL(baseUrl).hostname;
        
        const resultsKey = `${hostname}__results`;
        const lastSaveKey = `${hostname}__lastSave`;
        const deepStateKey = `${hostname}__deepState`;
        const now = Date.now();
        
        const existingData = await chrome.storage.local.get([resultsKey]);
        const existingResults = existingData[resultsKey] || {};
        
        // 在保存前，确保相对路径API被转换为完整URL
        const processedScanResults = { ...scanResults };
        
        // 将相对路径API转换为完整URL并合并到absoluteApis中
        if (processedScanResults.relativeApis && processedScanResults.relativeApis.length > 0) {
            console.log('🔍 [DEBUG] 保存前转换相对路径API:', processedScanResults.relativeApis);
            
            if (!processedScanResults.absoluteApis) {
                processedScanResults.absoluteApis = [];
            }
            
            processedScanResults.relativeApis.forEach(relativeApi => {
                try {
                    const fullUrl = convertRelativeToAbsolute(relativeApi);
                    if (fullUrl && fullUrl !== relativeApi) {
                        if (!processedScanResults.absoluteApis.includes(fullUrl)) {
                            processedScanResults.absoluteApis.push(fullUrl);
                            console.log('🔄 保存时转换相对路径API:', relativeApi, '->', fullUrl);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ 保存时转换相对路径API失败:', relativeApi, error);
                }
            });
            
            // 清空相对路径API，避免重复存储
            processedScanResults.relativeApis = [];
            console.log('✅ 保存时已清空relativeApis，所有API都存储在absoluteApis中');
        }
        
        const mergedResults = {};
        const categories = [
            'absoluteApis', 'relativeApis', 'modulePaths', 'domains', 'urls', 
            'images', 'jsFiles', 'cssFiles', 'emails', 'phoneNumbers', 
            'ipAddresses', 'sensitiveKeywords', 'comments', 'paths', 
            'parameters', 'credentials', 'cookies', 'idKeys', 'companies', 
            'jwts', 'githubUrls', 'vueFiles',
            'bearerTokens', 'basicAuth', 'authHeaders', 'wechatAppIds',
            'awsKeys', 'googleApiKeys', 'githubTokens', 'gitlabTokens',
            'webhookUrls', 'idCards', 'cryptoUsage'
        ];
        
        categories.forEach(category => {
            const existingItems = existingResults[category] || [];
            const newItems = processedScanResults[category] || [];
            
            // 对于relativeApis，强制清空存储，将所有相对路径API转换为完整URL
            if (category === 'relativeApis') {
                // 如果存在旧的相对路径API数据，转换并合并到absoluteApis中
                if (existingItems.length > 0) {
                    console.log('🔍 [DEBUG] 发现存储中的旧相对路径API，转换并合并:', existingItems);
                    
                    if (!mergedResults.absoluteApis) {
                        mergedResults.absoluteApis = [...(existingResults.absoluteApis || []), ...(processedScanResults.absoluteApis || [])];
                    }
                    
                    existingItems.forEach(relativeApi => {
                        try {
                            const fullUrl = convertRelativeToAbsolute(relativeApi);
                            if (fullUrl && fullUrl !== relativeApi) {
                                if (!mergedResults.absoluteApis.includes(fullUrl)) {
                                    mergedResults.absoluteApis.push(fullUrl);
                                    console.log('🔄 合并时转换旧相对路径API:', relativeApi, '->', fullUrl);
                                }
                            }
                        } catch (error) {
                            console.warn('⚠️ 合并时转换旧相对路径API失败:', relativeApi, error);
                        }
                    });
                }
                
                // 强制清空相对路径API存储，确保不再保存任何相对路径API
                mergedResults[category] = [];
                console.log('✅ 强制清空relativeApis存储键');
                return;
            }
            
            // 对于absoluteApis，确保包含所有转换后的API
            if (category === 'absoluteApis') {
                const combinedSet = new Set([...existingItems, ...newItems]);
                mergedResults[category] = Array.from(combinedSet);
                return;
            }
            
            // 其他类别正常合并
            const combinedSet = new Set([...existingItems, ...newItems]);
            mergedResults[category] = Array.from(combinedSet);
        });
        
        // 最终检查：确保relativeApis为空数组
        mergedResults.relativeApis = [];
        
        console.log('🔍 [DEBUG] 最终保存的数据:', mergedResults);
        console.log('🔍 [DEBUG] relativeApis数组长度:', mergedResults.relativeApis.length);
        console.log('🔍 [DEBUG] absoluteApis数组长度:', mergedResults.absoluteApis.length);
        
        const saveData = {
            [resultsKey]: mergedResults,
            [lastSaveKey]: now,
            [deepStateKey]: {
                maxDepth: scanConfig.maxDepth,
                currentDepth: currentDepth,
                concurrency: scanConfig.concurrency,
                running: isScanRunning,
                scannedUrls: Array.from(scannedUrls)
            }
        };
        
        await chrome.storage.local.set(saveData);
        
        chrome.runtime.sendMessage({
            action: 'deepScanDataSaved',
            resultsKey: resultsKey,
            hostname: hostname
        }).catch(error => {
            console.log('通知主扩展失败（可能已关闭）:', error);
        });
        
    } catch (error) {
        console.error('❌ 保存深度扫描结果失败:', error);
    }
}

// 完成扫描
async function completeScan() {
    isScanRunning = false;
    isPaused = false;
    
    addLogEntry('深度扫描完成！', 'success');
    
    await saveResultsToStorage();
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const headerTitle = document.querySelector('.header h1');
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停扫描';
    }
    if (stopBtn) stopBtn.disabled = true;
    
    if (headerTitle) {
        headerTitle.textContent = '✅ 深度扫描完成';
    }
    
    const totalScanned = scannedUrls.size;
    const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    addLogEntry(`扫描完成！扫描了 ${totalScanned} 个文件，提取了 ${totalResults} 个项目`, 'success');
    
    try {
        chrome.runtime.sendMessage({
            action: 'deepScanCompleted',
            summary: {
                totalScanned,
                totalResults,
                scanDepth: currentDepth
            }
        });
    } catch (error) {
        console.log('通知主扩展失败（可能已关闭），但结果已保存到storage:', error);
    }
}

// 更新状态显示
function updateStatusDisplay() {
    try {
        const elements = {
            currentDepth: document.getElementById('currentDepth'),
            scannedUrls: document.getElementById('scannedUrls'),
            pendingUrls: document.getElementById('pendingUrls'),
            totalResults: document.getElementById('totalResults')
        };
        
        if (elements.currentDepth) {
            elements.currentDepth.textContent = currentDepth;
        }
        if (elements.scannedUrls) {
            elements.scannedUrls.textContent = scannedUrls.size;
        }
        if (elements.pendingUrls) {
            elements.pendingUrls.textContent = pendingUrls.size;
        }
        
        const totalResults = Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        if (elements.totalResults) {
            elements.totalResults.textContent = totalResults;
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] 更新状态显示失败:', error);
    }
}

// 更新进度显示
function updateProgressDisplay(current, total, stage) {
    try {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText) {
            progressText.textContent = `${stage}: ${current}/${total} (${percentage.toFixed(1)}%)`;
        }
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] 更新进度显示失败:', error);
    }
}

// 更新结果显示
function updateResultsDisplay() {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) {
        console.error('❌ [DEBUG] 找不到resultsSection元素');
        return;
    }
    
    // 保存当前滚动位置和展开状态
    const scrollPositions = new Map();
    const expandedStates = new Map();
    
    // 记录每个分类容器的滚动位置和展开状态
    const existingCategories = resultsSection.querySelectorAll('.result-category');
    existingCategories.forEach((category, index) => {
        const title = category.querySelector('h3');
        if (title) {
            const categoryKey = title.textContent.split(' (')[0]; // 提取分类名称
            scrollPositions.set(categoryKey, category.scrollTop);
            
            // 检查是否有展开的toggle按钮
            const toggleItem = category.querySelector('.toggle-item');
            if (toggleItem) {
                const isExpanded = toggleItem.textContent.includes('收起');
                expandedStates.set(categoryKey, isExpanded);
            }
        }
    });
    
    // 保存整个结果区域的滚动位置
    const mainScrollTop = resultsSection.scrollTop;
    
    resultsSection.innerHTML = '';
    
    console.log('🔍 [DEBUG] 更新结果显示，当前扫描结果:', scanResults);
    console.log('🔍 [DEBUG] absoluteApis数据:', scanResults.absoluteApis);
    console.log('🔍 [DEBUG] relativeApis数据:', scanResults.relativeApis);
    
    const categories = [
        { key: 'urls', title: '完整URL', color: '#00d4aa' },
        { key: 'absoluteApis', title: 'API接口', color: '#26de81' },
        { key: 'relativeApis', title: '相对路径API', color: '#55a3ff' },
        { key: 'modulePaths', title: '模块路径', color: '#fd79a8' },
        { key: 'domains', title: '域名', color: '#ffa502' },
        { key: 'emails', title: '邮箱地址', color: '#ff4757' },
        { key: 'phoneNumbers', title: '手机号码', color: '#a55eea' },
        { key: 'ipAddresses', title: 'IP地址', color: '#00b894' },
        { key: 'jsFiles', title: 'JS文件', color: '#fd79a8' },
        { key: 'cssFiles', title: 'CSS文件', color: '#fdcb6e' },
        { key: 'vueFiles', title: 'Vue文件', color: '#00b894' },
        { key: 'images', title: '图片文件', color: '#74b9ff' },
        { key: 'sensitiveKeywords', title: '敏感关键词', color: '#e84393' },
        { key: 'comments', title: '注释内容', color: '#81ecec' },
        { key: 'paths', title: '路径信息', color: '#ffeaa7' },
        { key: 'parameters', title: '参数名称', color: '#fab1a0' },
        { key: 'credentials', title: '敏感凭据', color: '#ff7675' },
        { key: 'cookies', title: 'Cookie信息', color: '#fd79a8' },
        { key: 'idKeys', title: 'ID密钥', color: '#fdcb6e' },
        { key: 'companies', title: '公司名称', color: '#55efc4' },
        { key: 'jwts', title: 'JWT Token', color: '#0984e3' },
        { key: 'githubUrls', title: 'GitHub链接', color: '#2d3436' },
        { key: 'bearerTokens', title: 'Bearer Token', color: '#6c5ce7' },
        { key: 'basicAuth', title: '基础认证', color: '#e17055' },
        { key: 'authHeaders', title: '认证头', color: '#d63031' },
        { key: 'wechatAppIds', title: '微信AppID', color: '#00cec9' },
        { key: 'awsKeys', title: 'AWS密钥', color: '#b2bec3' },
        { key: 'googleApiKeys', title: 'Google API密钥', color: '#55efc4' },
        { key: 'githubTokens', title: 'GitHub Token', color: '#2d3436' },
        { key: 'gitlabTokens', title: 'GitLab Token', color: '#636e72' },
        { key: 'webhookUrls', title: 'Webhook URL', color: '#7f8fa6' },
        { key: 'idCards', title: '身份证号', color: '#e84393' },
        { key: 'cryptoUsage', title: '加密使用', color: '#00cec9' }
    ];
    
    let totalDisplayedItems = 0;
    
    categories.forEach(category => {
        const items = scanResults[category.key] || [];
        console.log(`🔍 [DEBUG] 处理分类 ${category.key}: ${items.length} 个项目`);
        
        if (items.length > 0) {
            totalDisplayedItems += items.length;
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'result-category';
            
            const title = document.createElement('h3');
            title.textContent = `${category.title} (${items.length})`;
            title.style.color = category.color;
            
            const list = document.createElement('ul');
            list.className = 'result-list';
            
            // 创建可展开/收缩的显示区域
            const initialDisplayCount = 50;
            const shouldCollapse = items.length > initialDisplayCount;
            
            // 显示初始项目
            const displayItems = shouldCollapse ? items.slice(0, initialDisplayCount) : items;
            console.log(`🔍 [DEBUG] ${category.key} 显示项目:`, displayItems);
            
            displayItems.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'result-item';
                listItem.textContent = item;
                listItem.title = item; // 添加tooltip显示完整内容
                list.appendChild(listItem);
            });
            
            // 如果有更多项目，添加展开/收缩功能
            if (shouldCollapse) {
                const toggleItem = document.createElement('li');
                toggleItem.className = 'result-item toggle-item';
                toggleItem.style.cssText = `
                    cursor: pointer;
                    font-style: italic;
                    opacity: 0.8;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 8px;
                    border-radius: 4px;
                    margin: 5px 0;
                    text-align: center;
                    transition: all 0.3s ease;
                `;
                toggleItem.textContent = `▼ 显示全部 ${items.length} 个项目 (当前显示 ${initialDisplayCount} 个)`;
                
                let isExpanded = false;
                const hiddenItems = [];
                
                // 预创建隐藏的项目元素
                items.slice(initialDisplayCount).forEach((item, index) => {
                    const listItem = document.createElement('li');
                    listItem.className = 'result-item hidden-item';
                    listItem.textContent = item;
                    listItem.title = item;
                    listItem.style.display = 'none';
                    hiddenItems.push(listItem);
                });
                
                toggleItem.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    
                    if (isExpanded) {
                        // 展开：显示所有隐藏项目
                        hiddenItems.forEach(item => {
                            item.style.display = 'block';
                            list.insertBefore(item, toggleItem);
                        });
                        toggleItem.textContent = `▲ 收起显示 (共 ${items.length} 个项目)`;
                        toggleItem.style.background = 'rgba(0, 212, 170, 0.2)';
                    } else {
                        // 收起：隐藏额外项目
                        hiddenItems.forEach(item => {
                            item.style.display = 'none';
                            if (item.parentNode) {
                                item.parentNode.removeChild(item);
                            }
                        });
                        toggleItem.textContent = `▼ 显示全部 ${items.length} 个项目 (当前显示 ${initialDisplayCount} 个)`;
                        toggleItem.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                });
                
                toggleItem.addEventListener('mouseenter', () => {
                    toggleItem.style.background = isExpanded ? 'rgba(0, 212, 170, 0.3)' : 'rgba(255, 255, 255, 0.2)';
                });
                
                toggleItem.addEventListener('mouseleave', () => {
                    toggleItem.style.background = isExpanded ? 'rgba(0, 212, 170, 0.2)' : 'rgba(255, 255, 255, 0.1)';
                });
                
                list.appendChild(toggleItem);
            }
            
            categoryDiv.appendChild(title);
            categoryDiv.appendChild(list);
            resultsSection.appendChild(categoryDiv);
            
            console.log(`✅ [DEBUG] 已添加分类 ${category.title} 到显示区域`);
        }
    });
    
    console.log(`🔍 [DEBUG] 总共显示了 ${totalDisplayedItems} 个项目`);
    
    // 如果没有任何数据，显示提示信息
    if (totalDisplayedItems === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'no-data-message';
        noDataDiv.style.cssText = `
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-size: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 20px 0;
        `;
        noDataDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
            <div>暂无扫描结果</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.7;">扫描完成后结果将显示在这里</div>
        `;
        resultsSection.appendChild(noDataDiv);
        console.log('🔍 [DEBUG] 显示了"暂无数据"提示');
    }
    
    // 恢复滚动位置和展开状态
    setTimeout(() => {
        // 恢复主滚动位置
        if (mainScrollTop > 0) {
            resultsSection.scrollTop = mainScrollTop;
        }
        
        // 恢复每个分类的展开状态和滚动位置
        const newCategories = resultsSection.querySelectorAll('.result-category');
        newCategories.forEach((category) => {
            const title = category.querySelector('h3');
            if (title) {
                const categoryKey = title.textContent.split(' (')[0];
                
                // 恢复展开状态
                if (expandedStates.has(categoryKey) && expandedStates.get(categoryKey)) {
                    const toggleItem = category.querySelector('.toggle-item');
                    if (toggleItem && toggleItem.textContent.includes('显示全部')) {
                        toggleItem.click(); // 自动展开
                    }
                }
                
                // 恢复滚动位置
                if (scrollPositions.has(categoryKey)) {
                    const savedScrollTop = scrollPositions.get(categoryKey);
                    if (savedScrollTop > 0) {
                        category.scrollTop = savedScrollTop;
                    }
                }
            }
        });
        
        console.log('🔍 [DEBUG] 已恢复滚动位置和展开状态');
    }, 100); // 短暂延迟确保DOM更新完成
}

// 添加日志条目
function addLogEntry(message, type = 'info') {
    const logSection = document.getElementById('logSection');
    if (!logSection) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logSection.appendChild(logEntry);
    logSection.scrollTop = logSection.scrollHeight;
    
    const logEntries = logSection.querySelectorAll('.log-entry');
    if (logEntries.length > 100) {
        logEntries[0].remove();
    }
}

// 导出结果
function exportResults() {
    if (Object.keys(scanResults).length === 0 || 
        Object.values(scanResults).every(arr => !arr || arr.length === 0)) {
        addLogEntry('没有数据可导出', 'warning');
        return;
    }
    
    showExportModal();
}

// 显示导出弹窗
function showExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'flex';
        
        if (!window.exportModalListenersAdded) {
            addExportModalListeners();
            window.exportModalListenersAdded = true;
        }
    }
}

// 隐藏导出弹窗
function hideExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 添加导出弹窗事件监听器
function addExportModalListeners() {
    const closeBtn = document.getElementById('closeExportModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideExportModal());
    }
    
    const jsonBtn = document.getElementById('exportJSON');
    if (jsonBtn) {
        jsonBtn.addEventListener('click', async () => {
            hideExportModal();
            await exportToJSON();
        });
    }
    
    const xlsBtn = document.getElementById('exportXLS');
    if (xlsBtn) {
        xlsBtn.addEventListener('click', async () => {
            hideExportModal();
            await exportToXLS();
        });
    }
    
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                hideExportModal();
            }
        });
    }
}

// 导出为JSON格式
async function exportToJSON() {
    const data = {
        scanInfo: {
            timestamp: new Date().toISOString(),
            baseUrl: scanConfig.baseUrl,
            maxDepth: scanConfig.maxDepth,
            scannedUrls: scannedUrls.size,
            totalResults: Object.values(scanResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        },
        results: scanResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = await generateFileName('json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLogEntry('JSON格式结果已导出', 'success');
}

// 导出为XLS格式
async function exportToXLS() {
    let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影深度扫描工具</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D4EDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>`;

    const categories = Object.keys(scanResults);
    let hasData = false;

    categories.forEach(category => {
        const items = scanResults[category];
        if (Array.isArray(items) && items.length > 0) {
            hasData = true;
            const sheetName = sanitizeSheetName(category);
            
            xlsContent += `
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Column ss:Width="50"/>
   <Column ss:Width="400"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">序号</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">内容</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">分类</Data></Cell>
   </Row>`;

            items.forEach((item, index) => {
                xlsContent += `
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(item)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${escapeXml(category)}</Data></Cell>
   </Row>`;
            });

            xlsContent += `
  </Table>
 </Worksheet>`;
        }
    });

    if (!hasData) {
        xlsContent += `
 <Worksheet ss:Name="无数据">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有找到任何数据</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
    }

    xlsContent += `
</Workbook>`;

    const blob = new Blob([xlsContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = await generateFileName('xls');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    addLogEntry('XLS格式结果已导出', 'success');
}

// 清理工作表名称
function sanitizeSheetName(name) {
    let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
    if (sanitized.length > 31) {
        sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || '未命名';
}

// XML转义
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// 全局展开/收起所有分类
function toggleAllCategories() {
    const toggleBtn = document.getElementById('toggleAllBtn');
    const allToggleItems = document.querySelectorAll('.toggle-item');
    
    if (!toggleBtn || allToggleItems.length === 0) {
        return;
    }
    
    const isCurrentlyExpanded = toggleBtn.textContent.includes('收起');
    
    allToggleItems.forEach(toggleItem => {
        // 模拟点击每个展开/收起按钮
        const shouldClick = isCurrentlyExpanded ? 
            toggleItem.textContent.includes('收起') : 
            toggleItem.textContent.includes('显示全部');
        
        if (shouldClick) {
            toggleItem.click();
        }
    });
    
    // 更新全局按钮文本
    toggleBtn.textContent = isCurrentlyExpanded ? '全部展开' : '全部收起';
}

// 工具函数
function resolveUrl(url, baseUrl) {
    try {
        if (!url) return null;
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        if (url.startsWith('//')) {
            return new URL(baseUrl).protocol + url;
        }
        
        return new URL(url, baseUrl).href;
        
    } catch (error) {
        return null;
    }
}

function isSameDomain(url, baseUrl) {
    try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        return urlObj.hostname === baseUrlObj.hostname;
    } catch (error) {
        return false;
    }
}

function isPageUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
        return false;
    }
    
    const resourceExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|woff2|map|pdf|zip)$/i;
    return !resourceExtensions.test(url.toLowerCase());
}

function isValidPageUrl(url) {
    return isPageUrl(url);
}

function isValidApiUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
        return false;
    }
    
    const apiFeatures = [
        /\/api\//i,
        /\/admin\//i,
        /\/manage\//i,
        /\/backend\//i,
        /\/service\//i,
        /\.(php|asp|aspx|jsp|do|action|json|xml|csv)(\?|$)/i
    ];
    
    return apiFeatures.some(pattern => pattern.test(url));
}

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializePage();
    });
} else {
    initializePage();
}

window.addEventListener('load', () => {
    console.log('🔍 [DEBUG] window.onload事件触发');
});

window.addEventListener('error', (event) => {
    console.error('❌ [DEBUG] 全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ [DEBUG] 未处理的Promise拒绝:', event.reason);
});
