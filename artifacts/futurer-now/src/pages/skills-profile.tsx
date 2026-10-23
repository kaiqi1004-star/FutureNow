import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleAlert, HardDrive, Pencil, Plus, Save, SkipForward, Trash2, X } from 'lucide-react';
import {
  budgets, categories, educationLevels, emptyProfile, loadProfile, missingInformation, proficiencies, saveProfile,
  sectionNames, skillOptions, statuses, transferableStrengths, validateProfile, validateSection,
  type ProfileSkill, type SavedProfile, type SkillsProfile,
} from '@/lib/skills-profile';
import './skills-profile.css';

type Errors = Record<string, string>;
const industryOptions = ['Software & IT', 'Mechanical engineering', 'Manufacturing', 'Data & analytics', 'Finance', 'Healthcare', 'Education', 'Creative & media', 'Public sector', 'Renewable energy'];
const activityOptions = ['Building things', 'Analysing data', 'Working with people', 'Solving technical problems', 'Designing', 'Organising & planning', 'Teaching or mentoring', 'Research'];
const priorityOptions = ['Stable income', 'Growth potential', 'Work-life balance', 'Remote or flexible work', 'Social impact', 'Learning opportunities', 'Job security'];
const scaleLabels = ['Very low', 'Low', 'Moderate', 'High', 'Very high'];
const uid = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const savedTime = (iso: string) => new Date(iso).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
const toNum = (v: string): number | '' => (v.trim() === '' ? '' : Number(v));

