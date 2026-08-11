/**
 * SSG (Static Site Generation) with ISR (Incremental Static Regeneration) Engine
 * Pre-renders page templates and triggers async background revalidation upon cache expiration.
 */

export class SsgIsrEngine {
    constructor() {
        this.revalidateTTL = 1000; // 1 second revalidation TTL for testing
        this.cache = new Map();
    }

    /**
     * Builds static HTML markup from template and dynamic parameters
     */
    buildStaticMarkup(pageName, data) {
        return `<html><body><h1>VillageLink Static Directory: ${pageName}</h1><p>Market Price: INR ${data.price}/quintal</p></body></html>`;
    }

    /**
     * Serves statically built pages and triggers background ISR revalidations
     */
    renderPage(pageName, dataFetcher) {
        const cachedEntry = this.cache.get(pageName);
        const currentTime = Date.now();

        // Case 1: Cache Miss
        if (!cachedEntry) {
            console.log(`   [SSG-ISR] CACHE_MISS on "${pageName}". Compiling static page...`);
            const data = dataFetcher();
            const html = this.buildStaticMarkup(pageName, data);
            
            this.cache.set(pageName, {
                html,
                generatedAt: currentTime,
                data
            });

            return {
                status: 'CACHE_MISS',
                html
            };
        }

        const age = currentTime - cachedEntry.generatedAt;

        // Case 2: Cache Hit (Fresh)
        if (age < this.revalidateTTL) {
            console.log(`   [SSG-ISR] CACHE_HIT on "${pageName}". Returning fresh static build.`);
            return {
                status: 'CACHE_HIT',
                html: cachedEntry.html
            };
        }

        // Case 3: Cache Stale (Triggers ISR Background Revalidation)
        console.log(`   [SSG-ISR] CACHE_STALE on "${pageName}". Serving stale HTML; triggering background revalidation.`);
        
        // Execute background revalidation asynchronously
        setTimeout(() => {
            try {
                const freshData = dataFetcher();
                const freshHtml = this.buildStaticMarkup(pageName, freshData);
                
                this.cache.set(pageName, {
                    html: freshHtml,
                    generatedAt: Date.now(),
                    data: freshData
                });
                
                console.log(`   [SSG-ISR] Background revalidation completed for "${pageName}".`);
            } catch (err) {
                console.error(`   [SSG-ISR] Background revalidation failed for "${pageName}":`, err.message);
            }
        }, 10);

        return {
            status: 'CACHE_STALE_REVALIDATING',
            html: cachedEntry.html
        };
    }
}
