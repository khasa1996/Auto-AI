import { useState } from 'react';
import { ArrowRight, CarFront, Sparkles, X } from 'lucide-react';

import { configuratorApi } from '../../services/configuratorApi';
import { formatINR } from '../../lib/api';

const MAX_CARDS = 5;

export function buildRecommendationCards(response, limit = 3) {
  const recommendations = Array.isArray(response?.recommendations) ? response.recommendations : [];
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 3, MAX_CARDS));

  return recommendations.slice(0, boundedLimit).flatMap((item) => {
    if (!item || typeof item.variant_id !== 'string' || !item.variant_id.trim()) return [];
    const vehicle = item.vehicle && typeof item.vehicle === 'object' ? item.vehicle : {};
    const pricing = item.pricing && typeof item.pricing === 'object' ? item.pricing : null;
    const rawPrice = pricing?.base_ex_showroom ?? pricing?.ex_showroom ?? pricing?.price;
    const price = typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : null;
    return [{
      variantId: item.variant_id,
      name: String(vehicle.display_name || vehicle.name || item.variant_id),
      fitScore: typeof item.fit_score === 'number' ? item.fit_score : 0,
      requirementFit: String(item.requirement_fit || 'unknown'),
      budgetFit: String(item.budget_fit || 'unknown'),
      fuelFit: String(item.fuel_fit || 'unknown'),
      availabilityStatus: String(item.availability_status || 'UNKNOWN'),
      configuratorAvailable: item.configurator_available === true,
      price,
      whyItFits: String(item.why_it_fits || 'Backend-ranked match from the verified catalog.'),
      tradeoff: item.tradeoff ? String(item.tradeoff) : null,
    }];
  });
}

function badgeClass(active) {
  return active ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-white/40';
}

export default function MultiVariantRecommendations() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState('');
  const [budget, setBudget] = useState('');
  const [fuel, setFuel] = useState('');
  const [segment, setSegment] = useState('');
  const [state, setState] = useState({ loading: false, error: null, explanation: '', cards: [] });

  const submit = async (event) => {
    event.preventDefault();
    if (state.loading || !request.trim()) return;
    setState({ loading: true, error: null, explanation: '', cards: [] });
    try {
      const maxBudget = budget.trim() ? Number(budget) * 100000 : undefined;
      if (maxBudget !== undefined && (!Number.isFinite(maxBudget) || maxBudget < 0)) {
        throw new Error('Enter a valid budget in lakh.');
      }
      const response = await configuratorApi.recommendVariants({
        raw_request: request.trim(),
        ...(maxBudget !== undefined ? { max_budget: Math.round(maxBudget) } : {}),
        ...(fuel ? { preferred_fuel: fuel } : {}),
        ...(segment ? { preferred_segment: segment } : {}),
        limit: 3,
      });
      const cards = buildRecommendationCards(response.data, 3);
      setState({
        loading: false,
        error: null,
        explanation: String(response.data?.explanation || ''),
        cards,
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setState({
        loading: false,
        error: typeof detail === 'string' ? detail : error instanceof Error ? error.message : 'Recommendations are temporarily unavailable.',
        explanation: '',
        cards: [],
      });
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {open && (
        <section className="mb-3 w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#090909]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-300" />
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">AI Multi-Variant Recommendations</h2>
                <p className="mt-1 text-[9px] leading-4 text-white/35">Recommendations are limited to active backend catalog data. Pricing and 3D readiness are never invented.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Close recommendations"><X size={14} /></button>
          </div>

          <form onSubmit={submit} className="grid gap-2 md:grid-cols-4">
            <input value={request} onChange={(event) => setRequest(event.target.value.slice(0, 1800))} maxLength={1800} placeholder="e.g. family SUV with good features" className="md:col-span-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/20 focus:border-amber-400/40" />
            <input value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Budget (₹ lakh)" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/20 focus:border-amber-400/40" />
            <select value={fuel} onChange={(event) => setFuel(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400/40">
              <option value="">Any fuel</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option><option value="cng">CNG</option>
            </select>
            <select value={segment} onChange={(event) => setSegment(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400/40">
              <option value="">Any segment</option><option value="suv">SUV</option><option value="hatchback">Hatchback</option><option value="sedan">Sedan</option><option value="mpv">MPV</option>
            </select>
            <button type="submit" disabled={state.loading || !request.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">{state.loading ? 'Finding matches…' : 'Find variants'} <ArrowRight size={12} /></button>
          </form>

          {state.error && <p className="mt-3 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-[10px] leading-4 text-red-300">{state.error}</p>}
          {state.explanation && <p className="mt-3 text-[10px] leading-4 text-white/45">{state.explanation}</p>}

          {state.cards.length > 0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {state.cards.map((card) => (
                <article key={card.variantId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="truncate text-xs font-semibold text-white">{card.name}</h3><p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">{card.variantId}</p></div>
                    <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-300">{card.fitScore}% fit</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2 py-1 text-[8px] uppercase tracking-wider ${badgeClass(card.budgetFit === 'within_budget')}`}>{card.budgetFit.replaceAll('_', ' ')}</span>
                    <span className={`rounded-full border px-2 py-1 text-[8px] uppercase tracking-wider ${badgeClass(card.fuelFit === 'match')}`}>{card.fuelFit}</span>
                    <span className={`rounded-full border px-2 py-1 text-[8px] uppercase tracking-wider ${badgeClass(card.configuratorAvailable)}`}>{card.configuratorAvailable ? '3D ready' : '3D coming soon'}</span>
                  </div>
                  {card.price !== null && <p className="mt-3 font-mono text-sm text-amber-300">{formatINR(card.price)}</p>}
                  <p className="mt-2 text-[9px] leading-4 text-white/45">{card.whyItFits}</p>
                  {card.tradeoff && <p className="mt-2 text-[9px] leading-4 text-white/30">{card.tradeoff}</p>}
                  <a href={`/configurator/${encodeURIComponent(card.variantId)}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[9px] font-semibold uppercase tracking-widest text-white/70 transition hover:border-amber-400/30 hover:text-amber-300"><CarFront size={11} /> Open configurator</a>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/85 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300 shadow-xl backdrop-blur-xl transition hover:border-amber-300/60 hover:bg-black" aria-expanded={open}><Sparkles size={13} /> {open ? 'Close recommendations' : 'AI recommendations'}</button>
    </div>
  );
}
