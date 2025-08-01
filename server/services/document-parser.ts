import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 文档解析服务
export class DocumentParserService {
  private geminiAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  // 从Base64图片中提取文本 (OCR)
  async extractTextFromImage(base64Image: string): Promise<string> {
    try {
      const worker = await createWorker('chi_sim+eng');
      const { data: { text } } = await worker.recognize(base64Image);
      await worker.terminate();
      return text.trim();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  // 解析PDF文档 (简化版，实际应该用PDF.js)
  async extractTextFromPDF(pdfContent: string): Promise<string> {
    // 这里应该使用专门的PDF解析库
    // 现在返回原始内容作为占位符
    return pdfContent;
  }

  // 使用AI分析和结构化指南内容
  async analyzeGuidelineContent(text: string, metadata: {
    title?: string;
    organization?: string;
    category?: string;
  } = {}): Promise<{
    structuredData: any;
    keywords: string[];
    sections: any[];
    summary: string;
  }> {
    try {
      const prompt = `
你是一位专业的医学指南分析专家。请分析以下临床指南文档，并按照JSON格式返回结构化信息。

指南元数据：
- 标题: ${metadata.title || '未知'}
- 发布机构: ${metadata.organization || '未知'}
- 分类: ${metadata.category || '未知'}

指南原文：
${text}

请按以下JSON格式返回分析结果：
{
  "summary": "指南的简要总结",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "structuredData": {
    "mainTopics": ["主要话题1", "主要话题2"],
    "targetPopulation": "适用人群",
    "evidenceLevel": "证据等级",
    "recommendationStrength": "推荐强度"
  },
  "sections": [
    {
      "title": "章节标题",
      "content": "章节内容摘要",
      "type": "introduction|recommendations|contraindications|procedures|other",
      "keywords": ["相关关键词"],
      "priority": 1-5
    }
  ]
}

注意：
1. 关键词应包含医学术语、药物名称、疾病名称等
2. 章节应该按重要性排序
3. 内容要准确反映原文含义
4. 优先级：1=最重要，5=一般重要
`;

      const model = this.geminiAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      const response = await model.generateContent(prompt);

      const analysisResult = JSON.parse(response.response.text() || '{}');
      
      return {
        structuredData: analysisResult.structuredData || {},
        keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : [],
        sections: Array.isArray(analysisResult.sections) ? analysisResult.sections : [],
        summary: analysisResult.summary || '',
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      // 返回基础分析结果
      return {
        structuredData: { error: 'AI分析失败' },
        keywords: this.extractBasicKeywords(text),
        sections: [{ 
          title: '原始内容', 
          content: text.substring(0, 500), 
          type: 'other', 
          keywords: [], 
          priority: 3 
        }],
        summary: 'AI分析失败，请手动查看原始内容',
      };
    }
  }

  // 基础关键词提取 (备用方案)
  private extractBasicKeywords(text: string): string[] {
    const commonMedicalTerms = [
      '麻醉', '手术', '患者', '风险', '并发症', '监测', '药物', '治疗',
      '心血管', '呼吸', '肾功能', '肝功能', '血压', '心率', '血氧',
      '术前', '术中', '术后', '围术期', '评估', '管理', '指南'
    ];
    
    const foundTerms = commonMedicalTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    
    return foundTerms.slice(0, 10); // 限制关键词数量
  }

  // 智能匹配指南与患者情况
  async matchGuidelinesForPatient(
    guidelines: any[],
    patientContext: {
      surgeryType?: string;
      medicalHistory?: string[];
      medications?: string[];
      asaClass?: string;
      age?: number;
    }
  ): Promise<any[]> {
    // 构建患者关键词
    const patientKeywords = [
      patientContext.surgeryType,
      ...(patientContext.medicalHistory || []),
      ...(patientContext.medications || []),
      patientContext.asaClass,
    ].filter(Boolean).map((k: string) => k.toLowerCase());

    // 为每个指南计算相关性分数
    const scoredGuidelines = guidelines.map(guideline => {
      let relevanceScore = 0;
      const guidelineKeywords = (guideline.keywords || []).map(k => k.toLowerCase());
      
      // 关键词匹配
      patientKeywords.forEach((patientKeyword: string) => {
        guidelineKeywords.forEach((guidelineKeyword: string) => {
          if (guidelineKeyword.includes(patientKeyword) || patientKeyword.includes(guidelineKeyword)) {
            relevanceScore += 1;
          }
        });
      });

      // 标题匹配
      const title = guideline.title.toLowerCase();
      patientKeywords.forEach((keyword: string) => {
        if (title.includes(keyword)) {
          relevanceScore += 2;
        }
      });

      // 分类匹配
      if (guideline.category === 'anesthesia') {
        relevanceScore += 1;
      }

      return {
        ...guideline,
        relevanceScore,
        relevance: relevanceScore >= 3 ? 'high' : relevanceScore >= 1 ? 'medium' : 'low'
      };
    });

    // 按相关性排序
    return scoredGuidelines
      .filter(g => g.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export const documentParserService = new DocumentParserService();