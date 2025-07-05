const dataService = require('./dataService');

/**
 * WorkOS Authentication Service
 * Uses API Key authentication instead of client secret
 */
class WorkOSAuth {
    constructor() {
        this.refreshPromise = null;
    }

    /**
     * Get a valid WorkOS access token, refreshing if necessary
     * @param {string} uid - User ID
     * @returns {Promise<string>} Valid access token
     */
    async getAccessToken(uid) {
        try {
            const tokens = await dataService.getWorkOSTokens();
            
            if (!tokens || !tokens.workos_access_token) {
                throw new Error('No WorkOS tokens found');
            }

            // Check if token is expired or about to expire (5 minutes buffer)
            const now = Date.now();
            const expiresAt = tokens.workos_expires_at || 0;
            const bufferTime = 5 * 60 * 1000; // 5 minutes

            if (now >= expiresAt - bufferTime) {
                console.log('[WorkOS Auth] Token expired or expiring soon, refreshing...');
                return await this.refreshToken(uid);
            }

            return tokens.workos_access_token;
        } catch (error) {
            console.error('[WorkOS Auth] Error getting access token:', error);
            throw error;
        }
    }

    /**
     * Refresh the WorkOS access token
     * @param {string} uid - User ID
     * @returns {Promise<string>} New access token
     */
    async refreshToken(uid) {
        // Prevent multiple simultaneous refresh attempts
        if (this.refreshPromise) {
            return await this.refreshPromise;
        }

        this.refreshPromise = this._doRefresh(uid);
        
        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
        }
    }

    async _doRefresh(uid) {
        const tokens = await dataService.getWorkOSTokens();
        
        if (!tokens || !tokens.workos_refresh_token) {
            throw new Error('No refresh token available');
        }

        try {
            // Use your backend proxy for token refresh
            const backendUrl = process.env.BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/desktop/auth/refresh`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'PickleGlass/1.0'
                },
                body: JSON.stringify({
                    refresh_token: tokens.workos_refresh_token
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to refresh token');
            }

            // Save the new tokens
            await dataService.saveWorkOSTokens({
                access_token: data.access_token,
                refresh_token: data.refresh_token || tokens.workos_refresh_token, // Some providers don't rotate refresh tokens
                expires_at: Date.now() + ((data.expires_in || 3600) * 1000),
                workos_user_id: tokens.workos_user_id
            });

            console.log('[WorkOS Auth] Token refreshed successfully');
            return data.access_token;
        } catch (error) {
            console.error('[WorkOS Auth] Token refresh failed:', error);
            throw error;
        }
    }

    /**
     * Make an authenticated request to WorkOS API
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Response
     */
    async authenticatedRequest(endpoint, options = {}) {
        const uid = dataService.currentUserId;
        
        try {
            const accessToken = await this.getAccessToken(uid);
            
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'PickleGlass/1.0',
                ...options.headers
            };

            const response = await fetch(endpoint, {
                ...options,
                headers
            });

            // If we get a 401, try refreshing the token and retry once
            if (response.status === 401) {
                console.log('[WorkOS Auth] Got 401, attempting token refresh...');
                const newToken = await this.refreshToken(uid);
                
                headers.Authorization = `Bearer ${newToken}`;
                return await fetch(endpoint, {
                    ...options,
                    headers
                });
            }

            return response;
        } catch (error) {
            console.error('[WorkOS Auth] Authenticated request failed:', error);
            throw error;
        }
    }

    /**
     * Check if user has valid WorkOS authentication
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        try {
            const tokens = await dataService.getWorkOSTokens();
            return !!(tokens && tokens.workos_access_token);
        } catch (error) {
            return false;
        }
    }

    /**
     * Clear WorkOS authentication
     */
    async logout() {
        try {
            await dataService.saveWorkOSTokens({
                access_token: null,
                refresh_token: null,
                expires_at: null,
                workos_user_id: null
            });
            console.log('[WorkOS Auth] Logged out successfully');
        } catch (error) {
            console.error('[WorkOS Auth] Error during logout:', error);
        }
    }
}

const workosAuth = new WorkOSAuth();

module.exports = workosAuth; 