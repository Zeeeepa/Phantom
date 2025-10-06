/**
 * IndexedDB管理器 - 负责普通Scan results的存储AndRead
 */
class IndexedDBManager {
    constructor() {
        this.dbName = 'PhantomScanDB';
        this.dbVersion = 2; // Upgrade版本以支持JSScript存储
        this.db = null;
        this.storeName = 'scanResults';
    }

    /**
     * InitializeDatabase
     */
    async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB 打开Failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                //console.log('✅ IndexedDB InitializeSuccess');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB Upgrade中...');

                // CreateScan resultsObject存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // CreateIndex
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    //console.log('✅ Scan resultsObject存储AndIndexCreateSuccess');
                }

                // CreateJSScriptObject存储
                if (!db.objectStoreNames.contains('jsScripts')) {
                    const jsStore = db.createObjectStore('jsScripts', { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // CreateIndex
                    jsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('✅ JSScriptObject存储AndIndexCreateSuccess');
                }
            };
        });
    }

    /**
     * Generate存储Key
     */
    generateStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // Only使用Domain作为Key，Ensure同一Domain下的所有Page共享存储
            const key = urlObj.hostname;
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('Generate存储KeyFailed:', error);
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }

    /**
     * SaveScan results
     */
    async saveScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url);
            
            // 使用传入的sourceUrl，如果No则使用urlParameter
            const actualSourceUrl = sourceUrl || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            const currentTime = new Date().toISOString();
            
            // Convert普通Scan resultsFormat，EnsureEvery个Project都有sourceUrl字段
            const transformedResults = {};
            
            if (results && typeof results === 'object') {
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        // 将数Group中的Every个字符串Convert为包含sourceUrl的Object
                        transformedResults[key] = value.map(item => {
                            if (typeof item === 'string') {
                                return {
                                    value: item,
                                    sourceUrl: actualSourceUrl,
                                    extractedAt: currentTime,
                                    pageTitle: actualPageTitle
                                };
                            } else if (typeof item === 'object' && item !== null) {
                                // 如果Already经是Object，Ensure包含必要字段
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
                        // 非数GroupData保持原样
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
                    //console.log(`✅ Scan resultsAlreadySave to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ SaveScan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBSave操作Failed:', error);
            throw error;
        }
    }

    /**
     * ReadScan results
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
                        //console.log(`✅ Load from IndexedDBScan results: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDB中Not foundData: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ ReadScan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBRead操作Failed:', error);
            throw error;
        }
    }

    /**
     * DeleteScan results
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
                    console.log(`✅ AlreadyfromIndexedDBDeleteScan results: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ DeleteScan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBDelete操作Failed:', error);
            throw error;
        }
    }

    /**
     * Get所有Scan results（Used forData管理）
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
                    console.log(`✅ Get所有Scan results，共 ${results.length} 条Record`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ Get所有Scan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBGet所有Data操作Failed:', error);
            throw error;
        }
    }

    /**
     * 按DomainGetScan results
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
                    console.log(`✅ GetDomain ${domain} 的Scan results，共 ${results.length} 条Record`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 按DomainGetScan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB按DomainQuery操作Failed:', error);
            throw error;
        }
    }

    /**
     * Clear所有Scan results
     */
    async clearAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ Cleared所有IndexedDBScan results');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ ClearScan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBClear操作Failed:', error);
            throw error;
        }
    }

    /**
     * GetDatabaseStatisticsInformation
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
                // CalculateData大小（近似）
                stats.totalDataSize = allResults.reduce((size, record) => {
                    return size + JSON.stringify(record).length;
                }, 0);

                // Found最老And最新的Record
                const timestamps = allResults.map(r => r.timestamp).sort((a, b) => a - b);
                stats.oldestRecord = new Date(timestamps[0]);
                stats.newestRecord = new Date(timestamps[timestamps.length - 1]);
            }

            return stats;
            
        } catch (error) {
            console.error('❌ GetIndexedDBStatisticsInformationFailed:', error);
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
     * Save深度Scan results
     */
    async saveDeepScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__deep';
            
            // GetSourceURLAndPage标题 - Fix深度ScanDisplay"Not知"的问题
            const actualSourceUrl = sourceUrl || window.location.href || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: results,
                sourceUrl: actualSourceUrl,  // AddSourceURLInformation
                pageTitle: actualPageTitle,  // AddPage标题Information
                extractedAt: new Date().toISOString(),  // AddExtractTime
                type: 'deepScan',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ 深度Scan resultsAlreadySave to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    //console.error('❌ Save深度Scan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBSave深度Scan resultsFailed:', error);
            throw error;
        }
    }

    /**
     * Read深度Scan results
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
                        //console.log(`✅ Load from IndexedDB深度Scan results: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDB中Not found深度ScanData: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ Read深度Scan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBRead深度Scan resultsFailed:', error);
            throw error;
        }
    }

    /**
     * Save深度ScanStatus
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
                    //console.log(`✅ 深度ScanStatusAlreadySave to IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ Save深度ScanStatusFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBSave深度ScanStatusFailed:', error);
            throw error;
        }
    }

    /**
     * Read深度ScanStatus
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
                        //console.log(`✅ Load from IndexedDB深度ScanStatus: ${storageKey}`);
                        resolve(result.state || {});
                    } else {
                        console.log(`📭 IndexedDB中Not found深度ScanStatus: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    //console.error('❌ Read深度ScanStatusFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDBRead深度ScanStatusFailed:', error);
            throw error;
        }
    }

    /**
     * Delete深度ScanRelatedData
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
            console.log(`✅ AlreadyfromIndexedDBDelete深度ScanData: ${baseKey}`);
            return true;
            
        } catch (error) {
            console.error('❌ IndexedDBDelete深度ScanDataFailed:', error);
            throw error;
        }
    }

    /**
     * Get所有深度ScanStatus
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
                    // Filter出深度ScanStatus（以__state结尾的Key）
                    const deepScanStates = allData
                        .filter(item => item.id && item.id.endsWith('__state') && item.type === 'deepScanState')
                        .map(item => item.state)
                        .filter(state => state && state.baseUrl)
                        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // 按Time排序
                    
                    console.log(`📖 Get所有深度ScanStatus: Found ${deepScanStates.length} 个Configuration`);
                    resolve(deepScanStates);
                };
                request.onerror = () => {
                    console.error('❌ Get所有深度ScanStatusFailed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Get所有深度ScanStatusFailed:', error);
            return [];
        }
    }

    // ==================== JSScript存储RelatedMethod ====================
    
    /**
     * SaveJSScript列Table
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
                    console.log('✅ JSScriptSaveSuccess，共', scripts.length, '个Script');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JSScriptSaveFailed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JSScriptSaveFailed:', error);
            throw error;
        }
    }

    /**
     * LoadJSScript列Table
     */
    async loadJSScripts() {
        try {
            //console.log('[IndexedDBManager] StartLoadJSScript...');
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readonly');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.get('savedScripts');
                
                request.onsuccess = () => {
                    const result = request.result;
                    //console.log('[IndexedDBManager] 原始QueryResult:', result);
                    
                    if (result && result.scripts) {
                        //console.log('✅ JSScriptLoadSuccess，共', result.scripts.length, '个Script');
                        //console.log('[IndexedDBManager] Script详情:', result.scripts.map(s => ({ name: s.name, isPreset: s.isPreset, id: s.id })));
                        resolve(result.scripts);
                    } else {
                        console.log('📭 IndexedDB中Not foundJSScriptData，ReturnEmpty数Group');
                        resolve([]);
                    }
                };
                request.onerror = () => {
                    console.error('❌ JSScriptLoadFailed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JSScriptLoadFailed:', error);
            return [];
        }
    }

    /**
     * Delete所有JSScript
     */
    async clearJSScripts() {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.delete('savedScripts');
                
                request.onsuccess = () => {
                    console.log('✅ JSScript清除Success');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JSScript清除Failed:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JSScript清除Failed:', error);
            throw error;
        }
    }

    /**
     * Get最近的Scan results
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
                    // 按Time戳排序，最新的在Before
                    const sortedResults = results.sort((a, b) => {
                        const timeA = new Date(a.extractedAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.extractedAt || b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // 限制Return数量
                    const limitedResults = sortedResults.slice(0, limit);
                    resolve(limitedResults);
                };
                
                request.onerror = () => {
                    console.error('❌ Get最近Scan resultsFailed:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ Get最近Scan results操作Failed:', error);
            return [];
        }
    }

    /**
     * CloseDatabaseConnection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ IndexedDBConnectionAlreadyClose');
        }
    }
}

// Create全局实例
const indexedDBManager = new IndexedDBManager();

// Export实例，使其Can像静态Method一样调用
window.IndexedDBManager = indexedDBManager;