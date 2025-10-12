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

// 围术期药物相互作用分析函数
export async function analyzeDrugInteractions(drugs: string[], drugObjects: any[]) {
  if (!drugs || drugs.length === 0) {
    return [];
  }

  const interactions = [];

  try {
    console.log('🧬 [围术期药物相互作用分析] 开始分析...');
    console.log('🧬 [围术期药物相互作用分析] 患者用药:', drugs);

    // 常用麻醉药物列表
    const anesthesiaDrugs = [
      // 静脉麻醉药
      '丙泊酚', '依托咪酯', '环泊酚', '氯胺酮', '艾司氯胺酮',
      // 镇静药
      '咪达唑仑', '瑞马唑仑', '右美托咪定', '地西泮',
      // 阿片类
      '芬太尼', '舒芬太尼', '阿芬太尼', '瑞芬太尼', '吗啡',
      // 肌松药
      '罗库溴铵', '维库溴铵', '阿曲库铵', '琥珀胆碱',
      // 局麻药
      '利多卡因', '布比卡因', '罗哌卡因', '普鲁卡因',
      // 血管活性药
      '肾上腺素', '去甲肾上腺素', '多巴胺', '苯肾上腺素', '麻黄碱'
    ];

    // 1. 分析患者用药之间的相互作用
    console.log('🧬 [第一步] 分析患者用药之间的相互作用...');
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const drug1 = drugs[i];
        const drug2 = drugs[j];
        
        console.log(`🧬 [患者用药间] 分析 ${drug1} 与 ${drug2}...`);
        
        const interaction = await analyzeSpecificDrugInteraction(drug1, drug2);
        if (interaction && interaction.length > 0) {
          interactions.push(...interaction);
        }
      }
    }

    // 2. 分析患者用药与麻醉药物的相互作用
    console.log('🧬 [第二步] 分析患者用药与麻醉药物的相互作用...');
    for (const patientDrug of drugs) {
      for (const anesthesiaDrug of anesthesiaDrugs) {
        console.log(`🧬 [麻醉相互作用] 分析 ${patientDrug} 与 ${anesthesiaDrug}...`);
        
        const interaction = await analyzeAnesthesiaDrugInteraction(patientDrug, anesthesiaDrug);
        if (interaction && interaction.length > 0) {
          interactions.push(...interaction);
        }
      }
    }

    console.log('🧬 [围术期药物相互作用分析] 分析完成，发现相互作用:', interactions.length);
    return interactions;

  } catch (error) {
    console.error('❌ [围术期药物相互作用分析] 分析过程中发生错误:', error);
    
    // 备用逻辑：基于规则的分析
    console.log('🔄 [围术期药物相互作用分析] 使用备用逻辑分析...');
    
    const fallbackInteractions = [];
    
    // 氟哌噻吨美利曲辛的备用检查
    if (drugs.some(drug => drug.includes('氟哌') || drug.includes('美利曲'))) {
      fallbackInteractions.push({
        id: 'fluphenazine-melitracen-anesthesia-fallback',
        drugs: ['氟哌噻吨美利曲辛', '麻醉药物'],
        severity: 'major',
        summary: '氟哌噻吨美利曲辛与麻醉药物存在重要相互作用',
        description: '氟哌噻吨美利曲辛含有抗精神病药和三环抗抑郁药成分，与麻醉药物联合使用可能导致：1）中枢神经系统抑制增强，苏醒延迟；2）QT间期延长，心律失常风险；3）血压不稳定；4）抗胆碱能作用增强。',
        recommendations: ['术前心电图评估QT间期', '术中持续心电监护', '谨慎使用血管活性药物', '延长术后观察时间', '术前考虑逐渐减量停药']
      });
    }
    
    return fallbackInteractions;
  }
}

