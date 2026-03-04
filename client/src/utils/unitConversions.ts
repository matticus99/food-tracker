export type Unit = 'g' | 'serving' | 'oz' | 'lb';

export const OZ_TO_G = 28.3495;
export const LB_TO_G = 453.592;

export function convertToGrams(value: number, unit: Unit, servingGrams: number): number {
  switch (unit) {
    case 'g': return value;
    case 'oz': return value * OZ_TO_G;
    case 'lb': return value * LB_TO_G;
    case 'serving': return value * servingGrams;
  }
}

export function convertFromGrams(grams: number, unit: Unit, servingGrams: number): number {
  switch (unit) {
    case 'g': return grams;
    case 'oz': return grams / OZ_TO_G;
    case 'lb': return grams / LB_TO_G;
    case 'serving': return servingGrams > 0 ? grams / servingGrams : 1;
  }
}

export function convertAmount(value: number, fromUnit: Unit, toUnit: Unit, servingGrams: number): number {
  if (fromUnit === toUnit) return value;
  const grams = convertToGrams(value, fromUnit, servingGrams);
  return convertFromGrams(grams, toUnit, servingGrams);
}

export function toServings(value: number, unit: Unit, servingGrams: number): number {
  return convertAmount(value, unit, 'serving', servingGrams);
}

export function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return String(value);
  return parseFloat(value.toFixed(2)).toString();
}
