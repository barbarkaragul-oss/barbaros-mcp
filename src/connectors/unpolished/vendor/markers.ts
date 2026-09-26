// Copied from is-it-really-an-ai-tell/src/markers.ts at 146cecc by scripts/sync-markers.ts. Do not edit here.
/**
 * The catalogue: every marker people read as a sign that a machine wrote the text.
 *
 * A marker is a function from a text to true or false. Nothing here asserts that a marker means
 * anything -- the rates in data/markers.json say what each one is worth, and several of them turn
 * out to be worth nothing, or to point the other way.
 *
 * `belief` marks the ones people are documented to rely on when they judge by hand (Jakesch et al.,
 * PNAS 2023): contractions, first-person, personal detail. Those are in the catalogue precisely so
 * their measured value can be published next to the rest.
 */

export type Family = 'word' | 'phrase' | 'shape' | 'surface';

export interface Marker {
  id: string;
  /** what a reader would call it */
  label: string;
  family: Family;
  /** where the claim comes from, so a reader can argue with the source rather than with me */
  source: string;
  /** true when this is something people believe distinguishes, rather than something measured */
  belief?: boolean;
  test: (text: string) => boolean;
  /**
   * Whether the marker can say anything about this text at all. "Every sentence the same length"
   * needs five sentences to mean something; a shorter text is left out of that marker's shares, not
   * counted as a text where the marker is false. Absent means every text can be judged.
   */
  eligible?: (text: string) => boolean;
  /**
   * How many times the marker occurs, for the markers where that means something. A word can be
   * counted and turned into a rate per thousand words, compared between texts of the same length;
   * "every sentence the same length" cannot, and those markers leave this undefined.
   */
  count?: (text: string) => number;
  /**
   * The expression behind test and count, for the markers that are one; used to show what matched.
   * Run it on readable(text), as test and count do.
   */
  pattern?: RegExp;
  /** the match carries the writer's own words ("not only X but also"), so it is text, not a form */
  openEnded?: boolean;
}

/**
 * A curly apostrophe is part of a word as a straight one is: 40% of the people's Reddit posts type
 * "don’t" and almost none of the models' posts do, and splitting it in two would lengthen the
 * people's posts only.
 */
