
import { GoogleGenAI } from "@google/genai";



import Models from '../models.js';
const { AISahayakSession, NewsItem, MarketItem, User } = Models;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

export const chatWithGramSahayak = async (req, res) => {
    try {
        const { message, sessionId, userId } = req.body;

        // 1. Fetch or Create Session Context
        let session = await AISahayakSession.findOne({ sessionId: sessionId || `SESS-${userId}-${Date.now()}` });
        if (!session) {
            session = new AISahayakSession({
                sessionId: sessionId || `SESS-${userId}-${Date.now()}`,
                userId: userId,
                history: []
            });
        }

        const systemInstruction = `You are 'Gram Sahayak', the ultimate AI Heart of VillageLink. 
        You are a proactive, helpful, and technologically savvy assistant for rural India.
        You speak a blend of Hinglish (Hindi + English) and local dialects like Bhojpuri which makes users feel at home.
        Your goals:
        1. Predict user needs (e.g., 'Aapka kal ka bus 8 baje hai, book karun?')
        2. Provide expert advice on Mandi prices, farming, and village life.
        3. Be empathetic and proactive.
        Keep responses concise, human-like, and culturally relevant. Use emojis like 🌱, 🚌, 💰.`;

        const model = "gemini-2.0-flash"; // Upgrading to latest 2.0 Flash for speed

        // Add user message to history
        session.history.push({ role: 'user', text: message });

        const contents = session.history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        const genModel = ai.getGenerativeModel({ model: model, systemInstruction });
        const chat = genModel.startChat({ history: contents.slice(0, -1) });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Add model response to history and save
        session.history.push({ role: 'model', text: responseText });
        session.lastInteracted = Date.now();
        await session.save();

        // Psychology Hook: Occasional "Level Up" or "Insight" injection
        const actionLink = responseText.toLowerCase().includes("book") ? { label: "Book Now", tab: "HOME" } : null;

        res.json({
            text: responseText,
            sessionId: session.sessionId,
            actionLink
        });
    } catch (e) {
        console.error("Gram Sahayak Error:", e);
        res.status(500).json({
            text: "Maaf kijiyega, Sahayak abhi thoda vyast hai. (Sahayak is busy)",
            error: e.message
        });
    }
};

/**
 * Gram Insights: Dynamic, Personalized AI Peek for the Dashboard
 */
export const getGramInsights = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findOne({ id: userId });
        const news = await NewsItem.find().sort({ timestamp: -1 }).limit(1);
        const mandi = await MarketItem.find({ type: 'COMMODITY' }).limit(2);

        const prompt = `Based on:
        User: ${user?.name || 'Villager'} (Level: ${user?.heroLevel || 'Novice'})
        Latest News: ${news[0]?.title || 'Normal day'}
        Mandi: ${mandi.map(m => m.name + ': ₹' + m.price).join(', ')}
        
        Generate a 1-line proactive "Peek" insight for their dashboard. 
        Example: '💡 Tomato prices up by 10%, Ramesh! Want to list your harvest?' 
        Example: '🌦️ Rain alert tomorrow. Your 9 AM bus might be 10 mins late.'
        Return ONLY the 1-line text.`;

        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const insight = result.response.text().trim();

        res.json({ insight });
    } catch (e) {
        res.json({ insight: "💡 Check mandi prices for new opportunities today!" });
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

export const analyzeHygiene = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: "Act as an FSSAI health inspector. Analyze this commercial kitchen image for hygiene. Provide a hygiene score from 0-100 and list specific health hazards or cleanliness issues. Return JSON with keys: score, hazards (array of strings)." }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        res.json(result);
    } catch (e) {
        console.error("Hygiene Analysis Error:", e);
        res.status(500).json({ score: 50, hazards: ["Analysis technical failure"], error: e.message });
    }
};
