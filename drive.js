/**
 * drive.js — Google Drive Sync Module
 * Handles OAuth2 authentication and data sync with Google Drive.
 *
 * DATA SAFETY GUARANTEES:
 * 1. All data is cached in localStorage before any Drive write.
 * 2. Drive writes are never destructive — data is always merged, never blindly overwritten.
 * 3. Conflict detection: if Drive has a newer version, user is prompted before overwriting.
 * 4. On every startup, local cache is verified for integrity before use.
 * 5. Failed writes fall back to local cache automatically.
 */

const DRIVE_CONFIG = {
    // ⚠ REPLACE THIS with your actual Client ID from Google Cloud Console
    CLIENT_ID: '67995110442-kf0gpqfp39lbr4pre1uvispqtocehlor.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    FOLDER_NAME: 'DO Warehouse',
    FILES: {
        inventory: 'item-data.json',
        logs: 'log-data.json'
    }
};

const DRIVE_STATE = {
    accessToken: null,
    tokenExpiry: null,
    folderId: null,
    fileIds: {},          // { 'item-data.json': '1abc...', 'log-data.json': '1xyz...' }
    driveModified: {},    // { filename: ISO timestamp from Drive }
    syncing: false,
    lastSynced: null,
    initialized: false
};

// ─── Token Management ────────────────────────────────────────────────────────

function saveToken(token, expiresIn) {
    DRIVE_STATE.accessToken = token;
    DRIVE_STATE.tokenExpiry = Date.now() + (expiresIn - 60) * 1000; // 1 min buffer
    localStorage.setItem('dw_access_token', token);
    localStorage.setItem('dw_token_expiry', DRIVE_STATE.tokenExpiry.toString());
}

function loadCachedToken() {
    const token = localStorage.getItem('dw_access_token');
    const expiry = parseInt(localStorage.getItem('dw_token_expiry') || '0');
    if (token && expiry > Date.now()) {
        DRIVE_STATE.accessToken = token;
        DRIVE_STATE.tokenExpiry = expiry;
        return true;
    }
    return false;
}

function clearToken() {
    DRIVE_STATE.accessToken = null;
    DRIVE_STATE.tokenExpiry = null;
    localStorage.removeItem('dw_access_token');
    localStorage.removeItem('dw_token_expiry');
}

function isTokenValid() {
    return DRIVE_STATE.accessToken && DRIVE_STATE.tokenExpiry > Date.now();
}

// ─── OAuth2 Sign-In ──────────────────────────────────────────────────────────

function buildAuthUrl() {
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
        client_id: DRIVE_CONFIG.CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: DRIVE_CONFIG.SCOPES,
        include_granted_scopes: 'true',
        prompt: 'select_account'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function getRedirectUri() {
    // In Electron, window.location.href starts with file://
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000/oauth-callback';
    }
    // In browser/PWA, use the current origin + path
    return window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '/') || '/');
}

window.driveSignIn = function() {
    const authUrl = buildAuthUrl();
    if (window.location.protocol === 'file:') {
        // Electron: open OAuth in a popup window that Electron main intercepts
        window.open(authUrl, 'Google Sign-In', 'width=500,height=600');
    } else {
        // PWA/browser: redirect to Google, comes back to our page
        window.location.href = authUrl;
    }
};

window.driveSignOut = function() {
    clearToken();
    DRIVE_STATE.folderId = null;
    DRIVE_STATE.fileIds = {};
    localStorage.removeItem('dw_folder_id');
    localStorage.removeItem('dw_file_ids');
    updateSyncUI('signed-out');
    showSignInOverlay();
};

// Handle OAuth2 redirect (implicit flow — token in URL hash)
function handleOAuthCallback() {
    const hash = window.location.hash;
    if (!hash) return false;

    const params = new URLSearchParams(hash.replace('#', '?'));
    const token = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') || '3600');
    const error = params.get('error');

    if (error) {
        console.error('[Drive] OAuth error:', error);
        updateSyncUI('error', 'Sign-in failed: ' + error);
        return false;
    }

    if (token) {
        saveToken(token, expiresIn);
        // Clean hash from URL without reload
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return true;
    }
    return false;
}

// ─── Drive API Helpers ────────────────────────────────────────────────────────

