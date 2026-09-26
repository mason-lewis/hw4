# Campus Customs Harness

## Executive summary

Campus Customs is a React storefront backed by a FastAPI service. The website reads product, stock, account, cart, and chat-history data from SQLite. Its floating chat widget sends customer messages to a Pydantic AI agent, which can look up catalog facts and return typed product cards for the page to render.

### System at a glance

| Area | Current design |
|---|---|
| Front end | React, TypeScript, and Vite in `frontend/`; the development site runs at `http://localhost:5173`. Vite proxies `/api` and `/images` to FastAPI. |
| Back end | FastAPI in `backend/main.py`; run Uvicorn from `backend/` on port 8000. |
| Agent model | `gpt-6-luna` through OpenAI Chat Completions routed by Portkey. Pydantic AI loads the shared agent and `prompts/prompt.md` when `main.py` imports `agent.py`. Reasoning effort is `none`; the provider client timeout is 35 seconds with one transport retry. |
| Structured response | `AgentReply` contains a customer-facing `reply` and up to eight typed `ProductCard` results. The `/api/chat` response adds input, output, and total token counts. |
| Catalog tools | `search_products` searches catalog text and returns up to eight products with current stock. `get_product_details` looks up one exact product ID and its size-level inventory. Both use read-only SQLite connections. |
| Safety | The prompt treats customer messages, history, page context, and catalog text as untrusted data; requires database verification for product facts; protects account data; and limits the agent to read-only shopping assistance. |
| Per-run limits | At most four Pydantic AI model requests and six successful function-tool calls per `/api/chat` run. `AgentReply.products` and catalog search results are capped at eight. The agent has one validation/tool retry. |
| Audit | `output/audit_trail.json` is append-only JSON Lines: one compact JSON record per line for each run and tool event. It records summaries and stop reasons, not raw chat text or customer identifiers. |

### Manager's run guide

Start the back end in one terminal:

```sh
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Start the front end in a second terminal:

```sh
cd frontend
npm install  # first run only
npm run dev
```

The front end prints its local URL, normally `http://localhost:5173`. For a fresh clone, first place the local data pack in `data/`, install dependencies from the root `requirements.txt`, and copy `.env.example` to `.env`; see [README.md](../README.md). Set `PORTKEY_API_KEY` in the process environment or the repository-root `.env` file for chat. The parent `school-projects/.env` remains a fallback for the original workspace. Keep provider and session secrets on the server.

### Chat request and response limits

| Spec | Limit or behavior |
|---|---|
| Chat route | `POST /api/chat`; the browser sends a message, at most ten recent guest-history turns, and typed page context. Signed-in history is loaded server-side. |
| Input size | A chat message is 1–1,000 characters. Each history turn is at most 2,000 characters; the request accepts at most ten turns. |
| Model loop | `UsageLimits(request_limit=4, tool_calls_limit=6)` applies independently to each agent run. Pydantic AI counts model requests toward the first cap and successful tool calls toward the second; failed calls still consume request turns. `retries=1` allows one retry for invalid tool/output arguments. |
| Search/results | `search_products` clamps its result limit to 1–8. `AgentReply.products`, `ChatReply.products`, and stored product-card history are each capped at eight products. |
| Persistent history | `GET /api/chat/history` returns at most 100 messages. The agent gets up to ten recent saved messages for a signed-in shopper. Guest history stays in the browser. |
| Reply size | The agent reply is 1–2,000 characters. Product descriptions and stock values come from the current catalog/database records. |
| Audit events | Each event includes UTC `time`, `run_id`, `event`, `tool_name`, short `arguments` and `result` objects, and `stop_reason`. A run ID is random and is not associated with a user ID. |

The request/tool limits use Pydantic AI's documented [`UsageLimits`](https://pydantic.dev/docs/ai/api/pydantic-ai/usage/) behavior. Failed tools are recorded with their exception class only; they do not add raw exception text to the audit file.

## Database inventory

This document records the current database structure and why each field matters to the shop or its chatbot.

Database inspected: `data/campus_customs.db`.

## Application tables

### `catalogue` — product catalog

Current snapshot: 102 products. `colors` and `search_tags` contain valid JSON arrays in all 102 rows.

