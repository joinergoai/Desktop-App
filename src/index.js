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
const path = require('node:path');
const { Deeplink } = require('electron-deeplink');
const express = require('express');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');

let WEB_PORT = 3000;

const openaiSessionRef = { current: null };
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
                if (header) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                    return;
                }
            }
            
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                const mainWindow = windows[0];
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    }

    const dbInitSuccess = await databaseInitializer.initialize();
    if (!dbInitSuccess) {
        console.error('>>> [index.js] Database initialization failed - some features may not work');
    } else {
        console.log('>>> [index.js] Database initialized successfully');
    }

    WEB_PORT = await startWebStack();
    console.log('Web front-end listening on', WEB_PORT);
    
    setupLiveSummaryIpcHandlers(openaiSessionRef);
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
                win.webContents.send('api-key-updated');
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
            const workosAuth = require('./common/services/workosAuth');
            const isAuthenticated = await workosAuth.isAuthenticated();
            return { isAuthenticated };
        } catch (error) {
            console.error('[IPC] Failed to check WorkOS auth:', error);
            return { isAuthenticated: false };
        }
    });

    ipcMain.on('set-current-user', (event, uid) => {
        console.log(`[IPC] set-current-user: ${uid}`);
        dataService.setCurrentUser(uid);
    });

    ipcMain.handle('start-firebase-auth', async () => {
        try {
            const authUrl = `http://localhost:${WEB_PORT}/login?mode=electron`;
            console.log(`[Auth] Opening Firebase auth URL in browser: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[Auth] Failed to open Firebase auth URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-workos-auth', async () => {
        try {
            // Check if environment variables are set
            if (!process.env.WORKOS_CLIENT_ID) {
                throw new Error('WORKOS_CLIENT_ID not configured');
            }

            // Generate a random state for security
            const state = require('crypto').randomUUID();
            
            // Use User Management authorization endpoint for AuthKit
            const authUrl = new URL('https://api.workos.com/user_management/authorize');
            authUrl.searchParams.append('client_id', process.env.WORKOS_CLIENT_ID);
            authUrl.searchParams.append('redirect_uri', 'pickleglass://workos-auth');
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('provider', 'authkit'); // Use AuthKit hosted UI
            authUrl.searchParams.append('state', state);
            
            console.log(`[WorkOS Auth] Opening auth URL in browser`);
            await shell.openExternal(authUrl.toString());
            return { success: true };
        } catch (error) {
            console.error('[WorkOS Auth] Failed to open auth URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('firebase-auth-success', async (event, firebaseUser) => {
        console.log('[IPC] firebase-auth-success:', firebaseUser.uid);
        try {
            await dataService.findOrCreateUser(firebaseUser);
            dataService.setCurrentUser(firebaseUser.uid);
            
            BrowserWindow.getAllWindows().forEach(win => {
                if (win !== event.sender.getOwnerBrowserWindow()) {
                    win.webContents.send('user-changed', firebaseUser);
                }
            });
        } catch (error) {
            console.error('[IPC] Failed to handle firebase-auth-success:', error);
        }
    });

    ipcMain.handle('get-api-url', () => {
        return process.env.pickleglass_API_URL || 'http://localhost:9001';
    });

    ipcMain.handle('get-web-url', () => {
        return process.env.pickleglass_WEB_URL || 'http://localhost:3000';
    });

    ipcMain.on('get-api-url-sync', (event) => {
        event.returnValue = process.env.pickleglass_API_URL || 'http://localhost:9001';
    });

    ipcMain.handle('get-database-status', async () => {
        return await databaseInitializer.getStatus();
    });

    ipcMain.handle('reset-database', async () => {
        return await databaseInitializer.reset();
    });

    ipcMain.handle('get-current-user', async () => {
        try {
            const user = await dataService.sqliteClient.getUser(dataService.currentUserId);
            if (user) {
            return {
                    id: user.uid,
                    name: user.display_name,
                    isAuthenticated: user.uid !== 'default_user'
            };
            }
            throw new Error('User not found in DataService');
        } catch (error) {
            console.error('Failed to get current user via DataService:', error);
            return {
                id: 'default_user',
                name: 'Default User',
                isAuthenticated: false
            };
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
            case 'login':
            case 'auth-success':
                await handleFirebaseAuthCallback(params);
                break;
            case 'workos-auth':
                await handleWorkOSAuthCallback(params);
                break;
            case 'personalize':
                handlePersonalizeFromUrl(params);
                break;
            default:
                const { windowPool } = require('./electron/windowManager');
                const header = windowPool.get('header');
                if (header) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                    
                    const targetUrl = `http://localhost:${WEB_PORT}/${action}`;
                    console.log(`[Custom URL] Navigating webview to: ${targetUrl}`);
                    header.webContents.loadURL(targetUrl);
                }
        }

    } catch (error) {
        console.error('[Custom URL] Error parsing URL:', error);
    }
}