function Field({ id, label, error, hint, optional, children }: { id: string; label: string; error?: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return <div className={`sp-field ${error ? 'sp-has-error' : ''}`}>
    <label htmlFor={id} className="sp-label">{label}{optional ? <span className="sp-optional">Optional</span> : <span className="sp-req" aria-hidden="true">Required</span>}</label>
    {hint && <p className="sp-hint" id={`${id}-hint`}>{hint}</p>}
    {children}
    {error && <p className="sp-error" id={`${id}-error`} data-testid={`error-${id}`}><CircleAlert size={13} />{error}</p>}
  </div>;
}
const describedBy = (id: string, error?: string, hint?: boolean) => [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

function Scale({ id, label, value, onChange, error, low, high }: { id: string; label: string; value: number | ''; onChange: (v: number) => void; error?: string; low: string; high: string }) {
  return <fieldset className={`sp-field sp-scale ${error ? 'sp-has-error' : ''}`} aria-describedby={describedBy(id, error, true)}>
    <legend className="sp-label">{label}<span className="sp-req" aria-hidden="true">Required</span></legend>
    <p className="sp-hint" id={`${id}-hint`}>1 = {low}, 5 = {high}</p>
    <div className="sp-scale-row" id={id} tabIndex={-1}>
      {[1, 2, 3, 4, 5].map((n) => <label key={n} className={`sp-scale-opt ${value === n ? 'is-on' : ''}`}>
        <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} data-testid={`radio-${id}-${n}`} />
        <b>{n}</b><span>{scaleLabels[n - 1]}</span>
      </label>)}
    </div>
    {error && <p className="sp-error" id={`${id}-error`}><CircleAlert size={13} />{error}</p>}
  </fieldset>;
}

function MultiSelect({ id, label, options, value, onChange, error }: { id: string; label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [custom, setCustom] = useState('');
  const [localErr, setLocalErr] = useState('');
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => {
    const v = custom.trim();
    if (!v) return setLocalErr('Type a value before adding.');
    if (v.length > 200) return setLocalErr('Keep custom entries under 200 characters.');
    if (all.some((o) => o.toLowerCase() === v.toLowerCase())) { setLocalErr('That option already exists. Select it above.'); return; }
    onChange([...value, v]); setCustom(''); setLocalErr('');
  };
  const err = error || localErr;
  return <fieldset className={`sp-field ${error ? 'sp-has-error' : ''}`} aria-describedby={describedBy(id, err)}>
    <legend className="sp-label">{label}<span className="sp-req" aria-hidden="true">Required</span></legend>
    <div className="sp-chips" id={id} tabIndex={-1}>
      {all.map((o) => <button type="button" key={o} className={`sp-chip ${value.includes(o) ? 'is-on' : ''}`} aria-pressed={value.includes(o)} onClick={() => toggle(o)} data-testid={`chip-${id}-${o.toLowerCase().replace(/\W+/g, '-')}`}>{value.includes(o) && <Check size={13} />}{o}</button>)}
    </div>
    <div className="sp-inline-add">
      <label className="sr-only" htmlFor={`${id}-custom`}>Add your own {label.toLowerCase()}</label>
      <input id={`${id}-custom`} className="sp-input" value={custom} placeholder="Add your own" onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} data-testid={`input-${id}-custom`} />
      <button type="button" className="sp-btn sp-btn-ghost" onClick={add} data-testid={`button-${id}-add`}><Plus size={14} />Add</button>
    </div>
    {err && <p className="sp-error" id={`${id}-error`}><CircleAlert size={13} />{err}</p>}
  </fieldset>;
}

function SkillsEditor({ skills, onChange, error }: { skills: ProfileSkill[]; onChange: (s: ProfileSkill[]) => void; error?: string }) {
  const [cat, setCat] = useState<(typeof categories)[number]>('Technical Skills');
  const [name, setName] = useState('');
  const [prof, setProf] = useState<(typeof proficiencies)[number]>('Beginner');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [msg, setMsg] = useState('');
  const has = (n: string, except?: string) => skills.some((s) => s.id !== except && s.name.trim().toLowerCase() === n.trim().toLowerCase());
  const togglePreset = (n: string, c: (typeof categories)[number]) => {
    const found = skills.find((s) => s.name.toLowerCase() === n.toLowerCase());
    onChange(found ? skills.filter((s) => s.id !== found.id) : [...skills, { id: uid(), name: n, category: c, proficiency: 'Beginner', custom: false }]);
  };
  const addCustom = () => {
    const n = name.trim();
    if (!n) return setMsg('Enter a skill name.');
    if (n.length > 100) return setMsg('Skill names must be 100 characters or fewer.');
    if (has(n)) return setMsg(`"${n}" is already in your list.`);
    onChange([...skills, { id: uid(), name: n, category: cat, proficiency: prof, custom: true }]); setName(''); setMsg('');
  };
  const saveEdit = (id: string) => {
    const n = editName.trim();
    if (!n || n.length > 100) return setMsg('Skill names must be 1 to 100 characters.');
    if (has(n, id)) return setMsg(`"${n}" is already in your list.`);
    onChange(skills.map((s) => (s.id === id ? { ...s, name: n } : s))); setEditing(null); setMsg('');
  };
  return <div className="sp-skills">
    {categories.filter((c) => skillOptions[c].length).map((c) => <fieldset key={c} className="sp-field">
      <legend className="sp-label">{c}<span className="sp-optional">Select any</span></legend>
      <div className="sp-chips">{skillOptions[c].map((o) => { const on = has(o); return <button type="button" key={o} aria-pressed={on} className={`sp-chip ${on ? 'is-on' : ''}`} onClick={() => togglePreset(o, c)} data-testid={`chip-skill-${o.toLowerCase().replace(/\W+/g, '-')}`}>{on && <Check size={13} />}{o}</button>; })}</div>
    </fieldset>)}
    <div className="sp-custom-skill">
      <div className="sp-label">Add a custom skill<span className="sp-optional">Including industry-specific</span></div>
      <div className="sp-custom-grid">
        <div><label className="sp-mini" htmlFor="custom-skill-name">Skill name</label><input id="custom-skill-name" className="sp-input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="e.g. CNC machining" aria-describedby={msg ? 'skill-msg' : undefined} data-testid="input-custom-skill" /></div>
        <div><label className="sp-mini" htmlFor="custom-skill-cat">Category</label><select id="custom-skill-cat" className="sp-input" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} data-testid="select-custom-skill-category">{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="sp-mini" htmlFor="custom-skill-prof">Proficiency</label><select id="custom-skill-prof" className="sp-input" value={prof} onChange={(e) => setProf(e.target.value as typeof prof)} data-testid="select-custom-skill-proficiency">{proficiencies.map((p) => <option key={p}>{p}</option>)}</select></div>
        <button type="button" className="sp-btn sp-btn-primary" onClick={addCustom} data-testid="button-add-custom-skill"><Plus size={15} />Add</button>
      </div>
      {msg && <p className="sp-error" id="skill-msg" role="alert"><CircleAlert size={13} />{msg}</p>}
    </div>
    <div className={`sp-field ${error ? 'sp-has-error' : ''}`}>
      <div className="sp-label" id="skills-list-label">Your skills and proficiency <span className="sp-count">{skills.length}</span></div>
      <div id="skills" tabIndex={-1} aria-describedby={error ? 'skills-error' : undefined}>
        {!skills.length ? <div className="sp-empty">No skills yet. Select from the lists above or add your own. At least one is required.</div> :
          <ul className="sp-skill-list" aria-labelledby="skills-list-label">{skills.map((s) => <li key={s.id} className="sp-skill-row" data-testid={`row-skill-${s.id}`}>
            <div className="sp-skill-name">
              {editing === s.id ? <span className="sp-edit-inline"><label className="sr-only" htmlFor={`edit-${s.id}`}>Rename {s.name}</label><input id={`edit-${s.id}`} autoFocus className="sp-input" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(s.id); } if (e.key === 'Escape') setEditing(null); }} data-testid={`input-edit-skill-${s.id}`} />
                <button type="button" className="sp-icon" aria-label="Save skill name" onClick={() => saveEdit(s.id)} data-testid={`button-save-skill-${s.id}`}><Check size={15} /></button>
                <button type="button" className="sp-icon" aria-label="Cancel rename" onClick={() => setEditing(null)}><X size={15} /></button></span>
                : <><strong>{s.name}</strong><small>{s.category}{s.custom ? ' · custom' : ''}</small></>}
            </div>
            <label className="sr-only" htmlFor={`prof-${s.id}`}>Proficiency for {s.name}</label>
            <select id={`prof-${s.id}`} className="sp-input sp-prof" value={s.proficiency} onChange={(e) => onChange(skills.map((x) => (x.id === s.id ? { ...x, proficiency: e.target.value as ProfileSkill['proficiency'] } : x)))} data-testid={`select-proficiency-${s.id}`}>{proficiencies.map((p) => <option key={p}>{p}</option>)}</select>
            {s.custom && editing !== s.id && <button type="button" className="sp-icon" aria-label={`Rename ${s.name}`} onClick={() => { setEditing(s.id); setEditName(s.name); }} data-testid={`button-edit-skill-${s.id}`}><Pencil size={15} /></button>}
            <button type="button" className="sp-icon sp-icon-danger" aria-label={`Remove ${s.name}`} onClick={() => onChange(skills.filter((x) => x.id !== s.id))} data-testid={`button-remove-skill-${s.id}`}><Trash2 size={15} /></button>
          </li>)}</ul>}
      </div>
      {error && <p className="sp-error" id="skills-error"><CircleAlert size={13} />{error}</p>}
    </div>
  </div>;
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === '' || value === undefined || (Array.isArray(value) && !value.length);
  return <div className="sp-sum-row"><dt>{label}</dt><dd className={empty ? 'sp-muted' : ''}>{empty ? 'Not provided' : Array.isArray(value) ? value.join(', ') : value}</dd></div>;
}

