import { GoogleGenAI } from "@google/genai";
import { env } from "../../../config/env.js";

let client;
const getClient = () =>
  (client ??= new GoogleGenAI({ apiKey: env.llm.geminiKey }));

export async function generateJson({ system, prompt }) {
  const res = await getClient().models.generateContent({
    model: env.llm.geminiModel,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature: 0,
    },
  });
  return res.text;
}
