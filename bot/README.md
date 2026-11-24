# Telegram bot

`worker.js` is the source for the existing Cloudflare Worker `zmrush-ze-shop`.
Deploy it to that Worker while retaining its `BOT_TOKEN` secret and
`ZMRUSH_LANGUAGES` KV binding. The frontend remains on GitHub Pages / Cloudflare Pages.

The bot's catalog links carry `lang`. The Mini App also reads the latest saved
preference through `POST /catalog-language`, including when opened from an old
message or the main Mini App button. The endpoint verifies Telegram `initData`
with HMAC-SHA-256 and a 24-hour validity period before reading the user's KV key.
It permits CORS only from the two production catalog origins and does not cache
preferences. No bot token is sent to or stored in the frontend.

Order translations for all 20 bot languages are in `../checkout-locales.js`.
The order is a draft in the seller's chat; the user confirms sending it.

The first grenade video upload stores Telegram's `file_id` in the existing
KV namespace. Update `GRENADE_VIDEO_REVISION` to the new asset commit when
replacing the video. Each revision uses a different KV entry.

Repeated webhook updates share a result for up to five minutes within a Worker
instance. Cloudflare collects explicit error events with the update ID, API
method, status and duration when available.

Checks: `node --test scripts/cart.test.mjs bot/worker.test.mjs bot/language.test.mjs`
from the repository root, followed by `npm run test:browser`.
