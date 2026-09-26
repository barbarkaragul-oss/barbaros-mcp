import { z } from 'zod';
import { LEVEL_TEXT, scan } from './scan.js';
import tells from './vendor/tells.json' with { type: 'json' };
export const MAX_TEXT_CHARS = 20_000;
export const METHOD_URL = 'https://barbaros.dev/is-it-really-an-ai-tell/';
/**
 * Shown with every answer. This checks habits, not authorship, and must never be read as proof that
 * someone used AI: people use every one of these patterns too.
 */
export const NOTE = 'This measures writing habits, not authorship. It cannot tell whether a text was written by AI, and a match ' +
    'is not evidence that anyone used AI: people use every one of these patterns too (see the rate for people). ' +
    'Rates come from a public measurement of people\'s texts and several models\' texts: ' +
    METHOD_URL +
    ' . The text you send is checked in memory and is not stored.';
const pct = (n) => `${n}%`;
/** A few short excerpts around each match, so an assistant can point at the words without re-scanning. */
function excerpts(text, f, max = 3) {
    return f.ranges.slice(0, max).map(([s, e]) => {
        const from = Math.max(0, s - 30);
        const to = Math.min(text.length, e + 30);
        return `${from > 0 ? '…' : ''}${text.slice(from, to).replace(/\s+/g, ' ').trim()}${to < text.length ? '…' : ''}`;
    });
}
function textResult(text) {
    return { content: [{ type: 'text', text }] };
}
export function registerUnpolishedTools(server) {
    server.registerTool('polish_check', {
        title: 'Check a text for machine-like polish',
        description: 'Check a piece of writing for the habits that models use far more often than people (for example "delve", ' +
            '"it is important to note", three-item lists), and for popular "AI words" that measurements show people use ' +
            'just as much (for example "moreover", the long dash). Returns an overall level (Raw, A little shine, ' +
            'Polished, Glossy), each habit found with how often people and models use it, and short excerpts. Use it ' +
            'when someone wants to know whether their own writing, or a text they had a tool correct, now reads as ' +
            'machine-written. It does not decide who wrote a text; always pass on the note that a match is not ' +
            'evidence that anyone used AI. Works without any model; nothing is stored.',
        inputSchema: {
            text: z
                .string()
                .min(1)
                .max(MAX_TEXT_CHARS)
                .describe(`The text to check, in English, up to ${MAX_TEXT_CHARS} characters.`),
        },
    }, async ({ text }) => {
        const r = scan(text);
        const lvl = LEVEL_TEXT[r.level];
        const lines = [];
        lines.push(`**${lvl.name}** — ${lvl.line}`);
        lines.push(`${r.words} words, ${r.total} ${r.total === 1 ? 'habit' : 'habits'} found.`);
        if (r.tells.length) {
            lines.push('', 'Habits that models use far more often than people:');
            for (const f of r.tells) {
                lines.push(`- ${f.label} ×${f.count}: in up to ${pct(f.human)} of people's texts, and up to ${pct(f.machine)} of texts from ${f.machineArm}.`);
                for (const x of excerpts(text, f))
                    lines.push(`  > ${x}`);
            }
        }
        if (r.myths.length) {
            lines.push('', 'Also here, but not a sign of machine writing:');
            for (const m of r.myths)
                lines.push(`- ${m.label} ×${m.count}: ${m.note}.`);
        }
        lines.push('', NOTE);
        return {
            ...textResult(lines.join('\n')),
            structuredContent: {
                level: r.level,
                level_name: lvl.name,
                level_line: lvl.line,
                words: r.words,
                total: r.total,
                habits: r.tells.map((f) => ({
                    id: f.id,
                    label: f.label,
                    count: f.count,
                    people_pct: f.human,
                    model_pct: f.machine,
                    model: f.machineArm,
                    excerpts: excerpts(text, f),
                })),
                myths: r.myths.map((m) => ({ id: m.id, label: m.label, count: m.count, note: m.note })),
                source: tells.source,
                measured: tells.measured,
                method: METHOD_URL,
                note: NOTE,
            },
        };
    });
    server.registerTool('list_tells', {
        title: 'Which "AI words" are real',
        description: 'List the writing habits that measurements show models use far more often than people, with the rates for ' +
            'people and for the model that uses each most, and the popular "AI words" that turned out to be myths ' +
            '(people use them as much as models do). Use it to answer questions like "is delve really an AI word?" or ' +
            '"do only chatbots use the long dash?" without a text to check. Optional query filters by word.',
        inputSchema: {
            query: z
                .string()
                .optional()
                .describe('Optional word or phrase to look up, for example "delve", "moreover" or "dash".'),
        },
    }, async ({ query }) => {
        const q = query?.trim().toLowerCase();
        const hit = (id, label) => !q || id.toLowerCase().includes(q.replace(/\s+/g, '_')) || label.toLowerCase().includes(q);
        const strong = tells.strong.filter((t) => hit(t.id, t.label));
        const myths = tells.myths.filter((t) => hit(t.id, t.label));
        const lines = [];
        if (strong.length) {
            lines.push('Habits that models use far more often than people:');
            for (const t of strong)
                lines.push(`- ${t.label}: up to ${pct(t.human)} of people's texts, up to ${pct(t.machine)} of texts from ${t.machineArm}.`);
        }
        if (myths.length) {
            if (lines.length)
                lines.push('');
            lines.push('Popular "AI words" that people use just as much:');
            for (const t of myths)
                lines.push(`- ${t.label}: ${t.note}.`);
        }
        if (!lines.length) {
            lines.push(`"${query}" is not one of the measured habits. Call list_tells without a query to see all of them.`);
        }
        lines.push('', `Measured ${tells.measured.slice(0, 10)}. Method and data: ${METHOD_URL}`, '', NOTE);
        return {
            ...textResult(lines.join('\n')),
            structuredContent: {
                habits: strong.map((t) => ({ id: t.id, label: t.label, people_pct: t.human, model_pct: t.machine, model: t.machineArm })),
                myths: myths.map((t) => ({ id: t.id, label: t.label, people_pct: t.human, model_pct: t.machine, note: t.note })),
                source: tells.source,
                measured: tells.measured,
                method: METHOD_URL,
                note: NOTE,
            },
        };
    });
}
