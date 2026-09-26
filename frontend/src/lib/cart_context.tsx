import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth_context";
import { addCartItem, deleteCartItem, getCart, updateCartItem } from "./api";
import type { CartLine, CartReply, Product } from "../types";

const GUEST_CART_KEY = "campus-customs-guest-cart";

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addItem: (product: Product, size: string, quantity: number) => Promise<void>;
  setQuantity: (productId: string, size: string, quantity: number) => Promise<void>;
  removeItem: (productId: string, size: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readGuestCart(): CartLine[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(GUEST_CART_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is CartLine =>
      typeof item === "object" && item !== null &&
      typeof item.product_id === "string" && typeof item.name === "string" &&
      typeof item.image_url === "string" && typeof item.description === "string" &&
      typeof item.price === "number" && typeof item.size === "string" &&
      typeof item.quantity === "number" && typeof item.available_quantity === "number" &&
      typeof item.line_total === "number",
    );
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartLine[]) {
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function fromReply(reply: CartReply): CartLine[] {
  return reply.items;
}

function localCartSummary(items: CartLine[]): CartReply {
  const normalized = items.map((item) => ({ ...item, line_total: Math.round(item.price * item.quantity * 100) / 100 }));
  return {
    items: normalized,
    item_count: normalized.reduce((count, item) => count + item.quantity, 0),
    total: Math.round(normalized.reduce((sum, item) => sum + item.line_total, 0) * 100) / 100,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accountCartLoads = useRef(new Map<number, Promise<{ reply: CartReply; skippedGuestItems: boolean }>>());

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    setError(null);

    if (!user) {
      setItems(readGuestCart());
      setLoading(false);
      return () => { active = false; };
    }

    let load = accountCartLoads.current.get(user.id);
    if (!load) {
      load = (async () => {
        let reply = await getCart();
        const guestItems = readGuestCart();
        let skippedGuestItems = false;
        for (const item of guestItems) {
          try {
            reply = await addCartItem(item.product_id, item.size, item.quantity);
          } catch {
            skippedGuestItems = true;
          }
        }
        window.localStorage.removeItem(GUEST_CART_KEY);
        return { reply, skippedGuestItems };
      })();
      accountCartLoads.current.set(user.id, load);
    }
    const pendingLoad = load;
    void pendingLoad
      .then(({ reply, skippedGuestItems }) => {
        if (!active) return;
        setItems(fromReply(reply));
        if (skippedGuestItems) setError("Some guest cart items could not be saved because their size is no longer available.");
      })
      .catch(() => {
        if (active) setError("We couldn’t load your saved cart. Please refresh and try again.");
      })
      .finally(() => {
        if (accountCartLoads.current.get(user.id) === pendingLoad) accountCartLoads.current.delete(user.id);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  async function addItem(product: Product, size: string, quantity: number) {
    const stock = product.inventory.find((entry) => entry.size === size)?.quantity ?? 0;
    if (stock < 1) throw new Error(`Size ${size} is out of stock.`);
    const line: CartLine = {
      product_id: product.product_id,
      name: product.name,
      image_url: product.image_url,
      description: product.description,
      price: product.price,
      size,
      quantity,
      available_quantity: stock,
      line_total: Math.round(product.price * quantity * 100) / 100,
    };
    setError(null);
    if (user) {
      try {
        setItems(fromReply(await addCartItem(product.product_id, size, quantity)));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Could not add that item to the cart.";
        setError(message);
        throw new Error(message);
      }
      return;
    }
    const existing = items.find((item) => item.product_id === product.product_id && item.size === size);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > stock) throw new Error(`Only ${stock} are available in size ${size}.`);
    const next = existing
      ? items.map((item) => item.product_id === product.product_id && item.size === size ? { ...item, quantity: nextQuantity } : item)
      : [...items, line];
    const summary = localCartSummary(next);
    setItems(summary.items);
    saveGuestCart(summary.items);
  }

  async function setQuantity(productId: string, size: string, quantity: number) {
    setError(null);
    if (user) {
      try {
        setItems(fromReply(await updateCartItem(productId, size, quantity)));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Could not update that cart item.";
        setError(message);
        throw new Error(message);
      }
      return;
    }
    const current = items.find((item) => item.product_id === productId && item.size === size);
    if (!current) throw new Error("That item is no longer in your cart.");
    if (quantity < 1 || quantity > current.available_quantity) {
      throw new Error(`Only ${current.available_quantity} are available in size ${size}.`);
    }
    const next = items.map((item) => item.product_id === productId && item.size === size
      ? { ...item, quantity, line_total: item.price * quantity }
      : item);
    const summary = localCartSummary(next);
    setItems(summary.items);
    saveGuestCart(summary.items);
  }

  async function removeItem(productId: string, size: string) {
    setError(null);
    if (user) {
      try {
        setItems(fromReply(await deleteCartItem(productId, size)));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Could not remove that cart item.";
        setError(message);
        throw new Error(message);
      }
      return;
    }
    const summary = localCartSummary(items.filter((item) => !(item.product_id === productId && item.size === size)));
    setItems(summary.items);
    saveGuestCart(summary.items);
  }

  const summary = useMemo(() => localCartSummary(items), [items]);
  const value = useMemo(() => ({
    items,
    itemCount: summary.item_count,
    total: summary.total,
    loading,
    error,
    clearError: () => setError(null),
    addItem,
    setQuantity,
    removeItem,
  }), [items, summary.item_count, summary.total, loading, error, user?.id]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}
