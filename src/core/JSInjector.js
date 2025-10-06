// JSinjection功能mod块
class JSInjector {
    constructor() {
        this.savedScripts = [];
    }

    // initializeJSinjectionpage面
    init() {
        //console.log('JSInjector init called');
        // initialize预设脚本（if尚未initialize）
        if (typeof JSHookPresets !== 'undefined' && JSHookPresets.initializePresets) {
            JSHookPresets.initializePresets().then(() => {
                this.loadSavedScripts();
            }).catch(error => {
                console.error('预设脚本initializefailed:', error);
                this.loadSavedScripts();
            });
        } else {
            this.loadSavedScripts();
        }
        this.initEvents();
    }

    // initializeeventlisten
    initEvents() {
        //console.log('JSInjector initEvents called');
        // add脚本button
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

        // mod态框相关event
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

        // clickmod态框外部关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddScriptModal();
                }
            });
        }

        // 绑定脚本buttonevent
        this.bindScriptEvents();

        // 脚本描述展开buttonevent

        
        // 脚本详情相关event
        window.openScriptDetails = (scriptName, description) => {
            const index = this.savedScripts.findIndex(s => s.name === scriptName);
            if (index !== -1) {
                this.showScriptDetail(index);
            }
        };

        // mod态框关闭event
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

            // clickmod态框外部关闭
            scriptDetailModal.addEventListener('click', (e) => {
                if (e.target === scriptDetailModal) {
                    this.closeScriptDetailModal();
                }
            });
        }
    }

    // 显示add脚本mod态框
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

    // 隐藏add脚本mod态框
    hideAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 保存new脚本
    async saveNewScript() {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请输入脚本名称andcode内容');
            return;
        }

        const script = {
            id: Date.now(), // use时间戳作为唯一ID
            name: nameInput.value.trim(),
            content: codeInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            size: new Blob([codeInput.value]).size,
            createdAt: new Date().toLocaleString()
        };

        try {
            // fromIndexedDBload现有脚本
            const savedScripts = await window.IndexedDBManager.loadJSScripts();
            savedScripts.push(script);
            
            // 保存toIndexedDB
            await window.IndexedDBManager.saveJSScripts(savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts();
            alert('脚本保存success');
            
            // 清空输入框
            nameInput.value = '';
            codeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        } catch (error) {
            console.error('❌ 保存脚本failed:', error);
            alert('脚本保存failed: ' + error.message);
        }
    }

    // loadalready保存脚本
    async loadSavedScripts() {
        try {
            //console.log('[JSInjector] startload脚本...');
            
            // checkIndexedDBManager是否可for
            if (!window.IndexedDBManager) {
                console.error('[JSInjector] IndexedDBManager未found');
                this.savedScripts = [];
                this.displaySavedScripts();
                return;
            }
            
            // fromIndexedDBloadall脚本（including预设脚本）
            this.savedScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSInjector] loadto脚本数量:', this.savedScripts.length);
            //console.log('[JSInjector] 脚本列表:', this.savedScripts.map(s => ({ name: s.name, isPreset: s.isPreset })));
            
            this.displaySavedScripts();
        } catch (error) {
            console.error('❌ load脚本failed:', error);
            this.savedScripts = [];
            this.displaySavedScripts();
        }
    }

    // 显示already保存脚本
    displaySavedScripts() {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        // 清空现有内容
        container.innerHTML = '';

        if (this.savedScripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-style: normal;">暂无保存的脚本，点击下方"add脚本"按钮开始创建</p>
                </div>
            `;
            return;
        }

        // useheader-input-group样式显示脚本
        this.savedScripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = 'header-input-group script-item';
            scriptItem.style.justifyContent = 'space-between';
            scriptItem.style.cursor = 'pointer';
            
            const description = script.description || '无描述';
            const truncatedDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
            
            // create脚本information区域
            const scriptInfoDiv = document.createElement('div');
            scriptInfoDiv.style.cssText = 'flex: 1; max-width: 200px; cursor: pointer;';
            scriptInfoDiv.addEventListener('click', () => {
                this.showScriptDetail(index);
            });
            
            scriptInfoDiv.innerHTML = `
                <div style="color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${script.name}</div>
                <div class="script-desc-preview" style="color: #aaa; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${description}">${truncatedDesc}</div>
            `;
            
            // createbutton区域
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px; flex-shrink: 0;';
            // all脚本都显示complete操作button
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

    // 绑定脚本buttonevent
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

    // format化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // injection脚本
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
            
            // 显示编辑mod态框
            this.showAddScriptModal();
            
            // 填充现有data
            document.getElementById('scriptNameInput').value = script.name;
            document.getElementById('scriptCodeInput').value = script.content || script.code || '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = script.description || '';
            
            // 修改保存button行为为更new
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = '更new脚本';
            
            // 移除原有eventlistenerandaddnew
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('saveScriptBtn');
            newSaveBtn.addEventListener('click', () => this.updateScript(index));
        }
    }

    // 更new脚本
    async updateScript(index) {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请输入脚本名称andcode内容');
            return;
        }

        try {
            // 更new脚本data
            this.savedScripts[index] = {
                ...this.savedScripts[index],
                name: nameInput.value.trim(),
                content: codeInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                size: new Blob([codeInput.value]).size,
                updatedAt: new Date().toLocaleString()
            };

            // 保存toIndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts(); // 重newload而not是directly显示
            alert('脚本更newsuccess');
            
            // 恢复保存button
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = '保存脚本';
            saveBtn.onclick = () => this.saveNewScript();
        } catch (error) {
            console.error('❌ 更new脚本failed:', error);
            alert('脚本更newfailed: ' + error.message);
        }
    }

    // 删除脚本
    async deleteScript(index) {
        if (!confirm('确定要删除这个脚本吗？')) {
            return;
        }

        try {
            // from数组in删除脚本
            this.savedScripts.splice(index, 1);

            // 保存toIndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.loadSavedScripts();
            alert('脚本删除success');
        } catch (error) {
            console.error('❌ 删除脚本failed:', error);
            alert('脚本删除failed: ' + error.message);
        }
    }

    // 显示message提示
    showMessage(message, type = 'info') {
        // 简单alert提示，后续可以改为更美观提示
        alert(message);
    }



    // 显示脚本详情mod态框
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
            
            // 显示create时间
            if (createdElement && script.created) {
                createdElement.textContent = new Date(script.created).toLocaleString('zh-CN');
            }
            
            // 显示更new时间（if有）
            if (updatedElement && updatedGroup && script.updated) {
                updatedElement.textContent = new Date(script.updated).toLocaleString('zh-CN');
                updatedGroup.style.display = 'block';
            } else if (updatedGroup) {
                updatedGroup.style.display = 'none';
            }
            
            modal.style.display = 'block';
            
            // storage当before脚本描述for复制
            this.currentScriptDescription = script.description || '';
            // console.log('Modal should be visible now');
        } else {
            // console.error('Modal elements not found');
        }
    }

    // 关闭脚本详情mod态框
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
                alert('描述already复制to剪贴板');
            }).catch(err => {
                console.error('复制failed:', err);
                alert('复制failed，请手动选择文本复制');
            });
        } else {
            alert('无描述内容可复制');
        }
    }



    // execute脚本内容 - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 startexecuteJS脚本 (world: MAIN)...');
            
            // get当before活动标签page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法get当before标签page');
                return;
            }

            // recordexecute脚本内容（for调试）
            console.log('✅ 准备executeusercode，长度:', scriptContent.length);

            // use world: 'MAIN' in主世界execute脚本，绕throughCSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关键：in主世界execute，not受page面CSP限制
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP not会拦截扩展injection
                        eval(code);
                        return { success: true, message: '脚本executesuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS脚本executesuccess');
                alert('脚本executesuccess (world: MAIN)');
            } else {
                console.error('❌ JS脚本executefailed:', result?.error);
                alert('脚本executefailed: ' + (result?.error || '未知错误'));
            }

        } catch (error) {
            console.error('❌ 脚本injectionfailed:', error);
            alert('脚本injectionfailed: ' + error.message);
        }
    }
}