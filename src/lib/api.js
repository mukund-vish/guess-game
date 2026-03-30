const BASE = import.meta.env.VITE_WORKER_URL;

export async function api(path, options = {}) {
    const method = path === '/' ? 'GET' : 'POST';
    const fetchOptions = {
        method,
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    };

    if (method === 'GET') {
        delete fetchOptions.body;
    }

    const res = await fetch(`${BASE}${path}`, fetchOptions);

    if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            const error = json.error || json.message || text;
            // Handle if error is an object (common with some backends)
            const finalMessage = typeof error === 'object' ? (error.message || JSON.stringify(error)) : error;
            throw new Error(finalMessage);
        } catch (e) {
            if (e.message) throw e;
            throw new Error(text);
        }
    }
    return res.json();
}