# Painel da operadora (web)

React + Vite + Tailwind. Tema claro/escuro (segue o sistema; botão ☀️/🖥️/🌙 no topo) e **marca da operadora** (nome, logo e cor) vinda da API (`GET /tenant/public`).

## Rodando

```bash
npm install
cp .env.example .env     # ajuste VITE_API_URL e VITE_TENANT
npm run dev              # http://localhost:5173
npm run build            # gera dist/ (qualquer hospedagem estática)
```

Suba antes a API (`../api`, `npm run dev`) e rode o seed com `--demo`. Entre com o e-mail/senha do admin que o seed mostrou.

## Telas

- **Início**: motoristas aguardando aprovação, corridas e valor movimentado hoje.
- **Mapa ao vivo**: motoristas online (verde = livres, azul = em corrida), origem/destino das corridas em aberto; atualiza por Socket.IO.
- **Motoristas**: lista com filtros; análise com documentos (CNH, selfie, CRLV); aprovar, reprovar (com motivo), bloquear.
- **Passageiros**: lista com busca e filtro, número de corridas, bloquear e desbloquear, atalho para as corridas de cada um.
- **Corridas**: lista e detalhe com a conta linha a linha, ofertas e linha do tempo.
- **Tarifa**: editor (valores, adicionais por horário/dia/data/chuva/zona, limites, arredondamento), simulador ao lado, versões e ativação.
- **Configurações**: nome, cor e logo da operadora; cidades atendidas; onde o mapa abre (clique no mapa). Vale para o painel e, depois, para os apps.
- **Chave de chuva** no topo: liga o adicional de chuva nas novas corridas.

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `VITE_API_URL` | endereço da API |
| `VITE_TENANT` | slug da operadora; se vazio, usa o subdomínio (`operadora.painel.com`) |
| `VITE_TILE_URL` / `VITE_TILE_ATTRIBUTION` | provedor de mapa (padrão OpenStreetMap, **só para desenvolvimento**) |
| `VITE_MAP_CENTER` | centro de reserva `lat,lng`, usado só enquanto a operadora não definiu o seu em Configurações |

## Observações

- O mapa usa Leaflet; o servidor de tiles público do OpenStreetMap não é para produção: troque `VITE_TILE_URL` por um provedor contratado.
- A linha tracejada no mapa liga origem e destino (a rota real ainda não é guardada).
- Se a API usar `CORS_ORIGINS`, inclua o endereço do painel.
- Ainda não existem: área do dono da plataforma (criar operadoras) e desenho de zonas no mapa.
- Não foi testado em navegador por quem escreveu (só compilado): confirme as telas e avise o que estiver estranho.
