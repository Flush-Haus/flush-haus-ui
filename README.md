# Flush Haus — Mesa de Poker (cliente web)

Front-end de uma **mesa de Texas Hold'em multiplayer em tempo real**. É um cliente
React/Vite que conversa com o servidor [`flush-haus-api`](https://github.com/Flush-Haus/flush-haus-api)
por um **protocolo de texto simples sobre WebSocket** (ver `PROTOCOLO.md` no
repositório da API). Estética de pixel-art: um salão de barco a vapor de 1900,
mogno, latão e feltro esmeralda.

> Trabalho de **Redes de Computadores** (CEFET). O jogo é a demonstração prática
> de comunicação em tempo real sobre TCP; o estudo teórico das variantes do TCP
> é um relatório separado — ver [Relação com o trabalho de TCP](#relação-com-o-trabalho-de-tcp).

## O que este projeto demonstra

- **Sincronização de estado em tempo real** entre vários jogadores por WebSocket.
- Como uma aplicação interativa depende de **entrega confiável e ordenada** — a
  garantia que o **TCP** dá à camada WebSocket. Cada ação (apostar, virar carta,
  distribuir o pote) precisa chegar íntegra e na ordem certa, ou a mesa
  "dessincroniza" entre os clientes.
- Estado de conexão explícito, reconexão automática após quedas e degradação
  graciosa quando o servidor está fora do ar.

## Tecnologias

- **React 18** + **TypeScript**
- **Vite 6** (dev server e build)
- **framer-motion** (voo/entrega das cartas)
- CSS puro (sem framework) — linguagem visual pixel em `src/table.css`
- Servidor: **Bun** + **Elysia** (repositório `flush-haus-api`, fora deste repo)

## Instalação

```bash
# cliente (este repositório)
npm install
```

O servidor é um projeto separado:

```bash
git clone https://github.com/Flush-Haus/flush-haus-api
cd flush-haus-api
bun install
```

## Como rodar

**1. Suba o servidor** (em `flush-haus-api`, escuta em `:8080`):

```bash
bun run src/index.ts        # ou: bun run dev  (watch)
```

**2. Suba o cliente** (neste repositório):

```bash
npm run dev                 # Vite em http://localhost:5173
```

Abra `http://localhost:5173`, confirme a URL `ws://localhost:8080/ws` no lobby e
clique **Conectar**. A URL do WebSocket é editável no lobby, então dá para apontar
para outra máquina na LAN (`ws://<ip>:8080/ws`).

### Modo demonstração (sem servidor)

```
http://localhost:5173/?demo
```

Renderiza uma mesa estática com todos os estados de assento ao mesmo tempo (herói
para agir, oponente que apostou, all-in, folds, dealer + blinds, assento vazio).
Útil para revisar o layout sem subir a API nem precisar de um segundo jogador.

## Como testar o fluxo WebSocket / jogo

- **Solo (rápido):** Conectar → *Criar sessão* → *Iniciar partida*. O dono envia
  `game ready` automaticamente e a mão é distribuída; dá para percorrer as ruas.
- **Dois jogadores:** abra duas abas. Na aba A, *Criar sessão* e copie o **ID da
  sessão** exibido. Na aba B, cole o ID em *Entrar na sessão* e informe um nome.
  Volte à aba A e *Iniciar partida*.
- **Servidor offline:** pare a API e clique *Conectar* — o lobby mostra
  "Falha na conexão" com a dica de verificar se o `flush-haus-api` está rodando.
- **Reconexão:** derrube a API no meio de uma sessão e suba de novo; o cliente
  reconecta com backoff exponencial e tenta re-vincular o jogador
  (`session reconnect`).

## Limitações conhecidas

- **A lógica de jogo é do servidor.** Este repositório é só a interface; regras,
  avaliação de mãos e side-pots vivem em `flush-haus-api`. A revelação das cartas
  dos oponentes no showdown depende de o servidor enviar `game showdown`.
- **Assets de carta são grandes** (PNGs ~1 MB cada). Funciona bem em LAN/localhost;
  para produção valeria recomprimir os sprites.
- **Layout em retrato (celular)** é um ajuste "melhor esforço" para 9 lugares numa
  tela estreita — assentos que desistiram nas laterais podem encostar levemente
  nas cartas comunitárias.
- **Sem persistência**: recarregar a aba perde o estado local (a reconexão tenta
  restaurar a sessão pelo `playerId`, mas o estado completo da mão não é reenviado
  pelo servidor).

## Relação com o trabalho de TCP

O trabalho pede um **estudo comparativo das variantes do TCP**
(Tahoe, Reno, NewReno, Vegas, SACK). Este jogo **não simula** essas variantes — ele
**usa** o TCP na prática: WebSocket roda sobre TCP, e é o controle de
congestionamento + a entrega confiável e ordenada do TCP que mantêm a mesa
consistente entre os jogadores.

O relatório teórico exigido pela atividade está em
**[`docs/tcp-comparative-study.md`](docs/tcp-comparative-study.md)** e é entregue à
parte, em PDF. O jogo **não substitui** o relatório; os dois são entregáveis
complementares.

### Gerar o PDF do relatório

Um **PDF já vem pronto** em `docs/tcp-comparative-study.pdf` (8 páginas, gerado a
partir do Markdown). Para **regerar** após editar o `.md`, use qualquer opção:

```bash
# Opção A — Pandoc + LaTeX (melhor tipografia)
pandoc docs/tcp-comparative-study.md -o docs/tcp-comparative-study.pdf \
  --pdf-engine=xelatex -V geometry:margin=2.5cm

# Opção B — sem instalar nada: abra o .md renderizado no navegador
#           (VS Code, GitHub, etc.) e use "Imprimir → Salvar como PDF".
```

## Entregáveis

1. **Cliente web** (este repositório) — a mesa de poker WebSocket.
2. **Servidor** `flush-haus-api` — a API do jogo (repositório separado).
3. **Relatório** `docs/tcp-comparative-study.md` (+ PDF) — o estudo comparativo do TCP.

## Estrutura

```
src/
  net/          protocolo WebSocket: PokerClient, reducer, mapeamento de cartas
  components/table/  mesa, assentos, board, action bar, lobby, FX de distribuição
  hooks/        assets de carta, media query
  data/         mesa de exemplo (modo ?demo)
docs/           relatório do TCP + planos de design
```
