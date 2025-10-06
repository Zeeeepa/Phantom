// feature module inject JS
class JSInjector {
    constructor() {
        this.savedScripts = [];
    }

    // initialize inject page JS
    init() {
        //console.log('JSInjector init called');
        // initialize script 预设（not initialized if 尚）
        if (typeof JSHookPresets !== 'undefined' && JSHookPresets.initializePresets) {
            JSHookPresets.initializePresets().then(() => {
                this.loadSavedScripts();
            }).catch(error => {
                console.error('initialize failed script 预设:', error);
                this.loadSavedScripts();
            });
        } else {
            this.loadSavedScripts();
        }
        this.initEvents();
    }

    // initialize event listen
    initEvents() {
        //console.log('JSInjector initEvents called');
        // add button script
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

        // event related 模态框
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

        // close 点击模态框外部
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddScriptModal();
                }
            });
        }

        // button script event 绑定
        this.bindScriptEvents();

        // button script event on 描述展

        
        // details script event related
        window.openScriptDetails = (scriptName, description) => {
            const index = this.savedScripts.findIndex(s => s.name === scriptName);
            if (index !== -1) {
                this.showScriptDetail(index);
            }
        };

        // close event 模态框
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

            // close 点击模态框外部
            scriptDetailModal.addEventListener('click', (e) => {
                if (e.target === scriptDetailModal) {
                    this.closeScriptDetailModal();
                }
            });
        }
    }

    // add script display 模态框
    showAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'block';
            // input field clear
            document.getElementById('scriptNameInput').value = '';
            document.getElementById('scriptCodeInput').value = '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = '';
        }
    }

    // add script hide 模态框
    hideAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // save script 新
    async saveNewScript() {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('please enter content code script name and');
            return;
        }

        const script = {
            id: Date.now(), // use as when 间戳作唯一ID
            name: nameInput.value.trim(),
            content: codeInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            size: new Blob([codeInput.value]).size,
            createdAt: new Date().toLocaleString()
        };

        try {
            // script load from has IndexedDB现
            const savedScripts = await window.IndexedDBManager.loadJSScripts();
            savedScripts.push(script);
            
            // save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts();
            alert('success save script');
            
            // input field clear
            nameInput.value = '';
            codeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        } catch (error) {
            console.error('❌ failed save script:', error);
            alert('failed save script: ' + error.message);
        }
    }

    // saved script load of
    async loadSavedScripts() {
        try {
            //console.log('[JSInjector] start script load ...');
            
            // check available no yes IndexedDBManager
            if (!window.IndexedDBManager) {
                console.error('[JSInjector] not found IndexedDBManager');
                this.savedScripts = [];
                this.displaySavedScripts();
                return;
            }
            
            // script load all from IndexedDB（script 包括预设）
            this.savedScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSInjector] quantity script load to of:', this.savedScripts.length);
            //console.log('[JSInjector] script column(s) 表:', this.savedScripts.map(s => ({ name: s.name, isPreset: s.isPreset })));
            
            this.displaySavedScripts();
        } catch (error) {
            console.error('❌ failed script load:', error);
            this.savedScripts = [];
            this.displaySavedScripts();
        }
    }

    // saved script display of
    displaySavedScripts() {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        // clear content has 现
        container.innerHTML = '';

        if (this.savedScripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-style: normal;">save script of 暂无，点击下方"add script"按钮开始创建</p>
                </div>
            `;
            return;
        }

        // script use display header-input-group样式
        this.savedScripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = 'header-input-group script-item';
            scriptItem.style.justifyContent = 'space-between';
            scriptItem.style.cursor = 'pointer';
            
            const description = script.description || '无描述';
            const truncatedDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
            
            // information script area 创建
            const scriptInfoDiv = document.createElement('div');
            scriptInfoDiv.style.cssText = 'flex: 1; max-width: 200px; cursor: pointer;';
            scriptInfoDiv.addEventListener('click', () => {
                this.showScriptDetail(index);
            });
            
            scriptInfoDiv.innerHTML = `
                <div style="color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${script.name}</div>
                <div class="script-desc-preview" style="color: #aaa; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${description}">${truncatedDesc}</div>
            `;
            
            // button area 创建
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px; flex-shrink: 0;';
            // button script all display operation of 都完整
            buttonsDiv.innerHTML = `
                ${script.isPreset ? '<span style="color: #4CAF50; font-size: 12px; padding: 4px 8px; background: rgba(76, 175, 80, 0.1); border-radius: 3px; margin-right: 5px;">预设</span>' : ''}
                <button class="inject-btn" data-index="${index}" data-action="inject" onclick="event.stopPropagation()">inject</button>
                <button class="modify-btn" data-index="${index}" data-action="modify" onclick="event.stopPropagation()">修改</button>
                <button class="delete-btn" data-index="${index}" data-action="delete" onclick="event.stopPropagation()">delete</button>
            `;
            
            scriptItem.appendChild(scriptInfoDiv);
            scriptItem.appendChild(buttonsDiv);
            container.appendChild(scriptItem);
        });
    }

    // button script event 绑定
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

    // file size format 化
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // inject script
    injectScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            const scriptContent = script.content || script.code || '';
            this.executeScriptContent(scriptContent);
        }
    }

    // script 修改
    modifyScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            
            // edit display 模态框
            this.showAddScriptModal();
            
            // data has 填充现
            document.getElementById('scriptNameInput').value = script.name;
            document.getElementById('scriptCodeInput').value = script.content || script.code || '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = script.description || '';
            
            // save update button line(s) as as 修改
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'update script';
            
            // add remove event listen new has 原器并
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('saveScriptBtn');
            newSaveBtn.addEventListener('click', () => this.updateScript(index));
        }
    }

    // update script
    async updateScript(index) {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('please enter content code script name and');
            return;
        }

        try {
            // update data script
            this.savedScripts[index] = {
                ...this.savedScripts[index],
                name: nameInput.value.trim(),
                content: codeInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                size: new Blob([codeInput.value]).size,
                updatedAt: new Date().toLocaleString()
            };

            // save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts(); // load re- directly display yes 而不
            alert('success update script');
            
            // save button resume
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'save script';
            saveBtn.onclick = () => this.saveNewScript();
        } catch (error) {
            console.error('❌ failed update script:', error);
            alert('failed update script: ' + error.message);
        }
    }

    // delete script
    async deleteScript(index) {
        if (!confirm('delete script item(s) 确定要这吗？')) {
            return;
        }

        try {
            // delete script array from in
            this.savedScripts.splice(index, 1);

            // save to IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.loadSavedScripts();
            alert('success delete script');
        } catch (error) {
            console.error('❌ failed delete script:', error);
            alert('failed delete script: ' + error.message);
        }
    }

    // hint display 消息
    showMessage(message, type = 'info') {
        // hint of 简单alert，hint can as of after 续改更美观
        alert(message);
    }



    // details script display 模态框
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
            
            // display when 创建间
            if (createdElement && script.created) {
                createdElement.textContent = new Date(script.created).toLocaleString('zh-CN');
            }
            
            // update display when 间（if has）
            if (updatedElement && updatedGroup && script.updated) {
                updatedElement.textContent = new Date(script.updated).toLocaleString('zh-CN');
                updatedGroup.style.display = 'block';
            } else if (updatedGroup) {
                updatedGroup.style.display = 'none';
            }
            
            modal.style.display = 'block';
            
            // copy script current for 存储描述
            this.currentScriptDescription = script.description || '';
            // console.log('Modal should be visible now');
        } else {
            // console.error('Modal elements not found');
        }
    }

    // close details script 模态框
    closeScriptDetailModal() {
        const modal = document.getElementById('scriptDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // copy script 描述
    copyScriptDescription() {
        if (this.currentScriptDescription) {
            navigator.clipboard.writeText(this.currentScriptDescription).then(() => {
                alert('copy to 描述已剪贴板');
            }).catch(err => {
                console.error('failed copy:', err);
                alert('failed copy，copy select text 请手动');
            });
        } else {
            alert('copy content 无描述可');
        }
    }



    // content script execute - use chrome.scripting.executeScript({world:'MAIN'})绕过CSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start script execute JS (world: MAIN)...');
            
            // tab get active current
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('tab get current 无法');
                return;
            }

            // content record script execute of（debug for）
            console.log('✅ code execute user 准备，length:', scriptContent.length);

            // use world: 'MAIN' script execute 在主世界，limit 绕过CSP
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // off 键：execute 在主世界，page limit 不受CSP
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP extension intercept inject 不会
                        eval(code);
                        return { success: true, message: 'success script execute' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ success script execute JS');
                alert('success script execute (world: MAIN)');
            } else {
                console.error('❌ failed script execute JS:', result?.error);
                alert('failed script execute: ' + (result?.error || 'error 未知'));
            }

        } catch (error) {
            console.error('❌ failed inject script:', error);
            alert('failed inject script: ' + error.message);
        }
    }
}