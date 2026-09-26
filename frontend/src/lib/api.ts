import type { CartReply, ChatPageContext, ChatReply, ChatHistoryReply, ChatTurn, Product } from "../types";

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export type RegisterDetails = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type LoginDetails = {
  email: string;
  password: string;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

export function getProduct(productId: string): Promise<Product> {
  return request<Product>(`/api/products/${encodeURIComponent(productId)}`);
}

async function jsonRequest<T>(path: string, body?: object, method?: "GET" | "POST" | "PATCH" | "DELETE"): Promise<T> {
  const response = await fetch(path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validationMessage = Array.isArray(data.detail)
      ? data.detail.find((item: unknown) => typeof item === "object" && item !== null && "msg" in item)?.msg
      : undefined;
    const detail = typeof data.detail === "string"
      ? data.detail
      : typeof validationMessage === "string"
        ? validationMessage
        : "Please try again.";
    throw new Error(detail);
  }
  return data as T;
}

export function createAccount(details: RegisterDetails): Promise<AuthUser> {
  return jsonRequest<AuthUser>("/api/auth/register", details);
}

export function login(details: LoginDetails): Promise<AuthUser> {
  return jsonRequest<AuthUser>("/api/auth/login", details);
}

export function getCurrentUser(): Promise<AuthUser | null> {
  return jsonRequest<AuthUser | null>("/api/auth/me");
}

export function logout(): Promise<{ status: string }> {
  return fetch("/api/auth/logout", { method: "POST" }).then(async (response) => {
    if (!response.ok) throw new Error("Could not sign out. Please try again.");
    return response.json();
  });
}

export function sendChatMessage(
  message: string,
  history: ChatTurn[] = [],
  pageContext: ChatPageContext = { page_type: "other" },
): Promise<ChatReply> {
  return jsonRequest<ChatReply>("/api/chat", {
    message,
    history: history.slice(-10),
    page_context: pageContext,
  });
}

export function getChatHistory(): Promise<ChatHistoryReply> {
  return jsonRequest<ChatHistoryReply>("/api/chat/history");
}

export function getCart(): Promise<CartReply> {
  return jsonRequest<CartReply>("/api/cart");
}

export function addCartItem(productId: string, size: string, quantity: number): Promise<CartReply> {
  return jsonRequest<CartReply>("/api/cart/items", { product_id: productId, size, quantity });
}

export function updateCartItem(productId: string, size: string, quantity: number): Promise<CartReply> {
  return jsonRequest<CartReply>("/api/cart/items", { product_id: productId, size, quantity }, "PATCH");
}

export function deleteCartItem(productId: string, size: string): Promise<CartReply> {
  const query = new URLSearchParams({ product_id: productId, size });
  return jsonRequest<CartReply>(`/api/cart/items?${query.toString()}`, undefined, "DELETE");
}

export function imageUrl(path: string): string {
  return path;
}
