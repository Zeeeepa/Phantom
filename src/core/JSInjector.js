// JS inject feature module
class JSInjector {
    constructor() {
        this.savedScripts = [];
    }

    // initialize JS inject page
    init() {
        //console.log('JSInjector init called');
        // initialize 预设 script（如果尚not initialize）
        if (typeof JSHookPresets !== 'undefined' && JSHookPresets.initializePresets) {
            JSHookPresets.initializePresets().then(() => {
                this.loadSavedScripts();
            }).catch(error => {
                console.error('预设 script initialize failed:', error);
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
        // add script button
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

        // 模态框相关 event
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

        // 点击模态框外部 close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddScriptModal();
                }
            });
        }

        // 绑定 script button event
        this.bindScriptEvents();

        // script 描述 expand button event

        
        // script 详情相关 event
        window.openScriptDetails = (scriptName, description) => {
            const index = this.savedScripts.findIndex(s => s.name === scriptName);
            if (index !== -1) {
                this.showScriptDetail(index);
            }
        };

        // 模态框 close event
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

            // 点击模态框外部 close
            scriptDetailModal.addEventListener('click', (e) => {
                if (e.target === scriptDetailModal) {
                    this.closeScriptDetailModal();
                }
            });
        }
    }

    // display add script 模态框
    showAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'block';
            // clear input
            document.getElementById('scriptNameInput').value = '';
            document.getElementById('scriptCodeInput').value = '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = '';
        }
    }

    // hide add script 模态框
    hideAddScriptModal() {
        const modal = document.getElementById('addScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // save 新 script
    async saveNewScript() {
        const nameInput = document.getElementById('scriptNameInput');
        const codeInput = document.getElementById('scriptCodeInput');
        const descriptionInput = document.getElementById('scriptDescInput');

        if (!nameInput.value.trim() || !codeInput.value.trim()) {
            alert('请输入 script 名称andcode content');
            return;
        }

        const script = {
            id: Date.now(), // use时间戳作to唯一ID
            name: nameInput.value.trim(),
            content: codeInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            size: new Blob([codeInput.value]).size,
            createdAt: new Date().toLocaleString()
        };

        try {
            // fromIndexedDB load 现有 script
            const savedScripts = await window.IndexedDBManager.loadJSScripts();
            savedScripts.push(script);
            
            // save 到IndexedDB
            await window.IndexedDBManager.saveJSScripts(savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts();
            alert('script save success');
            
            // clear input
            nameInput.value = '';
            codeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        } catch (error) {
            console.error('❌ save script failed:', error);
            alert('script save failed: ' + error.message);
        }
    }

    // load already save   script
    async loadSavedScripts() {
        try {
            //console.log('[JSInjector] start load script ...');
            
            // check IndexedDBManager是否可用
            if (!window.IndexedDBManager) {
                console.error('[JSInjector] IndexedDBManager未找到');
                this.savedScripts = [];
                this.displaySavedScripts();
                return;
            }
            
            // fromIndexedDB load all script（package 括预设 script）
            this.savedScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSInjector] load 到  script count:', this.savedScripts.length);
            //console.log('[JSInjector] script list:', this.savedScripts.map(s => ({ name: s.name, isPreset: s.isPreset })));
            
            this.displaySavedScripts();
        } catch (error) {
            console.error('❌ load script failed:', error);
            this.savedScripts = [];
            this.displaySavedScripts();
        }
    }

    // display already save   script
    displaySavedScripts() {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        // clear 现有 content
        container.innerHTML = '';

        if (this.savedScripts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-style: normal;">暂无 save   script，点击下方"add script"按钮开始创建</p>
                </div>
            `;
            return;
        }

        // useheader-input-group style display script
        this.savedScripts.forEach((script, index) => {
            const scriptItem = document.createElement('div');
            scriptItem.className = 'header-input-group script-item';
            scriptItem.style.justifyContent = 'space-between';
            scriptItem.style.cursor = 'pointer';
            
            const description = script.description || '无描述';
            const truncatedDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
            
            // 创建 script information 区域
            const scriptInfoDiv = document.createElement('div');
            scriptInfoDiv.style.cssText = 'flex: 1; max-width: 200px; cursor: pointer;';
            scriptInfoDiv.addEventListener('click', () => {
                this.showScriptDetail(index);
            });
            
            scriptInfoDiv.innerHTML = `
                <div style="color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${script.name}</div>
                <div class="script-desc-preview" style="color: #aaa; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;" title="${description}">${truncatedDesc}</div>
            `;
            
            // 创建 button 区域
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px; flex-shrink: 0;';
            // all script 都 display complete 操作 button
            buttonsDiv.innerHTML = `
                ${script.isPreset ? '<span style="color: #4CAF50; font-size: 12px; padding: 4px 8px; background: rgba(76, 175, 80, 0.1); border-radius: 3px; margin-right: 5px;">预设</span>' : ''}
                <button class="inject-btn" data-index="${index}" data-action="inject" onclick="event.stopPropagation()">inject</button>
                <button class="modify-btn" data-index="${index}" data-action="modify" onclick="event.stopPropagation()">modify</button>
                <button class="delete-btn" data-index="${index}" data-action="delete" onclick="event.stopPropagation()">delete</button>
            `;
            
            scriptItem.appendChild(scriptInfoDiv);
            scriptItem.appendChild(buttonsDiv);
            container.appendChild(scriptItem);
        });
    }

    // 绑定 script button event
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

    // format 化 file size
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

    // modify script
    modifyScript(index) {
        if (this.savedScripts[index]) {
            const script = this.savedScripts[index];
            
            // display edit 模态框
            this.showAddScriptModal();
            
            // 填充现有 data
            document.getElementById('scriptNameInput').value = script.name;
            document.getElementById('scriptCodeInput').value = script.content || script.code || '';
            const descriptionInput = document.getElementById('scriptDescInput');
            if (descriptionInput) descriptionInput.value = script.description || '';
            
            // modify save button 行toto update
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'update script';
            
            // remove 原有 event listener 并 add 新 
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
            alert('请输入 script 名称andcode content');
            return;
        }

        try {
            // update script data
            this.savedScripts[index] = {
                ...this.savedScripts[index],
                name: nameInput.value.trim(),
                content: codeInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                size: new Blob([codeInput.value]).size,
                updatedAt: new Date().toLocaleString()
            };

            // save 到IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.hideAddScriptModal();
            this.loadSavedScripts(); // 重新 load 而do not是directly display
            alert('script update success');
            
            // 恢复 save button
            const saveBtn = document.getElementById('saveScriptBtn');
            saveBtn.textContent = 'save script';
            saveBtn.onclick = () => this.saveNewScript();
        } catch (error) {
            console.error('❌ update script failed:', error);
            alert('script update failed: ' + error.message);
        }
    }

    // delete script
    async deleteScript(index) {
        if (!confirm('确定要 delete 这个 script 吗？')) {
            return;
        }

        try {
            // from array in delete script
            this.savedScripts.splice(index, 1);

            // save 到IndexedDB
            await window.IndexedDBManager.saveJSScripts(this.savedScripts);
            
            this.loadSavedScripts();
            alert('script delete success');
        } catch (error) {
            console.error('❌ delete script failed:', error);
            alert('script delete failed: ' + error.message);
        }
    }

    // display message prompt
    showMessage(message, type = 'info') {
        // simple  alert prompt，后续可以改to更美观  prompt
        alert(message);
    }



    // display script 详情模态框
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
            
            // display 创建时间
            if (createdElement && script.created) {
                createdElement.textContent = new Date(script.created).toLocaleString('zh-CN');
            }
            
            // display update 时间（如果有）
            if (updatedElement && updatedGroup && script.updated) {
                updatedElement.textContent = new Date(script.updated).toLocaleString('zh-CN');
                updatedGroup.style.display = 'block';
            } else if (updatedGroup) {
                updatedGroup.style.display = 'none';
            }
            
            modal.style.display = 'block';
            
            // storage current script 描述for copy
            this.currentScriptDescription = script.description || '';
            // console.log('Modal should be visible now');
        } else {
            // console.error('Modal elements not found');
        }
    }

    // close script 详情模态框
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
                alert('描述already copy 到剪贴板');
            }).catch(err => {
                console.error('copy failed:', err);
                alert('copy failed，请 manual select text copy');
            });
        } else {
            alert('无描述 content can copy');
        }
    }



    // execute script content - usechrome.scripting.executeScript({world:'MAIN'})绕throughCSP
    async executeScriptContent(scriptContent) {
        try {
            console.log('🔧 start execute JS script (world: MAIN)...');
            
            // 获取 current 活动 tab 页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('无法获取 current tab 页');
                return;
            }

            // 记录 execute   script content（for debug）
            console.log('✅ 准备 execute user code，length:', scriptContent.length);

            // use world: 'MAIN' in主世界 execute script，绕throughCSP limit
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',  // 关 key：in主世界 execute，do not受 page CSP limit
                args: [scriptContent],
                func: (code) => {
                    try {
                        // directly eval 即可，CSP do not会 intercept extension inject
                        eval(code);
                        return { success: true, message: 'script execute success' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            });

            const result = results[0]?.result;
            if (result?.success) {
                console.log('✅ JS script execute success');
                alert('script execute success (world: MAIN)');
            } else {
                console.error('❌ JS script execute failed:', result?.error);
                alert('script execute failed: ' + (result?.error || '未知 error'));
            }

        } catch (error) {
            console.error('❌ script inject failed:', error);
            alert('script inject failed: ' + error.message);
        }
    }
}