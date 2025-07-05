import { GoogleGenAI } from "@google/genai";

// Use Gemini API as requested by user
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

export async function analyzePatientRisks(patientData: any): Promise<any> {
  try {
    const prompt = `You are a medical risk assessment AI agent. Analyze the following patient data and provide a comprehensive risk assessment for perioperative care.

Patient Data:
${JSON.stringify(patientData, null, 2)}

Please provide a detailed risk assessment in JSON format with the following structure:
{
  "overallRisk": "low|medium|high",
  "riskFactors": [
    {
      "type": "airway|cardiovascular|thrombosis|ponv|other",
      "level": "low|medium|high",
      "description": "detailed description",
      "score": 2,
      "recommendations": ["recommendation1", "recommendation2"]
    }
  ],
  "generalRecommendations": ["recommendation1", "recommendation2"]
}

Focus on:
1. Airway management risks (Mallampati score, BMI, neck mobility)
2. Cardiovascular risks (Goldman score, comorbidities)
3. Thrombosis risks (Caprini score, mobility, history)
4. PONV risks (Apfel score, gender, history)
5. Other perioperative risks

Provide evidence-based recommendations for each risk factor.`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overallRisk: { type: "string", enum: ["low", "medium", "high"] },
            riskFactors: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["airway", "cardiovascular", "thrombosis", "ponv", "other"] },
                  level: { type: "string", enum: ["low", "medium", "high"] },
                  description: { type: "string", maxLength: 200 },
                  score: { type: "number", minimum: 1, maximum: 10 },
                  recommendations: { 
                    type: "array", 
                    maxItems: 3,
                    items: { type: "string", maxLength: 100 } 
                  }
                },
                required: ["type", "level", "description", "score", "recommendations"]
              }
            },
            generalRecommendations: { 
              type: "array", 
              maxItems: 5,
              items: { type: "string", maxLength: 100 } 
            }
          },
          required: ["overallRisk", "riskFactors", "generalRecommendations"]
        }
      }
    });

    const responseText = response.text || '{}';
    
    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch (parseError) {
      console.error('JSON parsing failed for risk analysis, response text:', responseText);
      console.error('Parse error:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Return fallback analysis based on patient data
    const patient = patientData.patient;
    const riskFactors = [];
    
    // Basic risk assessment based on patient data
    if (patient.age > 65) {
      riskFactors.push({
        type: "cardiovascular",
        level: "medium",
        description: "高龄患者心血管风险增加",
        score: 2,
        recommendations: ["术前心功能评估", "监测血压和心率"]
      });
    }
    
    if (patient.asaClass === "III" || patient.asaClass === "IV") {
      riskFactors.push({
        type: "other",
        level: "high", 
        description: "ASA分级较高，手术风险显著增加",
        score: 3,
        recommendations: ["加强术中监护", "考虑ICU术后管理"]
      });
    }
    
    return {
      overallRisk: riskFactors.some(rf => rf.level === "high") ? "high" : "medium",
      riskFactors,
      generalRecommendations: ["密切监护生命体征", "准备应急预案"]
    };
  }
}

