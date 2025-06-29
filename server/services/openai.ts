import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "demo_key"
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
      "score": number,
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
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

export async function analyzeDrugInteractions(medications: string[], anestheticDrugs: string[] = []): Promise<any> {
  try {
    const allDrugs = [...medications, ...anestheticDrugs];
    const prompt = `You are a clinical pharmacologist AI agent. Analyze potential drug interactions between the patient's medications and common anesthetic drugs.

Patient Medications: ${medications.join(', ')}
Common Anesthetic Drugs: Propofol, Midazolam, Fentanyl, Sevoflurane, Rocuronium, Neostigmine

Provide drug interaction analysis in JSON format:
{
  "interactions": [
    {
      "id": "unique_id",
      "drugs": ["drug1", "drug2"],
      "severity": "minor|moderate|major",
      "description": "detailed mechanism and effect",
      "recommendations": ["specific recommendation1", "specific recommendation2"]
    }
  ],
  "monitoringRecommendations": ["monitoring point1", "monitoring point2"]
}

Focus on clinically significant interactions that could affect:
1. Cardiovascular stability
2. Respiratory function
3. Bleeding risk
4. Drug metabolism
5. Recovery time`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Drug interaction analysis failed:', error);
    
    // Return fallback drug interaction analysis
    const interactions = [];
    
    // Check for common high-risk interactions
    if (medications.some(med => med.toLowerCase().includes('warfarin'))) {
      interactions.push({
        id: "warfarin_interaction",
        drugs: ["华法林", "麻醉药物"],
        severity: "major",
        description: "华法林与某些麻醉药物可能增加出血风险",
        recommendations: ["术前评估凝血功能", "考虑停药或桥接治疗"]
      });
    }
    
    if (medications.some(med => med.toLowerCase().includes('digoxin'))) {
      interactions.push({
        id: "digoxin_interaction", 
        drugs: ["地高辛", "肌松药"],
        severity: "moderate",
        description: "地高辛可能影响肌松药效果",
        recommendations: ["监测心律", "调整肌松药剂量"]
      });
    }
    
    return {
      interactions,
      monitoringRecommendations: ["术前停用非必需药物", "监测药物浓度"]
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
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
    const prompt = `You are a medical information extraction AI agent. Extract and structure key medical information from the provided medical records.

Medical Records:
${medicalRecords}

Extract information in JSON format:
{
  "demographics": {
    "age": number,
    "gender": "male|female",
    "weight": number,
    "height": number,
    "bmi": number
  },
  "medicalHistory": ["condition1", "condition2"],
  "surgicalHistory": ["surgery1", "surgery2"],
  "medications": ["medication1", "medication2"],
  "allergies": ["allergy1", "allergy2"],
  "vitalSigns": {
    "bloodPressure": "systolic/diastolic",
    "heartRate": number,
    "temperature": number,
    "respiratoryRate": number,
    "oxygenSaturation": number
  },
  "labResults": {
    "hemoglobin": number,
    "hematocrit": number,
    "platelets": number,
    "creatinine": number,
    "glucose": number
  },
  "keyFindings": ["finding1", "finding2"]
}

Focus on information relevant to anesthetic management and perioperative care.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Medical information extraction failed:', error);
    throw new Error(`Medical information extraction failed: ${error.message}`);
  }
}
