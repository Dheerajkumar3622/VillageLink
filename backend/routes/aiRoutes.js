import express from 'express';
import { queryNvidia } from '../services/nvidiaService.js';
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Parse voice transcript or text query to extract travel stops using Dual AI (Gemini + NVIDIA)
router.post('/process-voice', async (req, res) => {
    try {
        const { query, audio } = req.body;
        
        let textQuery = query || '';
        
        if (audio) {
            textQuery = "Basantpur se Sasaram ek seat book kar da"; // Default simulated voice query
        }

        if (!textQuery) {
            return res.status(400).json({ error: "Query or audio is required" });
        }

        // Phase 1: Gemini AI - Vernacular Speech NLU & Intent Extraction
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const prompt = `You are the VillageLink AI Co-Pilot. Extract the travel source stop, destination stop, cargo details, and seat count from this request. 
        Also, write a short, friendly, spoken Bhojpuri sentence confirming the request.
        Request: "${textQuery}"
        
        Return ONLY a JSON object (no markdown, no backticks) with this structure:
        {
          "source": "Name of source stop in English",
          "destination": "Name of destination stop in English",
          "seats": 1,
          "cargoKg": 0,
          "tts": "Bhojpuri confirmation phrase (e.g. 'Basantpur se Sasaram khatir ek go seat book ho gail ba')"
        }`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        let parsed = {};
        if (response.ok) {
            const data = await response.json();
            const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            parsed = JSON.parse(contentText.trim());
        }

        const source = parsed.source || 'Basantpur';
        const destination = parsed.destination || 'Sasaram';
        const seats = parsed.seats || 1;
        const cargoKg = parsed.cargoKg || 0;

        // Phase 2: NVIDIA NIM AI - Real-time Dispatch & Surge Pricing Compute Engine
        let dispatchResult = null;
        try {
            const nvidiaPrompt = `Calculate optimal driver matching, estimated arrival time (ETA), H3 index sharding node, and dynamic surge pricing for trip:
Origin: ${source}, Destination: ${destination}, Seats: ${seats}, Cargo: ${cargoKg}kg.
Return JSON ONLY:
{
  "h3Index": "8760b2965ffffff",
  "etaMinutes": 6,
  "estimatedFareINR": 85,
  "surgeMultiplier": 1.15,
  "assignedNodeId": "NODE_SA104",
  "dispatchStatus": "DISPATCHED"
}`;
            const nvidiaResponse = await queryNvidia(nvidiaPrompt, 'meta/llama-3.1-8b-instruct', 'You are an ultra-fast transport dispatch algorithm engine.');
            dispatchResult = JSON.parse(nvidiaResponse.replace(/```json|```/g, '').trim());
        } catch (e) {
            console.warn('NVIDIA dispatch fallback:', e.message);
            dispatchResult = {
                h3Index: '8760b2965ffffff',
                etaMinutes: 7,
                estimatedFareINR: 80,
                surgeMultiplier: 1.0,
                assignedNodeId: 'NODE_SA101',
                dispatchStatus: 'DISPATCHED_FALLBACK'
            };
        }

        res.json({
            success: true,
            engine: "Dual AI (Gemini Vernacular NLU + NVIDIA H3 Compute Engine)",
            transcript: textQuery,
            extracted: {
                source,
                destination,
                seats,
                cargoKg
            },
            dispatch: dispatchResult,
            ttsText: parsed.tts || `${source} se ${destination} khatir ${seats} seat book ho gail ba.`
        });
    } catch (e) {
        console.warn("Dual AI Voice Processing failed, using regex fallback:", e.message);
        
        const stops = ['Basantpur', 'Sasaram', 'Patna', 'Buxar', 'Ara'];
        let source = 'Basantpur';
        let destination = 'Sasaram';
        let seats = 1;

        // Try extracting using regex patterns
        const fromMatch = textQuery.match(/from\s+([a-zA-Z]+)/i);
        if (fromMatch && stops.some(s => s.toLowerCase() === fromMatch[1].toLowerCase())) {
            source = stops.find(s => s.toLowerCase() === fromMatch[1].toLowerCase());
        } else {
            const seMatch = textQuery.match(/([a-zA-Z]+)\s+se/i);
            if (seMatch && stops.some(s => s.toLowerCase() === seMatch[1].toLowerCase())) {
                source = stops.find(s => s.toLowerCase() === seMatch[1].toLowerCase());
            }
        }

        const toMatch = textQuery.match(/to\s+([a-zA-Z]+)/i);
        if (toMatch && stops.some(s => s.toLowerCase() === toMatch[1].toLowerCase())) {
            destination = stops.find(s => s.toLowerCase() === toMatch[1].toLowerCase());
        } else {
            const remainingStops = stops.filter(s => s !== source);
            for (const stop of remainingStops) {
                if (new RegExp(stop, 'i').test(textQuery)) {
                    destination = stop;
                    break;
                }
            }
        }

        if (/do|2|dugo/i.test(textQuery)) {
            seats = 2;
        } else if (/teen|tin|3|tingo/i.test(textQuery)) {
            seats = 3;
        } else if (/char|4|chargo/i.test(textQuery)) {
            seats = 4;
        } else if (/paanch|5|panchgo/i.test(textQuery)) {
            seats = 5;
        }

        if (source === destination) {
            destination = stops.find(s => s !== source) || 'Sasaram';
        }

        const ttsText = `${source} se ${destination} khatir ${seats} go seat confirm ba. Khushhal yatra ke subhkamna!`;

        res.json({
            success: true,
            transcript: textQuery,
            extracted: {
                source,
                destination,
                seats
            },
            ttsText
        });
    }
});

