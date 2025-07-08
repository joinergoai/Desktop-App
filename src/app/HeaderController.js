import './AppHeader.js';
import './ApiKeyHeader.js';
import './CalendarEventSelector.js';

class HeaderTransitionManager {
    constructor() {
        this.headerContainer = document.getElementById('header-container');
        this.currentHeaderType = null;   // 'login' | 'calendar' | 'app'
        this.loginHeader = null;
        this.appHeader = null;
        this.calendarEventSelector = null;
        this.isWorkOSAuthenticated = false;
        this.selectedCalendarEvent = null;

        /**
         * Only one header window is allowed
         * @param {'login'|'calendar'|'app'} type
         */
        this.ensureHeader = (type) => {
            if (this.currentHeaderType === type) return;

            if (this.loginHeader) { 
                this.loginHeader.remove(); 
                this.loginHeader = null; 
            }
            if (this.appHeader) { 
                this.appHeader.remove(); 
                this.appHeader = null; 
            }
            if (this.calendarEventSelector) {
                this.calendarEventSelector.remove();
                this.calendarEventSelector = null;
            }

            if (type === 'login') {
                this.loginHeader = document.createElement('apikey-header');
                this.headerContainer.appendChild(this.loginHeader);
            } else if (type === 'calendar') {
                this.calendarEventSelector = document.createElement('calendar-event-selector');
                this.headerContainer.appendChild(this.calendarEventSelector);
                this._setupCalendarEventHandlers();
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

        // WorkOS authentication handlers
        ipcRenderer.on('workos-auth-success', async (event, payload) => {
            console.log('[HeaderController] WorkOS authentication successful:', payload);
            this.isWorkOSAuthenticated = true;
            this.transitionToCalendarSelector(true);
        });
        
        ipcRenderer.on('workos-auth-failed', (event, error) => {
            console.error('[HeaderController] WorkOS authentication failed:', error);
            if (this.loginHeader) {
                this.loginHeader.errorMessage = error.message || 'WorkOS authentication failed';
                this.loginHeader.requestUpdate();
            }
        });

        ipcRenderer.on('authenticated-user-restored', async (event, user) => {
            console.log('[HeaderController] Authenticated user restored:', user);
            this.isWorkOSAuthenticated = true;
            if (!this.appHeader && !this.calendarEventSelector) {
                await this.transitionToCalendarSelector(true);
            }
        });

        // Logout handler
        ipcRenderer.on('request-logout', async () => {
            console.log('[HeaderController] Received request to sign out.');
            this.isWorkOSAuthenticated = false;
            this.selectedCalendarEvent = null;
            
            // Clear the event in dataService via IPC
            ipcRenderer.send('set-calendar-event', null);
            
            this.transitionToLoginHeader();
        });

        // Calendar event handlers
        ipcRenderer.on('calendar-event-selected', async (event, calendarEvent) => {
            console.log('[HeaderController] Calendar event selected:', calendarEvent);
            this.selectedCalendarEvent = calendarEvent;
            
            // Store the event in dataService via IPC
            ipcRenderer.send('set-calendar-event', calendarEvent);
            
            // Perform CRM lookup before transitioning
            await this._performCRMLookup(calendarEvent);
            
            this.transitionToAppHeader(true);
        });

        ipcRenderer.on('calendar-event-skipped', () => {
            console.log('[HeaderController] Calendar event selection skipped');
            this.selectedCalendarEvent = null;
            
            // Clear the event in dataService via IPC
            ipcRenderer.send('set-calendar-event', null);
            
            this.transitionToAppHeader(true);
        });
    }

    _setupCalendarEventHandlers() {
        if (!this.calendarEventSelector) return;

        this.calendarEventSelector.addEventListener('event-selected', async (e) => {
            console.log('[HeaderController] Calendar event selected via DOM:', e.detail.event);
            this.selectedCalendarEvent = e.detail.event;
            
            // Store the event in dataService via IPC
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('set-calendar-event', e.detail.event);
            }
            
            // Perform CRM lookup before transitioning
            await this._performCRMLookup(e.detail.event);
            
            this.transitionToAppHeader(true);
        });

        this.calendarEventSelector.addEventListener('selection-skipped', () => {
            console.log('[HeaderController] Calendar event selection skipped via DOM');
            this.selectedCalendarEvent = null;
            
            // Clear the event in dataService via IPC
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('set-calendar-event', null);
                ipcRenderer.send('set-deal-info', null);
            }
            
            this.transitionToAppHeader(true);
        });
    }

