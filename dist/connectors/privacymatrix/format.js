export const DISCLAIMER = 'Not legal advice. This summarizes what each vendor publishes, as of the verification date shown, ' +
    'for the consumer plan with default settings. Read the source before relying on it.';
const VALUE_LABEL = {
    yes: 'Yes',
    partial: 'Partial',
    no: 'No',
    unknown: 'Unknown',
};
export function formatCell(cell, question) {
    const lines = [];
    lines.push(`**${VALUE_LABEL[cell.value]}**${question ? ` — ${question.name}` : ''}`);
    if (cell.value === 'unknown') {
        lines.push('The vendor\'s documents do not address this question. Silence is not read as "no".');
    }
    else if (cell.quote) {
        lines.push(`> "${cell.quote}"`);
    }
    if (cell.notes)
        lines.push(cell.notes);
    if (cell.evidence_url)
        lines.push(`Source: ${cell.evidence_url}`);
    if (cell.verified_at)
        lines.push(`Verified: ${cell.verified_at}`);
    return lines.join('\n');
}
export function cellSummary(cell) {
    return {
        value: cell.value,
        quote: cell.quote,
        evidence_url: cell.evidence_url,
        notes: cell.notes,
        confidence: cell.confidence,
        verified_at: cell.verified_at,
    };
}
export function withMeta(data, payload) {
    return {
        ...payload,
        data_generated_at: data.generated_at,
        data_source: data.source,
        disclaimer: DISCLAIMER,
    };
}
export function textResult(text) {
    return { content: [{ type: 'text', text }] };
}
