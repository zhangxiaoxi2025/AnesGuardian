import { GoogleGenAI } from "@google/genai";
import Tesseract from 'tesseract.js';
import type { ReportType, MedicalReportAnalysis } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// 报告类型分析提示词配置
const reportAnalysisPrompts = {
  ecg: {
    systemPrompt: `你是一位资深的心电图专家。请仔细分析心电图报告，重点关注：
1. 心律类型（窦性心律、房颤、房扑等）
2. 心率（正常60-100次/分）
3. P-R间期（正常0.12-0.20秒）
4. QRS时限（正常<0.12秒）
5. QT间期（需要根据心率校正）
6. ST段改变（抬高、压低）
7. T波形态（倒置、高尖等）
8. 异常Q波
9. 心律失常
10. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析心电图报告的心律、传导、缺血等指标，评估围术期心血管风险"
  },

  echo: {
    systemPrompt: `你是一位资深的心脏超声专家。请仔细分析心脏彩超报告，重点关注：
1. 左心室功能（射血分数EF值，正常≥55%）
2. 左心室内径（舒张期、收缩期）
3. 室壁运动（节段性运动异常）
4. 瓣膜功能（反流、狭窄程度）
5. 右心功能
6. 肺动脉压力估测
7. 心包积液
8. 主动脉根部扩张
9. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析心脏彩超的心功能、瓣膜功能等指标，评估围术期血流动力学风险"
  },

  ct: {
    systemPrompt: `你是一位资深的影像科专家。请仔细分析胸部CT报告，重点关注：
1. 肺实质病变（结节、肿块、炎症）
2. 纵隔结构（淋巴结、血管）
3. 心脏大小和形态
4. 胸腔积液
5. 气胸
6. 肺栓塞征象
7. 主动脉病变
8. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析胸部CT的肺部、心脏、血管等结构，评估围术期呼吸循环系统风险"
  },

  xray: {
    systemPrompt: `你是一位资深的影像科专家。请仔细分析胸部X光报告，重点关注：
1. 心影大小（心胸比例）
2. 肺纹理
3. 肺实质病变
4. 胸腔积液
5. 气胸
6. 纵隔移位
7. 膈肌位置
8. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析胸片的心肺基本结构，评估围术期基础病变风险"
  },

  blood_routine: {
    systemPrompt: `你是一位资深的检验科专家。请仔细分析血常规报告，重点关注：
1. 血红蛋白（正常男性120-170g/L，女性110-150g/L）
2. 红细胞计数和血细胞比容
3. 血小板计数（正常100-300×10⁹/L）
4. 白细胞计数及分类（正常4-10×10⁹/L）
5. 贫血类型和程度
6. 血小板减少的出血风险
7. 白细胞异常的感染风险
8. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析血常规指标，评估围术期贫血、出血、感染等风险"
  },

  biochemistry: {
    systemPrompt: `你是一位资深的检验科专家。请仔细分析生化全套报告，重点关注：
1. 肝功能：ALT、AST、TBIL、ALB（正常ALT<40U/L，AST<40U/L）
2. 肾功能：Cr、BUN、eGFR（正常Cr男性59-104μmol/L）
3. 电解质：Na+、K+、Cl-、Ca2+（正常K+ 3.5-5.1mmol/L）
4. 血糖：空腹血糖、糖化血红蛋白
5. 血脂：TC、TG、HDL、LDL
6. 心肌酶：CK、CK-MB、LDH
7. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析生化指标，评估围术期肝肾功能、电解质紊乱、血糖等风险"
  },

  coagulation: {
    systemPrompt: `你是一位资深的检验科专家。请仔细分析凝血功能报告，重点关注：
1. 凝血酶原时间PT（正常11-14秒）
2. 活化部分凝血活酶时间APTT（正常28-40秒）
3. 国际标准化比值INR（正常0.8-1.2）
4. 纤维蛋白原FIB（正常2-4g/L）
5. D-二聚体（正常<0.5mg/L）
6. 血小板聚集功能
7. 出血时间BT
8. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析凝血功能指标，评估围术期出血和血栓风险"
  },

  blood_gas: {
    systemPrompt: `你是一位资深的重症医学专家。请仔细分析血气分析报告，重点关注：
1. pH值（正常7.35-7.45）
2. 动脉血氧分压PaO2（正常80-100mmHg）
3. 动脉血二氧化碳分压PaCO2（正常35-45mmHg）
4. 碳酸氢根HCO3-（正常22-26mmol/L）
5. 碱剩余BE（正常±3mmol/L）
6. 血氧饱和度SaO2（正常≥95%）
7. 乳酸LAC（正常<2mmol/L）
8. 围术期麻醉相关的风险评估

请以JSON格式返回分析结果，包含关键发现、异常值、风险等级和麻醉相关建议。`,
    analysisInstructions: "分析血气指标，评估围术期酸碱平衡、氧合、通气功能风险"
  }
};

/**
 * OCR文字识别服务
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    console.log("🔍 开始OCR文字识别...");
    
    // 移除base64前缀
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // 使用Tesseract进行OCR识别
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'chi_sim+eng', {
      logger: m => console.log(`OCR进度: ${m.status} ${m.progress || ''}`),
    });
    
    console.log("✅ OCR识别完成，提取文字长度:", text.length);
    return text.trim();
  } catch (error) {
    console.error("❌ OCR识别失败:", error);
    throw new Error("图片文字识别失败，请重试或使用文本输入方式");
  }
}

/**
 * 使用Gemini Vision API进行图片分析（备用方案）
 */
export async function analyzeImageWithVision(imageBase64: string, reportType: ReportType): Promise<string> {
  try {
    console.log("🔍 使用Gemini Vision分析图片...");
    
    const prompt = reportAnalysisPrompts[reportType];
    if (!prompt) {
      throw new Error(`不支持的报告类型: ${reportType}`);
    }
    
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
        `请分析这张${getReportTypeName(reportType)}报告图片中的医学信息。${prompt.analysisInstructions}`,
      ],
    });

    const extractedText = response.text || "";
    console.log("✅ Gemini Vision分析完成，提取内容长度:", extractedText.length);
    
    return extractedText;
  } catch (error) {
    console.error("❌ Gemini Vision分析失败:", error);
    throw new Error("图片分析失败，请重试");
  }
}

/**
 * AI医疗报告分析服务
 */
export async function analyzeMedicalReport(
  reportText: string, 
  reportType: ReportType
): Promise<MedicalReportAnalysis> {
  try {
    console.log(`🤖 开始AI分析${getReportTypeName(reportType)}报告...`);
    
    const prompt = reportAnalysisPrompts[reportType];
    if (!prompt) {
      throw new Error(`不支持的报告类型: ${reportType}`);
    }

    const analysisPrompt = `
${prompt.systemPrompt}

报告内容：
${reportText}

请分析上述${getReportTypeName(reportType)}报告，并以以下JSON格式返回结果：
{
  "reportType": "${reportType}",
  "keyFindings": ["关键发现1", "关键发现2"],
  "abnormalValues": [
    {
      "parameter": "参数名称",
      "value": "当前值",
      "normalRange": "正常范围",
      "significance": "临床意义"
    }
  ],
  "riskLevel": "low|medium|high",
  "clinicalSignificance": "总体临床意义描述",
  "anesthesiaImplications": ["麻醉相关影响1", "麻醉相关影响2"]
}

要求：
1. 如果报告内容正常，abnormalValues可以为空数组
2. riskLevel基于检查结果评估围术期风险
3. anesthesiaImplications重点关注对麻醉和手术的影响
4. 用中文回答，使用专业医学术语
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
      contents: analysisPrompt,
    });

    const responseText = response.text;
    console.log("🤖 AI分析原始响应:", responseText);

    if (!responseText) {
      throw new Error("AI分析返回空结果");
    }

    // 解析JSON响应
    let analysisResult: MedicalReportAnalysis;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ JSON解析失败:", parseError);
      // 如果JSON解析失败，创建基础结构
      analysisResult = {
        reportType,
        keyFindings: ["AI分析结果解析异常"],
        abnormalValues: [],
        riskLevel: 'medium',
        clinicalSignificance: responseText.substring(0, 200) + "...",
        anesthesiaImplications: ["需要人工复核AI分析结果"]
      };
    }

    console.log("✅ AI分析完成:", {
      reportType: analysisResult.reportType,
      findingsCount: analysisResult.keyFindings?.length || 0,
      abnormalCount: analysisResult.abnormalValues?.length || 0,
      riskLevel: analysisResult.riskLevel
    });

    return analysisResult;
  } catch (error) {
    console.error("❌ AI医疗报告分析失败:", error);
    throw new Error("AI分析失败: " + (error as Error).message);
  }
}

