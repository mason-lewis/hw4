import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { BulldogIllustration } from "../components/bulldog_illustration";

export function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero page-shell">
        <div className="page-kicker"><span>02</span><span className="page-kicker-rule" /><span>OUR STORY</span></div>
        <div className="about-hero-grid">
          <div>
            <span className="eyebrow">A NEW HAVEN ORIGINAL</span>
            <h1>For the love<br />of <em>Bulldog blue.</em></h1>
          </div>
          <div className="about-lede">
            <span className="about-spark"><Sparkles size={17} /></span>
            <p>Campus Customs brings a piece of Yale into the rhythm of everyday life: the layers you reach for, the gifts you give, and the colors that always feel like home.</p>
          </div>
        </div>
        <div className="about-image-panel">
          <div className="about-image-art"><span className="about-art-y">Y</span><span className="about-art-ring">CAMPUS · CUSTOMS · NEW HAVEN · YALE ·</span><BulldogIllustration className="about-bulldog" /><span className="about-art-caption">A LITTLE BLUE<br />GOES A LONG WAY</span></div>
          <div className="about-image-side"><span>YALE BULLDOG BLUE</span><span>EST. IN THE CITY OF NEW HAVEN</span></div>
        </div>
      </section>

      <section className="about-values page-shell">
        <div className="about-values-intro"><span className="eyebrow">WHAT WE BELIEVE</span><h2>Campus spirit<br />has no dress code.</h2><p>It shows up in the small things: a favorite crewneck, a well-worn cap, a keepsake that takes you back.</p></div>
        <div className="value-list">
          <article><span>01</span><div><h3>Made to be lived in</h3><p>Comfortable staples and standout pieces for class days, campus walks, and everything after.</p></div></article>
          <article><span>02</span><div><h3>Rooted in place</h3><p>Yale colors and campus details connect every piece to a community with its own stories.</p></div></article>
          <article><span>03</span><div><h3>Easy to share</h3><p>Find a thoughtful gift for the Bulldog fan, student, graduate, or friend in your life.</p></div></article>
        </div>
      </section>

      <section className="about-visit">
        <div className="page-shell about-visit-inner">
          <div><span className="eyebrow">MEET US IN PERSON</span><h2>Right around<br />the corner from campus.</h2></div>
          <div className="about-address"><MapPin size={20} /><div><strong>Campus Customs</strong><span>57 Broadway<br />New Haven, CT 06511</span></div><a href="https://maps.google.com/?q=57+Broadway+New+Haven+CT" target="_blank" rel="noreferrer" aria-label="Directions to Campus Customs"><ArrowRight size={18} /></a></div>
          <Link className="button button-light button-arrow" to="/products">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
