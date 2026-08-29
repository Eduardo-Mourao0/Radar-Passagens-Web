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
];
