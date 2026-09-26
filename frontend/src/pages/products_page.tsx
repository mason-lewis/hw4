import { ArrowDownWideNarrow, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "../components/product_card";
import { useChatSearch } from "../lib/chat_search_context";
import { getProducts } from "../lib/api";
import type { Product, ProductCardData } from "../types";

type SortMode = "featured" | "name-asc" | "name-desc" | "price-asc" | "price-desc" | "stock";

export function ProductsPage() {
  const { results: chatResults, clearResults } = useChatSearch();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [size, setSize] = useState("All sizes");
  const [color, setColor] = useState("All colors");
  const [sort, setSort] = useState<SortMode>("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const categories = useMemo(() => ["All products", ...new Set(products.map((product) => product.garment_type))], [products]);
  const sizes = useMemo(() => ["All sizes", ...new Set(products.flatMap((product) => product.inventory.map((stock) => stock.size)))], [products]);
  const colors = useMemo(() => ["All colors", ...new Set(products.flatMap((product) => product.colors))], [products]);

  function filterAndSort(source: ProductCardData[]): ProductCardData[] {
    const filtered = source.filter((product) => {
      const matchesCategory = category === "All products" || product.garment_type === category;
      const matchesSize = size === "All sizes" || product.inventory.some((stock) => stock.size === size);
      const matchesColor = color === "All colors" || product.colors.some((item) => item.toLowerCase() === color.toLowerCase());
      const tags = "search_tags" in product && Array.isArray((product as Product).search_tags) ? (product as Product).search_tags.join(" ") : "";
      const searchable = `${product.name} ${product.description} ${product.garment_type} ${product.colors.join(" ")} ${tags}`.toLowerCase();
      return matchesCategory && matchesSize && matchesColor && searchable.includes(search.toLowerCase().trim());
    });
    return filtered.sort((left, right) => {
      if (sort === "name-asc") return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      if (sort === "name-desc") return right.name.localeCompare(left.name, undefined, { sensitivity: "base" });
      if (sort === "price-asc") return left.price - right.price || left.name.localeCompare(right.name);
      if (sort === "price-desc") return right.price - left.price || left.name.localeCompare(right.name);
      if (sort === "stock") return right.total_stock - left.total_stock || left.name.localeCompare(right.name);
      return 0;
    });
  }

  const visibleProducts = filterAndSort(products);
  const visibleChatProducts = chatResults ? filterAndSort(chatResults.products) : [];
  const clearFilters = () => { setSearch(""); setCategory("All products"); setSize("All sizes"); setColor("All colors"); setSort("featured"); };

  return (
    <main className="products-page page-shell">
      <div className="page-kicker"><span>01</span><span className="page-kicker-rule" /><span>THE SHOP</span></div>
      <div className="products-title-row">
        <div><span className="eyebrow">FIND YOUR CAMPUS CLASSIC</span><h1>Shop the collection<span>.</span></h1></div>
        <p>Everyday layers, Yale favorites, and pieces for the moments worth remembering.</p>
      </div>

      <div className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={18} />
          <span className="sr-only">Search products</span>
          <input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="catalog-filters">
          <label className="category-select-wrap">
            <SlidersHorizontal size={16} />
            <span className="sr-only">Filter by product type</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="category-select-wrap">
            <span className="sr-only">Filter by size</span>
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {sizes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="category-select-wrap">
            <span className="sr-only">Filter by color</span>
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              {colors.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="category-select-wrap sort-select-wrap">
            <ArrowDownWideNarrow size={15} />
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="featured">Featured</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock">Most in stock</option>
            </select>
          </label>
        </div>
      </div>

      <div className="catalog-count"><span>{loading ? "Loading catalog…" : `${visibleProducts.length} pieces`}</span><span>YALE · NEW HAVEN</span></div>
      {chatResults && <section className="chat-results-section" aria-live="polite">
        <div className="section-heading chat-results-heading">
          <div><span className="eyebrow">MATCHES FROM YOUR CHAT</span><h2>Here’s what we found<span>.</span></h2><p>Based on “{chatResults.query}”</p></div>
          <button className="text-link button-reset" type="button" onClick={clearResults}>Clear matches</button>
        </div>
        <div className="product-grid">
          {visibleChatProducts.length ? visibleChatProducts.map((product, index) => <ProductCard key={product.product_id} product={product} index={index} />) : <p className="catalog-note">No chat matches fit the selected filters.</p>}
        </div>
      </section>}
      {error ? (
        <div className="catalog-note">We couldn’t reach the catalog. Start the FastAPI service, then refresh this page.</div>
      ) : loading ? (
        <div className="product-grid">{Array.from({ length: 8 }, (_, index) => <div className="product-skeleton" key={index} />)}</div>
      ) : visibleProducts.length ? (
        <div className="product-grid">
          {visibleProducts.map((product, index) => <ProductCard key={product.product_id} product={product} index={index} />)}
        </div>
      ) : (
        <div className="empty-state"><span className="eyebrow">NOTHING FOUND</span><h2>Try another search.</h2><p>Search by product name, type, color, or size.</p><button className="text-link button-reset" onClick={clearFilters}>Clear filters</button></div>
      )}
    </main>
  );
}
