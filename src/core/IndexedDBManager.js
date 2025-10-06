/**
 * IndexedDB管理器 - 负责普通scanresultstorageandread
 */
class IndexedDBManager {
    constructor() {
        this.dbName = 'PhantomScanDB';
        this.dbVersion = 2; // 升级versionto supportJS脚本storage
        this.db = null;
        this.storeName = 'scanResults';
    }

    /**
     * initializedata库
     */
    async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB openfailed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                //console.log('✅ IndexedDB initializesuccess');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB 升级in...');

                // createscanresultobjectstorage
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // create索引
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    //console.log('✅ scanresultobjectstorageand索引createsuccess');
                }

                // createJS脚本objectstorage
                if (!db.objectStoreNames.contains('jsScripts')) {
                    const jsStore = db.createObjectStore('jsScripts', { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // create索引
                    jsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('✅ JS脚本objectstorageand索引createsuccess');
                }
            };
        });
    }

    /**
     * generatestorage键
     */
    generateStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只usedomain作为键，确保同一domain下allpage面共享storage
            const key = urlObj.hostname;
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('generatestorage键failed:', error);
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }

    /**
     * 保存scanresult
     */
    async saveScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url);
            
            // use传入sourceUrl，ifwithout则useurlparameter
            const actualSourceUrl = sourceUrl || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            const currentTime = new Date().toISOString();
            
            // convert普通scanresultformat，确保每个项目都有sourceUrl字段
            const transformedResults = {};
            
            if (results && typeof results === 'object') {
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        // 将数组in每个字符串convert为containssourceUrlobject
                        transformedResults[key] = value.map(item => {
                            if (typeof item === 'string') {
                                return {
                                    value: item,
                                    sourceUrl: actualSourceUrl,
                                    extractedAt: currentTime,
                                    pageTitle: actualPageTitle
                                };
                            } else if (typeof item === 'object' && item !== null) {
                                // ifalready经是object，确保contains必要字段
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
                        // 非数组datakeep原样
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
                    //console.log(`✅ scanresultalready保存toIndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 保存scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存操作failed:', error);
            throw error;
        }
    }

    /**
     * readscanresult
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
                        //console.log(`✅ fromIndexedDBloadscanresult: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDBin未founddata: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ readscanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBread操作failed:', error);
            throw error;
        }
    }

    /**
     * 删除scanresult
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
                    console.log(`✅ alreadyfromIndexedDB删除scanresult: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 删除scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB删除操作failed:', error);
            throw error;
        }
    }

    /**
     * getallscanresult（fordata管理）
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
                    console.log(`✅ getallscanresult，共 ${results.length} 条record`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ getallscanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBgetalldata操作failed:', error);
            throw error;
        }
    }

    /**
     * 按domaingetscanresult
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
                    console.log(`✅ getdomain ${domain} scanresult，共 ${results.length} 条record`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 按domaingetscanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB按domain查询操作failed:', error);
            throw error;
        }
    }

    /**
     * 清空allscanresult
     */
    async clearAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ already清空allIndexedDBscanresult');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 清空scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB清空操作failed:', error);
            throw error;
        }
    }

    /**
     * getdata库统计information
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
                // 计算data大小（近似）
                stats.totalDataSize = allResults.reduce((size, record) => {
                    return size + JSON.stringify(record).length;
                }, 0);

                // found最老and最newrecord
                const timestamps = allResults.map(r => r.timestamp).sort((a, b) => a - b);
                stats.oldestRecord = new Date(timestamps[0]);
                stats.newestRecord = new Date(timestamps[timestamps.length - 1]);
            }

            return stats;
            
        } catch (error) {
            console.error('❌ getIndexedDB统计informationfailed:', error);
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
     * 保存deep scanresult
     */
    async saveDeepScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__deep';
            
            // get源URLandpage面标题 - fixdeep scan显示"未知"issue
            const actualSourceUrl = sourceUrl || window.location.href || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: results,
                sourceUrl: actualSourceUrl,  // add源URLinformation
                pageTitle: actualPageTitle,  // addpage面标题information
                extractedAt: new Date().toISOString(),  // addextract时间
                type: 'deepScan',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ deep scanresultalready保存toIndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    //console.error('❌ 保存deep scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存deep scanresultfailed:', error);
            throw error;
        }
    }

    /**
     * readdeep scanresult
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
                        //console.log(`✅ fromIndexedDBloaddeep scanresult: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDBin未founddeep scandata: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ readdeep scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBreaddeep scanresultfailed:', error);
            throw error;
        }
    }

    /**
     * 保存deep scanstate
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
                    //console.log(`✅ deep scanstatealready保存toIndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 保存deep scanstatefailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存deep scanstatefailed:', error);
            throw error;
        }
    }

    /**
     * readdeep scanstate
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
                        //console.log(`✅ fromIndexedDBloaddeep scanstate: ${storageKey}`);
                        resolve(result.state || {});
                    } else {
                        console.log(`📭 IndexedDBin未founddeep scanstate: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    //console.error('❌ readdeep scanstatefailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBreaddeep scanstatefailed:', error);
            throw error;
        }
    }

    /**
     * 删除deep scan相关data
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
            console.log(`✅ alreadyfromIndexedDB删除deep scandata: ${baseKey}`);
            return true;
            
        } catch (error) {
            console.error('❌ IndexedDB删除deep scandatafailed:', error);
            throw error;
        }
    }

    /**
     * getalldeep scanstate
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
                    // through滤出deep scanstate（以__stateending键）
                    const deepScanStates = allData
                        .filter(item => item.id && item.id.endsWith('__state') && item.type === 'deepScanState')
                        .map(item => item.state)
                        .filter(state => state && state.baseUrl)
                        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // 按时间排序
                    
                    console.log(`📖 getalldeep scanstate: found ${deepScanStates.length} 个configuration`);
                    resolve(deepScanStates);
                };
                request.onerror = () => {
                    console.error('❌ getalldeep scanstatefailed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ getalldeep scanstatefailed:', error);
            return [];
        }
    }

    // ==================== JS脚本storage相关方法 ====================
    
    /**
     * 保存JS脚本列表
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
                    console.log('✅ JS脚本保存success，共', scripts.length, '个脚本');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS脚本保存failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本保存failed:', error);
            throw error;
        }
    }

    /**
     * loadJS脚本列表
     */
    async loadJSScripts() {
        try {
            //console.log('[IndexedDBManager] startloadJS脚本...');
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readonly');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.get('savedScripts');
                
                request.onsuccess = () => {
                    const result = request.result;
                    //console.log('[IndexedDBManager] 原始查询result:', result);
                    
                    if (result && result.scripts) {
                        //console.log('✅ JS脚本loadsuccess，共', result.scripts.length, '个脚本');
                        //console.log('[IndexedDBManager] 脚本详情:', result.scripts.map(s => ({ name: s.name, isPreset: s.isPreset, id: s.id })));
                        resolve(result.scripts);
                    } else {
                        console.log('📭 IndexedDBin未foundJS脚本data，return空数组');
                        resolve([]);
                    }
                };
                request.onerror = () => {
                    console.error('❌ JS脚本loadfailed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本loadfailed:', error);
            return [];
        }
    }

    /**
     * 删除allJS脚本
     */
    async clearJSScripts() {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.delete('savedScripts');
                
                request.onsuccess = () => {
                    console.log('✅ JS脚本清除success');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS脚本清除failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本清除failed:', error);
            throw error;
        }
    }

    /**
     * get最近scanresult
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
                    // 按时间戳排序，最newinbefore
                    const sortedResults = results.sort((a, b) => {
                        const timeA = new Date(a.extractedAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.extractedAt || b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // 限制return数量
                    const limitedResults = sortedResults.slice(0, limit);
                    resolve(limitedResults);
                };
                
                request.onerror = () => {
                    console.error('❌ get最近scanresultfailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ get最近scanresult操作failed:', error);
            return [];
        }
    }

    /**
     * 关闭data库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ IndexedDB连接already关闭');
        }
    }
}

// create全局实例
const indexedDBManager = new IndexedDBManager();

// export实例，使其可以像静态方法一样调for
window.IndexedDBManager = indexedDBManager;