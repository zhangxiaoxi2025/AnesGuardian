import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

export async function getChatResponse(message: string): Promise<string> {
  try {
    const prompt = `你是一个专业的麻醉科医学AI助手"麻醉守护神"。请回答用户的问题，提供准确、专业的医学建议。

用户问题: ${message}

请提供简洁、专业的回答，重点关注围术期医学、麻醉学、疼痛管理等相关内容。如果问题超出医学范围，请礼貌地说明你专注于医学问题。

回答要求：
- 使用中文回答
- 内容专业但易于理解
- 提供实用的医学建议
- 如有必要，建议咨询专业医生`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    const aiResponse = response.text || '抱歉，我暂时无法回答这个问题。';
    return aiResponse.trim();
  } catch (error) {
    console.error('Chat service error:', error);
    throw new Error('AI服务暂时不可用，请稍后再试。');
  }
}