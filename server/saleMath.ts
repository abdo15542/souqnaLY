const MAX_DECIMAL_MILLI_UNITS = BigInt("999999999999");
const THOUSAND = BigInt(1000);
const ZERO = BigInt(0);

export function decimalToMilliUnits(value: string | number): bigint {
  const text = String(value).trim();
  const match = /^(\\d+)(?:\\.(\\d{1,3}))?$/.exec(text);
  if (!match) throw new Error("Invalid monetary amount");
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(3, "0"));
  const result = whole * THOUSAND + fraction;
  if (result < ZERO || result > MAX_DECIMAL_MILLI_UNITS) {
    throw new Error("Monetary amount is outside DECIMAL(12,3) range");
  }
  return result;
}

export function milliUnitsToDecimal(value: bigint): string {
  if (value < ZERO || value > MAX_DECIMAL_MILLI_UNITS) {
    throw new Error("Monetary amount is outside DECIMAL(12,3) range");
  }
  return `${value / THOUSAND}.${String(value % THOUSAND).padStart(3, "0")}`;
}

export function calculateSaleTotal(items: Array<{ price: string | number; quantity: number }>): string {
  const total = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Quantity must be a positive integer");
    }
    return sum + decimalToMilliUnits(item.price) * BigInt(item.quantity);
  }, ZERO);
  return milliUnitsToDecimal(total);
}
