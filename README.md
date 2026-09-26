# Campus Customs — HW4

A React, Vite, and TypeScript storefront with a FastAPI backend and a Pydantic AI shopping assistant. Shoppers can browse and filter the catalog, view product details, create accounts, save carts, and ask the assistant about current prices and stock.

## 1. Clone and add the local data pack

```sh
git clone https://github.com/lewism1016-wq/hw4.git
cd hw4
```

Place the supplied course data pack directly inside this repository. Use these lowercase paths:

```text
hw4/
  data/
    campus_customs.db
    products/
      <product image files from the data pack>
```

Both the database and the entire `data/` folder are excluded from Git. The database and product images are required before starting the API. Keep the image filenames from the data pack intact. The backend creates the saved-cart table automatically; the pack supplies the catalog, inventory, users, and chat history tables.

## 2. Install dependencies and configure the backend

Use Python 3.11 or newer and Node.js 22 or newer with npm. The commands below are for macOS/Linux; the audit writer uses POSIX file locking.

From the repository root:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and replace `PORTKEY_API_KEY` with your own Portkey key. Set `CAMPUS_CUSTOMS_SESSION_SECRET` to a random value generated with:

```sh
backend/.venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Keep `CAMPUS_CUSTOMS_COOKIE_SECURE=false` for local HTTP. Use `true` when serving over HTTPS. The database defaults to `data/campus_customs.db`; the optional `CAMPUS_CUSTOMS_DATABASE_PATH` setting can point to another absolute path.

The backend reads the root `.env`. Process environment values take precedence, and a parent-folder `.env` remains supported as a fallback for the original course workspace. The public repository contains only `.env.example` with placeholders. Browsing and account/cart features work without a model credential; live chat requires a valid Portkey key with access to the configured `gpt-6-luna` model.

## 3. Start the API

From the repository root, in the first terminal:

```sh
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

The API runs at [http://localhost:8000](http://localhost:8000). Its interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

## 4. Start the storefront

Open a second terminal at the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), or the URL printed by Vite. Keep both terminals running. Vite forwards `/api` and `/images` requests to FastAPI on port 8000. Use `Ctrl+C` in each terminal to stop the app.

To check the front-end production build, run `npm run build` from `frontend/`.

## Features and documentation

- Catalog cards and detail pages read product descriptions, images, prices, colors, and size stock from SQLite. Products can be sorted and filtered by type, size, and color.
- Passwords use salted Argon2id hashes. Signed-in shoppers keep chat history and carts in SQLite; guests keep their carts in browser storage.
- The assistant returns structured product cards and uses two read-only catalog tools. Each run allows up to four model requests and six successful tool calls, with up to eight product matches.
- `output/audit_trail.json` records agent/tool activity as append-only JSON Lines. It is separate from account chat history and is never cleared automatically between runs.
- [Harness and manager summary](output/harness.md): architecture, models, tools, safety, limits, and database fields.
- [Design](output/design.md) and [usability](output/usability.md): changes made for shoppers.
- [App check](output/app_check.html): open locally in a browser to view the three checks and screenshots in `output/app_check_images/`.
- [AI prompts](AI_prompts.md): the recorded homework prompts.

This project provides a cart without checkout or payment processing. The repository contains the application and grading artifacts; each person running it supplies their own data pack and private `.env`.
