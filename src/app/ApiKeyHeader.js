import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class ApiKeyHeader extends LitElement {
    static properties = {
        apiKey: { type: String },
        isLoading: { type: Boolean },
        errorMessage: { type: String },
    };

    static styles = css`
        :host {
            display: block;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: opacity 0.25s ease-out;
        }

        :host(.sliding-out) {
            animation: slideOutUp 0.3s ease-in forwards;
            will-change: opacity, transform;
        }

        :host(.hidden) {
            opacity: 0;
            pointer-events: none;
        }

        @keyframes slideOutUp {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-20px);
            }
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        .container {
            width: 285px;
            height: 150px;
            padding: 18px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 16px;
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.5) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        .close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 14px;
            height: 14px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 3px;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
            z-index: 10;
            font-size: 14px;
            line-height: 1;
            padding: 0;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
        }

        .close-button:active {
            transform: scale(0.95);
        }

        .title {
            color: white;
            font-size: 16px;
            font-weight: 500; /* Medium */
            margin: 0;
            text-align: center;
            flex-shrink: 0; /* 제목이 줄어들지 않도록 고정 */
        }

        .form-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin-top: 20px;
        }

        .error-message {
            color: rgba(239, 68, 68, 0.9);
            font-weight: 500;
            font-size: 11px;
            height: 14px; /* Reserve space to prevent layout shift */
            text-align: center;
            margin-bottom: 4px;
        }

        .api-input {
            width: 100%;
            height: 34px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border: none;
            padding: 0 10px;
            color: white;
            font-size: 12px;
            font-weight: 400; /* Regular */
            margin-bottom: 6px;
            text-align: center;
            user-select: text;
            cursor: text;
        }

        .api-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }

        .api-input:focus {
            outline: none;
        }

        .action-button {
            width: 100%;
            height: 34px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 12px;
            font-weight: 500; /* Medium */
            cursor: pointer;
            transition: background 0.15s ease;
            position: relative;
            overflow: hidden;
        }

        .action-button::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 10px;
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.5) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        .action-button:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .action-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .action-button.primary {
            background: rgba(59, 130, 246, 0.8);
            font-weight: 600;
        }
        
        .action-button.primary:hover {
            background: rgba(59, 130, 246, 1);
        }

        .or-text {
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            font-weight: 500; /* Medium */
            margin: 10px 0;
        }
    `;

    constructor() {
        super();
        this.dragState = null;
        this.wasJustDragged = false;
        this.apiKey = '';
        this.isLoading = false;
        this.errorMessage = '';
        this.validatedApiKey = null;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleAnimationEnd = this.handleAnimationEnd.bind(this);
        this.handleUseWorkOS = this.handleUseWorkOS.bind(this);
    }

    reset() {
        this.apiKey = '';
        this.isLoading = false;
        this.errorMessage = '';
        this.validatedApiKey = null;
        this.requestUpdate();
    }

    async handleMouseDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
            return;
        }

        e.preventDefault();

        const { ipcRenderer } = window.require('electron');
        const initialPosition = await ipcRenderer.invoke('get-header-position');

        this.dragState = {
            initialMouseX: e.screenX,
            initialMouseY: e.screenY,
            initialWindowX: initialPosition.x,
            initialWindowY: initialPosition.y,
            moved: false,
        };

        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp, { once: true });
    }

    handleMouseMove(e) {
        if (!this.dragState) return;

        const deltaX = Math.abs(e.screenX - this.dragState.initialMouseX);
        const deltaY = Math.abs(e.screenY - this.dragState.initialMouseY);

        if (deltaX > 3 || deltaY > 3) {
            this.dragState.moved = true;
        }

        const newWindowX = this.dragState.initialWindowX + (e.screenX - this.dragState.initialMouseX);
        const newWindowY = this.dragState.initialWindowY + (e.screenY - this.dragState.initialMouseY);

        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('move-header-to', newWindowX, newWindowY);
    }

    handleMouseUp(e) {
        if (!this.dragState) return;

        const wasDragged = this.dragState.moved;

        window.removeEventListener('mousemove', this.handleMouseMove);
        this.dragState = null;

        if (wasDragged) {
            this.wasJustDragged = true;
            setTimeout(() => {
                this.wasJustDragged = false;
            }, 200);
        }
    }

    // Removed handleInput, handlePaste, and handleKeyPress - no longer using API key input

    // Removed handleSubmit - no longer using API key validation

    // Removed validateApiKey function - no longer using OpenAI API

    startSlideOutAnimation() {
        this.classList.add('sliding-out');
    }

    handleUseWorkOS(e) {
        e.preventDefault();
        if (this.wasJustDragged) return;

        console.log('Requesting WorkOS authentication from main process...');
        if (window.require) {
            window.require('electron').ipcRenderer.invoke('start-workos-auth');
        }
    }

    handleClose() {
        console.log('Close button clicked');
        if (window.require) {
            window.require('electron').ipcRenderer.invoke('quit-application');
        }
    }

    handleAnimationEnd(e) {
        if (e.target !== this) return;

        if (this.classList.contains('sliding-out')) {
            this.classList.remove('sliding-out');
            this.classList.add('hidden');

            if (this.validatedApiKey) {
                if (window.require) {
                    window.require('electron').ipcRenderer.invoke('api-key-validated', this.validatedApiKey);
                }
                this.validatedApiKey = null;
            }
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('animationend', this.handleAnimationEnd);

    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('animationend', this.handleAnimationEnd);

    }

    render() {
        return html`
            <div class="container" @mousedown=${this.handleMouseDown}>
                <button class="close-button" @click=${this.handleClose} title="Close application">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2" />
                    </svg>
                </button>
                <h1 class="title">Welcome to Ergo Copilot</h1>

                <div class="form-content">
                    
                    <button class="action-button primary" @click=${this.handleUseWorkOS}>
                        ${this.isLoading ? 'Signing in...' : 'Sign into Ergo'}
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('apikey-header', ApiKeyHeader);