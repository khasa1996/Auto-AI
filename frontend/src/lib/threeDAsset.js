/**
 * Normalized contract for verified vehicle 3D assets.
 *
 * The backend may evolve its field naming while older records remain in MongoDB.
 * This module keeps that compatibility at the frontend boundary without
 * treating ordinary vehicle photos as 3D assets.
 */

const MODEL_URL_FIELDS = [
  "model3dUrl",
  "model3DUrl",
  "model_3d_url",
  "glbUrl",
  "glb_url",
  "gltfUrl",
  "gltf_url",
];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function resolveModel3DUrl(car) {
  if (!car || typeof car !== "object") return null;

  for (const field of MODEL_URL_FIELDS) {
    const value = nonEmptyString(car[field]);
    if (value) return value;
  }

  const threeD = car.threeD;
  if (threeD && typeof threeD === "object") {
    const value = nonEmptyString(threeD.modelUrl);
    if (value) return value;
  }

  return null;
}

export function hasVerified3DAsset(car) {
  return Boolean(resolveModel3DUrl(car));
}

export function normalize3DAsset(car) {
  const modelUrl = resolveModel3DUrl(car);
  const threeD = car && typeof car.threeD === "object" ? car.threeD : {};

  return {
    enabled: Boolean(modelUrl) && threeD.enabled !== false,
    modelUrl,
    version: nonEmptyString(threeD.version),
    paintMaterials: Array.isArray(threeD.paintMaterials) ? threeD.paintMaterials : [],
    wheelOptions: Array.isArray(threeD.wheelOptions) ? threeD.wheelOptions : [],
    interiorOptions: Array.isArray(threeD.interiorOptions) ? threeD.interiorOptions : [],
    supportedInteractions: Array.isArray(threeD.supportedInteractions)
      ? threeD.supportedInteractions
      : [],
  };
}