async function handleFirebaseAuthCallback(params) {
    const { token: idToken } = params;

    if (!idToken) {
        console.error('[Auth] Firebase auth callback is missing ID token.');
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header) {
            header.webContents.send('login-successful', {
                error: 'authentication_failed',
                message: 'ID token not provided in deep link.'
            });
        }
        return;
    }

    console.log('[Auth] Received ID token from deep link, exchanging for custom token...');

    try {
        const functionUrl = 'https://us-west1-pickle-3651a.cloudfunctions.net/pickleGlassAuthCallback';
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });

        const data = await response.json();



        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to exchange token.');
        }

        const { customToken, user } = data;
        console.log('[Auth] Successfully received custom token for user:', user.uid);

        const firebaseUser = {
            uid: user.uid,
            email: user.email || 'no-email@example.com',
            displayName: user.name || 'User',
            photoURL: user.picture
        };

        await dataService.findOrCreateUser(firebaseUser);
        dataService.setCurrentUser(user.uid);
        console.log('[Auth] User data synced with local DB.');

        // if (firebaseUser.email && idToken) {
        //     try {
        //         const { getVirtualKeyByEmail, setApiKey } = require('./electron/windowManager');
        //         console.log('[Auth] Fetching virtual key for:', firebaseUser.email);
        //         const vKey = await getVirtualKeyByEmail(firebaseUser.email, idToken);
        //         console.log('[Auth] Virtual key fetched successfully');
                
        //         await setApiKey(vKey);
        //         console.log('[Auth] Virtual key saved successfully');
                
        //         const { setCurrentFirebaseUser } = require('./electron/windowManager');
        //         setCurrentFirebaseUser(firebaseUser);
                
        //         const { windowPool } = require('./electron/windowManager');
        //         windowPool.forEach(win => {
        //             if (win && !win.isDestroyed()) {
        //                 win.webContents.send('api-key-updated');
        //                 win.webContents.send('firebase-user-updated', firebaseUser);
        //             }
        //         });
        //     } catch (error) {
        //         console.error('[Auth] Virtual key fetch failed:', error);
        //     }
        // }

        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');

        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
            
            console.log('[Auth] Sending custom token to renderer for sign-in.');
            header.webContents.send('login-successful', { 
                customToken: customToken, 
                user: firebaseUser,
                success: true 
            });

            BrowserWindow.getAllWindows().forEach(win => {
                if (win !== header) {
                    win.webContents.send('user-changed', firebaseUser);
                }
            });

            console.log('[Auth] Firebase authentication completed successfully');

        } else {
            console.error('[Auth] Header window not found after getting custom token.');
        }
        
    } catch (error) {
        console.error('[Auth] Error during custom token exchange:', error);
        
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header) {
            header.webContents.send('login-successful', { 
                error: 'authentication_failed',
                message: error.message 
            });
        }
    }
}

async function handleWorkOSAuthCallback(params) {
    const { code, state } = params;

    if (!code) {
        console.error('[WorkOS Auth] Authorization code missing');
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header) {
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
        console.log('[WorkOS Auth] Using credentials:', {
            hasApiKey: !!process.env.WORKOS_API_KEY,
            hasClientId: !!process.env.WORKOS_CLIENT_ID,
            clientId: process.env.WORKOS_CLIENT_ID,
            apiKeyLength: process.env.WORKOS_API_KEY ? process.env.WORKOS_API_KEY.length : 0
        });
        
        // Use the User Management authenticate endpoint for AuthKit
        const tokenResponse = await fetch('https://api.workos.com/user_management/authenticate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'PickleGlass/1.0'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.WORKOS_CLIENT_ID,
                client_secret: process.env.WORKOS_API_KEY // API key is used as client secret
            })
        });

        const responseText = await tokenResponse.text();
        let tokens;
        
        try {
            tokens = JSON.parse(responseText);
        } catch (e) {
            console.error('[WorkOS Auth] Failed to parse response:', responseText);
            throw new Error('Invalid response from WorkOS');
        }
        
        if (!tokenResponse.ok) {
            console.error('[WorkOS Auth] Token exchange failed:', {
                status: tokenResponse.status,
                error: tokens.error,
                error_description: tokens.error_description,
                response: tokens,
                errors: tokens.errors ? JSON.stringify(tokens.errors, null, 2) : 'No errors array'
            });
            throw new Error(tokens.error_description || tokens.error || 'Failed to exchange tokens');
        }

        console.log('[WorkOS Auth] Authentication successful');

        // The user_management/authenticate endpoint returns the user directly
        const { user, access_token, refresh_token } = tokens;
        
        if (!user) {
            throw new Error('No user data in authentication response');
        }

        console.log('[WorkOS Auth] User authenticated:', user.email);

        // Create/update user in SQLite
        const workosUser = {
            uid: user.id,
            display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.email
        };

        await dataService.findOrCreateUser(workosUser);
        
        // Store tokens with expiry
        await dataService.saveWorkOSTokens({
            access_token: access_token,
            refresh_token: refresh_token,
            expires_at: Date.now() + (3600 * 1000), // Default to 1 hour
            workos_user_id: user.id
        });

        dataService.setCurrentUser(user.id);
        console.log('[WorkOS Auth] User data synced with local DB.');

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
        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
        }

        console.log('[WorkOS Auth] Authentication completed successfully');

    } catch (error) {
        console.error('[WorkOS Auth] Error during authentication:', error);
        
        const { windowPool } = require('./electron/windowManager');
        const header = windowPool.get('header');
        if (header) {
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
    
    if (header) {
        if (header.isMinimized()) header.restore();
        header.focus();
        
        const personalizeUrl = `http://localhost:${WEB_PORT}/settings`;
        console.log(`[Custom URL] Navigating to personalize page: ${personalizeUrl}`);
        header.webContents.loadURL(personalizeUrl);
        
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('enter-personalize-mode', {
                message: 'Personalization mode activated',
                params: params
            });
        });
    } else {
        console.error('[Custom URL] Header window not found for personalize');
    }
}


