const WebSocket = require('ws');

/**
 * Connects to a Deepgram Realtime WebSocket session for STT using raw WebSocket.
 * @param {string} apiKey - The Deepgram API key for authentication.
 * @param {object} config - The configuration object for the realtime session.
 * @returns {object} The connection object with send and close methods.
 */
function connectToDeepgramSession(apiKey, config) {
    if (!apiKey) {
        throw new Error('Deepgram API key is required');
    }
    
    // Configure for ultra-fast transcription - minimal processing overhead
    const options = {
        model: 'nova-2',
        language: config.language || 'en',
        interim_results: true,
        utterance_end_ms: '1000',
        endpointing: 300,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 24000,
        channels: 1
    };

    // Build the WebSocket URL with query parameters
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
        queryParams.append(key, value.toString());
    });
    
    const wsUrl = `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`;
    
    let isConnected = false;
    let connectionReady = false;
    let audioQueue = [];
    let ws = null;

    try {
        // Create WebSocket connection with proper headers
        ws = new WebSocket(wsUrl, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'User-Agent': 'Deepgram-JS-Raw-Client/1.0.0'
            }
        });

        // Set up event handlers
        ws.on('open', () => {
            isConnected = true;
            connectionReady = true;
            
            // Process any queued audio
            while (audioQueue.length > 0) {
                const audioData = audioQueue.shift();
                try {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(audioData);
                    }
                } catch (err) {
                    console.error('Error sending queued audio:', err);
                }
            }
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                // Option 1: Minimal processing - pass raw Deepgram messages directly
                if (message.type === 'Metadata' && !connectionReady) {
                    connectionReady = true;
                }
                
                if (config.callbacks?.onmessage) {
                    config.callbacks.onmessage(message);
                }
            } catch (err) {
                console.error('Error parsing Deepgram message:', err);
            }
        });

        ws.on('error', (error) => {
            console.error('Deepgram WebSocket error:', error);
            isConnected = false;
            connectionReady = false;
            
            if (config.callbacks && config.callbacks.onerror) {
                config.callbacks.onerror(error);
            }
        });

        ws.on('close', (code, reason) => {
            isConnected = false;
            connectionReady = false;
            
            if (config.callbacks && config.callbacks.onclose) {
                config.callbacks.onclose({ code, reason: reason.toString() });
            }
        });

    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        throw error;
    }

    // Return a wrapper object that matches the expected interface
    return {
        sendRealtimeInput: (audioData) => {
            try {
                const audioBuffer = Buffer.from(audioData, 'base64');
                
                if (!connectionReady || !ws || ws.readyState !== WebSocket.OPEN) {
                    audioQueue.push(audioBuffer);
                } else {
                    ws.send(audioBuffer);
                }
            } catch (error) {
                console.error('Error sending audio to Deepgram:', error);
            }
        },
        close: () => {
            if (ws) {
                isConnected = false;
                connectionReady = false;
                audioQueue = [];
                
                try {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close(1000, 'Client closing');
                    }
                } catch (error) {
                    console.error('Error closing WebSocket:', error);
                }
            }
        },
        isReady: () => connectionReady && ws && ws.readyState === WebSocket.OPEN,
        getState: () => ({
            isConnected,
            connectionReady,
            queuedAudioCount: audioQueue.length
        })
    };
}

module.exports = {
    connectToDeepgramSession
}; 