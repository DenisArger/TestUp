const API_BASE = '/api';

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('pb_token');
    const res = await fetch(`${API_BASE}${url}`, {
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
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (!res.ok) throw new Error(text || `Ошибка ${res.status}`);
        return text;
    }

    const data = await res.json();
    if (!res.ok) {
        const msg = data && data.message ? data.message : `Ошибка ${res.status}`;
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