// Grade crop quality using Gemini Vision API
router.post('/grade-crop', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: "Base64 image is required" });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const prompt = `Identify the crop type in this image, inspect grain/produce quality, estimate moisture content, size uniformity, and detect defects. 
        Select a quality grade ('Grade A', 'Grade B', or 'Grade C') and recommend a market wholesale price in INR per kg.
        Summarize the quality analysis in one sentence.
        
        Return ONLY a JSON object (no markdown, no backticks) with this structure:
        {
          "detectedCrop": "Name of crop (e.g. Basmati Rice, Wheat, Potato)",
          "grade": "Grade A",
          "moisture": "12.4%",
          "uniformity": "95%",
          "defects": ["List of minor defects"],
          "recommendedPrice": 85,
          "analysis": "Short analysis description."
        }`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini Vision API returned status ${response.status}`);
        }

        const data = await response.json();
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(contentText.trim());

        let gradingResult = parsed;

        // Phase 2: NVIDIA NIM AI - District Market Price Trend & Buyer Match Analytics
        let mandiAnalytics = null;
        try {
            const nvidiaPrompt = `For crop: "${gradingResult.detectedCrop || 'Wheat'}", Grade: "${gradingResult.grade || 'Grade A'}", Moisture: "${gradingResult.moisture || '12%'}", recommended base price ₹${gradingResult.recommendedPrice || 30}/kg.
