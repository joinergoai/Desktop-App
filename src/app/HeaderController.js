import './AppHeader.js';
import './ApiKeyHeader.js';

class HeaderTransitionManager {
    constructor() {
        this.headerContainer = document.getElementById('header-container');
        this.currentHeaderType = null;   // 'apikey' | 'app'
        this.apiKeyHeader = null;
        this.appHeader = null;
        this.hasApiKey = false;
        this.isWorkOSAuthenticated = false;

        /**
         * Only one header window is allowed
         * @param {'apikey'|'app'} type
         */
        this.ensureHeader = (type) => {
            if (this.currentHeaderType === type) return;

            if (this.apiKeyHeader) { 
                this.apiKeyHeader.remove(); 
                this.apiKeyHeader = null; 
            }
            if (this.appHeader) { 
                this.appHeader.remove(); 
                this.appHeader = null; 
            }

            if (type === 'apikey') {
                this.apiKeyHeader = document.createElement('apikey-header');
                this.headerContainer.appendChild(this.apiKeyHeader);
            } else {
                this.appHeader = document.createElement('app-header');
                this.headerContainer.appendChild(this.appHeader);
                this.appHeader.startSlideInAnimation?.();
            }

            this.currentHeaderType = type;
            this.notifyHeaderState(type);
        };

        console.log('[HeaderController] Manager initialized');

        this._setupIpcHandlers();
        this._bootstrap();
    }

    _setupIpcHandlers() {
        if (!window.require) return;

        const { ipcRenderer } = window.require('electron');

        // Check for existing API key
        ipcRenderer
            .invoke('get-current-api-key')
            .then(storedKey => {
                this.hasApiKey = !!storedKey;
            })
            .catch(() => {});

        // WorkOS authentication handlers
        ipcRenderer.on('workos-auth-success', async (event, payload) => {
            console.log('[HeaderController] WorkOS authentication successful:', payload);
            this.isWorkOSAuthenticated = true;
            this.hasApiKey = false; // WorkOS users don't need API keys
            this.transitionToAppHeader(true);
        });
        
        ipcRenderer.on('workos-auth-failed', (event, error) => {
            console.error('[HeaderController] WorkOS authentication failed:', error);
            if (this.apiKeyHeader) {
                this.apiKeyHeader.errorMessage = error.message || 'WorkOS authentication failed';
                this.apiKeyHeader.requestUpdate();
            }
        });

        ipcRenderer.on('authenticated-user-restored', async (event, user) => {
            console.log('[HeaderController] Authenticated user restored:', user);
            this.isWorkOSAuthenticated = true;
            this.hasApiKey = false; // WorkOS users don't need API keys
            if (!this.appHeader) {
                await this.transitionToAppHeader(true);
            }
        });

        // API key handlers
        ipcRenderer.on('api-key-validated', () => {
            this.hasApiKey = true;
            this.transitionToAppHeader();
        });

        ipcRenderer.on('api-key-removed', () => {
            this.hasApiKey = false;
            if (!this.isWorkOSAuthenticated) {
                this.transitionToApiKeyHeader();
            }
        });

        ipcRenderer.on('api-key-updated', () => {
            this.hasApiKey = true;
            this.transitionToAppHeader();
        });

        // Logout handler
        ipcRenderer.on('request-logout', async () => {
            console.log('[HeaderController] Received request to sign out.');
            this.isWorkOSAuthenticated = false;
            if (!this.hasApiKey) {
                this.transitionToApiKeyHeader();
            }
        });
    }

    async _bootstrap() {
        // Check for existing API key
        let storedKey = null;
        if (window.require) {
            try {
                storedKey = await window
                    .require('electron')
                    .ipcRenderer.invoke('get-current-api-key');
            } catch (_) {}
        }
        this.hasApiKey = !!storedKey;

        // Check WorkOS authentication status
        if (window.require) {
            try {
                const authResult = await window
                    .require('electron')
                    .ipcRenderer.invoke('check-workos-auth');
                this.isWorkOSAuthenticated = authResult.isAuthenticated;
            } catch (_) {}
        }

        // Determine initial view
        if (this.isWorkOSAuthenticated || this.hasApiKey) {
            await this._resizeForApp();
            this.ensureHeader('app');
        } else {
            await this._resizeForApiKey();
            this.ensureHeader('apikey');
        }
    }

    notifyHeaderState(stateOverride) {
        const state = stateOverride || this.currentHeaderType || 'apikey';
        if (window.require) {
            window.require('electron').ipcRenderer.send('header-state-changed', state);
        }
    }

    async transitionToAppHeader(animate = true) {
        if (this.currentHeaderType === 'app') {
            return this._resizeForApp();
        }

        const canAnimate =
            animate &&
            this.apiKeyHeader &&
            !this.apiKeyHeader.classList.contains('hidden') &&
            typeof this.apiKeyHeader.startSlideOutAnimation === 'function';
    
        if (canAnimate) {
            const old = this.apiKeyHeader;
            const onEnd = () => {
                clearTimeout(fallback);
                this._resizeForApp().then(() => this.ensureHeader('app'));
            };
            old.addEventListener('animationend', onEnd, { once: true });
            old.startSlideOutAnimation();
    
            const fallback = setTimeout(onEnd, 450);
        } else {
            this.ensureHeader('app');
            this._resizeForApp();
        }
    }

    _resizeForApp() {
        if (!window.require) return Promise.resolve();
        return window
            .require('electron')
            .ipcRenderer.invoke('resize-header-window', { width: 353, height: 60 })
            .catch(() => {});
    }
    
    _resizeForApiKey() {
        if (!window.require) return Promise.resolve();
        return window
            .require('electron')
            .ipcRenderer.invoke('resize-header-window', { width: 285, height: 150 })
            .catch(() => {});
    }

    async transitionToApiKeyHeader() {
        await this._resizeForApiKey();
        
        if (this.currentHeaderType !== 'apikey') {
            this.ensureHeader('apikey');
        }
        
        if (this.apiKeyHeader) this.apiKeyHeader.reset();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new HeaderTransitionManager();
});