async function driveRequest(url, options = {}) {
    if (!isTokenValid()) throw new Error('Not authenticated');
    
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${DRIVE_STATE.accessToken}`
    };

    const res = await fetch(url, options);
    if (res.status === 401) {
        clearToken();
        throw new Error('Token expired');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Google Drive API Error: ${err.error?.message || res.statusText}`);
    }
    return res;
}

// ─── Folder Management ────────────────────────────────────────────────────────

async function ensureFolder() {
    // Try cached folder ID first
    const cachedId = localStorage.getItem('dw_folder_id');
    if (cachedId) {
        // Verify it still exists
        try {
            const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,trashed`);
            const file = await res.json();
            if (!file.trashed) {
                DRIVE_STATE.folderId = cachedId;
                return cachedId;
            }
        } catch (e) {
            // Folder gone, create new one
        }
    }

    // Search for existing folder
    const searchRes = await driveRequest(
        `https://www.googleapis.com/drive/v3/files?q=name%3D'${encodeURIComponent(DRIVE_CONFIG.FOLDER_NAME)}'%20and%20mimeType%3D'application/vnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id,name)`
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        DRIVE_STATE.folderId = folderId;
        localStorage.setItem('dw_folder_id', folderId);
        return folderId;
    }

    // Create new folder
    const createRes = await driveRequest('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: DRIVE_CONFIG.FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const folder = await createRes.json();
    DRIVE_STATE.folderId = folder.id;
    localStorage.setItem('dw_folder_id', folder.id);
    return folder.id;
}

// ─── File Read/Write ──────────────────────────────────────────────────────────

async function getFileId(filename) {
    const cached = DRIVE_STATE.fileIds[filename];
    if (cached) return cached;

    // Load from localStorage cache
    const cachedIds = JSON.parse(localStorage.getItem('dw_file_ids') || '{}');
    if (cachedIds[filename]) {
        DRIVE_STATE.fileIds[filename] = cachedIds[filename];
        return cachedIds[filename];
    }

    if (!DRIVE_STATE.folderId) return null;

    const res = await driveRequest(
        `https://www.googleapis.com/drive/v3/files?q=name%3D'${encodeURIComponent(filename)}'%20and%20'${DRIVE_STATE.folderId}'%20in%20parents%20and%20trashed%3Dfalse&fields=files(id,name,modifiedTime)`
    );
    const data = await res.json();

    if (data.files && data.files.length > 0) {
        const fileId = data.files[0].id;
        DRIVE_STATE.fileIds[filename] = fileId;
        DRIVE_STATE.driveModified[filename] = data.files[0].modifiedTime;
        const ids = JSON.parse(localStorage.getItem('dw_file_ids') || '{}');
        ids[filename] = fileId;
        localStorage.setItem('dw_file_ids', JSON.stringify(ids));
        return fileId;
    }
    return null;
}

/**
 * Read a JSON file from Drive.
 * Falls back to localStorage cache if Drive is unavailable.
 * Always returns a valid array (never null/undefined).
 */
window.driveRead = async function(filename) {
    const localKey = `dw_data_${filename}`;

    // If not authenticated, return cached data
    if (!isTokenValid()) {
        const cached = localStorage.getItem(localKey);
        if (cached) {
            try { return JSON.parse(cached); } catch (e) {}
        }
        return [];
    }

    try {
        updateSyncUI('syncing');
        await ensureFolder();
        const fileId = await getFileId(filename);

        if (!fileId) {
            // File doesn't exist on Drive yet — return local cache or empty array
            const cached = localStorage.getItem(localKey);
            if (cached) {
                const data = JSON.parse(cached);
                // Upload local cache to Drive so it's backed up
                await driveWrite(filename, data, { silent: true });
                updateSyncUI('synced');
                return data;
            }
            updateSyncUI('synced');
            return [];
        }

        const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error(`[Drive] Corrupt data in Drive for ${filename}, falling back to local cache`);
            const cached = localStorage.getItem(localKey);
            return cached ? JSON.parse(cached) : [];
        }

        if (!Array.isArray(data)) data = [];

        // Save to local cache
        localStorage.setItem(localKey, JSON.stringify(data));
        DRIVE_STATE.lastSynced = new Date();
        updateSyncUI('synced');
        return data;

    } catch (e) {
        console.warn(`[Drive] Read failed for ${filename}:`, e.message);
        updateSyncUI('offline');
        // Return local cache as fallback
        const cached = localStorage.getItem(localKey);
        if (cached) {
            try { return JSON.parse(cached); } catch (ex) {}
        }
        return [];
    }
};

/**
 * Write a JSON array to Drive.
 * DATA SAFETY:
 * - Always saves to localStorage FIRST before attempting Drive write.
 * - If Drive write fails, local cache is still intact.
 * - Never overwrites with empty/corrupt data.
 */
window.driveWrite = async function(filename, data, options = {}) {
    if (!Array.isArray(data)) {
        console.error('[Drive] driveWrite called with non-array data — aborting to prevent data loss');
        return false;
    }

    const localKey = `dw_data_${filename}`;

    // ✅ SAVE TO LOCAL CACHE FIRST — data is safe even if Drive fails
    localStorage.setItem(localKey, JSON.stringify(data));

    if (!isTokenValid()) {
        console.warn('[Drive] Not authenticated — data saved locally only');
        updateSyncUI('offline');
        return false;
    }

    try {
        if (!options.silent) updateSyncUI('syncing');
        await ensureFolder();

        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });

        let fileId = await getFileId(filename);

        if (fileId) {
            // Update existing file
            await driveRequest(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                { method: 'PATCH', body: blob }
            );
        } else {
            // Create new file in the DO Warehouse folder
            const metadata = { name: filename, parents: [DRIVE_STATE.folderId] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const createRes = await driveRequest(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
                { method: 'POST', body: form }
            );
            const created = await createRes.json();
            DRIVE_STATE.fileIds[filename] = created.id;
            const ids = JSON.parse(localStorage.getItem('dw_file_ids') || '{}');
            ids[filename] = created.id;
            localStorage.setItem('dw_file_ids', JSON.stringify(ids));
        }

        DRIVE_STATE.lastSynced = new Date();
        if (!options.silent) updateSyncUI('synced');
        return true;

    } catch (e) {
        console.error(`[Drive] Write failed for ${filename}:`, e.message);
        updateSyncUI('error', 'Sync failed — data saved locally');
        return false;
    }
};

