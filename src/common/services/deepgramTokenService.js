const workosAuth = require('./workosAuth');
const dataService = require('./dataService');
const config = require('../config/config');

/**
 * Service to fetch temporary Deepgram API tokens
 * Gets a fresh token for each transcription session
 */
class DeepgramTokenService {
    constructor() {
        this.fetchPromise = null;
    }

    /**
     * Fetch a new token from the backend
     * Each transcription session gets its own token
     * @returns {Promise<string>} New Deepgram API token
     */
    async getNewToken() {
        // If a fetch is already in progress, wait for it
        if (this.fetchPromise) {
            return await this.fetchPromise;
        }

        // Fetch a new token
        this.fetchPromise = this._doFetch();
        
        try {
            const token = await this.fetchPromise;
            return token;
        } finally {
            this.fetchPromise = null;
        }
    }

    async _doFetch() {
        try {
            const backendUrl = config.get('backendUrl');
            if (!backendUrl) {
                throw new Error('BACKEND_URL not configured');
            }

            console.log('[DeepgramToken] Fetching new temporary token from backend...');

            // Use WorkOS authenticated request
            const response = await workosAuth.authenticatedRequest(
                `${backendUrl}/api/desktop/stt/deepgram-token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Failed to fetch token: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.temporaryKey) {
                throw new Error('No temporary key in response');
            }

            console.log('[DeepgramToken] New token obtained, expires at:', data.expiresAt);
            return data.temporaryKey;

        } catch (error) {
            console.error('[DeepgramToken] Failed to fetch token:', error);
            
            // If we fail to get a token from backend, check if there's a fallback API key
            const fallbackKey = process.env.DEEPGRAM_API_KEY;
            if (fallbackKey) {
                console.log('[DeepgramToken] Using fallback API key from environment');
                return fallbackKey;
            }
            
            throw error;
        }
    }

    /**
     * Check if user is authenticated and can fetch tokens
     * @returns {Promise<boolean>}
     */
    async canFetchToken() {
        try {
            return await workosAuth.isAuthenticated();
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
const deepgramTokenService = new DeepgramTokenService();
module.exports = deepgramTokenService; 