/**
 * 综合医疗报告处理流程
 */
export async function processMedicalReport(
  imageBase64?: string,
  textInput?: string,
  reportType?: ReportType
): Promise<{
  extractedText: string;
  analysisResult: MedicalReportAnalysis;
}> {
  if (!reportType) {
    throw new Error("缺少报告类型参数");
  }

  let extractedText = "";

  try {
    // 第一步：获取文本内容
    if (imageBase64) {
      console.log("📸 图片上传模式，开始文字识别...");
      try {
        // 优先使用OCR提取文字
        extractedText = await extractTextFromImage(imageBase64);
        
        // 如果OCR提取的文字太少，使用Gemini Vision作为备用
        if (extractedText.length < 50) {
          console.log("⚠️ OCR提取文字较少，使用Gemini Vision补充...");
          const visionText = await analyzeImageWithVision(imageBase64, reportType);
          extractedText = visionText.length > extractedText.length ? visionText : extractedText;
        }
      } catch (ocrError) {
        console.log("⚠️ OCR失败，降级到Gemini Vision...");
        extractedText = await analyzeImageWithVision(imageBase64, reportType);
      }
    } else if (textInput) {
      console.log("📝 文本输入模式...");
      extractedText = textInput.trim();
    } else {
      throw new Error("缺少图片或文本输入");
    }

    if (!extractedText || extractedText.length < 10) {
      throw new Error("未能提取到有效的报告内容，请检查图片清晰度或重新输入文本");
    }

    console.log("📋 提取文本长度:", extractedText.length);

    // 第二步：AI分析报告内容
    const analysisResult = await analyzeMedicalReport(extractedText, reportType);

    return {
      extractedText,
      analysisResult
    };
  } catch (error) {
    console.error("❌ 医疗报告处理失败:", error);
    throw error;
  }
}

