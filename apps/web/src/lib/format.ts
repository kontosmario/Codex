export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  });
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
