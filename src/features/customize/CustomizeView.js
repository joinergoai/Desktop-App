import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 200px;
            height: 100%;
            color: white;
        }

        .settings-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(20, 20, 20, 0.8);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.2) solid;
            outline-offset: -1px;
            box-sizing: border-box;
            position: relative;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            z-index: 1000;
            max-height: 100vh;
        }

        .settings-container::-webkit-scrollbar {
            width: 6px;
        }

        .settings-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .settings-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .settings-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .settings-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }
            
        .settings-button[disabled],
        .api-key-section input[disabled] {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
        }

        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 4px;
            margin-bottom: 2px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 1;
            flex-shrink: 0;
        }

        .title-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .app-title {
            font-size: 13px;
            font-weight: 500;
            color: white;
            margin: 0 0 4px 0;
        }

        .account-info {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
        }

        .invisibility-icon {
            padding-top: 2px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .invisibility-icon.visible {
            opacity: 1;
        }

        .invisibility-icon svg {
            width: 16px;
            height: 16px;
        }

        .shortcuts-section {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 4px 0;
            position: relative;
            z-index: 1;
            flex-shrink: 0;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            color: white;
            font-size: 11px;
        }

        .shortcut-name {
            font-weight: 300;
        }

        .shortcut-keys {
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .cmd-key, .shortcut-key {
            background: rgba(255, 255, 255, 0.1);
            // border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }

        /* Buttons Section */
        .buttons-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 6px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 1;
            flex-shrink: 0;
            margin-bottom: 8px;
        }

        .settings-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }

        .settings-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .settings-button:active {
            transform: translateY(1px);
        }

        .settings-button.full-width {
            width: 100%;
        }

        .settings-button.half-width {
            flex: 1;
        }

        .settings-button.danger {
            background: rgba(255, 59, 48, 0.1);
            border-color: rgba(255, 59, 48, 0.3);
            color: rgba(255, 59, 48, 0.9);
        }

        .settings-button.danger:hover {
            background: rgba(255, 59, 48, 0.15);
            border-color: rgba(255, 59, 48, 0.4);
        }

        .move-buttons, .bottom-buttons {
            display: flex;
            gap: 4px;
        }

        .api-key-section {
            padding: 6px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Toggle Switch Styles */
        .toggle-switch {
            position: relative;
            width: 32px;
            height: 16px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            appearance: none;
        }

        .toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            transition: all 0.2s ease;
        }

        .toggle-switch:checked {
            background: #34d399;
        }

        .toggle-switch:checked::after {
            transform: translateX(16px);
        }

        .toggle-switch:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .toggle-switch:checked:hover {
            background: #22c55e;
        }

    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        throttleTokens: { type: Number },
        maxTokens: { type: Number },
        throttlePercent: { type: Number },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onScreenshotIntervalChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        contentProtection: { type: Boolean },
        userPresets: { type: Array },
        presetTemplates: { type: Array },
        currentUser: { type: String },
        isContentProtectionOn: { type: Boolean },
        isLoading: { type: Boolean },
        userEmail: { type: String, state: true },
    };

    constructor() {
        super();

        this.selectedProfile = localStorage.getItem('selectedProfile') || 'school';
        this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'en-US';
        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5000';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || '0.8';
        this.layoutMode = localStorage.getItem('layoutMode') || 'stacked';
        this.keybinds = this.getDefaultKeybinds();
        this.throttleTokens = 500;
        this.maxTokens = 2000;
        this.throttlePercent = 80;
        this.backgroundTransparency = 0.5;
        this.fontSize = 14;
        this.userPresets = [];
        this.presetTemplates = [];
        this.currentUser = null;
        this.isContentProtectionOn = true;
        this.isLoading = false;
        this.userEmail = '';
        this.contentProtection = true;

        this.loadKeybinds();
        this.loadRateLimitSettings();
        this.loadGoogleSearchSettings();
        this.loadBackgroundTransparency();
        this.loadFontSize();
        this.loadContentProtectionSettings();
        this.checkContentProtectionStatus();
    }

    async connectedCallback() {
        super.connectedCallback();
        
        this.loadLayoutMode();
        this.loadInitialData();

        this.resizeHandler = () => {
            this.requestUpdate();
            this.updateScrollHeight();
        };
        window.addEventListener('resize', this.resizeHandler);

        setTimeout(() => this.updateScrollHeight(), 100);

        // Add mouseenter handler to cancel hide timer when hovering over the panel
        this.addEventListener('mouseenter', () => {
            if (window.require) {
                window.require('electron').ipcRenderer.send('cancel-hide-window', 'settings');
            }
        });

        // Add mouseleave handler to hide panel when mouse leaves
        this.addEventListener('mouseleave', () => {
            if (window.require) {
                window.require('electron').ipcRenderer.send('hide-window', 'settings');
            }
        });

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            // Get current user info (we know they're authenticated if they can see this)
            try {
                const user = await ipcRenderer.invoke('get-current-user');
                console.log('[CustomizeView] Current user:', user);
                this.userEmail = user.email || 'Authenticated User';
            } catch (error) {
                console.error('[CustomizeView] Failed to get current user:', error);
                this.userEmail = 'Authenticated User';
            }
            
            ipcRenderer.on('user-changed', (event, user) => {
                console.log('[CustomizeView] Received user-changed:', user);
                this.userEmail = user.email || 'Authenticated User';
                this.requestUpdate();
            });
            
            ipcRenderer.on('authenticated-user-restored', (event, user) => {
                console.log('[CustomizeView] Authenticated user restored:', user);
                this.userEmail = user.email || 'Authenticated User';
                this.requestUpdate();
            });
            
            ipcRenderer.on('workos-auth-success', (event, payload) => {
                console.log('[CustomizeView] WorkOS auth success');
                if (payload && payload.user) {
                    this.userEmail = payload.user.email || 'Authenticated User';
                }
                this.requestUpdate();
            });
            
            // Listen for window show events to refresh user info
            ipcRenderer.on('window-show-animation', async () => {
                console.log('[CustomizeView] Window shown, refreshing user info');
                try {
                    const user = await ipcRenderer.invoke('get-current-user');
                    if (user && user.email !== this.userEmail) {
                        console.log('[CustomizeView] Updated user on window show:', user);
                        this.userEmail = user.email || 'Authenticated User';
                        this.requestUpdate();
                    }
                } catch (error) {
                    console.error('[CustomizeView] Failed to refresh user on window show:', error);
                }
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('user-changed');
            ipcRenderer.removeAllListeners('authenticated-user-restored');
            ipcRenderer.removeAllListeners('workos-auth-success');
            ipcRenderer.removeAllListeners('window-show-animation');
        }
    }

    updateScrollHeight() {
        const windowHeight = window.innerHeight;
        const headerHeight = 60;
        const padding = 40;
        const maxHeight = windowHeight - headerHeight - padding;
        
        this.style.maxHeight = `${maxHeight}px`;
    }

    async checkContentProtectionStatus() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.contentProtection = await ipcRenderer.invoke('get-content-protection-status');
            this.isContentProtectionOn = this.contentProtection;
            this.requestUpdate();
        }
    }

    getProfiles() {
        if (this.presetTemplates && this.presetTemplates.length > 0) {
            return this.presetTemplates.map(t => ({
                value: t.id || t._id,
                name: t.title,
                description: t.prompt?.slice(0, 60) + '...',
            }));
        }

        return [
            { value: 'school', name: 'School', description: '' },
            { value: 'meetings', name: 'Meetings', description: '' },
            { value: 'sales', name: 'Sales', description: '' },
            { value: 'recruiting', name: 'Recruiting', description: '' },
            { value: 'customer-support', name: 'Customer Support', description: '' },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-AU', name: 'English (Australia)' },
            { value: 'en-IN', name: 'English (India)' },
            { value: 'de-DE', name: 'German (Germany)' },
            { value: 'es-US', name: 'Spanish (United States)' },
            { value: 'es-ES', name: 'Spanish (Spain)' },
            { value: 'fr-FR', name: 'French (France)' },
            { value: 'fr-CA', name: 'French (Canada)' },
            { value: 'hi-IN', name: 'Hindi (India)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'ar-XA', name: 'Arabic (Generic)' },
            { value: 'id-ID', name: 'Indonesian (Indonesia)' },
            { value: 'it-IT', name: 'Italian (Italy)' },
            { value: 'ja-JP', name: 'Japanese (Japan)' },
            { value: 'tr-TR', name: 'Turkish (Turkey)' },
            { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { value: 'bn-IN', name: 'Bengali (India)' },
            { value: 'gu-IN', name: 'Gujarati (India)' },
            { value: 'kn-IN', name: 'Kannada (India)' },
            { value: 'ml-IN', name: 'Malayalam (India)' },
            { value: 'mr-IN', name: 'Marathi (India)' },
            { value: 'ta-IN', name: 'Tamil (India)' },
            { value: 'te-IN', name: 'Telugu (India)' },
            { value: 'nl-NL', name: 'Dutch (Netherlands)' },
            { value: 'ko-KR', name: 'Korean (South Korea)' },
            { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
            { value: 'pl-PL', name: 'Polish (Poland)' },
            { value: 'ru-RU', name: 'Russian (Russia)' },
            { value: 'th-TH', name: 'Thai (Thailand)' },
        ];
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };
    }

    handleScreenshotIntervalSelect(e) {
        this.selectedScreenshotInterval = e.target.value;
        localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        this.onScreenshotIntervalChange(this.selectedScreenshotInterval);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(e.target.value);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        localStorage.setItem('layoutMode', this.layoutMode);
        this.onLayoutModeChange(e.target.value);
    }

    getUserCustomPrompt() {
        console.log('[CustomizeView] getUserCustomPrompt called');
        console.log('[CustomizeView] userPresets:', this.userPresets);
        console.log('[CustomizeView] selectedProfile:', this.selectedProfile);
        
        if (!this.userPresets || this.userPresets.length === 0) {
            console.log('[CustomizeView] No presets - returning loading message');
            return 'Loading personalized prompt... Please set it in the web.';
        }
        
        let preset = this.userPresets.find(p => p.id === 'personalized' || p._id === 'personalized');
        console.log('[CustomizeView] personalized preset:', preset);
        
        if (!preset) {
            preset = this.userPresets.find(p => p.id === this.selectedProfile || p._id === this.selectedProfile);
            console.log('[CustomizeView] selectedProfile preset:', preset);
        }
        
        if (!preset) {
            preset = this.userPresets[0];
            console.log('[CustomizeView] Using first preset:', preset);
        }
        
        const result = preset?.prompt || 'No personalized prompt set.';
        console.log('[CustomizeView] Final returned prompt:', result);
        return result;
    }

    async loadInitialData() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            try {
                this.isLoading = true;
                this.userPresets = await ipcRenderer.invoke('get-user-presets');
                this.presetTemplates = await ipcRenderer.invoke('get-preset-templates');
                console.log('[CustomizeView] Loaded presets and templates via IPC');
            } catch (error) {
                console.error('[CustomizeView] Failed to load data via IPC:', error);
            } finally {
                this.isLoading = false;
            }
        } else {
            console.log('[CustomizeView] IPC not available');
        }
    }

    getDefaultKeybinds() {
        const isMac = window.ergoLive?.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Cmd+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Cmd+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Cmd+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Cmd+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            manualScreenshot: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    loadKeybinds() {
        const savedKeybinds = localStorage.getItem('customKeybinds');
        if (savedKeybinds) {
            try {
                this.keybinds = { ...this.getDefaultKeybinds(), ...JSON.parse(savedKeybinds) };
            } catch (e) {
                console.error('Failed to parse saved keybinds:', e);
                this.keybinds = this.getDefaultKeybinds();
            }
        }
    }

    saveKeybinds() {
        localStorage.setItem('customKeybinds', JSON.stringify(this.keybinds));
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        localStorage.removeItem('customKeybinds');
        this.requestUpdate();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    getKeybindActions() {
        return [
            {
                key: 'moveUp',
                name: 'Move Window Up',
                description: 'Move the application window up',
            },
            {
                key: 'moveDown',
                name: 'Move Window Down',
                description: 'Move the application window down',
            },
            {
                key: 'moveLeft',
                name: 'Move Window Left',
                description: 'Move the application window left',
            },
            {
                key: 'moveRight',
                name: 'Move Window Right',
                description: 'Move the application window right',
            },
            {
                key: 'toggleVisibility',
                name: 'Toggle Window Visibility',
                description: 'Show/hide the application window',
            },
            {
                key: 'toggleClickThrough',
                name: 'Toggle Click-through Mode',
                description: 'Enable/disable click-through functionality',
            },
            {
                key: 'nextStep',
                name: 'Ask Next Step',
                description: 'Ask AI for the next step suggestion',
            },
            {
                key: 'manualScreenshot',
                name: 'Manual Screenshot',
                description: 'Take a manual screenshot for AI analysis',
            },
            {
                key: 'previousResponse',
                name: 'Previous Response',
                description: 'Navigate to the previous AI response',
            },
            {
                key: 'nextResponse',
                name: 'Next Response',
                description: 'Navigate to the next AI response',
            },
            {
                key: 'scrollUp',
                name: 'Scroll Response Up',
                description: 'Scroll the AI response content up',
            },
            {
                key: 'scrollDown',
                name: 'Scroll Response Down',
                description: 'Scroll the AI response content down',
            },
        ];
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();

        const modifiers = [];
        const keys = [];

        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let mainKey = e.key;

        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            case 'KeyS':
                if (e.shiftKey) mainKey = 'S';
                break;
            case 'KeyM':
                mainKey = 'M';
                break;
            default:
                if (e.key.length === 1) {
                    mainKey = e.key.toUpperCase();
                }
                break;
        }

        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        const keybind = [...modifiers, mainKey].join('+');

        const action = e.target.dataset.action;

        this.handleKeybindChange(action, keybind);

        e.target.value = keybind;
        e.target.blur();
    }

    loadRateLimitSettings() {
        const throttleTokens = localStorage.getItem('throttleTokens');
        const maxTokens = localStorage.getItem('maxTokens');
        const throttlePercent = localStorage.getItem('throttlePercent');

        if (throttleTokens !== null) {
            this.throttleTokens = parseInt(throttleTokens, 10) || 500;
        }
        if (maxTokens !== null) {
            this.maxTokens = parseInt(maxTokens, 10) || 2000;
        }
        if (throttlePercent !== null) {
            this.throttlePercent = parseInt(throttlePercent, 10) || 80;
        }
    }

    handleThrottleTokensChange(e) {
        this.throttleTokens = parseInt(e.target.value, 10);
        localStorage.setItem('throttleTokens', this.throttleTokens.toString());
        this.requestUpdate();
    }

    handleMaxTokensChange(e) {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            this.maxTokens = value;
            localStorage.setItem('maxTokens', this.maxTokens.toString());
        }
    }

    handleThrottlePercentChange(e) {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            this.throttlePercent = value;
            localStorage.setItem('throttlePercent', this.throttlePercent.toString());
        }
    }

    resetRateLimitSettings() {
        this.throttleTokens = 500;
        this.maxTokens = 2000;
        this.throttlePercent = 80;

        localStorage.removeItem('throttleTokens');
        localStorage.removeItem('maxTokens');
        localStorage.removeItem('throttlePercent');

        this.requestUpdate();
    }

    loadGoogleSearchSettings() {
        const googleSearchEnabled = localStorage.getItem('googleSearchEnabled');
        if (googleSearchEnabled !== null) {
            this.googleSearchEnabled = googleSearchEnabled === 'true';
        }
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        localStorage.setItem('googleSearchEnabled', this.googleSearchEnabled.toString());

        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }

        this.requestUpdate();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode) {
            this.layoutMode = savedLayoutMode;
        }
    }

    loadBackgroundTransparency() {
        const backgroundTransparency = localStorage.getItem('backgroundTransparency');
        if (backgroundTransparency !== null) {
            this.backgroundTransparency = parseFloat(backgroundTransparency) || 0.5;
        }
        this.updateBackgroundTransparency();
    }

    handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        localStorage.setItem('backgroundTransparency', this.backgroundTransparency.toString());
        this.updateBackgroundTransparency();
        this.requestUpdate();
    }

    updateBackgroundTransparency() {
        const root = document.documentElement;
        root.style.setProperty('--header-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--card-background', `rgba(255, 255, 255, ${this.backgroundTransparency * 0.05})`);
        root.style.setProperty('--input-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.375})`);
        root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--button-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--preview-video-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 1.125})`);
        root.style.setProperty('--screen-option-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
        root.style.setProperty('--screen-option-hover-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.75})`);
        root.style.setProperty('--scrollbar-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            this.fontSize = parseInt(fontSize, 10) || 14;
        }
        this.updateFontSize();
    }

    handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        localStorage.setItem('fontSize', this.fontSize.toString());
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    loadContentProtectionSettings() {
        const contentProtection = localStorage.getItem('contentProtection');
        if (contentProtection !== null) {
            this.contentProtection = contentProtection === 'true';
        } else {
            // Default to true and save it
            this.contentProtection = true;
            localStorage.setItem('contentProtection', 'true');
        }
    }

    async handleContentProtectionChange(e) {
        this.contentProtection = e.target.checked;
        localStorage.setItem('contentProtection', this.contentProtection.toString());

        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-content-protection', this.contentProtection);
            } catch (error) {
                console.error('Failed to notify main process about content protection change:', error);
            }
        }

        this.requestUpdate();
    }

    render() {
        console.log('[CustomizeView] render: Rendering component template.');
        return html`
            <div class="settings-container">
                <div class="header-section">
                    <div>
                        <h1 class="app-title">Ergo Copilot</h1>
                        <div class="account-info">
                            <span style="color: #34d399;">●</span> ${this.userEmail || 'Loading...'}
                        </div>
                    </div>
                    <div class="invisibility-icon ${this.contentProtection ? 'visible' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                            ${!this.contentProtection ? html`<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>` : ''}
                        </svg>
                    </div>
                </div>

                <div class="shortcuts-section">
                    <h3 style="color: white; font-size: 12px; margin: 6px 0 4px 0; font-weight: 500;">Keyboard Shortcuts</h3>
                    ${this.getMainShortcuts().map(shortcut => html`
                        <div class="shortcut-item">
                            <span class="shortcut-name">${shortcut.name}</span>
                            <div class="shortcut-keys">
                                <span class="cmd-key">⌘</span>
                                <span class="shortcut-key">${shortcut.key}</span>
                            </div>
                        </div>
                    `)}
                </div>

                <div class="api-key-section">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                        <span style="color: white; font-size: 12px; font-weight: 400;">Content Protection</span>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input 
                                type="checkbox" 
                                class="toggle-switch"
                                .checked=${this.contentProtection}
                                @change=${this.handleContentProtectionChange}
                            />
                        </label>
                    </div>
                </div>
                
                <div class="buttons-section">
                    <button class="settings-button full-width" @click=${this.handleOpenTranscript}>
                        [DEBUG] see transcript
                    </button>
                    <div class="bottom-buttons">
                        <button class="settings-button half-width danger" @click=${this.handleLogout}>
                            Log Out
                        </button>
                        <button class="settings-button half-width" @click=${this.handleQuit}>
                            Quit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getMainShortcuts() {
        return [
            { name: 'Show/Hide', key: '\\' },
            { name: 'Move Up', key: '↑' },
            { name: 'Move Down', key: '↓' },
            { name: 'Move Left', key: '←' },
            { name: 'Move Right', key: '→' },
            { name: 'Ask Assistant', key: 'Enter' },
        ];
    }

    async handleOpenTranscript() {
        console.log('Opening transcript window');
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-transcript-window');
        }
    }

    async handleLogout() {
        console.log('Logout clicked');
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            // Clear WorkOS tokens
            await ipcRenderer.invoke('logout-workos');
            // The header controller will handle the transition to login view
        }
    }

    handleQuit() {
        console.log('Quit clicked');
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('quit-application');
        }
    }


}

customElements.define('customize-view', CustomizeView);