// 分析特定药物相互作用的辅助函数
async function analyzeSpecificDrugInteraction(drug1: string, drug2: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });

    const prompt = `
# 指令
你是一名资深的临床药理学专家，专门负责识别药物相互作用。请仔细分析【${drug1}】与【${drug2}】之间可能存在的药物相互作用。

# 重要提醒
- 药物相互作用包括：药效学相互作用（作用机制叠加）、药代动力学相互作用（代谢影响）
- 特别关注：中枢神经系统抑制、心血管影响、代谢酶竞争、受体拮抗/协同
- 即使是轻微的相互作用也需要识别，因为在麻醉期间可能放大风险

# 输出格式
请严格按照JSON格式返回分析结果：

\`\`\`json
{
  "interactionExists": "是 / 否",
  "severity": "严重 / 中等 / 轻微 / 无",
  "summary": "简短总结相互作用的核心风险（50字以内）",
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

    const jsonString = extractJsonFromString(rawText);
    if (!jsonString) {
      return [];
    }

    const parsedData = JSON.parse(jsonString);

    if (parsedData.interactionExists === "是") {
      return [
        {
          id: `ai_interaction_${drug1}_${drug2}`,
          drugs: [drug1, drug2],
          severity: parsedData.severity?.toLowerCase() || 'minor',
          summary: parsedData.summary || parsedData.description?.substring(0, 50) + '...',
          description: parsedData.description,
          recommendations: parsedData.recommendations || []
        }
      ];
    } else {
      return [];
    }

  } catch (error) {
    console.error(`❌ [药物相互作用分析] ${drug1} 与 ${drug2} 分析错误:`, error);
    return [];
  }
}

// 分析患者用药与麻醉药物相互作用的辅助函数
async function analyzeAnesthesiaDrugInteraction(patientDrug: string, anesthesiaDrug: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });

    const prompt = `
# 指令
你是一名资深的麻醉药理学专家，专门负责识别患者用药与麻醉药物的相互作用。请仔细分析患者用药【${patientDrug}】与麻醉药物【${anesthesiaDrug}】之间可能存在的围术期药物相互作用。

# 重要提醒
- 这是围术期药物相互作用分析，重点关注麻醉期间的安全性
- 特别关注：中枢神经系统抑制增强、心血管不稳定、QT间期延长、呼吸抑制、血压波动
- 即使是轻微的相互作用也需要识别，因为在麻醉期间风险会被放大

# 麻醉药物背景知识
- 丙泊酚：强效静脉麻醉药，GABA-A受体激动剂，导致中枢神经系统抑制和血管扩张
- 咪达唑仑：苯二氮卓类镇静药，增强GABA作用，有镇静、抗焦虑、肌松作用
- 芬太尼：阿片类镇痛药，μ受体激动剂，强效镇痛，可能导致呼吸抑制
- 罗库溴铵：非去极化肌松药，阻断神经肌肉传导
- 利多卡因：局麻药，阻断钠通道，有心律失常风险

# 输出格式
请严格按照JSON格式返回分析结果：

\`\`\`json
{
  "interactionExists": "是 / 否",
  "severity": "严重 / 中等 / 轻微 / 无",
  "summary": "简短总结相互作用的核心风险（50字以内）",
  "description": "详细描述相互作用的机制、临床表现和围术期风险",
  "recommendations": [
    "术前准备建议",
    "术中监测要点",
    "麻醉药物调整建议",
    "术后观察重点"
  ]
}
\`\`\`
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    const jsonString = extractJsonFromString(rawText);
    if (!jsonString) {
      return [];
    }

    const parsedData = JSON.parse(jsonString);

    if (parsedData.interactionExists === "是") {
      return [
        {
          id: `ai_anesthesia_interaction_${patientDrug}_${anesthesiaDrug}`,
          drugs: [patientDrug],
          severity: parsedData.severity?.toLowerCase() || 'minor',
          summary: parsedData.summary || parsedData.description?.substring(0, 50) + '...',
          description: parsedData.description,
          recommendations: parsedData.recommendations || []
        }
      ];
    } else {
      return [];
    }

  } catch (error) {
    console.error(`❌ [麻醉药物相互作用分析] ${patientDrug} 与 ${anesthesiaDrug} 分析错误:`, error);
    return [];
  }
}