| Field | Why it matters |
|---|---|
| `product_id` (`TEXT`, primary key) | Stable product identifier used to retrieve a product and connect it to its inventory. |
| `name` (`TEXT`, required) | Customer-facing product name for search results, recommendations, and order review. |
| `garment_type` (`TEXT`, required) | Lets the shop and chatbot filter or describe items such as hoodies, T-shirts, and crewnecks. |
| `description` (`TEXT`, required) | Supplies product details the chatbot can use to answer questions and explain recommendations. |
| `colors` (`TEXT`, required; JSON array in the current data) | Supports color filters and accurate answers about available product colors. Parse this as JSON rather than treating it as a single color string. |
| `search_tags` (`TEXT`, required; JSON array in the current data) | Gives search and retrieval extra terms for teams, styles, and phrases customers may use. |
| `image_file_path` (`TEXT`, required) | Points the shop UI to the product image to display alongside catalog results. |
| `price` (`REAL`, required) | Supports price display, sorting, filtering, and recommendations within a budget. The database does not specify a currency. |

### `inventory` — stock by product and size

Current snapshot: 612 rows across all 102 catalog products. The `(product_id, size)` pair is unique, so each product has at most one row per size.

| Field | Why it matters |
|---|---|
| `id` (`INTEGER`, primary key, autoincrement) | Identifies an inventory row for internal updates and references. |
| `product_id` (`TEXT`, required, foreign key to `catalogue.product_id`) | Connects each stock record to the product customers see. |
| `size` (`TEXT`, required) | Lets customers find the right size and lets the shop show stock at that size. The schema does not constrain the allowed size labels. |
| `quantity` (`INTEGER`, required) | Drives in-stock status and availability answers. Current quantities are nonnegative, but the schema has no constraint preventing negative values. |

### `users` — customer accounts

Current snapshot: 3 seed rows. `first_name` and `last_name` are nullable in the original schema, though both are populated in the current rows. Problem 4 adds registration and login through the FastAPI backend.

| Field | Why it matters |
|---|---|
| `id` (`INTEGER`, primary key, autoincrement) | Internal account identifier and the key used to associate a user's chat messages with their account. |
| `name` (`TEXT`, required) | Stores a display or full name for account-facing shop features and, when appropriate, a greeting. |
| `email` (`TEXT`, required, unique) | Identifies an account for sign-in and account communication; it is personal data and should only be exposed to the chatbot when needed. |
| `password_hash` (`TEXT`, required) | Stores the encoded password verifier used by the backend; it must never be returned to the browser, sent to a model, or included in chat context. |
| `created_at` (`TEXT`, required, defaults to SQLite `datetime('now')`) | Records when the account was created, useful for account support and lifecycle features. |
| `first_name` (`TEXT`, nullable) | Provides a structured first name for optional personalization without parsing `name`. |
| `last_name` (`TEXT`, nullable) | Provides a structured last name for account display and support workflows. |

#### Authentication behavior

- Registration collects `first_name`, `last_name`, `email`, `password`, and `confirm_password`. The backend trims names, normalizes email to lowercase, requires a valid email, and enforces an 8–128 character password. Confirmation is checked by the backend and is never stored.
- New accounts are inserted into this existing table. `name` receives the combined first and last names, and the separate name fields are populated for structured display. The email is unique in the current database schema.
- The raw password is never stored. `password_hash` contains a PHC-encoded Argon2id verifier generated with `pwdlib[argon2]`; the encoded value carries Argon2 parameters and a per-password random salt. There is no separate salt column. Password verification uses the encoded verifier, and API responses omit it.
- Argon2id is the password-hashing choice recommended by the [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); FastAPI's security tutorial also demonstrates `pwdlib` for password verification.
- The seed test account uses the database's legacy `pbkdf2_sha256` encoding with 120,000 PBKDF2-HMAC-SHA256 rounds. Successful login verifies this legacy value and replaces it with an Argon2id verifier. Newly registered users use Argon2id immediately.
- Successful registration or login creates a seven-day signed session cookie containing the user ID. The cookie is HttpOnly and SameSite=Lax; set `CAMPUS_CUSTOMS_COOKIE_SECURE=true` when serving over HTTPS. Set a stable, private `CAMPUS_CUSTOMS_SESSION_SECRET` in deployment; the development fallback is random per process and causes sessions to expire on restart.
- `POST /api/auth/register` and `POST /api/auth/login` create sessions; `GET /api/auth/me` returns only the account ID, first name, last name, and email; `POST /api/auth/logout` clears the session. Invalid login attempts use a generic error message.
- Email verification, password reset, and login rate limiting are outside this problem's current flow.