function ProfileSummary({ saved, onEdit }: { saved: SavedProfile; onEdit: (step: number) => void }) {
  const p = saved.profile;
  const strengths = transferableStrengths(p);
  const missing = missingInformation(p);
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headRef.current?.focus(); }, []);
  const Section = ({ i, children }: { i: number; children: ReactNode }) => <section className="sp-sum-card"><header><span className="sp-step-num">{i + 1}</span><h3>{sectionNames[i]}</h3><button type="button" className="sp-btn sp-btn-ghost" onClick={() => onEdit(i)} data-testid={`button-edit-section-${i}`}><Pencil size={14} />Edit</button></header><dl>{children}</dl></section>;
  return <div className="sp-summary sp-fade" data-testid="profile-summary">
    <div className="sp-summary-head">
      <div><div className="sp-eyebrow">Saved profile</div><h2 ref={headRef} tabIndex={-1}>Your skills profile</h2><p>Saved {savedTime(saved.savedAt)} on this browser. Everything below restates your own answers; nothing has been verified or scored.</p></div>
      <button type="button" className="sp-btn sp-btn-primary" onClick={() => onEdit(0)} data-testid="button-edit-profile"><Pencil size={15} />Edit profile</button>
    </div>
    <div className="sp-insight-grid">
      <section className="sp-insight sp-insight-green"><h3>Transferable strengths you reported</h3>
        {strengths.length ? <ul>{strengths.map((s) => <li key={s.name} data-testid={`strength-${s.name}`}><strong>{s.name}</strong><p>{s.explanation}</p><span className="sp-source">Source: {s.source}</span></li>)}</ul>
          : <p className="sp-muted">No strengths can be grounded in your answers yet. Add soft skills or rate readiness 4 or higher to see them listed here.</p>}
      </section>
      <section className="sp-insight sp-insight-amber"><h3>Missing or optional information</h3>
        {missing.length ? <ul className="sp-missing">{missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p>All required and optional fields have answers.</p>}
        <p className="sp-small">Optional evidence makes later matching more explainable. Your profile is still valid without it.</p>
      </section>
    </div>
    <div className="sp-sum-grid">
      <Section i={0}><SummaryRow label="Current status" value={p.basic.status} /><SummaryRow label="Field of study or occupation" value={p.basic.field} /><SummaryRow label="Years of work experience" value={p.basic.years === '' ? '' : String(p.basic.years)} /><SummaryRow label="Highest education" value={p.basic.education} /><SummaryRow label="Preferred career direction" value={p.basic.direction} /></Section>
      <Section i={1}>{categories.map((c) => <SummaryRow key={c} label={c} value={p.skills.filter((s) => s.category === c).map((s) => `${s.name} (${s.proficiency})`)} />)}</Section>
      <Section i={2}>{p.experience.skipped && <div className="sp-note">Marked as skipped.</div>}<SummaryRow label="Academic projects" value={p.experience.academic} /><SummaryRow label="Work or internships" value={p.experience.work} /><SummaryRow label="Volunteering or personal projects" value={p.experience.personal} /><SummaryRow label="Practical examples" value={p.experience.examples} /><SummaryRow label="Certifications or training" value={p.experience.certifications} /><SummaryRow label="Achievements" value={p.experience.achievements} /></Section>
      <Section i={3}><SummaryRow label="Industries" value={p.interests.industries} /><SummaryRow label="Preferred activities" value={p.interests.activities} /><SummaryRow label="Career priorities" value={p.interests.priorities} /><SummaryRow label="Willingness to learn" value={p.interests.willingness === '' ? '' : `${p.interests.willingness}/5`} /><SummaryRow label="Weekly learning time" value={p.interests.weeklyHours === '' ? '' : `${p.interests.weeklyHours} hours`} /><SummaryRow label="Learning budget" value={p.interests.budget} /></Section>
      <Section i={4}><SummaryRow label="Comfort learning new technology" value={p.readiness.technology === '' ? '' : `${p.readiness.technology}/5`} /><SummaryRow label="Problem-solving approach" value={p.readiness.problemApproach} /><SummaryRow label="Willingness to adapt" value={p.readiness.adaptability === '' ? '' : `${p.readiness.adaptability}/5`} /><SummaryRow label="Realistic weekly learning time" value={p.readiness.realisticHours === '' ? '' : `${p.readiness.realisticHours} hours`} /></Section>
    </div>
  </div>;
}