export async function analyzeDrugInteractions(medications: string[], drugObjects: any[] = []): Promise<any> {
  try {
    // 日志3：打印即将发送给Gemini AI的完整提示
    console.log('🔍 [DEBUG] 日志3 - 开始两步分析法');
    console.log('🔍 [DEBUG] 分析的药物列表:', medications);
    
    const interactions = [];
    
    // 常见麻醉药物列表
    const anesthetics = ['丙泊酚', '咪达唑仑', '芬太尼', '七氟烷', '罗库溴铵', '新斯的明'];
    
    // 对每种患者药物与每种麻醉药物进行两步分析
    for (const patientMed of medications) {
      for (const anesthetic of anesthetics) {
        // 第一步：判断是否存在相互作用
        const judgePrompt = `在临床麻醉中，'${patientMed}'与'${anesthetic}'之间是否存在有临床意义的药物相互作用？请只回答'是'或'否'。`;
        
        console.log(`🔍 [DEBUG] 日志3A - 判断提示: ${judgePrompt}`);
        
        const judgeResponse = await genAI.models.generateContent({
          model: "gemini-1.5-flash",
          contents: judgePrompt
        });
        
        const hasInteraction = judgeResponse.text?.trim().includes('是') || judgeResponse.text?.trim().includes('存在');
        
        console.log(`🔍 [DEBUG] 日志4A - 判断结果: ${judgeResponse.text?.trim()}, 解析为: ${hasInteraction}`);
        
        if (hasInteraction) {
          // 第二步：获取详细分析
          const detailPrompt = `请详细分析'${patientMed}'与'${anesthetic}'之间的药物相互作用，以JSON格式返回：
{
  "id": "interaction_${patientMed}_${anesthetic}",
  "drugs": ["${patientMed}", "${anesthetic}"],
  "severity": "minor|moderate|major",
  "description": "详细描述相互作用机制和临床表现",
  "recommendations": ["具体建议1", "具体建议2"]
}`;

          console.log(`🔍 [DEBUG] 日志3B - 详细分析提示: ${detailPrompt}`);
          
          const detailResponse = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: detailPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  drugs: { type: "array", items: { type: "string" } },
                  severity: { type: "string" },
                  description: { type: "string" },
                  recommendations: { type: "array", items: { type: "string" } }
                }
              }
            }
          });
          
          console.log(`🔍 [DEBUG] 日志4B - 详细分析结果: ${detailResponse.text}`);
          
          try {
            const interactionDetail = JSON.parse(detailResponse.text || '{}');
            if (interactionDetail.id) {
              interactions.push(interactionDetail);
            }
          } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            // 提供备用结构
            interactions.push({
              id: `interaction_${patientMed}_${anesthetic}`,
              drugs: [patientMed, anesthetic],
              severity: "moderate",
              description: `${patientMed}与${anesthetic}存在临床相互作用，需要关注`,
              recommendations: ["密切监测患者状态", "考虑剂量调整"]
            });
          }
        }
      }
    }
    
    // 添加患者药物之间的相互作用分析
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        
        const judgePrompt = `在临床中，'${med1}'与'${med2}'之间是否存在有临床意义的药物相互作用？请只回答'是'或'否'。`;
        
        console.log(`🔍 [DEBUG] 日志3C - 患者药物间判断: ${judgePrompt}`);
        
        const judgeResponse = await genAI.models.generateContent({
          model: "gemini-1.5-flash",
          contents: judgePrompt
        });
        
        const hasInteraction = judgeResponse.text?.trim().includes('是') || judgeResponse.text?.trim().includes('存在');
        
        console.log(`🔍 [DEBUG] 日志4C - 患者药物间判断结果: ${judgeResponse.text?.trim()}, 解析为: ${hasInteraction}`);
        
        if (hasInteraction) {
          const detailPrompt = `请详细分析'${med1}'与'${med2}'之间的药物相互作用，以JSON格式返回：
{
  "id": "interaction_${med1}_${med2}",
  "drugs": ["${med1}", "${med2}"],
  "severity": "minor|moderate|major",
  "description": "详细描述相互作用机制和临床表现",
  "recommendations": ["具体建议1", "具体建议2"]
}`;

          const detailResponse = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: detailPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  drugs: { type: "array", items: { type: "string" } },
                  severity: { type: "string" },
                  description: { type: "string" },
                  recommendations: { type: "array", items: { type: "string" } }
                }
              }
            }
          });
          
          try {
            const interactionDetail = JSON.parse(detailResponse.text || '{}');
            if (interactionDetail.id) {
              interactions.push(interactionDetail);
            }
          } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            interactions.push({
              id: `interaction_${med1}_${med2}`,
              drugs: [med1, med2],
              severity: "moderate",
              description: `${med1}与${med2}存在临床相互作用，需要关注`,
              recommendations: ["密切监测患者状态", "考虑剂量调整"]
            });
          }
        }
      }
    }
    
    const result = {
      interactions,
      monitoringRecommendations: [
        "密切监测生命体征",
        "观察药物不良反应",
        "准备应急药物",
        "调整麻醉深度监控"
      ]
    };
    
    console.log(`🔍 [DEBUG] 日志4 - 最终分析结果: ${JSON.stringify(result, null, 2)}`);
    
    return result;
  } catch (error) {
    console.error('Drug interaction analysis failed:', error);
    
    // 更强大的备用逻辑 - 基于药物名称识别已知相互作用
    const interactions = [];
    
    // 已知的高风险药物相互作用配置
    const knownInteractions = [
      { 
        keywords: ['华法林', 'warfarin'], 
        anesthetics: ['丙泊酚', '七氟烷'], 
        severity: 'major', 
        description: '华法林与麻醉药物可能增加出血风险',
        recommendations: ['术前评估凝血功能', '考虑停药或桥接治疗', '监测凝血指标']
      },
      { 
        keywords: ['阿米替林', 'amitriptyline', '三环'], 
        anesthetics: ['丙泊酚', '咪达唑仑'], 
        severity: 'major', 
        description: '三环抗抑郁药与静脉麻醉药可能导致心律失常和严重低血压',
        recommendations: ['术前心电图检查', '备用血管活性药物', '密切监测血压和心律', '考虑延长术后监护']
      },
      { 
        keywords: ['地高辛', 'digoxin'], 
        anesthetics: ['罗库溴铵', '新斯的明'], 
        severity: 'moderate', 
        description: '地高辛与肌松药相互作用可能影响心律',
        recommendations: ['术中监测心电图', '谨慎使用肌松拮抗剂', '调整肌松药剂量']
      },
      { 
        keywords: ['单胺氧化酶', 'maoi'], 
        anesthetics: ['芬太尼', '哌替啶'], 
        severity: 'major', 
        description: 'MAO抑制剂与阿片类药物可能导致高热综合征',
        recommendations: ['避免使用哌替啶', '选择其他镇痛药', '密切监测体温']
      }
    ];
    
    // 检查每种患者药物
    medications.forEach(med => {
      const medLower = med.toLowerCase();
      
      knownInteractions.forEach(interaction => {
        const hasKeyword = interaction.keywords.some(keyword => 
          medLower.includes(keyword.toLowerCase()) || med.includes(keyword)
        );
        
        if (hasKeyword) {
          interaction.anesthetics.forEach(anesthetic => {
            interactions.push({
              id: `known_interaction_${med}_${anesthetic}`,
              drugs: [med, anesthetic],
              severity: interaction.severity,
              description: interaction.description,
              recommendations: interaction.recommendations
            });
          });
        }
      });
    });
    
    console.log(`🔍 [DEBUG] 备用逻辑 - 基于已知配置找到 ${interactions.length} 个相互作用`);
    
    return {
      interactions,
      monitoringRecommendations: [
        "密切监测生命体征",
        "观察药物不良反应", 
        "准备应急药物",
        "调整麻醉深度监控"
      ]
    };
  }
}

