# DigiCloset — API Reference

All endpoints live under `/api`. Except for `/api/health` and `/api/weather`, every request needs a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

Responses use the shape `{ "success": boolean, "message"?: string, "data"?: object }`. Errors return a non-2xx status with `success: false` and a human-readable `message`.

AI endpoints (marked **AI**) call Google Gemini. They share a rate limit of 15 requests per minute per client and return:

| Status | Meaning |
| --- | --- |
| 400 | Missing or invalid input (e.g. no image, wardrobe can't form an outfit) |
| 422 | Gemini could not use the input (not clothing, no face visible, unreadable image) |
| 429 | Rate limit reached |
| 502 | Gemini rejected the request (bad key, unavailable model, malformed output) |
| 503 | Gemini is overloaded or not configured |

There is no mock or offline mode: if Gemini fails, the endpoint returns an error.

---

## Health

`GET /api/health` — reports whether MongoDB is connected and which Gemini model and product search provider are configured. Returns `503` when the database is down.

## Auth (`/api/auth`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/sync` | Body `{ name? }`. Creates the Mongo profile on first call and updates the display name. |
| GET | `/auth/me` | Current user profile. |

## Profile (`/api/profile`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/profile` | Profile including `stylePreferences` and `colorPalette`. |
| PUT | `/profile` | Body `{ stylePreferences?, physicalProfile?, privacySettings?, onboardingCompleted? }`. |
| DELETE | `/profile` | Clears style and physical data, keeps the account. |
| GET | `/profile/export` | Exports all of the user's data. |
| DELETE | `/profile/account` | Deletes the user and everything they own. |

## Wardrobe (`/api/wardrobe`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/wardrobe` | Query: `search`, `category`, `season`, `occasion`, `color`, `sort` (`oldest`, `name`, `category`). |
| GET | `/wardrobe/:id` | 403 if the item belongs to someone else. |
| POST | `/wardrobe/classify` | **AI.** Multipart `image`. Returns `suggestion` `{ name, category, type, colors[primary, secondary?], pattern, style, occasions[], season[], confidence }`. Nothing is saved. |
| POST | `/wardrobe/upload-image` | Multipart `image` (JPEG/PNG/WebP, max 5MB). Returns `{ imageUrl, imagePath }`. |
| POST | `/wardrobe` | Body: `name`, `category` (required), `type`, `colors`, `pattern`, `season[]`, `style`, `occasions[]`, `size`, `brand`, `notes`, `imageUrl`, `imagePath`. |
| PUT | `/wardrobe/:id` | Any of the fields above. |
| DELETE | `/wardrobe/:id` | Also deletes the stored image. |

Categories: `Tops, Shirts, T-Shirts, Trousers, Jeans, Skirts, Shorts, Dresses, Footwear, Outerwear, Accessories`.

## Outfits (`/api/outfits`)

### `POST /outfits/recommend` — AI outfit generator (**AI**)

Body (all optional): `occasion`, `style`, `season`, `colors[]`, `city` (adds live weather), `surprise` (boolean), `excludeCombos` (array of item-id arrays already shown, for "show alternatives").

```json
{
  "outfits": [{
    "title": "Classic Office Beige",
    "styleCategory": "Smart Casual",
    "occasion": "Office",
    "itemIds": ["…"],
    "topwearId": "…", "bottomwearId": "…", "layerId": null, "footwearId": "…", "accessoryIds": [],
    "explanation": "…",
    "styleTips": ["…"],
    "missingItems": []
  }],
  "weather": "Overcast, 25°C, humidity 50% in Bengaluru",
  "wardrobeCount": 8
}
```

Every id in `itemIds` is checked server-side against the user's wardrobe. Each outfit has one top + one bottom or a single dress. Returns 400 if the wardrobe can't make a complete outfit.

### `POST /outfits/smart` — smart recommendations (**AI**)

Body: `preset` (`today`, `college`, `office`, `party`, `casual`, `travel`), `city` (default Bengaluru), `excludeCombos`. Uses live Open-Meteo weather, the user's style preferences and colour palette, and their saved/favourite outfits. The response adds `weather` (object), `label` and `usedHistory`.

### Saved outfits

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/outfits/saved` | Query `favorite=true` for favourites only. Items are populated. |
| POST | `/outfits/saved` | Body `{ title, itemIds[], occasion?, styleCategory?, explanation?, styleTips?, source?, favorite? }`. All items must be the user's own. |
| PUT | `/outfits/saved/:id/favorite` | Toggles favourite. |
| DELETE | `/outfits/saved/:id` | |

## Fashion critic (`/api/fashion`)

`POST /fashion/analyze` (**AI**). Multipart with an `image` **or** `itemIds` (JSON array, at least two of the user's items), plus an optional `occasion`.

Returns `score` (1–10), `verdict`, `summary`, `whatLooksGood[]`, `improvements[]`, `colorFeedback`, `combinationFeedback`, `balanceFeedback`, `occasionFit`, `accessoriesFeedback`, `suggestions[]` and `alternatives[]`. Alternatives are validated outfits built from the user's wardrobe, in the same shape as the generator's outfits.

## Personal colour palette (`/api/colors`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/colors/palette/analyze` | **AI.** Multipart `image` and `consent=true`. The photo is analysed in memory and never stored. Returns `palette` (not saved). |
| GET | `/colors/palette` | Saved palette or `null`. |
| PUT | `/colors/palette` | Save an AI or hand-edited palette. Invalid hex values are dropped. |
| DELETE | `/colors/palette` | |

Palette shape: `season`, `undertone`, `contrast`, `summary`, `lightingNote`, `recommendedColors[]`, `neutralColors[]`, `experimentColors[]`, `avoidColors[]` (each `{ name, hex, note }`), `combinations[]` (`{ name, usage, hexes[] }`) and `source` (`ai` | `custom`).

## Shopping (`/api/shopping`)

### `POST /shopping/assistant/search` — Smart Clothes Finder (**AI**)

Body `{ query }`. Gemini extracts `filters` (`category, color, style, size, gender, occasion, brand, minPrice, maxPrice, otherRequirements[], searchQuery`). These are passed to the configured product provider.

```json
{
  "filters": { "…": "…" },
  "configured": false,
  "provider": null,
  "products": [],
  "marketplaceLinks": [{ "platform": "Myntra", "url": "…" }]
}
```

With `PRODUCT_SEARCH_API_KEY` set, `products` holds real Google Shopping results (via SerpApi): `{ id, title, price, priceText, merchant, imageUrl, link, rating, reviews, description }`. Without it, `products` is always empty; listings are never invented.

### `POST /shopping/plan` — budget planner (**AI**)

Body `{ budget (₹200–₹10,00,000), goal?, categories[]?, style?, priorities? }`. Gemini proposes a prioritised list based on what the user already owns. The server then drops the lowest-priority items until the total fits the budget. When a product provider is configured, each item gets up to 3 real listings within its unit budget. `hasLiveProducts: false` means the amounts are estimates, not real prices.

| Method | Path |
| --- | --- |
| GET | `/shopping/saved` |
| DELETE | `/shopping/saved/:id` |

## Saved products (`/api/products`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products/saved` | |
| POST | `/products/saved` | Body `{ id, title, price, merchant, imageUrl, link }` from a finder result. Idempotent per `id`. |
| DELETE | `/products/saved/:id` | |

## Chat (`/api/chat`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/chat` | **AI.** Body `{ message (≤1000 chars), conversationId?, city? }`. Returns `{ conversationId, reply }`. Context sent to Gemini: the wardrobe, style preferences, colour palette, saved outfits, current weather and the last 20 messages. Messages are only stored once Gemini replies. |
| GET | `/chat/conversations` | List without messages. |
| GET | `/chat/conversations/:id` | |
| DELETE | `/chat/conversations/:id` | |
| DELETE | `/chat/conversations` | Clear all history. |

## Virtual try-on (`/api/try-on`)

`POST /try-on` takes multipart `userPhoto` and `garmentPhoto`. It stores the photos, creates a job and adds Gemini styling notes. Image rendering needs `VIRTUAL_TRYON_*` to be configured; until then jobs stay `awaiting_configuration`. `GET /try-on/:id` returns a job.

## Weather (`/api/weather`)

`GET /weather?city=…` or `?lat=…&lon=…`. Public. Live Open-Meteo data cached for 10 minutes. Returns `found: false` when unavailable; it never returns made-up weather.
