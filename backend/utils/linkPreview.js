// utils/linkPreview.js — extracts Open Graph metadata for a URL.
// Lightweight: native fetch + regex over <head>, no extra deps.

const URL_RE = /(https?:\/\/[^\s<>"]+)/i;

export const extractFirstUrl = (text) => {
    if (!text) return null;
    const m = String(text).match(URL_RE);
    return m ? m[1] : null;
};

const meta = (html, names) => {
    for (const name of names) {
        // Match property="og:..." or name="..."
        const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
        const m1 = html.match(re);
        if (m1) return decode(m1[1]);
        // Reverse order (content first, property second)
        const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
        const m2 = html.match(re2);
        if (m2) return decode(m2[1]);
    }
    return null;
};

const decode = (s) => s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const absolutize = (maybeRelative, base) => {
    if (!maybeRelative) return null;
    try { return new URL(maybeRelative, base).href; } catch { return null; }
};

export const fetchLinkPreview = async (url, { timeoutMs = 4000 } = {}) => {
    if (!url) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            redirect: 'follow',
            headers: {
                // Some sites refuse default User-Agent
                'User-Agent': 'Mozilla/5.0 (compatible; DevCollabBot/1.0; +https://devcollab.app)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('text/html')) return null;
        // Limit to ~1MB to avoid huge pages
        const reader = res.body?.getReader?.();
        let html = '';
        if (reader) {
            const decoder = new TextDecoder();
            let total = 0;
            while (total < 1_000_000) {
                const { done, value } = await reader.read();
                if (done) break;
                total += value.length;
                html += decoder.decode(value, { stream: true });
                if (html.includes('</head>')) break; // we have what we need
            }
            try { reader.cancel(); } catch (_) {}
        } else {
            html = await res.text();
        }

        const head = html.split('</head>')[0] || html;
        const title = meta(head, ['og:title', 'twitter:title']) || (head.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null);
        const description = meta(head, ['og:description', 'twitter:description', 'description']);
        const imageRaw = meta(head, ['og:image', 'twitter:image', 'twitter:image:src']);
        const siteName = meta(head, ['og:site_name']);
        const image = imageRaw ? absolutize(imageRaw, url) : null;

        if (!title && !description && !image) return null;
        return { url, title, description, image, siteName };
    } catch (_) {
        return null;
    } finally {
        clearTimeout(t);
    }
};
