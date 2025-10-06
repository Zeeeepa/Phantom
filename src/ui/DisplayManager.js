/**
 * display manage 器 - 负责 result 展示andUI交互
 */
class DisplayManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async displayResults() {
        // 确保 data 持久化
        if (this.srcMiner.results && Object.keys(this.srcMiner.results).length > 0) {
            this.srcMiner.saveResults();
        }
        
        // 如果 current 没有 result，尝试from storage in恢复
        if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
            //console.log('🔄 current 无 result，尝试from storage in恢复 data ...');
            await this.srcMiner.loadResults();
            if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
                //console.log('⚠️ storage in也没有 data');
            }
        }
        
        const resultsDiv = document.getElementById('results');
        
        // basic预定义类别
        const baseCategories = [
            { key: 'customApis', title: 'custom API path', icon: '🔧' },
            { key: 'absoluteApis', title: '绝对 path API', icon: '/' },
            { key: 'relativeApis', title: '相对 path API', icon: '~' },
            { key: 'modulePaths', title: 'module path', icon: './' },
            { key: 'domains', title: 'domain', icon: '🌐' },
            { key: 'subdomains', title: '子 domain', icon: 'sub' },
            { key: 'urls', title: 'completeURL', icon: 'http' },
            { key: 'parameters', title: 'parameter', icon: 'param' },
            { key: 'ports', title: 'port', icon: 'port' },
            { key: 'jsFiles', title: 'JS file', icon: '.js' },
            { key: 'cssFiles', title: 'CSS file', icon: '.css' },
            { key: 'vueFiles', title: 'Vue file', icon: '.vue' },
            { key: 'images', title: 'image file', icon: '🖼️' },
            { key: 'audios', title: 'audio file', icon: '🎵' },
            { key: 'videos', title: 'video file', icon: '🎬' },
            { key: 'emails', title: 'email address', icon: '@' },
            { key: 'phoneNumbers', title: 'phone number 码', icon: '📱' },
            { key: 'ipAddresses', title: 'IP address', icon: 'IP' },
            { key: 'credentials', title: 'user 凭证', icon: '🔐' },
            { key: 'jwts', title: 'JWT Token', icon: '🎫' },
            { key: 'bearerTokens', title: 'Bearer Token', icon: 'Bearer' },
            { key: 'basicAuth', title: 'Basic Auth', icon: 'Basic' },
            { key: 'authHeaders', title: 'Authorization Header', icon: 'Auth' },
            { key: 'wechatAppIds', title: '微信AppID', icon: 'wx' },
            { key: 'awsKeys', title: 'AWS key', icon: 'AWS' },
            { key: 'googleApiKeys', title: 'Google API Key', icon: 'G' },
            { key: 'githubTokens', title: 'GitHub Token', icon: 'GH' },
            { key: 'gitlabTokens', title: 'GitLab Token', icon: 'GL' },
            { key: 'webhookUrls', title: 'Webhook URLs', icon: 'Hook' },
            { key: 'idCards', title: 'ID card 号', icon: '🆔' },
            { key: 'cryptoUsage', title: 'encryption 算法', icon: 'Crypto' },
            { key: 'githubUrls', title: 'GitHub link', icon: '🐙' },
            { key: 'companies', title: '公司机构', icon: '🏢' },
            { key: 'cookies', title: 'Cookie information', icon: '🍪' },
            { key: 'idKeys', title: 'ID key', icon: '🔑' },
            { key: 'sensitiveKeywords', title: '敏感关 key 词', icon: '⚠️' },
            { key: 'comments', title: 'code comment', icon: '<!--' }
        ];

        // dynamic load custom regex configuration 并 add 到 display 类别in - fix：support object and array 两种 storage format
        let categories = [...baseCategories];
        try {
            const result = await chrome.storage.local.get(['customRegexConfigs']);
            if (result.customRegexConfigs) {
                //console.log('🔄 DisplayManagerunified化 version load dynamic custom regex configuration for display:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // check storage format：object format 还是 array format
                if (Array.isArray(result.customRegexConfigs)) {
                    // array format
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 DisplayManager检测到 array format   custom regex configuration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // object format，convertto array
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 DisplayManager检测到 object format   custom regex configuration，alreadyconvertto array format');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        if (config.key && config.name) {
                            categories.push({
                                key: config.key,
                                title: config.name,
                                icon: '🎯' // custom regex useunified graph 标
                            });
                            //console.log(`✅ DisplayManagerunified化 version add custom regex display 类别: ${config.name} (${config.key})`);
                        }
                    });
                    
                    //console.log(`✅ DisplayManagerunified化 version dynamic custom regex display 类别 load complete，共 add ${configsToProcess.length} 个类别`);
                } else {
                    //console.log('⚠️ DisplayManagerunified化 version dynamic custom regex configuration to empty');
                }
            } else {
                //console.log('ℹ️ DisplayManagerunified化 version 未找到 dynamic custom regex configuration');
            }
        } catch (error) {
            console.error('❌ DisplayManagerunified化 version load dynamic custom regex configuration failed:', error);
        }
        
        //console.log('🔍 DisplayManagerunified化 version start display result，current result data:', this.srcMiner.results);
        //console.log('🔍 DisplayManagerunified化 version start display result，current result data:', this.srcMiner.results);
        //console.log('📊 DisplayManagerunified化 version result statistics:', Object.keys(this.srcMiner.results || {}).map(key => `${key}: ${(this.srcMiner.results[key] || []).length}`).join(', '));
        
        // 尝试 load filter
        await this.loadFiltersIfNeeded();
        
        // 应用 filter process result
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        // check 是否有 dynamic 创建  custom regex result，并 add 到 display 类别in
        if (filteredResults) {
            const dynamicCustomKeys = Object.keys(filteredResults).filter(key => 
                key.startsWith('custom_') && 
                !categories.some(cat => cat.key === key)
            );
            
            if (dynamicCustomKeys.length > 0) {
                //console.log(`🔍 DisplayManager发现 ${dynamicCustomKeys.length} 个 dynamic custom regex result:`, dynamicCustomKeys);
                
                // 尝试from storage in获取 configuration 名称以提供更好  display 名称
                try {
                    const result = await chrome.storage.local.get(['customRegexConfigs']);
                    const customConfigs = result.customRegexConfigs || {};
                    
                    dynamicCustomKeys.forEach(key => {
                        let displayName = key.replace('custom_', 'custom regex -');
                        
                        // 尝试找到对应  configuration 名称
                        const configKey = key.replace('custom_', '');
                        
                        // support object and array 两种 storage format
                        if (Array.isArray(customConfigs)) {
                            // array format
                            const config = customConfigs.find(c => c.key === key);
                            if (config && config.name) {
                                displayName = config.name;
                            }
                        } else if (typeof customConfigs === 'object') {
                            // object format
                            if (customConfigs[configKey] && customConfigs[configKey].name) {
                                displayName = customConfigs[configKey].name;
                            }
                        }
                        
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManager add dynamic custom regex display 类别: ${displayName} (${key})`);
                    });
                } catch (error) {
                    console.error('❌ 获取 custom regex configuration 名称 failed:', error);
                    // 降级 process：use default 名称
                    dynamicCustomKeys.forEach(key => {
                        const displayName = key.replace('custom_', 'custom regex -');
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManager add dynamic custom regex display 类别(降级): ${displayName} (${key})`);
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
                
                // 如果是 custom regex result，display detailed log
                if (category.key.startsWith('custom_')) {
                    //console.log(`✅ DisplayManager display custom regex 类别: ${category.title} (${category.key}) - ${items.length} 个 result`);
                    //console.log(`🎯 DisplayManager custom regex ${category.key} result preview:`, items.slice(0, 3));
                }
            }
        });
        
        // 如果没有 result，display prompt
        if (totalCount === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #00d4aa;">
                    <h3>scan complete</h3>
                    <p>current page未发现可extract information</p>
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        这可能是因to：<br>
                        • page content较少<br>
                        • informationalreadypassive marker加密or混淆<br>
                        • pageuse了复杂 动态load<br>
                        • 尝试usedeep scan获取更多information
                    </p>
                </div>
            `;
        }
        
        // update statistics - support实时 update 标识
        const scanMode = this.srcMiner.deepScanRunning ? 'deep scan in' : 'standard scan';
        const scannedCount = this.srcMiner.scannedUrls ? this.srcMiner.scannedUrls.size : 1;
        const currentDepth = this.srcMiner.currentDepth || 0;
        const maxDepth = this.srcMiner.maxDepth || 2;
        
        // add 实时 update 指示器
        const realtimeIndicator = this.srcMiner.deepScanRunning ? 
            '<span style="color: #00d4aa; animation: pulse 1s infinite;">●</span> 实时 update in' : '';
        
        document.getElementById('stats').innerHTML = `
            <div>总计发现 <strong>${totalCount}</strong> 个项目 ${realtimeIndicator}</div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                scanmode: ${scanMode} | alreadyscan: ${scannedCount} 个 file
                ${this.srcMiner.deepScanRunning ? ` | 深度: ${currentDepth}/${maxDepth}` : ''}<br>
                最后更新: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        // add 脉冲动画 style（如果do not存in）
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
        
        // add copy all and test all button
        const headerActions = document.createElement('div');
        headerActions.style.display = 'flex';
        headerActions.style.gap = '5px';
        headerActions.style.alignItems = 'center';
        
        // expand /收起 button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn toggle-btn';
        toggleBtn.textContent = 'expand /收起';
        toggleBtn.title = 'expand or收起 content';
        toggleBtn.style.transition = 'all 0.3s';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // batch 查看 button
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'btn batch-view-btn';
        batchViewBtn.textContent = 'batch 查看';
        batchViewBtn.title = 'in新 window in查看all content';
        batchViewBtn.style.transition = 'all 0.3s';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // copy all button
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn copy-all-btn';
        copyAllBtn.textContent = 'copy all';
        copyAllBtn.title = 'copy all content';
        copyAllBtn.style.transition = 'all 0.3s';
        copyAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyAllItems(category.key, items);
        });
        headerActions.appendChild(copyAllBtn);
        
        
        // add 计数徽章
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
            
            // 🔥 fix：正确 process object display
            if (typeof item === 'object' && item !== null) {
                // 如果是 object，尝试获取有意义 属性orconverttoJSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // 如果是 string or其他基本 type，directly display
                itemDiv.textContent = String(item);
            }
            
            itemDiv.title = '点击 copy';
            
            // add 悬停 display URL位置 feature
            this.addUrlLocationTooltip(itemDiv, item, category.key);
            
            // add 右 key 菜单 feature
            this.addContextMenu(itemDiv, item);
            
            itemDiv.addEventListener('click', () => {
                // 🔥 fix：正确 process object copy，避免[object Object]
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
    
    // display batch 查看界面
    showBatchViewOnly(title, items) {
        // 确保模态框存in
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
            
            // add close button event listen
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
            
            // 🔥 fix：正确 process object display
            if (typeof item === 'object' && item !== null) {
                // 如果是 object，尝试获取有意义 属性orconverttoJSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // 如果是 string or其他基本 type，directly display
                itemDiv.textContent = String(item);
            }
            
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            itemDiv.style.wordBreak = 'break-all';
            itemDiv.style.transition = 'all 0.3s';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.cursor = 'pointer';
            
            // add 悬停 display 来源 feature
            let tooltip = null;
            
            itemDiv.onmouseover = async (e) => {
                itemDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'translateX(3px)';
                
                // 创建并 display tooltip
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
                
                // 获取项目位置 information
                try {
                    const locationInfo = await this.getItemLocationInfo(item);
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #00d4aa; margin-bottom: 4px;">来源information</div>
                        <div><strong>page:</strong> ${locationInfo.pageTitle}</div>
                        <div><strong>URL:</strong> ${locationInfo.sourceUrl}</div>
                        <div><strong>时间:</strong> ${new Date(locationInfo.extractedAt).toLocaleString('zh-CN')}</div>
                    `;
                } catch (error) {
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #ff6b6b; margin-bottom: 4px;">来源information</div>
                        <div>获取来源informationfailed</div>
                    `;
                }
                
                // 定位tooltip
                const rect = itemDiv.getBoundingClientRect();
                tooltip.style.left = (rect.left + 10) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                
                // 确保tooltipdo not超出屏幕边界
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
                
                // hide tooltip
                if (tooltip) {
                    document.body.removeChild(tooltip);
                    tooltip = null;
                }
            };
            
            // add 右 key 菜单 feature
            itemDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // remove already存in 菜单
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

                // 确保菜单do not超出视窗
                if (left + rect.width > window.innerWidth) {
                    left = window.innerWidth - rect.width - 10;
                }
                if (top + rect.height > window.innerHeight) {
                    top = window.innerHeight - rect.height - 10;
                }

                menu.style.left = left + 'px';
                menu.style.top = top + 'px';

                // 点击其他地方时 close 菜单
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
    
    // copy 分类in all项目
    copyAllItems(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 🔥 fix：正确 process object copy，避免[object Object]
        const processedItems = items.map(item => {
            if (typeof item === 'object' && item !== null) {
                // 如果是 object，尝试获取有意义 属性orconverttoJSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    return item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    return JSON.stringify(item);
                }
            } else {
                // 如果是 string or其他基本 type，directly返回
                return String(item);
            }
        });
        
        const text = processedItems.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // display copy success prompt
            const categoryDiv = document.querySelector(`.category[data-category-key="${categoryKey}"]`);
            if (categoryDiv) {
                const copyBtn = categoryDiv.querySelector('.copy-all-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ already copy';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            }
        });
    }
    
    // test allAPI
    async testAllApis(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 切换到API test page
        const testTab = document.querySelector('.nav-tab[data-page="test"]');
        if (testTab) {
            testTab.click();
        }
        
        // wait page 切换 complete
        setTimeout(() => {
            // settings 分类 select 器
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.value = categoryKey;
                
                // 触发change event 以 update 界面
                const changeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(changeEvent);
            }
            
            // 调用 batch request test feature
            if (this.srcMiner.apiTester) {
                // 获取 user configuration   concurrent 数and timeout 时间
                const concurrencyInput = document.getElementById('apiConcurrency');
                const timeoutInput = document.getElementById('apiTimeout');
                const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
                const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000;
                
                // directly test 选in 分类
                const method = document.getElementById('requestMethod')?.value || 'GET';

                
                // 获取base API path configuration
                const baseApiPathInput = document.getElementById('baseApiPath');
                const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
                const customBaseApiPaths = this.srcMiner.apiTester.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
                
                // 如果automatic add了"/"before缀，给出 prompt
                if (rawBaseApiPaths) {
                    const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
                    const normalizedPaths = customBaseApiPaths;
                    
                    // check 每个 path 是否passive marker modify
                    originalPaths.forEach((originalPath, index) => {
                        const normalizedPath = normalizedPaths[index];
                        if (originalPath && originalPath !== normalizedPath) {
                            //console.log(`🔧 自动tobaseapipathadd"/"before缀: "${originalPath}" -> "${normalizedPath}"`);
                        }
                    });
                    
                    if (customBaseApiPaths.length > 1) {
                        //console.log(`🔧 检测到 ${customBaseApiPaths.length} 个baseapi path: ${customBaseApiPaths.join(', ')}`);
                    }
                }
                
                // 获取 custom API path configuration
                const customApiPathsInput = document.getElementById('customApiPaths');
                const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
                
                // 如果有 custom API path，add 到 test list in
                if (customApiPaths) {
                    const customPaths = this.srcMiner.apiTester.parseCustomApiPaths(customApiPaths);
                    items = this.srcMiner.apiTester.mergeAndDeduplicateItems(items, customPaths);
                    //console.log(`📝 add 了 ${customPaths.length} 个 custom API path，去重后总计 ${items.length} 个 test 项目`);
                }
                
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout, customBaseApiPaths);

            } else {
                this.showNotification('API test 器not initialize，无法 execute test', 'error');
            }
        }, 100);
    }
    
    // display API test result
    showApiTestResults(results) {
        // 确保模态框存in
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
            modalTitle.textContent = 'API test result';
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
            
            // add close button event listen
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('apiTestResultsContainer');
        resultsContainer.innerHTML = '';
        
        // add result 摘要
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
                <span>success:</span>
                <span style="color: #4caf50; font-weight: 600;">${successCount} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>failed:</span>
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
        
        // add detailed result
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
                        <span style="color: #888;">method:</span> 
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
            
            // add response data（如果有）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '10px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = 'display response data';
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
                    // 尝试 format 化JSON
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
                    dataContent.textContent = '无法 display response data';
                }
                
                dataToggle.addEventListener('click', () => {
                    if (dataContent.style.display === 'none') {
                        dataContent.style.display = 'block';
                        dataToggle.textContent = 'hide response data';
                    } else {
                        dataContent.style.display = 'none';
                        dataToggle.textContent = 'display response data';
                    }
                });
                
                dataContainer.appendChild(dataToggle);
                dataContainer.appendChild(dataContent);
                resultItem.appendChild(dataContainer);
            }
            
            detailsContainer.appendChild(resultItem);
        });
        
        resultsContainer.appendChild(detailsContainer);
        
        // display 模态框
        modal.style.display = 'block';
    }
    
    // display notification
    showNotification(message, type = 'info') {
        // 创建 notification 元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings style
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        
        // root 据 type settings color
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
        
        // add 到 page
        document.body.appendChild(notification);
        
        // 3 seconds后 automatic remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // load filter（如果require）
    async loadFiltersIfNeeded() {
        try {
            // check 是否already经 load filter
            if (window.domainPhoneFilter && window.apiFilter) {
                //console.log('✅ filter already load，无需重新 load');
                return;
            }
            
            //console.log('🔄 start load display filter ...');
            
            // check 是否in extension environment in
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // load domain and phone number filter
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // initialize filter
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ domain phone number filter initialize success');
                    }
                }
                
                // load API filter
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ API filter load success');
                }
                
                //console.log('🎉 all filter load complete');
            } else {
                console.warn('⚠️ 非 extension environment，无法 load filter');
            }
        } catch (error) {
            console.error('❌ filter load failed:', error);
        }
    }
    
    // load filter script
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 script load success: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ script load failed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve(); // 即使 timeout 也继续 execute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ load script failed: ${scriptPath}`, error);
                resolve(); // 出错时也继续 execute
            }
        });
    }
    
    // 应用 filter process result
    async applyFiltersToResults(results) {
        // 创建 result  深拷贝，避免 modify 原始 data
        const filteredResults = JSON.parse(JSON.stringify(results));
        
        try {
            // check filter 是否可用
            if (!window.domainPhoneFilter && !window.apiFilter) {
                //console.log('⚠️ filter not load，skip filter 步骤');
                return filteredResults;
            }
            
            //console.log('🔍 start 应用 filter optimization result ...');
            
            // 应用 domain and phone number filter
            if (window.domainPhoneFilter) {
                // filter domain
                if (filteredResults.domains && filteredResults.domains.length > 0) {
                    //console.log(`🔍 filter before domain count: ${filteredResults.domains.length}`);
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(filteredResults.domains);
                    //console.log(`✅ filter 后 domain count: ${filteredResults.domains.length}`);
                }
                
                // filter 子 domain
                if (filteredResults.subdomains && filteredResults.subdomains.length > 0) {
                    //console.log(`🔍 filter before子 domain count: ${filteredResults.subdomains.length}`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(filteredResults.subdomains);
                    //console.log(`✅ filter 后子 domain count: ${filteredResults.subdomains.length}`);
                }
                
                // filter email
                if (filteredResults.emails && filteredResults.emails.length > 0) {
                    //console.log(`🔍 filter before email count: ${filteredResults.emails.length}`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(filteredResults.emails);
                    //console.log(`✅ filter 后 email count: ${filteredResults.emails.length}`);
                }
                
                // filter phone number
                if (filteredResults.phoneNumbers && filteredResults.phoneNumbers.length > 0) {
                    //console.log(`🔍 filter before phone number count: ${filteredResults.phoneNumbers.length}`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(filteredResults.phoneNumbers, true);
                    //console.log(`✅ filter 后 phone number count: ${filteredResults.phoneNumbers.length}`);
                }
            }
            
            // 应用API filter
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                // filter 绝对 path API
                if (filteredResults.absoluteApis && filteredResults.absoluteApis.length > 0) {
                    //console.log(`🔍 filter before绝对 path API count: ${filteredResults.absoluteApis.length}`);
                    filteredResults.absoluteApis = window.apiFilter.filterAPIs(filteredResults.absoluteApis, true);
                    //console.log(`✅ filter 后绝对 path API count: ${filteredResults.absoluteApis.length}`);
                }
                
                // filter 相对 path API
                if (filteredResults.relativeApis && filteredResults.relativeApis.length > 0) {
                    //console.log(`🔍 filter before相对 path API count: ${filteredResults.relativeApis.length}`);
                    filteredResults.relativeApis = window.apiFilter.filterAPIs(filteredResults.relativeApis, false);
                    //console.log(`✅ filter 后相对 path API count: ${filteredResults.relativeApis.length}`);
                }
            }
            
            //console.log('🎉 result filter complete');
            
        } catch (error) {
            console.error('❌ 应用 filter 时出错:', error);
        }
        
        return filteredResults;
    }

    // add URL位置 prompt feature
    async addUrlLocationTooltip(element, item, category = null) {
        let tooltip = null;
        let hoverTimeout = null;

        element.addEventListener('mouseenter', () => {
            // delay display prompt，避免快速移动时频繁触发
            hoverTimeout = setTimeout(async () => {
                try {
                    const locationInfo = await this.getItemLocationInfo(category, item);
                    if (locationInfo) {
                        tooltip = this.createTooltip(locationInfo);
                        document.body.appendChild(tooltip);
                        this.positionTooltip(tooltip, element);
                    }
                } catch (error) {
                    console.error('[DisplayManager] 获取位置 information failed:', error);
                }
            }, 500); // 500ms delay display
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

    // 获取项目 位置 information - support两种调用方式：getItemLocationInfo(item) or getItemLocationInfo(category, item)
    async getItemLocationInfo(categoryOrItem, item = null) {
        try {
            // 🔥 fix：兼容两种调用方式
            let category = null;
            let actualItem = null;
            
            if (item === null) {
                // 单 parameter 调用：getItemLocationInfo(item)
                actualItem = categoryOrItem;
                category = null; // do not知道具体分类，requireinall分类in search
            } else {
                // 双 parameter 调用：getItemLocationInfo(category, item)
                category = categoryOrItem;
                actualItem = item;
            }
            
            // 🔥 fix：directlyfrom data 项本身获取sourceUrl information
            if (typeof actualItem === 'object' && actualItem !== null) {
                // 如果item本身就 contains sourceUrl information，directlyuse
                if (actualItem.sourceUrl && !actualItem.sourceUrl.startsWith('chrome-extension://')) {
                    return {
                        sourceUrl: actualItem.sourceUrl,
                        pageTitle: actualItem.pageTitle || document.title || 'scan result',
                        extractedAt: actualItem.extractedAt || new Date().toISOString()
                    };
                }
            }
            
            // 🔥 fix：尝试fromIndexedDB查找 data
            const indexedDBManager = this.srcMiner?.indexedDBManager || window.IndexedDBManager || window.indexedDBManager;
            if (!indexedDBManager) {
                console.warn('[DisplayManager] IndexedDBManagernot initialize，返回 current page information');
                return {
                    sourceUrl: window.location.href.startsWith('chrome-extension://') ? 'scan 目标 page' : window.location.href,
                    pageTitle: document.title || 'scan result',
                    extractedAt: new Date().toISOString()
                };
            }

            try {
                // 🔥 fix：获取all scan result
                const allResults = await indexedDBManager.getAllData('scanResults');
                
                if (allResults && allResults.length > 0) {
                    // 获取要查找  value
                    const searchValue = typeof actualItem === 'object' && actualItem !== null ? 
                        (actualItem.value || actualItem.text || actualItem.content || JSON.stringify(actualItem)) : 
                        String(actualItem);
                    
                    // inall scan result in查找 match 项
                    for (const result of allResults.reverse()) { // from最新  start 查找
                        if (result.results) {
                            // 如果指定了分类，只in该分类in查找
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
                                            // object format：{value: "xxx", sourceUrl: "xxx", ...}
                                            itemValue = dataItem.value || dataItem.text || dataItem.content;
                                            itemSourceUrl = dataItem.sourceUrl;
                                            itemPageTitle = dataItem.pageTitle;
                                            itemExtractedAt = dataItem.extractedAt;
                                        } else {
                                            // string format，use scan result  源 information
                                            itemValue = String(dataItem);
                                            itemSourceUrl = result.sourceUrl;
                                            itemPageTitle = result.pageTitle;
                                            itemExtractedAt = result.extractedAt;
                                        }

                                        // 比较 value 是否 match
                                        if (itemValue === searchValue) {
                                            // 🔥 fix：确保do not返回chrome-extension URL
                                            const finalSourceUrl = itemSourceUrl && !itemSourceUrl.startsWith('chrome-extension://') ? 
                                                itemSourceUrl : 
                                                (result.sourceUrl && !result.sourceUrl.startsWith('chrome-extension://') ? 
                                                    result.sourceUrl : 
                                                    'scan 目标 page');
                                            
                                            return {
                                                sourceUrl: finalSourceUrl,
                                                pageTitle: itemPageTitle || result.pageTitle || 'scan result',
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
                console.warn('[DisplayManager] IndexedDB query failed:', dbError);
            }
            
            // 🔥 fix：如果都没找到，返回 current page information 而do not是chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'scan 目标 page' : currentUrl,
                pageTitle: document.title || 'scan result',
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[DisplayManager] 获取位置 information 时出错:', error);
            // 🔥 fix：即使出错也do not返回chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'data 来源未知' : currentUrl,
                pageTitle: document.title || 'scan result',
                extractedAt: new Date().toISOString()
            };
        }
    }

    // in scan result in查找 contains sourceUrl  match 项
    findItemWithSourceUrl(item, results) {
        if (!results) return null;
        
        // 将itemconvertto string 进行比较
        const itemStr = typeof item === 'object' && item !== null ? 
            (item.text || item.content || item.value || JSON.stringify(item)) : 
            String(item);
        
        // 递归 search all result，返回 contains sourceUrl  match 项
        const searchInObject = (obj) => {
            if (Array.isArray(obj)) {
                for (const element of obj) {
                    if (typeof element === 'string') {
                        if (element === itemStr) {
                            // string match 但没有sourceUrl information
                            return null;
                        }
                    } else if (typeof element === 'object' && element !== null) {
                        // check object  各种可能  value field
                        const elementStr = element.text || element.content || element.value || JSON.stringify(element);
                        if (elementStr === itemStr) {
                            // 找到 match 项，返回 contains sourceUrl  object
                            return element;
                        }
                        // 递归 search
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

    // check 项目是否in scan result in（keep原有 method for其他地方）
    isItemInResults(item, results) {
        return this.findItemWithSourceUrl(item, results) !== null;
    }

    // 创建 prompt 框
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

        // 🔥 fix：确保all information 都有 valid value，避免显示"未知"
        const pageTitle = locationInfo.pageTitle || document.title || 'current page';
        const sourceUrl = locationInfo.sourceUrl || window.location.href;
        const extractedAt = locationInfo.extractedAt || new Date().toISOString();
        const scanId = locationInfo.scanId || 'current-session';

        // 🔥 fix：截断through长 URL display
        const displayUrl = sourceUrl.length > 50 ? sourceUrl.substring(0, 47) + '...' : sourceUrl;
        const displayTitle = pageTitle.length > 30 ? pageTitle.substring(0, 27) + '...' : pageTitle;

        tooltip.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>extract来源:</strong></div>
            <div style="margin-bottom: 3px;">${displayTitle}</div>
            <div style="margin-bottom: 3px;">${displayUrl}</div>
            <div style="margin-bottom: 3px;">${formatDate(extractedAt)}</div>
        `;

        return tooltip;
    }

    // 定位 prompt 框 - 🔥 fix：悬浮in鼠标上方
    positionTooltip(tooltip, element, mouseEvent = null) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let left, top;

        if (mouseEvent) {
            // 🔥 fix：use鼠标位置，display in鼠标上方
            left = mouseEvent.pageX - tooltipRect.width / 2; // 水平居in于鼠标
            top = mouseEvent.pageY - tooltipRect.height - 15; // display in鼠标上方，留15px间距
        } else {
            // 如果没有鼠标 event，use元素in心位置
            const rect = element.getBoundingClientRect();
            left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
            top = rect.top + scrollY - tooltipRect.height - 15;
        }

        // 🔥 fix：确保 prompt 框do not超出视口边界
        // 水平方向调整
        if (left + tooltipRect.width > viewportWidth + scrollX) {
            left = viewportWidth + scrollX - tooltipRect.width - 10;
        }
        if (left < scrollX + 10) {
            left = scrollX + 10;
        }

        // 垂直方向调整 - 如果上方 empty 间do not够，display in鼠标下方
        if (top < scrollY + 10) {
            if (mouseEvent) {
                top = mouseEvent.pageY + 15; // display in鼠标下方
            } else {
                const rect = element.getBoundingClientRect();
                top = rect.bottom + scrollY + 15;
            }
        }

        // 确保do not超出底部
        if (top + tooltipRect.height > viewportHeight + scrollY) {
            top = viewportHeight + scrollY - tooltipRect.height - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // add 右 key 菜单 feature
    addContextMenu(element, item) {
        element.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            // remove already存in 菜单
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

            // 确保菜单do not超出视窗
            if (left + rect.width > window.innerWidth) {
                left = window.innerWidth - rect.width - 10;
            }
            if (top + rect.height > window.innerHeight) {
                top = window.innerHeight - rect.height - 10;
            }

            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            // 点击其他地方时 close 菜单
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

    // 创建右 key 菜单
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
                text: 'copy content',
                icon: '',
                action: () => {
                    // process object type   item，确保正确convertto string
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
                        this.showNotification('content already copy 到剪贴板');
                    });
                }
            },
            {
                text: 'copy extract 位置',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        navigator.clipboard.writeText(locationInfo.sourceUrl).then(() => {
                            this.showNotification('extract 位置URLalready copy 到剪贴板');
                        });
                    } else {
                        this.showNotification('未找到 extract 位置URL', 'error');
                    }
                }
            },
            {
                text: 'open 源 page',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        window.open(locationInfo.sourceUrl, '_blank');
                    } else {
                        this.showNotification('未找到源 page URL', 'error');
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

    // display notification
    showNotification(message, type = 'success') {
        // remove already存in  notification
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

        // add 动画 style
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

        // 3 seconds后 automatic 消失
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
