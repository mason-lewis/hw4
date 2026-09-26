import { ArrowLeft, Check, Heart, Minus, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, imageUrl } from "../lib/api";
import { useCart } from "../lib/cart_context";
import { BulldogIllustration } from "../components/bulldog_illustration";
import type { Product } from "../types";

export function ProductPage() {
  const { productId = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [bagMessage, setBagMessage] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    setError(false);
    getProduct(productId)
      .then((item) => { setProduct(item); setSelectedSize(""); setQuantity(1); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <main className="product-detail-page page-shell"><div className="product-detail-skeleton" /></main>;
  if (error || !product) return <main className="not-found page-shell"><span className="eyebrow">PRODUCT NOT FOUND</span><h1>That piece is off the rack.</h1><Link className="button button-blue" to="/products">Back to products</Link></main>;

  const selectedInventory = product.inventory.find((item) => item.size === selectedSize);
  const maxQuantity = selectedInventory?.quantity ?? 1;

  async function addToBag() {
    if (!product || !selectedSize || !selectedInventory || selectedInventory.quantity < 1) return;
    setBagMessage("");
    try {
      await addItem(product, selectedSize, quantity);
      setAdded(true);
      setCelebrating(true);
      setBagMessage(`${product.name}, size ${selectedSize}, added to your cart.`);
      window.setTimeout(() => setAdded(false), 2200);
      window.setTimeout(() => setCelebrating(false), 950);
    } catch (error) {
      setBagMessage(error instanceof Error ? error.message : "Could not add this item to your cart.");
      setAdded(false);
    }
  }

  return (
    <main className="product-detail-page page-shell">
      <Link className="back-link" to="/products"><ArrowLeft size={16} /> Back to the collection</Link>
      <div className="product-detail-grid">
        <div className="detail-image-column">
          <div className="detail-image"><img src={imageUrl(product.image_url)} alt={product.name} /></div>
          <div className="detail-image-caption"><span>YALE BULLDOG BLUE</span><span>PRODUCT NO. {product.product_id.slice(0, 8).toUpperCase()}</span></div>
        </div>
        <div className="detail-copy">
          <div className="detail-breadcrumb"><Link to="/products">SHOP</Link><span>/</span><span>{product.garment_type.toUpperCase()}</span></div>
          <span className="eyebrow">CAMPUS CUSTOMS SELECTION</span>
          <h1>{product.name}</h1>
          <div className="detail-price-row"><strong>${product.price.toFixed(2)}</strong><span className={`availability${product.total_stock === 0 ? " unavailable" : ""}`}><i />{product.total_stock > 0 ? "Available now" : "Currently unavailable"}</span></div>
          <p className="detail-description">{product.description}</p>

          {product.colors.length > 0 && <div className="detail-colors"><span className="detail-label">COLORS</span><div>{product.colors.map((color) => <span className="color-chip" key={color}>{color}</span>)}</div></div>}

          <div className="size-selector">
            <div className="size-label-row"><span className="detail-label">SIZE</span><span className="size-help">Stock shown by size</span></div>
            <div className="size-options">
              {product.inventory.map((item) => (
                <button
                  className={`size-option${selectedSize === item.size ? " selected" : ""}${item.quantity === 0 ? " unavailable" : ""}`}
                  key={item.size}
                  type="button"
                  disabled={item.quantity === 0}
                  onClick={() => { setSelectedSize(item.size); setQuantity(1); setAdded(false); setBagMessage(""); }}
                  aria-label={`${item.size}, ${item.quantity > 0 ? `${item.quantity} in stock` : "out of stock"}`}
                >
                  <strong>{item.size}</strong><small>{item.quantity > 0 ? `${item.quantity} left` : "Out"}</small>
                </button>
              ))}
            </div>
            {!selectedSize && <p className="size-hint">Choose a size to see your availability.</p>}
          </div>

          <div className="detail-actions">
            <div className="quantity-stepper" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14} /></button>
              <span>{quantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={!selectedSize || quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}><Plus size={14} /></button>
            </div>
            <div className="cart-celebration-wrap">
              {celebrating && <span className="cart-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => {
                const angle = (index / 14) * Math.PI * 2;
                const style = {
                  "--burst-x": `${Math.cos(angle) * (38 + (index % 3) * 9)}px`,
                  "--burst-y": `${Math.sin(angle) * (26 + (index % 4) * 5)}px`,
                  "--confetti-color": ["#d8e89b", "#9ac4e8", "#f3ba70", "#e98d8d"][index % 4],
                  "--confetti-delay": `${(index % 4) * 20}ms`,
                } as CSSProperties;
                return <i key={index} style={style} />;
              })}</span>}
              <button className="button button-blue add-to-bag" type="button" onClick={addToBag} disabled={!selectedInventory || selectedInventory.quantity === 0}>
                {added ? <><Check size={17} /> Added to bag</> : "Add to bag"}
              </button>
            </div>
            <button className="favorite-button" type="button" aria-label="Save to favorites" onClick={(event) => event.currentTarget.classList.toggle("saved")}><Heart size={19} /></button>
          </div>
          <p className="bag-note" role="status">{bagMessage || (selectedInventory ? `${selectedInventory.quantity} available in size ${selectedSize}` : "Select a size to check stock")}</p>

          <div className="detail-assurances"><span><ShieldCheck size={16} /> Official Yale merchandise</span><span><Check size={16} /> Stock updates from our catalog</span></div>
          <div className="detail-tags"><span className="detail-label">EXPLORE</span>{product.search_tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="detail-mascot-note"><BulldogIllustration /><span><strong>Good choice.</strong><small>Selected with Bulldog pride in New Haven.</small></span></div>
        </div>
      </div>
    </main>
  );
}
