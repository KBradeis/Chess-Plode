# Chess Plode — Product Spec

This document is the source of truth for what we're building and why. It's written for someone who knows business, not code — every technical term is defined the first time it's used. If a later document (or a future you, six weeks from now) disagrees with this file, this file wins unless we update it on purpose.

## 1. The one-sentence goal

A browser-based chess game, playable three ways (two people on one screen, one person against a computer, or two people on two devices), fully skinned in a jungle/explorer theme, running for free on Cloudflare's hosting.

## 2. Glossary — read this once, then use this doc as reference

- **Cloudflare Workers** — a hosting service. Instead of renting one server that sits in one place, you upload your code and Cloudflare runs it on servers scattered around the world, so it starts fast no matter where the visitor is. It has a free tier generous enough for a project like this.
- **Static assets** — the files that don't change per visitor: your HTML, CSS, and JavaScript files, and images. Cloudflare Workers can serve these directly, cheaply, without running any of your own code for that request.
- **Worker** — the piece of your own code that *does* run on Cloudflare's servers, for the requests static assets can't handle (in our case, that's only the online-multiplayer WebSocket connections — everything else is static assets).
- **`wrangler.jsonc`** — the configuration file that tells Cloudflare "here's my project, here's what to run, here's what to name it." (`wrangler` is Cloudflare's command-line tool; `.jsonc` means JSON with comments allowed.)
- **`compatibility_date`** — a setting in that config file that locks in *which version* of Cloudflare's platform behavior your code expects, so Cloudflare changing something in the future can't silently break your site. We set it to the day we start building and generally don't change it later.
- **Durable Object** — a small, private piece of server-side memory tied to one specific "thing" — in our case, one Durable Object per online game room. Unlike a normal Worker request (which forgets everything the instant it finishes), a Durable Object stays alive and remembers state (the board, whose turn it is) between moves.
- **SQLite-backed Durable Object** — a Durable Object that saves its memory to a real embedded database file (SQLite) rather than just RAM, so the game survives the Durable Object being put to sleep between moves (which Cloudflare does automatically to save resources).
- **WebSocket** — a connection between browser and server that, unlike a normal web request, stays open and lets either side send messages to the other at any time. This is how "the other player's move shows up on your screen instantly" works, instead of your browser having to keep asking "anything new?" over and over.
- **`rules.js`** — the one file that knows the rules of chess. Nothing else in the codebase is allowed to decide on its own whether a move is legal.
- **Perft test** ("**perf**ormance **t**est," a standard term in chess-programming) — a way of proving a chess rules engine is correct by counting, from the starting position, exactly how many different move sequences are possible after 1 move, 2 moves, 3 moves, and so on. These counts are mathematical facts about chess that never change (20 after one move by either side, 400 after two, 8,902 after three), so if our count matches, our rule engine almost certainly has no bugs in move generation; if it doesn't match, something is definitely wrong.
- **Minimax** — the classic algorithm for a two-player, take-turns game like chess: the computer imagines "if I make this move, what's the *best* response my opponent could make? And in response to that, what's the best move I could make?" — a few moves deep — and picks the move that leads to its best guaranteed outcome, assuming the opponent also plays well.
- **Alpha-beta pruning** — a shortcut for minimax: while imagining ahead, if the computer notices a branch of possibilities can't possibly beat a move it's already found, it stops exploring that branch instead of wasting time on it. Same final answer, much faster.
- **Search depth** — how many moves ahead the computer imagines. "Depth 2" means it thinks through its move and your reply (two "half-moves," called *plies* in chess terminology) before deciding.
- **Castling, en passant, promotion** — three special chess moves every legal engine must handle: castling (king and rook swap positions in one move, under specific conditions), en passant (a special pawn capture that's only legal the move immediately after the opponent's pawn advances two squares past it), and promotion (a pawn that reaches the far end of the board becomes a piece of the player's choosing — usually a queen, but not always).
- **FEN-like state** — chess programs typically describe "the current position" as one compact piece of data (whose turn it is, where every piece sits, castling rights, etc.) rather than a full history. We'll keep something in that spirit so the server only needs to store "the position right now," not a transcript.
- **React** — a JavaScript library for building UIs out of small, reusable pieces called *components* (a "Board" component, a "Square" component, and so on), each describing what should appear on screen for a given piece of data. We use it for the front-end of this project (see §5.4).
- **Vite** (pronounced "veet") — the build tool that takes our React/TypeScript source files and bundles them into the plain HTML/CSS/JS files a browser actually runs, plus a fast local dev server for previewing changes as you make them.
- **Tailwind CSS** — a CSS approach where you style things by combining small, pre-named utility classes directly in your markup (e.g. `bg-green-900`) instead of writing separate stylesheets rule-by-rule. We use Tailwind CSS v4.
- **TypeScript / JSX / `.tsx`** — TypeScript is JavaScript with an added layer that catches a category of bugs (like passing the wrong type of value somewhere) before the code ever runs. JSX is the HTML-like syntax React components are written in; a `.tsx` file is a TypeScript file that contains JSX.
- **Figma Make** — a Figma product that generates a working React/Vite/Tailwind app from a written description. We used it to generate the initial jungle-themed board visual (see §5.5); it's a separate product from ordinary Figma design files.

## 3. The three modes

### 3.1 Hot-Seat

Two people share one device and one screen. The board flips or the UI otherwise makes it clear whose turn it is; players take turns tapping/clicking their own moves. No network connection required at all — everything happens in the browser.

**Definition of done:** all six piece types move correctly; check, checkmate, and stalemate are detected and shown; castling, en passant, and pawn promotion (with a choice of piece) all work; an illegal move is impossible to make — the UI simply won't let you attempt one.

### 3.2 Vs Computer

You play against a computer opponent. Before the game starts, you pick which color you want to play (White or Black); the computer plays the other side automatically.

The computer's "thinking" happens entirely in your browser using JavaScript — the server is not involved in this mode at all, which is part of why it costs nothing to run at scale. It uses minimax search with alpha-beta pruning at search depth 2, and it must always respond with a legal move within two seconds, even in an unusually complicated position.

**Definition of done:** everything from hot-seat's definition of done, plus: the player can choose their color at the start of each game; the computer always replies within two seconds; the computer never proposes (or is forced into) an illegal move.

### 3.3 Online

Two players on two separate devices type the same short room code. The first person to enter a given code plays White; the second plays Black; anyone else who enters that code afterward can watch but not move pieces. The server — specifically, that room's Durable Object — is the single authority on what the current position is and whose turn it is; a device's own screen is just a display of what the server says.

If a player refreshes the page (or their phone locks and they come back), re-entering the same room code reconnects them to the same in-progress game, in the same seat (White stays White), picking up exactly where the board left off. A "New game" action resets the board for both players.

There are deliberately no clocks and no timers of any kind in this mode (see Section 6 — Out of scope). The board is saved to durable storage after every single move, rather than on a timer, so there is never a "if the server restarts in the next 30 seconds we lose the game" window.

**Definition of done:** everything from hot-seat's definition of done; room codes correctly assign White/Black/spectator by join order; moves made on one device appear on the other device without the second device needing to refresh; refreshing the page rejoins the same game in the same seat with the current position intact; "New game" resets state for both players.

## 4. The look: jungle & explorer theme

This section used to describe the theme only in words, with no Figma file to point to. That's changed: we generated a real screen with Figma Make (Figma's AI app-builder) at the URL below, and its output is now our actual design system — the exact colors, fonts, and motifs every other screen should match, not just a mood description.

- **Source:** [Jungle-Theme-Chess-Background](https://www.figma.com/make/0re1s60xkWPN11Ezwek4RX/Jungle-Theme-Chess-Background), a single generated screen: the chessboard itself, fully styled, with jungle-canopy background art, animated foliage, and light/piece-selection interaction (no real chess logic — that's expected, and gets wired in during Phase 1).

**Color tokens** (defined as CSS custom properties, so every component references the same names instead of repeating raw hex values):

| Token | Value | Use |
|---|---|---|
| `--color-jungle-deep` | `#0d1f0e` | darkest background |
| `--color-jungle-dark` | `#1a3a1c` | background gradient |
| `--color-jungle-mid` | `#2d5a31` | mid-tone green accents |
| `--color-jungle-light` | `#4a8c50` | lighter green accents |
| `--color-jungle-fog` | `#6db375` | ground-mist / fog effects |
| `--color-stone-dark` | `#2c2416` | dark wood/stone |
| `--color-stone-mid` | `#4a3c28` | mid wood/stone |
| `--color-stone-light` | `#7a6548` | light wood/stone |
| `--color-stone-pale` | `#c4a96e` | pale stone, light-square base |
| `--color-moss-dark` | `#1e3320` | dark-square base |
| `--color-moss-light` | `#3d6b42` | moss highlight |
| `--color-gold` | `#c9a227` | primary accent (borders, labels, titles) |
| `--color-gold-bright` | `#f0c040` | selected/highlighted state |

**Fonts:** `Cinzel` (serif, used uppercase with wide letter-spacing) for titles and headings; `Lora` (serif, italic for status text) for body copy — both loaded from Google Fonts. Together they read as "carved stone marker" (Cinzel) and "explorer's journal" (Lora) rather than a generic sans-serif UI.

**Decorative motifs**, built as small reusable components rather than static images: a `Leaf` shape, a `FernLeaf` (multiple fronds off a central stem), and a `VineDecor` (a wavering vine with leaf clusters) — each an inline SVG, tinted with the color tokens above, gently animated (`sway`, `sway-slow`) via CSS keyframes, layered around the edges of the screen so they frame content without covering it. A soft "ground mist" gradient and a handful of firefly-like particles finish the atmosphere.

**The board itself:** an 8x8 grid in a carved-wood frame (gold-bordered), rank (1–8) and file (a–h) labels in small gold text, light squares as a pale-stone gradient with a subtle wood-grain texture, dark squares as a dark-moss gradient with a mottled texture, and pieces rendered as the standard Unicode chess glyphs (♔♕♖♗♘♙ / ♚♛♜♝♞♟) rather than custom artwork — which keeps every piece instantly legible (per the "board must read as a board first" principle) while still picking up the theme's color and shadow treatment. Selecting a piece brightens its square to gold/bright-green and gives it a small floating animation.

**What Figma Make generated vs. what we build by hand:** Figma Make produced one screen (the board, as a visual demo with no real game state). It did not generate the mode-select landing screen, the promotion piece-picker, the Vs Computer color-choice screen, the online room-code screen, or the captured-pieces strip — those get built by hand in Phases 1–4, using the same color tokens, fonts, and decorative components established here, so the whole app reads as one consistent design system even though only its first screen came from Figma Make.

## 5. Architecture

### 5.1 Hosting

The whole site is one Cloudflare Workers project on the **Free plan**. Static assets — now the output of a Vite build (see §5.4) rather than hand-written files directly — are served via Cloudflare's built-in "assets" feature, configured in `wrangler.jsonc`, pointed at the build output folder (`dist/`). Two settings matter there:

- `not_found_handling: "single-page-application"` — if someone requests a URL path that isn't a real file (for example, a room-code URL like `/room/ABCD`), Cloudflare serves `index.html` anyway instead of a 404 error page, and our own JavaScript figures out what to show based on the URL. This is what lets "share a link" or "type a room code" work without us building a real multi-page server.
- `run_worker_first` (scoped to the WebSocket path only) — normally, if a request matches a static file, Cloudflare serves that file and never runs our own server code at all, which is faster and cheaper. WebSocket connections for online games aren't a static file, though — they need our actual server code (the Durable Object) to run, so we explicitly tell Cloudflare "for this one path, always run my Worker code first, don't just look for a matching static file."

`compatibility_date` is set to the date we start building and left alone after that (see Glossary).

`observability: enabled` turns on Cloudflare's built-in logging/metrics for the Worker, at no extra cost on the free plan, so if something breaks in production we have logs to look at instead of guessing.

### 5.2 The rules engine — one file, shared by everyone

All chess-legality logic lives in exactly one file, `rules.js`. Hot-seat, the computer opponent, and the online server all import and call the exact same functions from this file — there is no second copy anywhere, and we do not use an outside chess library (like the popular `chess.js` package) or a pre-built chess engine. We write it ourselves.

This matters for two reasons a business student will recognize even without reading code: first, a single source of truth means the rules literally cannot disagree with themselves between modes (a classic bug class in software: two copies of "the same" logic drift apart over time as each gets patched separately). Second, it's a forcing function for correctness — we can write one focused test against `rules.js` (the perft test, described next) and trust every mode that depends on it, rather than needing to separately verify chess rules three different times in three different UIs.

**How we prove it's correct — perft testing:** before any UI or game mode is built, we run a perft test against `rules.js`, from the standard starting position. From that position, counting every possible sequence of legal moves gives exactly 20 possibilities after 1 half-move, 400 after 2, and 8,902 after 3 — these are well-known, unchanging facts about chess, not something we're guessing at. If our engine's numbers match, move generation is almost certainly correct (including the fiddly cases — castling rights, en passant timing, not being allowed to move into check); if they don't match, we fix `rules.js` before writing a single line of UI code. This is called out explicitly in the roadmap as a blocking task: nothing else starts until this test passes.

### 5.3 The computer opponent

Runs entirely client-side (in the player's own browser), in its own module, using minimax search with alpha-beta pruning at depth 2 (see Glossary for what both of those mean). It calls into `rules.js` to know which moves are legal — it never reimplements chess rules itself, only move *selection*. We'll build in a safety margin so it reliably answers within the 2-second budget even in unusually "busy" positions (many legal moves to consider); if a rare position would blow that budget, the fallback is to cut the search shallower for that one move rather than let the player wait.

### 5.4 The front-end: React, generated first by Figma Make

Originally this project was planned as plain HTML/CSS/JavaScript with no framework. That changed on purpose after evaluating Figma Make (see §4): the front-end is now **React 19 + TypeScript + Tailwind CSS v4, built with Vite 8** — the exact stack Figma Make itself generates, so the AI-designed screen and every hand-built screen after it share one toolchain instead of us maintaining a translation layer between "what Figma Make made" and "what the app runs."

This is a UI-layer decision only, and it doesn't loosen any of the other constraints: `rules.js`, the AI module, and the Durable Object server logic (§5.2, §5.3, §5.5) are still plain, framework-agnostic JavaScript with no outside libraries — React components *import and call* those modules, the same as any other JavaScript would, rather than those modules being rewritten in a React-specific way. The "one shared rules engine, proven by a perft test" principle is unaffected by which UI framework sits on top of it.

Practically, this means: components live under `src/` as `.tsx` files (a `Board` component, a `Square` component, a `Modal` component, etc. — see §4 for the generated starting point); Tailwind utility classes plus the color/font tokens from §4 handle styling instead of a separate stylesheet; `vite build` compiles everything down to plain static HTML/CSS/JS in `dist/`, which is what Cloudflare Workers actually serves — so hosting, the free plan, and the "static assets, no server code until Phase 3" architecture in §5.1 are all unchanged. Only the *source* of those static files changed, not how they're hosted.

### 5.5 Online multiplayer

**One Durable Object per room.** When two players want to play online, they're really both connecting to the same Durable Object instance — a private, persistent slice of server memory — identified by the room code they both typed in. We get that instance with `env.ROOM.getByName(roomCode)`, which either creates a fresh one (first player to use that code) or hands back the existing one (second player, or a reconnect). The Durable Object is SQLite-backed (`new_sqlite_classes` in the config) so the current position survives the Durable Object being put to sleep between moves, which Cloudflare does automatically when nothing's happening, to save resources.

**No external real-time libraries.** We don't use Socket.IO, Express, or the `ws` npm package — all of which are common tools for this kind of thing outside Cloudflare Workers, but aren't needed (or supported) here. Instead we use Cloudflare's native WebSocket support directly: `ctx.acceptWebSocket()` hands the connection to the Durable Object, which can then hold onto it (rather than needing a traditional always-running server process) and wake up only when a message arrives.

**Message format.** Every message sent over the WebSocket, in either direction, is JSON with a `type` field (a short string saying what kind of message it is — e.g. `"move"`, `"sync"`, `"error"`) and a `payload` field (the data for that message type). Keeping every message shaped this way, from the start, makes the protocol easy to extend later and easy to log/debug.

**Player identity.** When someone connects, the Durable Object decides whether they're White, Black, or a spectator based on join order, and remembers that decision on the connection itself using `ws.serializeAttachment()` (a way of tagging a WebSocket connection with a small piece of data that Cloudflare keeps even if the connection briefly goes idle) — so the server always knows, for any given connection, who it's talking to, without the client having to re-announce itself on every message.

**No timers, ever.** Nothing in the online mode runs on a schedule or a countdown — not for the game (no clocks, per Section 6) and not for saving data either. Instead, the current position is written to the Durable Object's SQLite storage synchronously after every single move. This means there's no window where a crash or restart could lose a move that "hadn't been saved yet."

**Reconnection.** Because the authoritative position lives in the Durable Object (not in any one player's browser tab), reconnecting — refreshing the page, or typing the same room code in again — just means "open a new WebSocket to the same Durable Object," which immediately sends back the current position. The player doesn't lose their seat (White/Black) or the game in progress.

## 6. Explicitly out of scope

These are deliberate exclusions, not oversights — each one would add real complexity for something this project doesn't need:

- **Accounts or logins** — no signup, no passwords, no "remembering who you are" across visits beyond a single game.
- **Clocks or time controls** — no chess clock, no "you have 10 minutes," no time pressure at all.
- **Ratings** — no Elo, no skill tracking, no leaderboards.
- **Draw by repetition or the fifty-move rule** — two lesser-known official chess draw conditions (a position repeating three times, or fifty moves passing with no pawn move or capture) that we are intentionally not detecting. Games can still end in checkmate or stalemate; these two specific draw types are just not implemented.
- **Opening books** — a database of known strong opening move sequences that many chess engines consult early in the game. Our computer opponent calculates every move fresh via search instead.
- **Move export** — no PGN (the standard chess move-notation file format) download, no copy-to-clipboard move list.

React was originally on this list too — the project started as plain HTML/CSS/JavaScript only. That changed on purpose once we evaluated Figma Make (see §4, §5.4): it's now the front-end framework, in exchange for a design system generated to match, at the cost of shipping more code that wasn't written from scratch. `rules.js`, the AI, and the Durable Object logic remain library-free either way.

## 7. Optional extra (built last): captured pieces + material count

Once all three modes work end-to-end, the one additional feature we'll add is a display of each side's captured pieces alongside a material-count indicator (e.g., "White is up 3 points" based on standard piece values: pawn 1, knight/bishop 3, rook 5, queen 9). This is purely informational — it doesn't change any rule or any mode's core behavior — which is exactly why it's safe to build last, after everything else is solid.

## 8. What "done" means, overall

Full legal chess in every mode, with every illegal move genuinely impossible to make (not just discouraged) — all six piece types, check, checkmate, stalemate, castling, en passant, and promotion with a choice of piece. The computer opponent always answers within two seconds with a legal move. Online play correctly assigns colors by join order, keeps the server as the single authority on the position, survives refreshes, and lets either player start a new game for both. The whole thing is styled in the jungle/explorer theme (now a real design system pulled from Figma Make, per §4), runs on Cloudflare Workers' free plan, and has no code outside `rules.js`, the React UI, the AI module, and the Durable Object server logic — no chess library, no real-time-networking library, no timers. React is the one library in the stack, adopted deliberately for the UI layer only; everything that decides game state (`rules.js`, the AI, the online server logic) remains hand-written with no outside dependencies.
