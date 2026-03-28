const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const maskCPF = (value: string | undefined | null) => {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const stripCPF = (value: string | undefined | null) => onlyDigits(value ?? '');

export const maskCPFWithHiddenCenter = (value: string | undefined | null) => {
  const digits = onlyDigits(value ?? '').slice(0, 11);
  if (!digits) return '';

  const chars = digits.split('');
  for (let i = 3; i < Math.min(chars.length, 9); i += 1) {
    chars[i] = 'X'; // X fica perfeitamente alinhado com números
  }
  const masked = chars.join('');

  if (masked.length <= 3) {
    return masked;
  }
  if (masked.length <= 6) {
    return `${masked.slice(0, 3)}.${masked.slice(3)}`;
  }
  if (masked.length <= 9) {
    return `${masked.slice(0, 3)}.${masked.slice(3, 6)}.${masked.slice(6)}`;
  }
  return `${masked.slice(0, 3)}.${masked.slice(3, 6)}.${masked.slice(6, 9)}-${masked.slice(9, 11)}`;
};

export const validateCPF = (value: string | undefined | null) => {
  const digits = stripCPF(value);
  if (digits.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calcDigit = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i += 1) {
      total += Number(digits[i]) * (factor - i);
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheck = calcDigit(10);
  const secondCheck = calcDigit(11);
  return firstCheck === Number(digits[9]) && secondCheck === Number(digits[10]);
};
