# Campus Customs Usability Improvements

Problem 9 adds the following improvements to help shoppers find products, understand assistant replies, and keep track of the items they want.

## Front-end improvements

### Chat replies render as Markdown

Assistant messages now display paragraphs, headings, bold and italic text, inline code, links, block quotes, and ordered or unordered lists. Raw HTML is displayed as text rather than interpreted. This makes prices, product comparisons, and longer answers easier to scan in the chat panel.

### Cart for guests and signed-in shoppers

The header shows a shopping bag icon and item count beside the account controls. Product detail pages can add the selected size and quantity to the cart. The `/cart` page lets shoppers change quantities and remove lines, and it shows the unit price, each line's total, and the whole cart total. Guest carts stay in this browser; account carts are saved by the backend and restored after the shopper signs in again. Signing in merges the browser's guest items into the account cart. Checkout is not included yet.

This gives shoppers a way to collect products while browsing and makes the cost of each selection and the combined cart visible before checkout exists.

### Sort and filter the catalog

The Products page can sort by featured order, name A–Z or Z–A, price low-to-high or high-to-low, and stock level. Shoppers can filter by garment type, size, and color, and search text also matches color names. The controls apply to the regular catalog and the product cards returned by chat search.

These controls make it easier to narrow a 100-plus-item collection to relevant colors, sizes, or price points.

### Stay on the product being discussed

When the agent returns product matches while a shopper is on a product detail page, the site keeps that detail route open. The shopper can continue reading the item's details and stock while asking follow-up questions about it.

### Remove seeded example chat from the test account

The preloaded example conversation was removed from the test user's visible transcript. It included the pink availability question, which was sample database history rather than an agent system prompt or a message the shopper had sent. Later conversations remain available as account history.

This prevents the demo data from being mistaken for a shopper's own conversation.

## Back-end improvements

### Persistent account cart API

FastAPI creates a `cart_items` table on startup. Authenticated cart routes read and change only the cart for the current signed-in session:

- `GET /api/cart` loads the saved cart.
- `POST /api/cart/items` adds a product, size, and quantity.
- `PATCH /api/cart/items` changes a line quantity.
- `DELETE /api/cart/items?product_id=…&size=…` removes a line.

The database key `(user_id, product_id, size)` keeps each product-size combination to one line per account. Guest carts remain in browser storage until the shopper signs in, when the front end submits those lines to this API.

Account carts survive browser sessions, and the server derives cart ownership from the session cookie instead of a user ID supplied by the browser.

### Verify cart quantities against live stock

The API checks each requested size against the `inventory` table before adding or updating a line. It returns a clear error if the product or size is no longer available or the requested quantity exceeds stock. Current name, description, image, and unit price are read from `catalogue`; line totals and the cart total are calculated from that price when the cart is returned.

This helps prevent the cart from presenting a quantity the shop cannot currently supply and keeps displayed amounts tied to the catalog.
