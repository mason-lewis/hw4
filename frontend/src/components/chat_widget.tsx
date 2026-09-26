import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useChatSearch } from "../lib/chat_search_context";
import { useAuth } from "../lib/auth_context";
import type { ChatPageContext, ChatProductCard, ChatTurn } from "../types";
import { getChatHistory, sendChatMessage } from "../lib/api";
import { MarkdownMessage } from "./markdown_message";
import { BulldogIllustration } from "./bulldog_illustration";

type ChatEntry = {
  id: string;
  from: "shop" | "visitor";
  text: string;
  products?: ChatProductCard[];
};

const welcomeMessage: ChatEntry = { id: "welcome", from: "shop", text: "Hi there! I’m your Campus Customs shop guide. What are you looking for today?" };
const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function pageContextForPath(pathname: string): ChatPageContext {
  const path = pathname.replace(/\/+$/, "") || "/";
  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    try {
      return { page_type: "product", product_id: decodeURIComponent(productMatch[1]) };
    } catch {
      return { page_type: "product" };
    }
  }
  if (path === "/") return { page_type: "home" };
  if (path === "/products") return { page_type: "products" };
  if (path === "/about") return { page_type: "about" };
  if (path === "/login") return { page_type: "login" };
  if (path === "/create-account") return { page_type: "create-account" };
  return { page_type: "other" };
}

export function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showResults } = useChatSearch();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([welcomeMessage]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    if (!user) {
      setMessages([welcomeMessage]);
      setHistoryLoading(false);
      return () => { active = false; };
    }

    setHistoryLoading(true);
    getChatHistory()
      .then(({ messages: savedMessages }) => {
        if (!active) return;
        setMessages([
          welcomeMessage,
          ...savedMessages.map((entry) => ({
            id: `saved-${entry.id}`,
            from: entry.role === "user" ? "visitor" as const : "shop" as const,
            text: entry.content,
            products: entry.products,
          })),
        ]);
      })
      .catch(() => {
        if (active) setMessages([welcomeMessage, {
          id: "history-error",
          from: "shop",
          text: "I couldn’t load your earlier messages, but we can keep chatting.",
        }]);
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    setMessages((current) => [...current, { id: `visitor-${Date.now()}`, from: "visitor", text: message }]);
    setDraft("");
    setSending(true);
    const history: ChatTurn[] = messages
      .filter((entry) => entry.id !== "welcome")
      .slice(-10)
      .map((entry) => ({ role: entry.from === "visitor" ? "user" : "assistant", content: entry.text }));
    try {
      const result = await sendChatMessage(message, history, pageContextForPath(location.pathname));
      showResults(message, result.products);
      setMessages((current) => [...current, { id: `shop-${Date.now()}`, from: "shop", text: result.reply, products: result.products }]);
      const isProductDetail = /^\/products\/[^/]+\/?$/.test(location.pathname);
      if (result.products.length && !isProductDetail) navigate("/products");
    } catch {
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        from: "shop",
        text: "I’m having trouble reaching the shop assistant right now. Please try again in a moment.",
      }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Campus Customs chat">
          <div className="chat-panel-header">
            <div className="chat-agent-avatar"><BulldogIllustration /></div>
            <div><strong>Campus Customs</strong><span><i className="chat-online-dot" /> Shop guide · here to help</span></div>
            <button className="chat-close" type="button" aria-label="Close chat" onClick={() => setOpen(false)}><X size={19} /></button>
          </div>
          <div className="chat-transcript" ref={transcriptRef} aria-live="polite">
            <span className="chat-date">TODAY · CAMPUS CUSTOMS</span>
            {messages.map((message) => (
              <div className={`chat-entry ${message.from}`} key={message.id}>
                <div className={`chat-message ${message.from}`}>
                  {message.from === "shop" ? <MarkdownMessage content={message.text} /> : message.text}
                </div>
                {Boolean(message.products?.length) && <div className="chat-product-cards">
                  {message.products?.slice(0, 3).map((product) => {
                    const availableSizes = product.inventory.filter((stock) => stock.quantity > 0).map((stock) => stock.size);
                    const stockText = product.total_stock > 0
                      ? `${availableSizes.join(", ")} · ${product.total_stock} in stock`
                      : "Currently out of stock";
                    return <Link className="chat-product-card" to={`/products/${encodeURIComponent(product.product_id)}`} key={product.product_id}>
                      <img src={product.image_url} alt="" />
                      <span className="chat-product-card-copy">
                        <strong>{product.name}</strong>
                        <span>{priceFormatter.format(product.price)}</span>
                        <small className="chat-product-description">{product.description}</small>
                        <small>{stockText}</small>
                      </span>
                    </Link>;
                  })}
                </div>}
                {Boolean(message.products && message.products.length > 3) && <Link className="chat-product-results-link" to="/products">View all {message.products?.length} matches</Link>}
              </div>
            ))}
            {sending && <div className="chat-message shop typing"><span className="typing-label">Checking the collection</span><span className="typing-dots" aria-label="Assistant is thinking"><i /><i /><i /></span></div>}
          </div>
          <form className="chat-compose" onSubmit={submitMessage}>
            <label className="sr-only" htmlFor="chat-message">Write a message</label>
            <input id="chat-message" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder={historyLoading ? "Loading your chat…" : "Ask us anything…"} />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || sending || authLoading || historyLoading}><Send size={17} /></button>
          </form>
          <p className="chat-powered">A friendly shop guide · details from the live collection</p>
        </section>
      )}
      <button className={`chat-launcher${open ? " is-open" : ""}`} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close chat" : "Open chat"}>
        {open ? <X size={22} /> : <><MessageCircle size={21} /><span>Ask the shop</span></>}
      </button>
    </div>
  );
}