    async _performCRMLookup(calendarEvent) {
        if (!calendarEvent || !calendarEvent.participants) {
            console.log('[HeaderController] Skipping CRM lookup - missing requirements');
            return;
        }

        let dealInfo = null;
        
        try {
            // Show loading state on calendar selector
            if (this.calendarEventSelector) {
                this.calendarEventSelector.loading = true;
                this.calendarEventSelector.requestUpdate();
            }

            // Perform CRM lookup via IPC
            const { ipcRenderer } = window.require('electron');
            dealInfo = await ipcRenderer.invoke('perform-crm-lookup', calendarEvent);
            
            console.log('[HeaderController] CRM lookup complete, deal info:', dealInfo);

        } catch (error) {
            console.error('[HeaderController] Error during CRM lookup:', error);
            dealInfo = {
                success: false,
                dealFound: false,
                dealInfo: null,
                email: null
            };
        } finally {
            // Remove loading state
            if (this.calendarEventSelector) {
                this.calendarEventSelector.loading = false;
                this.calendarEventSelector.requestUpdate();
                
                // Show deal lookup result status
                if (dealInfo) {
                    this.calendarEventSelector.setDealLookupResult(dealInfo);
                }
            }
        }
    }

    async _bootstrap() {
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
        if (this.isWorkOSAuthenticated) {
            // Go to calendar selector for authenticated users
            await this._resizeForCalendar();
            this.ensureHeader('calendar');
        } else {
            await this._resizeForLogin();
            this.ensureHeader('login');
        }
    }

    notifyHeaderState(stateOverride) {
        const state = stateOverride || this.currentHeaderType || 'login';
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
            ((this.loginHeader &&
            !this.loginHeader.classList.contains('hidden') &&
            typeof this.loginHeader.startSlideOutAnimation === 'function') ||
            (this.calendarEventSelector &&
            !this.calendarEventSelector.classList.contains('hidden')));
    
        if (canAnimate) {
            const old = this.loginHeader || this.calendarEventSelector;
            const onEnd = () => {
                clearTimeout(fallback);
                this._resizeForApp().then(() => this.ensureHeader('app'));
            };
            old.addEventListener('animationend', onEnd, { once: true });
            if (old.startSlideOutAnimation) {
                old.startSlideOutAnimation();
            }
    
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
    
    _resizeForLogin() {
        if (!window.require) return Promise.resolve();
        return window
            .require('electron')
            .ipcRenderer.invoke('resize-header-window', { width: 285, height: 150 })
            .catch(() => {});
    }

    _resizeForCalendar() {
        if (!window.require) return Promise.resolve();
        return window
            .require('electron')
            .ipcRenderer.invoke('resize-header-window', { width: 380, height: 240 })
            .catch(() => {});
    }

    async transitionToLoginHeader() {
        await this._resizeForLogin();
        
        if (this.currentHeaderType !== 'login') {
            this.ensureHeader('login');
        }
        
        if (this.loginHeader) this.loginHeader.reset();
    }

    async transitionToCalendarSelector(animate = true) {
        if (this.currentHeaderType === 'calendar') {
            return this._resizeForCalendar();
        }

        const canAnimate =
            animate &&
            this.loginHeader &&
            !this.loginHeader.classList.contains('hidden') &&
            typeof this.loginHeader.startSlideOutAnimation === 'function';

        if (canAnimate) {
            const old = this.loginHeader;
            const onEnd = () => {
                clearTimeout(fallback);
                this._resizeForCalendar().then(() => this.ensureHeader('calendar'));
            };
            old.addEventListener('animationend', onEnd, { once: true });
            old.startSlideOutAnimation();

            const fallback = setTimeout(onEnd, 450);
        } else {
            this.ensureHeader('calendar');
            this._resizeForCalendar();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new HeaderTransitionManager();
});
