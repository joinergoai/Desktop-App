require('dotenv').config();
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('./audioUtils.js');
const { connectToDeepgramSession } = require('../../common/services/deepgramClient.js');
const sqliteClient = require('../../common/services/sqliteClient');
const dataService = require('../../common/services/dataService');
const deepgramTokenService = require('../../common/services/deepgramTokenService');

async function getDeepgramApiKey() {
    try {
        // First try to get a fresh temporary token from the backend
        const canFetch = await deepgramTokenService.canFetchToken();
        if (canFetch) {
            console.log('[LiveSummaryService] Fetching new temporary Deepgram token from backend...');
            const token = await deepgramTokenService.getNewToken();
            return token;
        }
    } catch (error) {
        console.error('[LiveSummaryService] Failed to fetch Deepgram token from backend:', error);
    }

    // Fall back to environment variable
    const envKey = process.env.DEEPGRAM_API_KEY;
    if (envKey) {
        console.log('[LiveSummaryService] Using Deepgram API key from environment (fallback)');
        return envKey;
    }

    console.error('[LiveSummaryService] No Deepgram API key available');
    return null;
}

let currentSessionId = null;
let conversationHistory = [];
let isInitializedSession = false;
let isInitializingSession = false;
let mySttSession = null;
let theirSttSession = null;
let systemAudioProc = null;

let isInitialized = false;
let mainWindow = null;


/**
 * Formats conversation history into a prompt-friendly format.
 * @param {Array} history - Array of conversation texts
 * @param {number} maxTurns - Maximum number of conversation turns to include
 * @returns {string} Formatted conversation string
 */
function formatConversationForPrompt(history, maxTurns = 30) {
    const recentHistory = history.slice(-maxTurns);
    return recentHistory.join('\n');
}

function sendToRenderer(channel, data) {
    BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
    });
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        conversationHistory: conversationHistory,
        totalTexts: conversationHistory.length,
    };
}

// Conversation management functions
async function initializeNewSession() {
    try {
        const uid = dataService.currentUserId; // Get current user
        currentSessionId = await sqliteClient.createSession(uid);
        console.log(`[DB] New session started in DB: ${currentSessionId}`);

        conversationHistory = [];

        console.log('New conversation session started:', currentSessionId);
        return true;
    } catch (error) {
        console.error('Failed to initialize new session in DB:', error);
        currentSessionId = null;
        return false;
    }
}

async function saveConversationTurn(speaker, transcription) {
    if (!currentSessionId) {
        console.log('No active session, initializing a new one first.');
        const success = await initializeNewSession();
        if (!success) {
            console.error('Could not save turn because session initialization failed.');
            return;
        }
    }
    if (transcription.trim() === '') return;

    try {
        await sqliteClient.addTranscript({
            sessionId: currentSessionId,
            speaker: speaker,
            text: transcription.trim(),
        });
        console.log(`[DB] Saved transcript for session ${currentSessionId}: (${speaker})`);

        const conversationText = `${speaker.toLowerCase()}: ${transcription.trim()}`;
        conversationHistory.push(conversationText);
        console.log(`💬 Saved conversation text: ${conversationText}`);
        console.log(`📈 Total conversation history: ${conversationHistory.length} texts`);

        const conversationTurn = {
            speaker: speaker,
            timestamp: Date.now(),
            transcription: transcription.trim(),
        };
        sendToRenderer('update-live-transcription', { turn: conversationTurn });
        if (conversationHistory.length % 5 === 0) {
            console.log(`🔄 Auto-saving conversation session ${currentSessionId} (${conversationHistory.length} turns)`);
            sendToRenderer('save-conversation-session', {
                sessionId: currentSessionId,
                conversationHistory: conversationHistory,
            });
        }
    } catch (error) {
        console.error('Failed to save transcript to DB:', error);
    }
}

