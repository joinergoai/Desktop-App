import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class CalendarEventSelector extends LitElement {
    static properties = {
        events: { type: Array },
        selectedEvent: { type: Object },
        loading: { type: Boolean },
        error: { type: String },
        dealLookupResult: { type: Object },
        dealLookupStatus: { type: Boolean }
    };

    static styles = css`
        :host {
            display: block;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            will-change: opacity;
            -webkit-font-smoothing: antialiased;
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        .container {
            width: 380px;
            padding: 18px 18px 16px 18px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
            transform: translateZ(0);
            isolation: isolate;
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

        h1 {
            font-size: 14px;
            font-weight: 500;
            margin: 0 20px 10px 0;
            color: white;
            text-align: center;
        }

        .events-container {
            max-height: 108px;
            overflow-y: auto;
            margin-bottom: 12px;
        }

        .event-card {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .event-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 8px;
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.2) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
        }

        .event-card:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .event-card:hover::after {
            opacity: 1;
        }

        .event-card.selected {
            background: rgba(59, 130, 246, 0.25);
        }

        .event-card.selected::after {
            background: linear-gradient(169deg, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0) 50%, rgba(59, 130, 246, 0.5) 100%);
            opacity: 1;
        }

        .event-title {
            font-size: 12px;
            font-weight: 500;
            margin: 0;
            color: white;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .event-time {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin: 0;
            flex-shrink: 0;
        }

        .actions {
            display: flex;
            gap: 8px;
            justify-content: center;
        }

        button {
            height: 32px;
            padding: 0 16px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 20px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            position: relative;
            overflow: hidden;
        }

        button::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 20px;
            padding: 1px;
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.3) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .continue-btn {
            background: rgba(59, 130, 246, 0.5);
        }

        .continue-btn:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.7);
        }

        .continue-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .skip-btn {
            background: rgba(255, 255, 255, 0.08);
        }

        .skip-btn:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 108px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
        }

        .empty-state {
            text-align: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.4);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 108px;
        }

        .empty-state h3 {
            font-size: 12px;
            margin: 0 0 4px 0;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
        }

        .empty-state p {
            font-size: 11px;
            margin: 0;
        }

        /* Custom scrollbar */
        .events-container::-webkit-scrollbar {
            width: 4px;
        }

        .events-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 2px;
        }

        .events-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
        }

        .events-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .deal-status {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 500;
            color: white;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .deal-status.visible {
            opacity: 1;
        }

        .deal-status.success {
            color: #10b981;
        }

        .deal-status.neutral {
            color: #6b7280;
        }

        .deal-status.error {
            color: #ef4444;
        }
        
        .quit-button {
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

        .quit-button:hover {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
        }

        .quit-button:active {
            transform: scale(0.95);
        }
    `;

    constructor() {
        super();
        this.events = [];
        this.selectedEvent = null;
        this.loading = false;
        this.error = null;
        this.dealLookupResult = null;
        this.dealLookupStatus = false;
        this.dragState = null;
        this.wasJustDragged = false;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        // Load real calendar events
        this.loadCalendarEvents();
    }

    async loadCalendarEvents() {
        this.loading = true;
        this.error = null;
        
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('get-upcoming-calendar-events');
                
                if (result.success && result.events) {
                    this.events = result.events;
                } else {
                    this.error = result.error || 'Failed to load calendar events';
                    this.events = [];
                }
            } else {
                // No Electron environment
                this.error = 'Calendar events require desktop app';
                this.events = [];
            }
        } catch (error) {
            console.error('Error loading calendar events:', error);
            this.error = 'Failed to load calendar events';
            this.events = [];
        } finally {
            this.loading = false;
        }
    }

    formatTime(timestamp, timezone) {
        // Convert unix timestamp to milliseconds if needed
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        const date = new Date(timestampMs);
        
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true,
            timeZone: timezone || undefined
        });
    }

    formatDateRange(startTimestamp, endTimestamp) {
        // Convert unix timestamps to milliseconds if needed
        const startMs = startTimestamp < 10000000000 ? startTimestamp * 1000 : startTimestamp;
        const endMs = endTimestamp < 10000000000 ? endTimestamp * 1000 : endTimestamp;
        
        const start = new Date(startMs);
        const end = new Date(endMs);
        const today = new Date();
        
        const isToday = start.toDateString() === today.toDateString();
        const dateStr = isToday ? 'Today' : start.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        return `${dateStr}, ${this.formatTime(startTimestamp)} - ${this.formatTime(endTimestamp)}`;
    }

    async handleMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.event-card')) {
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

        window.addEventListener('mousemove', this.handleMouseMove, { capture: true });
        window.addEventListener('mouseup', this.handleMouseUp, { once: true, capture: true });
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

        window.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
        this.dragState = null;

        if (wasDragged) {
            this.wasJustDragged = true;
            setTimeout(() => {
                this.wasJustDragged = false;
            }, 0);
        }
    }

    selectEvent(event) {
        if (this.wasJustDragged) return;
        this.selectedEvent = this.selectedEvent?.title === event.title ? null : event;
    }

    setDealLookupResult(result) {
        this.dealLookupResult = result;
        this.dealLookupStatus = true;
        this.requestUpdate();
        
        // Auto-hide after 3.5 seconds
        setTimeout(() => {
            this.dealLookupStatus = false;
            this.requestUpdate();
        }, 3500);
    }

    handleContinue() {
        if (!this.selectedEvent || this.wasJustDragged) return;
        
        console.log('Selected event:', this.selectedEvent);
        
        // Notify the header controller to proceed to app view
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('calendar-event-selected', this.selectedEvent);
        }
        
        // Dispatch custom event for HeaderController
        this.dispatchEvent(new CustomEvent('event-selected', {
            detail: { event: this.selectedEvent },
            bubbles: true,
            composed: true
        }));
    }

    handleSkip() {
        if (this.wasJustDragged) return;
        
        console.log('Skipping calendar event selection');
        
        // Notify the header controller to proceed without selection
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('calendar-event-skipped');
        }
        
        // Dispatch custom event for HeaderController
        this.dispatchEvent(new CustomEvent('selection-skipped', {
            bubbles: true,
            composed: true
        }));
    }

    handleQuit() {
        if (this.wasJustDragged) return;
        
        console.log('Quit clicked');
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('quit-application');
        }
    }

    render() {
        return html`
            <div class="container" @mousedown=${this.handleMouseDown}>
                <button class="quit-button" @click=${this.handleQuit} title="Close application">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2" />
                    </svg>
                </button>
                
                <h1>Select Upcoming Meeting</h1>

                <div class="events-container">
                    ${this.loading ? html`
                        <div class="loading">Loading events...</div>
                    ` : this.error ? html`
                        <div class="empty-state">
                            <h3>Error loading events</h3>
                            <p>${this.error}</p>
                        </div>
                    ` : this.events.length === 0 ? html`
                        <div class="empty-state">
                            <h3>No upcoming events</h3>
                            <p>No meetings scheduled today</p>
                        </div>
                    ` : this.events.map(event => html`
                        <div 
                            class="event-card ${this.selectedEvent?.title === event.title && this.selectedEvent?.startTime === event.startTime ? 'selected' : ''}"
                            @click=${() => this.selectEvent(event)}
                        >
                            <span class="event-title">${event.title}</span>
                            <span class="event-time">${this.formatTime(event.startTime, event.startTimezone)}</span>
                        </div>
                    `)}
                </div>

                ${this.dealLookupStatus && this.dealLookupResult ? html`
                    <div class="deal-status ${this.dealLookupStatus ? 'visible' : ''} ${this.dealLookupResult.success && this.dealLookupResult.dealFound ? 'success' : this.dealLookupResult.success && !this.dealLookupResult.dealFound ? 'neutral' : 'error'}">
                        ${this.dealLookupResult.success && this.dealLookupResult.dealFound ? '✓ Deal context found' : this.dealLookupResult.success && !this.dealLookupResult.dealFound ? 'No deal context' : '✗ Context lookup failed'}
                    </div>
                ` : ''}

                <div class="actions">
                    <button class="skip-btn" @click=${this.handleSkip}>Skip</button>
                    <button 
                        class="continue-btn" 
                        ?disabled=${!this.selectedEvent}
                        @click=${this.handleContinue}
                    >
                        Continue
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('calendar-event-selector', CalendarEventSelector); 