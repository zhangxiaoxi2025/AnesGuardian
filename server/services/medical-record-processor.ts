import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";

// 初始化Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedMedicalData {
  summary: string;
  medications: string[];
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
    
    const prompt = `你是一名专业的医疗信息录入员。请仔细分析这张病历图片，并以JSON格式返回以下信息：
1. 'summary': 对病史的简要总结，包含主要诊断和症状
2. 'medications': 一个包含所有当前用药名称的字符串数组

请确保提取的信息准确无误。请严格按照以下JSON格式返回：
{
  "summary": "患者病史总结",
  "medications": ["药物1", "药物2", "药物3"]
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
            summary: { type: "string" },
            medications: { type: "array", items: { type: "string" } }
          },
          required: ["summary", "medications"]
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
      summary: parsedResult.summary || '无法提取病史总结',
      medications: Array.isArray(parsedResult.medications) ? parsedResult.medications : [],
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