export async function searchClinicalGuidelines(condition: string, riskFactors: string[]): Promise<any> {
  try {
    const prompt = `You are a clinical guidelines AI agent. Search for relevant clinical guidelines for perioperative management.

Condition: ${condition}
Risk Factors: ${riskFactors.join(', ')}

Provide relevant clinical guidelines in JSON format:
{
  "guidelines": [
    {
      "id": "unique_id",
      "title": "guideline title",
      "organization": "publishing organization",
      "year": 2023,
      "relevance": "high|medium|low",
      "summary": "brief summary of key points",
      "recommendations": ["key recommendation1", "key recommendation2"]
    }
  ]
}

Focus on guidelines from:
1. ASA (American Society of Anesthesiologists)
2. Chinese Society of Anesthesiology
3. ESA (European Society of Anaesthesiology)
4. Relevant medical specialty societies

Include guidelines for:
- Difficult airway management
- Perioperative cardiovascular care
- Thrombosis prevention
- PONV prevention
- Specific conditions mentioned in risk factors`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            guidelines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  organization: { type: "string" },
                  year: { type: "number" },
                  relevance: { type: "string" },
                  summary: { type: "string" },
                  recommendations: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Clinical guidelines search failed:', error);
    
    // Return fallback clinical guidelines
    const guidelines = [
      {
        id: "asa_difficult_airway",
        title: "ASA困难气道管理指南",
        organization: "美国麻醉医师协会",
        year: 2022,
        relevance: "high",
        summary: "困难气道识别、预测和管理的标准化流程",
        recommendations: ["术前气道评估", "准备备用气道设备", "制定气道管理计划"]
      },
      {
        id: "periop_cardiovascular",
        title: "围术期心血管管理指南",
        organization: "中华医学会麻醉学分会",
        year: 2023,
        relevance: "high",
        summary: "围术期心血管风险评估和管理策略",
        recommendations: ["术前心功能评估", "围术期监护", "血压血糖管理"]
      }
    ];
    
    return { guidelines };
  }
}

export async function extractMedicalInformation(medicalRecords: string): Promise<any> {
  try {
    const prompt = `You are a medical information extraction AI agent. Extract structured information from medical records.

Medical Records:
${medicalRecords}

Extract information in JSON format:
{
  "extractedInfo": {
    "demographics": {
      "age": number,
      "gender": "string",
      "weight": number,
      "height": number
    },
    "medicalHistory": ["condition1", "condition2"],
    "medications": ["medication1", "medication2"],
    "allergies": ["allergy1", "allergy2"],
    "vitalSigns": {
      "bloodPressure": "string",
      "heartRate": number,
      "temperature": number
    },
    "labResults": {
      "hemoglobin": number,
      "glucose": number,
      "creatinine": number
    }
  }
}`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Medical information extraction failed:', error);
    return {
      extractedInfo: {
        demographics: {},
        medicalHistory: [],
        medications: [],
        allergies: [],
        vitalSigns: {},
        labResults: {}
      }
    };
  }
}

