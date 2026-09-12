import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, FileUp, Loader2, Lock, LogOut, PackageCheck, RefreshCw, ShieldCheck, X } from "lucide-react";
import { api, ADMIN_TOKEN_KEY } from "../lib/api";

const emptyForm = {
  asset_id: "",
  variant_id: "",
  model_id: "",
  brand_id: "",
  format: "glb",
  url: "",
  cdn_url: "",
  version: "1.0.0",
  provenance: "LICENSED_THIRD_PARTY",
  license_name: "",
  license_url: "",
  publisher: "",
  supported_interactions: [],
  paint_material_names: [],
  wheel_mesh_names: {},
  option_mesh_names: {},
  interaction_animation_names: {},
};

const interactionOptions = [
  "camera_exterior", "camera_interior", "doors", "hood", "boot", "frunk", "sunroof",
  "headlights", "drl", "taillights", "fog_lights", "left_indicator", "right_indicator", "hazard", "interior_lights",
];

function errorMessage(error, fallback = "Request failed") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail?.errors)) return detail.errors.join("; ");
  return error?.message || fallback;
}

export default function ConfiguratorAssetManager() {
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)));
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [reviewNotes, setReviewNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAssets = useCallback(async () => {
    try {
      const { data } = await api.get("/v1/admin/configurator/assets");
      setAssets(data || []);
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthed(false);
      } else setError(errorMessage(e, "Could not load assets"));
    }
  }, []);

  useEffect(() => { if (authed) loadAssets(); }, [authed, loadAssets]);

  const selected = useMemo(() => assets.find((asset) => asset.asset_id === selectedId) || null, [assets, selectedId]);

  const authenticate = async (event) => {
    event.preventDefault();
    setBusy("login"); setLoginError("");
    try {
      const { data } = await api.post("/admin/verify", { pin });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAuthed(true);
      setPin("");
    } catch (e) {
      setLoginError(errorMessage(e, "Invalid PIN"));
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } finally { setBusy(""); }
  };

  const selectAsset = (asset) => {
    setSelectedId(asset.asset_id);
    setForm({ ...emptyForm, ...asset });
    setReviewNotes(asset.review_notes || "");
    setMessage(""); setError("");
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveAsset = async () => {
    setBusy("save"); setMessage(""); setError("");
    try {
      await api.post("/v1/admin/configurator/assets", {
        ...form,
        supported_interactions: Array.isArray(form.supported_interactions) ? form.supported_interactions : [],
        paint_material_names: Array.isArray(form.paint_material_names) ? form.paint_material_names : [],
        wheel_mesh_names: form.wheel_mesh_names || {},
        option_mesh_names: form.option_mesh_names || {},
        interaction_animation_names: form.interaction_animation_names || {},
      });
      setMessage("Asset metadata saved. Technical validation and admin review are still required before publication.");
      await loadAssets();
    } catch (e) { setError(errorMessage(e, "Could not save asset metadata")); }
    finally { setBusy(""); }
  };

  const reviewAsset = async (approved) => {
    if (!selected) return;
    setBusy("review"); setMessage(""); setError("");
    try {
      await api.post("/v1/admin/configurator/assets/review", {
        asset_id: selected.asset_id,
        approved,
        review_notes: reviewNotes,
      });
      setMessage(approved ? "Asset approved for publication gate." : "Asset review rejected; publication remains blocked.");
      await loadAssets();
    } catch (e) { setError(errorMessage(e, "Could not update asset review")); }
    finally { setBusy(""); }
  };

  const publish = async (shouldPublish) => {
    if (!selected) return;
    setBusy("publish"); setMessage(""); setError("");
    try {
      await api.post("/v1/admin/configurator/assets/publish", { asset_id: selected.asset_id, publish: shouldPublish });
      setMessage(shouldPublish ? "Asset published." : "Asset unpublished.");
      await loadAssets();
    } catch (e) { setError(errorMessage(e, "Publication gate rejected the request")); }
    finally { setBusy(""); }
  };

  const assign = async () => {
    if (!selected) return;
    setBusy("assign"); setMessage(""); setError("");
    try {
      await api.post("/v1/admin/configurator/assets/assign", { asset_id: selected.asset_id, variant_id: selected.variant_id });
      setMessage("Asset assigned to the matching variant.");
      await loadAssets();
    } catch (e) { setError(errorMessage(e, "Could not assign asset")); }
    finally { setBusy(""); }
  };

  const logout = () => {
    api.post("/admin/logout", {}).catch(() => {});
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center px-6" data-testid="asset-manager-login">
        <form onSubmit={authenticate} className="w-full max-w-md border border-[#262626] bg-[#0A0A0A] p-6">
          <div className="flex items-center gap-3 mb-5"><Lock size={16} className="text-[#F59E0B]" /><span className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">/// configurator assets</span></div>
          <h1 className="font-display text-4xl font-light uppercase tracking-tight">Asset <span className="text-[#F59E0B]">manager</span></h1>
          <p className="text-sm text-slate-400 mt-2">Admin access is required to manage 3D vehicle assets.</p>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="Admin PIN" className="w-full ai-input mt-6 px-3 py-3 text-center tracking-[0.3em]" data-testid="asset-admin-pin" />
          {loginError && <p className="text-xs text-[#EF4444] mt-3">{loginError}</p>}
          <button disabled={!pin || busy === "login"} className="w-full mt-4 bg-[#F59E0B] text-black py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50">{busy === "login" ? "Verifying…" : "Enter Asset Manager"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="configurator-asset-manager">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3"><PackageCheck size={16} className="text-[#F59E0B]" /><span className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">/// verified 3D asset pipeline</span></div>
            <h1 className="font-display text-4xl lg:text-5xl font-light uppercase tracking-tight">Configurator <span className="text-[#F59E0B]">assets</span></h1>
            <p className="text-sm text-slate-400 mt-2">Inspect, review, publish and assign vehicle assets without bypassing the production gates.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAssets} className="border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.18em] flex items-center gap-2"><RefreshCw size={13} /> Refresh</button>
            <button onClick={logout} className="border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.18em] flex items-center gap-2 text-slate-400"><LogOut size={13} /> Lock</button>
          </div>
        </header>

        {message && <div className="border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-sm p-4 mb-5">{message}</div>}
        {error && <div className="border border-red-500/30 bg-red-500/5 text-red-300 text-sm p-4 mb-5 flex gap-2"><AlertTriangle size={16} />{error}</div>}

        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <section className="border border-[#262626] bg-[#0A0A0A] p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="text-xs uppercase tracking-[0.22em] font-bold">Asset registry</h2><span className="text-xs text-slate-500">{assets.length} assets</span></div>
            <div className="space-y-2 max-h-[720px] overflow-auto">
              {assets.map((asset) => {
                const status = asset.published ? "PUBLISHED" : asset.validation_passed ? (asset.admin_reviewed ? "READY" : "REVIEW") : "FAILED";
                return (
                  <button key={asset.asset_id} onClick={() => selectAsset(asset)} className={`w-full text-left border p-4 transition-colors ${selectedId === asset.asset_id ? "border-[#F59E0B] bg-[#111111]" : "border-[#202020] hover:border-[#404040]"}`}>
                    <div className="flex justify-between gap-3"><span className="font-medium">{asset.asset_id}</span><span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: status === "PUBLISHED" ? "#10B981" : status === "FAILED" ? "#EF4444" : "#F59E0B" }}>{status}</span></div>
                    <div className="text-xs text-slate-500 mt-1">{asset.brand_id} / {asset.model_id} / {asset.variant_id}</div>
                    <div className="text-[10px] text-slate-600 mt-2">v{asset.version} · {asset.provenance}</div>
                  </button>
                );
              })}
              {!assets.length && <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-[#262626]">No assets registered yet.</div>}
            </div>
          </section>

          <section className="border border-[#262626] bg-[#0A0A0A] p-5">
            <div className="flex items-center gap-3 mb-5"><ShieldCheck size={17} className="text-[#F59E0B]" /><h2 className="text-xs uppercase tracking-[0.22em] font-bold">Asset record</h2></div>
            <div className="grid md:grid-cols-2 gap-3">
              {[["asset_id","Asset ID"],["variant_id","Variant ID"],["model_id","Model ID"],["brand_id","Brand ID"],["version","Version"],["url","GLB/GLTF URL"],["cdn_url","CDN URL"],["license_name","License Name"],["license_url","License URL"],["publisher","Publisher"]].map(([key,label]) => (
                <label key={key} className={key === "url" || key === "cdn_url" ? "md:col-span-2 text-xs text-slate-400" : "text-xs text-slate-400"}>{label}<input value={form[key] || ""} onChange={(e) => updateField(key,e.target.value)} className="w-full ai-input mt-1 px-3 py-2.5 text-sm" /></label>
              ))}
            </div>
            <label className="block text-xs text-slate-400 mt-3">Provenance<select value={form.provenance} onChange={(e) => updateField("provenance",e.target.value)} className="w-full ai-input mt-1 px-3 py-2.5"><option value="OEM_AUTHORIZED">OEM authorized</option><option value="AUTO_AI_LICENSED">Auto AI licensed</option><option value="LICENSED_THIRD_PARTY">Licensed third party</option><option value="AI_GENERATED_CONCEPT">AI generated concept</option><option value="UNKNOWN">Unknown</option></select></label>

            <div className="mt-5 border-t border-[#202020] pt-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Supported interactions</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {interactionOptions.map((name) => {
                  const checked = (form.supported_interactions || []).includes(name);
                  return <label key={name} className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={checked} onChange={(e) => updateField("supported_interactions", e.target.checked ? [...(form.supported_interactions || []), name] : (form.supported_interactions || []).filter((v) => v !== name))} />{name}</label>;
                })}
              </div>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-2 text-xs">
              <button onClick={saveAsset} disabled={busy === "save"} className="bg-[#F59E0B] text-black py-3 font-bold uppercase tracking-[0.15em] disabled:opacity-50 flex justify-center gap-2">{busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Metadata</button>
              <button onClick={() => reviewAsset(true)} disabled={!selected || busy === "review"} className="border border-emerald-500/40 text-emerald-300 py-3 font-bold uppercase tracking-[0.15em] disabled:opacity-40"><ClipboardCheck size={14} className="inline mr-1" /> Approve</button>
              <button onClick={() => reviewAsset(false)} disabled={!selected || busy === "review"} className="border border-red-500/40 text-red-300 py-3 font-bold uppercase tracking-[0.15em] disabled:opacity-40"><X size={14} className="inline mr-1" /> Reject</button>
            </div>

            <label className="block text-xs text-slate-400 mt-4">Admin review notes<textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} maxLength={1000} rows={3} className="w-full ai-input mt-1 px-3 py-2.5 text-sm" placeholder="Record provenance, rights review, technical findings or approval notes." /></label>

            <div className="mt-5 border-t border-[#202020] pt-5 flex flex-wrap gap-2">
              <button onClick={() => publish(true)} disabled={!selected || busy === "publish"} className="bg-emerald-500 text-black px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-40"><Check size={13} className="inline mr-1" /> Publish</button>
              <button onClick={() => publish(false)} disabled={!selected || busy === "publish"} className="border border-red-500/40 text-red-300 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-40">Unpublish</button>
              <button onClick={assign} disabled={!selected || !selected.published || busy === "assign"} className="border border-[#F59E0B]/50 text-[#F59E0B] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-40">Assign to Variant</button>
            </div>

            {selected && <div className="mt-5 grid md:grid-cols-3 gap-3 text-xs">
              <Status label="Validation" ok={selected.validation_passed} value={selected.validation_passed ? "PASSED" : "BLOCKED"} />
              <Status label="Admin Review" ok={selected.admin_reviewed} value={selected.admin_reviewed ? "APPROVED" : "PENDING"} />
              <Status label="Publication" ok={selected.published} value={selected.published ? "PUBLISHED" : "NOT PUBLISHED"} />
            </div>}

            {selected && (selected.validation_errors || []).length > 0 && <div className="mt-5 border border-red-500/30 bg-red-500/5 p-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-red-300 mb-2">Validation errors</div>{selected.validation_errors.map((item, i) => <div key={i} className="text-xs text-red-200/80">• {item}</div>)}</div>}
            {selected?.inspected_structure && <div className="mt-5 border border-[#202020] p-4 text-xs text-slate-400"><div className="font-bold uppercase tracking-[0.18em] text-slate-300 mb-2">Inspection snapshot</div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Meshes" value={selected.inspected_structure.mesh_count} /><Metric label="Nodes" value={selected.inspected_structure.node_count} /><Metric label="Materials" value={selected.inspected_structure.material_count} /><Metric label="Animations" value={selected.inspected_structure.animation_count} /></div></div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Status({ label, ok, value }) { return <div className="border border-[#202020] p-3"><div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</div><div className={`mt-1 font-bold ${ok ? "text-emerald-300" : "text-amber-300"}`}>{value}</div></div>; }
function Metric({ label, value }) { return <div><div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">{label}</div><div className="text-lg text-slate-200 mt-1">{value ?? 0}</div></div>; }