async function startWebStack() {
  console.log('NODE_ENV =', process.env.NODE_ENV); 
  const isDev = !app.isPackaged;

  const getAvailablePort = () => {
    return new Promise((resolve, reject) => {
      const server = require('net').createServer();
      server.listen(0, (err) => {
        if (err) reject(err);
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    });
  };

  const apiPort = await getAvailablePort();
  const frontendPort = await getAvailablePort();

  console.log(`🔧 Allocated ports: API=${apiPort}, Frontend=${frontendPort}`);

  process.env.pickleglass_API_PORT = apiPort.toString();
  process.env.pickleglass_API_URL = `http://localhost:${apiPort}`;
  process.env.pickleglass_WEB_PORT = frontendPort.toString();
  process.env.pickleglass_WEB_URL = `http://localhost:${frontendPort}`;

  console.log(`🌍 Environment variables set:`, {
    pickleglass_API_URL: process.env.pickleglass_API_URL,
    pickleglass_WEB_URL: process.env.pickleglass_WEB_URL
  });

  const createBackendApp = require('../pickleglass_web/backend_node');
  const nodeApi = createBackendApp();

  const staticDir = app.isPackaged
    ? path.join(process.resourcesPath, 'out')
    : path.join(__dirname, '..', 'pickleglass_web', 'out');

  const fs = require('fs');

  if (!fs.existsSync(staticDir)) {
    console.error(`============================================================`);
    console.error(`[ERROR] Frontend build directory not found!`);
    console.error(`Path: ${staticDir}`);
    console.error(`Please run 'npm run build' inside the 'pickleglass_web' directory first.`);
    console.error(`============================================================`);
    app.quit();
    return;
  }

  const runtimeConfig = {
    API_URL: `http://localhost:${apiPort}`,
    WEB_URL: `http://localhost:${frontendPort}`,
    timestamp: Date.now()
  };
  
  // 쓰기 가능한 임시 폴더에 런타임 설정 파일 생성
  const tempDir = app.getPath('temp');
  const configPath = path.join(tempDir, 'runtime-config.json');
  fs.writeFileSync(configPath, JSON.stringify(runtimeConfig, null, 2));
  console.log(`📝 Runtime config created in temp location: ${configPath}`);

  const frontSrv = express();
  
  // 프론트엔드에서 /runtime-config.json을 요청하면 임시 폴더의 파일을 제공
  frontSrv.get('/runtime-config.json', (req, res) => {
    res.sendFile(configPath);
  });

  frontSrv.use((req, res, next) => {
    if (req.path.indexOf('.') === -1 && req.path !== '/') {
      const htmlPath = path.join(staticDir, req.path + '.html');
      if (fs.existsSync(htmlPath)) {
        return res.sendFile(htmlPath);
      }
    }
    next();
  });
  
  frontSrv.use(express.static(staticDir));
  
  const frontendServer = await new Promise((resolve, reject) => {
    const server = frontSrv.listen(frontendPort, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
    app.once('before-quit', () => server.close());
  });

  console.log(`✅ Frontend server started on http://localhost:${frontendPort}`);

  const apiSrv = express();
  apiSrv.use(nodeApi);

  const apiServer = await new Promise((resolve, reject) => {
    const server = apiSrv.listen(apiPort, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
    app.once('before-quit', () => server.close());
  });

  console.log(`✅ API server started on http://localhost:${apiPort}`);

  console.log(`🚀 All services ready:`);
  console.log(`   Frontend: http://localhost:${frontendPort}`);
  console.log(`   API:      http://localhost:${apiPort}`);

  return frontendPort;
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