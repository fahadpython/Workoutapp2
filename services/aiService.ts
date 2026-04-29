import { GoogleGenAI } from '@google/genai';

// Initialize the API using the required environment variable
// The system injects process.env.GEMINI_API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  creatine?: number;
  portionSize: string;
}

export const analyzeFoodQuery = async (query: string): Promise<ParsedFood> => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  
  const prompt = `Analyze this food query: "${query}".
Return a JSON object with:
{
  "name": "formatted name",
  "calories": number (estimated total calories),
  "protein": number (in grams),
  "carbs": number (in grams),
  "fat": number (in grams),
  "creatine": number (in mg, only if it's meat/fish, otherwise 0),
  "portionSize": "descriptive size, like '1 plate' or '200g'"
}
Be as realistic as possible in estimations. DO NOT use markdown formatting, return ONLY valid raw JSON text.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || '';
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as ParsedFood;
};

export const analyzeFoodImage = async (base64Image: string): Promise<ParsedFood> => {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
    
    const prompt = `Analyze the food in this image.
Return a JSON object with:
{
  "name": "formatted name of the main food",
  "calories": number (estimated total calories for the visible portion),
  "protein": number (in grams),
  "carbs": number (in grams),
  "fat": number (in grams),
  "creatine": number (in mg, only if it contains meat/fish, otherwise 0),
  "portionSize": "descriptive size observed, e.g., '1 large bowl' or '1 handful'"
}
Be as realistic as possible in estimations based on visual portion size. DO NOT use markdown formatting, return ONLY valid raw JSON.`;

    const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    if (!mimeTypeMatch) throw new Error("Invalid base64 string");
    const mimeType = mimeTypeMatch[1];
    const b64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
            prompt,
            {
                inlineData: {
                    data: b64Data,
                    mimeType: mimeType
                }
            }
        ],
        config: {
            temperature: 0.2,
            responseMimeType: 'application/json'
        }
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as ParsedFood;
};

export const generateCoachFeedback = async (exerciseName: string, weight: number, reps: number, RPE: number): Promise<string> => {
    if (!process.env.GEMINI_API_KEY) return "Good job on completing the set.";
    
    const prompt = `Act as an elite powerlifting and bodybuilding coach. Your client just completed a set of ${exerciseName} lifting ${weight}kg for ${reps} reps with an RPE (Rate of Perceived Exertion) of ${RPE}/10. 
    Write a short, punchy, 1-sentence piece of feedback or encouragement based on this performance. For example, if RPE is 10, tell them they pushed to the absolute limit. If RPE is low, tell them to add weight. Make it aggressive and motivational like Arnold Schwarzenegger or Tom Platz.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
            temperature: 0.7
        }
    });
    return response.text || "Solid set. Keep it moving.";
};

export const generateWeightSuggestion = async (
    exerciseName: string, 
    lastWeight: number, 
    lastReps: number, 
    lastRpe: number | undefined, 
    targetReps: string
): Promise<{ type: 'INCREASE' | 'DECREASE' | 'MAINTAIN', targetWeight: number, reason: string }> => {
    if (!process.env.GEMINI_API_KEY) {
        return { type: 'MAINTAIN', targetWeight: lastWeight, reason: "Consistent effort required." };
    }

    const prompt = `Act as an elite strength coach AI. Analyze the client's last performance for "${exerciseName}":
    - Last Session: ${lastWeight}kg for ${lastReps} reps
    - Last RPE (1-10): ${lastRpe ?? 'Unknown'}
    - Today's Target Reps: ${targetReps}
    
    Recommend the optimal weight for today's session based on progressive overload principles.
    Return ONLY a JSON object:
    {
      "type": "INCREASE" | "DECREASE" | "MAINTAIN",
      "targetWeight": number (suggested weight in kg, rounded to nearest 1.25 or 2.5),
      "reason": "Short, punchy 1-line reason for this recommendation."
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                temperature: 0.2, // Low temp for more deterministic output
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text || '';
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
            type: parsed.type || 'MAINTAIN',
            targetWeight: parsed.targetWeight || lastWeight,
            reason: parsed.reason || "AI suggests this weight based on last session."
        };
    } catch (e) {
        console.error("AI Weight Suggestion Error:", e);
        return { type: 'MAINTAIN', targetWeight: lastWeight, reason: "Fallback logic used." };
    }
};