### `chat_messages` — conversation history

Current snapshot: 20 messages, with 10 `user` and 10 `assistant` roles. Ten rows have `products_json`, each valid JSON with an array at its top level. The six preloaded example messages for the test account were removed in Problem 9; see the usability notes below.

| Field | Why it matters |
|---|---|
| `id` (`INTEGER`, primary key, autoincrement) | Identifies a message for history retrieval and internal updates. |
| `user_id` (`INTEGER`, required, foreign key to `users.id`) | Associates a message with the account whose conversation it belongs to. |
| `role` (`TEXT`, required) | Distinguishes customer messages from assistant replies when rebuilding conversation context. Current values are `user` and `assistant`. |
| `content` (`TEXT`, required) | Holds a user's message or the assistant's reply for transcript display and relevant chat context. Treat it as customer content and apply appropriate privacy and retention rules. |
| `products_json` (`TEXT`, nullable) | Stores the assistant's structured product cards as a JSON array so previously shown matches can be restored with the transcript. User-message rows leave it null. |
| `created_at` (`TEXT`, required, defaults to SQLite `datetime('now')`) | Records when a message was sent; `id` provides stable insertion order when loading a transcript. |

### `cart_items` — saved account cart

This table is created automatically by FastAPI on startup so an existing seed database can support saved carts. One row represents a product and size in one account's cart.

| Field | Why it matters |
|---|---|
| `user_id` (`INTEGER`, required, foreign key to `users.id`) | Scopes the saved cart to its owner and allows the cart to be removed with a deleted account. |
| `product_id` (`TEXT`, required, foreign key to `catalogue.product_id`) | Connects the cart line to the current catalog name, image, description, and price. |
| `size` (`TEXT`, required) | Distinguishes cart lines for different sizes of the same product. |
| `quantity` (`INTEGER`, required, positive) | Tells the shop how many units the shopper wants; the API checks it against current stock. |
| `created_at` (`TEXT`, required, defaults to SQLite `datetime('now')`) | Supports stable cart line ordering. |
| `updated_at` (`TEXT`, required, defaults to SQLite `datetime('now')`) | Records the most recent quantity change for the line. |

The `(user_id, product_id, size)` primary key prevents duplicate lines for the same product and size within one account. Prices and stock are read from `catalogue` and `inventory` whenever the cart is loaded; totals are calculated from the current catalog price rather than stored as stale cart data.

## SQLite internal table

### `sqlite_sequence`

SQLite maintains this metadata table for tables that use `AUTOINCREMENT`; it is not shop or chatbot data.

| Field | Why it matters |
|---|---|
| `name` | Names the table whose autoincrement sequence is tracked. |
| `seq` | Stores the largest generated integer key for that table so future keys continue increasing. |

## Schema notes for later problems

- The database has foreign keys from `inventory.product_id` to `catalogue.product_id`, and from `chat_messages.user_id` to `users.id`.
- `catalogue.price` has no currency field, so the shop needs a separate agreed currency for display and calculations.
- Inventory rows are unique per product and size, but the schema does not enforce nonnegative quantities or a fixed size vocabulary.
- The schema stores account credentials and chat transcripts together with shop data. Chatbot context should include only the customer and conversation details needed for the current request; `password_hash` should never enter that context.

## Problem 3 — Storefront and API scaffold

