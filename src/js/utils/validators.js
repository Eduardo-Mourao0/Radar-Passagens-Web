export function validateRoute({ origin, destination, departureDate, returnDate }) {
  if (!origin || !destination)
    return 'Escolha uma cidade nas sugest\u00f5es para origem e destino.';
  if (origin === destination) return 'Origem e destino devem ser diferentes.';
  if (returnDate && returnDate < departureDate)
    return 'A data de volta n\u00e3o pode ser anterior \u00e0 ida.';
  return null;
}

export function safeBookingUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
