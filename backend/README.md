# DigiCloset — Backend API Server

The backend REST API server for DigiCloset, built with **Node.js**, **Express.js v5**, **MongoDB / Mongoose v9**, **Firebase Admin SDK**, and **Google Gemini AI**.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) (v18+) | Runtime environment |
| [Express.js v5](https://expressjs.com/) | REST API framework & routing |
| [MongoDB](https://www.mongodb.com/) & [Mongoose v9](https://mongoosejs.com/) | Document database & object modeling |
| [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) | Server-side Firebase ID token verification |
| [Google Gemini API](https://ai.google.dev/) (`gemini-2.0-flash`) | AI outfit generation, fashion criticism, color harmony, shopping plans |
| [Open-Meteo API](https://open-meteo.com/) | Real-time weather data for weather-aware recommendations |
| [Multer](https://github.com/expressjs/multer) | Multipart file upload handling for wardrobe & try-on images |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | Rate-limiting protection on auth and AI endpoints |

---

## Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js           # Mongoose connection with retry logic
│   │   ├── env.js          # Environment variable validator & exporter
│   │   └── firebaseAdmin.js# Firebase Admin SDK init with emulator support
│   ├── controllers/        # 12 Express route controllers
│   ├── middleware/         # Auth, validation, error handling, rate limiting, multer
│   ├── models/             # 8 Mongoose schemas (User, ClothingItem, SavedOutfit, etc.)
│   ├── routes/             # 12 Modular Express routers mounted at /api/*
│   ├── services/           # geminiService (SDK wrapper), stylistService (AI features),
│   │                       # weather, image storage, try-on, product search
│   └── index.js            # Express application bootstrap & server listen
├── uploads/                # Local file storage for uploads in dev mode (.gitignored)
├── .env.example            # Environment variables template
└── package.json            # Backend scripts and dependencies
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment variables:

```ini
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/digi_closet
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=demo-digi-closet
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
GEMINI_API_KEY=your_gemini_api_key_here  # Required for every AI feature
GEMINI_MODEL=gemini-3.5-flash-lite        # Optional override
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
PRODUCT_SEARCH_API_KEY=                  # Optional: SerpApi key for live product listings
```

### 3. Start Local MongoDB

```bash
# Start background mongod daemon
npm run db:start

# To stop later
npm run db:stop
```

### 4. Start the Firebase Auth emulator

```bash
firebase emulators:start --only auth --project demo-digi-closet
```

### 5. Start Development Server

```bash
npm run dev
```

The server will listen at `http://localhost:5001`. Health check endpoint: `GET http://localhost:5001/api/health`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts server with `nodemon` for auto-restart on file changes |
| `npm start` | Runs server in production mode with standard `node` |
| `npm run db:start` | Launches background `mongod` instance pointing to `~/.digi-closet/mongodb-data` |
| `npm run db:stop` | Safely stops the local `mongod` background instance |

---

## How AI requests work

All Gemini calls go through `src/services/geminiService.js`, which uses the official `@google/genai` SDK with JSON-schema structured output. When a model returns 429/503 or times out, it retries on `GEMINI_FALLBACK_MODEL` and then the primary model once more, all within about 60 seconds. If every attempt fails, the endpoint returns a clear error (see `docs/api-reference.md`). There is no mock or rule-based fallback, so a response is either real Gemini output or an error.

Model output is never trusted blindly. Outfit item ids are checked against the user's wardrobe, hex colours are validated, and budget plans are trimmed in code until they fit the budget.