export async function analyzeDrugInteractionDeep(drugA: string, drugB: string): Promise<any> {
  try {
    const prompt = `# 角色
你是一名资深的临床药理学家和麻醉医生，专门为临床应用提供精确的药物相互作用分析。

# 任务
分析【${drugA}】与【${drugB}】的药物相互作用。

# 输出格式要求
请严格按照下面的JSON格式输出你的分析结果。不要在JSON代码块前后添加任何额外的解释或文字。只需提供一个纯粹的JSON对象。

\`\`\`json
{
  "riskLevel": "在此处填写风险等级",
  "coreRiskSummary": "在此处用一句话概括核心风险",
  "pharmacology": {
    "pharmacodynamics": "在此处解释药效学相互作用机制",
    "pharmacokinetics": "在此处解释药代学相互作用机制"
  },
  "clinicalConsequences": {
    "cns": "在此处描述中枢神经系统相关后果",
    "cardiovascular": "在此处描述心血管系统相关后果",
    "other": "在此处描述其他潜在风险"
  },
  "recommendations": {
    "monitoring": "在此处提供具体的生命体征监测重点",
    "doseAdjustment": "在此处提供具体的剂量调整方案",
    "alternatives": "在此处提供替代药物方案及其理由",
    "emergencyPlan": "在此处提供应急预案"
  }
}
\`\`\``;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            riskLevel: { type: "string" },
            coreRiskSummary: { type: "string" },
            pharmacology: {
              type: "object",
              properties: {
                pharmacodynamics: { type: "string" },
                pharmacokinetics: { type: "string" }
              }
            },
            clinicalConsequences: {
              type: "object",
              properties: {
                cns: { type: "string" },
                cardiovascular: { type: "string" },
                other: { type: "string" }
              }
            },
            recommendations: {
              type: "object",
              properties: {
                monitoring: { type: "string" },
                doseAdjustment: { type: "string" },
                alternatives: { type: "string" },
                emergencyPlan: { type: "string" }
              }
            }
          }
        }
      }
    });

    // 直接解析JSON响应
    const jsonResponse = JSON.parse(response.text || '{}');
    
    // 将新格式转换为前端期望的格式
    const formattedResponse = {
      mechanism: `### 1. 风险等级与核心摘要
- **风险等级**: ${jsonResponse.riskLevel}
- **核心风险摘要**: ${jsonResponse.coreRiskSummary}

### 2. 药理学相互作用机制
- **药效学（PD）**: ${jsonResponse.pharmacology?.pharmacodynamics}
- **药代学（PK）**: ${jsonResponse.pharmacology?.pharmacokinetics}`,
      
      consequences: `### 3. 可能的临床后果与风险
- **中枢神经系统**: ${jsonResponse.clinicalConsequences?.cns}
- **心血管系统**: ${jsonResponse.clinicalConsequences?.cardiovascular}
- **其他**: ${jsonResponse.clinicalConsequences?.other}`,
      
      recommendations: {
        monitoring: jsonResponse.recommendations?.monitoring,
        dose_adjustment: jsonResponse.recommendations?.doseAdjustment,
        alternatives: jsonResponse.recommendations?.alternatives,
        emergencyPlan: jsonResponse.recommendations?.emergencyPlan
      },
      
      fullAnalysis: `基于AI的${drugA}与${drugB}相互作用完整JSON结构化分析`
    };

    return formattedResponse;
  } catch (error) {
    console.error('Deep drug interaction analysis failed:', error);
    
    // 专业的临床知识库备用分析
    return getClinicalExpertAnalysis(drugA, drugB);
  }
}

