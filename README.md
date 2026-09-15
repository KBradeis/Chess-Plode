# Chess Plode

A jungle/explorer-themed chess game you play entirely in the browser — no install, no account, no app store. Built by Aydin K.

## What this is

Chess Plode is full, legal chess with three ways to play:

1. **Hot-Seat** — two people share one screen and one keyboard, trading turns.
2. **Vs Computer** — you play against a computer opponent that calculates its moves inside your own browser (it doesn't need the server to "think").
3. **Online** — two people on two different devices type the same short room code and play against each other with moves appearing live on both screens.

The visual theme is jungle-and-explorer (a Tarzan-style look): think vines, wood, and adventure rather than a plain black-and-white tournament board.

## Where things stand right now

This repo currently holds three planning documents and no game code, on purpose. Chess has a lot of small, easy-to-get-wrong rules — castling, en passant, "you can't move into check," promotion, and so on. It's far cheaper to nail those rules once, in one place, and *prove* they're right with a test, than to chase rule bugs after three different game modes already depend on them. `FEATUREROADMAP_workplan.md` lays out the exact build order (rules engine and its test first, then hot-seat, then the computer opponent, then online play, then one extra feature), and `ProductSpec.md` explains every technical decision in plain English along the way.

## The documents in this repo

- **`README.md`** (this file) — the front door: what the project is and how the pieces fit together.
- **`ProductSpec.md`** — the full plan: what "done" means for each mode, every technical decision explained in plain English with terms defined, the exact rules of what we're building, and — just as important — what we're deliberately *not* building.
- **`FEATUREROADMAP_workplan.md`** — the task-by-task build order as checkboxes, each one listing what it depends on, which files it touches, and how we'll know it's actually finished.

## Plain-English tech summary

*(Every term below is explained in full in `ProductSpec.md` — this is just the short version.)*

The site runs on **Cloudflare Workers**, a hosting service that runs your code close to whoever's visiting, on a free plan. All chess rules — what counts as a legal move, check, checkmate, everything — live in a single file, `rules.js`, that we write from scratch (no outside chess library), and all three modes share that one file so the rules can never disagree with each other. The computer opponent runs its calculations in your browser, not on the server. Online games are handled by a small, per-room slice of server memory called a **Durable Object**, which Cloudflare creates on demand and which remembers the board between moves.

## Status

Planning stage. See `FEATUREROADMAP_workplan.md` and reply in chat with which task to start on.
