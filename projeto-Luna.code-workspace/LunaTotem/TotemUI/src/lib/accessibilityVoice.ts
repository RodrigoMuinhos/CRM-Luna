const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const FEMALE_HINTS = [
  'female',
  'feminina',
  'mulher',
  'maria',
  'francisca',
  'helena',
  'luciana',
  'camila',
  'sofia',
  'sabrina',
  'leticia',
  'victoria',
  'brenda',
];

const BRAZIL_HINTS = [
  'pt-br',
  'pt_br',
  'portuguese (brazil)',
  'portuguese brazil',
  'brasil',
  'brazil',
];

export const pickPreferredPortugueseFemaleVoice = (
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null => {
  if (!Array.isArray(voices) || voices.length === 0) {
    return null;
  }

  const ranked = [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left));
  return ranked[0] ?? null;
};

const scoreVoice = (voice: SpeechSynthesisVoice) => {
  const name = normalize(voice.name || '');
  const lang = normalize(voice.lang || '');
  let score = 0;

  if (lang.includes('pt-br')) score += 100;
  else if (lang.startsWith('pt')) score += 70;

  if (voice.default) score += 8;

  if (BRAZIL_HINTS.some((hint) => name.includes(hint) || lang.includes(hint))) {
    score += 25;
  }

  if (FEMALE_HINTS.some((hint) => name.includes(hint))) {
    score += 20;
  }

  if (name.includes('natural')) score += 5;
  if (name.includes('online')) score += 3;

  return score;
};
