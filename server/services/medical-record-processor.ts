import { createWorker } from 'tesseract.js';
import { GoogleGenAI } from "@google/genai";

// 初始化Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedMedicalData {
  summary: string;
  medications: string[];
  allergies?: string[];
  rawText?: string;
  success: boolean;
  error?: string;
}

// 麻醉专业化多模态图像分析函数
export async function processImageWithAI(imageBuffer: Buffer): Promise<ExtractedMedicalData> {
  try {
    console.log('📷 [医疗记录识别] 开始麻醉专业化图像分析...');
    
    // 将图片转换为base64格式
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // 支持JPEG和PNG
    
    // 麻醉专业化医疗信息提取指令
    const prompt = `你是一名资深的麻醉科主任医师，专门负责围术期风险评估。请从这张医疗记录图片中提取与麻醉相关的关键医疗信息。

# 重点提取以下围术期风险相关信息：

## 1. 心血管系统疾病
- 高血压：控制情况、用药、血压水平、停药情况
- 冠心病：心绞痛、心肌梗死史、支架或搭桥史
- 心力衰竭：活动耐量、NYHA分级
- 心律失常：房颤、早搏等类型及治疗
- 瓣膜性心脏病：类型和严重程度

## 2. 呼吸系统疾病
- COPD/哮喘：控制情况、近期发作史
- 睡眠呼吸暂停综合征
- 近期呼吸道感染

## 3. 内分泌与代谢系统
- 糖尿病：血糖控制、用药情况、并发症
- 甲状腺功能异常：甲亢、甲减
- 肾上腺功能异常

## 4. 神经系统疾病
- 脑血管疾病：中风史、TIA、后遗症
- 癫痫：发作频率、控制情况
- 帕金森病、重症肌无力等神经肌肉疾病

## 5. 肝肾功能
- 肝功能不全：肝炎、肝硬化
- 肾功能不全：肾炎、尿毒症

## 6. 血液系统
- 贫血程度
- 凝血功能障碍
- 抗凝药物使用：阿司匹林、华法林、氯吡格雷、替格瑞洛等及其停药时间

## 7. 手术史和过敏史
- 既往手术史，特别是麻醉史
- 药物过敏史（准确提取过敏反应描述）

## 8. 吸烟饮酒史
- 吸烟：每日量、戒烟时间
- 饮酒：每日量、戒酒时间

请严格按照以下JSON格式返回，重点提取围术期麻醉风险评估相关的信息：

{
  "summary": "围术期风险相关的完整病史总结，重点突出与麻醉相关的基础疾病、药物使用情况（包括具体停药时间）、既往手术史、过敏史等关键信息",
  "medications": ["所有提到的药物名称，包括已停用的药物"],
  "allergies": ["药物过敏史，包括具体过敏反应描述"]
}

重要提醒：
1. 只提取与围术期麻醉风险评估相关的信息
2. 过敏史必须准确提取，包括过敏反应的具体描述
3. 药物信息要完整，特别是抗凝药物的停药时间
4. 基础疾病的控制情况和用药情况要详细描述
5. 确保信息提取的准确性和完整性，不遗漏重要的临床细节
6. 如果提到帕金森病、陈旧性脑梗死等重要疾病，必须在summary中详细描述
7. 美多芭、氟哌啶醇等重要药物必须准确识别并包含在medications中`;

    console.log('🤖 发送图片到Gemini AI进行麻醉专业化分析...');
    
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
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            medications: { type: "array", items: { type: "string" } },
            allergies: { type: "array", items: { type: "string" } }
          },
          required: ["summary", "medications", "allergies"]
        }
      }
    });

    const responseText = response.text || '{}';
    console.log('📝 麻醉专业化AI原始响应:', responseText);
    
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
    
    console.log('✅ 麻醉专业化AI分析完成，结果:', parsedResult);
    
    return {
      summary: parsedResult.summary || '无法提取病史总结',
      medications: Array.isArray(parsedResult.medications) ? parsedResult.medications : [],
      allergies: Array.isArray(parsedResult.allergies) ? parsedResult.allergies : [],
      success: true
    };
    
  } catch (error) {
    console.error('❌ 麻醉专业化AI分析失败:', error);
    
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
    
    return {
      summary: extractedData.summary || '无法提取病史总结',
      medications: extractedData.medications || [],
      rawText: rawText,
      success: true
    };
    
  } catch (error: any) {
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

async function extractMedicalInformation(rawText: string): Promise<{ summary: string; medications: string[] }> {
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
        summary: data.summary || '无法提取病史总结',
        medications: Array.isArray(data.medications) ? data.medications : []
      };
    }
    
    return { summary: '', medications: [] };
    
  } catch (error) {
    console.error('❌ AI信息提取失败:', error);
    return { summary: '', medications: [] };
  }
}