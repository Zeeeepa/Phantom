/**
 * 显示管理器 - 负责结果展示和UI交互
 */
class DisplayManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async displayResults() {
        // 确保数据持久化
        if (this.srcMiner.results && Object.keys(this.srcMiner.results).length > 0) {
            this.srcMiner.saveResults();
        }
        
        // 如果当前没有结果，尝试从存储中恢复
        if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
            console.log('🔄 当前无结果，尝试从存储中恢复数据...');
            await this.srcMiner.loadResults();
            if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
                console.log('⚠️ 存储中也没有数据');
            }
        }
        
        const resultsDiv = document.getElementById('results');
        
        // 基础预定义类别
        const baseCategories = [
            { key: 'customApis', title: '自定义API路径', icon: '🔧' },
            { key: 'absoluteApis', title: '绝对路径API', icon: '/' },
            { key: 'relativeApis', title: '相对路径API', icon: '~' },
            { key: 'modulePaths', title: '模块路径', icon: './' },
            { key: 'domains', title: '域名', icon: '🌐' },
            { key: 'subdomains', title: '子域名', icon: 'sub' },
            { key: 'urls', title: '完整URL', icon: 'http' },
            { key: 'parameters', title: '参数', icon: 'param' },
            { key: 'ports', title: '端口', icon: 'port' },
            { key: 'jsFiles', title: 'JS文件', icon: '.js' },
            { key: 'cssFiles', title: 'CSS文件', icon: '.css' },
            { key: 'vueFiles', title: 'Vue文件', icon: '.vue' },
            { key: 'images', title: '图片文件', icon: '🖼️' },
            { key: 'audios', title: '音频文件', icon: '🎵' },
            { key: 'videos', title: '视频文件', icon: '🎬' },
            { key: 'emails', title: '邮箱地址', icon: '@' },
            { key: 'phoneNumbers', title: '手机号码', icon: '📱' },
            { key: 'ipAddresses', title: 'IP地址', icon: 'IP' },
            { key: 'credentials', title: '用户凭证', icon: '🔐' },
            { key: 'jwts', title: 'JWT Token', icon: '🎫' },
            { key: 'bearerTokens', title: 'Bearer Token', icon: 'Bearer' },
            { key: 'basicAuth', title: 'Basic Auth', icon: 'Basic' },
            { key: 'authHeaders', title: 'Authorization Header', icon: 'Auth' },
            { key: 'wechatAppIds', title: '微信AppID', icon: 'wx' },
            { key: 'awsKeys', title: 'AWS密钥', icon: 'AWS' },
            { key: 'googleApiKeys', title: 'Google API Key', icon: 'G' },
            { key: 'githubTokens', title: 'GitHub Token', icon: 'GH' },
            { key: 'gitlabTokens', title: 'GitLab Token', icon: 'GL' },
            { key: 'webhookUrls', title: 'Webhook URLs', icon: 'Hook' },
            { key: 'idCards', title: '身份证号', icon: '🆔' },
            { key: 'cryptoUsage', title: '加密算法', icon: 'Crypto' },
            { key: 'githubUrls', title: 'GitHub链接', icon: '🐙' },
            { key: 'companies', title: '公司机构', icon: '🏢' },
            { key: 'cookies', title: 'Cookie信息', icon: '🍪' },
            { key: 'idKeys', title: 'ID密钥', icon: '🔑' },
            { key: 'sensitiveKeywords', title: '敏感关键词', icon: '⚠️' },
            { key: 'comments', title: '代码注释', icon: '<!--' }
        ];

        // 动态加载自定义正则配置并添加到显示类别中 - 修复：支持对象和数组两种存储格式
        let categories = [...baseCategories];
        try {
            const result = await chrome.storage.local.get(['customRegexConfigs']);
            if (result.customRegexConfigs) {
                console.log('🔄 DisplayManager统一化版本加载动态自定义正则配置用于显示:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // 检查存储格式：对象格式还是数组格式
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数组格式
                    configsToProcess = result.customRegexConfigs;
                    console.log('📋 DisplayManager检测到数组格式的自定义正则配置');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // 对象格式，转换为数组
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // 添加 custom_ 前缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    console.log('📋 DisplayManager检测到对象格式的自定义正则配置，已转换为数组格式');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        if (config.key && config.name) {
                            categories.push({
                                key: config.key,
                                title: config.name,
                                icon: '🎯' // 自定义正则使用统一图标
                            });
                            console.log(`✅ DisplayManager统一化版本添加自定义正则显示类别: ${config.name} (${config.key})`);
                        }
                    });
                    
                    console.log(`✅ DisplayManager统一化版本动态自定义正则显示类别加载完成，共添加 ${configsToProcess.length} 个类别`);
                } else {
                    console.log('⚠️ DisplayManager统一化版本动态自定义正则配置为空');
                }
            } else {
                console.log('ℹ️ DisplayManager统一化版本未找到动态自定义正则配置');
            }
        } catch (error) {
            console.error('❌ DisplayManager统一化版本加载动态自定义正则配置失败:', error);
        }
        
        console.log('🔍 DisplayManager统一化版本开始显示结果，当前结果数据:', this.srcMiner.results);
        console.log('🔍 DisplayManager统一化版本开始显示结果，当前结果数据:', this.srcMiner.results);
        console.log('📊 DisplayManager统一化版本结果统计:', Object.keys(this.srcMiner.results || {}).map(key => `${key}: ${(this.srcMiner.results[key] || []).length}`).join(', '));
        
        // 尝试加载过滤器
        await this.loadFiltersIfNeeded();
        
        // 应用过滤器处理结果
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        // 检查是否有动态创建的自定义正则结果，并添加到显示类别中
        if (filteredResults) {
            const dynamicCustomKeys = Object.keys(filteredResults).filter(key => 
                key.startsWith('custom_') && 
                !categories.some(cat => cat.key === key)
            );
            
            if (dynamicCustomKeys.length > 0) {
                console.log(`🔍 DisplayManager发现 ${dynamicCustomKeys.length} 个动态自定义正则结果:`, dynamicCustomKeys);
                
                // 尝试从存储中获取配置名称以提供更好的显示名称
                try {
                    const result = await chrome.storage.local.get(['customRegexConfigs']);
                    const customConfigs = result.customRegexConfigs || {};
                    
                    dynamicCustomKeys.forEach(key => {
                        let displayName = key.replace('custom_', '自定义正则-');
                        
                        // 尝试找到对应的配置名称
                        const configKey = key.replace('custom_', '');
                        
                        // 支持对象和数组两种存储格式
                        if (Array.isArray(customConfigs)) {
                            // 数组格式
                            const config = customConfigs.find(c => c.key === key);
                            if (config && config.name) {
                                displayName = config.name;
                            }
                        } else if (typeof customConfigs === 'object') {
                            // 对象格式
                            if (customConfigs[configKey] && customConfigs[configKey].name) {
                                displayName = customConfigs[configKey].name;
                            }
                        }
                        
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        console.log(`✅ DisplayManager添加动态自定义正则显示类别: ${displayName} (${key})`);
                    });
                } catch (error) {
                    console.error('❌ 获取自定义正则配置名称失败:', error);
                    // 降级处理：使用默认名称
                    dynamicCustomKeys.forEach(key => {
                        const displayName = key.replace('custom_', '自定义正则-');
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        console.log(`✅ DisplayManager添加动态自定义正则显示类别(降级): ${displayName} (${key})`);
                    });
                }
            }
        }
        
        resultsDiv.innerHTML = '';
        let totalCount = 0;
        
        categories.forEach(category => {
            const items = filteredResults[category.key] || [];
            totalCount += items.length;
            
            if (items.length > 0) {
                const categoryDiv = this.createCategoryDiv(category, items);
                resultsDiv.appendChild(categoryDiv);
                
                // 如果是自定义正则结果，显示详细日志
                if (category.key.startsWith('custom_')) {
                    console.log(`✅ DisplayManager显示自定义正则类别: ${category.title} (${category.key}) - ${items.length} 个结果`);
                    console.log(`🎯 DisplayManager自定义正则 ${category.key} 结果预览:`, items.slice(0, 3));
                }
            }
        });
        
        // 如果没有结果，显示提示
        if (totalCount === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #00d4aa;">
                    <h3>扫描完成</h3>
                    <p>当前页面未发现可提取的信息</p>
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        这可能是因为：<br>
                        • 页面内容较少<br>
                        • 信息已被加密或混淆<br>
                        • 页面使用了复杂的动态加载<br>
                        • 尝试使用深度扫描获取更多信息
                    </p>
                </div>
            `;
        }
        
        // 更新统计信息 - 支持实时更新标识
        const scanMode = this.srcMiner.deepScanRunning ? '深度扫描中' : '标准扫描';
        const scannedCount = this.srcMiner.scannedUrls ? this.srcMiner.scannedUrls.size : 1;
        const currentDepth = this.srcMiner.currentDepth || 0;
        const maxDepth = this.srcMiner.maxDepth || 2;
        
        // 添加实时更新指示器
        const realtimeIndicator = this.srcMiner.deepScanRunning ? 
            '<span style="color: #00d4aa; animation: pulse 1s infinite;">●</span> 实时更新中' : '';
        
        document.getElementById('stats').innerHTML = `
            <div>总计发现 <strong>${totalCount}</strong> 个项目 ${realtimeIndicator}</div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                扫描模式: ${scanMode} | 已扫描: ${scannedCount} 个文件
                ${this.srcMiner.deepScanRunning ? ` | 深度: ${currentDepth}/${maxDepth}` : ''}<br>
                最后更新: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        // 添加脉冲动画样式（如果不存在）
        if (!document.getElementById('realtimeStyles')) {
            const style = document.createElement('style');
            style.id = 'realtimeStyles';
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    createCategoryDiv(category, items) {
        const div = document.createElement('div');
        div.className = 'category';
        div.dataset.categoryKey = category.key;
        
        const header = document.createElement('div');
        header.className = 'category-header';
        
        // 添加复制全部和测试全部按钮
        const headerActions = document.createElement('div');
        headerActions.style.display = 'flex';
        headerActions.style.gap = '5px';
        headerActions.style.alignItems = 'center';
        
        // 展开/收起按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn toggle-btn';
        toggleBtn.textContent = '展开/收起';
        toggleBtn.title = '展开或收起内容';
        toggleBtn.style.transition = 'all 0.3s';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // 批量查看按钮
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'btn batch-view-btn';
        batchViewBtn.textContent = '批量查看';
        batchViewBtn.title = '在新窗口中查看所有内容';
        batchViewBtn.style.transition = 'all 0.3s';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // 复制全部按钮
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn copy-all-btn';
        copyAllBtn.textContent = '复制全部';
        copyAllBtn.title = '复制全部内容';
        copyAllBtn.style.transition = 'all 0.3s';
        copyAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyAllItems(category.key, items);
        });
        headerActions.appendChild(copyAllBtn);
        
        
        // 添加计数徽章
        const countBadge = document.createElement('span');
        countBadge.className = 'count-badge';
        countBadge.textContent = items.length;
        headerActions.appendChild(countBadge);
        
        header.innerHTML = `<span class="category-title">${category.title}</span>`;
        header.appendChild(headerActions);
        
        const content = document.createElement('div');
        content.className = 'category-content';
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.textContent = item;
            itemDiv.title = '点击复制';
            itemDiv.addEventListener('click', () => {
                navigator.clipboard.writeText(item).then(() => {
                    itemDiv.classList.add('copied');
                    setTimeout(() => {
                        itemDiv.classList.remove('copied');
                    }, 1000);
                });
            });
            content.appendChild(itemDiv);
        });
        
        header.addEventListener('click', () => {
            content.classList.toggle('collapsed');
        });
        
        div.appendChild(header);
        div.appendChild(content);
        
        return div;
    }
    
    // 显示批量查看界面
    showBatchViewOnly(title, items) {
        // 确保模态框存在
        let modal = document.getElementById('batchViewModal');
        if (!modal) {
            // 创建模态框
            modal = document.createElement('div');
            modal.id = 'batchViewModal';
            modal.style.display = 'none';
            modal.style.position = 'fixed';
            modal.style.zIndex = '1000';
            modal.style.left = '0';
            modal.style.top = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = 'rgb(30, 30, 30)';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.borderRadius = '10px';
            modalContent.style.boxShadow = '0px 0px 15px 8px rgba(0, 0, 0, 0.8)';
            modalContent.style.transition = 'all 0.3s';
            
            const modalHeader = document.createElement('div');
            modalHeader.style.display = 'flex';
            modalHeader.style.justifyContent = 'space-between';
            modalHeader.style.alignItems = 'center';
            modalHeader.style.marginBottom = '15px';
            
            const modalTitle = document.createElement('h3');
            modalTitle.style.margin = '0';
            modalTitle.style.color = '#00d4aa';
            modalTitle.style.fontSize = '18px';
            modalTitle.style.fontWeight = '600';
            
            const closeBtn = document.createElement('button');
            closeBtn.id = 'closeBatchViewBtn';
            closeBtn.textContent = '×';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#ccc';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.transition = 'all 0.3s';
            closeBtn.style.width = '30px';
            closeBtn.style.height = '30px';
            closeBtn.style.display = 'flex';
            closeBtn.style.justifyContent = 'center';
            closeBtn.style.alignItems = 'center';
            closeBtn.style.borderRadius = '50%';
            
            closeBtn.onmouseover = () => {
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                closeBtn.style.color = '#fff';
            };
            
            closeBtn.onmouseout = () => {
                closeBtn.style.backgroundColor = 'transparent';
                closeBtn.style.color = '#ccc';
            };
            
            const resultsContainer = document.createElement('div');
            resultsContainer.id = 'batchViewResults';
            
            modalHeader.appendChild(modalTitle);
            modalHeader.appendChild(closeBtn);
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(resultsContainer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // 添加关闭按钮事件监听
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('batchViewResults');
        const modalTitle = modal.querySelector('h3');
        
        modalTitle.textContent = title;
        resultsContainer.innerHTML = `<h4>${title} (共 ${items.length} 项)</h4>`;
        
        const list = document.createElement('div');
        list.style.maxHeight = '400px';
        list.style.overflowY = 'auto';
        list.style.padding = '10px';
        list.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        list.style.borderRadius = '8px';
        list.style.marginTop = '10px';
        list.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'result-item';
            itemDiv.textContent = item;
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            itemDiv.style.wordBreak = 'break-all';
            itemDiv.style.transition = 'all 0.3s';
            itemDiv.style.borderRadius = '4px';
            
            itemDiv.onmouseover = () => {
                itemDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'translateX(3px)';
            };
            
            itemDiv.onmouseout = () => {
                itemDiv.style.backgroundColor = 'transparent';
                itemDiv.style.transform = 'translateX(0)';
            };
            
            list.appendChild(itemDiv);
        });
        
        resultsContainer.appendChild(list);
        modal.style.display = 'block';
    }
    
    // 复制分类中的所有项目
    copyAllItems(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        const text = items.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // 显示复制成功提示
            const categoryDiv = document.querySelector(`.category[data-category-key="${categoryKey}"]`);
            if (categoryDiv) {
                const copyBtn = categoryDiv.querySelector('.copy-all-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ 已复制';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            }
        });
    }
    
    // 测试所有API
    async testAllApis(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 切换到API测试页面
        const testTab = document.querySelector('.nav-tab[data-page="test"]');
        if (testTab) {
            testTab.click();
        }
        
        // 等待页面切换完成
        setTimeout(() => {
            // 设置分类选择器
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.value = categoryKey;
                
                // 触发change事件以更新界面
                const changeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(changeEvent);
            }
            
            // 调用批量请求测试功能
            if (this.srcMiner.apiTester) {
                // 获取用户配置的并发数和超时时间
                const concurrencyInput = document.getElementById('apiConcurrency');
                const timeoutInput = document.getElementById('apiTimeout');
                const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
                const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000;
                
                // 直接测试选中的分类
                const method = document.getElementById('requestMethod')?.value || 'GET';

                
                // 获取base API路径配置
                const baseApiPathInput = document.getElementById('baseApiPath');
                const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
                const customBaseApiPaths = this.srcMiner.apiTester.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
                
                // 如果自动添加了"/"前缀，给出提示
                if (rawBaseApiPaths) {
                    const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
                    const normalizedPaths = customBaseApiPaths;
                    
                    // 检查每个路径是否被修改
                    originalPaths.forEach((originalPath, index) => {
                        const normalizedPath = normalizedPaths[index];
                        if (originalPath && originalPath !== normalizedPath) {
                            console.log(`🔧 自动为baseapi路径添加"/"前缀: "${originalPath}" -> "${normalizedPath}"`);
                        }
                    });
                    
                    if (customBaseApiPaths.length > 1) {
                        console.log(`🔧 检测到 ${customBaseApiPaths.length} 个baseapi路径: ${customBaseApiPaths.join(', ')}`);
                    }
                }
                
                // 获取自定义API路径配置
                const customApiPathsInput = document.getElementById('customApiPaths');
                const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
                
                // 如果有自定义API路径，添加到测试列表中
                if (customApiPaths) {
                    const customPaths = this.srcMiner.apiTester.parseCustomApiPaths(customApiPaths);
                    items = this.srcMiner.apiTester.mergeAndDeduplicateItems(items, customPaths);
                    console.log(`📝 添加了 ${customPaths.length} 个自定义API路径，去重后总计 ${items.length} 个测试项目`);
                }
                
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout, customBaseApiPaths);

            } else {
                this.showNotification('API测试器未初始化，无法执行测试', 'error');
            }
        }, 100);
    }
    
    // 显示API测试结果
    showApiTestResults(results) {
        // 确保模态框存在
        let modal = document.getElementById('apiTestResultsModal');
        if (!modal) {
            // 创建模态框
            modal = document.createElement('div');
            modal.id = 'apiTestResultsModal';
            modal.style.display = 'none';
            modal.style.position = 'fixed';
            modal.style.zIndex = '1000';
            modal.style.left = '0';
            modal.style.top = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = 'rgb(30, 30, 30)';
            modalContent.style.margin = '5% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            modalContent.style.width = '90%';
            modalContent.style.maxWidth = '800px';
            modalContent.style.borderRadius = '10px';
            modalContent.style.maxHeight = '80vh';
            modalContent.style.overflowY = 'auto';
            modalContent.style.boxShadow = '0px 0px 15px 8px rgba(0, 0, 0, 0.8)';
            modalContent.style.transition = 'all 0.3s';
            
            const modalHeader = document.createElement('div');
            modalHeader.style.display = 'flex';
            modalHeader.style.justifyContent = 'space-between';
            modalHeader.style.alignItems = 'center';
            modalHeader.style.marginBottom = '15px';
            
            const modalTitle = document.createElement('h3');
            modalTitle.textContent = 'API测试结果';
            modalTitle.style.margin = '0';
            modalTitle.style.color = '#00d4aa';
            modalTitle.style.fontSize = '18px';
            modalTitle.style.fontWeight = '600';
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#ccc';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.transition = 'all 0.3s';
            closeBtn.style.width = '30px';
            closeBtn.style.height = '30px';
            closeBtn.style.display = 'flex';
            closeBtn.style.justifyContent = 'center';
            closeBtn.style.alignItems = 'center';
            closeBtn.style.borderRadius = '50%';
            
            closeBtn.onmouseover = () => {
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                closeBtn.style.color = '#fff';
            };
            
            closeBtn.onmouseout = () => {
                closeBtn.style.backgroundColor = 'transparent';
                closeBtn.style.color = '#ccc';
            };
            
            const resultsContainer = document.createElement('div');
            resultsContainer.id = 'apiTestResultsContainer';
            
            modalHeader.appendChild(modalTitle);
            modalHeader.appendChild(closeBtn);
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(resultsContainer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // 添加关闭按钮事件监听
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('apiTestResultsContainer');
        resultsContainer.innerHTML = '';
        
        // 添加结果摘要
        const summary = document.createElement('div');
        summary.style.marginBottom = '20px';
        summary.style.padding = '15px';
        summary.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
        summary.style.borderRadius = '8px';
        summary.style.border = '1px solid rgba(0, 212, 170, 0.2)';
        summary.style.transition = 'all 0.3s';
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        summary.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #00d4aa;">测试摘要:</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>总计:</span>
                <span style="font-weight: 600;">${results.length} 个API</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>成功:</span>
                <span style="color: #4caf50; font-weight: 600;">${successCount} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>失败:</span>
                <span style="color: #f44336; font-weight: 600;">${failCount} 个</span>
            </div>
        `;
        
        summary.onmouseover = () => {
            summary.style.backgroundColor = 'rgba(0, 212, 170, 0.15)';
            summary.style.transform = 'translateY(-2px)';
            summary.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        };
        
        summary.onmouseout = () => {
            summary.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
            summary.style.transform = 'translateY(0)';
            summary.style.boxShadow = 'none';
        };
        
        resultsContainer.appendChild(summary);
        
        // 添加详细结果
        const detailsContainer = document.createElement('div');
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.style.marginBottom = '15px';
            resultItem.style.padding = '12px';
            resultItem.style.border = '1px solid ' + (result.success ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)');
            resultItem.style.borderRadius = '8px';
            resultItem.style.backgroundColor = result.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
            resultItem.style.transition = 'all 0.3s';
            
            const statusColor = result.success ? '#4caf50' : '#f44336';
            const statusText = result.success ? '成功' : '失败';
            const statusCode = result.status || 'N/A';
            
            resultItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-weight: bold; word-break: break-all; max-width: 80%;">${index + 1}. ${result.url}</div>
                    <div style="color: ${statusColor}; font-weight: 600; white-space: nowrap;">${statusText} (${statusCode})</div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 5px;">
                    <div>
                        <span style="color: #888;">方法:</span> 
                        <span style="color: #fff; font-weight: 500;">${result.method}</span>
                    </div>
                    <div>
                        <span style="color: #888;">耗时:</span> 
                        <span style="color: #fff; font-weight: 500;">${result.time}ms</span>
                    </div>
                </div>
            `;
            
            resultItem.onmouseover = () => {
                resultItem.style.transform = 'translateY(-2px)';
                resultItem.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
                resultItem.style.borderColor = result.success ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
            };
            
            resultItem.onmouseout = () => {
                resultItem.style.transform = 'translateY(0)';
                resultItem.style.boxShadow = 'none';
                resultItem.style.borderColor = result.success ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
            };
            
            // 添加响应数据（如果有）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '10px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = '显示响应数据';
                dataToggle.style.background = 'rgba(0, 212, 170, 0.2)';
                dataToggle.style.border = '1px solid #00d4aa';
                dataToggle.style.borderRadius = '6px';
                dataToggle.style.padding = '5px 10px';
                dataToggle.style.fontSize = '12px';
                dataToggle.style.color = '#00d4aa';
                dataToggle.style.cursor = 'pointer';
                dataToggle.style.marginBottom = '8px';
                dataToggle.style.transition = 'all 0.3s';
                
                const dataContent = document.createElement('pre');
                dataContent.style.display = 'none';
                dataContent.style.maxHeight = '200px';
                dataContent.style.overflowY = 'auto';
                dataContent.style.padding = '10px';
                dataContent.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                dataContent.style.borderRadius = '8px';
                dataContent.style.fontSize = '12px';
                dataContent.style.whiteSpace = 'pre-wrap';
                dataContent.style.wordBreak = 'break-all';
                dataContent.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                dataContent.style.transition = 'all 0.3s';
                
                dataToggle.onmouseover = () => {
                    dataToggle.style.background = 'rgba(0, 212, 170, 0.3)';
                    dataToggle.style.transform = 'translateY(-1px)';
                };
                
                dataToggle.onmouseout = () => {
                    dataToggle.style.background = 'rgba(0, 212, 170, 0.2)';
                    dataToggle.style.transform = 'translateY(0)';
                };
                
                try {
                    // 尝试格式化JSON
                    if (typeof result.data === 'string') {
                        try {
                            const jsonData = JSON.parse(result.data);
                            dataContent.textContent = JSON.stringify(jsonData, null, 2);
                        } catch (e) {
                            dataContent.textContent = result.data;
                        }
                    } else {
                        dataContent.textContent = JSON.stringify(result.data, null, 2);
                    }
                } catch (e) {
                    dataContent.textContent = '无法显示响应数据';
                }
                
                dataToggle.addEventListener('click', () => {
                    if (dataContent.style.display === 'none') {
                        dataContent.style.display = 'block';
                        dataToggle.textContent = '隐藏响应数据';
                    } else {
                        dataContent.style.display = 'none';
                        dataToggle.textContent = '显示响应数据';
                    }
                });
                
                dataContainer.appendChild(dataToggle);
                dataContainer.appendChild(dataContent);
                resultItem.appendChild(dataContainer);
            }
            
            detailsContainer.appendChild(resultItem);
        });
        
        resultsContainer.appendChild(detailsContainer);
        
        // 显示模态框
        modal.style.display = 'block';
    }
    
    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // 设置样式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        
        // 根据类型设置颜色
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = 'rgba(0, 212, 170, 0.9)';
                notification.style.color = 'white';
        }
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // 加载过滤器（如果需要）
    async loadFiltersIfNeeded() {
        try {
            // 检查是否已经加载过滤器
            if (window.domainPhoneFilter && window.apiFilter) {
                console.log('✅ 过滤器已加载，无需重新加载');
                return;
            }
            
            console.log('🔄 开始加载显示过滤器...');
            
            // 检查是否在扩展环境中
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // 加载域名和手机号过滤器
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // 初始化过滤器
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        console.log('✅ 域名手机号过滤器初始化成功');
                    }
                }
                
                // 加载API过滤器
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    console.log('✅ API过滤器加载成功');
                }
                
                console.log('🎉 所有过滤器加载完成');
            } else {
                console.warn('⚠️ 非扩展环境，无法加载过滤器');
            }
        } catch (error) {
            console.error('❌ 过滤器加载失败:', error);
        }
    }
    
    // 加载过滤器脚本
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    console.log(`📦 脚本加载成功: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 脚本加载失败: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // 设置超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也继续执行
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ 加载脚本失败: ${scriptPath}`, error);
                resolve(); // 出错时也继续执行
            }
        });
    }
    
    // 应用过滤器处理结果
    async applyFiltersToResults(results) {
        // 创建结果的深拷贝，避免修改原始数据
        const filteredResults = JSON.parse(JSON.stringify(results));
        
        try {
            // 检查过滤器是否可用
            if (!window.domainPhoneFilter && !window.apiFilter) {
                console.log('⚠️ 过滤器未加载，跳过过滤步骤');
                return filteredResults;
            }
            
            console.log('🔍 开始应用过滤器优化结果...');
            
            // 应用域名和手机号过滤器
            if (window.domainPhoneFilter) {
                // 过滤域名
                if (filteredResults.domains && filteredResults.domains.length > 0) {
                    console.log(`🔍 过滤前域名数量: ${filteredResults.domains.length}`);
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(filteredResults.domains);
                    console.log(`✅ 过滤后域名数量: ${filteredResults.domains.length}`);
                }
                
                // 过滤子域名
                if (filteredResults.subdomains && filteredResults.subdomains.length > 0) {
                    console.log(`🔍 过滤前子域名数量: ${filteredResults.subdomains.length}`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(filteredResults.subdomains);
                    console.log(`✅ 过滤后子域名数量: ${filteredResults.subdomains.length}`);
                }
                
                // 过滤邮箱
                if (filteredResults.emails && filteredResults.emails.length > 0) {
                    console.log(`🔍 过滤前邮箱数量: ${filteredResults.emails.length}`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(filteredResults.emails);
                    console.log(`✅ 过滤后邮箱数量: ${filteredResults.emails.length}`);
                }
                
                // 过滤手机号
                if (filteredResults.phoneNumbers && filteredResults.phoneNumbers.length > 0) {
                    console.log(`🔍 过滤前手机号数量: ${filteredResults.phoneNumbers.length}`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(filteredResults.phoneNumbers, true);
                    console.log(`✅ 过滤后手机号数量: ${filteredResults.phoneNumbers.length}`);
                }
            }
            
            // 应用API过滤器
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                // 过滤绝对路径API
                if (filteredResults.absoluteApis && filteredResults.absoluteApis.length > 0) {
                    console.log(`🔍 过滤前绝对路径API数量: ${filteredResults.absoluteApis.length}`);
                    filteredResults.absoluteApis = window.apiFilter.filterAPIs(filteredResults.absoluteApis, true);
                    console.log(`✅ 过滤后绝对路径API数量: ${filteredResults.absoluteApis.length}`);
                }
                
                // 过滤相对路径API
                if (filteredResults.relativeApis && filteredResults.relativeApis.length > 0) {
                    console.log(`🔍 过滤前相对路径API数量: ${filteredResults.relativeApis.length}`);
                    filteredResults.relativeApis = window.apiFilter.filterAPIs(filteredResults.relativeApis, false);
                    console.log(`✅ 过滤后相对路径API数量: ${filteredResults.relativeApis.length}`);
                }
            }
            
            console.log('🎉 结果过滤完成');
            
        } catch (error) {
            console.error('❌ 应用过滤器时出错:', error);
        }
        
        return filteredResults;
    }
}
