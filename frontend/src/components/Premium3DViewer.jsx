import { Component, Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

class ViewerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (typeof console !== "undefined") console.error("Premium 3D viewer error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[420px] items-center justify-center bg-[#050505] p-8 text-center">
          <div className="max-w-md">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              3D asset unavailable
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              The configured vehicle model could not be loaded. Auto AI India will not silently replace a failed 3D asset with a fake rotation.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function VehicleModel({ url, paint }) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone();
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!material.color) return;
        const name = String(material.name || object.name || "").toLowerCase();
        const isPaintSurface =
          name.includes("paint") ||
          name.includes("body") ||
          name.includes("exterior") ||
          name.includes("shell");
        if (isPaintSurface) {
          material.color.set(paint);
          material.needsUpdate = true;
        }
      });
    });
  }, [clonedScene, paint]);

  return <primitive object={clonedScene} />;
}

function LoadingState() {
  return (
    <Html center>
      <div className="rounded-full border border-white/15 bg-black/80 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-xl">
        Loading 3D showroom
      </div>
    </Html>
  );
}

function Scene({ modelUrl, paint, autoRotate }) {
  return (
    <>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 7, 5]} intensity={2.2} castShadow />
      <directionalLight position={[-4, 3, -4]} intensity={1.1} />
      <Environment preset="studio" />
      <Bounds fit clip observe margin={1.25}>
        <Suspense fallback={<LoadingState />}>
          <group position={[0, -0.7, 0]}>
            <VehicleModel url={modelUrl} paint={paint} />
          </group>
        </Suspense>
      </Bounds>
      <ContactShadows position={[0, -1.05, 0]} opacity={0.55} scale={12} blur={2.8} far={4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={1.1}
        minDistance={2.2}
        maxDistance={8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
        rotateSpeed={0.7}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export default function Premium3DViewer({ modelUrl, paint = "#ffffff", autoRotate = false }) {
  if (!modelUrl) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[#050505] p-8 text-center">
        <div className="max-w-md">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            Live 3D engine ready
          </div>
          <h3 className="text-2xl font-light text-white">3D vehicle asset required</h3>
          <p className="mt-3 text-sm leading-6 text-white/50">
            This vehicle is not published with a verified GLB/GLTF model yet. The viewer will never substitute a photo or fake rotation for a real 3D model.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ViewerErrorBoundary>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [4.6, 1.8, 5.8], fov: 35 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene modelUrl={modelUrl} paint={paint} autoRotate={autoRotate} />
      </Canvas>
    </ViewerErrorBoundary>
  );
}
