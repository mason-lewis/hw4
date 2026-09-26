import { ArrowDown, ArrowRight, ArrowUpRight, Check, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/product_card";
import { BulldogIllustration } from "../components/bulldog_illustration";
import { getProducts } from "../lib/api";
import type { Product } from "../types";
import campusMascotPhoto from "../assets/campus-mascot-reference.png";

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const favorites = products.slice(0, 3);

  return (
    <main>
      <section className="home-hero page-shell">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> OFFICIAL YALE MERCHANDISE</span>
          <h1>Wear a little<br /><em>campus</em> with you.</h1>
          <p>From the walk to class to the roar of game day, find Yale favorites made to feel right at home wherever you land.</p>
          <div className="hero-actions">
            <Link className="button button-blue button-arrow" to="/products">Shop the collection <ArrowRight size={17} /></Link>
            <Link className="text-link" to="/about">Get to know us <ArrowUpRight size={15} /></Link>
          </div>
          <div className="hero-proof"><span className="proof-icon"><Check size={14} /></span><span>Campus classics, selected in New Haven</span></div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-frame">
            <img className="hero-campus-photo" src={campusMascotPhoto} alt="Handsome Dan sitting on a leafy Yale campus path" />
            <div className="hero-image-label"><span>01 / A CAMPUS CLASSIC</span><ArrowUpRight size={16} /></div>
          </div>
          <div className="hero-mascot-badge"><BulldogIllustration /><span><strong>Dan’s pick</strong><small>Bulldog blue, every day</small></span></div>
          <div className="hero-side-note"><span className="side-note-line" /><span>MADE FOR<br />CAMPUS LIFE</span></div>
          <div className="hero-stamp"><span>YALE</span><span>NEW HAVEN</span><span>· 06511 ·</span></div>
          <div className="hero-scroll"><ArrowDown size={15} /><span>SCROLL TO EXPLORE</span></div>
        </div>
        <div className="hero-index">01 <span>/</span> 03</div>
      </section>

      <section className="intro-strip">
        <div className="page-shell intro-strip-inner">
          <span className="eyebrow">THE CAMPUS CUSTOMS EDIT</span>
          <p>A familiar shade of blue. A new favorite for every day.</p>
          <Link to="/products" aria-label="Explore products"><ArrowUpRight size={20} /></Link>
        </div>
      </section>

      <section className="section page-shell home-favorites">
        <div className="section-heading">
          <div><span className="eyebrow">PICKED FOR YOU</span><h2>Campus favorites</h2></div>
          <Link className="text-link" to="/products">View all products <ArrowRight size={16} /></Link>
        </div>
        {favorites.length > 0 ? (
          <div className="product-grid product-grid-featured">
            {favorites.map((product, index) => <ProductCard key={product.product_id} product={product} index={index} />)}
          </div>
        ) : (
          <div className="catalog-note">Start the catalog API to see the latest shop favorites here.</div>
        )}
      </section>

      <section className="home-story">
        <div className="page-shell home-story-grid">
          <div className="story-card story-card-blue">
            <span className="eyebrow">BLUE, THROUGH AND THROUGH</span>
            <p className="story-big">For the<br />days that<br /><em>stay with you.</em></p>
            <Link className="story-link" to="/products">Find your favorite <ArrowUpRight size={17} /></Link>
            <div className="story-circle" aria-hidden="true" />
            <BulldogIllustration className="story-bulldog" />
          </div>
          <div className="story-note">
            <div className="story-note-marker">02 <span>—</span> 03</div>
            <span className="eyebrow">A PLACE IN EVERY PIECE</span>
            <h2>More than a<br />match-day layer.</h2>
            <p>Find the sweatshirt you reach for on cool mornings, a gift with a campus connection, or a favorite that carries the feeling of Yale beyond the gates.</p>
            <Link className="text-link" to="/about">Meet Campus Customs <ArrowRight size={16} /></Link>
            <div className="story-note-footer"><MapPin size={15} /><span>57 BROADWAY · NEW HAVEN</span></div>
          </div>
        </div>
      </section>

      <section className="visit-banner page-shell">
        <div><span className="eyebrow">RIGHT HERE IN NEW HAVEN</span><h2>Come find your<br /><em>Bulldog blue.</em></h2></div>
        <div className="visit-banner-side"><p>Drop by our shop at 57 Broadway for Yale gear, gifts, and the campus spirit you can take with you.</p><Link className="button button-dark button-arrow" to="/about">Visit Campus Customs <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
