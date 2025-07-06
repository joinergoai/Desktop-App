import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 400px;
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        /* highlight.js 스타일 추가 */
        .insights-container pre {
            background: rgba(0, 0, 0, 0.4) !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin: 8px 0 !important;
            overflow-x: auto !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .insights-container code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 11px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .insights-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .insights-container p code {
            background: rgba(255, 255, 255, 0.1) !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            color: #ffd700 !important;
        }

        .hljs-keyword {
            color: #ff79c6 !important;
        }
        .hljs-string {
            color: #f1fa8c !important;
        }
        .hljs-comment {
            color: #6272a4 !important;
        }
        .hljs-number {
            color: #bd93f9 !important;
        }
        .hljs-function {
            color: #50fa7b !important;
        }
        .hljs-variable {
            color: #8be9fd !important;
        }
        .hljs-built_in {
            color: #ffb86c !important;
        }
        .hljs-title {
            color: #50fa7b !important;
        }
        .hljs-attr {
            color: #50fa7b !important;
        }
        .hljs-tag {
            color: #ff79c6 !important;
        }

        .assistant-container {
            display: flex;
            flex-direction: column;
            color: #ffffff;
            box-sizing: border-box;
            position: relative;
            background: rgba(0, 0, 0, 0.6);
            overflow: hidden;
            border-radius: 12px;
            /* outline: 0.5px rgba(255, 255, 255, 0.5) solid; */
            /* outline-offset: -1px; */
            width: 100%;
            min-height: 150px;
        }

        .assistant-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 12px; /* Match parent */
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.17) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.17) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        .assistant-container::before {
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
            z-index: -1;
        }

        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 12px;
            min-height: 28px;
            position: relative;
            z-index: 1;
            width: 100%;
            box-sizing: border-box;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bar-left-text {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            position: relative;
            overflow: hidden;
            white-space: nowrap;
            flex: 1;
            min-width: 0;
            max-width: 200px;
        }

        .bar-left-text-content {
            display: inline-block;
            transition: transform 0.3s ease;
        }

        .bar-left-text-content.slide-in {
            animation: slideIn 0.3s ease forwards;
        }

        @keyframes slideIn {
            from {
                transform: translateX(10%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .bar-controls {
            display: flex;
            gap: 3px;
            align-items: center;
            flex-shrink: 0;
            width: auto;
            justify-content: flex-end;
            box-sizing: border-box;
            padding: 2px;
        }

        .toggle-button {
            display: flex;
            align-items: center;
            gap: 4px;
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: none;
            outline: none;
            box-shadow: none;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            height: 20px;
            white-space: nowrap;
            transition: background-color 0.15s ease;
            justify-content: center;
        }

        .toggle-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .toggle-button svg {
            flex-shrink: 0;
            width: 10px;
            height: 10px;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: none;
            outline: none;
            box-shadow: none;
            padding: 3px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            flex-shrink: 0;
            transition: background-color 0.15s ease;
            position: relative; /* For icon positioning */
            overflow: hidden; /* Hide overflowing parts of icons during animation */
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .copy-button svg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        }

        .copy-button .check-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .copy-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .check-icon {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        .transcription-container {
            overflow-y: auto;
            padding: 8px 10px 12px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-height: 120px;
            max-height: 400px;
            position: relative;
            z-index: 1;
            flex: 1;
        }

        .transcription-container.hidden {
            display: none;
        }

        .transcription-container::-webkit-scrollbar {
            width: 8px;
        }
        .transcription-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        .transcription-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }
        .transcription-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .stt-message {
            padding: 6px 10px;
            border-radius: 10px;
            max-width: 80%;
            word-wrap: break-word;
            word-break: break-word;
            line-height: 1.4;
            font-size: 12px;
            margin-bottom: 3px;
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

        .insights-container {
            overflow-y: auto;
            padding: 0;
            position: relative;
            z-index: 1;
            min-height: 120px;
            max-height: 400px;
            flex: 1;
        }

        .insights-title, insights-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 15px;
            font-weight: 500;
            font-family: 'Helvetica Neue', sans-serif;
            margin: 12px 0 8px 0;
        }

        .insights-container.hidden {
            display: none;
        }

        .insights-container::-webkit-scrollbar {
            width: 8px;
        }
        .insights-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        .insights-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }
        .insights-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .insights-container h4 {
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            margin: 12px 0 8px 0;
            padding: 4px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: default;
        }

        .insights-container h4:hover {
            background: transparent;
        }

        .insights-container h4:first-child {
            margin-top: 0;
        }

        .outline-item {
            color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            transition: background-color 0.15s ease;
            cursor: pointer;
            word-wrap: break-word;
        }

        .outline-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .request-item {
            color: #ffffff;
            font-size: 12px;
            line-height: 1.2;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: default;
            word-wrap: break-word;
            transition: background-color 0.15s ease;
        }

        .request-item.clickable {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .request-item.clickable:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(2px);
        }

        /* 마크다운 렌더링된 콘텐츠 스타일 */
        .markdown-content {
            color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: pointer;
            word-wrap: break-word;
            transition: all 0.15s ease;
        }

        .markdown-content:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(2px);
        }

        .markdown-content p {
            margin: 4px 0;
        }

        .markdown-content ul,
        .markdown-content ol {
            margin: 4px 0;
            padding-left: 16px;
        }

        .markdown-content li {
            margin: 2px 0;
        }

        .markdown-content a {
            color: #8be9fd;
            text-decoration: none;
        }

        .markdown-content a:hover {
            text-decoration: underline;
        }

        .markdown-content strong {
            font-weight: 600;
            color: #f8f8f2;
        }

        .markdown-content em {
            font-style: italic;
            color: #f1fa8c;
        }

        .timer {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
        }

        /* Action card styles */
        .action-card {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 10px 12px;
            margin: 6px 0;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .action-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .action-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .action-card:hover::before {
            opacity: 1;
        }

        .action-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .action-icon {
            font-size: 16px;
            line-height: 1;
            filter: brightness(1.2);
        }

        .action-title {
            font-size: 12px;
            font-weight: 500;
            color: #ffffff;
            flex: 1;
        }

        .action-description {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.3;
            margin-left: 24px;
        }

        .insights-header {
            text-align: center;
            padding: 12px 16px 6px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 8px;
        }

        .insights-header h3 {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            margin: 0 0 3px 0;
        }

        .insights-header p {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.6);
            margin: 0;
            line-height: 1.3;
        }

        .actions-wrapper {
            padding: 6px 12px 12px 12px;
        }
    `;

    static properties = {
        // structuredData: { type: Object },
        // outlines: { type: Array },
        // analysisRequests: { type: Array },
        sttMessages: { type: Array },
        viewMode: { type: String },
        isHovering: { type: Boolean },
        isAnimating: { type: Boolean },
        copyState: { type: String },
        elapsedTime: { type: String },
        captureStartTime: { type: Number },
        isSessionActive: { type: Boolean },
        hasCompletedRecording: { type: Boolean },
        // isRefreshing: { type: Boolean },
    };

    constructor() {
        super();
        // this.outlines = [];
        // this.analysisRequests = [];
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
        this.viewMode = 'insights';
        this.isHovering = false;
        this.isAnimating = false;
        this.copyState = 'idle';
        this.elapsedTime = '00:00';
        this.captureStartTime = null;
        this.timerInterval = null;
        this.adjustHeightThrottle = null;
        this.copyTimeout = null;
        this.isThrottled = false;
        this.messageIdCounter = 0;
        this._shouldScrollAfterUpdate = false;
        this.isDOMPurifyLoaded = false;
        this.isMarkedLoaded = false;
        this.DOMPurify = null;
        this.marked = null;
        this.loadLibraries();
        this.hljs = null;
        this.isHljsLoaded = false;
        this.isSessionActive = false;
        this.hasCompletedRecording = false;

        // --- Debug Utilities ---
        this._debug = {
            enabled: false, // Set to false to disable debug messages
            interval: null,
            counter: 1,
        };
        this.handleSttUpdate = this.handleSttUpdate.bind(this);
        this.adjustWindowHeight = this.adjustWindowHeight.bind(this);

        this._startDebugStream();
    }

    // --- Debug Utilities ---
    _startDebugStream() {
        if (!this._debug.enabled) return;

        this._debug.interval = setInterval(() => {
            const speaker = this._debug.counter % 2 === 0 ? 'You' : 'Other Person';
            const text = `이것은 ${this._debug.counter}번째 자동 생성 메시지입니다. UI가 자동으로 조절되는지 확인합니다.`;

            this._debug.counter++;

            this.handleSttUpdate(null, { speaker, text, isFinal: true });
        }, 1000);
    }

    _stopDebugStream() {
        if (this._debug.interval) {
            clearInterval(this._debug.interval);
        }
    }

    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../../assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../../assets/dompurify-3.0.7.min.js');
            }

            this.marked = window.marked;
            this.hljs = window.hljs;
            this.DOMPurify = window.DOMPurify;

            if (this.marked && this.hljs) {
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight error:', err);
                            }
                        }
                        try {
                            return this.hljs.highlightAuto(code).value;
                        } catch (err) {
                            console.warn('Auto highlight error:', err);
                        }
                        return code;
                    },
                    breaks: true,
                    gfm: true,
                    pedantic: false,
                    smartypants: false,
                    xhtml: false,
                });

                this.isMarkedLoaded = true;
                console.log('Markdown libraries loaded successfully');
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in AssistantView');
            }
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    parseMarkdown(text) {
        if (!text) return '';

        if (!this.isMarkedLoaded || !this.marked) {
            return text;
        }

        try {
            return this.marked(text);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return text;
        }
    }

    handleMarkdownClick(originalText) {
        this.handleRequestClick(originalText);
    }

    renderMarkdownContent() {
        if (!this.isMarkedLoaded || !this.marked) {
            return;
        }

        const markdownElements = this.shadowRoot.querySelectorAll('[data-markdown-id]');
        markdownElements.forEach(element => {
            const originalText = element.getAttribute('data-original-text');
            if (originalText) {
                try {
                    let parsedHTML = this.parseMarkdown(originalText);

                    if (this.isDOMPurifyLoaded && this.DOMPurify) {
                        parsedHTML = this.DOMPurify.sanitize(parsedHTML);

                        if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                            console.warn('Unsafe content detected in insights, showing plain text');
                            element.textContent = '⚠️ ' + originalText;
                            return;
                        }
                    }

                    element.innerHTML = parsedHTML;
                } catch (error) {
                    console.error('Error rendering markdown for element:', error);
                    element.textContent = originalText;
                }
            }
        });
    }

    startTimer() {
        this.captureStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.captureStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60)
                .toString()
                .padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.elapsedTime = `${minutes}:${seconds}`;
            this.requestUpdate();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    adjustWindowHeight() {
        if (!window.require) return;

        this.updateComplete
            .then(() => {
                const topBar = this.shadowRoot.querySelector('.top-bar');
                const activeContent =
                    this.viewMode === 'transcript'
                        ? this.shadowRoot.querySelector('.transcription-container')
                        : this.shadowRoot.querySelector('.insights-container');

                if (!topBar || !activeContent) return;

                const topBarHeight = topBar.offsetHeight;

                const contentHeight = activeContent.scrollHeight;

                const idealHeight = topBarHeight + contentHeight + 20;

                const targetHeight = Math.min(500, Math.max(150, idealHeight));

                console.log(
                    `[Height Adjusted] Mode: ${this.viewMode}, TopBar: ${topBarHeight}px, Content: ${contentHeight}px, Ideal: ${idealHeight}px, Target: ${targetHeight}px`
                );

                const { ipcRenderer } = window.require('electron');
                ipcRenderer.invoke('adjust-window-height', targetHeight);
            })
            .catch(error => {
                console.error('Error in adjustWindowHeight:', error);
            });
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'insights' ? 'transcript' : 'insights';
        this.requestUpdate();
    }

    handleCopyHover(isHovering) {
        this.isHovering = isHovering;
        if (isHovering) {
            this.isAnimating = true;
        } else {
            this.isAnimating = false;
        }
        this.requestUpdate();
    }

    async handleCopy() {
        if (this.copyState === 'copied') return;

        let textToCopy = '';

        if (this.viewMode === 'transcript') {
            textToCopy = this.sttMessages.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
        } else {
            // Copy the hardcoded actions
            textToCopy = this.hardcodedActions.map(action => `• ${action.title}`).join('\n');
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log('Content copied to clipboard');

            this.copyState = 'copied';
            this.requestUpdate();

            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }

            this.copyTimeout = setTimeout(() => {
                this.copyState = 'idle';
                this.requestUpdate();
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    adjustWindowHeightThrottled() {
        if (this.isThrottled) {
            return;
        }

        this.adjustWindowHeight();

        this.isThrottled = true;

        this.adjustHeightThrottle = setTimeout(() => {
            this.isThrottled = false;
        }, 16);
    }

    handleSttUpdate(event, { speaker, text, isFinal, isPartial }) {
        if (text === undefined) return;

        const container = this.shadowRoot.querySelector('.transcription-container');
        this._shouldScrollAfterUpdate = container ? container.scrollTop + container.clientHeight >= container.scrollHeight - 10 : false;

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
                    id: this.messageIdCounter++,
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
                    id: this.messageIdCounter++,
                    speaker,
                    text,
                    isPartial: false,
                    isFinal: true,
                });
            }
        }

        this.sttMessages = newMessages;
    }

    scrollToTranscriptionBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.transcription-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    async handleRequestClick(requestText) {
        console.log('🔥 Analysis request clicked:', requestText);

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            try {
                const isAskViewVisible = await ipcRenderer.invoke('is-window-visible', 'ask');

                if (!isAskViewVisible) {
                    await ipcRenderer.invoke('toggle-feature', 'ask');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const result = await ipcRenderer.invoke('send-question-to-ask', requestText);

                if (result.success) {
                    console.log('✅ Question sent to AskView successfully');
                } else {
                    console.error('❌ Failed to send question to AskView:', result.error);
                }
            } catch (error) {
                console.error('❌ Error in handleRequestClick:', error);
            }
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this.startTimer();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('stt-update', this.handleSttUpdate);
            ipcRenderer.on('session-state-changed', (event, { isActive }) => {
                const wasActive = this.isSessionActive;
                this.isSessionActive = isActive;

                if (!wasActive && isActive) {
                    this.hasCompletedRecording = false;

                    // 🔄 Reset transcript when a fresh session starts
                    this.sttMessages = [];
                    this.requestUpdate();
                }
                if (wasActive && !isActive) {
                    this.hasCompletedRecording = true;

                    this.requestUpdate();
                }
            });
        }
        this._startDebugStream();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopTimer();

        if (this.adjustHeightThrottle) {
            clearTimeout(this.adjustHeightThrottle);
            this.adjustHeightThrottle = null;
        }
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('stt-update', this.handleSttUpdate);
        }

        this._stopDebugStream();
    }

    firstUpdated() {
        super.firstUpdated();

        setTimeout(() => this.adjustWindowHeight(), 200);
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        this.renderMarkdownContent();

        if (changedProperties.has('sttMessages')) {
            if (this._shouldScrollAfterUpdate) {
                this.scrollToTranscriptionBottom();
                this._shouldScrollAfterUpdate = false;
            }
            this.adjustWindowHeightThrottled();
        }

        if (changedProperties.has('viewMode')) {
            this.adjustWindowHeight();
        }
    }

    render() {
        const displayText = this.isHovering
            ? this.viewMode === 'transcript'
                ? 'Copy Transcript'
                : 'Copy Quick Actions'
            : this.viewMode === 'insights'
            ? `AI Assistant`
            : `Glass is Listening ${this.elapsedTime}`;

        const getSpeakerClass = speaker => {
            return speaker.toLowerCase() === 'me' ? 'me' : 'them';
        };

        return html`
            <div class="assistant-container">
                <div class="top-bar">
                    <div class="bar-left-text">
                        <span class="bar-left-text-content ${this.isAnimating ? 'slide-in' : ''}">${displayText}</span>
                    </div>
                    <div class="bar-controls">
                        <button class="toggle-button" @click=${this.toggleViewMode}>
                            ${this.viewMode === 'insights'
                                ? html`
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                                          <circle cx="12" cy="12" r="3" />
                                      </svg>
                                      <span>Show Transcript</span>
                                  `
                                : html`
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M9 11l3 3L22 4" />
                                          <path d="M22 12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                      </svg>
                                      <span>Show Assistant</span>
                                  `}
                        </button>
                        <button
                            class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}"
                            @click=${this.handleCopy}
                            @mouseenter=${() => this.handleCopyHover(true)}
                            @mouseleave=${() => this.handleCopyHover(false)}
                        >
                            <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            <svg class="check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="transcription-container ${this.viewMode !== 'transcript' ? 'hidden' : ''}">
                    ${this.sttMessages.map(msg => html` <div class="stt-message ${getSpeakerClass(msg.speaker)}">${msg.text}</div> `)}
                </div>

                <div class="insights-container ${this.viewMode !== 'insights' ? 'hidden' : ''}">
                    <div class="actions-wrapper">
                        ${this.hardcodedActions.map(
                            (action, index) => html`
                                <div
                                    class="action-card"
                                    data-markdown-id="action-${index}"
                                    data-original-text="${action.title}"
                                    @click=${() => this.handleMarkdownClick(action.title)}
                                >
                                    <div class="action-header">
                                        <span class="action-icon">${action.icon}</span>
                                        <span class="action-title">${action.title}</span>
                                    </div>
                                    <span class="action-description">${action.description}</span>
                                </div>
                            `
                        )}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);