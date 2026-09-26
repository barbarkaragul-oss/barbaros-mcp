import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerUnpolishedTools, NOTE, MAX_TEXT_CHARS } from '../src/connectors/unpolished/tools.js';
import tells from '../src/connectors/unpolished/vendor/tells.json' with { type: 'json' };

let client: Client;
let server: McpServer;

beforeAll(async () => {
  server = new McpServer({ name: 'unpolished-test', version: '0.0.0' });
  registerUnpolishedTools(server);
  client = new Client({ name: 'test-client', version: '0.0.0' });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(s), client.connect(c)]);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

function textOf(r: Awaited<ReturnType<Client['callTool']>>): string {
  const first = (r.content as Array<{ type: string; text?: string }>)[0];
  if (!first || first.type !== 'text' || typeof first.text !== 'string') throw new Error('expected text content');
  return first.text;
}

type Check = {
  level: string;
  words: number;
  total: number;
  habits: { id: string; count: number; people_pct: number; model_pct: number; model: string; excerpts: string[] }[];
  myths: { id: string; count: number }[];
  note: string;
};

const check = async (text: string) => {
  const r = await client.callTool({ name: 'polish_check', arguments: { text } });
  return { r, s: r.structuredContent as Check };
};

describe('unpolished MCP tools', () => {
  it('offers exactly two read-only tools, and neither rewrites text', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['list_tells', 'polish_check']);
  });

  it('finds measured habits, with the rate for people next to the rate for models', async () => {
    const { r, s } = await check('In this essay we delve into the topic. It is important to note that tone matters.');
    const delve = s.habits.find((h) => h.id === 'delve');
    expect(delve).toBeDefined();
    expect(delve!.people_pct).toBe(0.2);
    expect(delve!.model_pct).toBe(19.4);
    expect(delve!.model).toBe('GPT-4');
    expect(delve!.excerpts[0]).toMatch(/delve/);
    expect(s.habits.some((h) => h.id === 'important_to_note')).toBe(true);
    expect(s.level).not.toBe('raw');
    expect(textOf(r)).toMatch(/up to 0\.2% of people's texts/);
  });

  it('plain writing comes back raw with nothing found', async () => {
    const { s } = await check("I went to the shop and they'd run out of bread, so I got rolls instead.");
    expect(s.level).toBe('raw');
    expect(s.habits).toHaveLength(0);
    expect(s.total).toBe(0);
  });

  it('a myth is reported but does not count toward the level', async () => {
    const { s } = await check('Moreover, the bus was late again today.');
    expect(s.myths.some((m) => m.id === 'moreover')).toBe(true);
    expect(s.total).toBe(0);
    expect(s.level).toBe('raw');
  });

  it(`rejects text longer than ${MAX_TEXT_CHARS} characters instead of crashing`, async () => {
    const r = await client.callTool({ name: 'polish_check', arguments: { text: 'a'.repeat(MAX_TEXT_CHARS + 1) } });
    expect(r.isError).toBe(true);
  });

  it('every answer says a match is not evidence that anyone used AI', async () => {
    const answers = [
      (await check('We delve into it.')).r,
      (await check('Plain words.')).r,
      await client.callTool({ name: 'list_tells', arguments: {} }),
      await client.callTool({ name: 'list_tells', arguments: { query: 'nothing-like-this' } }),
    ];
    for (const a of answers) expect(textOf(a)).toContain('not evidence that anyone used AI');
  });

  it('list_tells gives the measured habits and myths, and filters by word', async () => {
    const all = (await client.callTool({ name: 'list_tells', arguments: {} })).structuredContent as {
      habits: unknown[];
      myths: unknown[];
    };
    expect(all.habits).toHaveLength(tells.strong.length);
    expect(all.myths).toHaveLength(tells.myths.length);

    const delve = (await client.callTool({ name: 'list_tells', arguments: { query: 'delve' } })).structuredContent as {
      habits: { id: string }[];
    };
    expect(delve.habits.map((h) => h.id)).toEqual(['delve']);

    const dash = (await client.callTool({ name: 'list_tells', arguments: { query: 'dash' } })).structuredContent as {
      myths: { id: string }[];
    };
    expect(dash.myths.some((m) => m.id === 'em_dash')).toBe(true);
  });

  it('the vendored data says where it came from', () => {
    expect(tells.source).toMatch(/^is-it-really-an-ai-tell@[0-9a-f]{7}$/);
    expect(readFileSync('src/connectors/unpolished/vendor/UPSTREAM', 'utf8')).toMatch(/^unpolished@[0-9a-f]{7}/);
  });
});

// Same gate as the Unpolished extension: nothing a user or reviewer reads may frame this as a way to get
// text past AI checks. That is not what it is, and Muse's policies forbid passing AI output off as human.
describe('framing gate', () => {
  const forbidden = /\b(detector|bypass|evade|undetectable|humani[sz]e)/i;

  it('tool descriptions, the note and the server instructions', async () => {
    const { tools } = await client.listTools();
    for (const t of tools) {
      expect(t.description ?? '', t.name).not.toMatch(forbidden);
      expect(t.title ?? '', t.name).not.toMatch(forbidden);
    }
    expect(NOTE).not.toMatch(forbidden);
    const server = readFileSync('src/server.ts', 'utf8');
    const instr = server.slice(server.indexOf("name: 'unpolished'"), server.indexOf('register: registerUnpolishedTools'));
    expect(instr.length).toBeGreaterThan(50);
    expect(instr).not.toMatch(forbidden);
  });

  it('every served page and every file in the submission pack', () => {
    const files = readdirSync('src/connectors/unpolished/static').map((f) => path.join('src/connectors/unpolished/static', f));
    const pack = 'connectors/muse/unpolished';
    if (existsSync(pack)) for (const f of readdirSync(pack)) files.push(path.join(pack, f));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(forbidden);
  });
});