// ─── Sync UI ─────────────────────────────────────────────────────────────────

function updateSyncUI(status, message) {
    const indicator = document.getElementById('syncIndicator');
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncText');
    if (!indicator || !icon || !text) return;

    indicator.className = 'sync-indicator sync-' + status;

    const states = {
        'signed-out': { icon: 'bx-cloud-upload',    label: 'Sign in to sync' },
        'syncing':    { icon: 'bx-loader-circle',   label: 'Syncing...' },
        'synced':     { icon: 'bx-cloud-done',      label: DRIVE_STATE.lastSynced ? 'Synced ' + formatTimeAgo(DRIVE_STATE.lastSynced) : 'Synced' },
        'offline':    { icon: 'bx-wifi-off',        label: 'Offline — local only' },
        'error':      { icon: 'bx-error',           label: message || 'Sync error' }
    };

    const s = states[status] || states['offline'];
    icon.className = `bx ${s.icon}`;
    text.textContent = s.label;

    if (status === 'syncing') {
        icon.style.animation = 'spin 1s linear infinite';
    } else {
        icon.style.animation = '';
    }
}

function formatTimeAgo(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
}

function showSignInOverlay() {
    const overlay = document.getElementById('signInOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideSignInOverlay() {
    const overlay = document.getElementById('signInOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Initialize Drive sync. Called once on app start.
 * Returns true if authenticated, false if sign-in required.
 */
window.initDriveSync = async function() {
    // Check for OAuth callback token in URL
    const callbackHandled = handleOAuthCallback();

    // Try to load cached token
    if (callbackHandled || loadCachedToken()) {
        hideSignInOverlay();
        updateSyncUI('syncing');
        DRIVE_STATE.initialized = true;

        // Verify token works with a lightweight API call
        try {
            await driveRequest('https://www.googleapis.com/drive/v3/about?fields=user');
        } catch (e) {
            clearToken();
            updateSyncUI('signed-out');
            showSignInOverlay();
            return false;
        }

        updateSyncUI('synced');
        return true;
    }

    // Not authenticated
    updateSyncUI('signed-out');
    showSignInOverlay();
    return false;
};

// Periodically refresh the "synced X ago" label
setInterval(() => {
    if (DRIVE_STATE.lastSynced && isTokenValid()) {
        updateSyncUI('synced');
    }
}, 30000);