async function initializeLiveSummarySession(language = 'en') {
    if (isInitializingSession) {
        console.log('Session initialization already in progress.');
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);
    sendToRenderer('update-status', 'Initializing sessions...');

    // Get Deepgram API key for transcription
    const DEEPGRAM_KEY = await getDeepgramApiKey();
    if (!DEEPGRAM_KEY) {
        console.error('FATAL ERROR: Deepgram API Key is not defined.');
        
        // Check if user is authenticated
        const canFetch = await deepgramTokenService.canFetchToken();
        if (!canFetch) {
            sendToRenderer('update-status', 'Please sign in to use speech-to-text.');
            sendToRenderer('auth-required', { 
                message: 'Authentication required for speech-to-text',
                reason: 'token'
            });
        } else {
            sendToRenderer('update-status', 'Failed to get speech-to-text token. Please check your connection.');
        }
        
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        return false;
    }

    initializeNewSession();

    try {
        const handleMyMessage = message => {
            // Option 2: Optimized processing - direct path for Deepgram Results
            if (message.type !== 'Results') return;
            
            const transcript = message.channel?.alternatives?.[0]?.transcript;
            if (!transcript || transcript.includes('vq_lbr_audio_')) return;
            
            const speechFinal = message.speech_final;
            const isFinal = message.is_final;
            
            if (speechFinal && transcript.trim()) {
                // Final transcript - save immediately
                saveConversationTurn('Me', transcript.trim());
                sendToRenderer('stt-update', {
                    speaker: 'Me',
                    text: transcript.trim(),
                    isPartial: false,
                    isFinal: true,
                    timestamp: Date.now(),
                });
            } else if (transcript.trim()) {
                // Interim results - show immediately
                sendToRenderer('stt-update', {
                    speaker: 'Me',
                    text: transcript.trim(),
                    isPartial: !isFinal,
                    isFinal: isFinal,
                    timestamp: Date.now(),
                });
            }
        };

        const handleTheirMessage = message => {
            if (message.type !== 'Results') return;
            
            const transcript = message.channel?.alternatives?.[0]?.transcript;
            if (!transcript || transcript.includes('vq_lbr_audio_')) return;
            
            const speechFinal = message.speech_final;
            const isFinal = message.is_final;
            
            if (speechFinal && transcript.trim()) {
                // Final transcript - save immediately
                saveConversationTurn('Them', transcript.trim());
                sendToRenderer('stt-update', {
                    speaker: 'Them',
                    text: transcript.trim(),
                    isPartial: false,
                    isFinal: true,
                    timestamp: Date.now(),
                });
            } else if (transcript.trim()) {
                // Interim results - show immediately
                sendToRenderer('stt-update', {
                    speaker: 'Them',
                    text: transcript.trim(),
                    isPartial: !isFinal,
                    isFinal: isFinal,
                    timestamp: Date.now(),
                });
            }
        };

        const mySttConfig = {
            language: language,
            callbacks: {
                onmessage: handleMyMessage,
                onerror: error => console.error('My STT session error:', error.message),
                onclose: event => console.log('My STT session closed:', event.reason),
            },
        };
        const theirSttConfig = {
            language: language,
            callbacks: {
                onmessage: handleTheirMessage,
                onerror: error => console.error('Their STT session error:', error.message),
                onclose: event => console.log('Their STT session closed:', event.reason),
            },
        };

        mySttSession = connectToDeepgramSession(DEEPGRAM_KEY, mySttConfig);
        theirSttSession = connectToDeepgramSession(DEEPGRAM_KEY, theirSttConfig);

        // Wait for connections to be ready
        let waitTime = 0;
        const maxWait = 5000; // 5 seconds max
        const checkInterval = 100; // Check every 100ms
        
        while ((!mySttSession.isReady() || !theirSttSession.isReady()) && waitTime < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        if (!mySttSession.isReady() || !theirSttSession.isReady()) {
            throw new Error('Deepgram connections failed to become ready within timeout');
        }

        console.log('✅ Both STT sessions initialized successfully.');

        sendToRenderer('session-state-changed', { isActive: true });

        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Connected. Ready to listen.');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Deepgram STT sessions:', error);
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Initialization failed.');
        mySttSession = null;
        theirSttSession = null;
        return false;
    }
}

function killExistingSystemAudioDump() {
    return new Promise(resolve => {
        console.log('Checking for existing SystemAudioDump processes...');

        const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
            stdio: 'ignore',
        });

        killProc.on('close', code => {
            if (code === 0) {
                console.log('Killed existing SystemAudioDump processes');
            } else {
                console.log('No existing SystemAudioDump processes found');
            }
            resolve();
        });

        killProc.on('error', err => {
            console.log('Error checking for existing processes (this is normal):', err.message);
            resolve();
        });

        setTimeout(() => {
            killProc.kill();
            resolve();
        }, 2000);
    });
}

