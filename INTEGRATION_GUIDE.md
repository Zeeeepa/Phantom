# 🚀 Phantom + Packer-InfoFinder Integration Guide

## 📌 Overview

This integration combines **Phantom's real-time browser-based scanning** with **Packer-InfoFinder's deep JavaScript analysis** to create the ultimate SRC hunting platform.

### Architecture

```
┌─────────────────────────────────────┐
│   PHANTOM BROWSER EXTENSION         │
│   (Chrome/Edge)                     │
│                                     │
│  ├─ Real-time scanning              │
│  ├─ API testing                     │
│  ├─ JS hook injection               │
│  └─ PackerBridge.js  ←─────┐       │
└─────────────────────────────────────┘
                              │
                              │ HTTP REST API
                              │ (localhost:8765)
                              │
┌─────────────────────────────────────┐
│   PACKER-INFOFINDER BACKEND         │
│   (Python FastAPI Server)           │
│                                     │
│  ├─ Webpack chunk discovery         │
│  ├─ AST parsing (esprima)           │
│  ├─ Deno VM execution               │
│  ├─ Secret scanning                 │
│  └─ Report generation               │
└─────────────────────────────────────┘
```

---

## 🛠️ Installation & Setup

### Step 1: Install Phantom Extension

1. Clone the EnhancedPacker branch:
   ```bash
   git clone -b EnhancedPacker https://github.com/Zeeeepa/Phantom.git
   cd Phantom
   ```

2. Load extension in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `Phantom` directory

### Step 2: Setup Packer Backend

1. Navigate to backend directory:
   ```bash
   cd packer-backend/Packer-InfoFinder\(v1.0\)
   ```

2. Install Python dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```

3. Start the API server:
   ```bash
   cd ..
   python packer_api.py --host 127.0.0.1 --port 8765
   ```

   You should see:
   ```
   ╔═══════════════════════════════════════════════╗
   ║   Packer-InfoFinder API Server                ║
   ║   Version: 1.0.0                              ║
   ║   Host: 127.0.0.1:8765                        ║
   ║   API Key Required: False                     ║
   ╚═══════════════════════════════════════════════╝
   
   INFO:     Started server process
   INFO:     Uvicorn running on http://127.0.0.1:8765
   ```

### Step 3: Configure Phantom

1. Open Phantom extension (click toolbar icon)
2. Go to **Settings** tab
3. Scroll to **"Packer-InfoFinder 集成"** section
4. Configure:
   - ✅ Enable checkbox: **启用Packer深度分析**
   - API Endpoint: `http://localhost:8765`
   - API Key: (leave empty unless you set one)
5. Click **"测试连接"** to verify
6. Click **"保存配置"**

---

## 🎯 Usage

### Basic Workflow

1. **Browse to target website**
   ```
   Navigate to any website you want to analyze
   Example: https://example.com
   ```

2. **Run basic Phantom scan**
   - Click Phantom extension icon
   - Click **"开始扫描"** button
   - Review initial results (APIs, secrets, etc.)

3. **Run Packer deep analysis**
   - Click **"🚀 Packer深度分析"** button
   - Wait for analysis to complete (15-60 seconds)
   - View comprehensive results

### What Packer Analysis Does

1. **Downloads all JavaScript files** from the page
2. **Detects bundler usage** (Webpack, Rollup, etc.)
3. **Reconstructs code chunks** using AST parsing
4. **Discovers hidden modules** loaded dynamically
5. **Scans everything for secrets** (API keys, tokens, credentials)
6. **Returns detailed report** with findings

---

## 📊 API Endpoints Reference

### Health Check
```http
GET http://localhost:8765/health
```

Response:
```json
{
  "status": "healthy",
  "active_scans": 0,
  "max_concurrent": 5
}
```

### Analyze URL
```http
POST http://localhost:8765/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "mode": "full",
  "cookie": "session=abc123",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

Response:
```json
{
  "scan_id": "a3f9x2p1",
  "result": {
    "success": true,
    "url": "https://example.com",
    "timestamp": "2025-01-22T10:30:00Z",
    "tag": "b4c7e9",
    "results": {
      "has_results": true,
      "finder_report": "/path/to/report.html"
    }
  }
}
```

### Batch Analysis
```http
POST http://localhost:8765/batch
Content-Type: application/json

