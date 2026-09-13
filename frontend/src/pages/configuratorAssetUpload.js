const MAX_ASSET_BYTES = 200 * 1024 * 1024;

export function validateConfiguratorAssetFile(file) {
  if (!file) return "Select a GLB file.";
  if (!file.name.toLowerCase().endsWith(".glb")) return "Production uploads must use a .glb file.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_ASSET_BYTES) return "The selected file exceeds the 200 MB limit.";
  return "";
}

export function getUploadProgressLabel(progress) {
  if (progress >= 100) return "Upload complete";
  if (progress <= 0) return "Preparing upload";
  return `Uploading ${Math.round(progress)}%`;
}

export async function uploadConfiguratorAsset({ api, apiBaseUrl, adminToken, assetId, file, onProgress }) {
  const validationError = validateConfiguratorAssetFile(file);
  if (validationError) throw new Error(validationError);
  if (!adminToken) throw new Error("Admin authentication is required.");

  const { data: session } = await api.post("/v1/admin/configurator/assets/upload-url", {
    asset_id: assetId,
    filename: file.name,
  });

  const response = await fetch(session.upload_url, {
    method: "PUT",
    headers: { "Content-Type": session.content_type || "model/gltf-binary" },
    body: file,
  });
  if (!response.ok) throw new Error(`Object storage upload failed (${response.status}).`);
  onProgress?.(100);

  const { data: finalized } = await api.post("/v1/admin/configurator/assets/finalize-upload", {
    asset_id: assetId,
    storage_key: session.storage_key,
  });

  return finalized;
}

export { MAX_ASSET_BYTES };
