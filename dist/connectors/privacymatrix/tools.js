import { z } from 'zod';
import { cellsForApp, cellsForQuestion, findApp, findQuestion, getCell, getData, questionIdsForKeyword, } from './data.js';
import { cellSummary, DISCLAIMER, formatCell, textResult, withMeta } from './format.js';
function appNotFound(query) {
    const data = getData();
    const names = data.apps.map((a) => a.name).join(', ');
    return textResult(`No app matched "${query}". Known apps: ${names}. Call list_apps for ids and vendors.`);
}
function questionNotFound(query) {
    const data = getData();
    const list = data.questions.map((q) => `${q.id} — ${q.name}`).join('\n');
    return textResult(`No privacy question matched "${query}". Call list_questions, or ask about one of:\n${list}`);
}
export function registerPrivacyMatrixTools(server) {
    server.registerTool('list_apps', {
        title: 'List AI assistant apps',
        description: 'List the consumer AI assistant apps covered by PrivacyMatrix (id, name, vendor, homepage, and a rough ' +
            'privacy score = number of "yes" answers out of 14 questions). Use this to see what is covered, or to ' +
            'resolve an app name before calling other tools.',
        inputSchema: {},
    }, async () => {
        const data = getData();
        const rows = data.apps.map((app) => {
            const cells = cellsForApp(data, app.id);
            const yesCount = cells.filter((c) => c.value === 'yes').length;
            return { id: app.id, name: app.name, vendor: app.vendor, homepage: app.homepage, yes_count: yesCount, of: data.questions.length };
        });
        const lines = rows
            .sort((a, b) => b.yes_count - a.yes_count)
            .map((r) => `- **${r.name}** (${r.vendor}) — ${r.yes_count}/${r.of} yes — ${r.homepage}`);
        const text = `${data.apps.length} apps covered by PrivacyMatrix. "Yes count" is a rough indicator, not a ranking; read individual answers for what matters to you.\n\n${lines.join('\n')}\n\n${DISCLAIMER}`;
        return { ...textResult(text), structuredContent: withMeta(data, { apps: rows }) };
    });
    server.registerTool('list_questions', {
        title: 'List privacy questions',
        description: 'List the 14 privacy questions PrivacyMatrix asks of every app (training, memory, deletion, ads, ' +
            'human review, location, data rights, etc.), grouped by topic. Every question is phrased so that ' +
            '"yes" is the more privacy-protective answer. Use this to see what can be asked, or to resolve a ' +
            'question before calling get_answer / compare_apps / best_apps_for.',
        inputSchema: {},
    }, async () => {
        const data = getData();
        const byGroup = data.groups.map((g) => {
            const qs = data.questions.filter((q) => q.group === g.id);
            return { group: g.name, questions: qs.map((q) => ({ id: q.id, name: q.name, question: q.question })) };
        });
        const lines = byGroup
            .map((g) => `**${g.group}**\n${g.questions.map((q) => `- \`${q.id}\` — ${q.name}: ${q.question}`).join('\n')}`)
            .join('\n\n');
        const text = `${data.questions.length} questions, grouped by topic. "Yes" is always the more privacy-protective answer.\n\n${lines}`;
        return { ...textResult(text), structuredContent: withMeta(data, { groups: byGroup }) };
    });
    server.registerTool('get_answer', {
        title: 'Get one privacy answer for one app',
        description: 'Get PrivacyMatrix\'s answer for one app and one privacy question: the value (yes/partial/no/unknown), ' +
            'the exact quote from the vendor\'s own privacy policy or help pages, the source URL, and the date it ' +
            'was last verified there. Accepts natural-language app names ("ChatGPT", "OpenAI") and natural-language ' +
            'questions ("does it train on my chats", "can I delete my account").',
        inputSchema: {
            app: z.string().describe('App name, vendor, or id, e.g. "ChatGPT", "OpenAI", "chatgpt".'),
            question: z
                .string()
                .describe('Question id or natural language, e.g. "no_training_default", "does it train on my chats".'),
        },
    }, async ({ app, question }) => {
        const data = getData();
        const foundApp = findApp(data, app);
        if (!foundApp)
            return appNotFound(app);
        const foundQuestion = findQuestion(data, question);
        if (!foundQuestion)
            return questionNotFound(question);
        const cell = getCell(data, foundApp.id, foundQuestion.id);
        if (!cell) {
            const text = `No data for ${foundApp.name} / ${foundQuestion.name} yet. ${DISCLAIMER}`;
            return textResult(text);
        }
        const text = `**${foundApp.name}** (${foundApp.vendor}) — ${formatCell(cell, foundQuestion)}\n\n${DISCLAIMER}`;
        return {
            ...textResult(text),
            structuredContent: withMeta(data, {
                app: { id: foundApp.id, name: foundApp.name, vendor: foundApp.vendor },
                question: { id: foundQuestion.id, name: foundQuestion.name },
                answer: cellSummary(cell),
            }),
        };
    });
    server.registerTool('app_report', {
        title: 'Full privacy report for one app',
        description: 'Get all 14 PrivacyMatrix answers for one app in one call: every question, its value, a short quote, ' +
            'the source URL, and the verification date. Use this for "what does PrivacyMatrix say about X" style questions.',
        inputSchema: {
            app: z.string().describe('App name, vendor, or id, e.g. "Claude", "Anthropic", "claude".'),
        },
    }, async ({ app }) => {
        const data = getData();
        const foundApp = findApp(data, app);
        if (!foundApp)
            return appNotFound(app);
        const cells = cellsForApp(data, foundApp.id);
        const rows = data.questions.map((q) => {
            const cell = cells.find((c) => c.question === q.id);
            return { question: q, cell };
        });
        const lines = rows.map(({ question, cell }) => {
            if (!cell)
                return `- \`${question.id}\`: no data`;
            const quoteBit = cell.quote ? ` — "${cell.quote.slice(0, 180)}${cell.quote.length > 180 ? '…' : ''}"` : '';
            return `- **${question.name}**: ${cell.value}${quoteBit} (${cell.evidence_url ?? 'no source'})`;
        });
        const text = `**${foundApp.name}** (${foundApp.vendor}) — full report\n\n${lines.join('\n')}\n\n${DISCLAIMER}`;
        return {
            ...textResult(text),
            structuredContent: withMeta(data, {
                app: { id: foundApp.id, name: foundApp.name, vendor: foundApp.vendor, homepage: foundApp.homepage },
                answers: rows.map(({ question, cell }) => ({
                    question: { id: question.id, name: question.name },
                    answer: cell ? cellSummary(cell) : null,
                })),
            }),
        };
    });
    server.registerTool('compare_apps', {
        title: 'Compare apps on privacy questions',
        description: 'Compare 2-6 apps side by side on one or more privacy questions (defaults to all 14). Returns a table: ' +
            'one row per question, one column per app, with the source URL for every cell. Use this for ' +
            '"compare X and Y on privacy" style requests.',
        inputSchema: {
            apps: z.array(z.string()).min(2).max(6).describe('2 to 6 app names, vendors, or ids.'),
            questions: z
                .array(z.string())
                .optional()
                .describe('Optional list of question ids or natural language; defaults to all 14 questions.'),
        },
    }, async ({ apps, questions }) => {
        const data = getData();
        const resolvedApps = [];
        for (const a of apps) {
            const found = findApp(data, a);
            if (!found)
                return appNotFound(a);
            resolvedApps.push(found);
        }
        let resolvedQuestions;
        if (questions && questions.length > 0) {
            resolvedQuestions = [];
            for (const q of questions) {
                const found = findQuestion(data, q);
                if (!found)
                    return questionNotFound(q);
                resolvedQuestions.push(found);
            }
        }
        else {
            resolvedQuestions = data.questions;
        }
        const header = `| Question | ${resolvedApps.map((a) => a.name).join(' | ')} |`;
        const sep = `|---|${resolvedApps.map(() => '---').join('|')}|`;
        const rows = resolvedQuestions.map((q) => {
            const cells = resolvedApps.map((a) => {
                const c = getCell(data, a.id, q.id);
                return c ? c.value : 'n/a';
            });
            return `| ${q.name} | ${cells.join(' | ')} |`;
        });
        const sources = resolvedQuestions
            .map((q) => {
            const lines = resolvedApps
                .map((a) => {
                const c = getCell(data, a.id, q.id);
                return c?.evidence_url ? `  - ${a.name}: ${c.evidence_url}` : null;
            })
                .filter(Boolean);
            return lines.length ? `**${q.name}**\n${lines.join('\n')}` : null;
        })
            .filter(Boolean)
            .join('\n\n');
        const text = `${header}\n${sep}\n${rows.join('\n')}\n\nSources:\n\n${sources}\n\n${DISCLAIMER}`;
        return {
            ...textResult(text),
            structuredContent: withMeta(data, {
                apps: resolvedApps.map((a) => ({ id: a.id, name: a.name })),
                questions: resolvedQuestions.map((q) => ({ id: q.id, name: q.name })),
                rows: resolvedQuestions.map((q) => ({
                    question: q.id,
                    values: Object.fromEntries(resolvedApps.map((a) => {
                        const c = getCell(data, a.id, q.id);
                        return [a.id, c ? cellSummary(c) : null];
                    })),
                })),
            }),
        };
    });
    server.registerTool('best_apps_for', {
        title: 'Which apps score best on one privacy question',
        description: 'Find which apps answer "yes" (or another value) for one privacy question, each with its quote and source. ' +
            'Use this for "which AI apps let me delete my data" or "which assistants don\'t use my chats for ads" style requests.',
        inputSchema: {
            question: z.string().describe('Question id or natural language, e.g. "temporary_chat", "incognito mode".'),
            value: z
                .enum(['yes', 'partial', 'no', 'unknown'])
                .optional()
                .describe('Which answer value to filter for. Defaults to "yes".'),
        },
    }, async ({ question, value }) => {
        const data = getData();
        const foundQuestion = findQuestion(data, question);
        if (!foundQuestion)
            return questionNotFound(question);
        const wanted = value ?? 'yes';
        const cells = cellsForQuestion(data, foundQuestion.id).filter((c) => c.value === wanted);
        const withApps = cells
            .map((c) => ({ app: data.apps.find((a) => a.id === c.app), cell: c }))
            .filter((x) => !!x.app);
        if (withApps.length === 0) {
            const text = `No apps answer "${wanted}" for **${foundQuestion.name}**.\n\n${DISCLAIMER}`;
            return textResult(text);
        }
        const lines = withApps.map(({ app, cell }) => `- **${app.name}**: "${(cell.quote ?? '').slice(0, 180)}" (${cell.evidence_url ?? 'no source'})`);
        const text = `Apps answering **${wanted}** for "${foundQuestion.name}" (${foundQuestion.question}):\n\n${lines.join('\n')}\n\n${DISCLAIMER}`;
        return {
            ...textResult(text),
            structuredContent: withMeta(data, {
                question: { id: foundQuestion.id, name: foundQuestion.name },
                value: wanted,
                apps: withApps.map(({ app, cell }) => ({ id: app.id, name: app.name, ...cellSummary(cell) })),
            }),
        };
    });
    server.registerTool('search', {
        title: 'Search PrivacyMatrix',
        description: 'Free-text search across app names, vendors, question text, notes, and quotes. Use this when the app ' +
            'or question is not obvious, or the user asks something broad like "which apps mention GDPR".',
        inputSchema: {
            query: z.string().min(2).describe('Free text to search for.'),
        },
    }, async ({ query }) => {
        const data = getData();
        const q = query.toLowerCase();
        const matches = data.cells
            .filter((c) => {
            const app = data.apps.find((a) => a.id === c.app);
            const question = data.questions.find((qq) => qq.id === c.question);
            return (app?.name.toLowerCase().includes(q) ||
                app?.vendor.toLowerCase().includes(q) ||
                question?.name.toLowerCase().includes(q) ||
                question?.question.toLowerCase().includes(q) ||
                c.notes?.toLowerCase().includes(q) ||
                c.quote?.toLowerCase().includes(q));
        })
            .slice(0, 20);
        if (matches.length === 0) {
            return textResult(`No matches for "${query}". Try list_apps or list_questions to see what's covered.`);
        }
        const lines = matches.map((c) => {
            const app = data.apps.find((a) => a.id === c.app);
            const question = data.questions.find((qq) => qq.id === c.question);
            return `- **${app?.name}** / ${question?.name}: ${c.value} — "${(c.quote ?? '').slice(0, 140)}" (${c.evidence_url ?? 'no source'})`;
        });
        const text = `${matches.length} matches for "${query}":\n\n${lines.join('\n')}\n\n${DISCLAIMER}`;
        return {
            ...textResult(text),
            structuredContent: withMeta(data, {
                query,
                matches: matches.map((c) => ({ app: c.app, question: c.question, ...cellSummary(c) })),
            }),
        };
    });
}
// exported for tests
export { appNotFound, questionNotFound };
export { questionIdsForKeyword };
