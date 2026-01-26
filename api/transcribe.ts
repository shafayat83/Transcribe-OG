
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, targetLanguage } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "your_actual_gemini_api_key_here") {
    console.error("ENVIRONMENT ERROR: API_KEY is missing or using placeholder.");
    return res.status(500).json({ 
      error: 'API_KEY is not configured in Vercel. Please add it to your Project Settings > Environment Variables.' 
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze the video content at this URL: ${url}. 
    TASK: Generate a full, word-for-word transcript in the language: ${targetLanguage}.
    Search for official transcripts or use audio grounding.
    
    RESPONSE FORMAT: You MUST return a valid JSON object strictly following the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            language: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["transcript", "language", "confidence"]
        }
      }
    });

    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web)
      ?.map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      })) || [];

    const textOutput = response.text || "{}";
    const result = JSON.parse(textOutput);

    res.status(200).json({
      ...result,
      groundingSources
    });
  } catch (error: any) {
    console.error("Vercel AI Error:", error);
    res.status(500).json({ error: error.message || 'AI Processing failed' });
  }
}