export const words = (t: string): string[] => t.toLowerCase().match(/[a-z'’]+/g) ?? [];

/**
 * The text as a reader sees it. The HTML arms keep bold as "**" so the bulleted-list marker can see
 * it, and to every other pattern those asterisks are characters standing between words: "**term** -
 * its meaning" lost its dash and "**a**, **b** and **c**" its list. Every marker but that one reads
 * this, and so must anything that shows where a pattern matched.
 */
export const readable = (t: string): string => (t.includes('**') ? t.replace(/\*\*/g, '') : t);
const reads = (f: (t: string) => boolean) => (t: string): boolean => f(readable(t));

/**
 * A full stop that ends an abbreviation rather than a sentence: "e.g.", "i.e.", "et al.", "vs.",
 * "cf.", "Fig.", "Eq.", "w.r.t.", "i.i.d.", "(resp.", or a single capital initial ("B. Y. Chen",
 * "E. coli"). The human abstracts are full of them and the machine ones are not, so cutting there made
 * human sentences look shorter and more varied than they were. A decimal ("0.974") is never cut: a
 * cut needs a space after the stop. "No." is an abbreviation only before a number ("No. 3").
 */
const ABBREVIATION = /\b(?:[Ee]\.g|[Ii]\.e|[Vv]s|[Cc]f|Figs?|Eqs?|[Ww]\.r\.t|i\.i\.d|a\.k\.a|resp)\.$/;
const NUMBER_SIGN = /\bNo\.$/;
/**
 * A single capital and "et al." also end sentences ("over the ring Z. We prove", "at 98 K. The
 * transition", "the technique of Isola et al. We consider"), so they are read as part of a name only
 * when no number stands before the capital and no ordinary sentence opening follows; a name after an
 * initial, a year after "et al." or a lower-case word ("E. coli") is not one of these openings.
 */
const NAME_PART = /(?:\bet al|(?<![\w.]|\d\s)[A-Z])\.$/;
const OPENING = /^(?:A\s+[a-z]|(?:We|The|In|An|It|Its|If|However|And|But|Or|So|There|This|That|These|Those|Our|Their|For|As|On|At|By|To|With|Here|Then|Thus|Hence|Therefore|Moreover|Finally|Additionally|Furthermore|Also|Below|Above|Again|Such|Both|Each|All|Some|No|One|Using|Given|Since|When|While|Although|Let|You|Your|They|He|She|People)\b)/;
/**
 * The texts keep their line breaks, so a blank line or a new list item ends a sentence whether or
 * not it closed with a stop; a list without full stops would otherwise be one long sentence. A single
 * line break alone does not: the collectors join a source's wrapped lines, and what is left is a
 * <br> inside a paragraph. A heading is not a sentence and is left out.
 */
const LIST_ITEM = /^[^\S\n]*(?:[-*•+]|\d{1,2}[.)])[^\S\n]/;
const HEADING_LINE = /^[^\S\n]*#{1,6}[^\S\n].*$/gm;

export function sentences(text: string): string[] {
  const t = text.replace(HEADING_LINE, '');
  const out: string[] = [];
  let start = 0;
  for (const cut of t.matchAll(/(?<=[.!?])\s+|\n\s*\n\s*|\n(?=[^\S\n]*(?:[-*•+]|\d{1,2}[.)])[^\S\n])/g)) {
    // a few characters on either side are enough to decide, and keep this linear in the text
    const next = cut.index + cut[0].length;
    const line = cut.index + cut[0].lastIndexOf('\n') + 1;
    const paragraphOrItem = line > cut.index && (/\n\s*\n/.test(cut[0]) || LIST_ITEM.test(t.slice(line, line + 40)));
    if (!paragraphOrItem) {
      const before = t.slice(Math.max(start, cut.index - 12), cut.index);
      // the "1." of a numbered item, standing where a sentence starts, begins that sentence
      if (cut.index - start <= 6 && /^\s*\d{1,2}\.$/.test(before)) continue;
      if (ABBREVIATION.test(before)) continue;
      if (NUMBER_SIGN.test(before) && /\d/.test(t[next] ?? '')) continue;
      if (NAME_PART.test(before) && !OPENING.test(t.slice(next, next + 20))) continue;
    }
    out.push(t.slice(start, cut.index));
    start = next;
  }
  out.push(t.slice(start));
  return out.filter((s) => s.trim().length > 1);
}

/** coefficient of variation of sentence length; low means every sentence is the same size */
export function sentenceLengthCv(t: string): number | null {
  const ls = sentences(t).map((s) => words(s).length).filter((n) => n > 0);
  if (ls.length < 5) return null;
  const mean = ls.reduce((a, b) => a + b, 0) / ls.length;
  if (mean === 0) return null;
  const sd = Math.sqrt(ls.reduce((a, b) => a + (b - mean) ** 2, 0) / ls.length);
  return sd / mean;
}

const has = (re: RegExp) => (t: string): boolean => re.test(t);

/**
 * A dash, however it was typed: "—"; a spaced en dash or hyphen between two words ("spontaneous
 * emission - a fundamental quantum process"), which is how most people type one; and the TeX forms,
 * "---" and a spaced "--". RAID's human abstracts come from TeX and are plain ASCII, so counting only
 * "—" made them look dashless.
 * Not a dash: an unspaced "--", which TeX uses to join names and ranges ("Calabi--Yau", "10--20");
 * a spaced hyphen without a word on both sides ("a - b", "$G - w$", "2n - k"), where a word means two
 * letters, or a closing bracket or quote after one; and "---" inside a longer run or a table cell
 * ("|-----+-----|", "|---|", "|:---|"), which one table would otherwise turn into dozens of dashes.
 * The texts keep their line breaks, so a hyphen or "--" that starts a line is a list item, not a
 * dash, however the line before it ends, and a "---" alone on its line is a rule between paragraphs.
 * DASH is for test and must stay non-global, or it remembers where it stopped; DASHES counts.
 */
