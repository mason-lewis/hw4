import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ChatProductCard } from "../types";

export type ChatSearchResults = {
  query: string;
  products: ChatProductCard[];
};

type ChatSearchContextValue = {
  results: ChatSearchResults | null;
  showResults: (query: string, products: ChatProductCard[]) => void;
  clearResults: () => void;
};

const ChatSearchContext = createContext<ChatSearchContextValue | null>(null);

export function ChatSearchProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatSearchResults | null>(null);

  function showResults(query: string, products: ChatProductCard[]) {
    setResults(products.length ? { query, products } : null);
  }

  function clearResults() {
    setResults(null);
  }

  return (
    <ChatSearchContext.Provider value={{ results, showResults, clearResults }}>
      {children}
    </ChatSearchContext.Provider>
  );
}

export function useChatSearch() {
  const context = useContext(ChatSearchContext);
  if (!context) throw new Error("useChatSearch must be used within ChatSearchProvider.");
  return context;
}