- **Front end:** React, Vite, TypeScript, and React Router live in `frontend/`. The public pages are Home, Products, About Us, Login, and Create Account; each product has its own `/products/{product_id}` page.
- **Product API:** `backend/main.py` provides `GET /api/products`, `GET /api/products/{product_id}`, and `GET /api/health`. Catalog and stock data come from SQLite through a read-only connection.
- **Python environment:** the API uses Python 3.14.6 in `backend/.venv`; its direct dependencies are declared in `backend/requirements.txt`. The project `.gitignore` excludes the environment.
- **Price display:** the storefront formats catalog prices as U.S. dollars, matching Yale Bulldog Blue's published shop terms; the database itself has no currency column.
- **Product images:** the API serves the database's `image_file_path` assets through `/images/{filename}`. Vite proxies both `/api` and `/images` to the local FastAPI service.
- **Chat:** the floating chat panel now sends messages to the Pydantic AI route described under Problem 5 and renders returned product cards.
- **Accounts:** Login and Create Account were scaffolded in Problem 3 and are now connected to the registration and session API described above under Problem 4.
- **Copy direction:** Home and About Us use original copy informed by Yale Bulldog Blue's official merchandise, campus categories, and New Haven storefront. See [Yale Bulldog Blue](https://yalebulldogblue.com/).

## Problem 5 — Pydantic AI shop assistant

### Front end to FastAPI

- The widget calls `sendChatMessage()` in `frontend/src/lib/api.ts`, which posts JSON to `POST /api/chat` through Vite's `/api` proxy.
- The request includes the current `message`, up to ten recent `{role, content}` turns, and typed page context. For logged-in users, FastAPI uses the database transcript as authoritative conversation history; guests use the request's in-memory history.
- The response contains `reply`, up to eight structured `products` cards, and input/output token usage. Product cards carry catalog description, price, image URL, color, size-level stock, and total stock for the widget and Products page to render and link to the matching item page.
- The widget reloads saved messages for an authenticated user from `GET /api/chat/history`. Problem 8 describes account-scoped persistence and guest behavior below.

### Agent loading and tools

