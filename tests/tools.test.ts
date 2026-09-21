import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { initData } from '../src/connectors/privacymatrix/data.js';
import { registerPrivacyMatrixTools } from '../src/connectors/privacymatrix/tools.js';

let client: Client;
let server: McpServer;

beforeAll(async () => {
  await initData();
  server = new McpServer({ name: 'privacymatrix-test', version: '0.0.0' });
  registerPrivacyMatrixTools(server);

  client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  const first = content[0];
  if (!first || first.type !== 'text' || typeof first.text !== 'string') {
    throw new Error('expected a text content block');
  }
  return first.text;
}

describe('privacymatrix MCP tools (via real client/server transport)', () => {
  it('lists all 7 tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      ['app_report', 'best_apps_for', 'compare_apps', 'get_answer', 'list_apps', 'list_questions', 'search'].sort()
    );
  });

  it('list_apps returns 28 apps', async () => {
    const result = await client.callTool({ name: 'list_apps', arguments: {} });
    const structured = result.structuredContent as { apps: unknown[] };
    expect(structured.apps).toHaveLength(28);
  });

  it('list_questions returns 14 questions across groups', async () => {
    const result = await client.callTool({ name: 'list_questions', arguments: {} });
    const structured = result.structuredContent as { groups: { questions: unknown[] }[] };
    const total = structured.groups.reduce((sum, g) => sum + g.questions.length, 0);
    expect(total).toBe(14);
  });

  it('get_answer: ChatGPT trains on chats by default (value "no"), with a quote and source', async () => {
    const result = await client.callTool({
      name: 'get_answer',
      arguments: { app: 'ChatGPT', question: 'no_training_default' },
    });
    const structured = result.structuredContent as { answer: { value: string; quote: string; evidence_url: string } };
    expect(structured.answer.value).toBe('no');
    expect(structured.answer.quote).toBeTruthy();
    expect(structured.answer.evidence_url).toMatch(/^https:\/\/help\.openai\.com/);
    expect(textOf(result)).toContain('Not legal advice');
  });

  it('get_answer resolves natural-language app and question', async () => {
    const result = await client.callTool({
      name: 'get_answer',
      arguments: { app: 'OpenAI', question: 'does it train on my chats' },
    });
    const structured = result.structuredContent as { app: { id: string }; question: { id: string } };
    expect(structured.app.id).toBe('chatgpt');
    expect(structured.question.id).toBe('no_training_default');
  });

  it('get_answer: unknown app returns a helpful text error, not a crash', async () => {
    const result = await client.callTool({
      name: 'get_answer',
      arguments: { app: 'DefinitelyNotAnApp', question: 'no_training_default' },
    });
    expect(textOf(result)).toMatch(/No app matched/);
  });

  it('app_report returns 14 answers for one app', async () => {
    const result = await client.callTool({ name: 'app_report', arguments: { app: 'Claude' } });
    const structured = result.structuredContent as { answers: unknown[] };
    expect(structured.answers).toHaveLength(14);
  });

  it('compare_apps builds a row per question and a value per app', async () => {
    const result = await client.callTool({
      name: 'compare_apps',
      arguments: { apps: ['Claude', 'Gemini', 'ChatGPT'], questions: ['temporary_chat'] },
    });
    const structured = result.structuredContent as { rows: { question: string; values: Record<string, unknown> }[] };
    expect(structured.rows).toHaveLength(1);
    expect(structured.rows[0].question).toBe('temporary_chat');
    expect(Object.keys(structured.rows[0].values).sort()).toEqual(['chatgpt', 'claude', 'gemini'].sort());
  });

  it('compare_apps rejects fewer than 2 apps', async () => {
    const result = await client.callTool({ name: 'compare_apps', arguments: { apps: ['Claude'] } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/at least 2/);
  });

  it('best_apps_for filters by value and defaults to "yes"', async () => {
    const result = await client.callTool({ name: 'best_apps_for', arguments: { question: 'temporary_chat' } });
    const structured = result.structuredContent as { value: string; apps: { id: string }[] };
    expect(structured.value).toBe('yes');
    expect(structured.apps.length).toBeGreaterThan(0);
  });

  it('search finds cells by free text across app/question/quote', async () => {
    const result = await client.callTool({ name: 'search', arguments: { query: 'GDPR' } });
    const structured = result.structuredContent as { matches: unknown[] };
    expect(structured.matches.length).toBeGreaterThan(0);
  });

  it('every tool response carries the not-legal-advice disclaimer', async () => {
    const result = await client.callTool({ name: 'list_apps', arguments: {} });
    expect(textOf(result)).toContain('Not legal advice');
  });

  it('unknown-value cells are never presented as "no"', async () => {
    // pick any cell whose value is unknown, if one exists in the dataset, and check phrasing
    const result = await client.callTool({ name: 'app_report', arguments: { app: 'ChatGPT' } });
    const structured = result.structuredContent as {
      answers: { question: { id: string }; answer: { value: string } | null }[];
    };
    const unknowns = structured.answers.filter((a) => a.answer?.value === 'unknown');
    for (const u of unknowns) {
      const single = await client.callTool({
        name: 'get_answer',
        arguments: { app: 'ChatGPT', question: u.question.id },
      });
      expect(textOf(single)).toMatch(/do not address/i);
      expect(textOf(single).toLowerCase()).not.toMatch(/\bno\b.*by default/);
    }
  });
});
