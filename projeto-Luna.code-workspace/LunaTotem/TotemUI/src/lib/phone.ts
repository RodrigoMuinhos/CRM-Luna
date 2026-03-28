const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const maskPhone = (value: string | undefined | null) => {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const stripPhone = (value: string | undefined | null) => onlyDigits(value ?? '');
