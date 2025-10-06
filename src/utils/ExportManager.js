/**
 * Export管理器 - 负责Result的Export功能
 */
class ExportManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    exportResults() {
        if (Object.keys(this.srcMiner.results).length === 0) {
            alert('NoData可Export');
            return;
        }
        
        this.showExportModal();
    }
    
    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Add事件Listen器（如果还NoAdd）
            if (!this.modalListenersAdded) {
                this.addModalListeners();
                this.modalListenersAdded = true;
            }
        }
    }
    
    hideExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    addModalListeners() {
        // Close按钮
        const closeBtn = document.getElementById('closeExportModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExportModal());
        }
        
        // JSONExport按钮
        const jsonBtn = document.getElementById('exportJSON');
        if (jsonBtn) {
            jsonBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToJSON();
            });
        }
        
        // XLSExport按钮
        const xlsBtn = document.getElementById('exportCSV');
        if (xlsBtn) {
            xlsBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToXLS();
            });
        }
        
        // Click弹窗外部Close
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'exportModal') {
                    this.hideExportModal();
                }
            });
        }
    }
    
    async exportToJSON() {
        const dataStr = JSON.stringify(this.srcMiner.results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const fileName = await this.generateFileName();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async exportToXLS() {
        // GenerateHTMLTable格Format的XLSFile（ExcelCanDirect打开）
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影工具</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D4EDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="URL">
   <Font ss:Color="#0066CC" ss:Underline="Single"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>`;

        // 为Every个CategoryCreate工作Table
        const categories = Object.keys(this.srcMiner.results);
        let hasData = false;

        // GetDisplayManager实例以使用getItemLocationInfoMethod
        const displayManager = this.srcMiner.displayManager;

        for (const category of categories) {
            const items = this.srcMiner.results[category];
            if (Array.isArray(items) && items.length > 0) {
                hasData = true;
                const sheetName = this.sanitizeSheetName(category);
                
                xlsContent += `
 <Worksheet ss:Name="${this.escapeXml(sheetName)}">
  <Table>
   <Column ss:Width="50"/>
   <Column ss:Width="400"/>
   <Column ss:Width="120"/>
   <Column ss:Width="350"/>
   <Column ss:Width="200"/>
   <Column ss:Width="150"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">序号</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Content</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">来SourceURL</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Result来Source</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ExtractTime</Data></Cell>
   </Row>`;

                // 为Every个ProjectGet位置Information
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    let locationInfo = {
                        sourceUrl: 'Not知来Source',
                        pageTitle: 'Not知Page',
                        extractedAt: new Date().toISOString()
                    };

                    // 尝试Get位置Information
                    try {
                        if (displayManager && typeof displayManager.getItemLocationInfo === 'function') {
                            locationInfo = await displayManager.getItemLocationInfo(category, item);
                        } else {
                            // 如果DisplayManager不Available，尝试DirectfromitemGetInformation
                            if (typeof item === 'object' && item !== null) {
                                locationInfo = {
                                    sourceUrl: item.sourceUrl || 'Not知来Source',
                                    pageTitle: item.pageTitle || 'Not知Page',
                                    extractedAt: item.extractedAt || new Date().toISOString()
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`[ExportManager] GetProject位置InformationFailed:`, error);
                    }

                    // GetProject的DisplayContent
                    const itemContent = typeof item === 'object' && item !== null ? 
                        (item.value || item.text || item.content || JSON.stringify(item)) : 
                        String(item);

                    // FormatExtractTime
                    const extractedTime = locationInfo.extractedAt ? 
                        new Date(locationInfo.extractedAt).toLocaleString('zh-CN') : 
                        'Not知Time';

                    xlsContent += `
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(itemContent)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(category)}</Data></Cell>
    <Cell ss:StyleID="URL"><Data ss:Type="String">${this.escapeXml(locationInfo.sourceUrl)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(locationInfo.pageTitle)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(extractedTime)}</Data></Cell>
   </Row>`;
                }

                xlsContent += `
  </Table>
 </Worksheet>`;
            }
        }

        // 如果NoData，Create一个Empty的工作Table
        if (!hasData) {
            xlsContent += `
 <Worksheet ss:Name="NoneData">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Prompt</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">NoFound任何Data</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // CreateAnd下载File
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const fileName = await this.generateFileName();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Clean工作Table名称（Excel工作Table名称有特殊字符限制）
    sanitizeSheetName(name) {
        // RemoveOrReplaceExcel不允许的字符
        let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
        // 限制长度（Excel工作Table名称最大31个字符）
        if (sanitized.length > 31) {
            sanitized = sanitized.substring(0, 28) + '...';
        }
        return sanitized || 'Not命名';
    }

    // GenerateFile名：Domain__随机数
    async generateFileName() {
        let domain = 'unknown';
        
        try {
            // 使用chrome.tabs APIGetCurrent活动标签页的Domain
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                domain = url.hostname;
                //console.log('Get到Domain:', domain);
            }
        } catch (e) {
            //console.log('GetDomainFailed，使用备选方案:', e);
            // 尝试fromDOMGetDomainInformation作为备选方案
            try {
                const domainElement = document.getElementById('currentDomain');
                if (domainElement && domainElement.textContent) {
                    const domainText = domainElement.textContent;
                    // ExtractDomain部分，Match protocol://domain:port Format
                    const match = domainText.match(/https?:\/\/([^\/\s:]+)/);
                    if (match && match[1]) {
                        domain = match[1];
                        //console.log('fromDOMGet到Domain:', domain);
                    }
                }
            } catch (domError) {
                //console.log('fromDOMGetDomain也Failed:', domError);
            }
        }
        
        // 如果仍然是unknown，使用Time戳作为标识
        if (domain === 'unknown') {
            domain = `scan_${Date.now()}`;
        }
        
        // CleanDomain，Remove特殊字符
        domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Generate随机数（6位）
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        
        return `${domain}__${randomNum}`;
    }

    // XML转义
    escapeXml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}