const DASH = /—|(?<![-|+:])(?!(?<=^[^\S\n]*)---[^\S\n]*$)---(?![-|+:])|(?<=[^\S\n])--(?=\s)|(?<=(?:[A-Za-z'’][A-Za-z]|[.\w][)"'”’])[^\S\n])[-–](?=\s[A-Za-z"“(])/m;
const DASHES = new RegExp(DASH.source, DASH.flags + 'g');

/**
 * A three-item list: "a, b and c" or "a, b, or c". A middle item of several words is taken only
 * before a serial comma ("medical imaging, remote sensing, and computer vision"): without that comma
 * the same shape is mostly a clause with two items in it. That favours writers who use the serial
 * comma, which the models nearly always do and the human abstracts mostly do not.
 * Not a list: a sentence adverb or "for example" in front of two items ("However, forward and
 * backward"); a year or a date ("In 1989, Godreche and Luck", "March 7, 2015, and has"), while other
 * numbers are list items ("98, 95, and 80"); a middle item that is a clause ("namely VoxResNet");
 * and "or" in a fixed phrase ("with or without", "whether or not", "one or more").
 */
const LIST_FIRST = String.raw`(?<!\b(?:January|February|March|April|May|June|July|August|September|October|November|December) )\b(?!(?:However|Moreover|Furthermore|Recently|Thus|Therefore|Hence|Additionally|Also|Finally|Still|Here|Now|Then|Overall|Yes|So|Well|Hopefully|Interestingly|Indeed|Instead|Similarly|Specifically|Currently|example|instance|particular|addition|course)\b)(?!(?:1[5-9]|20)\d\d\b)\w+`;
const LIST_MIDDLE = String.raw`(?![^,.;\n]*\b(?:we|I|it|they|you|he|she|there|is|are|was|were|has|have|had|will|would|can|could|may|might|should|but|namely|via|say)\b)\w+(?: \w+){1,3}`;
const LIST_AND = String.raw`(?:and|(?<!\b(?:with|whether|one|sooner|more|less) )or(?! (?:not|more|less|so|after|before)\b))`;
const RULE_OF_THREE = new RegExp(String.raw`${LIST_FIRST}, \w+,? ${LIST_AND} \w+\b|${LIST_FIRST}, ${LIST_MIDDLE}, ${LIST_AND} \w+\b`);

/**
 * A contraction, not just an apostrophe. "'s" is a contraction only after a pronoun or "let"
 * ("it's", "that's", "let's"); after a noun it is a possessive ("the model's"), which careful
 * writing is full of. Straight and curly apostrophes both count. The Dutch name particle in
 * "van't Hoff" is not a contraction, and one RAID document carries it into every writer's version.
 */
const CONTRACTION = /\b(?!van['’]t\b)\w+['’](?:t|re|ve|ll|m)\b|\b(?:i|you|he|she|we|they|it|that)['’]d\b|\b(?:it|that|there|here|what|who|where|how|he|she|let)['’]s\b/i;
/**
 * The same contractions typed without the apostrophe, which people do in a post ("dont", "thats",
 * "im not") and the models never do; counting only the apostrophe form undercounted the person
 * alone. Only the forms that can be nothing else count: "wont", "ill", "were", "well", "id", "hes",
 * "its" and "lets" are words of their own, and "cant" is one only in texts nobody here writes. "im"
 * and "ive" count before a lower-case word. Capitalised, "Im" is also the imaginary part ("the Im
 * part") and "Ive" a name, so "Im" and "Ive" count only before a word that follows "I'm" or "I've" in
 * a sentence ("Im not", "Ive been"); "IVE" is an acronym. A letter of any alphabet bounds a word
 * ("iletişim" holds no "im"), and a TeX accent in front of one ("na\"ive") is not a word boundary.
 */
const BARE_CONTRACTION = /(?<![\p{L}\p{N}_\\"'’])(?:(?:do|does|did|is|are|was|were|has|have|had|could|would|should|must|need)nt|cant|youre|theyre|thats|whats|theres|(?:you|they|we)ve|(?:would|could|should|must)ve)(?![\p{L}\p{N}_'’])/iu;
const AFTER_I = 'not|so|a|an|the|no|just|going|gonna|trying|still|also|really|very|sure|glad|sorry|here|in|at|on|pretty|kind|looking|getting|thinking|feeling|now|always|never|currently|about|afraid|happy|tired|done|from|with|using|working|having|doing|starting|planning|curious|wondering|asking|only|actually|literally|honestly|probably|definitely|finally|okay|ok|fine|good|been|had|got|gotten|seen|tried|heard|noticed|found|read|made|started|lost|gone|spent|known|played|used|ever|already|recently|come|bought|watched|learned|decided|thought|felt|wanted|asked|looked|lived';
const BARE_I = new RegExp(String.raw`(?<![\p{L}\p{N}_\\"'’])(?:(?:im|ive)(?= [a-z])|(?:Im|Ive)(?= (?:${AFTER_I})(?![\p{L}\p{N}_])))`, 'u');
const hasContraction = (t: string): boolean => CONTRACTION.test(t) || BARE_CONTRACTION.test(t) || BARE_I.test(t);

/**
 * The pronoun "I". It is a capital letter: a case-insensitive match also takes the "(i)" of an
 * enumeration and the "i" of "i.e.". Most capital I's in the abstracts are not a person either, so
 * "I" counts only as "I'm", "I've", "I'd" or "I'll", before a lower-case word, or closing a clause
 * after a verb ("so was I.").
 * Not a person: a Roman numeral after a label ("Type I", "Phase I", "category I") or before "and II";
 * an "I" glued to what comes before it ("CMPC-I", "$I$", "\cite{I}", "J/I"); an initial
 * ("I. Prigozhin"); a variable ("an ideal I in R", "I is"). A dash typed as "--" before "I" is still
 * a dash, and an aside in brackets ("(I think", "(I'm") is still the writer.
 * "my", "me" and "myself" are words in any ordinary casing, bounded by letters of any alphabet, so
 * "Troisième" holds no "me". An all-caps "ME" is Middle English or Intel ME, not the writer.
 * A lower-case "i" is the writer typing fast only in a contraction or before a verb people use of
 * themselves ("i think", "i don't"); an index "i" or an enumeration "(i)" does neither.
 */
const FIRST_PERSON = /(?<![$\\{\/&\w]|[^-]-|^-)(?<!\b(?:Type|Types|Phase|Part|Stage|Class|Grade|Level|Section|Chapter|Table|Figure|Fig\.|Appendix|Case|Model|Step|Method|Lemma|Theorem|World War|Schedule|Paper|Category|category)\s)\bI(?:['’](?:m|ve|d|ll)|(?=\s+(?!(?:is|has|in|errors?|(?:and|or)\s+II)\b)[a-z])|(?<=\b(?:am|was|were|did|do|have|had|than|and|can|could|would|should|will)\sI)(?=\s*[.!?,;:]))|(?<!\p{L})(?:[Mm]y|[Mm]e|[Mm]yself|MY)(?!\p{L})|(?<![(\[.$\\\/\w-])\bi(?:['’](?:m|ve|d|ll)\b|\s+(?:(?:think|am|was|have|had|do|did|can|cannot|could|would|will|know|guess|mean|feel|agree|believe)(?:n['’]?t)?|won['’]?t)\b)/u;

/**
 * The writer's own words. The belief markers ask about the writer, and a span in double quotes is
 * somebody else's: the "I" of a quoted email, the contraction in a line of dialogue, the "my wife" in
 * a quoted news story. A span is at most 300 characters, so a stray quote mark cannot pair with one
 * paragraphs away and swallow the text between. A TeX accent is not a quote mark: between two
 * "Nystr\"om" there is the writer's own sentence.
 */
const ownWords = (t: string): string => t.replace(/(?<!\\)"[^"]{0,300}(?<!\\)"|“[^”]{0,300}”/g, ' ');

/** a word or phrase: it can be tested for and it can be counted, both on the readable text */
const counts = (re: RegExp): Pick<Marker, 'test' | 'count' | 'pattern'> => {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return { test: reads((t) => re.test(t)), count: (t) => (readable(t).match(global) ?? []).length, pattern: global };
};

export const MARKERS: Marker[] = [
  // ---- single words said to be the giveaways
  { id: 'delve', label: '“delve”', family: 'word', source: 'Kobak et al. 2025; the most-cited single tell', ...counts(/\bdelv(e|es|ing|ed)\b/i) },
  { id: 'tapestry', label: '“tapestry”', family: 'word', source: 'widely repeated word lists', ...counts(/\btapestr(y|ies)\b/i) },
  { id: 'moreover', label: '“moreover”', family: 'word', source: 'widely repeated word lists', ...counts(/\bmoreover\b/i) },
  { id: 'furthermore', label: '“furthermore”', family: 'word', source: 'widely repeated word lists', ...counts(/\bfurthermore\b/i) },
  { id: 'crucial', label: '“crucial”', family: 'word', source: 'Kobak et al. 2025 excess vocabulary', ...counts(/\bcrucial(ly)?\b/i) },
  { id: 'realm', label: '“realm”', family: 'word', source: 'widely repeated word lists', ...counts(/\brealms?\b/i) },
  { id: 'showcase', label: '“showcase”', family: 'word', source: 'Kobak et al. 2025 excess vocabulary', ...counts(/\bshowcas(e|es|ing|ed)\b/i) },
  { id: 'underscore', label: '“underscores”', family: 'word', source: 'Kobak et al. 2025 excess vocabulary', ...counts(/\bunderscor(e|es|ing|ed)\b/i) },
  // The bare noun ("as much leverage", "100x leverage", "they have leverage", "its leverage", "high
  // leverage points") and the financial adjective ("leveraged trades") are excluded; "leverages",
  // "leveraging" and "leveraged" are the verb whatever stands in front of them ("the potential of
  // leveraging data"). In the matched RAID arms every use is the verb, which data/evidence.json shows.
  { id: 'leverage', label: '“leverage” as a verb', family: 'word', source: 'widely repeated word lists', ...counts(/\b(?:(?<!\b(?:have|has|had|gain|gains|gained|its|their|his|her|our|your|my|high|low|statistical|financial|political|operating|much|real|no|of|the|a|some|any|more|less|enough|\d+x)\s)leverage|leverag(?:es|ing|ed))\b(?!\s+(?:trades?|buyouts?|loans?|positions?|etfs?|ratios?)\b)/i) },

  // ---- phrases
  // The formula keeps its meaning with an adverb or a modal in it ("it's also important to note",
  // "it may be worth noting"), which is how GPT-3.5 answering questions mostly writes it; the list of
  // adverbs is closed, so "it is hardly worth noting" stays out.
  { id: 'important_to_note', label: '“it is (also) important to note” / “worth noting”', family: 'phrase', source: 'hedging formula', ...counts(/\bit(?:['’]?s| is|(?: may| might| would| could) be)(?: (?:also|still|always|very|especially|particularly|equally|generally|however|therefore|thus|perhaps|probably|definitely|certainly),?)* (?:important|worth) (?:to )?not(?:e|ing)\b/i) },
  // the apostrophe either way, or none: people type all three, and the models almost only the straight
  // one. "it's important" and "let's explore" below take the same three.
  { id: 'in_todays', label: '“in today’s …”', family: 'phrase', source: 'opener cliche', ...counts(/\bin today['’]?s\b/i) },
  // The words in between may hold an "e.g.", an "et al." or a decimal, which the human abstracts are
  // full of, and "but" may take its own subject ("but it also", "but one also"). "etc." and "no." are
  // not among the abbreviations: they often end a sentence, and the gap must not run on into the next.
  { id: 'not_only_but_also', openEnded: true, label: '“not only … but also”', family: 'phrase', source: 'balanced construction', ...counts(/\bnot only\b(?:[^.!?]|\b(?:e\.g|i\.e|et al|vs|cf)\.|\.(?=\d)){0,160}?\bbut(?: \w+){0,3}? also\b/i) },
  // "this" and "that" say it as well as "it", and edited writing separates the halves with a
  // semicolon, a colon or a dash typed any way. "that is," after a comma is "i.e.", not the second half.
  // The apostrophe may be left out ("its not X, its Y"), as people do in a post. After a negated first
  // half and a clause break, "its" is the contraction; no abstract has the possessive in that place.
  { id: 'not_x_its_y', openEnded: true, label: '“it’s / this isn’t X, it’s Y”', family: 'phrase', source: 'the antithesis formula', ...counts(/\b(?:it|this|that)(?:['’]?s not| is not| isn['’]?t) (?:just |only |merely |simply )?[^.!?,;:]{2,40}?(?:[,;:]|\s?[—–]|\s-{1,3}|-{1,3}\s|---)\s*(?:it|this|that)(?:['’]?s| is)\b(?!(?<=\bthat is),)/i) },
  { id: 'dive_into', label: '“dive into” / “let’s explore”', family: 'phrase', source: 'assistant register', ...counts(/\b(dive into|let(['’]?s| us) (explore|take a look|dive))\b/i) },
  // "to sum up" is also arithmetic ("without having to sum up over all the configurations"), and "to
  // summarize" an ordinary verb, so those count only as a wrap-up, followed by a comma or a colon.
  // A "Conclusion:" heading is the format of a structured abstract, not the phrase.
  { id: 'in_conclusion', label: '“in conclusion” / “in summary” / “to sum (it) up”', family: 'phrase', source: 'essay scaffolding', ...counts(/\b(?:(?:in conclusion|in summary)\b|(?:in sum|to sum (?:it |this |things |everything )?up|to summari[sz]e|to conclude)\b(?=\s*[,:]))/i) },

  // ---- shape of the prose
  { id: 'uniform_sentences', label: 'every sentence the same length', family: 'shape', source: 'low variation in sentence length', eligible: reads((t) => sentenceLengthCv(t) !== null), test: reads((t) => { const cv = sentenceLengthCv(t); return cv !== null && cv < 0.40; }) },
  { id: 'em_dash', label: 'a dash, however it is typed', family: 'shape', source: 'the most-claimed punctuation tell', ...counts(DASH) },
  { id: 'em_dash_heavy', label: 'two or more dashes', family: 'shape', source: 'the same claim, stronger form', test: reads((t) => (t.match(DASHES) ?? []).length >= 2) },
  { id: 'rule_of_three', openEnded: true, label: 'a three-item list (“and” or “or”; a longer middle item only before a serial comma)', family: 'shape', source: 'the tricolon habit', ...counts(RULE_OF_THREE) },
  // the one marker that reads the "**" itself
  { id: 'bulleted_bold', label: 'a bulleted list with bold lead-ins', family: 'shape', source: 'answer formatting', test: has(/^\s*[-*•]\s+\*\*/m) },

  // ---- surface habits, including the ones people actually judge by
  { id: 'no_contraction', label: 'no contractions at all', family: 'surface', source: 'Jakesch et al. 2023: readers treat contractions as human', belief: true, test: reads((t) => !hasContraction(ownWords(t))) },
  { id: 'no_first_person', label: 'no first person', family: 'surface', source: 'Jakesch et al. 2023: readers treat “I” as human', belief: true, test: reads((t) => !FIRST_PERSON.test(ownWords(t))) },
  // A year is not personal detail: "in 1997" in an abstract is a citation or a date in history, it was
  // the only clause that ever fired in RAID and HC3, and it missed the same date typed "in the 1970s".
  { id: 'no_personal_detail', label: 'no personal detail', family: 'surface', source: 'Jakesch et al. 2023: readers treat specifics as human', belief: true, test: reads((t) => !/\b(my (wife|husband|kid|son|daughter|dad|mum|mom|friend|boss|team)|last (year|week|night|summer)|when i was)\b/i.test(ownWords(t))) },
  { id: 'no_typo_markers', label: 'no informal spelling at all', family: 'surface', source: 'readers treat sloppiness as human', belief: true, test: reads((t) => !/\b(gonna|wanna|kinda|sorta|dunno|yeah|nope|lol|imo|iirc|afaik|tbh)\b/i.test(t)) },
  // A heading is one line: with the line breaks kept, "\s" would carry a one-word heading on into the
  // capitalised start of the paragraph under it, and a heading that ends the text has nothing after it.
  { id: 'title_case_headings', label: 'Title Case headings', family: 'surface', source: 'answer formatting', test: reads(has(/^#{1,6}[ \t]+(?:[A-Z][a-z]+(?:[ \t]+|$)){2,}/m)) },
];

export const byId = new Map(MARKERS.map((m) => [m.id, m]));
