import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProductCardData } from "../types";
import { imageUrl } from "../lib/api";

type ProductCardProps = {
  product: ProductCardData;
  index?: number;
};

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const availableSizes = product.inventory.filter((item) => item.quantity > 0).length;

  return (
    <Link
      className="product-card"
      to={`/products/${encodeURIComponent(product.product_id)}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="product-card-image-wrap">
        <img src={imageUrl(product.image_url)} alt={product.name} loading="lazy" />
        <span className={`stock-badge${product.total_stock === 0 ? " sold-out" : ""}`}>
          {product.total_stock > 0 ? "In stock" : "Sold out"}
        </span>
        <span className="product-card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </div>
      <div className="product-card-copy">
        <div className="product-card-meta">
          <span>{product.garment_type}</span>
          <span>{availableSizes} sizes</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <strong className="product-price">${product.price.toFixed(2)}</strong>
      </div>
    </Link>
  );
}
