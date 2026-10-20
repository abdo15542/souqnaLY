const MAX_DECIMAL_MILLI_UNITS = 999_999_999_999n;

export function decimalToMilliUnits(value: string | number): bigint {
  const text = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) throw new Error("Invalid monetary amount");
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(3, "0"));
  const result = whole * 1000n + fraction;
  if (result < 0n || result > MAX_DECIMAL_MILLI_UNITS) {
    throw new Error("Monetary amount is outside DECIMAL(12,3) range");
  }
  return result;
}

export function milliUnitsToDecimal(value: bigint): string {
  if (value < 0n || value > MAX_DECIMAL_MILLI_UNITS) {
    throw new Error("Monetary amount is outside DECIMAL(12,3) range");
  }
  return `${value / 1000n}.${String(value % 1000n).padStart(3, "0")}`;
}

export function calculateSaleTotal(items: Array<{ price: string | number; quantity: number }>): string {
  const total = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Quantity must be a positive integer");
    }
    return sum + decimalToMilliUnits(item.price) * BigInt(item.quantity);
  }, 0n);
  return milliUnitsToDecimal(total);
}