{
  "urls": [
    "https://example1.com",
    "https://example2.com"
  ],
  "mode": "full"
}
```

### Get Scan Result
```http
GET http://localhost:8765/scan/{scan_id}
```

### List All Scans
```http
GET http://localhost:8765/scans
```

### Delete Scan
```http
DELETE http://localhost:8765/scan/{scan_id}
```

---

## 🔒 Security Configuration

### Optional API Key Authentication

1. Start server with API key:
   ```bash
   python packer_api.py --api-key "your-secret-key-here"
   ```

2. Configure in Phantom:
   - Open Settings → Packer Integration
   - Enter API key in **"API密钥"** field
   - Save configuration

### Rate Limiting

The server has built-in limits:
- **Max concurrent scans**: 5
- **Timeout per scan**: 5 minutes
- Returns `429 Too Many Requests` when exceeded

---

## 📁 File Structure

```
Phantom/
├── src/
│   ├── api/
│   │   ├── PackerBridge.js        # Bridge to backend API
│   │   ├── ApiTester.js           # Existing API tester
│   │   └── TestWindow.js
│   ├── ui/
│   │   ├── PackerIntegrationUI.js # Packer UI components
│   │   ├── DisplayManager.js
│   │   └── ExportManager.js
│   ├── scanner/
│   ├── core/
│   └── utils/
├── packer-backend/
│   ├── packer_api.py              # FastAPI server
│   ├── requirements.txt           # Python dependencies
│   ├── api_results/               # Scan results storage
│   └── Packer-InfoFinder(v1.0)/  # Original tool
│       ├── Packer-InfoFinder.py
│       ├── lib/
│       └── ...
├── manifest.json                  # Extension manifest
└── INTEGRATION_GUIDE.md          # This file
```

---

## 🔧 Advanced Configuration

### Custom Python Path

If you need to use a specific Python environment:

```bash
# Using virtualenv
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

pip install -r packer-backend/requirements.txt
python packer-backend/packer_api.py
```

### Custom Port

```bash
python packer_api.py --port 9000
```

Then update Phantom settings:
- API Endpoint: `http://localhost:9000`

### Remote Backend (Not Recommended)

⚠️ **Security Warning**: Only use on trusted networks

```bash
# Start server on all interfaces
python packer_api.py --host 0.0.0.0 --port 8765 --api-key "secure-key"
```

Update Phantom:
- API Endpoint: `http://your-server-ip:8765`
- API Key: `secure-key`

---

## 🐛 Troubleshooting

### Connection Failed

**Problem**: "❌ 连接失败: Failed to connect"

**Solutions**:
1. Verify backend is running:
   ```bash
   curl http://localhost:8765/health
   ```

2. Check firewall settings

3. Try different port:
   ```bash
   python packer_api.py --port 9000
   ```

### Analysis Timeout

**Problem**: Analysis takes too long or times out

**Solutions**:
1. Check backend logs for errors
2. Reduce scan depth
3. Check target website accessibility

### Missing Dependencies

**Problem**: "ModuleNotFoundError: No module named 'fastapi'"

**Solution**:
```bash
cd packer-backend
pip install -r requirements.txt
```

### CORS Errors

**Problem**: Browser blocks requests

**Solution**: The backend already includes CORS headers. If still blocked:
1. Check browser console for specific error
2. Verify endpoint URL is correct
3. Try using `127.0.0.1` instead of `localhost`

---

## 📈 Performance Tips

### For Large Sites

1. Use Phantom's basic scan first
2. Review results before Packer analysis
3. Packer analysis can take 30-120 seconds for complex SPAs

### Batch Analysis

Instead of analyzing one-by-one:

```javascript
// Use batch endpoint
const urls = ['url1', 'url2', 'url3'];
const result = await packerBridge.batchAnalyze(urls);
```

### Result Caching

Results are cached in `packer-backend/api_results/`:
- Reuse scan IDs for repeat analyses
- Periodically clean old results

---

## 🎓 Development

### Modifying the Backend

1. Edit `packer-backend/packer_api.py`
2. Restart server (auto-reload available):
   ```bash
   python packer_api.py --reload
   ```

### Adding New Endpoints

```python
@app.post("/custom-endpoint")
async def custom_analysis(request: CustomRequest):
    # Your logic here
    return {"result": "data"}
```

### Debugging

Enable detailed logs:
```bash
python packer_api.py --log-level debug
```

---

## 🤝 Contributing

Improvements welcome! Focus areas:
- Enhanced chunk discovery algorithms
- Better error handling
- UI improvements
- Additional analysis modes

---

## 📝 License

Same as Phantom and Packer-InfoFinder (see respective LICENSE files)

---

## 🙏 Credits

- **Phantom**: Original browser extension
- **Packer-InfoFinder**: Deep JS analysis tool
- **Integration**: Combines both platforms

---

## 📞 Support

For issues:
1. Check this guide's Troubleshooting section
2. Review backend logs
3. Check browser console
4. Open GitHub issue with details

---

**Happy Hunting! 🎯🔍**

