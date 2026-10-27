# Ramblepost

Say what you built. Get the hackathon post.

## The problem

After every hackathon, I lose hours turning notes into a post.

## Who it's for

Developers who write hackathon posts.

## How to run it locally

You need Node.js and pnpm.

```bash
pnpm install
cp .env.local.example .env.local
```

Open `.env.local` and put your Groq API key after `GROQ_API_KEY=`. Then start the dev server:

```bash
pnpm dev
```

Open http://localhost:3000.

## How it was built

I built it entirely by voice with Wispr Flow in Cursor.
