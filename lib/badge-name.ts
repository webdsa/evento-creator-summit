const LOWER_PARTICLES = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'del',
  'la',
  'las',
  'los',
  'le',
  'van',
  'von',
  'y',
  'e',
  'di',
]);

const MAX_BADGE_CHARS = 28;

function lettersOnly(word: string): string {
  return word.replace(/[^\p{L}]/gu, '');
}

function normalizeWord(word: string): string {
  if (!word) return word;
  const letters = lettersOnly(word);
  if (!letters) return word;
  const allUpper = letters === letters.toUpperCase();
  const allLower = letters === letters.toLowerCase();
  let outWord = word;
  if (allUpper) {
    let seenAlpha = false;
    outWord = word.replace(/\p{L}/gu, (c) => {
      const next = seenAlpha ? c.toLowerCase() : c.toUpperCase();
      seenAlpha = true;
      return next;
    });
  } else if (allLower && letters.length > 1) {
    const first = word.search(/\p{L}/u);
    if (first >= 0) {
      outWord = word.slice(0, first) + word[first].toUpperCase() + word.slice(first + 1).toLowerCase();
    }
  }
  const core = lettersOnly(outWord).toLowerCase();
  if (LOWER_PARTICLES.has(core)) return outWord.toLowerCase();
  return outWord;
}

/** Encurta o nome do influencer para caber no crachá impresso. */
export function formatBadgeName(raw: string): string {
  const parts = raw.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  let chosen = parts;
  if (parts.length === 2) chosen = [parts[0], parts[parts.length - 1]];
  else if (parts.length > 2) chosen = [parts[0], parts[1], parts[parts.length - 1]];
  let result = chosen.map(normalizeWord).join(' ');
  if (result.length > MAX_BADGE_CHARS && chosen.length > 2) {
    result = [chosen[0], chosen[chosen.length - 1]].map(normalizeWord).join(' ');
  }
  return result;
}
