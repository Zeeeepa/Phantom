// 深度扫描修复补丁 - 确保使用所有正则表达式
// 这个补丁修复了深度扫描不使用完整正则的问题

// 修复后的extractFromContent函数
function extractFromContent_Fixed(content, sourceUrl) {
    console.log('🔍 [DEBUG] extractFromContent_Fixed 开始提取，内容长度:', content.length);
    console.log('🔍 [DEBUG] 来源URL:', sourceUrl);
    console.log('🔍 [DEBUG] PatternExtractor 可用性:', !!patternExtractor);
    
    const maxContentLength = 500000;
    const processedContent = content.length > maxContentLength ?
        content.substring(0, maxContentLength) : content;
    
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
    
    // 强制使用PatternExtractor的完整提取功能
    if (patternExtractor) {
        console.log('✅ [DEBUG] 使用PatternExtractor进行完整提取');
        
        try {
            // 确保PatternExtractor已初始化
            if (typeof patternExtractor.ensureCustomPatternsLoaded === 'function') {
                console.log('🔄 [DEBUG] 确保自定义正则已加载');
                try {
                    patternExtractor.ensureCustomPatternsLoaded();
                } catch (e) {
                    console.warn('⚠️ [DEBUG] 自定义正则加载警告:', e);
                }
            }
            
            // 调用PatternExtractor的所有提取方法
            console.log('🔍 [DEBUG] 开始API提取...');
            if (typeof patternExtractor.extractAPIs === 'function') {
                patternExtractor.extractAPIs(processedContent, results);
                console.log('✅ [DEBUG] API提取完成');
            }
            
            console.log('🔍 [DEBUG] 开始其他资源提取...');
            if (typeof patternExtractor.extractOtherResources === 'function') {
                patternExtractor.extractOtherResources(processedContent, results);
                console.log('✅ [DEBUG] 其他资源提取完成');
            }
            
            console.log('🔍 [DEBUG] 开始敏感数据提取...');
            if (typeof patternExtractor.extractSensitiveData === 'function') {
                patternExtractor.extractSensitiveData(processedContent, results);
                console.log('✅ [DEBUG] 敏感数据提取完成');
            }
            
            console.log('✅ [DEBUG] PatternExtractor提取完成');
        } catch (error) {
            console.error('❌ [DEBUG] PatternExtractor提取失败:', error);
        }
    }
    
    // 强制补充敏感信息提取（确保所有敏感信息都被提取）
    console.log('🔍 [DEBUG] 开始强制补充敏感信息提取...');
    extractAdditionalSensitiveData_Fixed(processedContent, results);
    
    // 强制基础模式提取（作为兜底保障）
    console.log('🔍 [DEBUG] 开始基础模式提取（兜底保障）...');
    extractBasicPatterns_Fixed(processedContent, results);
    
    // 转换Set为Array
    const finalResults = {};
    Object.keys(results).forEach(key => {
        finalResults[key] = Array.from(results[key]).filter(Boolean);
    });
    
    console.log('🎯 [DEBUG] 最终提取结果统计:', Object.keys(finalResults).map(key => `${key}: ${finalResults[key].length}`).join(', '));
    
    // 详细输出每个分类的前几个结果用于调试
    Object.keys(finalResults).forEach(key => {
        if (finalResults[key].length > 0) {
            console.log(`📋 [DEBUG] ${key} (${finalResults[key].length}个):`, finalResults[key].slice(0, 3));
        }
    });
    
    return finalResults;
}

