/**
 * ConfiguratorViewer — React Three Fiber scene for the verified 3D configurator.
 */

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment } from '@react-three/drei';

import VehicleModel from '../../three/VehicleModel';
import { AssetSuspense, AssetUnavailable } from '../../three/AssetLoader';
import { useLightingController } from '../../three/LightingController';
import { ConfiguratorControls, useCameraPreset } from '../../three/CameraPresets';
import { useConfiguratorStore } from '../../state/configuratorStore';

function ConfiguratorScene({ modelUrl, paintColorHex, paintMaterialNames, wheelMeshNames, optionMeshNames, purchasable, interaction, sceneRef }) {
  const controlsRef = useRef();
  useCameraPreset(interaction.cameraPreset, controlsRef);
  useLightingController(sceneRef, interaction.lighting);
  return <>
    <color attach="background" args={['#060606']} />
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 8, 5]} intensity={2} castShadow />
    <directionalLight position={[-4, 4, -4]} intensity={0.8} />
    <Environment preset="studio" />
    <Bounds fit clip observe margin={1.3}>
      <AssetSuspense>
        <group ref={sceneRef} position={[0, -0.5, 0]}>
          <VehicleModel url={modelUrl} paintColorHex={paintColorHex} paintMaterialNames={paintMaterialNames} wheelMeshNames={wheelMeshNames} optionMeshNames={optionMeshNames} purchasable={purchasable} interaction={interaction} />
        </group>
      </AssetSuspense>
    </Bounds>
    <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={14} blur={2.5} far={5} />
    <ConfiguratorControls autoRotate={interaction.autoRotate} onInteract={() => useConfiguratorStore.getState().pauseAutoRotate()} controlsRef={controlsRef} />
  </>;
}

export default function ConfiguratorViewer({ style, options }) {
  const sceneRef = useRef();
  const asset = useConfiguratorStore((state) => state.asset);
  const purchasable = useConfiguratorStore((state) => state.purchasable);
  const interaction = useConfiguratorStore((state) => state.interaction);
  const isInitialized = useConfiguratorStore((state) => state.isInitialized);
  if (!isInitialized) return <div style={{ minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', borderRadius: 20, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', ...style }}>Select a vehicle to open the configurator</div>;
  if (!asset.available || !asset.url) return <AssetUnavailable status={asset.configuratorStatus} variantName={purchasable.variantId} />;
  const selectedPaint = options?.colors?.find((color) => color.color_id === purchasable.paintId);
  return <div style={{ width: '100%', minHeight: 480, borderRadius: 20, overflow: 'hidden', ...style }}>
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [4.5, 1.6, 5.5], fov: 38 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <ConfiguratorScene modelUrl={asset.url} paintColorHex={selectedPaint?.primary_hex || null} paintMaterialNames={asset.paintMaterialNames || []} wheelMeshNames={asset.wheelMeshNames || {}} optionMeshNames={asset.optionMeshNames || {}} purchasable={purchasable} interaction={interaction} sceneRef={sceneRef} />
    </Canvas>
  </div>;
}
