# RadarPassagens Web

Dashboard para cadastrar e monitorar rotas aéreas usando a API do repositório `Radar-Passagens`.

## Estrutura

```text
src/
  css/                 Estilos globais e estilos por componente
  js/
    api/               Cliente HTTP e operações de rotas
    components/        Autocomplete e card de rota
    data/              Catálogos por região e agregação de aeroportos
    features/          Fluxos de rotas, alertas, histórico e reservas
    utils/             Formatadores, validações e escape de HTML
    app.js             Inicializa e conecta os módulos
```

## Desenvolvimento

1. No backend, execute `npm run start:dev`.
2. Instale as dependências deste projeto com `npm.cmd install` no Windows (ou `npm install` em outros sistemas).
3. Execute `npm.cmd run dev` e abra a URL exibida pelo Vite.

O Vite encaminha chamadas de `/api` para `http://localhost:3000`, sem necessidade de CORS no backend.

## Deploy

O frontend é estático e pode ser publicado na Vercel, Netlify ou Render Static Site.

1. Publique primeiro o backend em um serviço que forneça uma URL HTTPS.
2. Configure o CORS do backend para permitir o domínio do frontend.
3. Na plataforma do frontend, defina a variável `VITE_API_BASE_URL` com a URL pública do backend, sem barra final.
4. Use `npm run build` como comando de build e `dist` como diretório de publicação.

Sem `VITE_API_BASE_URL`, a aplicação usa `/api`, que é apropriado para desenvolvimento com o proxy do Vite. Copie `.env.example` para `.env.local` se quiser testar localmente contra um backend hospedado.

## Comandos

| Comando                                          | Descrição                                                   |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `npm.cmd run dev`                                | Inicia o ambiente de desenvolvimento com Vite.              |
| `npm.cmd run build`                              | Gera a versão estática em `dist/`.                          |
| `npm.cmd run preview`                            | Serve localmente o build gerado.                            |
| `npm.cmd run lint`                               | Verifica erros comuns de JavaScript.                        |
| `npm.cmd run format:check`                       | Verifica a formatação com Prettier.                         |
| `npm.cmd run format`                             | Formata os arquivos do projeto.                             |
| `npm.cmd run generate:airports -- <arquivo.csv>` | Gera os catálogos regionais a partir do CSV do OurAirports. |
| `npm.cmd start`                                  | Mantém o servidor legado com proxy para a API.              |

## Catálogo de aeroportos

O catálogo preserva os aeroportos brasileiros em `src/js/data/brazil.js` e separa os demais aeroportos comerciais por continente: América do Sul, América do Norte, Europa, África, Ásia, Oceania e Antártida. O módulo `src/js/data/airports.js` os agrega para o autocomplete.

Os aeroportos internacionais são gerados a partir do dataset público do [OurAirports](https://ourairports.com/data/), filtrando registros `medium_airport` e `large_airport` com código IATA de três letras. Para atualizar o catálogo, baixe o arquivo `airports.csv` da fonte e execute:

```powershell
npm.cmd run generate:airports -- C:\caminho\para\airports.csv
```
