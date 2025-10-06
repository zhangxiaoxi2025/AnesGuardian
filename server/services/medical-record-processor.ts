import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";

// 初始化Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedMedicalData {
  anesthesiaRelevantHistory?: Array<{
    condition: string;
    details: string;
  }>;
  currentMedications?: Array<{
    drug: string;
    dosage: string;
    reason: string;
  }>;
  allergies?: {
    hasAllergies: boolean;
    details: string;
  };
  infectiousDiseases?: Array<{
    disease: string;
    status: string;
  }>;
  summary?: string;
  medications?: string[];
  rawText?: string;
  success: boolean;
  error?: string;
}

// 新的多模态图像分析函数
export async function processImageWithAI(imageBuffer: Buffer): Promise<ExtractedMedicalData> {
  try {
    console.log('🎯 开始使用Gemini多模态AI分析医疗记录图片...');
    
    // 将图片转换为base64格式
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/png'; // 默认PNG，也支持JPEG
    
    const prompt = `# 角色与目标
你是一名经验丰富、严谨细致的麻醉医生助理AI。你的核心任务是，从以下提供的病历图片中，精准提取并结构化总结所有与麻醉术前评估相关的信息。

# 核心指令
你必须严格遵循以下规则，确保提取信息的**准确性、相关性、**和**完整性**。

## 规则 1：信息提取范围 (Scope)

你必须严格按照以下清单筛选信息，清单以外的内容除非有明确的麻醉风险，否则一律忽略。

### A. 必须提取的病史 (Priority Conditions):
- **心血管系统**: 高血压、冠心病（心梗、支架史）、心律失常、心力衰竭、瓣膜病等。
- **呼吸系统**: 哮喘、慢性阻塞性肺病(COPD)、睡眠呼吸暂停综合征(OSAHS)等。
- **神经系统**: 脑卒中（脑梗、脑出血）、癫痫、帕金森病、重症肌无力等。
- **内分泌系统**: 糖尿病（及血糖控制情况）、甲状腺功能异常（甲亢/甲减）、肾上腺疾病等。
- **精神系统【特别重要】**: 
    - **必须提取**: 抑郁症、焦虑症、精神分裂症、双相情感障碍、失眠症等所有精神科疾病
    - **重要原因**: 精神科疾病及其用药（抗抑郁药、抗焦虑药、抗精神病药）与麻醉药物有重要相互作用，影响麻醉方案选择和围术期管理
    - **提取原则**: 无论病程长短（即使只有几天或几周），只要明确诊断就必须提取
    - **常见药物**: SSRI类（氟西汀、帕罗西汀、舍曲林等）、SNRI类（文拉法辛、度洛西汀等）、三环类（阿米替林等）、其他类（米氮平、氟哌嗪吨美利曲等）
- **肝肾功能**: 肝炎、肝硬化、肾功能不全、透析史等。
- **血液系统**: 贫血、凝血功能障碍等。
- **传染性疾病**: 乙肝、丙肝、艾滋病(HIV)、梅毒、结核等。
- **其他重要历史**:
    - **个人史**: 过敏史（药物、食物、其他）、手术史、麻醉史（及有无不良反应）。
    - **社会史**: 吸烟史（年限、数量）、饮酒史（年限、数量）。

### B. 必须忽略的内容 (Exclusion Criteria):
- **绝对忽略**: 与麻醉风险无直接关系的症状细节描述。
    - **【反例】**: "右上腹持续性隐痛，进食油腻食物后加重，自行控制饮食后可缓解。" -> **这是需要忽略的**。
    - **【正例】**: "胆囊结石伴慢性胆囊炎" -> **这是需要提取的最终诊断**。
- **谨慎处理**: 对于不确定的信息，如实记录，不要自行推断。

### C. 用药提取特别强调:
- **精神科用药【必须提取】**: 所有抗抑郁药、抗焦虑药、抗精神病药、镇静催眠药都必须完整提取
- **药物名称准确性【关键】**: 
    - 必须原样复制病历中的药物名称，不要擅自更改或简化
    - **常见精神科药物名称参考**（请准确识别，不要混淆）：
      * **氟哌嗪吨美利曲** (flupentixol melitracen，商品名：黛力新) - 抗抑郁复方制剂
      * **氟哌啶醇** (haloperidol) - 抗精神病药，与氟哌嗪吨美利曲完全不同
      * **氟西汀** (fluoxetine) - SSRI类抗抑郁药
      * **帕罗西汀** (paroxetine) - SSRI类抗抑郁药
      * **舍曲林** (sertraline) - SSRI类抗抑郁药
      * **文拉法辛** (venlafaxine) - SNRI类抗抑郁药
      * **米氮平** (mirtazapine) - 抗抑郁药
- **剂量和用法**: 尽可能提取具体剂量和服用频率
- **用药原因**: 明确标注是用于治疗什么疾病

### D. 强制逻辑规则【必须遵守】:
1. **疾病-用药一致性规则**: 如果在currentMedications中某药物的reason字段提到某疾病（例如"治疗抑郁症"），该疾病**必须**同时出现在anesthesiaRelevantHistory中作为独立条目
2. **精神科疾病独立条目规则**: 所有精神科疾病（抑郁症、焦虑症等）必须作为独立的病史条目在anesthesiaRelevantHistory中明确列出，不能仅在用药原因中提及

### E. 提取示例（严格参照）:
**示例1：抑郁症患者**
病历文本："抑郁症2个月，口服氟哌嗪吨美利曲"
正确提取：
{
  "anesthesiaRelevantHistory": [
    {
      "condition": "抑郁症",
      "details": "病史2个月，目前口服氟哌嗪吨美利曲治疗"
    }
  ],
  "currentMedications": [
    {
      "drug": "氟哌嗪吨美利曲",
      "dosage": "口服",
      "reason": "治疗抑郁症"
    }
  ]
}

## 规则 2：结构化输出 (Output Format)

必须以严格的 JSON 格式返回结果，**禁止包含任何JSON格式之外的解释、注释或标题**。如果某个字段没有信息，请使用空数组 [] 或指定的默认值。

请严格按照以下JSON格式返回：
{
  "anesthesiaRelevantHistory": [
    {
      "condition": "诊断名称",
      "details": "病史时长、治疗情况、控制水平等关键细节"
    }
  ],
  "currentMedications": [
    {
      "drug": "药物名称",
      "dosage": "剂量和用法",
      "reason": "服药原因 (例如：用于治疗高血压)"
    }
  ],
  "allergies": {
    "hasAllergies": false,
    "details": "如'无'或'青霉素过敏'"
  },
  "infectiousDiseases": [
    {
      "disease": "疾病名称",
      "status": "阳性/阴性/未提及"
    }
  ]
}`;

    console.log('🤖 发送图片到Gemini AI进行分析...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            anesthesiaRelevantHistory: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  details: { type: "string" }
                }
              }
            },
            currentMedications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drug: { type: "string" },
                  dosage: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            allergies: {
              type: "object",
              properties: {
                hasAllergies: { type: "boolean" },
                details: { type: "string" }
              }
            },
            infectiousDiseases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  disease: { type: "string" },
                  status: { type: "string" }
                }
              }
            }
          }
        }
      }
    });

    const responseText = response.text || '{}';
    console.log('📝 AI原始响应:', responseText);
    
    // 解析AI响应
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON解析失败，尝试提取内容:', parseError);
      // 如果直接解析失败，尝试提取可能的JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI响应为有效JSON格式');
      }
    }
    
    console.log('✅ AI分析完成，结果:', parsedResult);
    
    return {
      anesthesiaRelevantHistory: parsedResult.anesthesiaRelevantHistory || [],
      currentMedications: parsedResult.currentMedications || [],
      allergies: parsedResult.allergies || { hasAllergies: false, details: '无' },
      infectiousDiseases: parsedResult.infectiousDiseases || [],
      success: true
    };
    
  } catch (error) {
    console.error('❌ 多模态AI分析失败:', error);
    
    // 如果AI分析失败，返回备用OCR+AI的方式
    console.log('🔄 尝试使用备用OCR+AI方式...');
    return await processMedicalRecord(imageBuffer);
  }
}

