/**
 * ConfiguratorViewer — React Three Fiber scene for the verified 3D configurator.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment } from '@react-three/drei';
import { Maximize2, Minimize2, Share2, Camera, Info, RotateCw, Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';

import VehicleModel from '../../three/VehicleModel';
import { AssetSuspense, AssetUnavailable } from '../../three/AssetLoader';
import { useLightingController } from '../../three/LightingController';
import { ConfiguratorControls, useCameraPreset } from '../../three/CameraPresets';
import { useConfiguratorStore } from '../../state/configuratorStore';
import { configuratorApi } from '../../services/configuratorApi';
import { normalizeHotspots } from './premiumShowroom';
import { buildConfiguratorShareCard } from './shareCard';
import { buildCinematicSequence, getNextCinematicPreset } from './cinematicShowroom';
import { getSupportedInteractionControls } from './interactionControls';

const CINEMATIC_INTERVAL_MS = 4200;

function ConfiguratorScene({ modelUrl, paintColorHex, paintMaterialNames, wheelMeshNames, optionMeshNames, interactionAnimationNames, purchasable, interaction, supportedInteractions, sceneRef, onManualInteraction }) {
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
    <ConfiguratorControls autoRotate={interaction.autoRotate} onInteract={onManualInteraction} controlsRef={controlsRef} />
  </>;
}

function optionLabel(options, id) {
  const option = options?.find((item) => (item.option_id || item.color_id || item.wheel_id || item.interior_id || item.roof_id) === id);
  return option?.display_name || option?.name || option?.color_name || option?.wheel_name || option?.interior_name || id || 'Not selected';
}

function InteractionControls({ supportedInteractions, interaction, onManualInteraction }) {
  const store = useConfiguratorStore();
  const controls = useMemo(() => getSupportedInteractionControls(supportedInteractions), [supportedInteractions]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const has = (id) => controls.some((control) => control.id === id);
  const buttonClass = (active) => `configurator-interaction-button${active ? ' active' : ''}`;
  if (!controls.length) return null;

  const doors = has('doors') ? [
    ['frontLeft', 'Front L'],
    ['frontRight', 'Front R'],
    ['rearLeft', 'Rear L'],
    ['rearRight', 'Rear R'],
  ] : [];
  const lighting = controls.filter((control) => control.group === 'lighting');

  const lightState = (id) => Boolean(interaction.lighting[id]);
  const toggleLight = (id) => { onManualInteraction(); store.toggleLight(id); };

  return <section className={`configurator-interaction-panel${mobileOpen ? ' mobile-open' : ''}`} aria-label="Verified 3D interactions">
    <button
      type="button"
      className="configurator-interaction-mobile-toggle"
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen((value) => !value)}
    >
      <span><strong>3D controls</strong><small>{controls.length} verified capabilities</small></span>
      {mobileOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
    </button>
    <div className="configurator-interaction-content">
      <div className="configurator-interaction-heading">
        <div>
          <h3>3D interactions</h3>
          <p>Verified capabilities only</p>
        </div>
        <span>{controls.length} available</span>
      </div>
      {doors.length > 0 && <div className="configurator-interaction-group">
        <span className="configurator-interaction-label">Doors</span>
        <div className="configurator-interaction-grid">{doors.map(([side, label]) => <button key={side} type="button" className={buttonClass(interaction.doors[side])} aria-pressed={interaction.doors[side]} onClick={() => { onManualInteraction(); store.toggleDoor(side); }}>{label}</button>)}</div>
      </div>}
      {(has('hood') || has('boot') || has('frunk') || has('sunroof')) && <div className="configurator-interaction-group">
        <span className="configurator-interaction-label">Body</span>
        <div className="configurator-interaction-grid">
          {has('hood') && <button type="button" className={buttonClass(interaction.hoodOpen)} aria-pressed={interaction.hoodOpen} onClick={() => { onManualInteraction(); store.toggleHood(); }}>Bonnet</button>}
          {has('boot') && <button type="button" className={buttonClass(interaction.bootOpen)} aria-pressed={interaction.bootOpen} onClick={() => { onManualInteraction(); store.toggleBoot(); }}>Boot</button>}
          {has('frunk') && <button type="button" className={buttonClass(interaction.frunkOpen)} aria-pressed={interaction.frunkOpen} onClick={() => { onManualInteraction(); store.toggleFrunk(); }}>Frunk</button>}
          {has('sunroof') && <button type="button" className={buttonClass(interaction.sunroofOpen)} aria-pressed={interaction.sunroofOpen} onClick={() => { onManualInteraction(); store.toggleSunroof(); }}>Sunroof</button>}
        </div>
      </div>}
      {lighting.length > 0 && <div className="configurator-interaction-group">
        <span className="configurator-interaction-label">Lighting</span>
        <div className="configurator-interaction-grid">{lighting.map((control) => <button key={control.id} type="button" className={buttonClass(lightState(control.id))} aria-pressed={lightState(control.id)} onClick={() => control.id === 'hazard' ? (onManualInteraction(), store.toggleHazard()) : toggleLight(control.id)}>{control.label}</button>)}</div>
      </div>}
    </div>
  </section>;
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
  const showroom = useConfiguratorStore((state) => state.showroom);
  const price = useConfiguratorStore((state) => state.price);
  const city = useConfiguratorStore((state) => state.city);
  const isInitialized = useConfiguratorStore((state) => state.isInitialized);
  const setCameraPreset = useConfiguratorStore((state) => state.setCameraPreset);
  const setShowroomActive = useConfiguratorStore((state) => state.setShowroomActive);
  const setShowroomPaused = useConfiguratorStore((state) => state.setShowroomPaused);

  const cinematicSequence = useMemo(
    () => buildCinematicSequence(asset.supportedInteractions),
    [asset.supportedInteractions],
  );

  useEffect(() => {
    if (!showroom.active || !cinematicSequence.length || showroom.paused) return undefined;
    const timer = window.setInterval(() => {
      const currentPreset = useConfiguratorStore.getState().interaction.cameraPreset;
      const nextPreset = getNextCinematicPreset(cinematicSequence, currentPreset);
      if (nextPreset) useConfiguratorStore.getState().setCameraPreset(nextPreset, { pauseShowroom: false });
    }, CINEMATIC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [cinematicSequence, showroom.active, showroom.paused]);

  useEffect(() => {
    if (showroom.active && !cinematicSequence.length) {
      setShowroomActive(false);
    }
  }, [cinematicSequence.length, setShowroomActive, showroom.active]);

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

  const toggleShowroom = () => {
    if (!cinematicSequence.length) return;
    if (!showroom.active) {
      const currentPreset = interaction.cameraPreset;
      const firstPreset = cinematicSequence.includes(currentPreset) ? currentPreset : cinematicSequence[0];
      setCameraPreset(firstPreset, { pauseShowroom: false });
      setShowroomActive(true);
      setShowroomPaused(false);
      return;
    }
    setShowroomPaused(!showroom.paused);
  };

  const takeManualControl = () => {
    setShowroomPaused(true);
    useConfiguratorStore.getState().pauseAutoRotate();
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
    if (!canvas || !navigator.share) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'auto-ai-india-configuration.png', { type: 'image/png' });
    await navigator.share({ title: 'My Auto AI India configuration', files: [file] });
  };

  return <div ref={canvasRef} style={style} className={`configurator-viewer${cinematic ? ' cinematic' : ''}`}>
    <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [5, 2.5, 5], fov: 35 }}>
      <ConfiguratorScene modelUrl={asset.url} paintColorHex={asset.paintColorHex} paintMaterialNames={asset.paintMaterialNames} wheelMeshNames={asset.wheelMeshNames} optionMeshNames={asset.optionMeshNames} interactionAnimationNames={asset.interactionAnimationNames} purchasable={purchasable} interaction={interaction} supportedInteractions={asset.supportedInteractions} sceneRef={sceneRef} onManualInteraction={takeManualControl} />
    </Canvas>
    <div className="configurator-viewer-controls">
      <button type="button" onClick={toggleShowroom} disabled={!cinematicSequence.length} aria-label={!showroom.active || showroom.paused ? 'Play cinematic showroom' : 'Pause cinematic showroom'}>{showroom.active && !showroom.paused ? <Pause /> : <Play />}</button>
      <button type="button" onClick={toggleCinematic} aria-label={cinematic ? 'Exit cinematic mode' : 'Enter cinematic mode'}>{cinematic ? <Minimize2 /> : <Maximize2 />}</button>
      <button type="button" onClick={() => { setShowroomPaused(true); setCameraPreset('exterior'); }} aria-label="Reset camera"><RotateCw /></button>
      <button type="button" onClick={capture} aria-label="Capture configuration"><Camera /></button>
      <button type="button" onClick={share} aria-label="Share configuration"><Share2 /></button>
    </div>
    <InteractionControls supportedInteractions={asset.supportedInteractions} interaction={interaction} onManualInteraction={takeManualControl} />
    {showroom.active && <div className="configurator-showroom-status" role="status">{showroom.paused ? 'Manual control' : 'Cinematic showroom'} · {interaction.cameraPreset}</div>}
    {captureState?.status === 'error' && <div role="status">Unable to capture configuration.</div>}
    {hotspots.map((hotspot) => <button key={hotspot.id} type="button" className="configurator-hotspot" style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }} onClick={() => { takeManualControl(); setSelectedHotspot(hotspot); if (hotspot.cameraPreset) setCameraPreset(hotspot.cameraPreset); }} aria-label={hotspot.label}><Info /></button>)}
    {selectedHotspot && <aside className="configurator-hotspot-panel"><strong>{selectedHotspot.label}</strong>{selectedHotspot.description && <p>{selectedHotspot.description}</p>}<button type="button" onClick={() => setSelectedHotspot(null)}>Close</button></aside>}
    {!asset.available && <AssetUnavailable />}
  </div>;
}
