export function maskName(fullName?: string | null): string {
  if (!fullName) {
    return '';
  }

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    const [single] = parts;
    if (single.length <= 2) {
      return `${single[0] ?? ''}*`.trim();
    }
    return `${single[0]}${'*'.repeat(single.length - 1)}`;
  }

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? '';

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}
