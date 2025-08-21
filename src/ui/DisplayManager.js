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
        const categories = [
            { key: 'absoluteApis', title: '🔗 绝对路径API', icon: '/' },
            { key: 'relativeApis', title: '📁 相对路径API', icon: '~' },
            { key: 'modulePaths', title: '📦 模块路径', icon: './' },
            { key: 'domains', title: '🌐 域名', icon: '🌐' },
            { key: 'subdomains', title: '🌍 子域名', icon: 'sub' },
            { key: 'urls', title: '🔗 完整URL', icon: 'http' },
            { key: 'paths', title: '📂 路径', icon: 'path' },
            { key: 'parameters', title: '🔧 参数', icon: 'param' },
            { key: 'ports', title: '🚪 端口', icon: 'port' },
            { key: 'jsFiles', title: '📜 JS文件', icon: '.js' },
            { key: 'cssFiles', title: '🎨 CSS文件', icon: '.css' },
            { key: 'vueFiles', title: '🟢 Vue文件', icon: '.vue' },
            { key: 'images', title: '🖼️ 图片文件', icon: '🖼️' },
            { key: 'audios', title: '🎵 音频文件', icon: '🎵' },
            { key: 'videos', title: '🎬 视频文件', icon: '🎬' },
            { key: 'emails', title: '📧 邮箱地址', icon: '@' },
            { key: 'phoneNumbers', title: '📱 手机号码', icon: '📱' },
            { key: 'ipAddresses', title: '🌍 IP地址', icon: 'IP' },
            { key: 'credentials', title: '🔐 用户凭证', icon: '🔐' },
            { key: 'jwts', title: '🎫 JWT Token', icon: '🎫' },
            { key: 'bearerTokens', title: '🔑 Bearer Token', icon: 'Bearer' },
            { key: 'basicAuth', title: '🔒 Basic Auth', icon: 'Basic' },
            { key: 'authHeaders', title: '🔓 Authorization Header', icon: 'Auth' },
            { key: 'wechatAppIds', title: '💬 微信AppID', icon: 'wx' },
            { key: 'awsKeys', title: '☁️ AWS密钥', icon: 'AWS' },
            { key: 'googleApiKeys', title: '🔍 Google API Key', icon: 'G' },
            { key: 'githubTokens', title: '🐙 GitHub Token', icon: 'GH' },
            { key: 'gitlabTokens', title: '🦊 GitLab Token', icon: 'GL' },
            { key: 'webhookUrls', title: '🔗 Webhook URLs', icon: 'Hook' },
            { key: 'idCards', title: '🆔 身份证号', icon: '🆔' },
            { key: 'cryptoUsage', title: '🔐 加密算法', icon: 'Crypto' },
            { key: 'githubUrls', title: '🐙 GitHub链接', icon: '🐙' },
            { key: 'companies', title: '🏢 公司机构', icon: '🏢' },
            { key: 'cookies', title: '🍪 Cookie信息', icon: '🍪' },
            { key: 'idKeys', title: '🔑 ID密钥', icon: '🔑' },
            { key: 'sensitiveKeywords', title: '⚠️ 敏感关键词', icon: '⚠️' },
            { key: 'comments', title: '💬 代码注释', icon: '<!--' }
        ];
        
        // 尝试加载过滤器
        await this.loadFiltersIfNeeded();
        
        // 应用过滤器处理结果
        const filteredResults = await this.applyFiltersToResults(this.srcMiner.results);
        
        resultsDiv.innerHTML = '';
        let totalCount = 0;
        
        categories.forEach(category => {
            const items = filteredResults[category.key] || [];
            totalCount += items.length;
            
            if (items.length > 0) {
                const categoryDiv = this.createCategoryDiv(category, items);
                resultsDiv.appendChild(categoryDiv);
            }
        });
        
        // 如果没有结果，显示提示
        if (totalCount === 0) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #00d4aa;">
                    <h3>🔍 扫描完成</h3>
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
        const scanMode = this.srcMiner.deepScanRunning ? '🔄 深度扫描中' : '✅ 标准扫描';
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
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = '展开/收起';
        toggleBtn.title = '展开或收起内容';
        toggleBtn.style.padding = '2px 5px';
        toggleBtn.style.fontSize = '11px';
        toggleBtn.style.background = 'rgba(0, 212, 170, 0.2)';
        toggleBtn.style.border = '1px solid #00d4aa';
        toggleBtn.style.borderRadius = '4px';
        toggleBtn.style.color = '#00d4aa';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.marginRight = '5px';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        });
        headerActions.appendChild(toggleBtn);
        
        // 批量查看按钮
        const batchViewBtn = document.createElement('button');
        batchViewBtn.className = 'batch-view-btn';
        batchViewBtn.textContent = '批量查看';
        batchViewBtn.title = '在新窗口中查看所有内容';
        batchViewBtn.style.padding = '2px 5px';
        batchViewBtn.style.fontSize = '11px';
        batchViewBtn.style.background = 'rgba(0, 212, 170, 0.2)';
        batchViewBtn.style.border = '1px solid #00d4aa';
        batchViewBtn.style.borderRadius = '4px';
        batchViewBtn.style.color = '#00d4aa';
        batchViewBtn.style.cursor = 'pointer';
        batchViewBtn.style.marginRight = '5px';
        batchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchViewOnly(category.title, items);
        });
        headerActions.appendChild(batchViewBtn);
        
        // 复制全部按钮
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'copy-all-btn';
        copyAllBtn.textContent = '复制全部';
        copyAllBtn.title = '复制全部内容';
        copyAllBtn.style.padding = '2px 5px';
        copyAllBtn.style.fontSize = '11px';
        copyAllBtn.style.background = 'rgba(0, 212, 170, 0.2)';
        copyAllBtn.style.border = '1px solid #00d4aa';
        copyAllBtn.style.borderRadius = '4px';
        copyAllBtn.style.color = '#00d4aa';
        copyAllBtn.style.cursor = 'pointer';
        copyAllBtn.style.marginRight = '5px';
        copyAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyAllItems(category.key, items);
        });
        headerActions.appendChild(copyAllBtn);
        
        // 测试全部按钮 (仅对API路径显示)
        if (category.key === 'absoluteApis' || category.key === 'relativeApis') {
            const testAllBtn = document.createElement('button');
            testAllBtn.className = 'test-all-btn';
            testAllBtn.textContent = '测试全部';
            testAllBtn.title = '测试全部API';
            testAllBtn.style.padding = '2px 5px';
            testAllBtn.style.fontSize = '11px';
            testAllBtn.style.background = 'rgba(0, 212, 170, 0.2)';
            testAllBtn.style.border = '1px solid #00d4aa';
            testAllBtn.style.borderRadius = '4px';
            testAllBtn.style.color = '#00d4aa';
            testAllBtn.style.cursor = 'pointer';
            testAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.testAllApis(category.key, items);
            });
            headerActions.appendChild(testAllBtn);
        }
        
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
            modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = '#1e1e1e';
            modalContent.style.margin = '15% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #333';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.borderRadius = '5px';
            
            const modalHeader = document.createElement('div');
            modalHeader.style.display = 'flex';
            modalHeader.style.justifyContent = 'space-between';
            modalHeader.style.alignItems = 'center';
            modalHeader.style.marginBottom = '10px';
            
            const modalTitle = document.createElement('h3');
            modalTitle.style.margin = '0';
            modalTitle.style.color = '#00d4aa';
            
            const closeBtn = document.createElement('button');
            closeBtn.id = 'closeBatchViewBtn';
            closeBtn.textContent = '×';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#ccc';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.cursor = 'pointer';
            
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
        list.style.border = '1px solid #333';
        list.style.borderRadius = '4px';
        list.style.marginTop = '10px';
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'result-item';
            itemDiv.textContent = item;
            itemDiv.style.padding = '5px';
            itemDiv.style.borderBottom = '1px solid #333';
            itemDiv.style.wordBreak = 'break-all';
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
                this.srcMiner.apiTester.testSelectedCategory(categoryKey, items, method, concurrency, timeout);
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
            modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = '#1e1e1e';
            modalContent.style.margin = '5% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #333';
            modalContent.style.width = '90%';
            modalContent.style.maxWidth = '800px';
            modalContent.style.borderRadius = '5px';
            modalContent.style.maxHeight = '80vh';
            modalContent.style.overflowY = 'auto';
            
            const modalHeader = document.createElement('div');
            modalHeader.style.display = 'flex';
            modalHeader.style.justifyContent = 'space-between';
            modalHeader.style.alignItems = 'center';
            modalHeader.style.marginBottom = '10px';
            
            const modalTitle = document.createElement('h3');
            modalTitle.textContent = 'API测试结果';
            modalTitle.style.margin = '0';
            modalTitle.style.color = '#00d4aa';
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = '#ccc';
            closeBtn.style.fontSize = '20px';
            closeBtn.style.cursor = 'pointer';
            
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
        summary.style.marginBottom = '15px';
        summary.style.padding = '10px';
        summary.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
        summary.style.borderRadius = '4px';
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        summary.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">测试摘要:</div>
            <div>总计: ${results.length} 个API</div>
            <div style="color: #4caf50;">成功: ${successCount} 个</div>
            <div style="color: #f44336;">失败: ${failCount} 个</div>
        `;
        
        resultsContainer.appendChild(summary);
        
        // 添加详细结果
        const detailsContainer = document.createElement('div');
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.style.marginBottom = '10px';
            resultItem.style.padding = '10px';
            resultItem.style.border = '1px solid #333';
            resultItem.style.borderRadius = '4px';
            resultItem.style.backgroundColor = result.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
            
            const statusColor = result.success ? '#4caf50' : '#f44336';
            const statusText = result.success ? '成功' : '失败';
            const statusCode = result.status || 'N/A';
            
            resultItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <div style="font-weight: bold;">${index + 1}. ${result.url}</div>
                    <div style="color: ${statusColor};">${statusText} (${statusCode})</div>
                </div>
                <div style="margin-bottom: 5px;">
                    <span style="color: #888;">方法:</span> ${result.method}
                </div>
                <div style="margin-bottom: 5px;">
                    <span style="color: #888;">耗时:</span> ${result.time}ms
                </div>
            `;
            
            // 添加响应数据（如果有）
            if (result.data) {
                const dataContainer = document.createElement('div');
                dataContainer.style.marginTop = '5px';
                
                const dataToggle = document.createElement('button');
                dataToggle.textContent = '显示响应数据';
                dataToggle.style.background = 'rgba(0, 212, 170, 0.2)';
                dataToggle.style.border = '1px solid #00d4aa';
                dataToggle.style.borderRadius = '4px';
                dataToggle.style.padding = '2px 5px';
                dataToggle.style.fontSize = '11px';
                dataToggle.style.color = '#00d4aa';
                dataToggle.style.cursor = 'pointer';
                dataToggle.style.marginBottom = '5px';
                
                const dataContent = document.createElement('pre');
                dataContent.style.display = 'none';
                dataContent.style.maxHeight = '200px';
                dataContent.style.overflowY = 'auto';
                dataContent.style.padding = '5px';
                dataContent.style.backgroundColor = '#2a2a2a';
                dataContent.style.borderRadius = '4px';
                dataContent.style.fontSize = '12px';
                dataContent.style.whiteSpace = 'pre-wrap';
                dataContent.style.wordBreak = 'break-all';
                
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