async function startMacOSAudioCapture() {
    if (process.platform !== 'darwin' || !theirSttSession) return false;

    await killExistingSystemAudioDump();
    console.log('Starting macOS audio capture for "Them"...');

    const { app } = require('electron');
    const path = require('path');
    const systemAudioPath = app.isPackaged
        ? path.join(process.resourcesPath, 'SystemAudioDump')
        : path.join(app.getAppPath(), 'src', 'assets', 'SystemAudioDump');

    console.log('SystemAudioDump path:', systemAudioPath);

    systemAudioProc = spawn(systemAudioPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!systemAudioProc.pid) {
        console.error('Failed to start SystemAudioDump');
        return false;
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid);

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    systemAudioProc.stdout.on('data', async data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;
            const base64Data = monoChunk.toString('base64');

            sendToRenderer('system-audio-data', { data: base64Data });

            if (theirSttSession) {
                try {
                    // await theirSttSession.sendRealtimeInput({
                    //     audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' },
                    // });
                    await theirSttSession.sendRealtimeInput(base64Data);
                } catch (err) {
                    console.error('Error sending system audio:', err.message);
                }
            }

            if (process.env.DEBUG_AUDIO) {
                saveDebugAudio(monoChunk, 'system_audio');
            }
        }
    });

    systemAudioProc.stderr.on('data', data => {
        console.error('SystemAudioDump stderr:', data.toString());
    });

    systemAudioProc.on('close', code => {
        console.log('SystemAudioDump process closed with code:', code);
        systemAudioProc = null;
    });

    systemAudioProc.on('error', err => {
        console.error('SystemAudioDump process error:', err);
        systemAudioProc = null;
    });

    return true;
}

function convertStereoToMono(stereoBuffer) {
    const samples = stereoBuffer.length / 4;
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
        const leftSample = stereoBuffer.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
}

function stopMacOSAudioCapture() {
    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToOpenAI(base64Data, sttSessionRef) {
    if (!sttSessionRef.current) return;

    try {
        process.stdout.write('.');
        await sttSessionRef.current.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending audio to OpenAI:', error);
    }
}

function isSessionActive() {
    return !!mySttSession && !!theirSttSession;
}

async function closeSession() {
    if (!isSessionActive()) {
        console.log('No active session to close.');
        return;
    }

    console.log('🛑 Closing live summary session...');

    stopMacOSAudioCapture();

    if (mySttSession) {
        mySttSession.close();
        mySttSession = null;
    }
    if (theirSttSession) {
        theirSttSession.close();
        theirSttSession = null;
    }

    sendToRenderer('session-state-changed', { isActive: false });
    sendToRenderer('session-closed', { totalTurns: conversationHistory.length });
    sendToRenderer('update-status', 'Session closed.');

    // Reset session state
    conversationHistory = [];
    currentSessionId = null;
}

function setupLiveSummaryIpcHandlers() {
    ipcMain.handle('is-session-active', async () => {
        const isActive = isSessionActive();
        console.log(`Checking session status. Active: ${isActive}`);
        return isActive;
    });

    ipcMain.handle('initialize-openai', async (event, profile = 'interview', language = 'en') => {
        console.log(`Received initialize-openai request with profile: ${profile}, language: ${language}`);
        const success = await initializeLiveSummarySession();
        return success;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        if (!mySttSession) return { success: false, error: 'User STT session not active' };
        try {
            await mySttSession.sendRealtimeInput(data);
            return { success: true };
        } catch (error) {
            console.error('Error sending user audio:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-macos-audio', async () => {
        if (process.platform !== 'darwin') {
            return { success: false, error: 'macOS audio capture only available on macOS' };
        }
        try {
            const success = await startMacOSAudioCapture();
            return { success };
        } catch (error) {
            console.error('Error starting macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-macos-audio', async () => {
        try {
            stopMacOSAudioCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-conversation-history', async () => {
        try {
            const formattedHistory = formatConversationForPrompt(conversationHistory);
            console.log(`📤 Sending conversation history to renderer: ${conversationHistory.length} texts`);
            return { success: true, data: formattedHistory };
        } catch (error) {
            console.error('Error getting conversation history:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async () => {
        return await closeSession();
    });

    ipcMain.handle('get-current-session', async event => {
        try {
            return { success: true, data: getCurrentSessionData() };
        } catch (error) {
            console.error('Error getting current session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-new-session', async event => {
        try {
            initializeNewSession();
            return { success: true, sessionId: currentSessionId };
        } catch (error) {
            console.error('Error starting new session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-google-search-setting', async (event, enabled) => {
        try {
            console.log('Google Search setting updated to:', enabled);
            return { success: true };
        } catch (error) {
            console.error('Error updating Google Search setting:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    initializeLiveSummarySession,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToOpenAI,
    setupLiveSummaryIpcHandlers,
    isSessionActive,
    closeSession,
};
