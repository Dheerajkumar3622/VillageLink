/**
 * Backpressure Flow Control Queue
 * Regulates ingestion rates to match database write throughput limits.
 * Emits signals to pause/resume data flows when boundaries cross watermarks.
 */

export class BackpressureQueue {
    constructor(highWaterMark = 10, lowWaterMark = 3) {
        this.highWaterMark = highWaterMark;
        this.lowWaterMark = lowWaterMark;

        this.queue = [];
        this.isSourcePaused = false;
        
        // Callback hooks
        this.onPause = () => {};
        this.onResume = () => {};
    }

    /**
     * Enqueues an incoming data element, pausing the source if the buffer fills up
     * @param {Object} item Telemetry event record
     */
    push(item) {
        this.queue.push(item);

        if (this.queue.length >= this.highWaterMark && !this.isSourcePaused) {
            this.isSourcePaused = true;
            console.log(`   [Backpressure] High watermark crossed (${this.queue.length}/${this.highWaterMark}). Signaling PAUSE.`);
            this.onPause();
        }
    }

    /**
     * Dequeues an element, resuming the source once the buffer drains sufficiently
     */
    pop() {
        if (this.queue.length === 0) return null;

        const item = this.queue.shift();

        if (this.queue.length <= this.lowWaterMark && this.isSourcePaused) {
            this.isSourcePaused = false;
            console.log(`   [Backpressure] Bounded queue drained below watermark (${this.queue.length}/${this.lowWaterMark}). Signaling RESUME.`);
            this.onResume();
        }

        return item;
    }

    /**
     * Registers control callback hooks
     */
    registerControls(onPauseFn, onResumeFn) {
        this.onPause = onPauseFn;
        this.onResume = onResumeFn;
    }

    /**
     * Returns size metrics
     */
    getSize() {
        return this.queue.length;
    }
}
