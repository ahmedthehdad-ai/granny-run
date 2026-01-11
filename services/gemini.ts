
import { GoogleGenAI } from "@google/genai";

export async function getGrannyCommentary(score: number): Promise<string> {
  // Always use a named parameter for the API key from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The player just lost a 'Granny Runner' game (similar to the Chrome Dino game) with a score of ${score}. 
      The character is a spunky old woman who jumps over trash cans. 
      Write a short, sassy, or witty one-liner comment from the perspective of this granny. 
      Keep it under 15 words. Examples: "In my day, we dodged boulders!", "My hip hurts just looking at that crash."`,
    });
    // response.text is a property, not a method.
    return response.text || "I've seen better moves at the bingo hall!";
  } catch (error) {
    console.error("Gemini failed to comment:", error);
    return "Where are my dentures?";
  }
}
