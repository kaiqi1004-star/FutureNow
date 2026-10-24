import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import './skills-profile.css';

export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation();
  return <div className="page-wrap sp-page"><div className="sp-soon" data-testid="coming-soon">
    <span className="sp-badge">{t('Coming soon')}</span><h1>{t(title)}</h1><p>{t(description)}</p>
    <p className="sp-small">{t('This module is not built yet. Nothing on this page is a working feature or a result.')}</p>
    <Link href="/skills-profile" className="sp-btn sp-btn-primary" data-testid="link-start-profile">{t('Start with your skills profile')}<ChevronRight size={15} /></Link>
  </div></div>;
}
