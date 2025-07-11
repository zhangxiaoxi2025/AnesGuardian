import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

// 检测回答是否被截断
function detectTruncation(response: string): boolean {
  // 检查1: 是否以完整句子结尾（中文或英文标点）
  const endsWithPunctuation = /[。！？.!?]$/.test(response.trim());
  
  // 检查2: 是否包含省略号或截断标识
  const hasEllipsis = response.includes('...') || response.includes('…');
  
  // 检查3: 是否以不完整的词语结尾（检查最后几个字符）
  const lastChars = response.slice(-10).trim();
  const hasIncompleteEnding = /[，,：:\-—]$/.test(lastChars) || 
                             /[a-zA-Z][^。！？.!?]*$/.test(lastChars);
  
  // 检查4: 是否突然在句子中间截断
  const lines = response.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  const endsAbruptly = lastLine.length > 0 && !endsWithPunctuation && lastLine.length < 20;
  
  return !endsWithPunctuation || hasEllipsis || hasIncompleteEnding || endsAbruptly;
}

// 生成AI响应的核心函数
async function generateAIResponse(message: string, maxTokens: number, attemptNumber: number): Promise<string> {
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

  console.log(`=== 第${attemptNumber}次尝试 ===`);
  console.log('Token限制:', maxTokens);

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-lite-preview-06-17",
    contents: prompt,
    config: {
      temperature: 0.3,
      topK: 30,
      topP: 0.9,
      maxOutputTokens: maxTokens,
    }
  });

  const aiResponse = response.text || '抱歉，我暂时无法回答这个问题。';
  
  // 记录本次尝试的详细信息
  console.log(`第${attemptNumber}次响应长度:`, aiResponse.length);
  console.log(`第${attemptNumber}次响应最后20个字符:`, aiResponse.slice(-20));
  console.log(`第${attemptNumber}次响应状态:`, response ? 'SUCCESS' : 'EMPTY');
  
  return aiResponse;
}

export async function getChatResponse(message: string): Promise<string> {
  try {
    // 记录用户问题
    console.log('=== AI Chat Debug Start ===');
    console.log('用户问题:', message);
    console.log('问题长度:', message.length);
    console.log('请求时间:', new Date().toISOString());
    
    // 定义重试策略：逐步增加token限制
    const tokenLimits = [2048, 4096, 8192];
    let bestResponse = '';
    let finalAttempt = 1;
    
    for (let i = 0; i < tokenLimits.length; i++) {
      const currentTokenLimit = tokenLimits[i];
      const attemptNumber = i + 1;
      
      try {
        // 生成AI响应
        const aiResponse = await generateAIResponse(message, currentTokenLimit, attemptNumber);
        
        // 检测是否被截断
        const isTruncated = detectTruncation(aiResponse);
        
        console.log(`第${attemptNumber}次截断检测结果:`, isTruncated);
        
        // 如果没有截断，或者已经是最后一次尝试，则使用这个响应
        if (!isTruncated || i === tokenLimits.length - 1) {
          bestResponse = aiResponse;
          finalAttempt = attemptNumber;
          
          if (!isTruncated) {
            console.log(`第${attemptNumber}次尝试成功，回答完整！`);
          } else {
            console.log(`第${attemptNumber}次尝试仍有截断，但已达到最大token限制`);
          }
          break;
        } else {
          console.log(`第${attemptNumber}次尝试检测到截断，准备重试更高token限制...`);
          // 保存当前响应作为备用
          bestResponse = aiResponse;
          finalAttempt = attemptNumber;
        }
        
      } catch (error) {
        console.error(`第${attemptNumber}次尝试失败:`, error.message);
        
        // 如果是第一次尝试失败，直接抛出错误
        if (i === 0) {
          throw error;
        }
        
        // 如果不是第一次尝试失败，使用之前的响应
        console.log(`使用第${finalAttempt}次尝试的响应作为最终结果`);
        break;
      }
    }
    
    // 最终检测和日志记录
    const finalIsTruncated = detectTruncation(bestResponse);
    
    console.log('=== 最终结果 ===');
    console.log('最终使用的尝试次数:', finalAttempt);
    console.log('最终响应长度:', bestResponse.length);
    console.log('最终是否截断:', finalIsTruncated);
    console.log('响应最后20个字符:', bestResponse.slice(-20));
    
    // 记录完整响应（调试用）
    console.log('=== AI完整响应 ===');
    console.log(bestResponse);
    console.log('=== AI Chat Debug End ===');
    
    return bestResponse.trim();
    
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