- Run the API from the `backend/` directory with `uvicorn main:app --reload --port 8000`. `main.py` imports the shared `shop_agent` from `agent.py` once when the module loads.
- `agent.py` reads `prompts/prompt.md`, configures the `gpt-6-luna` OpenAI model through Portkey, and registers the read-only product tools from `tools.py`. The model uses OpenAI Chat Completions with reasoning effort set to `none`, which [Pydantic AI documents as required for GPT-6 Luna function calls on Chat Completions](https://pydantic.dev/docs/ai/models/openai/).
- `tools.py` exposes two database-backed tools. Both use read-only SQLite connections, so the agent cannot edit accounts, products, or stock.
  - `search_products(query, limit)` matches the query against `catalogue.name`, `garment_type`, `description`, `colors`, and `search_tags`. These fields let natural-language product requests find likely catalog matches. For each match it loads the canonical product record and its `inventory` rows.
  - `get_product_details(product_id)` retrieves one exact `catalogue.product_id` and its `inventory` rows. The exact ID avoids relying on a fuzzy name match when answering about a specific product or size.
- `models.py` already has the typed lookup results needed; no extra tool or return type was necessary. `ProductCard.product_id` identifies the matched row, while `name`, `garment_type`, and `description` support product identification and customer-facing answers. `price` is the authoritative catalog price, `colors` and `image_url` support accurate options and product cards, and `inventory` contains `StockSize` entries with the exact `size` label and integer `quantity`. `total_stock` is only an aggregate and must not be used to answer availability for one size. Search tags are used for retrieval but are not returned to the model. A returned quantity of zero means that size is out of stock; a missing size entry means availability cannot be confirmed from the database.
- `models.py` also defines the chat request, response, history, usage, and agent dependency types. The chat endpoint reports token counts; it does not estimate dollar cost.
- `agent.py` loads the repository-root `.env` first and the parent school-projects `.env` as a fallback; existing process environment variables take precedence. Keep `PORTKEY_API_KEY` on the server. Configure a stable session secret separately for account authentication.
- Voice and initial safety rules live in `backend/prompts/prompt.md`. Password reset, email verification, rate limiting, durable chat history, and policy tools are not implemented in this problem.

## Problem 7 — Chat search that updates the page

- A customer can ask the chat assistant for a product category or type, such as hoodies. `backend/prompts/prompt.md` directs the agent to search by the core catalog keyword and return the matching structured results in the existing `products` response field.
- `search_products` returns up to eight catalog-backed `ProductCard` values and accounts for common one-word plural requests such as “hoodies” by also matching the singular catalog term. `AgentReply.products` and the `/api/chat` `ChatReply.products` contract carry up to eight results, including each exact `product_id`, name, description, price, image URL, colors, and inventory. The description, image, name, and price provide the product-card content; the ID preserves navigation to the detail route.
- `frontend/src/components/chat_widget.tsx` posts the chat request using `sendChatMessage()` and publishes returned products to `ChatSearchProvider`. When matches arrive, the widget navigates to `/products` unless the shopper is already on a product detail route; React context carries the structured results to `ProductsPage`, which renders them with the same `ProductCard` component used by the catalog.
- Each dynamically rendered card links to `/products/{product_id}`. `ProductPage` continues to load the full product record from `GET /api/products/{product_id}`, so the chat search results open the same large-image, full-detail view as ordinary catalog cards. Customers can clear the chat matches to return to the regular catalog listing.

## Problem 8 — Customer memory

### Chat history storage and reload

- The existing `chat_messages` table stores each logged-in exchange as two rows: one `user` row and one `assistant` row, both keyed to the authenticated `users.id`. The user row stores the message in `content`; the assistant row stores its reply and, when present, the structured product cards in `products_json`. SQLite supplies `created_at`, and insertion `id` preserves transcript order.
- Authentication comes from the signed HttpOnly session cookie. The API resolves its `user_id` against `users` on the server; clients cannot choose a user ID for history reads or writes. After a successful agent response, the API saves both rows in one transaction.
- `GET /api/chat/history` returns the signed-in user's most recent 100 messages, including saved product cards. The chat widget loads these when the session is restored or account login completes and shows them in the transcript. The agent receives the latest ten saved messages as model history on subsequent requests.
- Guests can use the same `/api/chat` route. Their current transcript remains in the browser widget only and is not written to `chat_messages`; the widget resets it when the account session ends.

### Shopper and page context for the agent

- For authenticated requests, `main.py` loads only the account's `name` and `email` and passes them as `AgentDependencies.customer`. `agent.py` adds this profile through a dynamic Pydantic AI instruction function. The model never receives the password hash, session cookie, or user ID. The prompt allows natural use of the shopper's name and treats the email as private.
- `ChatWidget` sends a typed `page_context` with each message: the current page type and, on a product detail route, the current `product_id`. `main.py` resolves that ID against `catalogue` and places the authoritative product record in `AgentDependencies.page_context`; it does not trust product details supplied by the browser.
- This lets the agent resolve phrases such as “Do you have this in pink?” to the product currently on screen. The page context identifies what “this” refers to; the prompt still requires catalog tools for factual answers about the product's colors, price, or inventory.
- The same dependencies work for guests with `customer: null`; their current page context is still passed, so product references work without account memory.

## Problem 9 — Usability improvements

### Front-end improvements

- **Chat Markdown:** `frontend/src/components/markdown_message.tsx` safely renders common Markdown used by assistant replies: paragraphs, headings, bold and italic text, inline code, links, quotations, and ordered or unordered lists. It treats raw HTML as text. This makes product details and multi-step answers easier to scan in the small chat panel.
- **Cart and item count:** the header links to `/cart` and shows the number of units in the cart before the account or login controls. Product detail pages add the selected size and quantity to the cart. The cart view supports quantity changes and removal, and shows each unit price, line total, and overall total. There is no checkout flow yet.
- **Guest and account behavior:** `frontend/src/lib/cart_context.tsx` keeps a guest cart in browser `localStorage`. When a guest signs in or creates an account, the browser cart is merged into the account cart. Signed-in changes go through the cart API, and the account cart reloads when the session returns.
- **Catalog controls:** the Products page sorts by featured order, name ascending or descending, price ascending or descending, or stock level. Filters include garment type, size, and color, and apply to regular catalog cards and chat search matches. Search also checks color names.
- **Product chat continuity:** the chat widget keeps the current `/products/{product_id}` route when a reply includes product matches. The product detail view and its selected product context remain available during the conversation.

### Back-end improvements

- **Saved cart API:** `backend/main.py` creates `cart_items` for authenticated account carts and exposes `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items`, and `DELETE /api/cart/items`. Cart routes use the signed-in session rather than accepting a client-supplied user ID.
- **Stock and totals:** add and quantity-update requests validate the requested size and quantity against the current `inventory` row. The API returns catalog-backed names, image paths, descriptions, unit prices, available quantity, line totals, item count, and cart total. Updates exceeding available stock return a clear conflict response; the browser cart enforces the same limit using the product data it has loaded.
- **Seed transcript cleanup:** the `test@campuscustoms.yale.edu` account had three preloaded example exchanges in `chat_messages`, including the example pink question. Those six demo message rows were removed from the local seed database. They were database transcript examples, not agent system prompts; later account messages remain available to the history endpoint and agent context.

### Why these changes help

Readable assistant formatting helps shoppers scan answers. The cart retains a guest's selections locally and keeps account carts across sessions, while live catalog pricing and inventory help the shopper understand the current cost and availability. Catalog filters and sorts shorten product discovery. Keeping chat on the detail page preserves the item under discussion. Removing the demo transcript prevents sample conversations from being mistaken for the signed-in shopper's own history.

## Problem 10 — Storefront design

- The storefront uses a Yale-inspired palette, Cormorant Garamond and DM Sans typography, clearer product and price hierarchy, and restrained hover motion to make browsing easier to scan.
- Original Handsome Dan SVG illustrations appear across the home, story, product, cart, and chat views. A short, reduced-motion-aware confetti burst and “Added to bag” feedback confirm cart actions. See [design notes](design.md).

## Problem 11 — Site check

- [The app check page](app_check.html) collects screenshots and captions for a database-backed inventory and price answer, dynamic hoodie search cards, and the guest cart usability feature.
- The evidence is stored in `output/app_check_images/` and linked with relative paths so the check page can be opened locally.

## Problem 12 — Agent audit and safety

### Agent loop and audit trail

- `POST /api/chat` assigns a random run ID and appends an `agent_run_started` record before the agent runs. `search_products` and `get_product_details` append a start and completion event; failures append a failure event. The endpoint ends with either `agent_run_completed` or `agent_run_stopped`.
- `output/audit_trail.json` is a JSON Lines file: each line is one complete JSON object. The `.json` filename is retained as requested. The first line marks log initialization; every subsequent run appends new lines. The writer uses append mode, a file lock, `fsync`, and restrictive `0600` file permissions; it never truncates or rewrites existing records.
- Each record has `time` (UTC), `run_id`, `event`, `tool_name`, `arguments`, `result`, and `stop_reason`. Run summaries include request metadata, product count, and token counts. Tool summaries include sanitized search text and limit, exact product IDs, and for detail lookups the current catalog price and stock by size.
- The log omits raw chat messages and replies, customer IDs, names, emails, passwords, session cookies, and provider credentials. Search summaries mask email addresses and phone numbers; queries containing credential labels or API-key patterns are replaced with a redaction marker. Errors record the exception class, not exception text or upstream response bodies. Run IDs are not mapped to accounts.
- Stop reasons currently include `structured_output_returned`, `model_not_configured`, `context_error`, `usage_limit_reached`, `agent_error`, and `request_cancelled`; successful and failed tool calls use `tool_returned` and `tool_error`. If an audit write fails, the request or tool call fails rather than continuing without a record.

### Prompt safety additions

`backend/prompts/prompt.md` now also tells the agent to treat catalog text and tool arguments as data rather than instructions; avoid putting personal details into tool searches; avoid repeated calls; stop when tool or request limits are reached; disclose when a fact could not be verified; and keep prompts, audit records, and provider configuration private. The existing rules still require database lookups for catalog facts, clear zero-stock answers, read-only behavior, and protection of shopper credentials and account data.

### Implementation map

| File | Role |
|---|---|
| `backend/agent.py` | Loads the prompt and shared `gpt-6-luna` agent, registers the two catalog tools, and sets the per-run Pydantic AI limits. |
| `backend/tools.py` | Searches the catalog and retrieves one product with its current size-level stock; emits brief audit events around each lookup. |
| `backend/models.py` | Defines typed chat, product, stock, shopper, page-context, and agent dependency shapes. The audit run ID is an internal dependency and is not included in model instructions. |
| `backend/audit.py` | Serializes and safely appends each audit event to `output/audit_trail.json`. |
| `backend/main.py` | Serves the API, prepares server-verified customer/page context, enforces usage limits, returns typed results, and records run stop/completion events. |
| `backend/prompts/prompt.md` | Defines the customer-facing voice, catalog-grounding requirements, privacy limits, and agent safety rules. |
