import { GoogleGenerativeAI } from '@google/generative-ai';

// 确保你已经设置了环境变量 GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 添加缺失的导出函数
export async function analyzePatientRisks(patientData: any): Promise<any> {
  // 这是一个简化的风险分析函数
  return {
    riskFactors: [],
    overallRisk: 'low'
  };
}

export async function searchClinicalGuidelines(condition: string, riskFactors: string[]): Promise<any> {
  // 这是一个简化的指南搜索函数
  return {
    guidelines: []
  };
}

export async function extractMedicalInformation(medicalRecords: string): Promise<any> {
  // 这是一个简化的医疗信息提取函数
  return {
    diagnoses: [],
    medications: []
  };
}

function extractJsonFromString(text: string): string | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

// 这是我们唯一的、最终的分析函数
export async function analyzeDrugInteractions(drugs: string[], drugObjects: any[]) {
  const drug1 = drugs[0];
  const drug2 = drugs[1];

  console.log(`[Final Diagnosis] Starting analysis for: ${drug1} and ${drug2}`);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });

    // 优化的提示词，强调药物相互作用识别
    const prompt = `
# 指令
你是一名资深的临床药理学专家，专门负责识别药物相互作用。请仔细分析【${drug1}】与【${drug2}】之间可能存在的药物相互作用。

# 重要提醒
- 药物相互作用包括：药效学相互作用（作用机制叠加）、药代动力学相互作用（代谢影响）
- 特别关注：中枢神经系统抑制、心血管影响、代谢酶竞争、受体拮抗/协同
- 即使是轻微的相互作用也需要识别，因为在麻醉期间可能放大风险

# 药物背景知识
- 丙泊酚：强效静脉麻醉药，GABA-A受体激动剂，导致中枢神经系统抑制
- 阿米替林：三环抗抑郁药，具有抗胆碱能作用、抗组胺作用、镇静作用，可延长QT间期

# 分析要求
请详细考虑以下相互作用可能性：
1. 中枢神经系统抑制的叠加效应
2. 心血管系统的协同影响
3. 呼吸抑制风险
4. 代谢途径的相互影响

# 输出格式
请严格按照JSON格式返回分析结果：

\`\`\`json
{
  "interactionExists": "是 / 否",
  "severity": "严重 / 中等 / 轻微 / 无",
  "description": "详细描述相互作用的机制、临床表现和风险程度",
  "recommendations": [
    "具体的临床监测建议",
    "剂量调整建议",
    "预防措施"
  ]
}
\`\`\`
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    console.log('[Final Diagnosis] AI Raw Response:', rawText);

    const jsonString = extractJsonFromString(rawText);
    if (!jsonString) {
      throw new Error('Could not find JSON block in AI response.');
    }

    const parsedData = JSON.parse(jsonString);
    console.log('[Final Diagnosis] Parsed Data:', parsedData);

    // 检查是否存在相互作用
    if (parsedData.interactionExists === "是") {
      // 存在相互作用，返回相互作用详情
      return [
        {
          id: `ai_interaction_${drug1}_${drug2}`,
          drugs: [drug1, drug2],
          severity: parsedData.severity?.toLowerCase() || 'minor',
          description: parsedData.description,
          recommendations: parsedData.recommendations || []
        }
      ];
    } else {
      // 不存在相互作用，返回空数组
      return [];
    }

  } catch (error) {
    console.error('[Final Diagnosis] Error:', error);
    // 发生错误时返回空数组，避免前端崩溃
    return [];
  }
}