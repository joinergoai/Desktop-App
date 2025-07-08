try {
    const reloader = require('electron-reloader');
    reloader(module, {
    });
} catch (err) {
}

require('dotenv').config();

if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const { createWindows } = require('./electron/windowManager.js');
const { setupLiveSummaryIpcHandlers, stopMacOSAudioCapture } = require('./features/listen/liveSummaryService.js');
const databaseInitializer = require('./common/services/databaseInitializer');
const dataService = require('./common/services/dataService');
const apiClient = require('./common/services/apiClient');
const workosAuth = require('./common/services/workosAuth');
const path = require('node:path');
const { Deeplink } = require('electron-deeplink');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');
const { env } = require('node:process');

let deeplink = null; // Initialize as null
let pendingDeepLinkUrl = null; // Store any deep link that arrives before initialization

function createMainWindows() {
    createWindows();

    const { windowPool } = require('./electron/windowManager');
    const headerWindow = windowPool.get('header');
    
    // Initialize deeplink after windows are created
    if (!deeplink && headerWindow) {
        try {
            deeplink = new Deeplink({
                app,
                mainWindow: headerWindow,     
                protocol: 'pickleglass',
                isDev: !app.isPackaged,
                debugLogging: true
            });
            
            deeplink.on('received', (url) => {
                console.log('[deeplink] received:', url);
                handleCustomUrl(url);
            });
            
            console.log('[deeplink] Initialized with main window');
            
            // Handle any pending deep link
            if (pendingDeepLinkUrl) {
                console.log('[deeplink] Processing pending deep link:', pendingDeepLinkUrl);
                handleCustomUrl(pendingDeepLinkUrl);
                pendingDeepLinkUrl = null;
            }
        } catch (error) {
            console.error('[deeplink] Failed to initialize deep link:', error);
            deeplink = null;
        }
    }
}

app.whenReady().then(async () => {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        app.quit();
        return;
    } else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            const { windowPool } = require('./electron/windowManager');
            if (windowPool) {
                const header = windowPool.get('header');
                if (header && !header.isDestroyed()) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                    return;
                }
            }
            
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                const mainWindow = windows[0];
                if (!mainWindow.isDestroyed()) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                }
            }
        });
    }

    const dbInitSuccess = await databaseInitializer.initialize();
    if (!dbInitSuccess) {
        console.error('>>> [index.js] Database initialization failed - some features may not work');
    } else {
        console.log('>>> [index.js] Database initialized successfully');
    }
    
    // Check for existing WorkOS authentication on startup
    try {
        // Log all users before restoration
        if (dataService.sqliteClient) {
            const allUsers = await dataService.sqliteClient.getAllUsers();
            console.log('[index.js] Users in database at startup:', allUsers);
        }
        
        const restored = await dataService.restoreAuthenticatedUser();
        if (restored) {
            console.log('[index.js] Successfully restored authenticated user session');
            
            // Log all users after restoration to ensure cleanup worked
            if (dataService.sqliteClient) {
                const allUsersAfter = await dataService.sqliteClient.getAllUsers();
                console.log('[index.js] Users in database after restoration:', allUsersAfter);
            }
            
            // Emit a global event that windows can listen for
            app.once('browser-window-created', () => {
                setTimeout(async () => {
                    const user = await dataService.sqliteClient.getUser(dataService.currentUserId);
                    if (user) {
                        const { windowPool } = require('./electron/windowManager');
                        windowPool.forEach(win => {
                            if (win && !win.isDestroyed()) {
                                win.webContents.send('authenticated-user-restored', {
                                    uid: user.uid,
                                    display_name: user.display_name,
                                    email: user.email
                                });
                                win.webContents.send('user-changed', {
                                    uid: user.uid,
                                    display_name: user.display_name,
                                    email: user.email
                                });
                            }
                        });
                    }
                }, 500);
            });
        } else {
            console.log('[index.js] No authenticated user found, using default user');
        }
    } catch (error) {
        console.error('[index.js] Error restoring authenticated user on startup:', error);
    }
    
    setupLiveSummaryIpcHandlers();
    setupGeneralIpcHandlers();

    createMainWindows();

    initAutoUpdater();
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
    databaseInitializer.close();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindows();
    }
});

// Add macOS native deep link handling as fallback
app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[app] open-url received:', url);
    
    if (!deeplink) {
        // Store the URL if deeplink isn't ready yet
        pendingDeepLinkUrl = url;
        console.log('[app] Deep link stored for later processing');
    } else {
        handleCustomUrl(url);
    }
});