// 辅助函数：获取报告类型中文名称
function getReportTypeName(reportType: ReportType): string {
  const nameMap = {
    ecg: '心电图',
    echo: '心脏彩超',
    ct: '胸部CT',
    xray: '胸片',
    blood_routine: '血常规',
    biochemistry: '生化全套',
    coagulation: '凝血功能',
    blood_gas: '血气分析',
  };
  return nameMap[reportType] || reportType;
}

/**
 * 生成围术期建议
 */
export function generatePerioperativeRecommendations(
  analysisResult: MedicalReportAnalysis
): string[] {
  const recommendations: string[] = [];
  
  // 根据报告类型和风险等级生成建议
  switch (analysisResult.reportType) {
    case 'ecg':
      if (analysisResult.riskLevel === 'high') {
        recommendations.push("术前心血管专科会诊");
        recommendations.push("术中持续心电监测");
        recommendations.push("准备心血管急救药物");
      }
      break;
      
    case 'echo':
      if (analysisResult.riskLevel === 'high') {
        recommendations.push("术前优化心功能");
        recommendations.push("术中有创血压监测");
        recommendations.push("控制液体平衡");
      }
      break;
      
    case 'blood_routine':
      if (analysisResult.abnormalValues?.some(v => v.parameter.includes('血红蛋白'))) {
        recommendations.push("术前纠正贫血");
        recommendations.push("准备输血方案");
      }
      if (analysisResult.abnormalValues?.some(v => v.parameter.includes('血小板'))) {
        recommendations.push("评估出血风险");
        recommendations.push("避免椎管内麻醉");
      }
      break;
      
    case 'coagulation':
      if (analysisResult.riskLevel === 'high') {
        recommendations.push("血液科会诊");
        recommendations.push("术前凝血功能优化");
        recommendations.push("准备凝血因子和血制品");
      }
      break;
  }
  
  // 通用围术期建议
  if (analysisResult.riskLevel === 'medium' || analysisResult.riskLevel === 'high') {
    recommendations.push("加强术后监测");
    recommendations.push("延长观察时间");
  }
  
  return recommendations;
}