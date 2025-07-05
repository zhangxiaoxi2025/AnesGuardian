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
    const prompt = `你是一位顶级的临床药学专家和麻醉学专家。请深入分析 ${drugA} 与 ${drugB} 之间的相互作用。请严格按照以下JSON格式返回你的分析结果：

{
  "mechanism": "请详细解释这两种药物相互作用的药理学机制，包括药物的作用部位、代谢途径、以及相互影响的分子生物学基础。",
  "consequences": "请描述这种相互作用可能导致的具体临床后果和风险，包括对患者生理功能的影响、可能出现的不良反应、以及对麻醉和手术过程的影响。",
  "recommendations": {
    "monitoring": "需要进行哪些额外的生命体征或指标监测？请具体说明监测频率、关键指标和注意事项。",
    "dose_adjustment": "是否需要调整其中一种或两种药物的剂量？如何调整？请提供具体的剂量调整方案和调整依据。",
    "alternatives": "如果风险过高，是否有更安全的替代药物可以选择？请列出几种方案，包括替代药物的名称、优势和使用注意事项。"
  }
}

请基于最新的临床指南和循证医学证据进行分析，确保建议的科学性和实用性。`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            mechanism: { type: "string" },
            consequences: { type: "string" },
            recommendations: {
              type: "object",
              properties: {
                monitoring: { type: "string" },
                dose_adjustment: { type: "string" },
                alternatives: { type: "string" }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Deep drug interaction analysis failed:', error);
    
    // 提供备用分析结果
    return {
      mechanism: `${drugA}与${drugB}可能通过多种途径产生相互作用，包括药物代谢酶竞争、受体结合竞争、或者药效学协同作用。具体机制需要进一步评估。`,
      consequences: "可能导致药物效力增强或减弱，增加不良反应风险，或影响麻醉深度和恢复时间。建议密切监测患者状态。",
      recommendations: {
        monitoring: "建议监测生命体征、意识水平、以及相关药物的血药浓度（如有条件）。",
        dose_adjustment: "考虑根据患者反应调整其中一种药物的剂量，建议从较低剂量开始，逐步调整。",
        alternatives: "如风险较高，可考虑使用同类但相互作用较少的替代药物，具体选择需结合患者情况。"
      }
    };
  }
}