// Ensure app can handle the protocol
app.setAsDefaultProtocolClient('pickleglass');

function setupGeneralIpcHandlers() {
    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('save-api-key', async (event, apiKey) => {
        try {
            await dataService.saveApiKey(apiKey);
            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('api-key-updated');
                }
            });
            return { success: true };
        } catch (error) {
            console.error('IPC: Failed to save API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-api-key', async () => {
        return await dataService.checkApiKey();
    });

    ipcMain.handle('get-user-presets', async () => {
        return await dataService.getUserPresets();
    });

    ipcMain.handle('get-preset-templates', async () => {
        return await dataService.getPresetTemplates();
    });

    ipcMain.handle('get-upcoming-calendar-events', async () => {
        try {
            const events = await apiClient.getUpcomingCalendarEvents();
            return { success: true, events };
        } catch (error) {
            console.error('[IPC] Failed to get upcoming calendar events:', error);
            return { success: false, error: error.message, events: [] };
        }
    });

    ipcMain.handle('get-workos-tokens', async () => {
        try {
            const tokens = await dataService.getWorkOSTokens();
            return { success: true, tokens };
        } catch (error) {
            console.error('[IPC] Failed to get WorkOS tokens:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-workos-auth', async () => {
        try {
            // First check current user
            const currentUser = await dataService.sqliteClient.getUser(dataService.currentUserId);
            if (currentUser && currentUser.workos_access_token) {
                return { 
                    isAuthenticated: true,
                    user: {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        display_name: currentUser.display_name
                    }
                };
            }
            
            // If not, check for any authenticated user
            const authenticatedUser = await dataService.sqliteClient.getAuthenticatedWorkOSUser();
            if (authenticatedUser && authenticatedUser.workos_access_token) {
                // Switch to this user
                dataService.setCurrentUser(authenticatedUser.uid);
                console.log('[IPC] Found authenticated user, setting as current:', authenticatedUser.email);
                
                return { 
                    isAuthenticated: true,
                    user: {
                        uid: authenticatedUser.uid,
                        email: authenticatedUser.email,
                        display_name: authenticatedUser.display_name
                    }
                };
            }
            
            return { isAuthenticated: false };
        } catch (error) {
            console.error('[IPC] Failed to check WorkOS auth:', error);
            return { isAuthenticated: false };
        }
    });

    ipcMain.on('set-current-user', (event, uid) => {
        console.log(`[IPC] set-current-user: ${uid}`);
        dataService.setCurrentUser(uid);
    });

    ipcMain.handle('start-workos-auth', async () => {
        try {
            // Get auth URL from your backend service
            const backendUrl = process.env.BACKEND_URL;
            const response = await fetch(`${backendUrl}/api/desktop/auth/init`);
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get auth URL: ${error}`);
            }
            
            const { authUrl, state } = await response.json();
            
            if (!authUrl) {
                throw new Error('No auth URL received from backend');
            }
            
            console.log(`[WorkOS Auth] Opening auth URL in browser`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[WorkOS Auth] Failed to initiate auth:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('logout-workos', async () => {
        try {
            // Log users before logout
            if (dataService.sqliteClient) {
                const usersBefore = await dataService.sqliteClient.getAllUsers();
                console.log('[IPC] Users before logout:', usersBefore);
            }
            
            await workosAuth.logout();
            dataService.setCurrentUser(null);  // No current user after logout
            
            // Log users after logout
            if (dataService.sqliteClient) {
                const usersAfter = await dataService.sqliteClient.getAllUsers();
                console.log('[IPC] Users after logout:', usersAfter);
            }
            
            // Notify all windows
            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('request-logout');
                }
            });
            
            return { success: true };
        } catch (error) {
            console.error('[IPC] Failed to logout WorkOS:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('set-calendar-event', (event, calendarEvent) => {
        console.log('[IPC] Setting calendar event:', calendarEvent ? calendarEvent.title : 'none');
        dataService.setCurrentCalendarEvent(calendarEvent);
    });

    ipcMain.on('set-deal-info', (event, dealInfo) => {
        console.log('[IPC] Setting deal info:', dealInfo ? { success: dealInfo.success, email: dealInfo.email } : 'none');
        dataService.setCurrentDealInfo(dealInfo);
    });

    ipcMain.handle('get-calendar-event', async () => {
        const event = dataService.getCurrentCalendarEvent();
        console.log('[IPC] Getting calendar event:', event ? event.title : 'none');
        return event;
    });

    ipcMain.handle('get-deal-info', async () => {
        const dealInfo = dataService.getCurrentDealInfo();
        console.log('[IPC] Getting deal info:', dealInfo ? { success: dealInfo.success, email: dealInfo.email } : 'none');
        return dealInfo;
    });

    ipcMain.handle('get-authenticated-user', async () => {
        try {
            const user = dataService.currentUserId ? await dataService.sqliteClient.getUser(dataService.currentUserId) : null;
            
            if (user) {
                return {
                    uid: user.uid,
                    email: user.email,
                    display_name: user.display_name
                };
            }
            
            return null;
        } catch (error) {
            console.error('[IPC] Failed to get authenticated user:', error);
            return null;
        }
    });

    ipcMain.handle('perform-crm-lookup', async (event, calendarEvent) => {
        console.log('[IPC] perform-crm-lookup called with event:', calendarEvent ? calendarEvent.title : 'no event');
        try {
            if (!calendarEvent || !calendarEvent.participants) {
                console.log('[IPC] Skipping CRM lookup - no participants');
                return null;
            }

            console.log('[IPC] Calendar event participants:', calendarEvent.participants);

            // Get authenticated user's email/domain
            const user = dataService.currentUserId ? await dataService.sqliteClient.getUser(dataService.currentUserId) : null;
            console.log('[IPC] Current user:', user ? { email: user.email, uid: user.uid } : 'no user');
            
            const userDomain = user?.email ? user.email.split('@')[1] : null;

            if (!userDomain) {
                console.warn('[IPC] Could not determine user domain');
                dataService.setCurrentDealInfo(null);
                return null;
            }

            console.log('[IPC] User domain:', userDomain);

            // Extract participant emails (excluding user's domain)
            const participantEmails = calendarEvent.participants
                .map(p => p.email)
                .filter(email => {
                    const domain = email.split('@')[1];
                    return domain !== userDomain;
                });

            console.log('[IPC] Found participant emails for CRM lookup:', participantEmails);

            if (participantEmails.length === 0) {
                console.log('[IPC] No external participants found');
                const noDealInfo = {
                    success: true,  // API call succeeded
                    dealFound: false,
                    dealInfo: null,
                    email: null
                };
                dataService.setCurrentDealInfo(noDealInfo);
                return noDealInfo;
            }

            let dealInfo = null;

            // Try each email until we find a deal (success=true AND dealFound=true)
            for (const email of participantEmails) {
                console.log(`[IPC] Attempting CRM lookup for: ${email}`);
                const response = await apiClient.getCRMDealByEmail(email);
                console.log(`[IPC] CRM response for ${email}:`, response);
                
                // Check if API call was successful AND a deal was found
                if (response.success && response.dealFound && response.dealInfo) {
                    // Found a deal! Add the email to the response
                    dealInfo = {
                        ...response,
                        email: email  // Track which email had the deal
                    };
                    console.log(`[IPC] Found deal for email: ${email}`);
                    break;
                } else if (response.success && !response.dealFound) {
                    console.log(`[IPC] No deal found for email: ${email}, trying next...`);
                } else {
                    console.log(`[IPC] API call failed for email: ${email}, trying next...`);
                }
            }

            // If no deal was found after trying all emails
            if (!dealInfo) {
                console.log('[IPC] No deals found after checking all participant emails');
                dealInfo = {
                    success: true,  // API calls succeeded
                    dealFound: false,
                    dealInfo: null,
                    email: null
                };
            }

            // Save to dataService
            dataService.setCurrentDealInfo(dealInfo);
            console.log('[IPC] Final deal info stored:', dealInfo);
            
            return dealInfo;
        } catch (error) {
            console.error('[IPC] Error during CRM lookup:', error);
            console.error('[IPC] Error stack:', error.stack);
            const errorInfo = {
                success: false,
                dealFound: false,
                dealInfo: null,
                email: null
            };
            dataService.setCurrentDealInfo(errorInfo);
            return errorInfo;
        }
    });

    ipcMain.handle('get-api-url', () => {
        return process.env.BACKEND_URL;
    });

    ipcMain.on('get-api-url-sync', (event) => {
        event.returnValue = process.env.BACKEND_URL;
    });

    ipcMain.handle('get-database-status', async () => {
        return await databaseInitializer.getStatus();
    });

    ipcMain.handle('reset-database', async () => {
        return await databaseInitializer.reset();
    });

    ipcMain.handle('get-current-user', async () => {
        try {
            // First try to get the current user
            let user = dataService.currentUserId ? await dataService.sqliteClient.getUser(dataService.currentUserId) : null;
            
            // If no current user, check if there's any authenticated user
            if (!user) {
                const authenticatedUser = await dataService.sqliteClient.getAuthenticatedWorkOSUser();
                if (authenticatedUser) {
                    // Switch to the authenticated user
                    dataService.setCurrentUser(authenticatedUser.uid);
                    user = authenticatedUser;
                    console.log('[IPC] Switched to authenticated user:', user.email);
                }
            }
            
            if (user) {
                // Ensure the user has valid tokens before considering them authenticated
                const hasValidTokens = user.workos_access_token && user.workos_expires_at > Date.now();
                return {
                    id: user.uid,
                    name: user.display_name,
                    email: user.email,
                    isAuthenticated: hasValidTokens
                };
            }
            
            // Return guest user if no authenticated user
            return {
                id: 'guest',
                name: 'Guest User',
                email: 'Not signed in',
                isAuthenticated: false
            };
        } catch (error) {
            console.error('Failed to get current user:', error);
            return {
                id: 'guest',
                name: 'Guest User',
                email: 'Not signed in',
                isAuthenticated: false
            };
        }
    });

    // Handle chat completion requests
    ipcMain.handle('chat-completion-start', async (event, requestBody) => {
        try {
            console.log('[IPC] Starting chat completion request...');
            
            // Get the ReadableStream from apiClient
            const stream = await apiClient.chatCompletion(requestBody);
            
            if (!requestBody.stream) {
                // Non-streaming response - just return the data
                return stream;
            }
            
            // For streaming, we need to read the stream and send chunks via IPC
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            const sender = event.sender;
            
            // Process the stream
            (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        
                        // Send chunk to renderer process
                        if (!sender.isDestroyed()) {
                            sender.send('chat-completion-chunk', chunk);
                        }
                    }
                    
                    // Signal completion
                    if (!sender.isDestroyed()) {
                        sender.send('chat-completion-chunk', 'data: [DONE]\n\n');
                    }
                } catch (error) {
                    console.error('[IPC] Error reading stream:', error);
                    if (!sender.isDestroyed()) {
                        sender.send('chat-completion-error', error.message);
                    }
                }
            })();
            
            // Return immediately for streaming requests
            return { streaming: true };
            
        } catch (error) {
            console.error('[IPC] Chat completion failed:', error);
            throw error;
        }
    });
}

async function handleCustomUrl(url) {
    try {
        console.log('[Custom URL] Processing URL:', url);
        
        const urlObj = new URL(url);
        const action = urlObj.hostname;
        const params = Object.fromEntries(urlObj.searchParams);
        
        console.log('[Custom URL] Action:', action, 'Params:', params);

        switch (action) {
            case 'workos-auth':
                await handleWorkOSAuthCallback(params);
                break;
            case 'personalize':
                handlePersonalizeFromUrl(params);
                break;
            default:
                const { windowPool } = require('./electron/windowManager');
                const header = windowPool.get('header');
                if (header && !header.isDestroyed()) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                }
        }

    } catch (error) {
        console.error('[Custom URL] Error parsing URL:', error);
    }
}

async function handleWorkOSAuthCallback(params) {
    const { code, state } = params;

    if (!code) {
        console.error('[WorkOS Auth] Authorization code missing');
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            header.webContents.send('workos-auth-failed', { 
                error: 'authorization_code_missing',
                message: 'Authorization code not provided in deep link.'
            });
        }
        return;
    }

    // Check if we've already processed this code
    if (global.processedWorkOSCodes && global.processedWorkOSCodes.has(code)) {
        console.log('[WorkOS Auth] Code already processed, skipping');
        return;
    }

    // Mark this code as processed
    if (!global.processedWorkOSCodes) {
        global.processedWorkOSCodes = new Set();
    }
    global.processedWorkOSCodes.add(code);

    try {
        console.log('[WorkOS Auth] Exchanging authorization code for tokens...');
        console.log('[WorkOS Auth] Code:', code.substring(0, 10) + '...');
        console.log('[WorkOS Auth] Timestamp:', new Date().toISOString());
        
        // Exchange code through your backend proxy
        const backendUrl = process.env.BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/desktop/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('[WorkOS Auth] Failed to parse response:', responseText);
            throw new Error('Invalid response from auth service');
        }
        
        if (!response.ok) {
            console.error('[WorkOS Auth] Token exchange failed:', {
                status: response.status,
                error: data.error,
                error_description: data.error_description,
                response: data
            });
            throw new Error(data.error_description || data.error || 'Failed to exchange tokens');
        }

        console.log('[WorkOS Auth] Authentication successful');

        // Extract user and tokens from response
        const { user, access_token, refresh_token, expires_in } = data;
        
        if (!user) {
            throw new Error('No user data in authentication response');
        }

        console.log('[WorkOS Auth] User authenticated:', user.email);

        // Log users before authentication
        if (dataService.sqliteClient) {
            const usersBefore = await dataService.sqliteClient.getAllUsers();
            console.log('[WorkOS Auth] Users before authentication:', usersBefore);
        }

        // Create/update user in SQLite
        const workosUser = {
            uid: user.id,
            display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.email
        };

        await dataService.findOrCreateUser(workosUser);
        
        // Set current user BEFORE saving tokens
        dataService.setCurrentUser(user.id);
        console.log('[WorkOS Auth] Current user set to:', user.id);
        
        // Store tokens with expiry
        await dataService.saveWorkOSTokens({
            access_token: access_token,
            refresh_token: refresh_token,
            expires_at: Date.now() + ((expires_in || 3600) * 1000), // Use expires_in from response or default to 1 hour
            workos_user_id: user.id
        });

        console.log('[WorkOS Auth] User data synced with local DB.');
        
        // Log users after authentication
        if (dataService.sqliteClient) {
            const usersAfter = await dataService.sqliteClient.getAllUsers();
            console.log('[WorkOS Auth] Users after authentication:', usersAfter);
        }

        // Notify all windows
        const { windowPool } = require('./electron/windowManager');
        windowPool.forEach(win => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('workos-auth-success', {
                    user: workosUser,
                    success: true
                });
                win.webContents.send('user-changed', workosUser);
            }
        });

        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            if (header.isMinimized()) header.restore();
            header.focus();
        }

        console.log('[WorkOS Auth] Authentication completed successfully');

    } catch (error) {
        console.error('[WorkOS Auth] Error during authentication:', error);
        
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            header.webContents.send('workos-auth-failed', { 
                error: 'authentication_failed',
                message: error.message 
            });
        }
    }
}

function handlePersonalizeFromUrl(params) {
    console.log('[Custom URL] Personalize params:', params);
    
    const { windowPool } = require('./electron/windowManager');
    const header = windowPool.get('header');
    
    if (header && !header.isDestroyed()) {
        if (header.isMinimized()) header.restore();
        header.focus();
        
        BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('enter-personalize-mode', {
                    message: 'Personalization mode activated',
                    params: params
                });
            }
        });
    } else {
        console.error('[Custom URL] Header window not found for personalize');
    }
}
// Auto-update initialization
function initAutoUpdater() {
    try {
        // Skip auto-updater in development mode
        if (!app.isPackaged) {
            console.log('[AutoUpdater] Skipped in development (app is not packaged)');
            return;
        }

        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'pickle-com',
            repo: 'glass',
        });

        // Immediately check for updates & notify
        autoUpdater.checkForUpdatesAndNotify()
            .catch(err => {
                console.error('[AutoUpdater] Error checking for updates:', err);
            });

        autoUpdater.on('checking-for-update', () => {
            console.log('[AutoUpdater] Checking for updates…');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('[AutoUpdater] Update available:', info.version);
        });

        autoUpdater.on('update-not-available', () => {
            console.log('[AutoUpdater] Application is up-to-date');
        });

        autoUpdater.on('error', (err) => {
            console.error('[AutoUpdater] Error while updating:', err);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[AutoUpdater] Update downloaded: ${info.version}`);

            const dialogOpts = {
                type: 'info',
                buttons: ['Install now', 'Install on next launch'],
                title: 'Update Available',
                message: 'A new version of Glass is ready to be installed.',
                defaultId: 0,
                cancelId: 1
            };

            dialog.showMessageBox(dialogOpts).then((returnValue) => {
                // returnValue.response 0 is for 'Install Now'
                if (returnValue.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });
    } catch (e) {
        console.error('[AutoUpdater] Failed to initialise:', e);
    }
}