/**
 * ConfiguratorViewer — React Three Fiber scene for the verified 3D configurator.
 */

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment } from '@react-three/drei';
import { Maximize2, Minimize2, Share2, Camera, Info, RotateCw } from 'lucide-react';

import VehicleModel from '../../three/VehicleModel';
import { AssetSuspense, AssetUnavailable } from '../../three/AssetLoader';
import { useLightingController } from '../../three/LightingController';
import { ConfiguratorControls, useCameraPreset } from '../../three/CameraPresets';
import { useConfiguratorStore } from '../../state/configuratorStore';
import { configuratorApi } from '../../services/configuratorApi';
import { normalizeHotspots } from './premiumShowroom';
import { buildConfiguratorShareCard } from './shareCard';

function ConfiguratorScene({ modelUrl, paintColorHex, paintMaterialNames, wheelMeshNames, optionMeshNames, interactionAnimationNames, purchasable, interaction, supportedInteractions, sceneRef }) {
  const controlsRef = useRef();
  useCameraPreset(interaction.cameraPreset, controlsRef);
  useLightingController(sceneRef, interaction.lighting, supportedInteractions);
  return <>
    <color attach="background" args={['#060606']} />
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 8, 5]} intensity={2} castShadow />
    <directionalLight position={[-4, 4, -4]} intensity={0.8} />
    <Environment preset="studio" />
    <Bounds fit clip observe margin={1.3}>
      <AssetSuspense>
        <group ref={sceneRef} position={[0, -0.5, 0]}>
          <VehicleModel url={modelUrl} paintColorHex={paintColorHex} paintMaterialNames={paintMaterialNames} wheelMeshNames={wheelMeshNames} optionMeshNames={optionMeshNames} interactionAnimationNames={interactionAnimationNames} purchasable={purchasable} interaction={interaction} supportedInteractions={supportedInteractions} />
        </group>
      </AssetSuspense>
    </Bounds>
    <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={14} blur={2.5} far={5} />
    <ConfiguratorControls autoRotate={interaction.autoRotate} onInteract={() => useConfiguratorStore.getState().pauseAutoRotate()} controlsRef={controlsRef} />
  </>;
}

function optionLabel(options, id) {
  const option = options?.find((item) => (item.option_id || item.color_id || item.wheel_id || item.interior_id || item.roof_id) === id);
  return option?.display_name || option?.name || option?.color_name || option?.wheel_name || option?.interior_name || id || 'Not selected';
}

export default function ConfiguratorViewer({ style, options, variant }) {
  const sceneRef = useRef();
  const canvasRef = useRef(null);
  const [cinematic, setCinematic] = useState(false);
  const [captureState, setCaptureState] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const asset = useConfiguratorStore((state) => state.asset);
  const purchasable = useConfiguratorStore((state) => state.purchasable);
  const interaction = useConfiguratorStore((state) => state.interaction);
  const price = useConfiguratorStore((state) => state.price);
  const city = useConfiguratorStore((state) => state.city);
  const isInitialized = useConfiguratorStore((state) => state.isInitialized);
  const setCameraPreset = useConfiguratorStore((state) => state.setCameraPreset);

  useEffect(() => {
    const handleFullscreenChange = () => setCinematic(document.fullscreenElement === canvasRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let active = true;
    if (!isInitialized || !asset.available || !purchasable.variantId) {
      setHotspots([]);
      setSelectedHotspot(null);
      return undefined;
    }
    configuratorApi.getHotspots(purchasable.variantId)
      .then(({ data }) => {
        if (active) setHotspots(normalizeHotspots(data?.hotspots));
      })
      .catch(() => {
        if (active) setHotspots([]);
      });
    return () => { active = false; };
  }, [asset.available, isInitialized, purchasable.variantId]);

  const toggleCinematic = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }
    if (canvasRef.current?.requestFullscreen) {
      await canvasRef.current.requestFullscreen();
      return;
    }
    setCinematic((value) => !value);
  };

  const capture = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    setCaptureState({ status: 'capturing' });
    buildConfiguratorShareCard(canvas, {
      variant: variant?.display_name || variant?.name || purchasable.variantId,
      color: optionLabel(options?.colors, purchasable.paintId),
      wheels: optionLabel(options?.wheels, purchasable.wheelId),
      interior: optionLabel(options?.interiors, purchasable.interiorId),
      roof: optionLabel(options?.roofs, purchasable.roofId),
      price: price?.total,
      city,
    })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'auto-ai-india-configuration.png';
        anchor.click();
        URL.revokeObjectURL(url);
        setCaptureState({ status: 'ready' });
      })
      .catch(() => setCaptureState({ status: 'error' }));
  };

  const share = async () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob || !navigator.share) return;
    const file = new File([blob], 'auto-ai-india-configuration.png', { type: 'image/png' });
    await navigator.share({ title: 'My Auto AI India configuration', files: [file] });
  };

  return <div ref={canvasRef} style={style} className={`configurator-viewer${cinematic ? ' cinematic' : ''}`}>
    <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [5, 2.5, 5], fov: 35 }}>
      <ConfiguratorScene modelUrl={asset.url} paintColorHex={asset.paintColorHex} paintMaterialNames={asset.paintMaterialNames} wheelMeshNames={asset.wheelMeshNames} optionMeshNames={asset.optionMeshNames} interactionAnimationNames={asset.interactionAnimationNames} purchasable={purchasable} interaction={interaction} supportedInteractions={asset.supportedInteractions} sceneRef={sceneRef} />
    </Canvas>
    <div className="configurator-viewer-controls">
      <button type="button" onClick={toggleCinematic} aria-label={cinematic ? 'Exit cinematic mode' : 'Enter cinematic mode'}>{cinematic ? <Minimize2 /> : <Maximize2 />}</button>
      <button type="button" onClick={() => setCameraPreset('exterior')} aria-label="Reset camera"><RotateCw /></button>
      <button type="button" onClick={capture} aria-label="Capture configuration"><Camera /></button>
      <button type="button" onClick={share} aria-label="Share configuration"><Share2 /></button>
    </div>
    {captureState?.status === 'error' && <div role="status">Unable to capture configuration.</div>}
    {hotspots.map((hotspot) => <button key={hotspot.id} type="button" className="configurator-hotspot" style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }} onClick={() => { setSelectedHotspot(hotspot); if (hotspot.cameraPreset) setCameraPreset(hotspot.cameraPreset); }} aria-label={hotspot.label}><Info /></button>)}
    {selectedHotspot && <aside className="configurator-hotspot-panel"><strong>{selectedHotspot.label}</strong>{selectedHotspot.description && <p>{selectedHotspot.description}</p>}<button type="button" onClick={() => setSelectedHotspot(null)}>Close</button></aside>}
    {!asset.available && <AssetUnavailable />}
  </div>;
}
