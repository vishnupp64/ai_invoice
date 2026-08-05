import type { Decimal } from "@prisma/client/runtime/library";

export function decimalToNumber(d: Decimal | null) {
  if (!d) return null;
  return Number(d.toString());
}
