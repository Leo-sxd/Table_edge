
# 豆包API调试指南

## 🔍 排查步骤

### 1. 检查浏览器控制台
- 按 F12 打开开发者工具
- 切换到 Console 标签
- 查看 [DoubaoAI] 开头的日志

### 2. 常见问题及解决方案

#### ❌ "Unauthorized" 或 "AuthenticationError"
**原因**：API密钥无效
**解决**：
1. 登录 https://console.volcengine.com/ark/region:ark+cn-beijing/apikey
2. 确认API密钥已创建且状态为"启用"
3. 复制完整的API密钥（以 ark- 开头）
4. 在网页中重新保存API密钥

#### ❌ "模型不存在" 或 404
**原因**：模型ID错误或模型未开通
**解决**：
1. 登录 https://console.volcengine.com/ark/region:ark+cn-beijing/model
2. 确认 "doubao-seed-2-0-pro-260215" 已开通
3. 如果没有，点击"开通服务"

#### ❌ "请求过于频繁" 或 429
**原因**：触发了频率限制
**解决**：等待几秒后重试

#### ❌ "CORS错误"
**原因**：浏览器跨域限制
**解决**：
1. 这是浏览器安全限制，无法在前端直接调用
2. 需要使用后端代理或配置CORS

### 3. 验证API密钥

在浏览器控制台执行：
```javascript
fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 你的API密钥'
  },
  body: JSON.stringify({
    model: 'doubao-seed-2-0-pro-260215',
    input: [{ role: 'user', content: [{ type: 'input_text', text: '你好' }] }]
  })
}).then(r => r.json()).then(d => console.log(d))
```

### 4. 检查网络连接
- 确保能访问 https://ark.cn-beijing.volces.com
- 如果使用VPN/代理，可能需要关闭

## 📞 如果仍有问题

1. 截图浏览器控制台的错误日志
2. 提供API密钥前10位（不要提供完整密钥）
3. 描述具体操作步骤
