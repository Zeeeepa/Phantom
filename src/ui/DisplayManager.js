/**
 * 显示管理器 - 负责result展示andUI交互
 */
class DisplayManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async displayResults() {
        // 确保data持久化
        if (this.srcMiner.results && Object.keys(this.srcMiner.results).length > 0) {
            this.srcMiner.saveResults();
        }
        
        // if当beforewithoutresult，尝试fromstoragein恢复
        if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
            //console.log('🔄 当before无result，尝试fromstoragein恢复data...');
            await this.srcMiner.loadResults();
            if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
                //console.log('⚠️ storagein也withoutdata');
            }
        }
        
        const resultsDiv = document.getElementById('results');
        
        // basic预定义class别
        const baseCategories = [
            { key: 'customApis', title: 'customAPI路径', icon: '🔧' },
            { key: 'absoluteApis', title: '绝对路径API', icon: '/' },
            { key: 'relativeApis', title: '相对路径API', icon: '~' },
            { key: 'modulePaths', title: 'mod块路径', icon: './' },
            { key: 'domains', title: 'domain', icon: '🌐' },
            { key: 'subdomains', title: '子domain', icon: 'sub' },
            { key: 'urls', title: 'completeURL', icon: 'http' },
            { key: 'parameters', title: 'parameter', icon: 'param' },
            { key: 'ports', title: '端口', icon: 'port' },
            { key: 'jsFiles', title: 'JS文件', icon: '.js' },
            { key: 'cssFiles', title: 'CSS文件', icon: '.css' },
            { key: 'vueFiles', title: 'Vue文件', icon: '.vue' },
            { key: 'images', title: '图片文件', icon: '🖼️' },
            { key: 'audios', title: '音频文件', icon: '🎵' },
            { key: 'videos', title: '视频文件', icon: '🎬' },
            { key: 'emails', title: 'email地址', icon: '@' },
            { key: 'phoneNumbers', title: 'mobile phonecode', icon: '📱' },
            { key: 'ipAddresses', title: 'IP地址', icon: 'IP' },
            { key: 'credentials', title: 'user凭证', icon: '🔐' },
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
            { key: 'idCards', title: 'ID card号', icon: '🆔' },
            { key: 'cryptoUsage', title: '加密算法', icon: 'Crypto' },
            { key: 'githubUrls', title: 'GitHub链接', icon: '🐙' },
            { key: 'companies', title: 'company机构', icon: '🏢' },
            { key: 'cookies', title: 'Cookieinformation', icon: '🍪' },
            { key: 'idKeys', title: 'ID密钥', icon: '🔑' },
            { key: 'sensitiveKeywords', title: '敏感关键词', icon: '⚠️' },
            { key: 'comments', title: 'code注释', icon: '<!--' }
        ];

        // 动态loadcustomregexconfigurationandaddto显示class别in - fix：supportobjectand数组两种storageformat
        let categories = [...baseCategories];
        try {
            const result = await chrome.storage.local.get(['customRegexConfigs']);
            if (result.customRegexConfigs) {
                //console.log('🔄 DisplayManagerunified化versionload动态customregexconfigurationfor显示:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // checkstorageformat：objectformat还是数组format
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数组format
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 DisplayManagerdetectto数组formatcustomregexconfiguration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // objectformat，convert为数组
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 DisplayManagerdetecttoobjectformatcustomregexconfiguration，alreadyconvert为数组format');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        if (config.key && config.name) {
                            categories.push({
                                key: config.key,
                                title: config.name,
                                icon: '🎯' // customregexuseunified图标
                            });
                            //console.log(`✅ DisplayManagerunified化versionaddcustomregex显示class别: ${config.name} (${config.key})`);
                        }
                    });
                    
                    //console.log(`✅ DisplayManagerunified化version动态customregex显示class别loadcomplete，共add ${configsToProcess.length} 个class别`);
                } else {
                    //console.log('⚠️ DisplayManagerunified化version动态customregexconfiguration为空');
                }
            } else {
                //console.log('ℹ️ DisplayManagerunified化version未found动态customregexconfiguration');
            }
        } catch (error) {
            console.error('❌ DisplayManagerunified化versionload动态customregexconfigurationfailed:', error);
        }
        
        //console.log('🔍 DisplayManagerunified化versionstart显示result，当beforeresultdata:', this.srcMiner.results);
        //console.log('🔍 DisplayManagerunified化versionstart显示result，当beforeresultdata:', this.srcMiner.results);
        //console.log('📊 DisplayManagerunified化versionresult统计:', Object.keys(this.srcMiner.results || {}).map(key => `${key}: ${(this.srcMiner.results[key] || []).length}`).join(', '));
        
        // 尝试loadthrough滤器
        await this.loadFiltersIfNeeded();
        
        // 应forthrough滤器处理result
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        // check是否有动态createcustomregexresult，andaddto显示class别in
        if (filteredResults) {
            const dynamicCustomKeys = Object.keys(filteredResults).filter(key => 
                key.startsWith('custom_') && 
                !categories.some(cat => cat.key === key)
            );
            
            if (dynamicCustomKeys.length > 0) {
                //console.log(`🔍 DisplayManager发现 ${dynamicCustomKeys.length} 个动态customregexresult:`, dynamicCustomKeys);
                
                // 尝试fromstorageingetconfiguration名称以提供更好显示名称
                try {
                    const result = await chrome.storage.local.get(['customRegexConfigs']);
                    const customConfigs = result.customRegexConfigs || {};
                    
                    dynamicCustomKeys.forEach(key => {
                        let displayName = key.replace('custom_', 'customregex-');
                        
                        // 尝试foundcorrespondconfiguration名称
                        const configKey = key.replace('custom_', '');
                        
                        // supportobjectand数组两种storageformat
                        if (Array.isArray(customConfigs)) {
                            // 数组format
                            const config = customConfigs.find(c => c.key === key);
                            if (config && config.name) {
                                displayName = config.name;
                            }
                        } else if (typeof customConfigs === 'object') {
                            // objectformat
                            if (customConfigs[configKey] && customConfigs[configKey].name) {
                                displayName = customConfigs[configKey].name;
                            }
                        }
                        
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManageradd动态customregex显示class别: ${displayName} (${key})`);
                    });
                } catch (error) {
                    console.error('❌ getcustomregexconfiguration名称failed:', error);
                    // 降级处理：use默认名称
                    dynamicCustomKeys.forEach(key => {
                        const displayName = key.replace('custom_', 'customregex-');
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManageradd动态customregex显示class别(降级): ${displayName} (${key})`);
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
                
                // if是customregexresult，显示详细day志
                if (category.key.startsWith('custom_')) {
                    //console.log(`✅ DisplayManager显示customregexclass别: ${category.title} (${category.key}) - ${items.length} 个result`);
                    //console.log(`🎯 DisplayManagercustomregex ${category.key} result预览:`, items.slice(0, 3));
                }
            }
        });
        
        // ifwithoutresult，显示提示
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
        
        // 更new统计information - support实时更new标识
        const scanMode = this.srcMiner.deepScanRunning ? 'deep scanin' : '标准scan';
        const scannedCount = this.srcMiner.scannedUrls ? this.srcMiner.scannedUrls.size : 1;
        const currentDepth = this.srcMiner.currentDepth || 0;
        const maxDepth = this.srcMiner.maxDepth || 2;
        
        // add实时更newindicator
        const realtimeIndicator = this.srcMiner.deepScanRunning ? 
            '<span style="color: #00d4aa; animation: pulse 1s infinite;">●</span> 实时更newin' : '';
        
        document.getElementById('stats').innerHTML = `
            <div>总计发现 <strong>${totalCount}</strong> 个项目 ${realtimeIndicator}</div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                扫描模式: ${scanMode} | 已扫描: ${scannedCount} 个文件
                ${this.srcMiner.deepScanRunning ? ` | deep: ${currentDepth}/${maxDepth}` : ''}<br>
                最后更新: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        // add脉冲动画样式（ifnotexists）
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
        
        // add复制全部andtest全部button
        const headerActions = document.createElement('div');
        headerActions.style.display = 'flex';
        headerActions.style.gap = '5px';
        headerActions.style.alignItems = 'center';
        
        // 展开/收起button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn toggle-btn';
        toggleBtn.textContent = '展开/收起';
        toggleBtn.title = '展开or收起内容';
        toggleBtn.style.transition = 'all 0.3s';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // 批量查看button
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'btn batch-view-btn';
        batchViewBtn.textContent = '批量查看';
        batchViewBtn.title = 'innew窗口in查看all内容';
        batchViewBtn.style.transition = 'all 0.3s';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // 复制全部button
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
        
        
        // add计数徽章
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
            
            // 🔥 fix：正确处理object显示
            if (typeof item === 'object' && item !== null) {
                // if是object，尝试get有意义属性orconvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // if是字符串or其他基本class型，directly显示
                itemDiv.textContent = String(item);
            }
            
            itemDiv.title = 'click复制';
            
            // add悬停显示URL位置功能
            this.addUrlLocationTooltip(itemDiv, item, category.key);
            
            // add右键菜单功能
            this.addContextMenu(itemDiv, item);
            
            itemDiv.addEventListener('click', () => {
                // 🔥 fix：正确处理object复制，避免[object Object]
                let textToCopy = item;
                if (typeof item === 'object' && item !== null) {
                    if (item.url || item.path || item.value || item.content || item.name) {
                        textToCopy = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                    } else {
                        textToCopy = JSON.stringify(item);
                    }
                } else {
                    textToCopy = String(item);
                }
                
                navigator.clipboard.writeText(textToCopy).then(() => {
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
        // 确保mod态框exists
        let modal = document.getElementById('batchViewModal');
        if (!modal) {
            // createmod态框
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
            
            // add关闭buttoneventlisten
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
            
            // 🔥 fix：正确处理object显示
            if (typeof item === 'object' && item !== null) {
                // if是object，尝试get有意义属性orconvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // if是字符串or其他基本class型，directly显示
                itemDiv.textContent = String(item);
            }
            
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            itemDiv.style.wordBreak = 'break-all';
            itemDiv.style.transition = 'all 0.3s';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.cursor = 'pointer';
            
            // add悬停显示来源功能
            let tooltip = null;
            
            itemDiv.onmouseover = async (e) => {
                itemDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'translateX(3px)';
                
                // createand显示tooltip
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.style.position = 'fixed';
                    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                    tooltip.style.color = '#fff';
                    tooltip.style.padding = '8px 12px';
                    tooltip.style.borderRadius = '6px';
                    tooltip.style.fontSize = '12px';
                    tooltip.style.zIndex = '10000';
                    tooltip.style.maxWidth = '300px';
                    tooltip.style.wordWrap = 'break-word';
                    tooltip.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                    tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    tooltip.style.pointerEvents = 'none';
                    document.body.appendChild(tooltip);
                }
                
                // get项目位置information
                try {
                    const locationInfo = await this.getItemLocationInfo(item);
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #00d4aa; margin-bottom: 4px;">来源信息</div>
                        <div><strong>页面:</strong> ${locationInfo.pageTitle}</div>
                        <div><strong>URL:</strong> ${locationInfo.sourceUrl}</div>
                        <div><strong>时间:</strong> ${new Date(locationInfo.extractedAt).toLocaleString('zh-CN')}</div>
                    `;
                } catch (error) {
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #ff6b6b; margin-bottom: 4px;">来源信息</div>
                        <div>获取来源信息失败</div>
                    `;
                }
                
                // 定位tooltip
                const rect = itemDiv.getBoundingClientRect();
                tooltip.style.left = (rect.left + 10) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                
                // 确保tooltipnot超出屏幕边界
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.left < 0) {
                    tooltip.style.left = '10px';
                }
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
                }
                if (tooltipRect.top < 0) {
                    tooltip.style.top = (rect.bottom + 10) + 'px';
                }
            };
            
            itemDiv.onmouseout = () => {
                itemDiv.style.backgroundColor = 'transparent';
                itemDiv.style.transform = 'translateX(0)';
                
                // 隐藏tooltip
                if (tooltip) {
                    document.body.removeChild(tooltip);
                    tooltip = null;
                }
            };
            
            // add右键菜单功能
            itemDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // 移除alreadyexists菜单
                const existingMenu = document.querySelector('.context-menu');
                if (existingMenu) {
                    existingMenu.remove();
                }

                const menu = this.createContextMenu(item);
                document.body.appendChild(menu);

                // 定位菜单
                const rect = menu.getBoundingClientRect();
                let left = e.clientX;
                let top = e.clientY;

                // 确保菜单not超出视窗
                if (left + rect.width > window.innerWidth) {
                    left = window.innerWidth - rect.width - 10;
                }
                if (top + rect.height > window.innerHeight) {
                    top = window.innerHeight - rect.height - 10;
                }

                menu.style.left = left + 'px';
                menu.style.top = top + 'px';

                // click其他地方时关闭菜单
                const closeMenu = (event) => {
                    if (!menu.contains(event.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };
                
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 0);
            });
            
            list.appendChild(itemDiv);
        });
        
        resultsContainer.appendChild(list);
        modal.style.display = 'block';
    }
    
    // 复制分classinall项目
    copyAllItems(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 🔥 fix：正确处理object复制，避免[object Object]
        const processedItems = items.map(item => {
            if (typeof item === 'object' && item !== null) {
                // if是object，尝试get有意义属性orconvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    return item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    return JSON.stringify(item);
                }
            } else {
                // if是字符串or其他基本class型，directlyreturn
                return String(item);
            }
        });
        
        const text = processedItems.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // 显示复制success提示
            const categoryDiv = document.querySelector(`.category[data-category-key="${categoryKey}"]`);
            if (categoryDiv) {
                const copyBtn = categoryDiv.querySelector('.copy-all-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ already复制';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            }
        });
    }
    
    // testallAPI
    async testAllApis(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 切换toAPItestpage面
        const testTab = document.querySelector('.nav-tab[data-page="test"]');
        if (testTab) {
            testTab.click();
        }
        
        // waitpage面切换complete
        setTimeout(() => {
            // settings分classselector
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.value = categoryKey;
                
                // 触发changeevent以更new界面
                const changeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(changeEvent);
            }
            
            // 调for批量requesttest功能
            if (this.srcMiner.apiTester) {
                // getuserconfigurationand发数and超时时间
                const concurrencyInput = document.getElementById('apiConcurrency');
                const timeoutInput = document.getElementById('apiTimeout');
                const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
                const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000;
                
                // directlytest选in分class
                const method = document.getElementById('requestMethod')?.value || 'GET';

                
                // getbase API路径configuration
                const baseApiPathInput = document.getElementById('baseApiPath');
                const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
                const customBaseApiPaths = this.srcMiner.apiTester.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
                
                // ifautomaticadd了"/"before缀，给出提示
                if (rawBaseApiPaths) {
                    const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
                    const normalizedPaths = customBaseApiPaths;
                    
                    // check每个路径是否by修改
                    originalPaths.forEach((originalPath, index) => {
                        const normalizedPath = normalizedPaths[index];
                        if (originalPath && originalPath !== normalizedPath) {
                            //console.log(`🔧 automatic为baseapi路径add"/"before缀: "${originalPath}" -> "${normalizedPath}"`);
                        }
                    });
                    
                    if (customBaseApiPaths.length > 1) {
                        //console.log(`🔧 detectto ${customBaseApiPaths.length} 个baseapi路径: ${customBaseApiPaths.join(', ')}`);
                    }
                }
                
                // getcustomAPI路径configuration
                const customApiPathsInput = document.getElementById('customApiPaths');
                const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
                
                // if有customAPI路径，addtotest列表in
                if (customApiPaths) {
                    const customPaths = this.srcMiner.apiTester.parseCustomApiPaths(customApiPaths);
                    items = this.srcMiner.apiTester.mergeAndDeduplicateItems(items, customPaths);
                    //console.log(`📝 add了 ${customPaths.length} 个customAPI路径，去重后总计 ${items.length} 个test项目`);
                }
                
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout, customBaseApiPaths);

            } else {
                this.showNotification('APItest器未initialize，无法executetest', 'error');
            }
        }, 100);
    }
    
    // 显示APItestresult
    showApiTestResults(results) {
        // 确保mod态框exists
        let modal = document.getElementById('apiTestResultsModal');
        if (!modal) {
            // createmod态框
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
            modalTitle.textContent = 'APItestresult';
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
            
            // add关闭buttoneventlisten
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('apiTestResultsContainer');
        resultsContainer.innerHTML = '';
        
        // addresult摘要
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
        
        // add详细result
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
            const statusText = result.success ? 'success' : 'failed';
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
            
            // add响应data（if有）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '10px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = '显示响应data';
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
                    // 尝试format化JSON
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
                    dataContent.textContent = '无法显示响应data';
                }
                
                dataToggle.addEventListener('click', () => {
                    if (dataContent.style.display === 'none') {
                        dataContent.style.display = 'block';
                        dataToggle.textContent = '隐藏响应data';
                    } else {
                        dataContent.style.display = 'none';
                        dataToggle.textContent = '显示响应data';
                    }
                });
                
                dataContainer.appendChild(dataToggle);
                dataContainer.appendChild(dataContent);
                resultItem.appendChild(dataContainer);
            }
            
            detailsContainer.appendChild(resultItem);
        });
        
        resultsContainer.appendChild(detailsContainer);
        
        // 显示mod态框
        modal.style.display = 'block';
    }
    
    // 显示notify
    showNotification(message, type = 'info') {
        // createnotify元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings样式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        
        // 根据class型settings颜色
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
        
        // addtopage面
        document.body.appendChild(notification);
        
        // 3秒后automatic移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // loadthrough滤器（ifrequire）
    async loadFiltersIfNeeded() {
        try {
            // check是否already经loadthrough滤器
            if (window.domainPhoneFilter && window.apiFilter) {
                //console.log('✅ through滤器alreadyload，无需重newload');
                return;
            }
            
            //console.log('🔄 startload显示through滤器...');
            
            // check是否in扩展environmentin
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // loaddomainandmobile phonethrough滤器
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // initializethrough滤器
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ domainmobile phonethrough滤器initializesuccess');
                    }
                }
                
                // loadAPIthrough滤器
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ APIthrough滤器loadsuccess');
                }
                
                //console.log('🎉 allthrough滤器loadcomplete');
            } else {
                console.warn('⚠️ 非扩展environment，无法loadthrough滤器');
            }
        } catch (error) {
            console.error('❌ through滤器loadfailed:', error);
        }
    }
    
    // loadthrough滤器脚本
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 脚本loadsuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ 脚本loadfailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也继续execute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load脚本failed: ${scriptPath}`, error);
                resolve(); // 出错时也继续execute
            }
        });
    }
    
    // 应forthrough滤器处理result
    async applyFiltersToResults(results) {
        // createresult深拷贝，避免修改原始data
        const filteredResults = JSON.parse(JSON.stringify(results));
        
        try {
            // checkthrough滤器是否可for
            if (!window.domainPhoneFilter && !window.apiFilter) {
                //console.log('⚠️ through滤器未load，skipthrough滤步骤');
                return filteredResults;
            }
            
            //console.log('🔍 start应forthrough滤器优化result...');
            
            // 应fordomainandmobile phonethrough滤器
            if (window.domainPhoneFilter) {
                // through滤domain
                if (filteredResults.domains && filteredResults.domains.length > 0) {
                    //console.log(`🔍 through滤beforedomain数量: ${filteredResults.domains.length}`);
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(filteredResults.domains);
                    //console.log(`✅ through滤后domain数量: ${filteredResults.domains.length}`);
                }
                
                // through滤子domain
                if (filteredResults.subdomains && filteredResults.subdomains.length > 0) {
                    //console.log(`🔍 through滤before子domain数量: ${filteredResults.subdomains.length}`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(filteredResults.subdomains);
                    //console.log(`✅ through滤后子domain数量: ${filteredResults.subdomains.length}`);
                }
                
                // through滤email
                if (filteredResults.emails && filteredResults.emails.length > 0) {
                    //console.log(`🔍 through滤beforeemail数量: ${filteredResults.emails.length}`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(filteredResults.emails);
                    //console.log(`✅ through滤后email数量: ${filteredResults.emails.length}`);
                }
                
                // through滤mobile phone
                if (filteredResults.phoneNumbers && filteredResults.phoneNumbers.length > 0) {
                    //console.log(`🔍 through滤beforemobile phone数量: ${filteredResults.phoneNumbers.length}`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(filteredResults.phoneNumbers, true);
                    //console.log(`✅ through滤后mobile phone数量: ${filteredResults.phoneNumbers.length}`);
                }
            }
            
            // 应forAPIthrough滤器
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                // through滤绝对路径API
                if (filteredResults.absoluteApis && filteredResults.absoluteApis.length > 0) {
                    //console.log(`🔍 through滤before绝对路径API数量: ${filteredResults.absoluteApis.length}`);
                    filteredResults.absoluteApis = window.apiFilter.filterAPIs(filteredResults.absoluteApis, true);
                    //console.log(`✅ through滤后绝对路径API数量: ${filteredResults.absoluteApis.length}`);
                }
                
                // through滤相对路径API
                if (filteredResults.relativeApis && filteredResults.relativeApis.length > 0) {
                    //console.log(`🔍 through滤before相对路径API数量: ${filteredResults.relativeApis.length}`);
                    filteredResults.relativeApis = window.apiFilter.filterAPIs(filteredResults.relativeApis, false);
                    //console.log(`✅ through滤后相对路径API数量: ${filteredResults.relativeApis.length}`);
                }
            }
            
            //console.log('🎉 resultthrough滤complete');
            
        } catch (error) {
            console.error('❌ 应forthrough滤器时出错:', error);
        }
        
        return filteredResults;
    }

    // addURL位置提示功能
    async addUrlLocationTooltip(element, item, category = null) {
        let tooltip = null;
        let hoverTimeout = null;

        element.addEventListener('mouseenter', () => {
            // 延迟显示提示，避免快速mobile时频繁触发
            hoverTimeout = setTimeout(async () => {
                try {
                    const locationInfo = await this.getItemLocationInfo(category, item);
                    if (locationInfo) {
                        tooltip = this.createTooltip(locationInfo);
                        document.body.appendChild(tooltip);
                        this.positionTooltip(tooltip, element);
                    }
                } catch (error) {
                    console.error('[DisplayManager] get位置informationfailed:', error);
                }
            }, 500); // 500ms延迟显示
        });

        element.addEventListener('mouseleave', () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            if (tooltip) {
                document.body.removeChild(tooltip);
                tooltip = null;
            }
        });

        element.addEventListener('mousemove', (e) => {
            if (tooltip) {
                this.positionTooltip(tooltip, element, e);
            }
        });
    }

    // get项目位置information - support两种调for方式：getItemLocationInfo(item) or getItemLocationInfo(category, item)
    async getItemLocationInfo(categoryOrItem, item = null) {
        try {
            // 🔥 fix：兼容两种调for方式
            let category = null;
            let actualItem = null;
            
            if (item === null) {
                // 单parameter调for：getItemLocationInfo(item)
                actualItem = categoryOrItem;
                category = null; // not知道具体分class，requireinall分classin搜索
            } else {
                // 双parameter调for：getItemLocationInfo(category, item)
                category = categoryOrItem;
                actualItem = item;
            }
            
            // 🔥 fix：directlyfromdata项本身getsourceUrlinformation
            if (typeof actualItem === 'object' && actualItem !== null) {
                // ifitem本身就containssourceUrlinformation，directlyuse
                if (actualItem.sourceUrl && !actualItem.sourceUrl.startsWith('chrome-extension://')) {
                    return {
                        sourceUrl: actualItem.sourceUrl,
                        pageTitle: actualItem.pageTitle || document.title || 'scanresult',
                        extractedAt: actualItem.extractedAt || new Date().toISOString()
                    };
                }
            }
            
            // 🔥 fix：尝试fromIndexedDB查找data
            const indexedDBManager = this.srcMiner?.indexedDBManager || window.IndexedDBManager || window.indexedDBManager;
            if (!indexedDBManager) {
                console.warn('[DisplayManager] IndexedDBManager未initialize，return当beforepage面information');
                return {
                    sourceUrl: window.location.href.startsWith('chrome-extension://') ? 'scan目标page面' : window.location.href,
                    pageTitle: document.title || 'scanresult',
                    extractedAt: new Date().toISOString()
                };
            }

            try {
                // 🔥 fix：getallscanresult
                const allResults = await indexedDBManager.getAllData('scanResults');
                
                if (allResults && allResults.length > 0) {
                    // get要查找value
                    const searchValue = typeof actualItem === 'object' && actualItem !== null ? 
                        (actualItem.value || actualItem.text || actualItem.content || JSON.stringify(actualItem)) : 
                        String(actualItem);
                    
                    // inallscanresultin查找match项
                    for (const result of allResults.reverse()) { // from最newstart查找
                        if (result.results) {
                            // if指定了分class，只in该分classin查找
                            const categoriesToSearch = category ? [category] : Object.keys(result.results);
                            
                            for (const searchCategory of categoriesToSearch) {
                                const categoryData = result.results[searchCategory];
                                
                                if (Array.isArray(categoryData)) {
                                    for (const dataItem of categoryData) {
                                        let itemValue = null;
                                        let itemSourceUrl = null;
                                        let itemPageTitle = null;
                                        let itemExtractedAt = null;

                                        if (typeof dataItem === 'object' && dataItem !== null) {
                                            // objectformat：{value: "xxx", sourceUrl: "xxx", ...}
                                            itemValue = dataItem.value || dataItem.text || dataItem.content;
                                            itemSourceUrl = dataItem.sourceUrl;
                                            itemPageTitle = dataItem.pageTitle;
                                            itemExtractedAt = dataItem.extractedAt;
                                        } else {
                                            // 字符串format，usescanresult源information
                                            itemValue = String(dataItem);
                                            itemSourceUrl = result.sourceUrl;
                                            itemPageTitle = result.pageTitle;
                                            itemExtractedAt = result.extractedAt;
                                        }

                                        // 比较value是否match
                                        if (itemValue === searchValue) {
                                            // 🔥 fix：确保notreturnchrome-extension URL
                                            const finalSourceUrl = itemSourceUrl && !itemSourceUrl.startsWith('chrome-extension://') ? 
                                                itemSourceUrl : 
                                                (result.sourceUrl && !result.sourceUrl.startsWith('chrome-extension://') ? 
                                                    result.sourceUrl : 
                                                    'scan目标page面');
                                            
                                            return {
                                                sourceUrl: finalSourceUrl,
                                                pageTitle: itemPageTitle || result.pageTitle || 'scanresult',
                                                extractedAt: itemExtractedAt || result.extractedAt || result.timestamp || new Date().toISOString()
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (dbError) {
                console.warn('[DisplayManager] IndexedDB查询failed:', dbError);
            }
            
            // 🔥 fix：if都没found，return当beforepage面information而not是chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'scan目标page面' : currentUrl,
                pageTitle: document.title || 'scanresult',
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[DisplayManager] get位置information时出错:', error);
            // 🔥 fix：即使出错也notreturnchrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'data来源未知' : currentUrl,
                pageTitle: document.title || 'scanresult',
                extractedAt: new Date().toISOString()
            };
        }
    }

    // inscanresultin查找containssourceUrlmatch项
    findItemWithSourceUrl(item, results) {
        if (!results) return null;
        
        // 将itemconvert为字符串进行比较
        const itemStr = typeof item === 'object' && item !== null ? 
            (item.text || item.content || item.value || JSON.stringify(item)) : 
            String(item);
        
        // 递归搜索allresult，returncontainssourceUrlmatch项
        const searchInObject = (obj) => {
            if (Array.isArray(obj)) {
                for (const element of obj) {
                    if (typeof element === 'string') {
                        if (element === itemStr) {
                            // 字符串matchbutwithoutsourceUrlinformation
                            return null;
                        }
                    } else if (typeof element === 'object' && element !== null) {
                        // checkobject各种可能value字段
                        const elementStr = element.text || element.content || element.value || JSON.stringify(element);
                        if (elementStr === itemStr) {
                            // foundmatch项，returncontainssourceUrlobject
                            return element;
                        }
                        // 递归搜索
                        const found = searchInObject(element);
                        if (found) return found;
                    }
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const value of Object.values(obj)) {
                    const found = searchInObject(value);
                    if (found) return found;
                }
            }
            return null;
        };

        return searchInObject(results);
    }

    // check项目是否inscanresultin（keep原有方法for其他地方）
    isItemInResults(item, results) {
        return this.findItemWithSourceUrl(item, results) !== null;
    }

    // create提示框
    createTooltip(locationInfo) {
        const tooltip = document.createElement('div');
        tooltip.className = 'url-location-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            max-width: 300px;
            word-wrap: break-word;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        const formatDate = (dateStr) => {
            try {
                const date = new Date(dateStr);
                return date.toLocaleString('zh-CN');
            } catch (error) {
                return '刚刚';
            }
        };

        // 🔥 fix：确保allinformation都有validvalue，避免显示"未知"
        const pageTitle = locationInfo.pageTitle || document.title || '当beforepage面';
        const sourceUrl = locationInfo.sourceUrl || window.location.href;
        const extractedAt = locationInfo.extractedAt || new Date().toISOString();
        const scanId = locationInfo.scanId || 'current-session';

        // 🔥 fix：截断through长URL显示
        const displayUrl = sourceUrl.length > 50 ? sourceUrl.substring(0, 47) + '...' : sourceUrl;
        const displayTitle = pageTitle.length > 30 ? pageTitle.substring(0, 27) + '...' : pageTitle;

        tooltip.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>提取来源:</strong></div>
            <div style="margin-bottom: 3px;">${displayTitle}</div>
            <div style="margin-bottom: 3px;">${displayUrl}</div>
            <div style="margin-bottom: 3px;">${formatDate(extractedAt)}</div>
        `;

        return tooltip;
    }

    // 定位提示框 - 🔥 fix：悬浮in鼠标上方
    positionTooltip(tooltip, element, mouseEvent = null) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let left, top;

        if (mouseEvent) {
            // 🔥 fix：use鼠标位置，显示in鼠标上方
            left = mouseEvent.pageX - tooltipRect.width / 2; // 水平居in于鼠标
            top = mouseEvent.pageY - tooltipRect.height - 15; // 显示in鼠标上方，留15px间距
        } else {
            // ifwithout鼠标event，use元素in心位置
            const rect = element.getBoundingClientRect();
            left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
            top = rect.top + scrollY - tooltipRect.height - 15;
        }

        // 🔥 fix：确保提示框not超出视口边界
        // 水平方向调整
        if (left + tooltipRect.width > viewportWidth + scrollX) {
            left = viewportWidth + scrollX - tooltipRect.width - 10;
        }
        if (left < scrollX + 10) {
            left = scrollX + 10;
        }

        // 垂直方向调整 - if上方空间not够，显示in鼠标下方
        if (top < scrollY + 10) {
            if (mouseEvent) {
                top = mouseEvent.pageY + 15; // 显示in鼠标下方
            } else {
                const rect = element.getBoundingClientRect();
                top = rect.bottom + scrollY + 15;
            }
        }

        // 确保not超出底部
        if (top + tooltipRect.height > viewportHeight + scrollY) {
            top = viewportHeight + scrollY - tooltipRect.height - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // add右键菜单功能
    addContextMenu(element, item) {
        element.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            // 移除alreadyexists菜单
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = this.createContextMenu(item);
            document.body.appendChild(menu);

            // 定位菜单
            const rect = menu.getBoundingClientRect();
            let left = e.clientX;
            let top = e.clientY;

            // 确保菜单not超出视窗
            if (left + rect.width > window.innerWidth) {
                left = window.innerWidth - rect.width - 10;
            }
            if (top + rect.height > window.innerHeight) {
                top = window.innerHeight - rect.height - 10;
            }

            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            // click其他地方时关闭菜单
            const closeMenu = (event) => {
                if (!menu.contains(event.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        });
    }

    // create右键菜单
    createContextMenu(item) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: absolute;
            background: #2c3e50;
            color: #ecf0f1;
            border: 1px solid #34495e;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            min-width: 180px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const menuItems = [
            {
                text: '复制内容',
                icon: '',
                action: () => {
                    // 处理objectclass型 item，确保正确convert为字符串
                    let textToCopy;
                    if (typeof item === 'object' && item !== null) {
                        if (item.hasOwnProperty('text') || item.hasOwnProperty('content') || item.hasOwnProperty('value')) {
                            textToCopy = item.text || item.content || item.value || JSON.stringify(item);
                        } else {
                            textToCopy = JSON.stringify(item);
                        }
                    } else {
                        textToCopy = item;
                    }
                    
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        this.showNotification('内容already复制to剪贴板');
                    });
                }
            },
            {
                text: '复制extract位置',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        navigator.clipboard.writeText(locationInfo.sourceUrl).then(() => {
                            this.showNotification('extract位置URLalready复制to剪贴板');
                        });
                    } else {
                        this.showNotification('未foundextract位置URL', 'error');
                    }
                }
            },
            {
                text: 'open源page面',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        window.open(locationInfo.sourceUrl, '_blank');
                    } else {
                        this.showNotification('未found源page面URL', 'error');
                    }
                }
            }
        ];

        menuItems.forEach((menuItem, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                ${index === 0 ? 'border-top-left-radius: 4px; border-top-right-radius: 4px;' : ''}
                ${index === menuItems.length - 1 ? 'border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;' : ''}
            `;

            itemDiv.innerHTML = `<span>${menuItem.icon}</span><span>${menuItem.text}</span>`;

            itemDiv.addEventListener('mouseenter', () => {
                itemDiv.style.backgroundColor = '#34495e';
            });

            itemDiv.addEventListener('mouseleave', () => {
                itemDiv.style.backgroundColor = 'transparent';
            });

            itemDiv.addEventListener('click', () => {
                menuItem.action();
                menu.remove();
            });

            menu.appendChild(itemDiv);
        });

        return menu;
    }

    // 显示notify
    showNotification(message, type = 'success') {
        // 移除alreadyexistsnotify
        const existingNotification = document.querySelector('.phantom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'phantom-notification';
        
        const bgColor = type === 'error' ? '#ff4757' : '#2ed573';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
        `;

        // add动画样式
        if (!document.querySelector('#phantom-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'phantom-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒后automatic消失
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}
