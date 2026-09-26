import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="not-found page-shell">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>This path wandered<br /><em>off campus.</em></h1>
      <p>Let’s get you back to the good stuff.</p>
      <Link className="button button-blue" to="/"><ArrowLeft size={16} /> Back home</Link>
    </main>
  );
}
