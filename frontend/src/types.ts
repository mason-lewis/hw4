export type StockSize = {
  size: string;
  quantity: number;
};

export type Product = {
  product_id: string;
  name: string;
  garment_type: string;
  description: string;
  colors: string[];
  search_tags: string[];
  image_url: string;
  price: number;
  inventory: StockSize[];
  total_stock: number;
};

export type ProductCardData = Omit<Product, "search_tags">;

export type CartLine = {
  product_id: string;
  name: string;
  image_url: string;
  description: string;
  price: number;
  size: string;
  quantity: number;
  available_quantity: number;
  line_total: number;
};

export type CartReply = {
  items: CartLine[];
  item_count: number;
  total: number;
};

export type ChatReply = {
  reply: string;
  products: ChatProductCard[];
  usage: ChatUsage;
};

export type ChatPageContext = {
  page_type: "home" | "products" | "product" | "about" | "login" | "create-account" | "other";
  product_id?: string;
};

export type ChatHistoryMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  products: ChatProductCard[];
  created_at: string;
};

export type ChatHistoryReply = {
  messages: ChatHistoryMessage[];
};

export type ChatProductCard = ProductCardData;

export type ChatUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};
