import { beforeAll, describe, expect, it } from 'vitest';
import { initData, getData, findApp, findQuestion, getCell } from '../src/connectors/privacymatrix/data.js';

// Force the fallback path so this test suite never depends on network access:
// point the live URLs at something that will fail fast.
beforeAll(async () => {
  await initData();
});

describe('privacymatrix data', () => {
  it('loads apps, questions, and cells', () => {
    const data = getData();
    expect(data.apps.length).toBe(28);
    expect(data.questions.length).toBe(14);
    expect(data.cells.length).toBe(392); // 28 * 14
  });

  it('resolves app by id, name, and vendor', () => {
    const data = getData();
    expect(findApp(data, 'chatgpt')?.id).toBe('chatgpt');
    expect(findApp(data, 'ChatGPT')?.id).toBe('chatgpt');
    expect(findApp(data, 'OpenAI')?.id).toBe('chatgpt');
    expect(findApp(data, 'Meta AI')?.id).toBe('meta-ai');
  });

  it('returns null for an unknown app', () => {
    const data = getData();
    expect(findApp(data, 'TotallyNotARealApp')).toBeNull();
  });

  it('resolves question by exact id', () => {
    const data = getData();
    expect(findQuestion(data, 'no_training_default')?.id).toBe('no_training_default');
  });

  it('resolves question via natural language keywords', () => {
    const data = getData();
    expect(findQuestion(data, 'does it train on my chats')?.id).toBe('no_training_default');
    expect(findQuestion(data, 'can I delete my account')?.id).toBe('user_deletion');
    expect(findQuestion(data, 'incognito mode')?.id).toBe('temporary_chat');
    expect(findQuestion(data, 'does it sell my data')?.id).toBe('no_sale_sharing');
  });

  it('gets a specific cell', () => {
    const data = getData();
    const cell = getCell(data, 'chatgpt', 'no_training_default');
    expect(cell).not.toBeNull();
    expect(['yes', 'partial', 'no', 'unknown']).toContain(cell!.value);
    expect(cell!.evidence_url).toMatch(/^https:\/\//);
  });

  it('includes Meta AI on equal footing with other apps', () => {
    const data = getData();
    const metaAi = findApp(data, 'Meta AI');
    expect(metaAi).not.toBeNull();
    const cell = getCell(data, metaAi!.id, 'no_training_default');
    expect(cell).not.toBeNull();
  });
});