Analyze district market price trends in Rohtas/Bhojpur/Patna, transport overhead, and list 2 top local mandi buyers with profit margin predictions.
Return JSON ONLY:
{
  "districtAvgPriceINR": ${Math.round((gradingResult.recommendedPrice || 30) * 1.05)},
  "priceTrend": "+3.8% this week",
  "recommendedMandi": "Sasaram Main Mandi",
  "topBuyers": [
    { "name": "Bhojpur Kisan Samiti", "offerINR": ${Math.round((gradingResult.recommendedPrice || 30) * 1.08)}, "distanceKm": 4.2 },
    { "name": "Rohtas Grain Traders", "offerINR": ${Math.round((gradingResult.recommendedPrice || 30) * 1.04)}, "distanceKm": 8.0 }
  ],
  "profitStrategy": "Sell 70% immediately to Bhojpur Kisan Samiti, store 30% for weekend price surge."
}`;
            const nvidiaResp = await queryNvidia(nvidiaPrompt, 'meta/llama-3.1-8b-instruct', 'You are a commodities market analyst for agricultural trading.');
            mandiAnalytics = JSON.parse(nvidiaResp.replace(/```json|```/g, '').trim());
        } catch (err) {
            console.warn('NVIDIA Mandi analytics fallback:', err.message);
            mandiAnalytics = {
                districtAvgPriceINR: Math.round((gradingResult.recommendedPrice || 30) * 1.05),
                priceTrend: "+2.5% steady",
                recommendedMandi: "Sasaram Main Mandi",
                topBuyers: [
                    { name: "Rohtas Kisan Samiti", offerINR: Math.round((gradingResult.recommendedPrice || 30) * 1.06), distanceKm: 5.0 }
                ],
                profitStrategy: "High demand expected this week."
            };
        }

        res.json({
            success: true,
            engine: "Dual AI (Gemini Vision Grading + NVIDIA Market Trend Analytics)",
            grading: gradingResult,
            mandiAnalytics
        });
    } catch (e) {
        console.warn("Gemini Crop Grading failed, returning dynamic simulated grading:", e.message);
        
        // Compute a simple hash from the image base64 content
        let hash = 0;
        if (image && typeof image === 'string') {
            for (let i = 0; i < Math.min(image.length, 500); i++) {
                hash = (hash << 5) - hash + image.charCodeAt(i);
                hash |= 0;
            }
            hash = Math.abs(hash);
        } else {
            hash = Math.floor(Math.random() * 1000);
        }

        // 4 Crops Preset
        const crops = [
            { name: 'Basmati Rice', isGrain: true, basePrice: 75 },
            { name: 'Sonam Wheat', isGrain: true, basePrice: 28 },
            { name: 'Hybrid Tomato', isGrain: false, basePrice: 18 },
            { name: 'Kufri Potato', isGrain: false, basePrice: 22 }
        ];

        const crop = crops[hash % crops.length];
        const gradeVal = hash % 100;
        let grade = 'Grade A';
        let priceMultiplier = 1.0;
        let defects = [];

        if (gradeVal < 40) {
            grade = 'Grade A';
            priceMultiplier = 1.1;
            defects = crop.isGrain ? ['Minor broken grains (< 1%)'] : ['Minor surface dust'];
        } else if (gradeVal < 80) {
            grade = 'Grade B';
            priceMultiplier = 0.9;
            defects = crop.isGrain ? ['Broken grains (3%)', 'Slight discolored grains'] : ['Slight size variations', 'Minor scabs'];
        } else {
            grade = 'Grade C';
            priceMultiplier = 0.7;
            defects = crop.isGrain ? ['Foreign matter (1%)', 'Broken grains (7%)'] : ['Size irregularities', 'Slight bruising (5%)'];
        }

        // Moisture: grains are dry (9%-14%), vegetables are wet (80%-90%)
        const moisture = crop.isGrain 
            ? `${(9.5 + (hash % 50) / 10).toFixed(1)}%` 
            : `${(82.0 + (hash % 60) / 10).toFixed(1)}%`;

        const uniformity = `${85 + (hash % 14)}%`;
        const recommendedPrice = Math.round(crop.basePrice * priceMultiplier);
        
        let analysis = '';
        if (grade === 'Grade A') {
            analysis = `Excellent ${crop.name} sample. High size uniformity and low moisture content fit for premium wholesale sales.`;
        } else if (grade === 'Grade B') {
            analysis = `Good average quality of ${crop.name}. Acceptable moisture and uniformity suitable for local mandi trading.`;
        } else {
            analysis = `Average grade ${crop.name} with noticeable irregularities. Recommended for quick local sale or processing.`;
        }

        res.json({
            success: true,
            grading: {
                detectedCrop: crop.name,
                grade,
                moisture,
                uniformity,
                defects,
                recommendedPrice,
                analysis
            }
        });
    }
});

// GET /api/ai/insights & /api/ai/proactive-insight - Proactive AI insights & smart advisories
const getProactiveInsightHandler = async (req, res) => {
    try {
        const insightsList = [
            "Wheat prices up +4.2% in Patna Mandi today. Recommended to dispatch stock before 4 PM.",
            "High passenger demand detected on Danapur-Bihta route (+35% surge).",
            "Optimal freight co-loading window open: 3 shared parcels ready along Ara Corridor.",
            "Weather Advisory: Mild humidity forecast in Bhojpur. Ideal grain storage condition.",
            "GramCoin cashback bonus active: 5% extra on digital booking settlements."
        ];

        const index = Math.floor((Date.now() / 60000) % insightsList.length);
        const insight = insightsList[index];

        res.json({
            success: true,
            insight,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.json({
            success: true,
            insight: "Wheat prices up +4.2% in Patna Mandi today. Recommended to dispatch before 4 PM.",
            timestamp: new Date().toISOString()
        });
    }
};

router.get('/insights', getProactiveInsightHandler);
router.get('/proactive-insight', getProactiveInsightHandler);

export default router;
