# Cosmo Social Coffee MVP demo

Demo for a coffee shop: static website, menu by branches, cart, discounts, loyalty block, and a Telegram bot.

## Files

- `index.html` — demo website.
- `styles.css` — premium coffee visual style.
- `app.js` — test menu, branches, cart and promo code.
- `bot/` — Telegram bot MVP.
- `netlify.toml` — static deployment config.

## Website

Run locally:

```bash
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Telegram bot

```bash
cd bot
npm install
cp .env.example .env
npm start
```

Set values in `.env` before start.

## Demo data

All menu items, prices and branches are test data. Replace them after the client sends real menu, branch list and brand assets.
