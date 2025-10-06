/**
 * manager IndexedDB - scan results read of and 负责普通存储
 */
class IndexedDBManager {
    constructor() {
        this.dbName = 'PhantomScanDB';
        this.dbVersion = 2; // script version with 升级支持JS存储
        this.db = null;
        this.storeName = 'scanResults';
    }

    /**
     * initialize data 库
     */
    async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB failed open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                //console.log('✅ IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB in 升级...');

                // scan results object 创建存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    //console.log('✅ scan results success object and 存储索引创建');
                }

                // script object 创建JS存储
                if (!db.objectStoreNames.contains('jsScripts')) {
                    const jsStore = db.createObjectStore('jsScripts', { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    jsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('✅ success script object and JS存储索引创建');
                }
            };
        });
    }

    /**
     * 生成存储键
     */
    generateStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // domain use as 只作键，domain page all total of 确保同一下享存储
            const key = urlObj.hostname;
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('failed 生成存储键:', error);
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }

    /**
     * scan results save
     */
    async saveScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url);
            
            // use of 传入sourceUrl，parameters if use then has 没url
            const actualSourceUrl = sourceUrl || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            const currentTime = new Date().toISOString();
            
            // scan results format convert 普通，project item(s) has 确保每都sourceUrl字段
            const transformedResults = {};
            
            if (results && typeof results === 'object') {
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        // contains object convert characters array item(s) as in of of 将每串sourceUrl
                        transformedResults[key] = value.map(item => {
                            if (typeof item === 'string') {
                                return {
                                    value: item,
                                    sourceUrl: actualSourceUrl,
                                    extractedAt: currentTime,
                                    pageTitle: actualPageTitle
                                };
                            } else if (typeof item === 'object' && item !== null) {
                                // object if yes 已经，contains 确保必要字段
                                return {
                                    ...item,
                                    sourceUrl: item.sourceUrl || actualSourceUrl,
                                    extractedAt: item.extractedAt || currentTime,
                                    pageTitle: item.pageTitle || actualPageTitle
                                };
                            }
                            return item;
                        });
                    } else {
                        // data array 非保持原样
                        transformedResults[key] = value;
                    }
                }
            } else {
                transformedResults = results;
            }
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: transformedResults,
                sourceUrl: actualSourceUrl,
                pageTitle: actualPageTitle,
                extractedAt: currentTime,
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ scan results saved to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed save:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed save IndexedDB:', error);
            throw error;
        }
    }

    /**
     * scan results read
     */
    async loadScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url);
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ scan results load from IndexedDB: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 not found data in IndexedDB: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed read:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed read IndexedDB:', error);
            throw error;
        }
    }

    /**
     * scan results delete
     */
    async deleteScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url);
            const request = store.delete(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ scan results delete from 已IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed delete:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed delete IndexedDB:', error);
            throw error;
        }
    }

    /**
     * scan results get all（data for 管理）
     */
    async getAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const results = request.result || [];
                    console.log(`✅ scan results get all，total ${results.length} record record(s)`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed get all:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed data get all IndexedDB:', error);
            throw error;
        }
    }

    /**
     * scan results domain get by
     */
    async getScanResultsByDomain(domain) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('domain');
            
            const request = index.getAll(domain);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const results = request.result || [];
                    console.log(`✅ domain get ${domain} scan results of，total ${results.length} record record(s)`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed domain get by:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed domain query by IndexedDB:', error);
            throw error;
        }
    }

    /**
     * scan results clear all
     */
    async clearAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ scan results clear all 已IndexedDB');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed clear:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ operation failed clear IndexedDB:', error);
            throw error;
        }
    }

    /**
     * data information get statistics 库
     */
    async getStats() {
        try {
            const allResults = await this.getAllScanResults();
            
            const stats = {
                totalRecords: allResults.length,
                domains: new Set(allResults.map(r => r.domain)).size,
                totalDataSize: 0,
                oldestRecord: null,
                newestRecord: null
            };

            if (allResults.length > 0) {
                // data 计算大小（近似）
                stats.totalDataSize = allResults.reduce((size, record) => {
                    return size + JSON.stringify(record).length;
                }, 0);

                // record latest to of and 找最老
                const timestamps = allResults.map(r => r.timestamp).sort((a, b) => a - b);
                stats.oldestRecord = new Date(timestamps[0]);
                stats.newestRecord = new Date(timestamps[timestamps.length - 1]);
            }

            return stats;
            
        } catch (error) {
            console.error('❌ failed information get statistics IndexedDB:', error);
            return {
                totalRecords: 0,
                domains: 0,
                totalDataSize: 0,
                oldestRecord: null,
                newestRecord: null
            };
        }
    }

    /**
     * deep scan save results
     */
    async saveDeepScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__deep';
            
            // URL get title page and 源 - fixeddeep scan显示"未知"的问题
            const actualSourceUrl = sourceUrl || window.location.href || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: results,
                sourceUrl: actualSourceUrl,  // URL add information 源
                pageTitle: actualPageTitle,  // add information title page
                extractedAt: new Date().toISOString(),  // add extracted when 间
                type: 'deepScan',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ deep scan saved results to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    //console.error('❌ deep scan failed save results:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ deep scan failed save results IndexedDB:', error);
            throw error;
        }
    }

    /**
     * deep scan results read
     */
    async loadDeepScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url) + '__deep';
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ deep scan results load from IndexedDB: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 deep scan not found data in IndexedDB: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ deep scan failed results read:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ deep scan failed results read IndexedDB:', error);
            throw error;
        }
    }

    /**
     * deep scan save status
     */
    async saveDeepScanState(url, state) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__state';
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                state: state,
                type: 'deepScanState',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ deep scan saved status to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ deep scan failed save status:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ deep scan failed save status IndexedDB:', error);
            throw error;
        }
    }

    /**
     * deep scan status read
     */
    async loadDeepScanState(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url) + '__state';
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ deep scan load status from IndexedDB: ${storageKey}`);
                        resolve(result.state || {});
                    } else {
                        console.log(`📭 deep scan not found status in IndexedDB: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    //console.error('❌ deep scan failed status read:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ deep scan failed status read IndexedDB:', error);
            throw error;
        }
    }

    /**
     * deep scan delete data related
     */
    async deleteDeepScanData(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const baseKey = this.generateStorageKey(url);
            const keysToDelete = [
                baseKey + '__deep',
                baseKey + '__state'
            ];

            const promises = keysToDelete.map(key => {
                return new Promise((resolve, reject) => {
                    const request = store.delete(key);
                    request.onsuccess = () => resolve(key);
                    request.onerror = () => reject(request.error);
                });
            });

            await Promise.all(promises);
            console.log(`✅ deep scan delete data from 已IndexedDB: ${baseKey}`);
            return true;
            
        } catch (error) {
            console.error('❌ deep scan failed delete data IndexedDB:', error);
            throw error;
        }
    }

    /**
     * deep scan get all status
     */
    async getAllDeepScanStates() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const allData = request.result || [];
                    // deep scan filter status 出（with of __state结尾键）
                    const deepScanStates = allData
                        .filter(item => item.id && item.id.endsWith('__state') && item.type === 'deepScanState')
                        .map(item => item.state)
                        .filter(state => state && state.baseUrl)
                        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // when by 间排序
                    
                    console.log(`📖 deep scan get all status: to 找 ${deepScanStates.length} configuration item(s)`);
                    resolve(deepScanStates);
                };
                request.onerror = () => {
                    console.error('❌ deep scan failed get all status:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ deep scan failed get all status:', error);
            return [];
        }
    }

    // ==================== script method related JS存储 ====================
    
    /**
     * save script column(s) JS表
     */
    async saveJSScripts(scripts) {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'savedScripts',
                    scripts: scripts,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => {
                    console.log('✅ success save script JS，total', scripts.length, 'script item(s)');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ failed save script JS:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ failed save script JS:', error);
            throw error;
        }
    }

    /**
     * script load column(s) JS表
     */
    async loadJSScripts() {
        try {
            //console.log('[IndexedDBManager] start script load JS...');
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readonly');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.get('savedScripts');
                
                request.onsuccess = () => {
                    const result = request.result;
                    //console.log('[IndexedDBManager] results original query:', result);
                    
                    if (result && result.scripts) {
                        //console.log('✅ loaded successfully script JS，total', result.scripts.length, 'script item(s)');
                        //console.log('[IndexedDBManager] details script:', result.scripts.map(s => ({ name: s.name, isPreset: s.isPreset, id: s.id })));
                        resolve(result.scripts);
                    } else {
                        console.log('📭 not found data script in IndexedDBJS，return array empty');
                        resolve([]);
                    }
                };
                request.onerror = () => {
                    console.error('❌ failed to load script JS:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ failed to load script JS:', error);
            return [];
        }
    }

    /**
     * delete script all JS
     */
    async clearJSScripts() {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.delete('savedScripts');
                
                request.onsuccess = () => {
                    console.log('✅ success clear script JS');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ failed clear script JS:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ failed clear script JS:', error);
            throw error;
        }
    }

    /**
     * scan results get of 最近
     */
    async getRecentScanResults(limit = 10) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const results = request.result || [];
                    // when by 间戳排序，latest of before 在
                    const sortedResults = results.sort((a, b) => {
                        const timeA = new Date(a.extractedAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.extractedAt || b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // return quantity limit
                    const limitedResults = sortedResults.slice(0, limit);
                    resolve(limitedResults);
                };
                
                request.onerror = () => {
                    console.error('❌ scan results failed get 最近:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ scan results operation failed get 最近:', error);
            return [];
        }
    }

    /**
     * close data connection 库
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ closed connection IndexedDB');
        }
    }
}

// instance 创建全局
const indexedDBManager = new IndexedDBManager();

// export instance，call method can 使其像静态一样
window.IndexedDBManager = indexedDBManager;