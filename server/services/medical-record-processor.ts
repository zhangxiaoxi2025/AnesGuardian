import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";

// 初始化Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedMedicalData {
  diagnoses: string[];
  medications: string[];
  rawText: string;
  success: boolean;
  error?: string;
}

export async function processMedicalRecord(imageBuffer: Buffer): Promise<ExtractedMedicalData> {
  try {
    console.log('📸 开始处理病历照片...');
    
    // 第一阶段：OCR文字识别
    const rawText = await performOCR(imageBuffer);
    console.log('📄 OCR识别完成，文本长度:', rawText.length);
    
    if (!rawText || rawText.trim().length === 0) {
      return {
        diagnoses: [],
        medications: [],
        rawText: '',
        success: false,
        error: '未能识别出文字内容，请确保照片清晰且包含文字信息'
      };
    }
    
    // 第二阶段：AI智能信息提取
    const extractedData = await extractMedicalInformation(rawText);
    console.log('🧠 AI信息提取完成');
    
    return {
      diagnoses: extractedData.diagnoses || [],
      medications: extractedData.medications || [],
      rawText: rawText,
      success: true
    };
    
  } catch (error) {
    console.error('❌ 病历处理失败:', error);
    return {
      diagnoses: [],
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
      model: "gemini-1.5-flash",
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