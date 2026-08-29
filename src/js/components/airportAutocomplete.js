import { escapeHtml, normalise } from '../utils/strings.js';

export function setupAirportAutocomplete({ input, list, airports }) {
  const renderSuggestions = () => {
    const term = normalise(input.value.trim());
    const matches = term
      ? airports
          .filter((airport) => airport.some((value) => normalise(value).includes(term)))
          .slice(0, 8)
      : [];

    list.innerHTML = matches
      .map(
        (airport, index) =>
          `<button class="suggestion" type="button" data-index="${index}"><span>${escapeHtml(airport[0])}, ${escapeHtml(airport[1])}</span><code>${escapeHtml(airport[2])}</code></button>`,
      )
      .join('');
    list.classList.toggle('visible', matches.length > 0);

    list.querySelectorAll('button').forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const airport = matches[button.dataset.index];
        input.value = `${airport[0]} (${airport[2]})`;
        input.dataset.iata = airport[2];
        list.classList.remove('visible');
      });
    });
  };

  input.addEventListener('input', () => {
    delete input.dataset.iata;
    renderSuggestions();
  });
  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('visible'), 120));
}
