import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: auto;
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        .assistant-container {
            display: flex;
            flex-direction: column;
            color: #ffffff;
            box-sizing: border-box;
            position: relative;
            gap: 6px;
            width: fit-content;
            padding: 2px 0;
        }

        .action-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            height: 16px;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            white-space: nowrap;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .action-pill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 20px;
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.17) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.17) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        .action-pill:hover {
            background: rgba(0, 0, 0, 0.7);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(2px);
        }

        .action-icon {
            font-size: 14px;
            line-height: 1;
            filter: brightness(1.2);
            flex-shrink: 0;
        }

        .action-title {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }
    `;

    static properties = {
        sttMessages: { type: Array },
        isSessionActive: { type: Boolean },
        hasCompletedRecording: { type: Boolean },
    };

    constructor() {
        super();
        this.hardcodedActions = [
            {
                icon: '💬',
                title: 'What should I say next?',
                description: 'Get intelligence suggestions for your next response'
            },
            {
                icon: '📊',
                title: 'Deal context',
                description: 'Analyze the current deal or negotiation context'
            },
            {
                icon: '💡',
                title: 'Explain',
                description: 'Get detailed explanations of complex topics'
            }
        ];
        this.sttMessages = [];
        this.isSessionActive = false;
        this.hasCompletedRecording = false;
        this.handleSttUpdate = this.handleSttUpdate.bind(this);
    }

    async handleActionClick(actionTitle) {
        console.log('🔥 Action clicked:', actionTitle);

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            try {
                const isAskViewVisible = await ipcRenderer.invoke('is-window-visible', 'ask');

                if (!isAskViewVisible) {
                    await ipcRenderer.invoke('toggle-feature', 'ask');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const result = await ipcRenderer.invoke('send-question-to-ask', actionTitle);

                if (result.success) {
                    console.log('✅ Question sent to AskView successfully');
                } else {
                    console.error('❌ Failed to send question to AskView:', result.error);
                }
            } catch (error) {
                console.error('❌ Error in handleActionClick:', error);
            }
        }
    }

    handleSttUpdate(event, { speaker, text, isFinal, isPartial }) {
        if (text === undefined) return;

        const findLastPartialIdx = spk => {
            for (let i = this.sttMessages.length - 1; i >= 0; i--) {
                const m = this.sttMessages[i];
                if (m.speaker === spk && m.isPartial) return i;
            }
            return -1;
        };

        const newMessages = [...this.sttMessages];
        const targetIdx = findLastPartialIdx(speaker);

        if (isPartial) {
            if (targetIdx !== -1) {
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    isPartial: true,
                    isFinal: false,
                };
            } else {
                newMessages.push({
                    id: Date.now(),
                    speaker,
                    text,
                    isPartial: true,
                    isFinal: false,
                });
            }
        } else if (isFinal) {
            if (targetIdx !== -1) {
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    isPartial: false,
                    isFinal: true,
                };
            } else {
                newMessages.push({
                    id: Date.now(),
                    speaker,
                    text,
                    isPartial: false,
                    isFinal: true,
                });
            }
        }

        this.sttMessages = newMessages;

        // Notify the transcript window if it's open
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('update-transcript-data', { messages: this.sttMessages });
        }
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('stt-update', this.handleSttUpdate);
            ipcRenderer.on('session-state-changed', (event, { isActive }) => {
                const wasActive = this.isSessionActive;
                this.isSessionActive = isActive;

                if (!wasActive && isActive) {
                    this.hasCompletedRecording = false;
                    this.sttMessages = [];
                    this.requestUpdate();
                }
                if (wasActive && !isActive) {
                    this.hasCompletedRecording = true;
                    this.requestUpdate();
                }
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('stt-update', this.handleSttUpdate);
        }
    }

    render() {
        return html`
            <div class="assistant-container">
                ${this.hardcodedActions.map(
                    action => html`
                        <div
                            class="action-pill"
                            @click=${() => this.handleActionClick(action.title)}
                            title="${action.description}"
                        >
                            <span class="action-icon">${action.icon}</span>
                            <span class="action-title">${action.title}</span>
                        </div>
                    `
                )}
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);