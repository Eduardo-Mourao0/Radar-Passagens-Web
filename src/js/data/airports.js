import { africaAirports } from './africa.js';
import { antarcticaAirports } from './antarctica.js';
import { asiaAirports } from './asia.js';
import { brazilAirports } from './brazil.js';
import { europeAirports } from './europe.js';
import { northAmericaAirports } from './northAmerica.js';
import { oceaniaAirports } from './oceania.js';
import { southAmericaAirports } from './southAmerica.js';

export const airports = [
  ...brazilAirports,
  ...southAmericaAirports,
  ...northAmericaAirports,
  ...europeAirports,
  ...africaAirports,
  ...asiaAirports,
  ...oceaniaAirports,
  ...antarcticaAirports,
].sort(
  (first, second) =>
    first[0].localeCompare(second[0], 'pt-BR') || first[2].localeCompare(second[2]),
);

const airportCitiesByIata = new Map(airports.map(([city, , iata]) => [iata, city]));

export function getAirportCity(iata) {
  return airportCitiesByIata.get(iata) ?? iata;
}
