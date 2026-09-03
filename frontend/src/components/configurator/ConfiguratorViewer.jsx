/**
 * ConfiguratorViewer — the React Three Fiber Canvas for the 3D configurator.
 *
 * Architecture (modular, one concern per module):
 *   ConfiguratorViewer        ← this file (Canvas + scene setup)
 *     AssetSuspense           ← progressive loading + error boundary
 *       VehicleModel          ← GLB/GLTF load + paint material system
 *     LightingController      ← headlights, DRL, indicators, hazard
 *     ConfiguratorControls    ← OrbitControls with auto-rotate
 *     Environment + shadows   ← via Drei
 *
 * Rules:
 *  - If no asset URL → renders AssetUnavailable DOM component (not inside Canvas).
 *  - All state comes from configuratorStore (no local state here).
 *  - Auto-rotation pauses on user interact (pauseAutoRotate action).
 *
 * Status: FOUNDATION — renders real GLB when URL provided.
 */

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Environment,
} from "@react-three/drei";

import VehicleModel from "../../three/VehicleModel";
import { AssetSuspense, AssetUnavailable } from "../../three/AssetLoader";
import { useLightingController } from "../../three/LightingController";
import { ConfiguratorControls, useCameraPreset } from "../../three/CameraPresets";
import { useConfiguratorStore } from "../../state/configuratorStore";

// Inner scene — rendered inside Canvas context
function ConfiguratorScene({ modelUrl, paintColorHex, paintMaterialNames, sceneRef }) {
  const controlsRef = useRef();
  const interaction = useConfiguratorStore((s) => s.interaction);
  const pauseAutoRotate = useConfiguratorStore((s) => s.pauseAutoRotate);

  // Camera preset animation
  useCameraPreset(interaction.cameraPreset, controlsRef);

  // Lighting system applied to scene
  useLightingController(sceneRef.current, interaction.lighting);

  return (
    <>
      <color attach="background" args={["#060606"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={2.0} castShadow />
      <directionalLight position={[-4, 4, -4]} intensity={0.8} />
      <Environment preset="studio" />

      <Bounds fit clip observe margin={1.3}>
        <AssetSuspense>
          <group ref={sceneRef} position={[0, -0.5, 0]}>
            <VehicleModel
              url={modelUrl}
              paintColorHex={paintColorHex}
              paintMaterialNames={paintMaterialNames}
            />
          </group>
        </AssetSuspense>
      </Bounds>

      <ContactShadows
        position={[0, -1.0, 0]}
        opacity={0.5}
        scale={14}
        blur={2.5}
        far={5}
      />

      <ConfiguratorControls
        autoRotate={interaction.autoRotate}
        onInteract={pauseAutoRotate}
        controlsRef={controlsRef}
      />
    </>
  );
}

/**
 * ConfiguratorViewer — public component used by the configurator page.
 */
export default function ConfiguratorViewer({ style }) {
  const sceneRef = useRef();
  const asset = useConfiguratorStore((s) => s.asset);
  const purchasable = useConfiguratorStore((s) => s.purchasable);
  const isInitialized = useConfiguratorStore((s) => s.isInitialized);

  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
          borderRadius: 20,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          ...style,
        }}
      >
        Select a vehicle to open the configurator
      </div>
    );
  }

  // No verified 3D asset → clear unavailable state, never a fake model
  if (!asset.available || !asset.url) {
    return (
      <AssetUnavailable
        status={asset.configuratorStatus}
        variantName={purchasable.variantId}
      />
    );
  }

  // Find the selected paint's hex color
  const paintColorHex = null; // resolved by parent from selected color option
  const paintMaterialNames = asset.paintMaterialNames || [];

  return (
    <div style={{ width: "100%", minHeight: 480, borderRadius: 20, overflow: "hidden", ...style }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [4.5, 1.6, 5.5], fov: 38 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ConfiguratorScene
          modelUrl={asset.url}
          paintColorHex={paintColorHex}
          paintMaterialNames={paintMaterialNames}
          sceneRef={sceneRef}
        />
      </Canvas>
    </div>
  );
}
