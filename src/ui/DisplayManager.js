/**
 * manager display - results and 负责展示UI交互
 */
class DisplayManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    async displayResults() {
        // data 确保持久化
        if (this.srcMiner.results && Object.keys(this.srcMiner.results).length > 0) {
            this.srcMiner.saveResults();
        }
        
        // results current if has 没，resume from in 尝试存储
        if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
            //console.log('🔄 results current 无，data resume from in 尝试存储...');
            await this.srcMiner.loadResults();
            if (!this.srcMiner.results || Object.keys(this.srcMiner.results).length === 0) {
                //console.log('⚠️ data in has 存储也没');
            }
        }
        
        const resultsDiv = document.getElementById('results');
        
        // basic category 预定义
        const baseCategories = [
            { key: 'customApis', title: 'API path custom', icon: '🔧' },
            { key: 'absoluteApis', title: 'absolute path API', icon: '/' },
            { key: 'relativeApis', title: 'relative path API', icon: '~' },
            { key: 'modulePaths', title: 'path module', icon: './' },
            { key: 'domains', title: 'domain', icon: '🌐' },
            { key: 'subdomains', title: 'subdomain', icon: 'sub' },
            { key: 'urls', title: 'URL 完整', icon: 'http' },
            { key: 'parameters', title: 'parameters', icon: 'param' },
            { key: 'ports', title: '端口', icon: 'port' },
            { key: 'jsFiles', title: 'file JS', icon: '.js' },
            { key: 'cssFiles', title: 'file CSS', icon: '.css' },
            { key: 'vueFiles', title: 'file Vue', icon: '.vue' },
            { key: 'images', title: 'file 图片', icon: '🖼️' },
            { key: 'audios', title: 'file 音频', icon: '🎵' },
            { key: 'videos', title: 'file 视频', icon: '🎬' },
            { key: 'emails', title: 'address 邮箱', icon: '@' },
            { key: 'phoneNumbers', title: '手机号码', icon: '📱' },
            { key: 'ipAddresses', title: 'address IP', icon: 'IP' },
            { key: 'credentials', title: 'user 凭证', icon: '🔐' },
            { key: 'jwts', title: 'JWT Token', icon: '🎫' },
            { key: 'bearerTokens', title: 'Bearer Token', icon: 'Bearer' },
            { key: 'basicAuth', title: 'Basic Auth', icon: 'Basic' },
            { key: 'authHeaders', title: 'Authorization Header', icon: 'Auth' },
            { key: 'wechatAppIds', title: '微信AppID', icon: 'wx' },
            { key: 'awsKeys', title: 'key AWS', icon: 'AWS' },
            { key: 'googleApiKeys', title: 'Google API Key', icon: 'G' },
            { key: 'githubTokens', title: 'GitHub Token', icon: 'GH' },
            { key: 'gitlabTokens', title: 'GitLab Token', icon: 'GL' },
            { key: 'webhookUrls', title: 'Webhook URLs', icon: 'Hook' },
            { key: 'idCards', title: 'ID card 号', icon: '🆔' },
            { key: 'cryptoUsage', title: '加密算法', icon: 'Crypto' },
            { key: 'githubUrls', title: 'link GitHub', icon: '🐙' },
            { key: 'companies', title: '公司机构', icon: '🏢' },
            { key: 'cookies', title: 'information Cookie', icon: '🍪' },
            { key: 'idKeys', title: 'key ID', icon: '🔑' },
            { key: 'sensitiveKeywords', title: 'keyword 敏感', icon: '⚠️' },
            { key: 'comments', title: 'code comment', icon: '<!--' }
        ];

        // custom regex add configuration load display dynamic category to in 并 - fixed：object format array and 支持两种存储
        let categories = [...baseCategories];
        try {
            const result = await chrome.storage.local.get(['customRegexConfigs']);
            if (result.customRegexConfigs) {
                //console.log('🔄 custom regex unified configuration version load display dynamic for DisplayManager:', result.customRegexConfigs);
                
                let configsToProcess = [];
                
                // check format 存储：object format format array yes 还
                if (Array.isArray(result.customRegexConfigs)) {
                    // format array
                    configsToProcess = result.customRegexConfigs;
                    //console.log('📋 custom regex detected configuration format array of DisplayManager');
                } else if (typeof result.customRegexConfigs === 'object') {
                    // object format，convert array as
                    configsToProcess = Object.entries(result.customRegexConfigs).map(([key, config]) => ({
                        key: `custom_${key}`, // add custom_ before 缀
                        name: config.name,
                        pattern: config.pattern,
                        createdAt: config.createdAt
                    }));
                    //console.log('📋 custom regex detected configuration object format of DisplayManager，format convert array as 已');
                }
                
                if (configsToProcess.length > 0) {
                    configsToProcess.forEach((config, index) => {
                        if (config.key && config.name) {
                            categories.push({
                                key: config.key,
                                title: config.name,
                                icon: '🎯' // custom regex use 统一图标
                            });
                            //console.log(`✅ custom regex unified add version display category DisplayManager: ${config.name} (${config.key})`);
                        }
                    });
                    
                    //console.log(`✅ custom regex unified complete version load display dynamic category DisplayManager，add total ${configsToProcess.length} category item(s)`);
                } else {
                    //console.log('⚠️ custom regex unified configuration version is empty dynamic DisplayManager');
                }
            } else {
                //console.log('ℹ️ custom regex not found unified configuration version dynamic DisplayManager');
            }
        } catch (error) {
            console.error('❌ custom regex unified failed configuration version load dynamic DisplayManager:', error);
        }
        
        //console.log('🔍 unified start results version display DisplayManager，data results current:', this.srcMiner.results);
        //console.log('🔍 unified start results version display DisplayManager，data results current:', this.srcMiner.results);
        //console.log('📊 unified statistics results version DisplayManager:', Object.keys(this.srcMiner.results || {}).map(key => `${key}: ${(this.srcMiner.results[key] || []).length}`).join(', '));
        
        // filter load 尝试
        await this.loadFiltersIfNeeded();
        
        // filter results process 应用
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        // custom regex results check dynamic of no yes has 创建，add display category to in 并
        if (filteredResults) {
            const dynamicCustomKeys = Object.keys(filteredResults).filter(key => 
                key.startsWith('custom_') && 
                !categories.some(cat => cat.key === key)
            );
            
            if (dynamicCustomKeys.length > 0) {
                //console.log(`🔍 found DisplayManager ${dynamicCustomKeys.length} custom regex results dynamic item(s):`, dynamicCustomKeys);
                
                // get configuration name name display with from in of 尝试存储提供更好
                try {
                    const result = await chrome.storage.local.get(['customRegexConfigs']);
                    const customConfigs = result.customRegexConfigs || {};
                    
                    dynamicCustomKeys.forEach(key => {
                        let displayName = key.replace('custom_', 'custom regex -');
                        
                        // configuration name to of 尝试找对应
                        const configKey = key.replace('custom_', '');
                        
                        // object format array and 支持两种存储
                        if (Array.isArray(customConfigs)) {
                            // format array
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
                        //console.log(`✅ custom regex add display dynamic category DisplayManager: ${displayName} (${key})`);
                    });
                } catch (error) {
                    console.error('❌ custom regex failed get configuration name:', error);
                    // process 降级：default use name
                    dynamicCustomKeys.forEach(key => {
                        const displayName = key.replace('custom_', 'custom regex -');
                        categories.push({
                            key: key,
                            title: displayName,
                            icon: '🎯'
                        });
                        //console.log(`✅ custom regex add display dynamic category DisplayManager(降级): ${displayName} (${key})`);
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
                
                // custom regex results if yes，log display 详细
                if (category.key.startsWith('custom_')) {
                    //console.log(`✅ custom regex display category DisplayManager: ${category.title} (${category.key}) - ${items.length} results item(s)`);
                    //console.log(`🎯 custom regex DisplayManager ${category.key} results 预览:`, items.slice(0, 3));
                }
            }
        });
        
        // results if has 没，hint display
        if (totalCount === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #00d4aa;">
                    <h3>scan complete</h3>
                    <p>page current未found可extracted的information</p>
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        这可能是因为：<br>
                        • content page较少<br>
                        • information已被加密或混淆<br>
                        • pageuse了复杂的动态load<br>
                        • 尝试usedeep scanget更多information
                    </p>
                </div>
            `;
        }
        
        // update information statistics - update when 支持实标识
        const scanMode = this.srcMiner.deepScanRunning ? 'deep scan in' : 'scan 标准';
        const scannedCount = this.srcMiner.scannedUrls ? this.srcMiner.scannedUrls.size : 1;
        const currentDepth = this.srcMiner.currentDepth || 0;
        const maxDepth = this.srcMiner.maxDepth || 2;
        
        // add update when 实指示器
        const realtimeIndicator = this.srcMiner.deepScanRunning ? 
            '<span style="color: #00d4aa; animation: pulse 1s infinite;">●</span> update in when 实' : '';
        
        document.getElementById('stats').innerHTML = `
            <div>总计found <strong>${totalCount}</strong> project item(s) ${realtimeIndicator}</div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.7;">
                scan模式: ${scanMode} | 已scan: ${scannedCount} file item(s)
                ${this.srcMiner.deepScanRunning ? ` | 深度: ${currentDepth}/${maxDepth}` : ''}<br>
                最后更新: ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        // add 脉冲动画样式（if 不存在）
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
        
        // add copy button test and 全部全部
        const headerActions = document.createElement('div');
        headerActions.style.display = 'flex';
        headerActions.style.gap = '5px';
        headerActions.style.alignItems = 'center';
        
        // button on 展/收起
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn toggle-btn';
        toggleBtn.textContent = 'on 展/收起';
        toggleBtn.title = 'content on 展或收起';
        toggleBtn.style.transition = 'all 0.3s';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // button batch 查看
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'btn batch-view-btn';
        batchViewBtn.textContent = 'batch 查看';
        batchViewBtn.title = 'content window all in 在新查看';
        batchViewBtn.style.transition = 'all 0.3s';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // copy button 全部
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn copy-all-btn';
        copyAllBtn.textContent = 'copy 全部';
        copyAllBtn.title = 'copy content 全部';
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
            
            // 🔥 fixed：process object display 正确
            if (typeof item === 'object' && item !== null) {
                // object if yes，get convert as of has 尝试意义属性或JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // type if characters yes 串或其他基本，directly display
                itemDiv.textContent = String(item);
            }
            
            itemDiv.title = 'copy 点击';
            
            // URL add feature display digit(s) 悬停置
            this.addUrlLocationTooltip(itemDiv, item, category.key);
            
            // add feature 右键菜单
            this.addContextMenu(itemDiv, item);
            
            itemDiv.addEventListener('click', () => {
                // 🔥 fixed：copy process object 正确，避免[object Object]
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
    
    // batch display 查看界面
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
            
            // add close button event listen
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        const resultsContainer = document.getElementById('batchViewResults');
        const modalTitle = modal.querySelector('h3');
        
        modalTitle.textContent = title;
        resultsContainer.innerHTML = `<h4>${title} (total ${items.length}  item(s))</h4>`;
        
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
            
            // 🔥 fixed：process object display 正确
            if (typeof item === 'object' && item !== null) {
                // object if yes，get convert as of has 尝试意义属性或JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    itemDiv.textContent = item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    itemDiv.textContent = JSON.stringify(item);
                }
            } else {
                // type if characters yes 串或其他基本，directly display
                itemDiv.textContent = String(item);
            }
            
            itemDiv.style.padding = '8px 10px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            itemDiv.style.wordBreak = 'break-all';
            itemDiv.style.transition = 'all 0.3s';
            itemDiv.style.borderRadius = '4px';
            itemDiv.style.cursor = 'pointer';
            
            // add feature display from 悬停源
            let tooltip = null;
            
            itemDiv.onmouseover = async (e) => {
                itemDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'translateX(3px)';
                
                // display 创建并tooltip
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
                
                // information get project digit(s) 置
                try {
                    const locationInfo = await this.getItemLocationInfo(item);
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #00d4aa; margin-bottom: 4px;">from 源information</div>
                        <div><strong>page:</strong> ${locationInfo.pageTitle}</div>
                        <div><strong>URL:</strong> ${locationInfo.sourceUrl}</div>
                        <div><strong>时间:</strong> ${new Date(locationInfo.extractedAt).toLocaleString('zh-CN')}</div>
                    `;
                } catch (error) {
                    tooltip.innerHTML = `
                        <div style="font-weight: bold; color: #ff6b6b; margin-bottom: 4px;">from 源information</div>
                        <div>getfrom 源informationfailed</div>
                    `;
                }
                
                //  digit(s) 定tooltip
                const rect = itemDiv.getBoundingClientRect();
                tooltip.style.left = (rect.left + 10) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                
                // 确保tooltip不超出屏幕边界
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
            
            // add feature 右键菜单
            itemDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // remove of 已存在菜单
                const existingMenu = document.querySelector('.context-menu');
                if (existingMenu) {
                    existingMenu.remove();
                }

                const menu = this.createContextMenu(item);
                document.body.appendChild(menu);

                //  digit(s) 定菜单
                const rect = menu.getBoundingClientRect();
                let left = e.clientX;
                let top = e.clientY;

                // 确保菜单不超出视窗
                if (left + rect.width > window.innerWidth) {
                    left = window.innerWidth - rect.width - 10;
                }
                if (top + rect.height > window.innerHeight) {
                    top = window.innerHeight - rect.height - 10;
                }

                menu.style.left = left + 'px';
                menu.style.top = top + 'px';

                // close when 点击其他地方菜单
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
    
    // copy all project class in of 分
    copyAllItems(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // 🔥 fixed：copy process object 正确，避免[object Object]
        const processedItems = items.map(item => {
            if (typeof item === 'object' && item !== null) {
                // object if yes，get convert as of has 尝试意义属性或JSON
                if (item.url || item.path || item.value || item.content || item.name) {
                    return item.url || item.path || item.value || item.content || item.name || JSON.stringify(item);
                } else {
                    return JSON.stringify(item);
                }
            } else {
                // type if characters yes 串或其他基本，return directly
                return String(item);
            }
        });
        
        const text = processedItems.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            // success copy hint display
            const categoryDiv = document.querySelector(`.category[data-category-key="${categoryKey}"]`);
            if (categoryDiv) {
                const copyBtn = categoryDiv.querySelector('.copy-all-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ copy 已';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                }
            }
        });
    }
    
    // API all test
    async testAllApis(categoryKey, items) {
        if (!items || items.length === 0) return;
        
        // API testing page to 切换
        const testTab = document.querySelector('.nav-tab[data-page="test"]');
        if (testTab) {
            testTab.click();
        }
        
        // complete waiting page 切换
        setTimeout(() => {
            // select settings class 分器
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect) {
                categorySelect.value = categoryKey;
                
                // update event trigger with change界面
                const changeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(changeEvent);
            }
            
            // feature request call batch test
            if (this.srcMiner.apiTester) {
                // get configuration timeout user of and when 并发数间
                const concurrencyInput = document.getElementById('apiConcurrency');
                const timeoutInput = document.getElementById('apiTimeout');
                const concurrency = concurrencyInput ? parseInt(concurrencyInput.value) : 8;
                const timeout = timeoutInput ? parseInt(timeoutInput.value) * 1000 : 5000;
                
                // directly test class in of 选分
                const method = document.getElementById('requestMethod')?.value || 'GET';

                
                // get base API path configuration
                const baseApiPathInput = document.getElementById('baseApiPath');
                const rawBaseApiPaths = baseApiPathInput ? baseApiPathInput.value.trim() : '';
                const customBaseApiPaths = this.srcMiner.apiTester.normalizeMultipleBaseApiPaths(rawBaseApiPaths);
                
                // ifadd auto了"/"before 缀，hint 给出
                if (rawBaseApiPaths) {
                    const originalPaths = rawBaseApiPaths.split('\n').map(p => p.trim()).filter(p => p);
                    const normalizedPaths = customBaseApiPaths;
                    
                    // path check item(s) no yes 每被修改
                    originalPaths.forEach((originalPath, index) => {
                        const normalizedPath = normalizedPaths[index];
                        if (originalPath && originalPath !== normalizedPath) {
                            //console.log(`🔧 自动为baseapipathadd"/"before 缀: "${originalPath}" -> "${normalizedPath}"`);
                        }
                    });
                    
                    if (customBaseApiPaths.length > 1) {
                        //console.log(`🔧 detected ${customBaseApiPaths.length} path item(s) baseapi: ${customBaseApiPaths.join(', ')}`);
                    }
                }
                
                // API path custom get configuration
                const customApiPathsInput = document.getElementById('customApiPaths');
                const customApiPaths = customApiPathsInput ? customApiPathsInput.value.trim() : '';
                
                // API path custom if has，add test column(s) to in 表
                if (customApiPaths) {
                    const customPaths = this.srcMiner.apiTester.parseCustomApiPaths(customApiPaths);
                    items = this.srcMiner.apiTester.mergeAndDeduplicateItems(items, customPaths);
                    //console.log(`📝 add 了 ${customPaths.length} API path custom item(s)，after 去重总计 ${items.length} test items item(s)`);
                }
                
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout, customBaseApiPaths);

            } else {
                this.showNotification('API testing not initialized 器，execute test 无法', 'error');
            }
        }, 100);
    }
    
    // API testing results display
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
            modalTitle.textContent = 'API testing results';
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
        
        // add results 摘要
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
                <span style="font-weight: 600;">${results.length} API item(s)</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>success:</span>
                <span style="color: #4caf50; font-weight: 600;">${successCount}  item(s)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>failed:</span>
                <span style="color: #f44336; font-weight: 600;">${failCount}  item(s)</span>
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
        
        // add results 详细
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
                        <span style="color: #888;">when 耗:</span> 
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
            
            // add data response（if has）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '10px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = 'data response display';
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
                    // format 尝试化JSON
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
                    dataContent.textContent = 'data response display 无法';
                }
                
                dataToggle.addEventListener('click', () => {
                    if (dataContent.style.display === 'none') {
                        dataContent.style.display = 'block';
                        dataToggle.textContent = 'data response hide';
                    } else {
                        dataContent.style.display = 'none';
                        dataToggle.textContent = 'data response display';
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
    
    // display 通知
    showNotification(message, type = 'info') {
        // element 创建通知
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // settings 样式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontSize = '14px';
        
        // settings type 根据颜色
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
        
        // add page to
        document.body.appendChild(notification);
        
        // 3 seconds remove auto after
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // filter load（if 需要）
    async loadFiltersIfNeeded() {
        try {
            // filter check load no yes 已经
            if (window.domainPhoneFilter && window.apiFilter) {
                //console.log('✅ filter load 已，load re- 无需');
                return;
            }
            
            //console.log('🔄 filter start load display ...');
            
            // check extension in no yes 在环境
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // filter domain load and 手机号
                if (!window.domainPhoneFilter) {
                    await this.loadFilterScript('filters/domain-phone-filter.js');
                    
                    // filter initialize
                    if (typeof DomainPhoneFilter !== 'undefined') {
                        window.domainPhoneFilter = new DomainPhoneFilter();
                        //console.log('✅ initialized successfully filter domain 手机号');
                    }
                }
                
                // API filter load
                if (!window.apiFilter) {
                    await this.loadFilterScript('filters/api-filter.js');
                    //console.log('✅ loaded successfully API filter');
                }
                
                //console.log('🎉 filter complete load all');
            } else {
                console.warn('⚠️ extension 非环境，filter load 无法');
            }
        } catch (error) {
            console.error('❌ failed to load filter:', error);
        }
    }
    
    // filter script load
    async loadFilterScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL(scriptPath);
                
                script.onload = () => {
                    //console.log(`📦 loaded successfully script: ${scriptPath}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ failed to load script: ${scriptPath}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
                
                // settings timeout 保护
                setTimeout(() => {
                    resolve(); // continue execute timeout 即使也
                }, 3000);
            } catch (error) {
                console.warn(`⚠️ failed script load: ${scriptPath}`, error);
                resolve(); // continue execute error occurred when 也
            }
        });
    }
    
    // filter results process 应用
    async applyFiltersToResults(results) {
        // results of 创建深拷贝，data original 避免修改
        const filteredResults = JSON.parse(JSON.stringify(results));
        
        try {
            // filter check available no yes
            if (!window.domainPhoneFilter && !window.apiFilter) {
                //console.log('⚠️ filter load 未，skip filter 步骤');
                return filteredResults;
            }
            
            //console.log('🔍 filter start results optimization 应用...');
            
            // filter domain and 应用手机号
            if (window.domainPhoneFilter) {
                // domain filter
                if (filteredResults.domains && filteredResults.domains.length > 0) {
                    //console.log(`🔍 domain quantity filter before: ${filteredResults.domains.length}`);
                    filteredResults.domains = window.domainPhoneFilter.filterDomains(filteredResults.domains);
                    //console.log(`✅ domain quantity filter after: ${filteredResults.domains.length}`);
                }
                
                // subdomain filter
                if (filteredResults.subdomains && filteredResults.subdomains.length > 0) {
                    //console.log(`🔍 subdomain quantity filter before: ${filteredResults.subdomains.length}`);
                    filteredResults.subdomains = window.domainPhoneFilter.filterDomains(filteredResults.subdomains);
                    //console.log(`✅ subdomain quantity filter after: ${filteredResults.subdomains.length}`);
                }
                
                // filter 邮箱
                if (filteredResults.emails && filteredResults.emails.length > 0) {
                    //console.log(`🔍 quantity filter before 邮箱: ${filteredResults.emails.length}`);
                    filteredResults.emails = window.domainPhoneFilter.filterEmails(filteredResults.emails);
                    //console.log(`✅ quantity filter after 邮箱: ${filteredResults.emails.length}`);
                }
                
                // filter 手机号
                if (filteredResults.phoneNumbers && filteredResults.phoneNumbers.length > 0) {
                    //console.log(`🔍 quantity filter before 手机号: ${filteredResults.phoneNumbers.length}`);
                    filteredResults.phoneNumbers = window.domainPhoneFilter.filterPhones(filteredResults.phoneNumbers, true);
                    //console.log(`✅ quantity filter after 手机号: ${filteredResults.phoneNumbers.length}`);
                }
            }
            
            // API filter 应用
            if (window.apiFilter && typeof window.apiFilter.filterAPIs === 'function') {
                // absolute path API filter
                if (filteredResults.absoluteApis && filteredResults.absoluteApis.length > 0) {
                    //console.log(`🔍 absolute path API quantity filter before: ${filteredResults.absoluteApis.length}`);
                    filteredResults.absoluteApis = window.apiFilter.filterAPIs(filteredResults.absoluteApis, true);
                    //console.log(`✅ absolute path API quantity filter after: ${filteredResults.absoluteApis.length}`);
                }
                
                // relative path API filter
                if (filteredResults.relativeApis && filteredResults.relativeApis.length > 0) {
                    //console.log(`🔍 relative path API quantity filter before: ${filteredResults.relativeApis.length}`);
                    filteredResults.relativeApis = window.apiFilter.filterAPIs(filteredResults.relativeApis, false);
                    //console.log(`✅ relative path API quantity filter after: ${filteredResults.relativeApis.length}`);
                }
            }
            
            //console.log('🎉 complete results filter');
            
        } catch (error) {
            console.error('❌ filter error occurred when 应用:', error);
        }
        
        return filteredResults;
    }

    // URL add hint feature digit(s) 置
    async addUrlLocationTooltip(element, item, category = null) {
        let tooltip = null;
        let hoverTimeout = null;

        element.addEventListener('mouseenter', () => {
            // hint delay display，trigger when 避免快速移动频繁
            hoverTimeout = setTimeout(async () => {
                try {
                    const locationInfo = await this.getItemLocationInfo(category, item);
                    if (locationInfo) {
                        tooltip = this.createTooltip(locationInfo);
                        document.body.appendChild(tooltip);
                        this.positionTooltip(tooltip, element);
                    }
                } catch (error) {
                    console.error('[DisplayManager] failed information get digit(s) 置:', error);
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

    // information get project digit(s) of 置 - call 支持两种方式：getItemLocationInfo(item) 或 getItemLocationInfo(category, item)
    async getItemLocationInfo(categoryOrItem, item = null) {
        try {
            // 🔥 fixed：call 兼容两种方式
            let category = null;
            let actualItem = null;
            
            if (item === null) {
                // parameters call 单：getItemLocationInfo(item)
                actualItem = categoryOrItem;
                category = null; // class 不知道具体分，search all class in 需要在分
            } else {
                // parameters call 双：getItemLocationInfo(category, item)
                category = categoryOrItem;
                actualItem = item;
            }
            
            // 🔥 fixed：data information get directly item(s) from 本身sourceUrl
            if (typeof actualItem === 'object' && actualItem !== null) {
                // information contains if item本身就sourceUrl，use directly
                if (actualItem.sourceUrl && !actualItem.sourceUrl.startsWith('chrome-extension://')) {
                    return {
                        sourceUrl: actualItem.sourceUrl,
                        pageTitle: actualItem.pageTitle || document.title || 'scan results',
                        extractedAt: actualItem.extractedAt || new Date().toISOString()
                    };
                }
            }
            
            // 🔥 fixed：find data from 尝试IndexedDB
            const indexedDBManager = this.srcMiner?.indexedDBManager || window.IndexedDBManager || window.indexedDBManager;
            if (!indexedDBManager) {
                console.warn('[DisplayManager] not initialized IndexedDBManager，return information page current');
                return {
                    sourceUrl: window.location.href.startsWith('chrome-extension://') ? 'scan target page' : window.location.href,
                    pageTitle: document.title || 'scan results',
                    extractedAt: new Date().toISOString()
                };
            }

            try {
                // 🔥 fixed：scan results get all
                const allResults = await indexedDBManager.getAllData('scanResults');
                
                if (allResults && allResults.length > 0) {
                    // find get of 要值
                    const searchValue = typeof actualItem === 'object' && actualItem !== null ? 
                        (actualItem.value || actualItem.text || actualItem.content || JSON.stringify(actualItem)) : 
                        String(actualItem);
                    
                    // scan results find match all item(s) in 在
                    for (const result of allResults.reverse()) { // find start latest from of
                        if (result.results) {
                            // if class 指定了分，find class in 只在该分
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
                                            // format characters 串，scan results information use of 源
                                            itemValue = String(dataItem);
                                            itemSourceUrl = result.sourceUrl;
                                            itemPageTitle = result.pageTitle;
                                            itemExtractedAt = result.extractedAt;
                                        }

                                        // match no yes 比较值
                                        if (itemValue === searchValue) {
                                            // 🔥 fixed：return 确保不chrome-extension URL
                                            const finalSourceUrl = itemSourceUrl && !itemSourceUrl.startsWith('chrome-extension://') ? 
                                                itemSourceUrl : 
                                                (result.sourceUrl && !result.sourceUrl.startsWith('chrome-extension://') ? 
                                                    result.sourceUrl : 
                                                    'scan target page');
                                            
                                            return {
                                                sourceUrl: finalSourceUrl,
                                                pageTitle: itemPageTitle || result.pageTitle || 'scan results',
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
                console.warn('[DisplayManager] failed query IndexedDB:', dbError);
            }
            
            // 🔥 fixed：if to 都没找，return information page current yes 而不chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'scan target page' : currentUrl,
                pageTitle: document.title || 'scan results',
                extractedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('[DisplayManager] information get error occurred digit(s) when 置:', error);
            // 🔥 fixed：return error occurred 即使也不chrome-extension URL
            const currentUrl = window.location.href;
            return {
                sourceUrl: currentUrl.startsWith('chrome-extension://') ? 'data from 源未知' : currentUrl,
                pageTitle: document.title || 'scan results',
                extractedAt: new Date().toISOString()
            };
        }
    }

    // scan results find contains match item(s) in of 在sourceUrl
    findItemWithSourceUrl(item, results) {
        if (!results) return null;
        
        // convert characters line(s) as 将item串进比较
        const itemStr = typeof item === 'object' && item !== null ? 
            (item.text || item.content || item.value || JSON.stringify(item)) : 
            String(item);
        
        // search results all 递归，return contains match item(s) of sourceUrl
        const searchInObject = (obj) => {
            if (Array.isArray(obj)) {
                for (const element of obj) {
                    if (typeof element === 'string') {
                        if (element === itemStr) {
                            // information match characters has 串但没sourceUrl
                            return null;
                        }
                    } else if (typeof element === 'object' && element !== null) {
                        // check object of of 各种可能值字段
                        const elementStr = element.text || element.content || element.value || JSON.stringify(element);
                        if (elementStr === itemStr) {
                            // match item(s) to 找，return contains object of sourceUrl
                            return element;
                        }
                        // search 递归
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

    // scan results check project in no yes 在（method for has 保留原其他地方）
    isItemInResults(item, results) {
        return this.findItemWithSourceUrl(item, results) !== null;
    }

    // hint 创建框
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

        // 🔥 fixed：information all has has 确保都效值，避免显示"未知"
        const pageTitle = locationInfo.pageTitle || document.title || 'page current';
        const sourceUrl = locationInfo.sourceUrl || window.location.href;
        const extractedAt = locationInfo.extractedAt || new Date().toISOString();
        const scanId = locationInfo.scanId || 'current-session';

        // 🔥 fixed：URL display of 截断过长
        const displayUrl = sourceUrl.length > 50 ? sourceUrl.substring(0, 47) + '...' : sourceUrl;
        const displayTitle = pageTitle.length > 30 ? pageTitle.substring(0, 27) + '...' : pageTitle;

        tooltip.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>extractedfrom 源:</strong></div>
            <div style="margin-bottom: 3px;">${displayTitle}</div>
            <div style="margin-bottom: 3px;">${displayUrl}</div>
            <div style="margin-bottom: 3px;">${formatDate(extractedAt)}</div>
        `;

        return tooltip;
    }

    // hint digit(s) 定框 - 🔥 fixed：悬浮在鼠标上方
    positionTooltip(tooltip, element, mouseEvent = null) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let left, top;

        if (mouseEvent) {
            // 🔥 fixed：use digit(s) 鼠标置，display 在鼠标上方
            left = mouseEvent.pageX - tooltipRect.width / 2; // in 水平居于鼠标
            top = mouseEvent.pageY - tooltipRect.height - 15; // display 在鼠标上方，留15px间距
        } else {
            // event if has 没鼠标，element use digit(s) in 心置
            const rect = element.getBoundingClientRect();
            left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
            top = rect.top + scrollY - tooltipRect.height - 15;
        }

        // 🔥 fixed：hint 确保框不超出视口边界
        // 水平方向调整
        if (left + tooltipRect.width > viewportWidth + scrollX) {
            left = viewportWidth + scrollX - tooltipRect.width - 10;
        }
        if (left < scrollX + 10) {
            left = scrollX + 10;
        }

        // 垂直方向调整 - if empty 上方间不够，display 在鼠标下方
        if (top < scrollY + 10) {
            if (mouseEvent) {
                top = mouseEvent.pageY + 15; // display 在鼠标下方
            } else {
                const rect = element.getBoundingClientRect();
                top = rect.bottom + scrollY + 15;
            }
        }

        // 确保不超出底部
        if (top + tooltipRect.height > viewportHeight + scrollY) {
            top = viewportHeight + scrollY - tooltipRect.height - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // add feature 右键菜单
    addContextMenu(element, item) {
        element.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            
            // remove of 已存在菜单
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = this.createContextMenu(item);
            document.body.appendChild(menu);

            //  digit(s) 定菜单
            const rect = menu.getBoundingClientRect();
            let left = e.clientX;
            let top = e.clientY;

            // 确保菜单不超出视窗
            if (left + rect.width > window.innerWidth) {
                left = window.innerWidth - rect.width - 10;
            }
            if (top + rect.height > window.innerHeight) {
                top = window.innerHeight - rect.height - 10;
            }

            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            // close when 点击其他地方菜单
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

    // 创建右键菜单
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
                    // process object type of item，convert characters as 确保正确串
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
                        this.showNotification('copy content to 已剪贴板');
                    });
                }
            },
            {
                text: 'copy extracted digit(s) 置',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        navigator.clipboard.writeText(locationInfo.sourceUrl).then(() => {
                            this.showNotification('URL copy extracted digit(s) to 置已剪贴板');
                        });
                    } else {
                        this.showNotification('URL not found extracted digit(s) 置', 'error');
                    }
                }
            },
            {
                text: 'open page 源',
                icon: '',
                action: async () => {
                    const locationInfo = await this.getItemLocationInfo(item);
                    if (locationInfo && locationInfo.sourceUrl) {
                        window.open(locationInfo.sourceUrl, '_blank');
                    } else {
                        this.showNotification('URL not found page 源', 'error');
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

    // display 通知
    showNotification(message, type = 'success') {
        // remove of 已存在通知
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

        // add 动画样式
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

        // 3 seconds auto dismiss after
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
