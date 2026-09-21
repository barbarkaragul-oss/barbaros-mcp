import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.join(__dirname, 'fallback');
const LIVE_URLS = {
    apps: 'https://raw.githubusercontent.com/barbarkaragul-oss/privacymatrix/main/data/apps.json',
    questions: 'https://raw.githubusercontent.com/barbarkaragul-oss/privacymatrix/main/data/questions.json',
    matrix: 'https://raw.githubusercontent.com/barbarkaragul-oss/privacymatrix/main/docs/matrix.json',
};
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 10_000;
let cache = null;
let refreshTimer = null;
async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok)
            throw new Error(`${url} -> HTTP ${res.status}`);
        return (await res.json());
    }
    finally {
        clearTimeout(timeout);
    }
}
async function readFallback(name) {
    const raw = await readFile(path.join(FALLBACK_DIR, name), 'utf-8');
    return JSON.parse(raw);
}
async function loadFromNetwork() {
    const [appsFile, questionsFile, matrixFile] = await Promise.all([
        fetchJson(LIVE_URLS.apps),
        fetchJson(LIVE_URLS.questions),
        fetchJson(LIVE_URLS.matrix),
    ]);
    return assemble(appsFile, questionsFile, matrixFile, 'live');
}
async function loadFromFallback() {
    const [appsFile, questionsFile, matrixFile] = await Promise.all([
        readFallback('apps.json'),
        readFallback('questions.json'),
        readFallback('matrix.json'),
    ]);
    return assemble(appsFile, questionsFile, matrixFile, 'fallback');
}
function assemble(appsFile, questionsFile, matrixFile, source) {
    return {
        apps: appsFile.apps,
        questions: questionsFile.questions,
        cells: matrixFile.cells,
        values: questionsFile.values,
        groups: questionsFile.groups,
        generated_at: matrixFile.generated_at,
        source,
        loaded_at: new Date().toISOString(),
    };
}
/** Loads live data from GitHub; on any failure keeps the last good cache, or
 *  falls back to the bundled snapshot if there is no cache yet. The server
 *  must never start with empty data. */
export async function refreshData() {
    try {
        const fresh = await loadFromNetwork();
        cache = fresh;
        return fresh;
    }
    catch (err) {
        if (cache) {
            // keep serving the last good copy; log once, don't crash a live server
            console.error('[privacymatrix] live refresh failed, keeping cached data:', err.message);
            return cache;
        }
        console.error('[privacymatrix] live refresh failed, no cache yet, using bundled fallback:', err.message);
        const fb = await loadFromFallback();
        cache = fb;
        return fb;
    }
}
export function getData() {
    if (!cache) {
        throw new Error('privacymatrix data not loaded yet; call initData() first');
    }
    return cache;
}
export async function initData() {
    await refreshData();
    if (!refreshTimer) {
        refreshTimer = setInterval(() => {
            refreshData().catch((err) => console.error('[privacymatrix] background refresh error:', err));
        }, REFRESH_INTERVAL_MS);
        refreshTimer.unref?.();
    }
}
export function stopDataRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}
// ---- indices & lookups --------------------------------------------------
const norm = (s) => s.trim().toLowerCase();
export function findApp(data, query) {
    const q = norm(query);
    return (data.apps.find((a) => norm(a.id) === q) ??
        data.apps.find((a) => norm(a.name) === q) ??
        data.apps.find((a) => norm(a.vendor) === q) ??
        data.apps.find((a) => norm(a.name).includes(q) || norm(a.vendor).includes(q)) ??
        null);
}
export function findQuestion(data, query) {
    const q = norm(query);
    const direct = data.questions.find((x) => norm(x.id) === q) ??
        data.questions.find((x) => norm(x.name) === q);
    if (direct)
        return direct;
    const keywordMap = [
        [/train|improv(e|ing) (the )?model/i, ['no_training_default', 'training_opt_out']],
        [/opt.?out/i, ['training_opt_out']],
        [/upload|file|image|document/i, ['uploads_excluded']],
        [/business|enterprise|team|api plan|api data/i, ['business_no_training']],
        [/incognito|temporary|history.off/i, ['temporary_chat']],
        [/memory/i, ['memory_controls']],
        [/delete.*(account|chat|conversation)|self.?service delet/i, ['user_deletion']],
        [/export|download my data|portab/i, ['data_export']],
        [/purge|really gone|how long.*delet|deletion timeline/i, ['deletion_timeline']],
        [/ad(s|vertis)/i, ['no_ads_use']],
        [/sell|sale|share.*third.?party|marketing/i, ['no_sale_sharing']],
        [/human|staff|contractor|read my (chat|conversation)/i, ['human_review_limited']],
        [/location|gps|geoloc/i, ['no_precise_location']],
        [/rights|gdpr|ccpa|access request/i, ['rights_channel']],
    ];
    for (const [re, ids] of keywordMap) {
        if (re.test(query)) {
            const found = data.questions.find((x) => x.id === ids[0]);
            if (found)
                return found;
        }
    }
    // last resort: substring match against question text
    return data.questions.find((x) => norm(x.question).includes(q) || norm(x.name).includes(q)) ?? null;
}
export function questionIdsForKeyword(data, query) {
    const keywordMap = [
        [/train|improv(e|ing) (the )?model/i, ['no_training_default', 'training_opt_out']],
        [/upload|file|image|document/i, ['uploads_excluded']],
        [/business|enterprise|team|api/i, ['business_no_training']],
        [/incognito|temporary|history.off/i, ['temporary_chat']],
        [/memory/i, ['memory_controls']],
        [/delete/i, ['user_deletion', 'deletion_timeline']],
        [/export|portab/i, ['data_export']],
        [/ad(s|vertis)/i, ['no_ads_use']],
        [/sell|sale|share/i, ['no_sale_sharing']],
        [/human|staff|contractor/i, ['human_review_limited']],
        [/location|gps|geoloc/i, ['no_precise_location']],
        [/rights|gdpr|ccpa/i, ['rights_channel']],
    ];
    for (const [re, ids] of keywordMap) {
        if (re.test(query)) {
            return data.questions.filter((x) => ids.includes(x.id));
        }
    }
    return [];
}
export function getCell(data, appId, questionId) {
    return data.cells.find((c) => c.app === appId && c.question === questionId) ?? null;
}
export function cellsForApp(data, appId) {
    return data.cells.filter((c) => c.app === appId);
}
export function cellsForQuestion(data, questionId) {
    return data.cells.filter((c) => c.question === questionId);
}
