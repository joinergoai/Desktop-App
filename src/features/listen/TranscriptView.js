import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class TranscriptView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: text;
        }

        .transcript-window {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            color: #ffffff;
            position: relative;
            overflow: hidden;
        }

        .transcript-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.6);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        .header-title {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }

        .header-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .copy-button.copied {
            background: rgba(52, 211, 153, 0.2);
            border-color: rgba(52, 211, 153, 0.5);
            color: #34d399;
        }

        .transcript-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .transcript-container::-webkit-scrollbar {
            width: 8px;
        }

        .transcript-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }

        .transcript-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }

        .transcript-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .stt-message {
            padding: 8px 12px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
            word-break: break-word;
            line-height: 1.4;
            font-size: 13px;
            margin-bottom: 4px;
            box-sizing: border-box;
        }

        .stt-message.them {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            margin-right: auto;
        }

        .stt-message.me {
            background: rgba(0, 122, 255, 0.8);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
            margin-left: auto;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            text-align: center;
            padding: 32px;
        }
    `;

    static properties = {
        sttMessages: { type: Array },
        copyState: { type: String },
    };

    constructor() {
        super();
        this.sttMessages = [];
        this.copyState = 'idle';
        this.copyTimeout = null;
        this.handleSttUpdate = this.handleSttUpdate.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('stt-update', this.handleSttUpdate);
            
            // Request initial transcript data
            ipcRenderer.invoke('get-transcript-data').then(messages => {
                if (messages) {
                    this.sttMessages = messages;
                }
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('stt-update', this.handleSttUpdate);
        }
    }

    handleSttUpdate(event, data) {
        // Handle the incoming data which contains { messages: [...] }
        if (data && data.messages) {
            this.sttMessages = data.messages;
            this.requestUpdate();
        }
    }

    async handleCopy() {
        if (this.copyState === 'copied') return;

        const textToCopy = this.sttMessages
            .map(msg => `${msg.speaker}: ${msg.text}`)
            .join('\n');

        try {
            await navigator.clipboard.writeText(textToCopy);
            this.copyState = 'copied';
            
            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }

            this.copyTimeout = setTimeout(() => {
                this.copyState = 'idle';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    getSpeakerClass(speaker) {
        return speaker.toLowerCase() === 'me' ? 'me' : 'them';
    }

    render() {
        return html`
            <div class="transcript-window">
                <div class="transcript-header">
                    <h1 class="header-title">Transcript</h1>
                    <div class="header-controls">
                        <button 
                            class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}"
                            @click=${this.handleCopy}
                        >
                            ${this.copyState === 'copied' ? html`
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                Copied!
                            ` : html`
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                </svg>
                                Copy Transcript
                            `}
                        </button>
                    </div>
                </div>

                <div class="transcript-container">
                    ${this.sttMessages.length === 0 ? html`
                        <div class="empty-state">
                            <p>No transcript available yet.</p>
                            <p style="font-size: 12px; margin-top: 8px;">Start a recording to see the transcript here.</p>
                        </div>
                    ` : this.sttMessages.map(msg => html`
                        <div class="stt-message ${this.getSpeakerClass(msg.speaker)}">
                            ${msg.text}
                        </div>
                    `)}
                </div>
            </div>
        `;
    }
}

customElements.define('transcript-view', TranscriptView); 