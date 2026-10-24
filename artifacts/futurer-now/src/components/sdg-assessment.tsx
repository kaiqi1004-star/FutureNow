import type { SdgAssessment } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function SdgTags({ a, id }: { a: SdgAssessment; id: string }) {
  const { t } = useTranslation();
  const goals = [...new Map(a.connections.map((c) => [c.goalNumber, c])).values()];
  return <span className="rm-sdg-tags" data-testid={`sdg-tags-${id}`} data-state={a.status}>
    {goals.map((c) => <a key={c.goalNumber} className="rm-sdg" href={c.url} target="_blank" rel="noopener noreferrer" title={`${c.title} — ${t('indicative connection; see conditions in mapping details')}`}>SDG {c.goalNumber}</a>)}
    {a.status === "review_required" && <span className="rm-sdg is-review">{t('SDG review needed')}</span>}
    {a.status === "not_assessed" && <UnassessedSdg />}
  </span>;
}

export function UnassessedSdg() {
  const { t } = useTranslation();
  return <span className="rm-sdg is-unassessed" title={t('Not yet evaluated in this work context; this is not a review warning.')} data-state="not_assessed">{t('Not assessed')}</span>;
}

export function SdgDetail({ a, id, collapsed = false }: { a: SdgAssessment; id: string; collapsed?: boolean }) {
  const { t } = useTranslation();
  const body = <div data-testid={`sdg-detail-${id}`} data-state={a.status}>
    {a.connections.map((c) => <div key={`${c.ruleId}:${c.target}`} className="rm-sdg-detail">
      <strong>SDG {c.goalNumber}: {c.title}</strong>
      <p>{t(c.explanation)}</p>
      <dl>
        <dt>{t('Conditions')}</dt><dd>{t(c.conditions)}</dd>
        <dt>{t('Listed skill')}</dt><dd>{c.evidence}</dd>
        {c.contextEvidence.length > 0 && <><dt>{t('Source context')}</dt><dd>{c.contextEvidence.join("; ")}</dd></>}
      </dl>
      <span className="rm-mapping-kind">{t('Indicative mapping')} · {c.ruleId}</span>{" "}
      <a href={c.url} target="_blank" rel="noopener noreferrer">{t('UN target')} {c.target} <ExternalLink size={11} /></a>
    </div>)}
    {a.status !== "mapped" && <p className={`rm-assessment-note ${a.status === "review_required" ? "is-review" : ""}`}>
       <strong>{a.status === "review_required" ? `${t('Review required')}: ` : `${t('Not assessed')}: `}</strong>{a.assessmentNote}
    </p>}
  </div>;
  return collapsed ? <details className="rm-sdg-disclosure"><summary>{t('SDG assessment details')}</summary>{body}</details> : body;
}
