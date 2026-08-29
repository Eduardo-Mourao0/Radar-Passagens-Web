# RadarPassagens Web

Dashboard para cadastrar e monitorar rotas aéreas usando a API do repositório `Radar-Passagens`.

## Estrutura

```text
src/
  css/                 Estilos globais e estilos por componente
  js/
    api/               Cliente HTTP e operações de rotas
    components/        Autocomplete e card de rota
    data/              Catálogo de aeroportos brasileiros
    features/          Fluxos de rotas, alertas, histórico e reservas
    utils/             Formatadores, validações e escape de HTML
    app.js             Inicializa e conecta os módulos
```

## Desenvolvimento

1. No backend, execute `npm run start:dev`.
2. Instale as dependências deste projeto com `npm.cmd install` no Windows (ou `npm install` em outros sistemas).
3. Execute `npm.cmd run dev` e abra a URL exibida pelo Vite.

O Vite encaminha chamadas de `/api` para `http://localhost:3000`, sem necessidade de CORS no backend.

## Comandos

| Comando                    | Descrição                                      |
| -------------------------- | ---------------------------------------------- |
| `npm.cmd run dev`          | Inicia o ambiente de desenvolvimento com Vite. |
| `npm.cmd run build`        | Gera a versão estática em `dist/`.             |
| `npm.cmd run preview`      | Serve localmente o build gerado.               |
| `npm.cmd run lint`         | Verifica erros comuns de JavaScript.           |
| `npm.cmd run format:check` | Verifica a formatação com Prettier.            |
| `npm.cmd run format`       | Formata os arquivos do projeto.                |
| `npm.cmd start`            | Mantém o servidor legado com proxy para a API. |
