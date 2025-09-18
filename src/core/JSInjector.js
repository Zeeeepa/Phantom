// JS注入功能模块
class JSInjector {
    constructor() {
        this.savedScripts = [];
    }

    // 初始化JS注入页面
    init() {
        //console.log('JSInjector init called');
        // 初始化预设脚本（如果尚未初始化）
        if (typeof JSHookPresets !== 'undefined' && JSHookPresets.initializePresets) {
            JSHookPresets.initializePresets().then(() => {
                this.loadSavedScripts();
            }).catch(error => {
                console.error('预设脚本初始化失败:', error);
                this.loadSavedScripts();
            });
        } else {
            this.loadSavedScripts();
        }
        this.initEvents();
    }

    // 初始化事件监听
    initEvents() {
        //console.log('JSInjector initEvents called');
        // 添加脚本按钮
        const addScriptBtn = document.getElementById('addScriptBtn');
        //console.log('addScriptBtn element:', addScriptBtn);
        if (addScriptBtn) {
            //console.log('Adding click listener to addScriptBtn');
            addScriptBtn.addEventListener('click', () => {
                //console.log('addScriptBtn clicked!');
                this.showAddScriptModal();
            });
        } else {
            console.error('addScriptBtn element not found!');
        }

        // 模态框相关事件
        const modal = document.getElementById('addScriptModal');
        const closeBtn = modal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancelAddScriptBtn');
        const saveBtn = document.getElementById('saveScriptBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideAddScriptModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideAddScriptModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveNewScript());
        }

        // 点击模态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddScriptModal();
                }
            });
        }

        // 绑定脚本按钮事件
        this.bindScriptEvents();

        // 脚本描述展开按钮事件

        
        // 脚本详情相关事件
        window.openScriptDetails = (scriptName, description) => {
            const index = this.savedScripts.findIndex(s => s.name === scriptName);
            if (index !== -1) {
                this.showScriptDetail(index);
            }
        };

        // 模态框关闭事件
        const scriptDetailModal = document.getElementById('scriptDetailModal');
        if (scriptDetailModal) {
            const closeBtn = scriptDetailModal.querySelector('.close');
            const closeDetailBtn = document.getElementById('closeDetailBtn');
            const copyDescBtn = document.getElementById('copyDescBtn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeScriptDetailModal());
            }
            if (closeDetailBtn) {
                closeDetailBtn.addEventListener('click', () => this.closeScriptDetailModal());
            }
            if (copyDescBtn) {
                copyDescBtn.addEventListener('click', () => this.copyScriptDescription());
            }

            // 点击模态框外部关闭
            scriptDetailModal.addEventListener('click', (e) => {
                if (e.target === scriptDetailModal) {
                    this.closeScriptDetailModal();
                }
            });
        }
    }

    // 显示添加脚本模态框
    showAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'block';
            // 清空输入框
            document.getElementById('scriptNameInput').value = '';
            document.getElementById('scriptCodeInput').value = '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = '';
        }
    }

    // 隐藏添加脚本模态框
    hideAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 保存新脚本
    async saveNewScript() {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请输入脚本名称和代码内容');
            return;
        }

        const script = {
            id: Date.now(), // 使用时间戳作为唯一ID
            name: nameInput.value.trim(),
            content: codeInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            size: new Blob([codeInput.value]).size,
            createdAt: new Date().toLocaleString()
        };

        try {
            // 从IndexedDB加载现有脚本
            const savedScripts = await window.IndexedDBManager.loadJSScripts();
            savedScripts.push(script);
            
            // 保存到IndexedDB
            await window.IndexedDBManager.saveJSScripts(savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts();
            alert('脚本保存成功');
            
            // 清空输入框
            nameInput.value = '';
            codeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        } catch (error) {
            console.error('❌ 保存脚本失败:', error);
            alert('脚本保存失败: ' + error.message);
        }
    }

    // 加载已保存的脚本
    async loadSavedScripts() {
        try {
            //console.log('[JSInjector] 开始加载脚本...');
            
            // 检查IndexedDBManager是否可用
            if (!window.IndexedDBManager) {
                console.error('[JSInjector] IndexedDBManager未找到');
                this.savedScripts = [];
                this.displaySavedScripts();
                return;
            }
            
            // 从IndexedDB加载所有脚本（包括预设脚本）
            this.savedScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSInjector] 加载到的脚本数量:', this.savedScripts.length);
            //console.log('[JSInjector] 脚本列表:', this.savedScripts.map(s => ({ name: s.name, isPreset: s.isPreset })));
            
            this.displaySavedScripts();
        } catch (error) {
            console.error('❌ 加载脚本失败:', error);
            this.savedScripts = [];
            this.displaySavedScripts();
        }
    }

    // 显示已保存的脚本
    displaySavedScripts() {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        // 清空现有内容
        container.innerHTML = '';

        if (this.savedScripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-style: normal;">暂无保存的脚本，点击下方"添加脚本"按钮开始创建</p>
                </div>
            `;
            return;
        }

        // 使用header-input-group样式显示脚本
        this.savedScripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = 'header-input-group script-item';
            scriptItem.style.justifyContent = 'space-between';
            scriptItem.style.cursor = 'pointer';
            
            const description = script.description || '无描述';
            const truncatedDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
            
            // 创建脚本信息区域
            const scriptInfoDiv = document.createElement('div');
            scriptInfoDiv.style.cssText = 'flex: 1; max-width: 200px; cursor: pointer;';
            scriptInfoDiv.addEventListener('click', () => {
                this.showScriptDetail(index);
            });
            
            scriptInfoDiv.innerHTML = `
                <div style="color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${script.name}</div>
                <div class="script-desc-preview" style="color: #aaa; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${description}">${truncatedDesc}</div>
            `;
            
            // 创建按钮区域
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px; flex-shrink: 0;';
            // 所有脚本都显示完整的操作按钮
            buttonsDiv.innerHTML = `
                ${script.isPreset ? '<span style="color: #4CAF50; font-size: 12px; padding: 4px 8px; background: rgba(76, 175, 80, 0.1); border-radius: 3px; margin-right: 5px;">预设</span>' : ''}
                <button class="inject-btn" data-index="${index}" data-action="inject" onclick="event.stopPropagation()">注入</button>
                <button class="modify-btn" data-index="${index}" data-action="modify" onclick="event.stopPropagation()">修改</button>
                <button class="delete-btn" data-index="${index}" data-action="delete" onclick="event.stopPropagation()">删除</button>
            `;
            
            scriptItem.appendChild(scriptInfoDiv);
            scriptItem.appendChild(buttonsDiv);
            container.appendChild(scriptItem);
        });
    }

    // 绑定脚本按钮事件
    bindScriptEvents() {
        const container = document.getElementById('scriptsContainer');
        if (container) {
            container.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.dataset.action;
                    const index = parseInt(button.dataset.index);
                    
                    switch (action) {
                        case 'inject':
                            this.injectScript(index);
                            break;
                        case 'modify':
                            this.modifyScript(index);
                            break;
                        case 'delete':
                            this.deleteScript(index);
                            break;
                    }
                }
            });
        }
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // 注入脚本
    injectScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            const scriptContent = script.content || script.code || '';
            this.executeScriptContent(scriptContent);
        }
    }

    // 修改脚本
    modifyScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            
            // 显示编辑模态框
            this.showAddScriptModal();
            
            // 填充现有数据
            document.getElementById('scriptNameInput').value = script.name;
            document.getElementById('scriptCodeInput').value = script.content || script.code || '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = script.description || '';
            
            // 修改保存按钮行为为更新
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = '更新脚本';
            
            // 移除原有事件监听器并添加新的
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('saveScriptBtn');
            newSaveBtn.addEventListener('click', () => this.updateScript(index));
        }
    }

    // 更新脚本
    async updateScript(index) {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请输入脚本名称和代码内容');
            return;
        }

        try {
            // 更新脚本数据
            this.savedScripts[index] = {
                ...this.savedScripts[index],
                name: nameInput.value.trim(),
                content: codeInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                size: new Blob([codeInput.value]).size,
                updatedAt: new Date().toLocaleString()
            };

            // 保存到IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts(); // 重新加载而不是直接显示
            alert('脚本更新成功');
            
            // 恢复保存按钮
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = '保存脚本';
            saveBtn.onclick = () => this.saveNewScript();
        } catch (error) {
            console.error('❌ 更新脚本失败:', error);
            alert('脚本更新失败: ' + error.message);
        }
    }

    // 删除脚本
    async deleteScript(index) {
        if (!confirm('确定要删除这个脚本吗？')) {
            return;
        }

        try {
            // 从数组中删除脚本
            this.savedScripts.splice(index, 1);

            // 保存到IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.loadSavedScripts();
            alert('脚本删除成功');
        } catch (error) {
            console.error('❌ 删除脚本失败:', error);
            alert('脚本删除失败: ' + error.message);
        }
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        // 简单的alert提示，后续可以改为更美观的提示
        alert(message);
    }



    // 显示脚本详情模态框
    showScriptDetail(index) {
        // console.log('showScriptDetail called with index:', index);
        if (!this.savedScripts[index]) {
            // console.log('Script not found at index:', index);
            return;
        }
        
        const script = this.savedScripts[index];
        // console.log('Script found:', script);
        
        const modal = document.getElementById('scriptDetailModal');
        const nameElement = document.getElementById('scriptDetailName');
        const descElement = document.getElementById('scriptDetailDesc');
        const createdElement = document.getElementById('scriptDetailCreated');
        const updatedElement = document.getElementById('scriptDetailUpdated');
        const updatedGroup = document.getElementById('scriptDetailUpdatedGroup');
        
        // console.log('Modal elements:', { modal, nameElement, descElement, createdElement, updatedElement });
        
        if (modal && nameElement && descElement) {
            nameElement.textContent = script.name;
            descElement.textContent = script.description || '无描述';
            
            // 显示创建时间
            if (createdElement && script.created) {
                createdElement.textContent = new Date(script.created).toLocaleString('zh-CN');
            }
            
            // 显示更新时间（如果有）
            if (updatedElement && updatedGroup && script.updated) {
                updatedElement.textContent = new Date(script.updated).toLocaleString('zh-CN');
                updatedGroup.style.display = 'block';
            } else if (updatedGroup) {
                updatedGroup.style.display = 'none';
            }
            
            modal.style.display = 'block';
            
            // 存储当前脚本描述用于复制
            this.currentScriptDescription = script.description || '';
            // console.log('Modal should be visible now');
        } else {
            // console.error('Modal elements not found');
        }
    }

    // 关闭脚本详情模态框
    closeScriptDetailModal() {
        const modal = document.getElementById('scriptDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 复制脚本描述
    copyScriptDescription() {
        if (this.currentScriptDescription) {
            navigator.clipboard.writeText(this.currentScriptDescription).then(() => {
                alert('描述已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动选择文本复制');
            });
        } else {
            alert('无描述内容可复制');
        }
    }



    // 执行脚本内容 - 使用chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 开始执行JS脚本 (world: MAIN)...');
            
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法获取当前标签页');
                return;
            }

            // 记录执行的脚本内容（用于调试）
            console.log('✅ 准备执行用户代码，长度:', scriptContent.length);

            // 使用 world: 'MAIN' 在主世界执行脚本，绕过CSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关键：在主世界执行，不受页面CSP限制
                args: [scriptContent],
                func: (code) => {
                    try {
                        // 直接 eval 即可，CSP 不会拦截扩展注入
                        eval(code);
                        return { success: true, message: '脚本执行成功' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS脚本执行成功');
                alert('脚本执行成功 (world: MAIN)');
            } else {
                console.error('❌ JS脚本执行失败:', result?.error);
                alert('脚本执行失败: ' + (result?.error || '未知错误'));
            }

        } catch (error) {
            console.error('❌ 脚本注入失败:', error);
            alert('脚本注入失败: ' + error.message);
        }
    }
}