export async function processMedicalRecord(imageBuffer: Buffer): Promise<ExtractedMedicalData> {
  try {
    console.log('📸 开始处理病历照片...');
    
    // 第一阶段：OCR文字识别
    const rawText = await performOCR(imageBuffer);
    console.log('📄 OCR识别完成，文本长度:', rawText.length);
    
    if (!rawText || rawText.trim().length === 0) {
      return {
        summary: '',
        medications: [],
        rawText: '',
        success: false,
        error: '未能识别出文字内容，请确保照片清晰且包含文字信息'
      };
    }
    
    // 第二阶段：AI智能信息提取
    const extractedData = await extractMedicalInformation(rawText);
    console.log('🧠 AI信息提取完成');
    
    const diagnoses = extractedData.diagnoses || [];
    const summary = diagnoses.length > 0 ? `诊断：${diagnoses.join('、')}` : rawText.substring(0, 200);
    
    return {
      summary: summary,
      medications: extractedData.medications || [],
      rawText: rawText,
      success: true
    };
    
  } catch (error) {
    console.error('❌ 病历处理失败:', error);
    return {
      summary: '',
      medications: [],
      rawText: '',
      success: false,
      error: error instanceof Error ? error.message : '处理失败'
    };
  }
}

async function performOCR(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('chi_sim+eng');
  
  try {
    console.log('🔍 执行OCR文字识别...');
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractMedicalInformation(rawText: string): Promise<{ diagnoses: string[]; medications: string[] }> {
  const prompt = `你是一位专业的医疗信息提取助手。请从以下病历文本中，严格按照JSON格式提取出所有的"疾病诊断"和"当前用药"。

**重要说明：**
1. 只提取明确的疾病诊断，如"高血压"、"2型糖尿病"、"冠心病"等
2. 只提取明确的药物名称，如"阿司匹林肠溶片"、"硝苯地平控释片"、"二甲双胍"等
3. 忽略检查项目、症状描述、医生建议等非核心信息
4. 如果没有找到相关信息，就返回空数组
5. 必须返回标准JSON格式

病历文本如下：
${rawText}

请严格按照以下JSON格式返回：
{
  "diagnoses": ["诊断1", "诊断2"],
  "medications": ["药物1", "药物2"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            diagnoses: {
              type: "array",
              items: { type: "string" }
            },
            medications: {
              type: "array", 
              items: { type: "string" }
            }
          },
          required: ["diagnoses", "medications"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        diagnoses: Array.isArray(data.diagnoses) ? data.diagnoses : [],
        medications: Array.isArray(data.medications) ? data.medications : []
      };
    }
    
    return { diagnoses: [], medications: [] };
    
  } catch (error) {
    console.error('❌ AI信息提取失败:', error);
    return { diagnoses: [], medications: [] };
  }
}