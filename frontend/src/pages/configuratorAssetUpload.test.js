import { getUploadProgressLabel, validateConfiguratorAssetFile } from "./configuratorAssetUpload";

describe("configurator asset upload helpers", () => {
  test("accepts a non-empty GLB under the production limit", () => {
    expect(validateConfiguratorAssetFile({ name: "vehicle.glb", size: 1024 })).toBe("");
  });

  test("rejects non-GLB files and oversized files", () => {
    expect(validateConfiguratorAssetFile({ name: "vehicle.gltf", size: 1024 })).toMatch(/\.glb/i);
    expect(validateConfiguratorAssetFile({ name: "vehicle.glb", size: 200 * 1024 * 1024 + 1 })).toMatch(/200 MB/i);
  });

  test("rejects empty or missing files", () => {
    expect(validateConfiguratorAssetFile(null)).toMatch(/Select/i);
    expect(validateConfiguratorAssetFile({ name: "vehicle.glb", size: 0 })).toMatch(/empty/i);
  });

  test("formats upload progress", () => {
    expect(getUploadProgressLabel(0)).toBe("Preparing upload");
    expect(getUploadProgressLabel(42.4)).toBe("Uploading 42%");
    expect(getUploadProgressLabel(100)).toBe("Upload complete");
  });
});
