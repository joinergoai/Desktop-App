import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signInWithCustomToken, signOut } from 'firebase/auth';

import './AppHeader.js';
import './ApiKeyHeader.js';

const firebaseConfig = {
    apiKey: 'AIzaSyAgtJrmsFWG1C7m9S55HyT1laICEzuUS2g',
    authDomain: 'pickle-3651a.firebaseapp.com',
    projectId: 'pickle-3651a',
    storageBucket: 'pickle-3651a.firebasestorage.app',
    messagingSenderId: '904706892885',
    appId: '1:904706892885:web:0e42b3dda796674ead20dc',
    measurementId: 'G-SQ0WM6S28T',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

class HeaderTransitionManager {
    constructor() {

        this.headerContainer      = document.getElementById('header-container');
        this.currentHeaderType    = null;   // 'apikey' | 'app'
        this.apiKeyHeader         = null;
        this.appHeader            = null;

        /**
         * only one header window is allowed
         * @param {'apikey'|'app'} type
         */
        this.ensureHeader = (type) => {
            if (this.currentHeaderType === type) return;

            if (this.apiKeyHeader) { this.apiKeyHeader.remove(); this.apiKeyHeader = null; }
            if (this.appHeader)    { this.appHeader.remove();    this.appHeader   = null; }

            if (type === 'apikey') {
                this.apiKeyHeader      = document.createElement('apikey-header');
                this.headerContainer.appendChild(this.apiKeyHeader);
            } else {
                this.appHeader         = document.createElement('app-header');
                this.headerContainer.appendChild(this.appHeader);
                this.appHeader.startSlideInAnimation?.();
            }

            this.currentHeaderType = type;
            this.notifyHeaderState(type);
        };

        console.log('[HeaderController] Manager initialized');

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer
                .invoke('get-current-api-key')
                .then(storedKey => {
                    this.hasApiKey = !!storedKey;
                })
                .catch(() => {});
        }

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('login-successful', async (event, payload) => {
                const { customToken, token, error } = payload || {};
                try {
                    if (customToken) {
                        console.log('[HeaderController] Received custom token, signing in with custom token...');
                        await signInWithCustomToken(auth, customToken);
                        return;
                    }

                    if (token) {
                        console.log('[HeaderController] Received ID token, attempting Google credential sign-in...');
                        const credential = GoogleAuthProvider.credential(token);
                        await signInWithCredential(auth, credential);
                        return;
                    }

                    if (error) {
                        console.warn('[HeaderController] Login payload indicates verification failure. Proceeding to AppHeader UI only.');
                        this.transitionToAppHeader();
                    }
                } catch (error) {
                    console.error('[HeaderController] Sign-in failed', error);
                    this.transitionToAppHeader();
                }
            });
            
            ipcRenderer.on('workos-auth-success', async (event, payload) => {
                console.log('[HeaderController] WorkOS authentication successful:', payload);
                this.hasApiKey = false; // WorkOS users don't need API keys
                // WorkOS authenticated users get the full app experience
                this.transitionToAppHeader(true);
            });
            
            ipcRenderer.on('workos-auth-failed', (event, error) => {
                console.error('[HeaderController] WorkOS authentication failed:', error);
                if (this.apiKeyHeader) {
                    this.apiKeyHeader.errorMessage = error.message || 'WorkOS authentication failed';
                    this.apiKeyHeader.requestUpdate();
                }
            });
            
            
            ipcRenderer.on('request-firebase-logout', async () => {
                console.log('[HeaderController] Received request to sign out.');
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error('[HeaderController] Sign out failed', error);
                }
            });

            ipcRenderer.on('api-key-validated', () => {
                this.hasApiKey = true;
                this.transitionToAppHeader();
            });

            ipcRenderer.on('api-key-removed', () => {
                this.hasApiKey = false;
                this.transitionToApiKeyHeader();
            });

            ipcRenderer.on('api-key-updated', () => {
                this.hasApiKey = true;
                if (!auth.currentUser) {
                    this.transitionToAppHeader();
                }
            });

            ipcRenderer.on('firebase-auth-success', async (event, firebaseUser) => {
                console.log('[HeaderController] Received firebase-auth-success:', firebaseUser.uid);
                try {
                    if (firebaseUser.idToken) {
                        const credential = GoogleAuthProvider.credential(firebaseUser.idToken);
                        await signInWithCredential(auth, credential);
                        console.log('[HeaderController] Firebase sign-in successful via ID token');
                    } else {
                        console.warn('[HeaderController] No ID token received from deeplink, virtual key request may fail');
                        this.transitionToAppHeader();
                    }
                } catch (error) {
                    console.error('[HeaderController] Firebase auth failed:', error);
                    this.transitionToAppHeader();
                }
            });
        }

        this._bootstrap();

        onAuthStateChanged(auth, async user => {
            console.log('[HeaderController] Auth state changed. User:', user ? user.email : 'null');

            if (window.require) {
                const { ipcRenderer } = window.require('electron');

                let userDataWithToken = null;
                if (user) {
                    try {
                        const idToken = await user.getIdToken();
                        userDataWithToken = {
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName,
                            photoURL: user.photoURL,
                            idToken: idToken,
                        };
                    } catch (error) {
                        console.error('[HeaderController] Failed to get ID token:', error);
                        userDataWithToken = {
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName,
                            photoURL: user.photoURL,
                            idToken: null,
                        };
                    }
                }

                ipcRenderer.invoke('firebase-auth-state-changed', userDataWithToken).catch(console.error);
            }

            if (!this.isInitialized) {
                this.isInitialized = true;
            }

            if (user) {
                console.log('[HeaderController] User is logged in, transitioning to AppHeader');
                this.transitionToAppHeader(!this.hasApiKey);
            } else if (this.hasApiKey) {
                console.log('[HeaderController] No Firebase user but API key exists, showing AppHeader');
                this.transitionToAppHeader(false);
            } else {
                console.log('[HeaderController] No auth & no API key — showing ApiKeyHeader');
                this.transitionToApiKeyHeader();
            }
        });
    }


    notifyHeaderState(stateOverride) {
        const state = stateOverride || this.currentHeaderType || 'apikey';
        if (window.require) {
            window.require('electron').ipcRenderer.send('header-state-changed', state);
        }
    }

      async _bootstrap() {
              let storedKey = null;
              if (window.require) {
                  try {
                      storedKey = await window
                          .require('electron')
                          .ipcRenderer.invoke('get-current-api-key');
                  } catch (_) {}
              }
              this.hasApiKey = !!storedKey;
        
              const user = await new Promise(resolve => {
                  const unsubscribe = onAuthStateChanged(auth, u => {
                      unsubscribe();
                      resolve(u);
                  });
              });
        
              if (user || this.hasApiKey) {
                  await this._resizeForApp();
                  this.ensureHeader('app');
              } else {
                  await this._resizeForApiKey();
                  this.ensureHeader('apikey');
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
                await window.require('electron')
                    .ipcRenderer.invoke('resize-header-window', { width: 285, height: 150 });
            
                if (this.currentHeaderType !== 'apikey') {
                    this.ensureHeader('apikey');
                }
            
                 if (this.apiKeyHeader) this.apiKeyHeader.reset();
            }
}

window.addEventListener('DOMContentLoaded', () => {
    new HeaderTransitionManager();
});
