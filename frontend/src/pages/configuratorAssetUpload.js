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

function putToObjectStorage(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType || "model/gltf-binary");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(`Object storage upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Object storage upload failed."));
    xhr.onabort = () => reject(new Error("Object storage upload was cancelled."));
    xhr.send(file);
  });
}

export async function uploadConfiguratorAsset({ api, assetId, file, onProgress }) {
  const validationError = validateConfiguratorAssetFile(file);
  if (validationError) throw new Error(validationError);

  const { data: session } = await api.post("/v1/admin/configurator/assets/upload-url", {
    asset_id: assetId,
    filename: file.name,
  });

  await putToObjectStorage(session.upload_url, file, session.content_type, onProgress);

  const { data: finalized } = await api.post("/v1/admin/configurator/assets/finalize-upload", {
    asset_id: assetId,
    storage_key: session.storage_key,
  });

  return finalized;
}

export { MAX_ASSET_BYTES };
