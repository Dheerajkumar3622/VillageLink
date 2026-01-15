
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const chatWithSarpanch = async (req, res) => {
    try {
        const { message, history } = req.body;
        const systemInstruction = "You are 'Sarpanch AI', a wise, helpful, and rustic village headman for the 'VillageLink' transport app. You speak in a mix of Hindi/Bhojpuri and English. You help users book tickets, find buses, and check market prices. Keep answers short and concise.";
        const model = "gemini-2.5-flash";
        
        const response = await ai.models.generateContent({
            model: model,
            contents: message,
            config: { systemInstruction: systemInstruction, temperature: 0.7 }
        });

        res.json({ 
            text: response.text, 
            actionLink: response.text.toLowerCase().includes("book") ? { label: "Book Now", tab: "HOME" } : null 
        });
    } catch (e) {
        console.error("Gemini Chat Error:", e);
        res.status(500).json({ text: "Maaf karin, abhi network kamjor ba (Network error).", error: e.message });
    }
};

export const diagnoseLeaf = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: "Analyze this plant leaf. 1. Identify the disease if any. 2. Confidence level (0-1). 3. Suggested remedy. Return JSON with keys: disease, confidence, remedy." }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        res.json(result);
    } catch (e) {
        console.error("Gemini Vision Error:", e);
        res.status(500).json({ disease: "Analysis Failed", confidence: 0, remedy: "Try again." });
    }
};

export const estimateParcel = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: "Estimate the weight (in kg) and dimensions (LxWxH cm) of the object in this image for logistics shipping. Also suggest packaging type (BOX, SACK, CRATE). Return JSON: weightKg, dimensions, recommendedType." }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        res.json(result);
    } catch (e) {
        res.status(500).json({ weightKg: 5, dimensions: "Unknown", recommendedType: "BOX" });
    }
};

export const verifyBiometrics = async (req, res) => {
    try {
        const { imageBase64, audioBase64, type } = req.body;
        const model = "gemini-2.5-flash"; // Multimodal model

        let parts = [];
        let prompt = "";

        if (type === 'FACE' && imageBase64) {
            const cleanImage = imageBase64.split(',')[1] || imageBase64;
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanImage } });
            prompt = "Analyze this face. Is it a female? Return JSON: { isFemale: boolean, confidence: number (0-1) }.";
        } else if (type === 'VOICE' && audioBase64) {
            const cleanAudio = audioBase64.split(',')[1] || audioBase64;
            parts.push({ inlineData: { mimeType: 'audio/webm', data: cleanAudio } });
            prompt = "Analyze this voice audio. Is the speaker female? Return JSON: { isFemale: boolean, confidence: number (0-1) }.";
        } else {
            return res.status(400).json({ error: "Missing data for verification type" });
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        
        if (result.isFemale && result.confidence > 0.6) {
            res.json({ verified: true, confidence: result.confidence });
        } else {
            res.json({ verified: false, confidence: result.confidence });
        }

    } catch (e) {
        console.error("Biometric Error:", e);
        res.status(500).json({ verified: false, error: e.message });
    }
};
