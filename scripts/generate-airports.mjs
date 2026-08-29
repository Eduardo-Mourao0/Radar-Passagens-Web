import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [sourcePath] = process.argv.slice(2);
if (!sourcePath)
  throw new Error('Uso: node scripts/generate-airports.mjs <caminho-para-airports.csv>');

const REGIONS = {
  SA: { file: 'southAmerica', exportName: 'southAmericaAirports' },
  NA: { file: 'northAmerica', exportName: 'northAmericaAirports' },
  EU: { file: 'europe', exportName: 'europeAirports' },
  AF: { file: 'africa', exportName: 'africaAirports' },
  AS: { file: 'asia', exportName: 'asiaAirports' },
  OC: { file: 'oceania', exportName: 'oceaniaAirports' },
  AN: { file: 'antarctica', exportName: 'antarcticaAirports' },
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.length > 1) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (value || row.length) rows.push([...row, value]);
  return rows;
}

const csv = await readFile(sourcePath, 'utf8');
const [headers, ...rows] = parseCsv(csv);
const column = Object.fromEntries(headers.map((header, index) => [header, index]));
const airportsByRegion = Object.fromEntries(Object.keys(REGIONS).map((region) => [region, []]));
const iataCodes = new Set();

for (const row of rows) {
  const continent = row[column.continent];
  const type = row[column.type];
  const country = row[column.iso_country];
  const iata = row[column.iata_code];
  const region = REGIONS[continent];

  if (!region || country === 'BR' || !['large_airport', 'medium_airport'].includes(type)) continue;
  if (!/^[A-Z]{3}$/.test(iata) || iataCodes.has(iata)) continue;

  const city = row[column.municipality] || row[column.name];
  if (!city) continue;

  iataCodes.add(iata);
  airportsByRegion[continent].push([city, country, iata]);
}

await Promise.all(
  Object.entries(REGIONS).map(async ([continent, { file, exportName }]) => {
    const airports = airportsByRegion[continent].sort((first, second) =>
      first[0].localeCompare(second[0], 'en'),
    );
    const output = `// Fonte: OurAirports (domínio público), filtrado para aeroportos médios e grandes com IATA.\nexport const ${exportName} = ${JSON.stringify(airports, null, 2)};\n`;
    await writeFile(resolve('src/js/data', `${file}.js`), output);
  }),
);
