# API 文档

AnesGuardian 系统 API 接口文档。

## 📋 目录

- [基础信息](#基础信息)
- [患者管理](#患者管理)
- [风险评估](#风险评估)
- [药物相互作用](#药物相互作用)
- [医疗记录](#医疗记录)
- [AI 问答](#ai-问答)
- [错误处理](#错误处理)

---

## 🔧 基础信息

### Base URL

```
开发环境: http://localhost:5000
生产环境: https://your-domain.com
```

### 认证

当前版本不需要认证。未来版本将支持 JWT 认证。

### 响应格式

所有 API 响应均为 JSON 格式。

**成功响应：**
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 👤 患者管理

### 获取所有患者

```http
GET /api/patients
```

**响应：**
```json
[
  {
    "id": 1,
    "name": "张三",
    "age": 65,
    "gender": "男",
    "surgeryType": "腹腔镜胆囊切除术",
    "asaClass": "II",
    "medicalHistory": ["高血压", "糖尿病"],
    "medications": ["阿司匹林", "二甲双胍"],
    "allergies": ["青霉素"],
    "vitalSigns": {
      "bloodPressure": "140/90",
      "heartRate": 78
    },
    "labResults": {},
    "createdAt": "2025-07-11T10:00:00.000Z"
  }
]
```

### 获取单个患者

```http
GET /api/patients/:id
```

**参数：**
- `id` (number): 患者ID

**响应：**
```json
{
  "id": 1,
  "name": "张三",
  "age": 65,
  // ... 其他字段
}
```

### 创建患者

```http
POST /api/patients
```

**请求体：**
```json
{
  "name": "张三",
  "age": 65,
  "gender": "男",
  "surgeryType": "腹腔镜胆囊切除术",
  "asaClass": "II",
  "medicalHistory": ["高血压", "糖尿病"],
  "medications": ["阿司匹林", "二甲双胍"],
  "allergies": ["青霉素"],
  "vitalSigns": {
    "bloodPressure": "140/90",
    "heartRate": 78,
    "temperature": 36.5,
    "respiratoryRate": 16
  },
  "labResults": {
    "hemoglobin": 120,
    "glucose": 6.5
  }
}
```

**响应：**
```json
{
  "id": 1,
  "name": "张三",
  // ... 完整患者信息
}
```

### 更新患者

```http
PUT /api/patients/:id
```

**参数：**
- `id` (number): 患者ID

**请求体：** 与创建患者相同，所有字段可选

**响应：** 更新后的患者信息

### 删除患者

```http
DELETE /api/patients/:id
```

**参数：**
- `id` (number): 患者ID

**响应：**
```json
{
  "success": true,
  "message": "患者删除成功"
}
```

---

## 🤖 风险评估

### 创建评估

```http
POST /api/assessments
```

**请求体：**
```json
{
  "patientId": 1
}
```

**响应：**
```json
{
  "id": 1,
  "patientId": 1,
  "status": "in_progress",
  "overallRisk": null,
  "riskFactors": [],
  "drugInteractions": [],
  "clinicalGuidelines": [],
  "recommendations": [],
  "agentStatus": {
    "orchestrator": {
      "name": "协调器代理",
      "status": "active",
      "progress": 0,
      "lastAction": "初始化评估"
    }
  },
  "createdAt": "2025-07-11T10:00:00.000Z"
}
```

### 获取评估结果

```http
GET /api/assessments/:id
```

**参数：**
- `id` (number): 评估ID

**响应：**
```json
{
  "id": 1,
  "patientId": 1,
  "status": "completed",
  "overallRisk": "medium",
  "riskFactors": [
    {
      "type": "cardiovascular",
      "level": "medium",
      "description": "高血压，Goldman评分II级",
      "score": 2,
      "recommendations": [
        "术前血压控制在140/90以下",
        "准备降压药物"
      ]
    }
  ],
  "drugInteractions": [
    {
      "id": "1",
      "drugs": ["阿司匹林", "丙泊酚"],
      "severity": "moderate",
      "description": "可能增加出血风险",
      "recommendations": [
        "术前7天停用阿司匹林",
        "术中注意凝血功能监测"
      ]
    }
  ],
  "clinicalGuidelines": [
    {
      "id": "1",
      "title": "高血压患者围术期管理指南",
      "organization": "中华医学会麻醉学分会",
      "year": 2023,
      "relevance": "high",
      "summary": "...",
      "recommendations": [...]
    }
  ],
  "recommendations": [
    "术前优化血压控制",
    "准备降压药物",
    "术中密切监测血压"
  ],
  "agentStatus": { ... },
  "createdAt": "2025-07-11T10:00:00.000Z",
  "completedAt": "2025-07-11T10:05:00.000Z"
}
```

### 获取患者的所有评估

```http
GET /api/assessments/patient/:patientId
```

**参数：**
- `patientId` (number): 患者ID

**响应：** 评估列表数组

### 重置评估

```http
POST /api/assessments/:id/reset
```

**参数：**
- `id` (number): 评估ID

**响应：**
```json
{
  "success": true,
  "message": "评估已重置"
}
```

---

## 💊 药物相互作用

### 搜索药物

```http
GET /api/drugs/search?q=阿司匹林
```

**查询参数：**
- `q` (string): 搜索关键词

**响应：**
```json
[
  {
    "id": 1,
    "name": "阿司匹林",
    "aliases": ["Aspirin", "乙酰水杨酸"],
    "category": "抗血小板药物",
    "stopGuideline": "术前7天停用",
    "contraindications": ["活动性消化道出血", "血小板减少"],
    "sideEffects": ["胃肠道反应", "出血倾向"]
  }
]
```

### 分析药物相互作用

```http
POST /api/drugs/interactions
```

**请求体：**
```json
{
  "drugs": ["阿司匹林", "氯吡格雷", "丙泊酚"]
}
```

**响应：**
```json
{
  "interactions": [
    {
      "id": "1",
      "drugs": ["阿司匹林", "氯吡格雷"],
      "severity": "major",
      "summary": "双重抗血小板作用",
      "description": "两药联用显著增加出血风险",
      "recommendations": [
        "术前至少7天停用",
        "评估血栓风险",
        "术中备血"
      ]
    }
  ],
  "summary": {
    "total": 1,
    "major": 1,
    "moderate": 0,
    "minor": 0
  }
}
```

### 获取药物详细分析

```http
POST /api/drugs/detailed-analysis
```

**请求体：**
```json
{
  "drug1": "阿司匹林",
  "drug2": "丙泊酚"
}
```

**响应：**
```json
{
  "exists": true,
  "details": {
    "药物相互作用": "阿司匹林可能增强丙泊酚的镇静作用",
    "严重程度": "中度",
    "机制": "药效学相互作用",
    "临床意义": "可能需要调整丙泊酚剂量",
    "监测建议": [
      "密切监测镇静深度",
      "调整药物剂量"
    ],
    "处理措施": [
      "考虑减少丙泊酚初始剂量",
      "监测血压和呼吸"
    ]
  }
}
```

### 获取所有药物

```http
GET /api/drugs
```

**响应：** 所有药物列表

---

## 📄 医疗记录

### 上传并分析医疗记录

```http
POST /api/medical-reports/analyze
```

**Content-Type:** `multipart/form-data`

**表单字段：**
- `image` (file): 医疗记录图片（JPG, PNG, PDF）
- `patientId` (number, optional): 患者ID
- `reportType` (string, optional): 报告类型

**响应：**
```json
{
  "extractedText": "患者：张三\n年龄：65岁\n诊断：高血压、糖尿病...",
  "analyzedData": {
    "patientInfo": {
      "name": "张三",
      "age": 65
    },
    "diagnosis": ["高血压", "糖尿病"],
    "medications": ["阿司匹林", "二甲双胍"],
    "surgeryInfo": {
      "type": "腹腔镜胆囊切除术"
    }
  },
  "riskFactors": ["心血管风险", "代谢风险"],
  "recommendations": [
    "术前优化血糖控制",
    "术前停用阿司匹林"
  ]
}
```

### 获取患者的医疗记录

```http
GET /api/medical-reports/patient/:patientId
```

**参数：**
- `patientId` (number): 患者ID

**响应：** 医疗记录列表

---

## 💬 AI 问答

### 发送问题

```http
POST /api/ai/ask
```

**请求体：**
```json
{
  "question": "高血压患者围术期应该注意什么？",
  "context": {
    "patientAge": 65,
    "medicalHistory": ["高血压", "糖尿病"]
  }
}
```

**响应：**
```json
{
  "answer": "高血压患者围术期管理要点：\n\n1. 术前评估...\n2. 药物管理...\n3. 监测要点...",
  "sources": [
    "中华医学会麻醉学分会高血压围术期管理指南"
  ],
  "confidence": 0.95
}
```

### 流式回答（WebSocket）

```javascript
const ws = new WebSocket('ws://localhost:5000/api/ai/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    question: "高血压患者围术期应该注意什么？"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.chunk); // 逐字显示
};
```

---

## 📊 代理日志

### 获取评估的代理日志

```http
GET /api/agent-logs/assessment/:assessmentId
```

**参数：**
- `assessmentId` (number): 评估ID

**响应：**
```json
[
  {
    "id": 1,
    "assessmentId": 1,
    "agentName": "风险评估代理",
    "action": "评估心血管风险",
    "status": "completed",
    "result": {
      "riskLevel": "medium",
      "goldmanScore": 2
    },
    "createdAt": "2025-07-11T10:02:00.000Z"
  }
]
```

---

## ⚠️ 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | AI 服务暂时不可用 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体字段",
    "message": "详细说明"
  }
}
```

### 常见错误代码

| 错误码 | 说明 |
|-------|------|
| `PATIENT_NOT_FOUND` | 患者不存在 |
| `ASSESSMENT_NOT_FOUND` | 评估不存在 |
| `INVALID_INPUT` | 输入数据无效 |
| `AI_SERVICE_ERROR` | AI 服务错误 |
| `DATABASE_ERROR` | 数据库错误 |
| `FILE_UPLOAD_ERROR` | 文件上传错误 |

---

## 📝 使用示例

### JavaScript/TypeScript

```typescript
// 创建患者
async function createPatient() {
  const response = await fetch('http://localhost:5000/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: '张三',
      age: 65,
      gender: '男',
      asaClass: 'II',
      medicalHistory: ['高血压', '糖尿病'],
      medications: ['阿司匹林'],
      allergies: [],
      vitalSigns: {},
      labResults: {}
    })
  });
  
  const patient = await response.json();
  return patient;
}

// 开始评估
async function startAssessment(patientId: number) {
  const response = await fetch('http://localhost:5000/api/assessments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patientId })
  });
  
  const assessment = await response.json();
  return assessment;
}

// 获取评估结果
async function getAssessment(id: number) {
  const response = await fetch(`http://localhost:5000/api/assessments/${id}`);
  const assessment = await response.json();
  return assessment;
}
```

### Python

```python
import requests

# 创建患者
def create_patient():
    url = 'http://localhost:5000/api/patients'
    data = {
        'name': '张三',
        'age': 65,
        'gender': '男',
        'asaClass': 'II',
        'medicalHistory': ['高血压', '糖尿病'],
        'medications': ['阿司匹林'],
        'allergies': [],
        'vitalSigns': {},
        'labResults': {}
    }
    
    response = requests.post(url, json=data)
    return response.json()

# 分析药物相互作用
def analyze_drug_interactions(drugs):
    url = 'http://localhost:5000/api/drugs/interactions'
    data = {'drugs': drugs}
    
    response = requests.post(url, json=data)
    return response.json()
```

---

## 🔄 变更日志

### v2.1.0 (2025-07-11)
- 添加智能重试机制
- 优化AI问答API
- 改进错误处理

### v2.0.0 (2025-07-06)
- 添加医疗记录分析API
- 多模态AI集成

### v1.0.0 (2025-06-20)
- 初始API版本

---

## 📞 支持

- 报告问题: [GitHub Issues](https://github.com/yourusername/AnesGuardian/issues)
- 邮箱: your-email@example.com

---

**API 版本: v2.1.0**




