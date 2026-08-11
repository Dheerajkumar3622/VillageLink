/**
 * Offline Speech NLU Engine (Voice Intent & Slot Extractor)
 * Translates spoken transcripts locally into structured API payloads.
 * Supports multi-dialect vocabulary mappings (English, Hindi, Bhojpuri).
 */

export class OfflineNluEngine {
    constructor() {
        this.locationsRegistry = ['dumraon', 'buxar', 'patna', 'arrah', 'buxar mandi', 'patna mandi'];
        this.cropsRegistry = ['basmati', 'rice', 'chana', 'wheat', 'dhan'];
    }

    /**
     * Parses a local speech transcript string into intent classification and slots maps
     */
    parseSpeech(spokenText) {
        const text = spokenText.toLowerCase().trim();

        // 1. Determine overall intent
        let intent = 'UNKNOWN';
        let confidence = 0.50;

        if (this.containsAny(text, ['price', 'daam', 'rate', 'bhaav'])) {
            intent = 'CHECK_CROP_PRICE';
            confidence = 0.92;
        } else if (this.containsAny(text, ['send', 'dispatch', 'parcel', 'bhejna', 'bhej', 'delivery'])) {
            intent = 'BOOK_PARCEL';
            confidence = 0.95;
        } else if (this.containsAny(text, ['book', 'ride', 'yatra', 'gadi', 'gadi book'])) {
            intent = 'BOOK_RIDE';
            confidence = 0.90;
        }

        // 2. Extract slot entities (origin, destination, crop, qty)
        const slots = {
            origin: null,
            destination: null,
            crop: null,
            qty: null
        };

        // Extract locations
        const locationsFound = [];
        this.locationsRegistry.forEach(loc => {
            if (text.includes(loc)) {
                locationsFound.push(loc);
            }
        });

        // Determine origin vs destination based on prepositions ("to", "se", "se patna")
        if (locationsFound.length > 0) {
            // Simple spatial grammar parsing
            const words = text.split(' ');
            
            locationsFound.forEach(loc => {
                const locIndex = words.indexOf(loc);
                
                // If preceded by "to" or "destination" or "tak"
                if (locIndex > 0 && (words[locIndex - 1] === 'to' || words[locIndex - 1] === 'tak')) {
                    slots.destination = loc;
                } else if (locIndex > 0 && (words[locIndex - 1] === 'se' || words[locIndex - 1] === 'from')) {
                    slots.origin = loc;
                } else {
                    // Fallback order allocation
                    if (!slots.origin) {
                        slots.origin = loc;
                    } else if (!slots.destination) {
                        slots.destination = loc;
                    }
                }
            });
        }

        // Extract crop entity
        this.cropsRegistry.forEach(crop => {
            if (text.includes(crop)) {
                slots.crop = crop;
            }
        });

        // Extract quantity (find digits preceding keywords like bags, packets, tons)
        const qtyMatch = text.match(/(\d+)\s*(bag|bags|packet|packets|ton|tons|bori|bora)/);
        if (qtyMatch) {
            slots.qty = parseInt(qtyMatch[1], 10);
        }

        return {
            originalText: spokenText,
            intent,
            slots,
            confidence
        };
    }

    containsAny(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
}
