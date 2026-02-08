// Aria Voice Studio - Pitch Detection AudioWorklet Processor
// Runs on dedicated audio thread for better performance

class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Buffer to accumulate samples
        this.buffer = new Float32Array(2048);
        this.bufferIndex = 0;
        
        // Configuration
        this.minFrequency = 50;   // Hz - lowest detectable
        this.maxFrequency = 1000; // Hz - highest detectable
        this.minRMS = 0.01;       // Minimum volume threshold
        this.confidenceThreshold = 0.5;
        
        // Listen for messages from main thread
        this.port.onmessage = (event) => {
            if (event.data.type === 'config') {
                if (event.data.minFreq) this.minFrequency = event.data.minFreq;
                if (event.data.maxFreq) this.maxFrequency = event.data.maxFreq;
                if (event.data.minRMS) this.minRMS = event.data.minRMS;
                if (event.data.confidenceThreshold) this.confidenceThreshold = event.data.confidenceThreshold;
            }
        };
    }
    
    /**
     * Process audio samples - called by audio thread
     * @param {Float32Array[][]} inputs - Input audio data
     * @param {Float32Array[][]} outputs - Output audio data (passthrough)
     * @returns {boolean} - Keep processor alive
     */
    process(inputs, outputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;
        
        const samples = input[0];
        
        // Accumulate samples into buffer
        for (let i = 0; i < samples.length; i++) {
            this.buffer[this.bufferIndex] = samples[i];
            this.bufferIndex++;
            
            // When buffer is full, analyze and send result
            if (this.bufferIndex >= this.buffer.length) {
                const result = this.detectPitch(this.buffer, sampleRate);
                
                // Send result to main thread
                this.port.postMessage({
                    type: 'pitch',
                    pitch: result.pitch,
                    confidence: result.confidence,
                    rms: result.rms
                });
                
                // Reset buffer (keep last quarter for overlap)
                const overlap = Math.floor(this.buffer.length / 4);
                this.buffer.copyWithin(0, this.buffer.length - overlap);
                this.bufferIndex = overlap;
            }
        }
        
        return true; // Keep processor alive
    }
    
    /**
     * Detect pitch using autocorrelation with trough detection
     * @param {Float32Array} buffer - Audio samples
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {{pitch: number, confidence: number, rms: number}}
     */
    detectPitch(buffer, sampleRate) {
        const SIZE = buffer.length;
        
        // Calculate RMS (volume level)
        let rms = 0;
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        
        // Check minimum volume threshold
        if (rms < this.minRMS) {
            return { pitch: 0, confidence: 0, rms: rms };
        }
        
        // Simple autocorrelation
        const autocorr = new Float32Array(SIZE);
        for (let lag = 0; lag < SIZE; lag++) {
            let sum = 0;
            for (let i = 0; i < SIZE - lag; i++) {
                sum += buffer[i] * buffer[i + lag];
            }
            autocorr[lag] = sum;
        }
        
        // Trough detection to prevent octave errors
        let peakLag = -1;
        let peakValue = -Infinity;
        let foundTrough = false;
        
        const minLag = Math.floor(sampleRate / this.maxFrequency);
        const maxLag = Math.ceil(sampleRate / this.minFrequency);
        
        for (let lag = minLag; lag < Math.min(maxLag, SIZE); lag++) {
            if (!foundTrough) {
                if (autocorr[lag] < autocorr[lag - 1]) {
                    continue;
                }
                foundTrough = true;
            }
            
            if (autocorr[lag] > peakValue) {
                peakValue = autocorr[lag];
                peakLag = lag;
            }
        }
        
        if (peakLag === -1) {
            return { pitch: 0, confidence: 0, rms: rms };
        }
        
        const confidence = peakValue / autocorr[0];
        
        if (confidence < this.confidenceThreshold) {
            return { pitch: 0, confidence: confidence, rms: rms };
        }
        
        // Parabolic interpolation for sub-sample accuracy
        let refinedLag = peakLag;
        if (peakLag > 0 && peakLag < SIZE - 1) {
            const y0 = autocorr[peakLag - 1];
            const y1 = autocorr[peakLag];
            const y2 = autocorr[peakLag + 1];
            
            const denominator = 2 * (2 * y1 - y0 - y2);
            if (denominator !== 0) {
                refinedLag = peakLag + (y2 - y0) / denominator;
            }
        }
        
        const frequency = sampleRate / refinedLag;
        
        return { 
            pitch: frequency, 
            confidence: confidence, 
            rms: rms 
        };
    }
}

// Register the processor
registerProcessor('pitch-processor', PitchProcessor);
