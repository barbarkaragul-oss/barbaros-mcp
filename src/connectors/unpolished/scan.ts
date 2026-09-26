/**
 * The polish check: which of the measured tells are in a text, where, and which myths are there that need not worry
 * anyone. It runs without any model, so it works for everyone.
 */
import { MARKERS, readable, words } from './vendor/markers.js';
import tells from './vendor/tells.json' with { type: 'json' };

export interface Found { id: string; label: string; count: number; ranges: [number, number][]; human: number; machine: number; machineArm: string }
export interface MythFound { id: string; label: string; count: number; note: string }
export interface Scan { words: number; tells: Found[]; total: number; myths: MythFound[]; level: Level }
export type Level = 'raw' | 'a-little' | 'polished' | 'glossy';

const byId = new Map(MARKERS.map((m) => [m.id, m]));

function locate(text: string, id: string): [number, number][] {
  const m = byId.get(id);
  if (!m?.pattern) return [];
  // the markers read the text with markdown bold removed; positions are only exact when there is none
  const t = readable(text);
  if (t !== text) return [];
  const re = new RegExp(m.pattern.source, m.pattern.flags.includes('g') ? m.pattern.flags : m.pattern.flags + 'g');
  return [...t.matchAll(re)].map((x) => [x.index, x.index + x[0].length] as [number, number]);
}

export function level(total: number, wordCount: number): Level {
  if (total === 0) return 'raw';
  const per100 = (total / Math.max(wordCount, 1)) * 100;
  if (total === 1 && per100 < 2) return 'a-little';
  if (total <= 3 && per100 < 4) return 'polished';
  return 'glossy';
}

export function scan(text: string): Scan {
  const found: Found[] = [];
  for (const t of tells.strong) {
    const m = byId.get(t.id);
    if (!m) continue;
    const count = m.count ? m.count(text) : m.test(text) ? 1 : 0;
    if (count > 0) found.push({ id: t.id, label: t.label, count, ranges: locate(text, t.id), human: t.human, machine: t.machine, machineArm: t.machineArm });
  }
  const myths: MythFound[] = [];
  for (const t of tells.myths) {
    const m = byId.get(t.id);
    if (!m) continue;
    const count = m.count ? m.count(text) : m.test(text) ? 1 : 0;
    if (count > 0) myths.push({ id: t.id, label: t.label, count, note: t.note });
  }
  const total = found.reduce((n, f) => n + f.count, 0);
  const w = words(text).length;
  return { words: w, tells: found, total, myths, level: level(total, w) };
}

/** Tells that are in the corrected text more often than in the writer's: the fix added polish. */
export function added(before: Scan, after: Scan): Found[] {
  return after.tells.filter((a) => a.count > (before.tells.find((b) => b.id === a.id)?.count ?? 0));
}

export const LEVEL_TEXT: Record<Level, { name: string; line: string }> = {
  raw: { name: 'Raw', line: 'Nothing here that readers take as machine-written.' },
  'a-little': { name: 'A little shine', line: 'One thing readers notice. Probably fine.' },
  polished: { name: 'Polished', line: 'A few habits that machine-written text has far more often than people do.' },
  glossy: { name: 'Glossy', line: 'This reads the way a model writes. Worth a second look.' },
};
