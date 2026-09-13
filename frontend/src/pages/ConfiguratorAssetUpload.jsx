import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Lock, LogOut, PackageCheck, RefreshCw } from "lucide-react";
import { api, ADMIN_TOKEN_KEY } from "../lib/api";
import { getUploadProgressLabel, uploadConfiguratorAsset, validateConfiguratorAssetFile } from "./configuratorAssetUpload";

function errorMessage(error, fallback = "Request failed") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail?.errors)) return detail.errors.join("; ");
  return error?.message || fallback;
}

export default function ConfiguratorAssetUpload() {
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)));
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const loadAssets = useCallback(async () => {
    try {
      const { data } = await api.get("/v1/admin/configurator/assets");
      const nextAssets = Array.isArray(data) ? data : [];
      setAssets(nextAssets);
      setAssetId((current) => current || nextAssets[0]?.asset_id || "");
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthed(false);
      } else setError(errorMessage(e, "Could not load assets"));
    }
  }, []);

  useEffect(() => { if (authed) loadAssets(); }, [authed, loadAssets]);

  const selected = useMemo(() => assets.find((asset) => asset.asset_id === assetId) || null, [assets, assetId]);

  const authenticate = async (event) => {
    event.preventDefault();
    setLoginError("");
    try {
      const { data } = await api.post("/admin/verify", { pin });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setAuthed(true);
      setPin("");
    } catch (e) {
      setLoginError(errorMessage(e, "Invalid PIN"));
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  };

  const selectFile = (nextFile) => {
    setResult(null);
    setMessage("");
    setError("");
    const validationError = validateConfiguratorAssetFile(nextFile);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }
    setFile(nextFile);
    setProgress(0);
  };

  const upload = async () => {
    if (!selected) return setError("Select a registered asset first.");
    const validationError = validateConfiguratorAssetFile(file);
    if (validationError) return setError(validationError);

    setBusy(true);
    setProgress(1);
    setMessage("");
    setError("");
    setResult(null);
    try {
      const finalized = await uploadConfiguratorAsset({
        api,
        assetId: selected.asset_id,
        file,
        onProgress: setProgress,
      });
      setResult(finalized);
      setProgress(100);
      setMessage(finalized.valid
        ? "Upload verified successfully. Admin approval is required before publication."
        : "Upload completed, but technical validation failed. Review the validation errors before continuing.");
      setFile(null);
      await loadAssets();
    } catch (e) {
      setError(errorMessage(e, "Could not upload and verify the asset"));
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    api.post("/admin/logout", {}).catch(() => {});
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center px-6" data-testid="asset-upload-login">
        <form onSubmit={authenticate} className="w-full max-w-md border border-[#262626] bg-[#0A0A0A] p-6">
          <div className="flex items-center gap-3 mb-5"><Lock size={16} className="text-[#F59E0B]" /><span className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">/// verified 3D asset pipeline</span></div>
          <h1 className="font-display text-4xl font-light uppercase tracking-tight">Direct <span className="text-[#F59E0B]">upload</span></h1>
          <p className="text-sm text-slate-400 mt-2">Admin access is required to upload production GLB assets.</p>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="Admin PIN" className="w-full ai-input mt-6 px-3 py-3 text-center tracking-[0.3em]" data-testid="asset-upload-admin-pin" />
          {loginError && <p className="text-xs text-[#EF4444] mt-3">{loginError}</p>}
          <button disabled={!pin} className="w-full mt-4 bg-[#F59E0B] text-black py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50">Enter Upload Manager</button>
        </form>
      </div>
    );
  }

  const status = result?.valid ? "TECHNICALLY VERIFIED" : result ? "VALIDATION FAILED" : selected?.storage_status || "NOT UPLOADED";

  return (
    <div className="bg-[#050505] min-h-screen" data-testid="configurator-asset-upload">
      <div className="max-w-5xl mx-auto px-5 lg:px-10 py-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3"><PackageCheck size={16} className="text-[#F59E0B]" /><span className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B] font-bold">/// direct object storage</span></div>
            <h1 className="font-display text-4xl lg:text-5xl font-light uppercase tracking-tight">3D Asset <span className="text-[#F59E0B]">upload</span></h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">The browser uploads directly to configured object storage. The API then downloads, hashes, inspects and validates the GLB before it can enter the review and publication gates.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAssets} className="border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.18em] flex items-center gap-2"><RefreshCw size={13} /> Refresh</button>
            <button onClick={logout} className="border border-[#262626] px-4 py-2 text-xs uppercase tracking-[0.18em] flex items-center gap-2 text-slate-400"><LogOut size={13} /> Lock</button>
          </div>
        </header>

        {message && <div className="border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-sm p-4 mb-5 flex gap-2"><CheckCircle2 size={17} />{message}</div>}
        {error && <div className="border border-red-500/30 bg-red-500/5 text-red-300 text-sm p-4 mb-5 flex gap-2"><AlertTriangle size={17} />{error}</div>}

        <section className="border border-[#262626] bg-[#0A0A0A] p-5">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="text-xs text-slate-400">Registered asset
              <select value={assetId} onChange={(e) => { setAssetId(e.target.value); setResult(null); setMessage(""); setError(""); }} className="w-full ai-input mt-2 px-3 py-3 text-sm">
                <option value="">Select an asset</option>
                {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_id} · v{asset.version} · {asset.variant_id}</option>)}
              </select>
            </label>
            <div className="text-xs text-slate-400">
              <span>Current storage status</span>
              <div className="mt-2 border border-[#202020] px-3 py-3 text-sm text-slate-200">{status}</div>
            </div>
          </div>

          {selected && <div className="mt-5 grid md:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="border border-[#202020] p-3">Variant<br /><strong className="text-slate-200">{selected.variant_id}</strong></div>
            <div className="border border-[#202020] p-3">Version<br /><strong className="text-slate-200">v{selected.version}</strong></div>
            <div className="border border-[#202020] p-3">Rights<br /><strong className="text-slate-200">{selected.provenance || "Not recorded"}</strong></div>
          </div>}

          <label className="mt-6 border border-dashed border-[#404040] min-h-44 flex flex-col items-center justify-center text-center px-5 cursor-pointer hover:border-[#F59E0B] transition-colors">
            <FileUp size={28} className="text-[#F59E0B] mb-3" />
            <span className="text-sm text-slate-200">Choose production GLB</span>
            <span className="text-xs text-slate-500 mt-1">GLB only · maximum 200 MB</span>
            <input type="file" accept=".glb,model/gltf-binary" className="sr-only" disabled={busy} onChange={(e) => selectFile(e.target.files?.[0] || null)} />
            {file && <span className="text-xs text-[#F59E0B] mt-3">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
          </label>

          <div className="mt-5">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500"><span>{getUploadProgressLabel(progress)}</span><span>{Math.round(progress)}%</span></div>
            <div className="h-1 bg-[#1C1C1C] mt-2 overflow-hidden"><div className="h-full bg-[#F59E0B] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>

          <button onClick={upload} disabled={busy || !selected || !file} className="w-full mt-5 bg-[#F59E0B] text-black py-3.5 text-xs font-bold uppercase tracking-[0.18em] disabled:opacity-40">{busy ? "Uploading & verifying…" : "Upload, inspect & validate"}</button>

          {result && <div className="mt-6 border border-[#202020] p-4">
            <div className="flex items-center justify-between gap-4"><span className="text-xs uppercase tracking-[0.18em] font-bold">Verification result</span><span className={result.valid ? "text-emerald-300 text-xs" : "text-red-300 text-xs"}>{result.valid ? "PASS" : "FAIL"}</span></div>
            <div className="grid md:grid-cols-2 gap-3 mt-4 text-xs">
              <div className="text-slate-500">SHA-256<br /><span className="text-slate-200 break-all">{result.checksum_sha256}</span></div>
              <div className="text-slate-500">Stored size<br /><span className="text-slate-200">{(result.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span></div>
            </div>
            {result.manifest?.errors?.length > 0 && <div className="mt-4 text-xs text-red-300"><strong>Manifest errors</strong><ul className="list-disc ml-5 mt-1">{result.manifest.errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {result.structure?.errors?.length > 0 && <div className="mt-4 text-xs text-red-300"><strong>Structure errors</strong><ul className="list-disc ml-5 mt-1">{result.structure.errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {result.valid && <p className="mt-4 text-xs text-emerald-300">Technical validation passed. Continue in the Asset Manager to record human review and publish.</p>}
          </div>}
        </section>
      </div>
    </div>
  );
}
