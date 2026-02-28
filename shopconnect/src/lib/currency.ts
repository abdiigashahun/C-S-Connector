export function formatETB(amount: number) {
  if (!Number.isFinite(amount)) {
    return "ETB 0.00";
  }

  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
