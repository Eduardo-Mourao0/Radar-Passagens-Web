export function validateRoute({ origin, destination, departureDate, returnDate }) {
  if (!origin || !destination)
    return 'Escolha uma cidade nas sugest\u00f5es para origem e destino.';
  if (origin === destination) return 'Origem e destino devem ser diferentes.';
  if (!isValidDate(departureDate)) return 'Informe uma data de ida v\u00e1lida.';
  if (returnDate && !isValidDate(returnDate)) return 'Informe uma data de volta v\u00e1lida.';
  if (returnDate && returnDate < departureDate)
    return 'A data de volta n\u00e3o pode ser anterior \u00e0 ida.';
  return null;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function safeBookingUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
