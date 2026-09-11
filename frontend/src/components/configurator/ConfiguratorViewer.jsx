/**
 * ConfiguratorViewer — React Three Fiber scene for the verified 3D configurator.
 */

import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment } from '@react-three/drei';
import { Maximize2, Minimize2, Share2, Camera } from 'lucide-react';

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
  const [cinematic, setCinematic] = useState(false);
  const [captureState, setCaptureState] = useState(null);
  const asset = useConfiguratorStore((state) => state.asset);
  const purchasable = useConfiguratorStore((state) => state.purchasable);
  const interaction = useConfiguratorStore((state) => state.interaction);
  const isInitialized = useConfiguratorStore((state) => state.isInitialized);
  if (!isInitialized) return <div style={{ minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', borderRadius: 20, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', ...style }}>Select a vehicle to open the configurator</div>;
  if (!asset.available || !asset.url) return <AssetUnavailable status={asset.configuratorStatus} variantName={purchasable.variantId} />;
  const selectedPaint = options?.colors?.find((color) => color.color_id === purchasable.paintId);

  const capture = async (share = false) => {
    const canvas = sceneRef.current?.parent?.parent?.domElement || document.querySelector('.auto-ai-configurator-canvas canvas');
    if (!canvas) return;
    setCaptureState('capturing');
    try {
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Screenshot unavailable')), 'image/png', 1));
      const file = new File([blob], 'auto-ai-configured-car.png', { type: 'image/png' });
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'My Auto AI India configuration', files: [file] });
      else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      setCaptureState('done');
      window.setTimeout(() => setCaptureState(null), 1600);
    } catch (error) {
      setCaptureState(error?.name === 'AbortError' ? null : 'error');
      window.setTimeout(() => setCaptureState(null), 1600);
    }
  };

  return <div className={`auto-ai-configurator-canvas relative w-full overflow-hidden rounded-[20px] transition-all duration-700 ${cinematic ? 'min-h-[680px] ring-1 ring-amber-400/30' : 'min-h-[480px]'}`} style={style}>
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [4.5, 1.6, 5.5], fov: 38 }} gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}>
      <ConfiguratorScene modelUrl={asset.url} paintColorHex={selectedPaint?.primary_hex || null} paintMaterialNames={asset.paintMaterialNames || []} wheelMeshNames={asset.wheelMeshNames || {}} optionMeshNames={asset.optionMeshNames || {}} purchasable={purchasable} interaction={interaction} sceneRef={sceneRef} />
    </Canvas>
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
      <div className="pointer-events-auto rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/50 backdrop-blur">Verified asset only</div>
      <div className="pointer-events-auto flex gap-2">
        <button type="button" title={cinematic ? 'Exit cinematic mode' : 'Cinematic mode'} onClick={() => setCinematic((value) => !value)} className="rounded-full border border-white/10 bg-black/45 p-2.5 text-white/70 backdrop-blur hover:border-amber-400/50 hover:text-amber-300" aria-label="Toggle cinematic mode">
          {cinematic ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button type="button" title="Capture configuration" onClick={() => capture(false)} className="rounded-full border border-white/10 bg-black/45 p-2.5 text-white/70 backdrop-blur hover:border-amber-400/50 hover:text-amber-300" aria-label="Capture configuration screenshot">
          <Camera size={14} />
        </button>
        <button type="button" title="Share configuration" onClick={() => capture(true)} className="rounded-full border border-white/10 bg-black/45 p-2.5 text-white/70 backdrop-blur hover:border-amber-400/50 hover:text-amber-300" aria-label="Share configuration screenshot">
          <Share2 size={14} />
        </button>
      </div>
    </div>
    {captureState && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-[9px] uppercase tracking-widest text-white/70 backdrop-blur">{captureState === 'capturing' ? 'Creating share card…' : captureState === 'done' ? 'Ready' : 'Capture unavailable'}</div>}
  </div>;
}
