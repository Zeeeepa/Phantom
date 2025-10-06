/**
 * IndexedDB manage 器 - 负责普通 scan result   storage andread
 */
class IndexedDBManager {
    constructor() {
        this.dbName = 'PhantomScanDB';
        this.dbVersion = 2; // 升级 version 以supportJS script storage
        this.db = null;
        this.storeName = 'scanResults';
    }

    /**
     * initialize database
     */
    async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB open failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                //console.log('✅ IndexedDB initialize success');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB 升级in...');

                // 创建 scan result object storage
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    //console.log('✅ scan result object storage and索引创建 success');
                }

                // 创建JS script object storage
                if (!db.objectStoreNames.contains('jsScripts')) {
                    const jsStore = db.createObjectStore('jsScripts', { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    jsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('✅ JS script object storage and索引创建 success');
                }
            };
        });
    }

    /**
     * 生成 storage key
     */
    generateStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只use domain 作to key，确保同一 domain 下 all page 共享 storage
            const key = urlObj.hostname;
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('生成 storage key failed:', error);
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }

    /**
     * save scan result
     */
    async saveScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url);
            
            // use传入 sourceUrl，如果没有则useurl parameter
            const actualSourceUrl = sourceUrl || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            const currentTime = new Date().toISOString();
            
            // convert普通 scan result format，确保每个项目都有sourceUrl field
            const transformedResults = {};
            
            if (results && typeof results === 'object') {
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        // 将 array in 每个 string convertto contains sourceUrl  object
                        transformedResults[key] = value.map(item => {
                            if (typeof item === 'string') {
                                return {
                                    value: item,
                                    sourceUrl: actualSourceUrl,
                                    extractedAt: currentTime,
                                    pageTitle: actualPageTitle
                                };
                            } else if (typeof item === 'object' && item !== null) {
                                // 如果already经是 object，确保 contains 必要 field
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
                        // 非 array data 保持原样
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
                    //console.log(`✅ scan result already save 到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ save scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB save 操作 failed:', error);
            throw error;
        }
    }

    /**
     * read scan result
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
                        //console.log(`✅ fromIndexedDB load scan result: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDBin未找到 data: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ read scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBread操作 failed:', error);
            throw error;
        }
    }

    /**
     * delete scan result
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
                    console.log(`✅ alreadyfromIndexedDB delete scan result: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ delete scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB delete 操作 failed:', error);
            throw error;
        }
    }

    /**
     * 获取all scan result（for data manage）
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
                    console.log(`✅ 获取all scan result，共 ${results.length} 条记录`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 获取all scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB获取all data 操作 failed:', error);
            throw error;
        }
    }

    /**
     * 按 domain 获取 scan result
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
                    console.log(`✅ 获取 domain ${domain}   scan result，共 ${results.length} 条记录`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 按 domain 获取 scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB按 domain query 操作 failed:', error);
            throw error;
        }
    }

    /**
     * clear all scan result
     */
    async clearAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ already clear allIndexedDB scan result');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ clear scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB clear 操作 failed:', error);
            throw error;
        }
    }

    /**
     * 获取 database statistics
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
                // 计算 data size（近似）
                stats.totalDataSize = allResults.reduce((size, record) => {
                    return size + JSON.stringify(record).length;
                }, 0);

                // 找到最老and最新 记录
                const timestamps = allResults.map(r => r.timestamp).sort((a, b) => a - b);
                stats.oldestRecord = new Date(timestamps[0]);
                stats.newestRecord = new Date(timestamps[timestamps.length - 1]);
            }

            return stats;
            
        } catch (error) {
            console.error('❌ 获取IndexedDB statistics failed:', error);
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
     * save deep scan result
     */
    async saveDeepScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__deep';
            
            // 获取源URLand page 标题 - fixdeep scan显示"未知" issue
            const actualSourceUrl = sourceUrl || window.location.href || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: results,
                sourceUrl: actualSourceUrl,  // add 源URL information
                pageTitle: actualPageTitle,  // add page 标题 information
                extractedAt: new Date().toISOString(),  // add extract 时间
                type: 'deepScan',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ deep scan result already save 到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    //console.error('❌ save deep scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB save deep scan result failed:', error);
            throw error;
        }
    }

    /**
     * read deep scan result
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
                        //console.log(`✅ fromIndexedDB load deep scan result: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDBin未找到 deep scan data: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ read deep scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBread deep scan result failed:', error);
            throw error;
        }
    }

    /**
     * save deep scan status
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
                    //console.log(`✅ deep scan status already save 到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ save deep scan status failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB save deep scan status failed:', error);
            throw error;
        }
    }

    /**
     * read deep scan status
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
                        //console.log(`✅ fromIndexedDB load deep scan status: ${storageKey}`);
                        resolve(result.state || {});
                    } else {
                        console.log(`📭 IndexedDBin未找到 deep scan status: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    //console.error('❌ read deep scan status failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBread deep scan status failed:', error);
            throw error;
        }
    }

    /**
     * delete deep scan 相关 data
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
            console.log(`✅ alreadyfromIndexedDB delete deep scan data: ${baseKey}`);
            return true;
            
        } catch (error) {
            console.error('❌ IndexedDB delete deep scan data failed:', error);
            throw error;
        }
    }

    /**
     * 获取all deep scan status
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
                    // filter 出 deep scan status（以__state结尾  key）
                    const deepScanStates = allData
                        .filter(item => item.id && item.id.endsWith('__state') && item.type === 'deepScanState')
                        .map(item => item.state)
                        .filter(state => state && state.baseUrl)
                        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // 按时间 sort
                    
                    console.log(`📖 获取all deep scan status: 找到 ${deepScanStates.length} 个 configuration`);
                    resolve(deepScanStates);
                };
                request.onerror = () => {
                    console.error('❌ 获取all deep scan status failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ 获取all deep scan status failed:', error);
            return [];
        }
    }

    // ==================== JS script storage 相关 method ====================
    
    /**
     * save JS script list
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
                    console.log('✅ JS script save success，共', scripts.length, '个 script');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS script save failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS script save failed:', error);
            throw error;
        }
    }

    /**
     * load JS script list
     */
    async loadJSScripts() {
        try {
            //console.log('[IndexedDBManager] start load JS script ...');
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readonly');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.get('savedScripts');
                
                request.onsuccess = () => {
                    const result = request.result;
                    //console.log('[IndexedDBManager] 原始 query result:', result);
                    
                    if (result && result.scripts) {
                        //console.log('✅ JS script load success，共', result.scripts.length, '个 script');
                        //console.log('[IndexedDBManager] script 详情:', result.scripts.map(s => ({ name: s.name, isPreset: s.isPreset, id: s.id })));
                        resolve(result.scripts);
                    } else {
                        console.log('📭 IndexedDBin未找到JS script data，返回 empty array');
                        resolve([]);
                    }
                };
                request.onerror = () => {
                    console.error('❌ JS script load failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS script load failed:', error);
            return [];
        }
    }

    /**
     * delete allJS script
     */
    async clearJSScripts() {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.delete('savedScripts');
                
                request.onsuccess = () => {
                    console.log('✅ JS script 清除 success');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS script 清除 failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS script 清除 failed:', error);
            throw error;
        }
    }

    /**
     * 获取最近  scan result
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
                    // 按时间戳 sort，最新 inbefore
                    const sortedResults = results.sort((a, b) => {
                        const timeA = new Date(a.extractedAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.extractedAt || b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // limit 返回 count
                    const limitedResults = sortedResults.slice(0, limit);
                    resolve(limitedResults);
                };
                
                request.onerror = () => {
                    console.error('❌ 获取最近 scan result failed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ 获取最近 scan result 操作 failed:', error);
            return [];
        }
    }

    /**
     * close database 连接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ IndexedDB连接already close');
        }
    }
}

// 创建全局实例
const indexedDBManager = new IndexedDBManager();

// export 实例，使其可以像 static method 一样调用
window.IndexedDBManager = indexedDBManager;