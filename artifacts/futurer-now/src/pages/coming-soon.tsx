import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import './skills-profile.css';

export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return <div className="page-wrap sp-page"><div className="sp-soon" data-testid="coming-soon">
    <span className="sp-badge">Coming soon</span><h1>{title}</h1><p>{description}</p>
    <p className="sp-small">This module is not built yet. Nothing on this page is a working feature or a result.</p>
    <Link href="/skills-profile" className="sp-btn sp-btn-primary" data-testid="link-start-profile">Start with your skills profile<ChevronRight size={15} /></Link>
  </div></div>;
}
