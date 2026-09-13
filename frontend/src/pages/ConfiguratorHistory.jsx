import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, GitCompare } from 'lucide-react';
import { configuratorApi } from '../services/configuratorApi';
import { formatINR } from '../lib/api';
import { formatHistoryDate, getHistoryLabel } from './configuratorHistoryUtils';

export { formatHistoryDate, getHistoryLabel } from './configuratorHistoryUtils';

function valueLabel(value, fallback = 'Not selected') {
  return value || fallback;
}

export default function ConfiguratorHistory() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    configuratorApi.getHistory()
      .then((response) => {
        if (!cancelled) setItems(response.data.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Sign in to view saved configurations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = (item) => {
    setComparison(null);
    setSelected((current) => current.some((entry) => entry.config_id === item.config_id)
      ? current.filter((entry) => entry.config_id !== item.config_id)
      : current.length < 2 ? [...current, item] : [current[1], item]);
  };

  const compare = async () => {
    if (selected.length !== 2 || comparing) return;
    setError(null);
    setComparing(true);
    try {
      const response = await configuratorApi.compareConfigurations(selected[0].configuration.purchasable, selected[1].configuration.purchasable);
      setComparison(response.data);
    } catch (err) {
      setError(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Unable to compare configurations');
    } finally {
      setComparing(false);
    }
  };

  return <main className="min-h-screen bg-[#050505] pt-24 text-white"><div className="mx-auto max-w-5xl px-5 py-10">
    <Link to="/cars" className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white"><ArrowLeft size={14} /> Back to cars</Link>
    <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Auto AI India</p><h1 className="mt-2 text-3xl font-light sm:text-4xl">Configuration history</h1><p className="mt-2 text-sm text-white/40">Your saved builds, with backend-authoritative prices and comparison.</p></div><button type="button" disabled={selected.length !== 2 || comparing} onClick={compare} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-20 sm:w-auto"><GitCompare size={14} /> {comparing ? 'Comparing…' : 'Compare'}</button></div>
    {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">{error}</div>}
    {loading ? <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-8 text-center text-xs uppercase tracking-widest text-white/30">Loading saved configurations…</div> : items.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-8 text-center text-sm text-white/40">No saved configurations yet.</div> : <div className="grid gap-3">{items.map((item) => { const checked = selected.some((entry) => entry.config_id === item.config_id); return <button key={item.config_id} type="button" onClick={() => toggle(item)} className={`rounded-2xl border p-4 text-left transition sm:p-5 ${checked ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-[#0d0d0d] hover:border-white/25'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="break-words text-xs leading-5 text-white/70">{getHistoryLabel(item.configuration)}</div><div className="mt-2 text-[10px] text-white/30">{valueLabel(item.city, 'Base pricing')} · {formatHistoryDate(item.updated_at)}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-white/20">ID {item.config_id?.slice(0, 8) || '—'}</div></div><div className="shrink-0 text-right"><div className="font-mono text-base text-amber-400 sm:text-lg">{item.price_snapshot ? formatINR(item.price_snapshot) : '—'}</div>{checked && <Check className="ml-auto mt-2 text-amber-300" size={14} />}</div></div></button>; })}</div>}
    {comparison && <section className="mt-8 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><h2 className="text-[10px] uppercase tracking-widest text-white/40">Build comparison</h2><p className="mt-3 text-sm text-white/60">Differences: {comparison.differences?.length ? comparison.differences.join(', ') : 'None — these builds are equivalent.'}</p></section>}
  </div></main>;
}
