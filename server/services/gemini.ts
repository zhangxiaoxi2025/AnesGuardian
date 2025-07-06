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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // 这是一个更直接、更强制的提示词
    const prompt = `
# 指令
你是一名资深的临床药理学家。你的任务是分析【${drug1}】与【${drug2}】之间的药物相互作用。

# 输出要求
请严格按照下面的JSON格式输出你的分析结果。即使你认为没有相互作用，也必须填充所有字段，可以在描述中说明情况。**必须返回JSON，不能返回其他任何内容。**

\`\`\`json
{
  "interactionExists": "是 / 否",
  "severity": "严重 / 主要 / 中等 / 次要 / 无",
  "description": "在这里详细描述相互作用的机制和临床表现。如果没有相互作用，请说明理由。",
  "recommendations": [
    "具体的临床建议1",
    "具体的临床建议2"
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

    // 为了匹配前端的期望格式，我们包装一下数据
    return {
        interactions: [
            {
                id: `ai_interaction_${drug1}_${drug2}`,
                drugs: [drug1, drug2],
                severity: parsedData.severity?.toLowerCase() || 'unknown',
                description: parsedData.description,
                recommendations: parsedData.recommendations
            }
        ],
        // 如果AI认为没有交互，也返回一个空数组，避免前端逻辑复杂
        monitoringRecommendations: (parsedData.interactionExists === "是") ? ["请根据具体风险进行监测"] : []
    };

  } catch (error) {
    console.error('[Final Diagnosis] Error:', error);
    // 返回一个明确的错误结构
    return { error: true, message: `AI分析失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}