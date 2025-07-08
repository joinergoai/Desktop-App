const config = require('../config/config');

class DataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = config.get('cacheTimeout');
        this.enableCaching = config.get('enableCaching');
        this.sqliteClient = null;
        this.currentUserId = null;
        this.currentCalendarEvent = null;  // Store selected calendar event
        this.currentDealInfo = null;       // Store CRM deal info
        this.isInitialized = false;

        if (config.get('enableSQLiteStorage')) {
            try {
                this.sqliteClient = require('./sqliteClient');
                console.log('[DataService] SQLite storage enabled.');
            } catch (error) {
                console.error('[DataService] Failed to load SQLite client:', error);
            }
        }
    }

    async initialize() {
        if (this.isInitialized || !this.sqliteClient) {
            return;
        }
        
        try {
            await this.sqliteClient.connect();
            this.isInitialized = true;
            console.log('[DataService] Initialized successfully');
        } catch (error) {
            console.error('[DataService] Failed to initialize:', error);
            throw error;
        }
    }

    setCurrentUser(uid) {
        if (this.currentUserId !== uid) {
            console.log(`[DataService] Current user switched to: ${uid}`);
            this.currentUserId = uid;
            this.currentCalendarEvent = null;  // Clear calendar event on user switch
            this.currentDealInfo = null;       // Clear deal info on user switch
            this.clearCache();
        }
    }

    setCurrentCalendarEvent(event) {
        this.currentCalendarEvent = event;
        
        if (event) {
            console.log('[DataService] Calendar event saved:', {
                title: event.title,
                startTime: event.startTime,
                startTimezone: event.startTimezone,
                participants: event.participants,
            });
        } else {
            console.log('[DataService] Calendar event cleared');
        }
    }

    getCurrentCalendarEvent() {
        return this.currentCalendarEvent;
    }

    setCurrentDealInfo(dealInfo) {
        this.currentDealInfo = dealInfo;
        
        if (dealInfo) {
            if (dealInfo.success && dealInfo.dealFound) {
                console.log('[DataService] CRM deal found and saved:', {
                    email: dealInfo.email,
                    dealFound: true,
                    hasDealInfo: !!dealInfo.dealInfo
                });
            } else if (dealInfo.success && !dealInfo.dealFound) {
                console.log('[DataService] CRM lookup successful but no deal found');
            } else {
                console.log('[DataService] CRM lookup failed');
            }
        } else {
            console.log('[DataService] CRM deal info cleared');
        }
    }

    getCurrentDealInfo() {
        return this.currentDealInfo;
    }

    getCacheKey(operation, params = '') {
        const userId = this.currentUserId || 'guest';
        return `${userId}:${operation}:${params}`;
    }

    getFromCache(key) {
        if (!this.enableCaching) return null;
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        if (!this.enableCaching) return;
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    clearCache() {
        this.cache.clear();
    }

    async findOrCreateUser(user) {
        if (!this.sqliteClient) {
            console.log('[DataService] SQLite client not available, skipping user creation');
            return user;
        }
        
        try {
            await this.initialize();
            const existingUser = await this.sqliteClient.getUser(user.uid);
            
            if (!existingUser) {
                console.log(`[DataService] Creating new user in local DB: ${user.uid}`);
                await this.sqliteClient.findOrCreateUser({
                    uid: user.uid,
                    display_name: user.displayName || user.display_name,
                    email: user.email
                });
            } else {
                console.log(`[DataService] User already exists: ${user.uid}`);
                // User already exists, no need to recreate
            }
            
            this.clearCache();
            return user;
        } catch (error) {
            console.error('[DataService] Failed to sync user to local DB:', error);
            return user;
        }
    }

    async saveApiKey(apiKey) {
        if (!this.sqliteClient) {
            throw new Error("SQLite client not available.");
        }
        if (!this.currentUserId) {
            throw new Error("No user logged in. Please authenticate first.");
        }
        try {
            await this.initialize();
            const result = await this.sqliteClient.saveApiKey(apiKey, this.currentUserId);
            this.clearCache();
            return result;
        } catch (error) {
            console.error('[DataService] Failed to save API key to SQLite:', error);
            throw error;
        }
    }

    async checkApiKey() {
        if (!this.sqliteClient || !this.currentUserId) return { hasApiKey: false };
        try {
            await this.initialize();
            const user = await this.sqliteClient.getUser(this.currentUserId);
            return { hasApiKey: !!user?.api_key && user.api_key.length > 0 };
        } catch (error) {
            console.error('[DataService] Failed to check API key from SQLite:', error);
            return { hasApiKey: false };
        }
    }

    async getUserPresets() {
        const cacheKey = this.getCacheKey('presets');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.sqliteClient || !this.currentUserId) return [];
        try {
            await this.initialize();
            const presets = await this.sqliteClient.getPresets(this.currentUserId);
            this.setCache(cacheKey, presets);
            return presets;
        } catch (error) {
            console.error('[DataService] Failed to get presets from SQLite:', error);
            return [];
        }
    }

    async getPresetTemplates() {
        const cacheKey = this.getCacheKey('preset_templates');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.sqliteClient) return [];
        try {
            await this.initialize();
            const templates = await this.sqliteClient.getPresetTemplates();
            this.setCache(cacheKey, templates);
            return templates;
        } catch (error) {
            console.error('[DataService] Failed to get preset templates from SQLite:', error);
            return [];
        }
    }

    async saveWorkOSTokens(tokens) {
        if (!this.sqliteClient) {
            throw new Error("SQLite client not available.");
        }
        if (!this.currentUserId) {
            throw new Error("No user logged in. Cannot save WorkOS tokens.");
        }
        try {
            await this.initialize();
            await this.sqliteClient.saveWorkOSTokens(this.currentUserId, tokens);
            this.clearCache();
            console.log('[DataService] WorkOS tokens saved successfully');
            return { success: true };
        } catch (error) {
            console.error('[DataService] Failed to save WorkOS tokens:', error);
            return { success: false, error: error.message };
        }
    }

    async getWorkOSTokens() {
        const cacheKey = this.getCacheKey('workosTokens');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.sqliteClient || !this.currentUserId) return null;
        try {
            await this.initialize();
            const tokens = await this.sqliteClient.getWorkOSTokens(this.currentUserId);
            if (tokens) {
                this.setCache(cacheKey, tokens);
            }
            return tokens;
        } catch (error) {
            console.error('[DataService] Failed to get WorkOS tokens:', error);
            return null;
        }
    }
    
    async restoreAuthenticatedUser() {
        if (!this.sqliteClient) return false;
        try {
            await this.initialize();
            
            // Get all authenticated users (there should only be one)
            const user = await this.sqliteClient.getAuthenticatedWorkOSUser();
            if (user && user.uid) {
                this.setCurrentUser(user.uid);
                console.log('[DataService] Restored authenticated user:', user.email);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('[DataService] Failed to restore authenticated user:', error);
            return false;
        }
    }
}

const dataService = new DataService();

module.exports = dataService;