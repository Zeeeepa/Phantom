/**
 * Display管理器 - 负责Result展示AndUI交互
 */
class DisplayManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async displayResults() {
        // EnsureData持久化
        if (this.srcMiner.results && Object.keys(this.srcMiner.results).length > 0) {
            this.srcMiner.saveResults();
        }
        
        // 如果CurrentNoResult，尝试from存储中恢复
        if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
            //console.log('🔄 CurrentNoneResult，尝试from存储中恢复Data...');
            await this.srcMiner.loadResults();
            if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
                //console.log('⚠️ 存储中也NoData');
            }
        }
        
        const resultsDiv = document.getElementById('results');
        
        // Basic预定义Class别
        const baseCategories = [
            { key: 'customApis', title: 'CustomAPIPath', icon: '🔧' },
            { key: 'absoluteApis', title: 'Absolute pathAPI', icon: '/' },
            { key: 'relativeApis', title: 'Relative pathAPI', icon: '~' },
            { key: 'modulePaths', title: '模块Path', icon: './' },
            { key: 'domains', title: 'Domain', icon: '🌐' },
            { key: 'subdomains', title: '子Domain', icon: 'sub' },
            { key: 'urls', title: 'CompleteURL', icon: 'http' },
            { key: 'parameters', title: 'Parameter', icon: 'param' },
            { key: 'ports', title: '端口', icon: 'port' },
            { key: 'jsFiles', title: 'JSFile', icon: '.js' },
            { key: 'cssFiles', title: 'CSSFile', icon: '.css' },
            { key: 'vueFiles', title: 'VueFile', icon: '.vue' },
            { key: 'images', title: '图片File', icon: '🖼️' },
            { key: 'audios', title: '音频File', icon: '🎵' },
            { key: 'videos', title: '视频File', icon: '🎬' },
            { key: 'emails', title: '邮箱地址', icon: '@' },
            { key: 'phoneNumbers', title: '手机号码', icon: '📱' },
            { key: 'ipAddresses', title: 'IP地址', icon: 'IP' },
            { key: 'credentials', title: 'User凭证', icon: '🔐' },
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
            { key: 'cryptoUsage', title: 'Encryption算法', icon: 'Crypto' },
            { key: 'githubUrls', title: 'GitHub链接', icon: '🐙' },
            { key: 'companies', title: '公司机构', icon: '🏢' },
            { key: 'cookies', title: 'CookieInformation', icon: '🍪' },
            { key: 'idKeys', title: 'ID密钥', icon: '🔑' },
            { key: 'sensitiveKeywords', title: '敏感关Key词', icon: '⚠️' },
            { key: 'comments', title: '代码注释', icon: '<!--' }
        ];

        // 动态LoadCustom正则ConfigurationAndAdd到DisplayClass别中 - Fix：支持ObjectAnd数Group两种存储Format
        let categories = [...baseCategories];
        try {
            const result = await chrome.storage.local.get(['customRegexConfigs']);
            if (result.customRegexConfigs) {
                //console.log('🔄 DisplayManagerUnified化版本Load动态Custom正则ConfigurationUsed forDisplay:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // Check存储Format：ObjectFormat还是数GroupFormat
                if (Array.isArray(result.customRegexConfigs)) {
                    // 数GroupFormat
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 DisplayManagerDetect到数GroupFormat的Custom正则Configuration');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // ObjectFormat，Convert为数Group
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // Add custom_ Before缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 DisplayManagerDetect到ObjectFormat的Custom正则Configuration，AlreadyConvert为数GroupFormat');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        if (config.key && config.name) {
                            categories.push({
                                key: config.key,
                                title: config.name,
                                icon: '🎯' // Custom正则使用Unified图标
                            });
                            //console.log(`✅ DisplayManagerUnified化版本AddCustom正则DisplayClass别: ${config.name} (${config.key})`);
                        }
                    });
                    
                    //console.log(`✅ DisplayManagerUnified化版本动态Custom正则DisplayClass别Loading complete，共Add ${configsToProcess.length} 个Class别`);
                } else {
                    //console.log('⚠️ DisplayManagerUnified化版本动态Custom正则Configurationis empty');
                }
            } else {
                //console.log('ℹ️ DisplayManagerUnified化版本Not found动态Custom正则Configuration');
            }
        } catch (error) {
            console.error('❌ DisplayManagerUnified化版本Load动态Custom正则ConfigurationFailed:', error);
        }
        
        //console.log('🔍 DisplayManagerUnified化版本StartDisplayResult，CurrentResultData:', this.srcMiner.results);
        //console.log('🔍 DisplayManagerUnified化版本StartDisplayResult，CurrentResultData:', this.srcMiner.results);
        //console.log('📊 DisplayManagerUnified化版本ResultStatistics:', Object.keys(this.srcMiner.results || {}).map(key => `${key}: ${(this.srcMiner.results[key] || []).length}`).join(', '));
        
        // 尝试LoadFilter
        await this.loadFiltersIfNeeded();
        
        // 应用FilterProcessResult
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        // Check是否有动态Create的Custom正则Result，AndAdd到DisplayClass别中
        if (filteredResults) {
            const dynamicCustomKeys = Object.keys(filteredResults).filter(key => 
                key.startsWith('custom_') && 
                !categories.some(cat => cat.key === key)
            );
            
            if (dynamicCustomKeys.length > 0) {
                //console.log(`🔍 DisplayManagerFound ${dynamicCustomKeys.length} 个动态Custom正则Result:`, dynamicCustomKeys);
                
                // 尝试from存储中GetConfiguration名称以提供更好的Display名称
                try {
                    const result = await chrome.storage.local.get(['customRegexConfigs']);
                    const customConfigs = result.customRegexConfigs || {};
                    
                    dynamicCustomKeys.forEach(key => {
                        let displayName = key.replace('custom_', 'Custom正则-');
                        
                        // 尝试Found对应的Configuration名称
                        const configKey = key.replace('custom_', '');
                        
                        // 支持ObjectAnd数Group两种存储Format
                        if (Array.isArray(customConfigs)) {
                            // 数GroupFormat
                            const config = customConfigs.find(c => c.key === key);
                            if (config && config.name) {
                                displayName = config.name;
                            }
                        } else if (typeof customConfigs === 'object') {
                            // ObjectFormat
                            if (customConfigs[configKey] && customConfigs[configKey].name) {
                                displayName = customConfigs[configKey].name;
                            }
                        }
                        
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManagerAdd动态Custom正则DisplayClass别: ${displayName} (${key})`);
                    });
                } catch (error) {
                    console.error('❌ GetCustom正则Configuration名称Failed:', error);
                    // 降级Process：使用Default名称
                    dynamicCustomKeys.forEach(key => {
                        const displayName = key.replace('custom_', 'Custom正则-');
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ DisplayManagerAdd动态Custom正则DisplayClass别(降级): ${displayName} (${key})`);
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
                
                // 如果是Custom正则Result，Display详细日志
                if (category.key.startsWith('custom_')) {
                    //console.log(`✅ DisplayManagerDisplayCustom正则Class别: ${category.title} (${category.key}) - ${items.length} 个Result`);
                    //console.log(`🎯 DisplayManagerCustom正则 ${category.key} Result预览:`, items.slice(0, 3));
                }
            }
        });
        
        // 如果NoResult，DisplayPrompt
        if (totalCount === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #00d4aa;">
                    <h3>Scan completed</h3>
                    <p>CurrentPageNotFound可Extract的Information</p>
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        This可能是因为：<br>
                        • PageContent较少<br>
                        • InformationAlreadyByEncryptionOr混淆<br>
                        • Page使用了复杂的动态Load<br>
                        • 尝试使用深度ScanGet更多Information
                    </p>
                </div>
            `;
        }
        
        // UpdateStatisticsInformation - 支持实时Update标识
        const scanMode = this.srcMiner.deepScanRunning ? '深度Scan中' : '标准Scan';
        const scannedCount = this.srcMiner.scannedUrls ? this.srcMiner.scannedUrls.size : 1;
        const currentDepth = this.srcMiner.currentDepth || 0;
        const maxDepth = this.srcMiner.maxDepth || 2;
        
        // Add实时Update指示器
        const realtimeIndicator = this.srcMiner.deepScanRunning ? 
            '<span style="color: #00d4aa; animation: pulse 1s infinite;">●</span> 实时Update中' : '';
        
        document.getElementById('stats').innerHTML = `
            <div>总计Found <strong>${totalCount}</strong> 个Project ${realtimeIndicator}</div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                ScanPattern: ${scanMode} | AlreadyScan: ${scannedCount} 个File
                ${this.srcMiner.deepScanRunning ? ` | 深度: ${currentDepth}/${maxDepth}` : ''}<br>
                最AfterUpdate: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        // Add脉冲动画样式（如果不存在）
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
        
        // AddCopyAllAndTestAll按钮
        const headerActions = document.createElement('div');
        headerActions.style.display = 'flex';
        headerActions.style.gap = '5px';
        headerActions.style.alignItems = 'center';
        
        // 展开/收起按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn toggle-btn';
        toggleBtn.textContent = '展开/收起';
        toggleBtn.title = '展开Or收起Content';
        toggleBtn.style.transition = 'all 0.3s';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // Batch查看按钮
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'btn batch-view-btn';
        batchViewBtn.textContent = 'Batch查看';
        batchViewBtn.title = '在新窗口中查看所有Content';
        batchViewBtn.style.transition = 'all 0.3s';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // CopyAll按钮
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn copy-all-btn';
        copyAllBtn.textContent = 'CopyAll';
        copyAllBtn.title = 'CopyAllContent';
        copyAllBtn.style.transition = 'all 0.3s';
        copyAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyAllItems(category.key, items);
        });
        headerActions.appendChild(copyAllBtn);
        
        
        // Add计数徽章
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
            
            // 🔥 Fix：正确ProcessObjectDisplay
            if (typeof item === 'object' && item !== null) {
                // 如果是Object，尝试Get有意义的属性OrConvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // 如果是字符串Or其他基本Type，DirectDisplay
                itemDiv.textContent = String(item);
            }
            
            itemDiv.title = 'ClickCopy';
            
            // Add悬停DisplayURL位置功能
            this.addUrlLocationTooltip(itemDiv, item, category.key);
            
            // Add右Key菜单功能
            this.addContextMenu(itemDiv, item);
            
            itemDiv.addEventListener('click', () => {
                // 🔥 Fix：正确ProcessObjectCopy，避免[object Object]
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
    
    // DisplayBatch查看界面
    showBatchViewOnly(title, items) {
        // Ensure模态框存在
        let modal = document.getElementById('batchViewModal');
        if (!modal) {
            // Create模态框
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
            
            // AddClose按钮事件Listen
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('batchViewResults');
        const modalTitle = modal.querySelector('h3');
        
        modalTitle.textContent = title;
        resultsContainer.innerHTML = `<h4>${title} (共 ${items.length} Item)</h4>`;
        
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
            
            // 🔥 Fix：正确ProcessObjectDisplay
            if (typeof item === 'object' && item !== null) {
                // 如果是Object，尝试Get有意义的属性OrConvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // 如果是字符串Or其他基本Type，DirectDisplay
                itemDiv.textContent = String(item);
            }
            
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            itemDiv.style.wordBreak = 'break-all';
            itemDiv.style.transition = 'all 0.3s';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.cursor = 'pointer';
            
            // Add悬停Display来Source功能
            let tooltip = null;
            
            itemDiv.onmouseover = async (e) => {
                itemDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'translateX(3px)';
                
                // CreateAndDisplaytooltip
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
                
                // GetProject位置Information
                try {
                    const locationInfo = await this.getItemLocationInfo(item);
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #00d4aa; margin-bottom: 4px;">来SourceInformation</div>
                        <div><strong>Page:</strong> ${locationInfo.pageTitle}</div>
                        <div><strong>URL:</strong> ${locationInfo.sourceUrl}</div>
                        <div><strong>Time:</strong> ${new Date(locationInfo.extractedAt).toLocaleString('zh-CN')}</div>
                    `;
                } catch (error) {
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #ff6b6b; margin-bottom: 4px;">来SourceInformation</div>
                        <div>Get来SourceInformationFailed</div>
                    `;
                }
                
                // 定位tooltip
                const rect = itemDiv.getBoundingClientRect();
                tooltip.style.left = (rect.left + 10) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                
                // Ensuretooltip不超出屏幕边界
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
            
            // Add右Key菜单功能
            itemDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // RemoveAlready存在的菜单
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

                // Ensure菜单不超出视窗
                if (left + rect.width > window.innerWidth) {
                    left = window.innerWidth - rect.width - 10;
                }
                if (top + rect.height > window.innerHeight) {
                    top = window.innerHeight - rect.height - 10;
                }

                menu.style.left = left + 'px';
                menu.style.top = top + 'px';

                // Click其他地方时Close菜单
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
    
    // CopyCategory中的所有Project
    copyAllItems(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 🔥 Fix：正确ProcessObjectCopy，避免[object Object]
        const processedItems = items.map(item => {
            if (typeof item === 'object' && item !== null) {
                // 如果是Object，尝试Get有意义的属性OrConvert为JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    return item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    return JSON.stringify(item);
                }
            } else {
                // 如果是字符串Or其他基本Type，DirectReturn
                return String(item);
            }
        });
        
        const text = processedItems.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // DisplayCopySuccessPrompt
            const categoryDiv = document.querySelector(`.category[data-category-key="${categoryKey}"]`);
            if (categoryDiv) {
                const copyBtn = categoryDiv.querySelector('.copy-all-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ Copied';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            }
        });
    }
    
    // Test所有API
    async testAllApis(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 切换到API TestingPage
        const testTab = document.querySelector('.nav-tab[data-page="test"]');
        if (testTab) {
            testTab.click();
        }
        
        // 等PendingPage切换Complete
        setTimeout(() => {
            // SettingsCategory选择器
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.value = categoryKey;
                
                // 触发change事件以Update界面
                const changeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(changeEvent);
            }
            
            // 调用BatchRequestTest功能
            if (this.srcMiner.apiTester) {
                // GetUserConfiguration的And发数And超时Time
                const concurrencyInput = document.getElementById('apiConcurrency');
                const timeoutInput = document.getElementById('apiTimeout');
                const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
                const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000;
                
                // DirectTest选中的Category
                const method = document.getElementById('requestMethod')?.value || 'GET';

                
                // Getbase APIPathConfiguration
                const baseApiPathInput = document.getElementById('baseApiPath');
                const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
                const customBaseApiPaths = this.srcMiner.apiTester.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
                
                // 如果AutoAdd了"/"Before缀，给出Prompt
                if (rawBaseApiPaths) {
                    const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
                    const normalizedPaths = customBaseApiPaths;
                    
                    // CheckEvery个Path是否By修改
                    originalPaths.forEach((originalPath, index) => {
                        const normalizedPath = normalizedPaths[index];
                        if (originalPath && originalPath !== normalizedPath) {
                            //console.log(`🔧 Auto为baseapiPathAdd"/"Before缀: "${originalPath}" -> "${normalizedPath}"`);
                        }
                    });
                    
                    if (customBaseApiPaths.length > 1) {
                        //console.log(`🔧 Detect到 ${customBaseApiPaths.length} 个baseapiPath: ${customBaseApiPaths.join(', ')}`);
                    }
                }
                
                // GetCustomAPIPathConfiguration
                const customApiPathsInput = document.getElementById('customApiPaths');
                const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
                
                // 如果有CustomAPIPath，Add到Test列Table中
                if (customApiPaths) {
                    const customPaths = this.srcMiner.apiTester.parseCustomApiPaths(customApiPaths);
                    items = this.srcMiner.apiTester.mergeAndDeduplicateItems(items, customPaths);
                    //console.log(`📝 Add了 ${customPaths.length} 个CustomAPIPath，去重After总计 ${items.length} 个TestProject`);
                }
                
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout, customBaseApiPaths);

            } else {
                this.showNotification('API Testing器NotInitialize，None法ExecuteTest', 'error');
            }
        }, 100);
    }
    
    // DisplayAPI TestingResult
    showApiTestResults(results) {
        // Ensure模态框存在
        let modal = document.getElementById('apiTestResultsModal');
        if (!modal) {
            // Create模态框
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
            modalTitle.textContent = 'API TestingResult';
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
            
            // AddClose按钮事件Listen
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('apiTestResultsContainer');
        resultsContainer.innerHTML = '';
        
        // AddResult摘要
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
            <div style="font-weight: bold; margin-bottom: 8px; color: #00d4aa;">Test摘要:</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>总计:</span>
                <span style="font-weight: 600;">${results.length} 个API</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Success:</span>
                <span style="color: #4caf50; font-weight: 600;">${successCount} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Failed:</span>
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
        
        // Add详细Result
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
            const statusText = result.success ? 'Success' : 'Failed';
            const statusCode = result.status || 'N/A';
            
            resultItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-weight: bold; word-break: break-all; max-width: 80%;">${index + 1}. ${result.url}</div>
                    <div style="color: ${statusColor}; font-weight: 600; white-space: nowrap;">${statusText} (${statusCode})</div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 5px;">
                    <div>
                        <span style="color: #888;">Method:</span> 
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
            
            // Add响应Data（如果有）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '10px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = 'Display响应Data';
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
                    // 尝试FormatJSON
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
                    dataContent.textContent = 'None法Display响应Data';
                }
                
                dataToggle.addEventListener('click', () => {
                    if (dataContent.style.display === 'none') {
                        dataContent.style.display = 'block';
                        dataToggle.textContent = '隐藏响应Data';
                    } else {
                        dataContent.style.display = 'none';
                        dataToggle.textContent = 'Display响应Data';
                    }
                });
                
                dataContainer.appendChild(dataToggle);
                dataContainer.appendChild(dataContent);
                resultItem.appendChild(dataContainer);
            }
            
            detailsContainer.appendChild(resultItem);
        });
        
        resultsContainer.appendChild(detailsContainer);
        
        // Display模态框
        modal.style.display = 'block';
    }
    
    // DisplayNotify
    showNotification(message, type = 'info') {
        // CreateNotifyElement
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Settings样式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        
        // 根据TypeSettings颜色
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
        
        // Add到Page
        document.body.appendChild(notification);
        
        // 3 secondsAfterAutoRemove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // LoadFilter（如果Need）
    async loadFiltersIfNeeded() {
        try {
            // Check是否Already经LoadFilter
            if (window.domainPhoneFilter && window.apiFilter) {
                //console.log('✅ FilterLoaded，None需Reload');
                return;
            }
            
            //console.log('🔄 StartLoadDisplayFilter...');
            
            // Check是否在Extension环境中
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // LoadDomainAnd手机号Filter
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // InitializeFilter
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ Domain手机号FilterInitializeSuccess');
                    }
                }
                
                // LoadAPIFilter
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ APIFilterLoadSuccess');
                }
                
                //console.log('🎉 所有FilterLoading complete');
            } else {
                console.warn('⚠️ 非Extension环境，None法LoadFilter');
            }
        } catch (error) {
            console.error('❌ FilterLoadFailed:', error);
        }
    }
    
    // LoadFilterScript
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 ScriptLoadSuccess: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ ScriptLoadFailed: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // Settings超时保护
                setTimeout(() => {
                    resolve(); // 即使超时也ContinueExecute
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ LoadScriptFailed: ${scriptPath}`, error);
                resolve(); // 出错时也ContinueExecute
            }
        });
    }
    
    // 应用FilterProcessResult
    async applyFiltersToResults(results) {
        // CreateResult的深拷贝，避免修改原始Data
        const filteredResults = JSON.parse(JSON.stringify(results));
        
        try {
            // CheckFilter是否Available
            if (!window.domainPhoneFilter && !window.apiFilter) {
                //console.log('⚠️ FilterNotLoad，跳过FilterStep');
                return filteredResults;
            }
            
            //console.log('🔍 Start应用Filter优化Result...');
            
            // 应用DomainAnd手机号Filter
            if (window.domainPhoneFilter) {
                // FilterDomain
                if (filteredResults.domains && filteredResults.domains.length > 0) {
                    //console.log(`🔍 FilterBeforeDomain数量: ${filteredResults.domains.length}`);
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(filteredResults.domains);
                    //console.log(`✅ FilterAfterDomain数量: ${filteredResults.domains.length}`);
                }
                
                // Filter子Domain
                if (filteredResults.subdomains && filteredResults.subdomains.length > 0) {
                    //console.log(`🔍 FilterBefore子Domain数量: ${filteredResults.subdomains.length}`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(filteredResults.subdomains);
                    //console.log(`✅ FilterAfter子Domain数量: ${filteredResults.subdomains.length}`);
                }
                
                // Filter邮箱
                if (filteredResults.emails && filteredResults.emails.length > 0) {
                    //console.log(`🔍 FilterBefore邮箱数量: ${filteredResults.emails.length}`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(filteredResults.emails);
                    //console.log(`✅ FilterAfter邮箱数量: ${filteredResults.emails.length}`);
                }
                
                // Filter手机号
                if (filteredResults.phoneNumbers && filteredResults.phoneNumbers.length > 0) {
                    //console.log(`🔍 FilterBefore手机号数量: ${filteredResults.phoneNumbers.length}`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(filteredResults.phoneNumbers, true);
                    //console.log(`✅ FilterAfter手机号数量: ${filteredResults.phoneNumbers.length}`);
                }
            }
            
            // 应用APIFilter
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                // FilterAbsolute pathAPI
                if (filteredResults.absoluteApis && filteredResults.absoluteApis.length > 0) {
                    //console.log(`🔍 FilterBeforeAbsolute pathAPI数量: ${filteredResults.absoluteApis.length}`);
                    filteredResults.absoluteApis = window.apiFilter.filterAPIs(filteredResults.absoluteApis, true);
                    //console.log(`✅ FilterAfterAbsolute pathAPI数量: ${filteredResults.absoluteApis.length}`);
                }
                
                // FilterRelative pathAPI
                if (filteredResults.relativeApis && filteredResults.relativeApis.length > 0) {
                    //console.log(`🔍 FilterBeforeRelative pathAPI数量: ${filteredResults.relativeApis.length}`);
                    filteredResults.relativeApis = window.apiFilter.filterAPIs(filteredResults.relativeApis, false);
                    //console.log(`✅ FilterAfterRelative pathAPI数量: ${filteredResults.relativeApis.length}`);
                }
            }
            
            //console.log('🎉 ResultFilterComplete');
            
        } catch (error) {
            console.error('❌ 应用Filter时出错:', error);
        }
        
        return filteredResults;
    }

    // AddURL位置Prompt功能
    async addUrlLocationTooltip(element, item, category = null) {
        let tooltip = null;
        let hoverTimeout = null;

        element.addEventListener('mouseenter', () => {
            // 延迟DisplayPrompt，避免快速移动时频繁触发
            hoverTimeout = setTimeout(async () => {
                try {
                    const locationInfo = await this.getItemLocationInfo(category, item);
                    if (locationInfo) {
                        tooltip = this.createTooltip(locationInfo);
                        document.body.appendChild(tooltip);
                        this.positionTooltip(tooltip, element);
                    }
                } catch (error) {
                    console.error('[DisplayManager] Get位置InformationFailed:', error);
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

    // GetProject的位置Information - 支持两种调用方式：getItemLocationInfo(item) Or getItemLocationInfo(category, item)
    async getItemLocationInfo(categoryOrItem, item = null) {
        try {
            // 🔥 Fix：兼容两种调用方式
            let category = null;
            let actualItem = null;
            
            if (item === null) {
                // 单Parameter调用：getItemLocationInfo(item)
                actualItem = categoryOrItem;
                category = null; // 不知道具体Category，Need在所有Category中Search
            } else {
                // 双Parameter调用：getItemLocationInfo(category, item)
                category = categoryOrItem;
                actualItem = item;
            }
            
            // 🔥 Fix：DirectfromDataItem本身GetsourceUrlInformation
            if (typeof actualItem === 'object' && actualItem !== null) {
                // 如果item本身就包含sourceUrlInformation，Direct使用
                if (actualItem.sourceUrl && !actualItem.sourceUrl.startsWith('chrome-extension://')) {
                    return {
                        sourceUrl: actualItem.sourceUrl,
                        pageTitle: actualItem.pageTitle || document.title || 'Scan results',
                        extractedAt: actualItem.extractedAt || new Date().toISOString()
                    };
                }
            }
            
            // 🔥 Fix：尝试fromIndexedDBFindData
            const indexedDBManager = this.srcMiner?.indexedDBManager || window.IndexedDBManager || window.indexedDBManager;
            if (!indexedDBManager) {
                console.warn('[DisplayManager] IndexedDBManagerNotInitialize，ReturnCurrentPageInformation');
                return {
                    sourceUrl: window.location.href.startsWith('chrome-extension://') ? 'ScanTargetPage' : window.location.href,
                    pageTitle: document.title || 'Scan results',
                    extractedAt: new Date().toISOString()
                };
            }

            try {
                // 🔥 Fix：Get所有Scan results
                const allResults = await indexedDBManager.getAllData('scanResults');
                
                if (allResults && allResults.length > 0) {
                    // Get要Find的值
                    const searchValue = typeof actualItem === 'object' && actualItem !== null ? 
                        (actualItem.value || actualItem.text || actualItem.content || JSON.stringify(actualItem)) : 
                        String(actualItem);
                    
                    // 在所有Scan results中FindMatchItem
                    for (const result of allResults.reverse()) { // from最新的StartFind
                        if (result.results) {
                            // 如果指定了Category，Only在该Category中Find
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
                                            // ObjectFormat：{value: "xxx", sourceUrl: "xxx", ...}
                                            itemValue = dataItem.value || dataItem.text || dataItem.content;
                                            itemSourceUrl = dataItem.sourceUrl;
                                            itemPageTitle = dataItem.pageTitle;
                                            itemExtractedAt = dataItem.extractedAt;
                                        } else {
                                            // 字符串Format，使用Scan results的SourceInformation
                                            itemValue = String(dataItem);
                                            itemSourceUrl = result.sourceUrl;
                                            itemPageTitle = result.pageTitle;
                                            itemExtractedAt = result.extractedAt;
                                        }

                                        // Compare值是否Match
                                        if (itemValue === searchValue) {
                                            // 🔥 Fix：Ensure不Returnchrome-extension URL
                                            const finalSourceUrl = itemSourceUrl && !itemSourceUrl.startsWith('chrome-extension://') ? 
                                                itemSourceUrl : 
                                                (result.sourceUrl && !result.sourceUrl.startsWith('chrome-extension://') ? 
                                                    result.sourceUrl : 
                                                    'ScanTargetPage');
                                            
                                            return {
                                                sourceUrl: finalSourceUrl,
                                                pageTitle: itemPageTitle || result.pageTitle || 'Scan results',
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
                console.warn('[DisplayManager] IndexedDBQueryFailed:', dbError);
            }
            
            // 🔥 Fix：如果都没Found，ReturnCurrentPageInformation而不是chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'ScanTargetPage' : currentUrl,
                pageTitle: document.title || 'Scan results',
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[DisplayManager] Get位置Information时出错:', error);
            // 🔥 Fix：即使出错也不Returnchrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'Data来SourceNot知' : currentUrl,
                pageTitle: document.title || 'Scan results',
                extractedAt: new Date().toISOString()
            };
        }
    }

    // 在Scan results中Find包含sourceUrl的MatchItem
    findItemWithSourceUrl(item, results) {
        if (!results) return null;
        
        // 将itemConvert为字符串PerformCompare
        const itemStr = typeof item === 'object' && item !== null ? 
            (item.text || item.content || item.value || JSON.stringify(item)) : 
            String(item);
        
        // 递归Search所有Result，Return包含sourceUrl的MatchItem
        const searchInObject = (obj) => {
            if (Array.isArray(obj)) {
                for (const element of obj) {
                    if (typeof element === 'string') {
                        if (element === itemStr) {
                            // 字符串Match但NosourceUrlInformation
                            return null;
                        }
                    } else if (typeof element === 'object' && element !== null) {
                        // CheckObject的各种可能的值字段
                        const elementStr = element.text || element.content || element.value || JSON.stringify(element);
                        if (elementStr === itemStr) {
                            // FoundMatchItem，Return包含sourceUrl的Object
                            return element;
                        }
                        // 递归Search
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

    // CheckProject是否在Scan results中（保留原有MethodUsed for其他地方）
    isItemInResults(item, results) {
        return this.findItemWithSourceUrl(item, results) !== null;
    }

    // CreatePrompt框
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

        // 🔥 Fix：Ensure所有Information都有Valid值，避免Display"Not知"
        const pageTitle = locationInfo.pageTitle || document.title || 'CurrentPage';
        const sourceUrl = locationInfo.sourceUrl || window.location.href;
        const extractedAt = locationInfo.extractedAt || new Date().toISOString();
        const scanId = locationInfo.scanId || 'current-session';

        // 🔥 Fix：截断过长的URLDisplay
        const displayUrl = sourceUrl.length > 50 ? sourceUrl.substring(0, 47) + '...' : sourceUrl;
        const displayTitle = pageTitle.length > 30 ? pageTitle.substring(0, 27) + '...' : pageTitle;

        tooltip.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Extract来Source:</strong></div>
            <div style="margin-bottom: 3px;">${displayTitle}</div>
            <div style="margin-bottom: 3px;">${displayUrl}</div>
            <div style="margin-bottom: 3px;">${formatDate(extractedAt)}</div>
        `;

        return tooltip;
    }

    // 定位Prompt框 - 🔥 Fix：悬浮在鼠标上方
    positionTooltip(tooltip, element, mouseEvent = null) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let left, top;

        if (mouseEvent) {
            // 🔥 Fix：使用鼠标位置，Display在鼠标上方
            left = mouseEvent.pageX - tooltipRect.width / 2; // 水平居中于鼠标
            top = mouseEvent.pageY - tooltipRect.height - 15; // Display在鼠标上方，留15px间距
        } else {
            // 如果No鼠标事件，使用Element中心位置
            const rect = element.getBoundingClientRect();
            left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
            top = rect.top + scrollY - tooltipRect.height - 15;
        }

        // 🔥 Fix：EnsurePrompt框不超出视口边界
        // 水平方向调整
        if (left + tooltipRect.width > viewportWidth + scrollX) {
            left = viewportWidth + scrollX - tooltipRect.width - 10;
        }
        if (left < scrollX + 10) {
            left = scrollX + 10;
        }

        // 垂直方向调整 - 如果上方Empty间不够，Display在鼠标下方
        if (top < scrollY + 10) {
            if (mouseEvent) {
                top = mouseEvent.pageY + 15; // Display在鼠标下方
            } else {
                const rect = element.getBoundingClientRect();
                top = rect.bottom + scrollY + 15;
            }
        }

        // Ensure不超出底部
        if (top + tooltipRect.height > viewportHeight + scrollY) {
            top = viewportHeight + scrollY - tooltipRect.height - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // Add右Key菜单功能
    addContextMenu(element, item) {
        element.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            // RemoveAlready存在的菜单
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

            // Ensure菜单不超出视窗
            if (left + rect.width > window.innerWidth) {
                left = window.innerWidth - rect.width - 10;
            }
            if (top + rect.height > window.innerHeight) {
                top = window.innerHeight - rect.height - 10;
            }

            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            // Click其他地方时Close菜单
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

    // Create右Key菜单
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
                text: 'CopyContent',
                icon: '',
                action: () => {
                    // ProcessObjectType的 item，Ensure正确Convert为字符串
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
                        this.showNotification('ContentCopied到剪贴板');
                    });
                }
            },
            {
                text: 'CopyExtract位置',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        navigator.clipboard.writeText(locationInfo.sourceUrl).then(() => {
                            this.showNotification('Extract位置URLCopied到剪贴板');
                        });
                    } else {
                        this.showNotification('Not foundExtract位置URL', 'error');
                    }
                }
            },
            {
                text: '打开SourcePage',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        window.open(locationInfo.sourceUrl, '_blank');
                    } else {
                        this.showNotification('Not foundSourcePageURL', 'error');
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

    // DisplayNotify
    showNotification(message, type = 'success') {
        // RemoveAlready存在的Notify
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

        // Add动画样式
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

        // 3 secondsAfterAuto消失
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
