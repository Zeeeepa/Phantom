// JS注入功能模块
class JSInjector {
    constructor() {
        this.savedScripts = [];
    }

    // InitializeJS注入Page
    init() {
        //console.log('JSInjector init called');
        // InitializePresetScript（如果尚NotInitialize）
        if (typeof JSHookPresets !== 'undefined' && JSHookPresets.initializePresets) {
            JSHookPresets.initializePresets().then(() => {
                this.loadSavedScripts();
            }).catch(error => {
                console.error('PresetScriptInitializeFailed:', error);
                this.loadSavedScripts();
            });
        } else {
            this.loadSavedScripts();
        }
        this.initEvents();
    }

    // Initialize事件Listen
    initEvents() {
        //console.log('JSInjector initEvents called');
        // AddScript按钮
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

        // 模态框Related事件
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

        // Click模态框外部Close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddScriptModal();
                }
            });
        }

        // 绑定Script按钮事件
        this.bindScriptEvents();

        // Script描述展开按钮事件

        
        // Script详情Related事件
        window.openScriptDetails = (scriptName, description) => {
            const index = this.savedScripts.findIndex(s => s.name === scriptName);
            if (index !== -1) {
                this.showScriptDetail(index);
            }
        };

        // 模态框Close事件
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

            // Click模态框外部Close
            scriptDetailModal.addEventListener('click', (e) => {
                if (e.target === scriptDetailModal) {
                    this.closeScriptDetailModal();
                }
            });
        }
    }

    // DisplayAddScript模态框
    showAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'block';
            // ClearInput框
            document.getElementById('scriptNameInput').value = '';
            document.getElementById('scriptCodeInput').value = '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = '';
        }
    }

    // 隐藏AddScript模态框
    hideAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Save新Script
    async saveNewScript() {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请InputScript名称And代码Content');
            return;
        }

        const script = {
            id: Date.now(), // 使用Time戳作为唯一ID
            name: nameInput.value.trim(),
            content: codeInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            size: new Blob([codeInput.value]).size,
            createdAt: new Date().toLocaleString()
        };

        try {
            // Load from IndexedDB现有Script
            const savedScripts = await window.IndexedDBManager.loadJSScripts();
            savedScripts.push(script);
            
            // Save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts();
            alert('ScriptSaveSuccess');
            
            // ClearInput框
            nameInput.value = '';
            codeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        } catch (error) {
            console.error('❌ SaveScriptFailed:', error);
            alert('ScriptSaveFailed: ' + error.message);
        }
    }

    // LoadSaved的Script
    async loadSavedScripts() {
        try {
            //console.log('[JSInjector] StartLoadScript...');
            
            // CheckIndexedDBManager是否Available
            if (!window.IndexedDBManager) {
                console.error('[JSInjector] IndexedDBManagerNot found');
                this.savedScripts = [];
                this.displaySavedScripts();
                return;
            }
            
            // Load from IndexedDB所有Script（包括PresetScript）
            this.savedScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSInjector] Load到的Script数量:', this.savedScripts.length);
            //console.log('[JSInjector] Script列Table:', this.savedScripts.map(s => ({ name: s.name, isPreset: s.isPreset })));
            
            this.displaySavedScripts();
        } catch (error) {
            console.error('❌ LoadScriptFailed:', error);
            this.savedScripts = [];
            this.displaySavedScripts();
        }
    }

    // DisplaySaved的Script
    displaySavedScripts() {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        // Clear现有Content
        container.innerHTML = '';

        if (this.savedScripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-style: normal;">暂NoneSave的Script，Click下方"AddScript"按钮StartCreate</p>
                </div>
            `;
            return;
        }

        // 使用header-input-group样式DisplayScript
        this.savedScripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = 'header-input-group script-item';
            scriptItem.style.justifyContent = 'space-between';
            scriptItem.style.cursor = 'pointer';
            
            const description = script.description || 'None描述';
            const truncatedDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
            
            // CreateScriptInformation区域
            const scriptInfoDiv = document.createElement('div');
            scriptInfoDiv.style.cssText = 'flex: 1; max-width: 200px; cursor: pointer;';
            scriptInfoDiv.addEventListener('click', () => {
                this.showScriptDetail(index);
            });
            
            scriptInfoDiv.innerHTML = `
                <div style="color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${script.name}</div>
                <div class="script-desc-preview" style="color: #aaa; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${description}">${truncatedDesc}</div>
            `;
            
            // Create按钮区域
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px; flex-shrink: 0;';
            // 所有Script都DisplayComplete的操作按钮
            buttonsDiv.innerHTML = `
                ${script.isPreset ? '<span style="color: #4CAF50; font-size: 12px; padding: 4px 8px; background: rgba(76, 175, 80, 0.1); border-radius: 3px; margin-right: 5px;">Preset</span>' : ''}
                <button class="inject-btn" data-index="${index}" data-action="inject" onclick="event.stopPropagation()">注入</button>
                <button class="modify-btn" data-index="${index}" data-action="modify" onclick="event.stopPropagation()">修改</button>
                <button class="delete-btn" data-index="${index}" data-action="delete" onclick="event.stopPropagation()">Delete</button>
            `;
            
            scriptItem.appendChild(scriptInfoDiv);
            scriptItem.appendChild(buttonsDiv);
            container.appendChild(scriptItem);
        });
    }

    // 绑定Script按钮事件
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

    // FormatFile大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // 注入Script
    injectScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            const scriptContent = script.content || script.code || '';
            this.executeScriptContent(scriptContent);
        }
    }

    // 修改Script
    modifyScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            
            // DisplayEdit模态框
            this.showAddScriptModal();
            
            // 填充现有Data
            document.getElementById('scriptNameInput').value = script.name;
            document.getElementById('scriptCodeInput').value = script.content || script.code || '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = script.description || '';
            
            // 修改Save按钮行为为Update
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'UpdateScript';
            
            // Remove原有事件Listen器AndAdd新的
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('saveScriptBtn');
            newSaveBtn.addEventListener('click', () => this.updateScript(index));
        }
    }

    // UpdateScript
    async updateScript(index) {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请InputScript名称And代码Content');
            return;
        }

        try {
            // UpdateScriptData
            this.savedScripts[index] = {
                ...this.savedScripts[index],
                name: nameInput.value.trim(),
                content: codeInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                size: new Blob([codeInput.value]).size,
                updatedAt: new Date().toLocaleString()
            };

            // Save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts(); // Reload而不是DirectDisplay
            alert('ScriptUpdateSuccess');
            
            // 恢复Save按钮
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'SaveScript';
            saveBtn.onclick = () => this.saveNewScript();
        } catch (error) {
            console.error('❌ UpdateScriptFailed:', error);
            alert('ScriptUpdateFailed: ' + error.message);
        }
    }

    // DeleteScript
    async deleteScript(index) {
        if (!confirm('Confirm要DeleteThisScript吗？')) {
            return;
        }

        try {
            // from数Group中DeleteScript
            this.savedScripts.splice(index, 1);

            // Save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.loadSavedScripts();
            alert('ScriptDeleteSuccess');
        } catch (error) {
            console.error('❌ DeleteScriptFailed:', error);
            alert('ScriptDeleteFailed: ' + error.message);
        }
    }

    // Display消息Prompt
    showMessage(message, type = 'info') {
        // 简单的alertPrompt，After续Can改为更美观的Prompt
        alert(message);
    }



    // DisplayScript详情模态框
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
            descElement.textContent = script.description || 'None描述';
            
            // DisplayCreateTime
            if (createdElement && script.created) {
                createdElement.textContent = new Date(script.created).toLocaleString('zh-CN');
            }
            
            // DisplayUpdateTime（如果有）
            if (updatedElement && updatedGroup && script.updated) {
                updatedElement.textContent = new Date(script.updated).toLocaleString('zh-CN');
                updatedGroup.style.display = 'block';
            } else if (updatedGroup) {
                updatedGroup.style.display = 'none';
            }
            
            modal.style.display = 'block';
            
            // 存储CurrentScript描述Used forCopy
            this.currentScriptDescription = script.description || '';
            // console.log('Modal should be visible now');
        } else {
            // console.error('Modal elements not found');
        }
    }

    // CloseScript详情模态框
    closeScriptDetailModal() {
        const modal = document.getElementById('scriptDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // CopyScript描述
    copyScriptDescription() {
        if (this.currentScriptDescription) {
            navigator.clipboard.writeText(this.currentScriptDescription).then(() => {
                alert('描述Copied到剪贴板');
            }).catch(err => {
                console.error('CopyFailed:', err);
                alert('CopyFailed，请手动选择文本Copy');
            });
        } else {
            alert('None描述Content可Copy');
        }
    }



    // ExecuteScriptContent - 使用chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 StartExecuteJSScript (world: MAIN)...');
            
            // GetCurrent活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('None法GetCurrent标签页');
                return;
            }

            // RecordExecute的ScriptContent（Used for调试）
            console.log('✅ PrepareExecuteUser代码，长度:', scriptContent.length);

            // 使用 world: 'MAIN' 在主世界ExecuteScript，绕过CSP限制
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关Key：在主世界Execute，不受PageCSP限制
                args: [scriptContent],
                func: (code) => {
                    try {
                        // Direct eval 即可，CSP 不会拦截Extension注入
                        eval(code);
                        return { success: true, message: 'ScriptExecuteSuccess' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JSScriptExecuteSuccess');
                alert('ScriptExecuteSuccess (world: MAIN)');
            } else {
                console.error('❌ JSScriptExecuteFailed:', result?.error);
                alert('ScriptExecuteFailed: ' + (result?.error || 'Not知Error'));
            }

        } catch (error) {
            console.error('❌ Script注入Failed:', error);
            alert('Script注入Failed: ' + error.message);
        }
    }
}