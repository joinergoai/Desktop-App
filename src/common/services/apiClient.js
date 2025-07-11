const axios = require('axios');
const config = require('../config/config');
const workosAuth = require('./workosAuth');

class APIClient {
    constructor() {
        this.baseURL = config.get('backendUrl');
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: config.get('apiTimeout'),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                console.error('API request failed:', error.message);
                if (error.response) {
                    console.error('response status:', error.response.status);
                    console.error('response data:', error.response.data);
                }
                return Promise.reject(error);
            }
        );
    }

    async initialize() {
        try {
            const response = await this.client.get('/api/auth/status');
            console.log('[APIClient] checked default user status:', response.data);
            return true;
        } catch (error) {
            console.error('[APIClient] failed to initialize:', error);
            return false;
        }
    }

    async checkConnection() {
        try {
            const response = await this.client.get('/');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async saveApiKey(apiKey) {
        try {
            const response = await this.client.post('/api/user/api-key', { apiKey });
            return response.data;
        } catch (error) {
            console.error('failed to save api key:', error);
            throw error;
        }
    }

    async checkApiKey() {
        try {
            const response = await this.client.get('/api/user/api-key');
            return response.data;
        } catch (error) {
            console.error('failed to check api key:', error);
            return { hasApiKey: false };
        }
    }

    async getUserBatchData(includes = ['profile', 'context', 'presets']) {
        try {
            const includeParam = includes.join(',');
            const response = await this.client.get(`/api/user/batch?include=${includeParam}`);
            return response.data;
        } catch (error) {
            console.error('failed to get user batch data:', error);
            return null;
        }
    }

    async getUserContext() {
        try {
            const response = await this.client.get('/api/user/context');
            return response.data.context;
        } catch (error) {
            console.error('fail to get user context:', error);
            return null;
        }
    }

    async getUserProfile() {
        try {
            const response = await this.client.get('/api/user/profile');
            return response.data;
        } catch (error) {
            console.error('failed to get user profile:', error);
            return null;
        }
    }

    async getUserPresets() {
        try {
            const response = await this.client.get('/api/user/presets');
            return response.data;
        } catch (error) {
            console.error('failed to get user presets:', error);
            return [];
        }
    }

    async updateUserContext(context) {
        try {
            const response = await this.client.post('/api/user/context', context);
            return response.data;
        } catch (error) {
            console.error('failed to update user context:', error);
            throw error;
        }
    }

    async addActivity(activity) {
        try {
            const response = await this.client.post('/api/user/activities', activity);
            return response.data;
        } catch (error) {
            console.error('failed to add activity:', error);
            throw error;
        }
    }

    async getPresetTemplates() {
        try {
            const response = await this.client.get('/api/preset-templates');
            return response.data;
        } catch (error) {
            console.error('failed to get preset templates:', error);
            return [];
        }
    }

    async updateUserProfile(profile) {
        try {
            const response = await this.client.post('/api/user/profile', profile);
            return response.data;
        } catch (error) {
            console.error('failed to update user profile:', error);
            throw error;
        }
    }

    async searchUsers(name = '') {
        try {
            const response = await this.client.get('/api/users/search', {
                params: { name }
            });
            return response.data;
        } catch (error) {
            console.error('failed to search users:', error);
            return [];
        }
    }

    async getUserProfileById(userId) {
        try {
            const response = await this.client.get(`/api/users/${userId}/profile`);
            return response.data;
        } catch (error) {
            console.error('failed to get user profile by id:', error);
            return null;
        }
    }

    async saveConversationSession(sessionId, conversationHistory) {
        try {
            const payload = {
                sessionId,
                conversationHistory
            };
            const response = await this.client.post('/api/conversations', payload);
            return response.data;
        } catch (error) {
            console.error('failed to save conversation session:', error);
            throw error;
        }
    }

    async getConversationSession(sessionId) {
        try {
            const response = await this.client.get(`/api/conversations/${sessionId}`);
            return response.data;
        } catch (error) {
            console.error('failed to get conversation session:', error);
            return null;
        }
    }

    async getAllConversationSessions() {
        try {
            const response = await this.client.get('/api/conversations');
            return response.data;
        } catch (error) {
            console.error('failed to get all conversation sessions:', error);
            return [];
        }
    }

    async deleteConversationSession(sessionId) {
        try {
            const response = await this.client.delete(`/api/conversations/${sessionId}`);
            return response.data;
        } catch (error) {
            console.error('failed to delete conversation session:', error);
            throw error;
        }
    }

    async getSyncStatus() {
        try {
            const response = await this.client.get('/api/sync/status');
            return response.data;
        } catch (error) {
            console.error('failed to get sync status:', error);
            return null;
        }
    }

    async getFullUserData() {
        try {
            const response = await this.client.get('/api/user/full');
            return response.data;
        } catch (error) {
            console.error('failed to get full user data:', error);
            return null;
        }
    }

    async chatCompletion(requestBody) {
        try {
            // Get valid access token (handles refresh automatically)
            const accessToken = await workosAuth.getAccessToken();
            
            const isStreaming = requestBody.stream === true;
            
            if (isStreaming) {
                // For streaming, use fetch instead of axios for better SSE support
                const response = await fetch(`${this.baseURL}/api/desktop/openai/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`API error: ${response.status} - ${error}`);
                }

                // Return the ReadableStream body directly for SSE parsing
                return response.body;
            } else {
                // Non-streaming can use axios
                const response = await this.client.post('/api/desktop/openai/chat/completions', requestBody, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                return response.data;
            }
        } catch (error) {
            console.error('Chat completion request failed:', error);
            throw error;
        }
    }

    async getUpcomingCalendarEvents() {
        try {
            // Get valid access token (handles refresh automatically)
            const accessToken = await workosAuth.getAccessToken();
            
            const response = await this.client.get('/api/calendar/events/upcoming', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            // Access the events array from response.data.events
            const events = response.data.events ? response.data.events.slice(0, 6).map(event => ({
                title: event.title,
                startTime: event.startTime,
                startTimezone: event.startTimezone,
                participants: event.participants
            })) : [];
            
            return events;
        } catch (error) {
            console.error('failed to get upcoming calendar events:', error);
            return [];
        }
    }

    async getCRMDealByEmail(email) {
        try {
            console.log(`[APIClient] Getting CRM deal for email: ${email}`);
            const accessToken = await workosAuth.getAccessToken();
            
            const url = '/api/desktop/crm/deal-by-email';
            console.log(`[APIClient] Making request to: ${this.baseURL}${url}`);
            
            const response = await this.client.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: { email }
            });
            
            console.log(`[APIClient] CRM response received:`, response.data);
            return response.data;
        } catch (error) {
            console.error('[APIClient] Failed to get CRM deal by email:', error.message);
            if (error.response) {
                console.error('[APIClient] Response status:', error.response.status);
                console.error('[APIClient] Response data:', error.response.data);
            }
            // Return error response in expected format
            return {
                success: false,
                dealFound: false,
                dealInfo: null
            };
        }
    }
}

const apiClient = new APIClient();

module.exports = apiClient; 