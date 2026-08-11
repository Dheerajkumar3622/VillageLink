/**
 * Retrieval-Augmented Generation (RAG) Engine
 * Implements token-overlap document search and context-augmented answer generation.
 */

export class RagEngine {
    constructor() {
        this.knowledgeBase = [
            {
                id: 'doc-crop-basmati',
                title: 'Basmati Sowing & Moisture Standards',
                content: 'Basmati rice should be sown between June and July. Optimal harvest grain moisture content must be maintained below 14% to qualify for Premium Grade pricing.',
                keywords: ['basmati', 'crop', 'moisture', 'harvest', 'grade', 'sow']
            },
            {
                id: 'doc-wallet-refunds',
                title: 'Razorpay Wallet Refund Policy',
                content: 'Failed booking wallet transactions qualify for automatic self-healing refunds. Razorpay transfers the funds back to the user account within 3 to 5 business days.',
                keywords: ['refund', 'wallet', 'razorpay', 'failed', 'money', 'days']
            },
            {
                id: 'doc-mandi-buxar',
                title: 'Buxar Mandi Gate Operating Hours',
                content: 'Buxar Basmati Mandi gates remain open for cargo truck offloading from 06:00 AM to 08:00 PM on weekdays, and close at 02:00 PM on Saturdays.',
                keywords: ['buxar', 'mandi', 'hours', 'time', 'gates', 'open']
            }
        ];
    }

    /**
     * Retrieves the top matching knowledge document using token-overlap similarity scoring
     */
    retrieve(query, topK = 1) {
        const queryTokens = query.toLowerCase().split(/\s+/);
        
        const scoredDocs = this.knowledgeBase.map(doc => {
            let score = 0;
            // Add scores for matching keywords
            doc.keywords.forEach(keyword => {
                if (queryTokens.includes(keyword)) {
                    score += 2;
                }
            });

            // Add scores for matching content text tokens
            const contentTokens = doc.content.toLowerCase().split(/\s+/);
            queryTokens.forEach(token => {
                if (contentTokens.includes(token)) {
                    score += 0.5;
                }
            });

            return { doc, score };
        });

        // Sort descending by score
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, topK).map(item => item.doc);
    }

    /**
     * Generates a context-augmented response utilizing the retrieved knowledge document
     */
    generateAnswer(query) {
        const retrievedDocs = this.retrieve(query, 1);
        if (retrievedDocs.length === 0 || !retrievedDocs[0]) {
            return {
                contextTitle: 'None',
                answer: "I couldn't find any relevant local guidelines to answer your query."
            };
        }

        const doc = retrievedDocs[0];

        // Simulate local generator model synthesizing the answer under constraints
        let answer = '';
        if (doc.id === 'doc-crop-basmati') {
            answer = `Based on agricultural guidelines: Basmati must be sown in June/July. Keep harvest moisture under 14% to ensure Premium Grade pricing.`;
        } else if (doc.id === 'doc-wallet-refunds') {
            answer = `Under our transaction policy: Wallet refunds for failed transfers are processed automatically via Razorpay in 3-5 business days.`;
        } else if (doc.id === 'doc-mandi-buxar') {
            answer = `Based on operations guidelines: Buxar Mandi gates are open 06:00 AM - 08:00 PM weekdays and close at 02:00 PM on Saturdays.`;
        } else {
            answer = `According to local guidelines [${doc.title}]: ${doc.content}`;
        }

        console.log(`   [RAG Engine] Query: "${query}" | Retrieved: "${doc.title}"`);
        return {
            contextTitle: doc.title,
            answer
        };
    }
}
