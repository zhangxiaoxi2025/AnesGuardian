import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { drugs } from "../../shared/schema";
import { eq, like } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DrugEnhancementData {
  pharmacology: string;
  mechanism: string;
  metabolism: string;
  halfLife: string;
  anesthesiaInteractions: string;
  preoperativeGuidelines: string;
  contraindications: string;
  monitoringPoints: string;
}

export class DrugEnhancementService {
  /**
   * 使用Gemini AI自动补充药物信息
   */
  static async enhanceDrugInformation(drugName: string): Promise<DrugEnhancementData> {
    try {
      const prompt = `
作为一位资深的麻醉科主任医师，请为以下药物提供详细的临床信息：

药物名称：${drugName}

请按照以下格式提供详细信息，每个部分都要专业、准确、实用：

1. 药理学特性：
   - 药物分类和主要作用机制
   - 药效学特点和临床效应

2. 作用机制：
   - 分子水平的作用机制
   - 受体结合和信号传导

3. 代谢途径：
   - 主要代谢器官和酶系统
   - 代谢产物及其活性

4. 半衰期：
   - 血浆半衰期
   - 作用持续时间

5. 麻醉相互作用：
   - 与常用全麻药物的相互作用（丙泊酚、依托咪酯、七氟烷等）
   - 与阿片类药物的相互作用（芬太尼、舒芬太尼等）
   - 与肌松药的相互作用（罗库溴铵、顺式阿曲库胺等）
   - 与局麻药的相互作用（布比卡因、利多卡因等）

6. 围术期用药指导：
   - 术前停药时间和原则
   - 术中监测要点
   - 术后恢复期注意事项

7. 禁忌症：
   - 绝对禁忌症
   - 相对禁忌症
   - 特殊人群注意事项

8. 监测要点：
   - 需要监测的生命体征
   - 实验室检查项目
   - 并发症预防

请用专业但简洁的语言，每个部分控制在200字以内。
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const content = response.text || "";
      
      // 解析AI返回的内容
      const sections = this.parseEnhancementContent(content);
      
      return {
        pharmacology: sections.pharmacology || "暂无详细信息",
        mechanism: sections.mechanism || "暂无详细信息",
        metabolism: sections.metabolism || "暂无详细信息",
        halfLife: sections.halfLife || "暂无详细信息",
        anesthesiaInteractions: sections.anesthesiaInteractions || "暂无已知相互作用",
        preoperativeGuidelines: sections.preoperativeGuidelines || "请遵循标准围术期用药指导",
        contraindications: sections.contraindications || "请参考药品说明书",
        monitoringPoints: sections.monitoringPoints || "请进行常规监测"
      };
    } catch (error) {
      console.error(`药物信息增强失败 - ${drugName}:`, error);
      return {
        pharmacology: "暂无详细信息",
        mechanism: "暂无详细信息",
        metabolism: "暂无详细信息",
        halfLife: "暂无详细信息",
        anesthesiaInteractions: "暂无已知相互作用",
        preoperativeGuidelines: "请遵循标准围术期用药指导",
        contraindications: "请参考药品说明书",
        monitoringPoints: "请进行常规监测"
      };
    }
  }

  /**
   * 解析AI返回的药物信息内容
   */
  private static parseEnhancementContent(content: string): Partial<DrugEnhancementData> {
    const sections: Partial<DrugEnhancementData> = {};
    
    // 使用正则表达式提取各个部分
    const patterns = {
      pharmacology: /(?:1\.?\s*药理学特性|药理学)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      mechanism: /(?:2\.?\s*作用机制|作用机制)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      metabolism: /(?:3\.?\s*代谢途径|代谢)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      halfLife: /(?:4\.?\s*半衰期|半衰期)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      anesthesiaInteractions: /(?:5\.?\s*麻醉相互作用|相互作用)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      preoperativeGuidelines: /(?:6\.?\s*围术期用药指导|用药指导)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      contraindications: /(?:7\.?\s*禁忌症|禁忌)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i,
      monitoringPoints: /(?:8\.?\s*监测要点|监测)[：:]\s*([\s\S]*?)(?=\n\s*\d+\.|$)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match && match[1]) {
        sections[key as keyof DrugEnhancementData] = match[1].trim();
      }
    }

    return sections;
  }

  /**
   * 批量增强药物信息
   */
  static async batchEnhanceDrugs(limit: number = 10): Promise<void> {
    try {
      console.log(`🔄 开始批量增强药物信息 (批次大小: ${limit})...`);
      
      // 获取需要增强的药物列表
      const drugsToEnhance = await db
        .select()
        .from(drugs)
        .limit(limit);

      console.log(`📋 找到 ${drugsToEnhance.length} 个药物需要增强`);

      for (const drug of drugsToEnhance) {
        console.log(`🔍 正在增强药物信息: ${drug.name}`);
        
        const enhancementData = await this.enhanceDrugInformation(drug.name);
        
        // 将增强的信息存储到数据库或缓存中
        // 这里可以扩展药物表结构来存储增强信息
        console.log(`✅ 完成药物信息增强: ${drug.name}`);
        
        // 添加延迟以避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`🎉 批量药物信息增强完成!`);
    } catch (error) {
      console.error("批量增强药物信息失败:", error);
    }
  }

  /**
   * 分析特定药物与麻醉药物的相互作用
   */
  static async analyzeAnesthesiaDrugInteraction(
    patientDrug: string,
    anesthesiaDrugs: string[]
  ): Promise<string> {
    try {
      const prompt = `
作为麻醉科专家，请分析以下药物相互作用：

患者用药：${patientDrug}
麻醉药物：${anesthesiaDrugs.join(", ")}

请提供专业的相互作用分析，包括：
1. 药动学相互作用（代谢、吸收、分布、排泄）
2. 药效学相互作用（协同、拮抗、增强）
3. 临床风险评估（轻微、中等、严重）
4. 具体的临床管理建议
5. 监测要点和注意事项

请用专业但简洁的语言，重点关注临床实用性。
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });

      return response.text || "暂无相互作用信息";
    } catch (error) {
      console.error("麻醉药物相互作用分析失败:", error);
      return "相互作用分析失败，请咨询麻醉医师";
    }
  }

  /**
   * 生成术前停药建议
   */
  static async generatePreoperativeGuidelines(drugName: string): Promise<string> {
    try {
      const prompt = `
作为麻醉科主任医师，请为以下药物提供详细的术前停药建议：

药物名称：${drugName}

请提供：
1. 推荐的停药时间（具体天数或小时数）
2. 停药的医学原理和依据
3. 是否需要替代治疗
4. 特殊情况的处理原则
5. 如果不能停药的风险评估

请用专业但易懂的语言，提供实用的临床指导。
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      return response.text || "请遵循标准术前停药指导";
    } catch (error) {
      console.error("术前停药建议生成失败:", error);
      return "请咨询麻醉医师获取术前停药建议";
    }
  }
}