/**
 * SRC Miner 模块化功能测试脚本
 * 用于验证所有模块是否正常工作
 */

// 测试配置
const TEST_CONFIG = {
    testUrl: 'https://example.com',
    testTimeout: 5000,
    verbose: true
};

class ModularityTester {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }
    
    // 运行所有测试
    async runAllTests() {
        console.log('🚀 开始模块化功能测试...\n');
        
        // 测试模块加载
        await this.testModuleLoading();
        
        // 测试核心功能
        await this.testCoreFunctionality();
        
        // 测试扫描器模块
        await this.testScannerModules();
        
        // 测试UI模块
        await this.testUIModules();
        
        // 测试工具模块
        await this.testUtilityModules();
        
        // 输出测试结果
        this.outputResults();
    }
    
    // 测试模块加载
    async testModuleLoading() {
        console.log('📦 测试模块加载...');
        
        const modules = [
            'ContentExtractor',
            'PatternExtractor', 
            'BasicScanner',
            'DeepScanner',
            'DisplayManager',
            'ApiTester',
            'ExportManager',
            'SRCMiner'
        ];
        
        for (const moduleName of modules) {
            try {
                const moduleExists = typeof window[moduleName] !== 'undefined';
                this.addTestResult(`模块加载: ${moduleName}`, moduleExists, 
                    moduleExists ? '✅ 模块已加载' : '❌ 模块未找到');
            } catch (error) {
                this.addTestResult(`模块加载: ${moduleName}`, false, `❌ 加载错误: ${error.message}`);
            }
        }
    }
    
    // 测试核心功能
    async testCoreFunctionality() {
        console.log('\n🎯 测试核心功能...');
        
        try {
            // 测试SRCMiner实例化
            const srcMiner = new SRCMiner();
            this.addTestResult('SRCMiner实例化', true, '✅ 成功创建实例');
            
            // 测试基本属性
            const hasResults = typeof srcMiner.results === 'object';
            this.addTestResult('结果对象初始化', hasResults, hasResults ? '✅ 结果对象已初始化' : '❌ 结果对象未初始化');
            
            // 测试方法存在性
            const methods = ['init', 'startScan', 'displayResults', 'saveResults', 'loadResults'];
            for (const method of methods) {
                const methodExists = typeof srcMiner[method] === 'function';
                this.addTestResult(`方法存在: ${method}`, methodExists, 
                    methodExists ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
        } catch (error) {
            this.addTestResult('SRCMiner核心功能', false, `❌ 错误: ${error.message}`);
        }
    }
    
    // 测试扫描器模块
    async testScannerModules() {
        console.log('\n🔍 测试扫描器模块...');
        
        try {
            const srcMiner = new SRCMiner();
            
            // 测试BasicScanner
            if (srcMiner.basicScanner) {
                const hasStartScan = typeof srcMiner.basicScanner.startScan === 'function';
                this.addTestResult('BasicScanner.startScan', hasStartScan, 
                    hasStartScan ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
            // 测试DeepScanner
            if (srcMiner.deepScanner) {
                const hasToggleDeepScan = typeof srcMiner.deepScanner.toggleDeepScan === 'function';
                this.addTestResult('DeepScanner.toggleDeepScan', hasToggleDeepScan, 
                    hasToggleDeepScan ? '✅ 方法存在' : '❌ 方法不存在');
                
                const hasStartDeepScan = typeof srcMiner.deepScanner.startDeepScan === 'function';
                this.addTestResult('DeepScanner.startDeepScan', hasStartDeepScan, 
                    hasStartDeepScan ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
            // 测试ContentExtractor
            if (typeof ContentExtractor !== 'undefined') {
                const extractor = new ContentExtractor();
                const hasExtractSensitiveInfo = typeof extractor.extractSensitiveInfo === 'function';
                this.addTestResult('ContentExtractor.extractSensitiveInfo', hasExtractSensitiveInfo, 
                    hasExtractSensitiveInfo ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
            // 测试PatternExtractor
            if (typeof PatternExtractor !== 'undefined') {
                const extractor = new PatternExtractor();
                const hasExtractAPIs = typeof extractor.extractAPIs === 'function';
                this.addTestResult('PatternExtractor.extractAPIs', hasExtractAPIs, 
                    hasExtractAPIs ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
        } catch (error) {
            this.addTestResult('扫描器模块测试', false, `❌ 错误: ${error.message}`);
        }
    }
    
    // 测试UI模块
    async testUIModules() {
        console.log('\n🎨 测试UI模块...');
        
        try {
            const srcMiner = new SRCMiner();
            
            // 测试DisplayManager
            if (srcMiner.displayManager) {
                const hasDisplayResults = typeof srcMiner.displayManager.displayResults === 'function';
                this.addTestResult('DisplayManager.displayResults', hasDisplayResults, 
                    hasDisplayResults ? '✅ 方法存在' : '❌ 方法不存在');
                
                const hasCreateCategoryDiv = typeof srcMiner.displayManager.createCategoryDiv === 'function';
                this.addTestResult('DisplayManager.createCategoryDiv', hasCreateCategoryDiv, 
                    hasCreateCategoryDiv ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
            // 测试导航功能
            const navTabs = document.querySelectorAll('.nav-tab');
            this.addTestResult('导航标签存在', navTabs.length > 0, 
                navTabs.length > 0 ? `✅ 找到 ${navTabs.length} 个导航标签` : '❌ 未找到导航标签');
            
            // 测试页面切换
            const pages = document.querySelectorAll('.page');
            this.addTestResult('页面元素存在', pages.length > 0, 
                pages.length > 0 ? `✅ 找到 ${pages.length} 个页面` : '❌ 未找到页面元素');
            
        } catch (error) {
            this.addTestResult('UI模块测试', false, `❌ 错误: ${error.message}`);
        }
    }
    
    // 测试工具模块
    async testUtilityModules() {
        console.log('\n🔧 测试工具模块...');
        
        try {
            const srcMiner = new SRCMiner();
            
            // 测试ApiTester
            if (srcMiner.apiTester) {
                const hasBatchRequestTest = typeof srcMiner.apiTester.batchRequestTest === 'function';
                this.addTestResult('ApiTester.batchRequestTest', hasBatchRequestTest, 
                    hasBatchRequestTest ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
            // 测试ExportManager
            if (srcMiner.exportManager) {
                const hasExportResults = typeof srcMiner.exportManager.exportResults === 'function';
                this.addTestResult('ExportManager.exportResults', hasExportResults, 
                    hasExportResults ? '✅ 方法存在' : '❌ 方法不存在');
                
                const hasExportToJSON = typeof srcMiner.exportManager.exportToJSON === 'function';
                this.addTestResult('ExportManager.exportToJSON', hasExportToJSON, 
                    hasExportToJSON ? '✅ 方法存在' : '❌ 方法不存在');
            }
            
        } catch (error) {
            this.addTestResult('工具模块测试', false, `❌ 错误: ${error.message}`);
        }
    }
    
    // 添加测试结果
    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed: passed,
            message: message
        });
        
        if (passed) {
            this.passedTests++;
        } else {
            this.failedTests++;
        }
        
        if (TEST_CONFIG.verbose) {
            console.log(`  ${message}`);
        }
    }
    
    // 输出测试结果
    outputResults() {
        console.log('\n📊 测试结果汇总:');
        console.log('='.repeat(50));
        console.log(`✅ 通过: ${this.passedTests} 个测试`);
        console.log(`❌ 失败: ${this.failedTests} 个测试`);
        console.log(`📈 成功率: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.name}: ${result.message}`);
            });
        }
        
        console.log('\n🎉 模块化测试完成!');
        
        // 在页面上显示结果
        this.displayResultsOnPage();
    }
    
    // 在页面上显示测试结果
    displayResultsOnPage() {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #00d4aa; margin-bottom: 15px;">🧪 模块化测试结果</h3>
                    <div style="margin-bottom: 15px;">
                        <div style="color: #00d4aa;">✅ 通过: ${this.passedTests} 个</div>
                        <div style="color: #ff4757;">❌ 失败: ${this.failedTests} 个</div>
                        <div style="color: #fff; margin-top: 10px;">
                            成功率: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #888; line-height: 1.5;">
                        ${this.failedTests === 0 ? 
                            '🎉 所有模块功能正常！' : 
                            '⚠️ 部分功能需要修复，请查看控制台详情'
                        }
                    </div>
                </div>
            `;
        }
    }
}

// 页面加载完成后运行测试
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const tester = new ModularityTester();
        tester.runAllTests();
    }, 1000);
});