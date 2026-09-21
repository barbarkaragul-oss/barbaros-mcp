export interface App {
  id: string;
  name: string;
  vendor: string;
  homepage: string;
  repo: string | null;
  sources: string[];
}

export interface Question {
  id: string;
  group: string;
  name: string;
  question: string;
  rubric: string;
}

export type CellValue = 'yes' | 'partial' | 'no' | 'unknown';

export interface Cell {
  app: string;
  question: string;
  value: CellValue;
  quote: string | null;
  evidence_url: string | null;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  verified: boolean;
  verified_at: string | null;
}

export interface QuestionsFile {
  values: Record<CellValue, string>;
  conventions?: unknown;
  groups: { id: string; name: string }[];
  questions: Question[];
}

export interface AppsFile {
  apps: App[];
}

export interface MatrixFile {
  version: number;
  generated_at: string;
  cells: Cell[];
}

export interface PrivacyMatrixData {
  apps: App[];
  questions: Question[];
  cells: Cell[];
  values: Record<CellValue, string>;
  groups: { id: string; name: string }[];
  generated_at: string;
  source: 'live' | 'fallback';
  loaded_at: string;
}
