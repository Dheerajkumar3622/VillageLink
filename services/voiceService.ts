
// ==================== VOICE UI SERVICE ====================

export const startListening = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return reject('Speech recognition not supported');
        }

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'hi-IN'; // Default to Hindi for our target demographic
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            resolve(transcript);
        };

        recognition.onerror = (event: any) => {
            reject(event.error);
        };

        recognition.start();
    });
};

export const speak = (text: string, lang: string = 'hi-IN') => {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
};