// 修复后的补充敏感信息提取函数
function extractAdditionalSensitiveData_Fixed(content, results) {
    console.log('🔍 [DEBUG] 开始补充敏感信息提取...');
    
    const maxContentSize = 300000;
    const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
    
    // Bearer Token提取
    console.log('🔍 [DEBUG] 补充Bearer Token提取...');
    const bearerTokenPattern = /[Bb]earer\s+[a-zA-Z0-9\-=._+/\\]{20,500}/g;
    let match;
    let bearerCount = 0;
    while ((match = bearerTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] Bearer Token匹配: "${match[0]}"`);
        results.bearerTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        bearerCount++;
    }
    console.log(`📊 [DEBUG] Bearer Token提取完成，共找到 ${bearerCount} 个`);
    
    // Basic Auth提取
    console.log('🔍 [DEBUG] 补充Basic Auth提取...');
    const basicAuthPattern = /[Bb]asic\s+[A-Za-z0-9+/]{18,}={0,2}/g;
    let basicAuthCount = 0;
    while ((match = basicAuthPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] Basic Auth匹配: "${match[0]}"`);
        results.basicAuth.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        basicAuthCount++;
    }
    console.log(`📊 [DEBUG] Basic Auth提取完成，共找到 ${basicAuthCount} 个`);
    
    // Authorization Header提取
    console.log('🔍 [DEBUG] 补充Authorization Header提取...');
    const authHeaderPattern = /[Aa]uthorization\s*[:=]\s*["']?([^"'\s]+)["']?/g;
    let authHeaderCount = 0;
    while ((match = authHeaderPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] Authorization Header匹配: "${match[0]}"`);
        results.authHeaders.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        authHeaderCount++;
    }
    console.log(`📊 [DEBUG] Authorization Header提取完成，共找到 ${authHeaderCount} 个`);
    
    // 微信AppID提取
    console.log('🔍 [DEBUG] 补充微信AppID提取...');
    const wechatAppIdPattern = /wx[a-f0-9]{16}/g;
    let wechatCount = 0;
    while ((match = wechatAppIdPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 微信AppID匹配: "${match[0]}"`);
        results.wechatAppIds.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        wechatCount++;
    }
    console.log(`📊 [DEBUG] 微信AppID提取完成，共找到 ${wechatCount} 个`);
    
    // AWS密钥提取
    console.log('🔍 [DEBUG] 补充AWS密钥提取...');
    const awsKeyPattern = /(?:AKIA|ASIA|AROA|AIDA|AGPA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g;
    let awsCount = 0;
    while ((match = awsKeyPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] AWS密钥匹配: "${match[0]}"`);
        results.awsKeys.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        awsCount++;
    }
    console.log(`📊 [DEBUG] AWS密钥提取完成，共找到 ${awsCount} 个`);
    
    // Google API密钥提取
    console.log('🔍 [DEBUG] 补充Google API密钥提取...');
    const googleApiKeyPattern = /AIza[0-9A-Za-z\-_]{35}/g;
    let googleCount = 0;
    while ((match = googleApiKeyPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] Google API密钥匹配: "${match[0]}"`);
        results.googleApiKeys.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        googleCount++;
    }
    console.log(`📊 [DEBUG] Google API密钥提取完成，共找到 ${googleCount} 个`);
    
    // GitHub Token提取
    console.log('🔍 [DEBUG] 补充GitHub Token提取...');
    const githubTokenPattern = /ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}/g;
    let githubTokenCount = 0;
    while ((match = githubTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] GitHub Token匹配: "${match[0]}"`);
        results.githubTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        githubTokenCount++;
    }
    console.log(`📊 [DEBUG] GitHub Token提取完成，共找到 ${githubTokenCount} 个`);
    
    // GitLab Token提取
    console.log('🔍 [DEBUG] 补充GitLab Token提取...');
    const gitlabTokenPattern = /glpat-[a-zA-Z0-9\-_]{20}/g;
    let gitlabTokenCount = 0;
    while ((match = gitlabTokenPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] GitLab Token匹配: "${match[0]}"`);
        results.gitlabTokens.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        gitlabTokenCount++;
    }
    console.log(`📊 [DEBUG] GitLab Token提取完成，共找到 ${gitlabTokenCount} 个`);
    
    // Webhook URL提取
    console.log('🔍 [DEBUG] 补充Webhook URL提取...');
    const webhookUrlPattern = /https?:\/\/(?:qyapi\.weixin\.qq\.com\/cgi-bin\/webhook|oapi\.dingtalk\.com\/robot|open\.feishu\.cn\/open-apis\/bot|hooks\.slack\.com\/services)[^\s"'<>]+/g;
    let webhookCount = 0;
    while ((match = webhookUrlPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] Webhook URL匹配: "${match[0]}"`);
        results.webhookUrls.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        webhookCount++;
    }
    console.log(`📊 [DEBUG] Webhook URL提取完成，共找到 ${webhookCount} 个`);
    
    // 身份证号提取
    console.log('🔍 [DEBUG] 补充身份证号提取...');
    const idCardPattern = /[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]/g;
    let idCardCount = 0;
    while ((match = idCardPattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 身份证号匹配: "${match[0]}"`);
        results.idCards.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        idCardCount++;
    }
    console.log(`📊 [DEBUG] 身份证号提取完成，共找到 ${idCardCount} 个`);
    
    // 加密使用提取
    console.log('🔍 [DEBUG] 补充加密使用提取...');
    const cryptoUsagePattern = /(?:CryptoJS|crypto|btoa|atob|sha256|sha1|md5|aes|des|rsa|base64)(?:\.[a-zA-Z]+)?/g;
    let cryptoCount = 0;
    while ((match = cryptoUsagePattern.exec(processContent)) !== null) {
        console.log(`🎯 [DEBUG] 加密使用匹配: "${match[0]}"`);
        results.cryptoUsage.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
        cryptoCount++;
    }
    console.log(`📊 [DEBUG] 加密使用提取完成，共找到 ${cryptoCount} 个`);
    
    console.log('✅ [DEBUG] 补充敏感信息提取完成');
}

