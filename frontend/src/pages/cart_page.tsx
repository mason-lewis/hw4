import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { BulldogIllustration } from "../components/bulldog_illustration";
import { useCart } from "../lib/cart_context";
import { imageUrl } from "../lib/api";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function CartPage() {
  const { items, itemCount, total, loading, error, clearError, setQuantity, removeItem } = useCart();

  async function changeQuantity(productId: string, size: string, quantity: number) {
    clearError();
    try {
      await setQuantity(productId, size, quantity);
    } catch {
      // The provider exposes the useful stock or network message below.
    }
  }

  async function remove(productId: string, size: string) {
    clearError();
    try {
      await removeItem(productId, size);
    } catch {
      // The provider exposes the useful network message below.
    }
  }

  return (
    <main className="cart-page page-shell">
      <div className="page-kicker"><span>02</span><span className="page-kicker-rule" /><span>YOUR BAG</span></div>
      <div className="cart-title-row"><div><span className="eyebrow">CAMPUS CUSTOMS</span><h1>Your cart<span>.</span></h1></div><Link className="back-link" to="/products"><ArrowLeft size={16} /> Continue shopping</Link></div>
      {error && <p className="cart-error" role="status">{error}</p>}
      {loading ? <div className="cart-loading">Loading your cart…</div> : !items.length ? (
        <div className="cart-empty"><BulldogIllustration className="cart-empty-mascot" /><span className="eyebrow">NOTHING IN YOUR BAG YET</span><h2>Find a campus favorite.</h2><p>Your cart is ready when you are.</p><Link className="button button-blue" to="/products">Browse the collection</Link></div>
      ) : (
        <div className="cart-layout">
          <section className="cart-lines" aria-label="Cart items">
            <div className="cart-list-header"><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span><span>PRICE</span></div>
            {items.map((item) => (
              <article className="cart-line" key={`${item.product_id}-${item.size}`}>
                <Link className="cart-line-image" to={`/products/${encodeURIComponent(item.product_id)}`}><img src={imageUrl(item.image_url)} alt={item.name} /></Link>
                <div className="cart-line-copy">
                  <Link to={`/products/${encodeURIComponent(item.product_id)}`}><h2>{item.name}</h2></Link>
                  <p>{item.description}</p>
                  <span className="cart-line-size">Size: {item.size}</span>
                  <div className="cart-line-controls">
                    <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => void changeQuantity(item.product_id, item.size, item.quantity - 1)}><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={item.quantity >= item.available_quantity} onClick={() => void changeQuantity(item.product_id, item.size, item.quantity + 1)}><Plus size={13} /></button>
                    </div>
                    <button className="cart-remove" type="button" onClick={() => void remove(item.product_id, item.size)}><Trash2 size={14} /> Remove</button>
                  </div>
                  {item.quantity > item.available_quantity && <small className="cart-stock-warning">Only {item.available_quantity} currently available. Reduce the quantity to continue.</small>}
                </div>
                <div className="cart-line-prices"><span>{money.format(item.price)} each</span><strong>{money.format(item.line_total)}</strong></div>
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <span className="eyebrow">ORDER SUMMARY</span>
            <div><span>Items ({itemCount})</span><strong>{money.format(total)}</strong></div>
            <div className="cart-total-row"><span>Total</span><strong>{money.format(total)}</strong></div>
            <p>Checkout is not available yet. Your cart will stay saved with your account.</p>
            <Link className="button button-dark" to="/products">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
