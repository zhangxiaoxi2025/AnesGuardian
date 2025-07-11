import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

export async function getChatResponse(message: string): Promise<string> {
  try {
    // 记录用户问题
    console.log('=== AI Chat Debug Start ===');
    console.log('用户问题:', message);
    console.log('问题长度:', message.length);
    console.log('请求时间:', new Date().toISOString());
    
    const prompt = `你是一名具有30年临床经验的高年资权威麻醉医生，正在为年轻麻醉医生提供专业指导。你的回答应该体现深厚的临床经验和权威的医学知识。

## 身份设定
- 主任医师级别的资深麻醉专家
- 拥有丰富的围术期管理经验
- 对药物相互作用、生理病理机制有深入理解
- 教学经验丰富，善于传授临床经验

## 回答风格要求
1. **专业权威性**：使用标准医学术语，展现专业深度
2. **临床实战性**：结合实际临床案例，提供可操作的建议
3. **教学导向性**：不仅解答问题，更要讲解原理和机制
4. **风险意识**：强调潜在风险和并发症，提供预防措施

## 内容结构模板
当讨论特定药物时，按以下结构组织：
- 药物基本信息（成分、机制、药代动力学）
- 围术期主要风险点
- 与麻醉药物的相互作用机制
- 临床管理策略（术前评估、术中监护、术后管理）
- 禁忌和注意事项
- 实用的临床建议

## 语言要求
- 使用中文专业医学术语
- 避免患者教育口吻，采用医生间交流语言
- 可以使用"我们在临床中..."、"根据我的经验..."等表达
- 强调循证医学基础，引用相关指南或共识

用户问题：${message}

请以资深麻醉医生的身份，为年轻同行提供专业、实用的临床指导。`;

    console.log('提示词长度:', prompt.length);
    console.log('Token限制:', 2048);

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: prompt,
      config: {
        temperature: 0.3,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 2048,
      }
    });

    const aiResponse = response.text || '抱歉，我暂时无法回答这个问题。';
    
    // 记录AI响应详情
    console.log('AI响应状态:', response ? 'SUCCESS' : 'EMPTY');
    console.log('响应长度:', aiResponse.length);
    console.log('响应最后10个字符:', aiResponse.slice(-10));
    console.log('是否以完整句子结尾:', /[。！？]$/.test(aiResponse));
    
    // 截断检测
    const possibleTruncation = !aiResponse.endsWith('。') && !aiResponse.endsWith('！') && !aiResponse.endsWith('？') && !aiResponse.endsWith('.')
    console.log('疑似截断:', possibleTruncation);
    
    // 记录完整响应（调试用）
    console.log('=== AI完整响应 ===');
    console.log(aiResponse);
    console.log('=== AI Chat Debug End ===');
    
    return aiResponse.trim();
  } catch (error) {
    console.error('=== AI Chat Error ===');
    console.error('错误类型:', error.name);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('发生时间:', new Date().toISOString());
    console.error('=== Error Debug End ===');
    throw new Error('AI服务暂时不可用，请稍后再试。');
  }
}