export default function SkillsProfilePage() {
  const initial = useMemo(() => loadProfile(), []);
  const [profile, setProfile] = useState<SkillsProfile>(() => initial.saved?.profile ?? emptyProfile());
  const [step, setStep] = useState(() => initial.saved?.step ?? 0);
  const [saved, setSaved] = useState<SavedProfile | null>(initial.saved);
  const [mode, setMode] = useState<'form' | 'summary'>(initial.saved?.submitted ? 'summary' : 'form');
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(initial.error ? { kind: 'err', text: initial.error } : null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const focusStepRef = useRef(false);
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved?.profile ?? emptyProfile());

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const leave = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest('a[href]');
      if (!anchor || anchor.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Leave this page? Your unsaved profile changes will be lost. Save a draft first to keep them.')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', h);
    document.addEventListener('click', leave, true);
    return () => { window.removeEventListener('beforeunload', h); document.removeEventListener('click', leave, true); };
  }, [dirty]);
  useEffect(() => { if (focusStepRef.current) { headingRef.current?.focus(); focusStepRef.current = false; } }, [step, mode]);

  const set = <K extends keyof SkillsProfile>(k: K, v: Partial<SkillsProfile[K]>) => setProfile((p) => ({ ...p, [k]: Array.isArray(v) ? v : { ...(p[k] as object), ...v } }));
  const focusFirstError = (errs: Errors) => {
    const key = Object.keys(errs)[0]; if (!key) return;
    const id = key.replace('.', '-');
    requestAnimationFrame(() => { const el = document.getElementById(id); el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  };
  const goTo = (n: number) => { setErrors({}); setStep(n); setVisited((v) => new Set(v).add(n)); focusStepRef.current = true; };
  const next = () => {
    const errs = validateSection(profile, step);
    if (Object.keys(errs).length) { setErrors(errs); focusFirstError(errs); return; }
    goTo(Math.min(4, step + 1));
  };
  const skipExperience = () => { setProfile((p) => ({ ...p, experience: { ...p.experience, skipped: true } })); goTo(3); };
  const saveDraft = () => {
    const r = saveProfile(profile, step, false);
    if (r.saved) { setSaved(r.saved); setBanner({ kind: 'ok', text: `Draft saved ${savedTime(r.saved.savedAt)}. You can return to it on this browser.` }); }
    else setBanner({ kind: 'err', text: r.error ?? 'Draft not saved.' });
    requestAnimationFrame(() => bannerRef.current?.focus());
  };
  const submit = () => {
    const errs = validateProfile(profile);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = sectionNames.findIndex((_, i) => Object.keys(validateSection(profile, i)).length);
      setBanner({ kind: 'err', text: `Profile not saved. ${Object.keys(errs).length} required ${Object.keys(errs).length === 1 ? 'answer is' : 'answers are'} missing. Taking you to ${sectionNames[first]}.` });
      if (first !== step) { setStep(first); setVisited((v) => new Set(v).add(first)); }
      requestAnimationFrame(() => focusFirstError(validateSection(profile, first)));
      return;
    }
    const r = saveProfile(profile, 4, true);
    if (r.saved) { setSaved(r.saved); setErrors({}); setBanner(null); setMode('summary'); }
    else { setBanner({ kind: 'err', text: r.error ?? 'Profile not saved.' }); requestAnimationFrame(() => bannerRef.current?.focus()); }
  };
  const sectionErrorCount = (i: number) => Object.keys(errors).filter((k) => Object.keys(validateSection(profile, i)).includes(k)).length;
  const done = (i: number) => (i === 2 ? visited.has(2) || profile.experience.skipped || Object.values(profile.experience).some((v) => typeof v === 'string' && v.trim()) : !Object.keys(validateSection(profile, i)).length);
  const doneCount = sectionNames.filter((_, i) => done(i)).length;
  const e = errors;
  const b = profile.basic, x = profile.experience, it = profile.interests, r = profile.readiness;

  return <div className="page-wrap sp-page">
    <div className="sp-head">
      <div><div className="sp-eyebrow">Module 01 · Skills Profile & Assessment</div><h1>Build Your Skills Profile</h1><p>Five short sections about your skills, experience, interests and learning readiness to support career exploration. Your answers stay as you wrote them; FutureNow does not score or verify them.</p></div>
      <div className="sp-storage" data-testid="text-storage-disclosure"><HardDrive size={16} /><span>Saved only in this browser on this device. Not synced, not sent to a server. Clearing browser data removes it.</span></div>
    </div>
    {banner && <div ref={bannerRef} tabIndex={-1} role={banner.kind === 'err' ? 'alert' : 'status'} className={`sp-banner sp-banner-${banner.kind}`} data-testid="status-save-banner">{banner.kind === 'err' ? <AlertTriangle size={17} /> : <Check size={17} />}<span>{banner.text}</span><button type="button" className="sp-icon" aria-label="Dismiss message" onClick={() => setBanner(null)}><X size={14} /></button></div>}
    {mode === 'summary' && saved ? <ProfileSummary saved={saved} onEdit={(i) => { setMode('form'); goTo(i); }} /> :
      <div className="sp-layout">
        <nav className="sp-steps" aria-label="Profile sections">
          <div className="sp-progress"><div><b>{doneCount}</b> of 5 sections answered</div><div className="sp-bar" role="progressbar" aria-label="Profile sections answered" aria-valuemin={0} aria-valuemax={5} aria-valuenow={doneCount}><span style={{ transform: `scaleX(${doneCount / 5})` }} /></div></div>
          <ol>{sectionNames.map((n, i) => <li key={n}><button type="button" className={`sp-step ${i === step ? 'is-current' : ''} ${done(i) ? 'is-done' : ''}`} aria-label={`Section ${i + 1}: ${n}${i === 2 ? ' (optional)' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => goTo(i)} data-testid={`button-step-${i}`}>
            <span className="sp-step-num">{done(i) && i !== step ? <Check size={13} /> : i + 1}</span><span className="sp-step-text">{n}{i === 2 && <small>Optional</small>}</span>{sectionErrorCount(i) > 0 && <span className="sp-step-err">{sectionErrorCount(i)}</span>}
          </button></li>)}</ol>
          <div className={`sp-dirty ${dirty ? 'is-dirty' : ''}`} data-testid="status-unsaved">{dirty ? <><span className="sp-dot" />Unsaved changes</> : saved ? <>All changes saved {savedTime(saved.savedAt)}</> : <>Nothing saved yet</>}</div>
          {saved?.submitted && <button type="button" className="sp-btn sp-btn-ghost sp-full" onClick={() => { if (!dirty || window.confirm('Leave the form? Unsaved changes stay here until you leave the page, but the summary shows your last saved profile.')) setMode('summary'); }} data-testid="button-view-summary">View saved summary</button>}
        </nav>
        <form className="sp-card" noValidate onSubmit={(ev) => { ev.preventDefault(); if (step === 4) submit(); else next(); }}>
          <div className="sp-card-head"><span className="sp-eyebrow">Section {step + 1} of 5</span><h2 ref={headingRef} tabIndex={-1} data-testid="text-section-title">{sectionNames[step]}</h2></div>
          <div className="sp-fade" key={step}>
            {step === 0 && <div className="sp-grid">
              <Field id="basic-status" label="Current status" error={e['basic.status']}><select id="basic-status" className="sp-input" value={b.status} aria-invalid={!!e['basic.status']} aria-describedby={describedBy('basic-status', e['basic.status'])} onChange={(ev) => set('basic', { status: ev.target.value as typeof b.status })} data-testid="select-status"><option value="">Select status</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field id="basic-education" label="Highest education level" error={e['basic.education']}><select id="basic-education" className="sp-input" value={b.education} aria-invalid={!!e['basic.education']} aria-describedby={describedBy('basic-education', e['basic.education'])} onChange={(ev) => set('basic', { education: ev.target.value as typeof b.education })} data-testid="select-education"><option value="">Select level</option>{educationLevels.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field id="basic-field" label="Field of study or current occupation" error={e['basic.field']}><input id="basic-field" className="sp-input" value={b.field} maxLength={300} aria-invalid={!!e['basic.field']} aria-describedby={describedBy('basic-field', e['basic.field'])} onChange={(ev) => set('basic', { field: ev.target.value })} placeholder="e.g. Mechanical engineering" data-testid="input-field" /></Field>
              <Field id="basic-years" label="Years of work experience" hint="Use 0 if you have not worked yet. Decimals allowed." error={e['basic.years']}><input id="basic-years" type="number" min={0} max={80} step={0.5} inputMode="decimal" className="sp-input" value={b.years} aria-invalid={!!e['basic.years']} aria-describedby={describedBy('basic-years', e['basic.years'], true)} onChange={(ev) => set('basic', { years: toNum(ev.target.value) })} data-testid="input-years" /></Field>
              <div className="sp-span"><Field id="basic-direction" label="Preferred career direction" hint="A role, sector or general direction. It is fine to be unsure; describe what you are considering." error={e['basic.direction']}><textarea id="basic-direction" className="sp-input sp-textarea" rows={3} value={b.direction} aria-invalid={!!e['basic.direction']} aria-describedby={describedBy('basic-direction', e['basic.direction'], true)} onChange={(ev) => set('basic', { direction: ev.target.value })} data-testid="input-direction" /></Field></div>
            </div>}
            {step === 1 && <SkillsEditor skills={profile.skills} onChange={(s) => setProfile((p) => ({ ...p, skills: s }))} error={e.skills} />}
            {step === 2 && <div>
              <div className="sp-note sp-note-row"><span>This whole section is optional. Concrete examples make future recommendations easier to explain.</span><button type="button" className="sp-btn sp-btn-ghost" onClick={skipExperience} data-testid="button-skip-experience"><SkipForward size={14} />Skip section</button></div>
              {x.skipped && <div className="sp-note">Marked as skipped. Anything you type here is still kept. <button type="button" className="sp-link" onClick={() => set('experience', { skipped: false })} data-testid="button-unskip-experience">Undo skip</button></div>}
              <div className="sp-grid">{([['academic', 'Academic projects'], ['work', 'Work experience or internships'], ['personal', 'Volunteering or personal projects'], ['examples', 'Practical examples of using your skills'], ['certifications', 'Certifications or training'], ['achievements', 'Achievements or outcomes']] as const).map(([k, l]) =>
                <Field key={k} id={`experience-${k}`} label={l} optional><textarea id={`experience-${k}`} className="sp-input sp-textarea" rows={3} maxLength={6000} value={x[k]} onChange={(ev) => set('experience', { [k]: ev.target.value })} data-testid={`input-experience-${k}`} /></Field>)}</div>
            </div>}
            {step === 3 && <div className="sp-stack">
              <MultiSelect id="interests-industries" label="Industries or career fields" options={industryOptions} value={it.industries} onChange={(v) => set('interests', { industries: v })} error={e['interests.industries']} />
              <MultiSelect id="interests-activities" label="Activities you enjoy" options={activityOptions} value={it.activities} onChange={(v) => set('interests', { activities: v })} error={e['interests.activities']} />
              <MultiSelect id="interests-priorities" label="Career priorities" options={priorityOptions} value={it.priorities} onChange={(v) => set('interests', { priorities: v })} error={e['interests.priorities']} />
              <Scale id="interests-willingness" label="Willingness to learn new skills" low="very low" high="very high" value={it.willingness} onChange={(v) => set('interests', { willingness: v })} error={e['interests.willingness']} />
              <div className="sp-grid">
                <Field id="interests-weeklyHours" label="Weekly time you would like to spend learning" hint="Hours per week, 0 to 168." error={e['interests.weeklyHours']}><input id="interests-weeklyHours" type="number" min={0} max={168} inputMode="decimal" className="sp-input" value={it.weeklyHours} aria-invalid={!!e['interests.weeklyHours']} aria-describedby={describedBy('interests-weeklyHours', e['interests.weeklyHours'], true)} onChange={(ev) => set('interests', { weeklyHours: toNum(ev.target.value) })} data-testid="input-weekly-hours" /></Field>
                <Field id="interests-budget" label="Learning budget" error={e['interests.budget']}><select id="interests-budget" className="sp-input" value={it.budget} aria-invalid={!!e['interests.budget']} aria-describedby={describedBy('interests-budget', e['interests.budget'])} onChange={(ev) => set('interests', { budget: ev.target.value as typeof it.budget })} data-testid="select-budget"><option value="">Select budget</option>{budgets.map((s) => <option key={s}>{s}</option>)}</select></Field>
              </div>
            </div>}
            {step === 4 && <div className="sp-stack">
              <Scale id="readiness-technology" label="Comfort learning unfamiliar technology" low="very uncomfortable" high="very comfortable" value={r.technology} onChange={(v) => set('readiness', { technology: v })} error={e['readiness.technology']} />
              <Field id="readiness-problemApproach" label="How do you usually approach a problem you have not seen before?" hint="A sentence or two in your own words." error={e['readiness.problemApproach']}><textarea id="readiness-problemApproach" className="sp-input sp-textarea" rows={3} value={r.problemApproach} aria-invalid={!!e['readiness.problemApproach']} aria-describedby={describedBy('readiness-problemApproach', e['readiness.problemApproach'], true)} onChange={(ev) => set('readiness', { problemApproach: ev.target.value })} data-testid="input-problem-approach" /></Field>
              <Scale id="readiness-adaptability" label="Willingness to adapt to industry changes" low="very unwilling" high="very willing" value={r.adaptability} onChange={(v) => set('readiness', { adaptability: v })} error={e['readiness.adaptability']} />
              <Field id="readiness-realisticHours" label="Realistic weekly learning time" hint="Given your current commitments, hours per week, 0 to 168." error={e['readiness.realisticHours']}><input id="readiness-realisticHours" type="number" min={0} max={168} inputMode="decimal" className="sp-input sp-narrow" value={r.realisticHours} aria-invalid={!!e['readiness.realisticHours']} aria-describedby={describedBy('readiness-realisticHours', e['readiness.realisticHours'], true)} onChange={(ev) => set('readiness', { realisticHours: toNum(ev.target.value) })} data-testid="input-realistic-hours" /></Field>
            </div>}
          </div>
          <div className="sp-actions">
            <button type="button" className="sp-btn sp-btn-ghost" disabled={step === 0} onClick={() => goTo(step - 1)} data-testid="button-previous-section"><ChevronLeft size={15} />Back</button>
            <div className="sp-actions-right">
              <button type="button" className="sp-btn sp-btn-ghost" onClick={saveDraft} data-testid="button-save-draft"><Save size={15} />Save draft</button>
              {step < 4 ? <button type="submit" className="sp-btn sp-btn-primary" data-testid="button-next-section">Next<ChevronRight size={15} /></button>
                : <button type="submit" className="sp-btn sp-btn-primary" data-testid="button-save-profile"><Check size={15} />Save profile</button>}
            </div>
          </div>
        </form>
      </div>}
    <p className="sp-foot">Want to compare your skills with supplied job records now? Try the <Link href="/skill-gap" className="sp-link" data-testid="link-skill-gap-from-profile">Skill Gap Navigator</Link>.</p>
  </div>;
}

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return <div className="page-wrap sp-page"><div className="sp-soon" data-testid="coming-soon">
    <span className="sp-badge">Coming soon</span><h1>{title}</h1><p>{description}</p>
    <p className="sp-small">This module is not built yet. Nothing on this page is a working feature or a result.</p>
    <Link href="/skills-profile" className="sp-btn sp-btn-primary" data-testid="link-start-profile">Start with your skills profile<ChevronRight size={15} /></Link>
  </div></div>;
}
