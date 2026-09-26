import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ChatWidget } from "./components/chat_widget";
import { SiteFooter } from "./components/site_footer";
import { SiteHeader } from "./components/site_header";
import { ChatSearchProvider } from "./lib/chat_search_context";
import { CartProvider } from "./lib/cart_context";
import { AboutPage } from "./pages/about_page";
import { AccountPage } from "./pages/account_pages";
import { CartPage } from "./pages/cart_page";
import { HomePage } from "./pages/home_page";
import { NotFoundPage } from "./pages/not_found_page";
import { ProductPage } from "./pages/product_page";
import { ProductsPage } from "./pages/products_page";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [pathname]);
  return null;
}

export function App() {
  return (
    <ChatSearchProvider>
      <CartProvider>
        <>
          <ScrollToTop />
          <SiteHeader />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:productId" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<AccountPage mode="login" />} />
            <Route path="/create-account" element={<AccountPage mode="create" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <SiteFooter />
          <ChatWidget />
        </>
      </CartProvider>
    </ChatSearchProvider>
  );
}