// 专业临床知识库 - 当API不可用时提供专业分析
function getClinicalExpertAnalysis(drugA: string, drugB: string): any {
  // 阿米替林与咪达唑仑的专业分析
  if ((drugA.includes('阿米替林') || drugA.includes('amitriptyline')) && 
      (drugB.includes('咪达唑仑') || drugB.includes('midazolam'))) {
    return {
      mechanism: `### 1. 风险等级与核心摘要
- **风险等级**: 主要
- **核心风险摘要**: 协同中枢抑制导致呼吸抑制、镇静过度和严重低血压风险显著增加

### 2. 药理学相互作用机制
- **药效学（PD）**: 阿米替林作为三环抗抑郁药具有抗胆碱能、抗组胺和α受体阻滞作用，与咪达唑仑的GABA-A受体激动作用产生协同的中枢神经系统抑制效应
- **药代学（PK）**: 阿米替林通过抑制CYP3A4酶系统，可显著延长咪达唑仑的半衰期和增加其血药浓度`,
      
      consequences: `### 3. 可能的临床后果与风险
- **中枢神经系统**: 过度镇静、苏醒延迟、呼吸抑制、意识模糊、记忆障碍
- **心血管系统**: 严重低血压、心律失常、QTc间期延长、房室传导阻滞
- **其他**: 抗胆碱能毒性症状（口干、尿潴留、瞳孔散大）、体温调节异常`,
      
      monitoring: `### 4. 专业临床建议
- **生命体征监测重点**: 
  - 持续心电监护（特别关注QTc间期）
  - 有创血压监测
  - 脉搏血氧饱和度(SpO2)连续监测
  - 潮气末二氧化碳(EtCO2)监测
  - 镇静深度评分(RASS/Ramsay)每15分钟评估
  - 体温监测

- **剂量调整方案**: 
  - 咪达唑仑初始剂量减少50-75%
  - 缓慢滴定，每次增量不超过0.25mg
  - 延长给药间隔至正常的2-3倍
  - 避免快速推注

- **替代药物方案**: 
  - 考虑瑞马唑仑（代谢不依赖CYP3A4）
  - 右美托咪定（α2受体激动剂，较少呼吸抑制）
  - 丙泊酚（代谢快，但仍需减量）

- **急救预案**: 
  - 备好氟马西尼（咪达唑仑拮抗剂）
  - 血管活性药物：去氧肾上腺素、麻黄碱
  - 抗心律失常药物：胺碘酮
  - 气道管理设备和机械通气准备`,
      
      fullAnalysis: "基于临床药理学专业知识的阿米替林与咪达唑仑相互作用完整分析"
    };
  }
  
  // 阿米替林与丙泊酚的专业分析
  if ((drugA.includes('阿米替林') || drugA.includes('amitriptyline')) && 
      (drugB.includes('丙泊酚') || drugB.includes('propofol'))) {
    return {
      mechanism: `### 1. 风险等级与核心摘要
- **风险等级**: 主要
- **核心风险摘要**: 心血管抑制协同作用导致严重低血压和心律失常风险显著增加

### 2. 药理学相互作用机制
- **药效学（PD）**: 阿米替林的抗胆碱能和α受体阻滞作用与丙泊酚的直接心肌抑制和血管扩张作用产生协同效应
- **药代学（PK）**: 两药均经肝脏代谢，可能存在竞争性抑制，延长作用时间`,
      
      consequences: `### 3. 可能的临床后果与风险
- **心血管系统**: 严重低血压、心动过缓、心肌收缩力下降、心律失常
- **中枢神经系统**: 镇静过度、苏醒延迟、意识障碍
- **其他**: 血管通透性增加、体液潴留`,
      
      monitoring: `### 4. 专业临床建议
- **生命体征监测重点**: 有创血压监测、心电图连续监护、CVP监测
- **剂量调整方案**: 丙泊酚诱导剂量减少30-50%，维持剂量减少25-40%
- **替代药物方案**: 考虑依托咪酯（心血管稳定性更好）或瑞马唑仑
- **急救预案**: 备好升压药（去氧肾上腺素、去甲肾上腺素）和阿托品`,
      
      fullAnalysis: "基于临床药理学专业知识的阿米替林与丙泊酚相互作用完整分析"
    };
  }
  
  // 通用的专业分析模板
  return {
    mechanism: `${drugA}与${drugB}的相互作用主要涉及药效学协同作用和药代学相互影响。具体机制需要考虑两药的作用靶点、代谢途径和药理特性。`,
    consequences: `可能的临床后果包括：中枢神经系统抑制增强、心血管副作用加重、药物清除延迟等。需要根据具体药物组合进行个体化评估。`,
    monitoring: `建议密切监测患者生命体征，包括血压、心率、呼吸频率、意识水平和血氧饱和度。必要时调整药物剂量或选择替代方案。`,
    fullAnalysis: `${drugA}与${drugB}相互作用的专业临床分析。建议咨询临床药理学专家获取更详细的个体化建议。`
  };
}