// 修复后的基础模式提取函数
function extractBasicPatterns_Fixed(content, results) {
    console.log('📋 [DEBUG] 使用基础正则提取模式（兜底保障）');
    
    const maxContentSize = 300000;
    const processContent = content.length > maxContentSize ? content.substring(0, maxContentSize) : content;
    
    // 基础JWT提取
    const jwtPattern = /eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/g;
    let match;
    while ((match = jwtPattern.exec(processContent)) !== null) {
        results.jwts.add(match[0]);
        results.sensitiveKeywords.add(match[0]);
    }
    
    // 基础邮箱提取
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    while ((match = emailPattern.exec(processContent)) !== null) {
        results.emails.add(match[0]);
    }
    
    // 基础手机号提取
    const phonePattern = /1[3-9]\d{9}/g;
    while ((match = phonePattern.exec(processContent)) !== null) {
        results.phoneNumbers.add(match[0]);
    }
    
    // 基础域名提取
    const domainPattern = /(?:https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
    while ((match = domainPattern.exec(processContent)) !== null) {
        results.domains.add(match[1] || match[0]);
    }
    
    console.log('✅ [DEBUG] 基础模式提取完成');
}

// 应用修复补丁
console.log('🔧 [DEBUG] 应用深度扫描修复补丁...');

// 替换原有函数
if (typeof extractFromContent !== 'undefined') {
    window.extractFromContent_Original = extractFromContent;
    window.extractFromContent = extractFromContent_Fixed;
    console.log('✅ [DEBUG] extractFromContent函数已替换');
}

if (typeof extractAdditionalSensitiveData !== 'undefined') {
    window.extractAdditionalSensitiveData_Original = extractAdditionalSensitiveData;
    window.extractAdditionalSensitiveData = extractAdditionalSensitiveData_Fixed;
    console.log('✅ [DEBUG] extractAdditionalSensitiveData函数已替换');
}

if (typeof extractBasicPatterns !== 'undefined') {
    window.extractBasicPatterns_Original = extractBasicPatterns;
    window.extractBasicPatterns = extractBasicPatterns_Fixed;
    console.log('✅ [DEBUG] extractBasicPatterns函数已替换');
}

console.log('🎉 [DEBUG] 深度扫描修复补丁应用完成！');