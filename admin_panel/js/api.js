const API_BASE = '/api';

async function apiRequest(url, options = {}) {
    const fullUrl = `${API_BASE}${url}`;
    console.log('[API DEBUG] Request:', options.method || 'GET', fullUrl);
    const token = localStorage.getItem('pb_token');
    const res = await fetch(fullUrl, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        window.auth?.handleUnauthorized?.();
        throw new Error('Unauthorized');
    }

    const contentType = res.headers.get('content-type') || '';
    console.log('[API DEBUG] Response:', res.status, fullUrl);
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.log('[API DEBUG] Response body:', text);
        if (!res.ok) throw new Error(text || `Ошибка ${res.status}`);
        return text;
    }

    const data = await res.json();
    console.log('[API DEBUG] Response data:', data);
    if (!res.ok) {
        let msg = data && data.message ? data.message : `Ошибка ${res.status}`;
        if (data && data.data && typeof data.data === 'object') {
            const details = Object.entries(data.data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('; ') : v}`)
                .join(' | ');
            if (details) msg += ` [${details}]`;
        }
        throw new Error(msg);
    }
    return data;
}

async function apiGet(url) {
    return apiRequest(url, { method: 'GET' });
}

async function apiPost(url, body) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

async function apiPatch(url, body) {
    return apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

async function apiDelete(url) {
    return apiRequest(url, { method: 'DELETE' });
}

window.api = { API_BASE, apiGet, apiPost, apiPatch, apiDelete };
