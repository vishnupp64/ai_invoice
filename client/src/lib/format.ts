export function formatMoney(currency: string | null | undefined, value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency ?? "USD" }).format(
      value
    );
  } catch {
    return String(value);
  }
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString();
}

