/**
 * AssetLoader — wraps the 3D scene with progressive loading and error states.
 *
 * Rules:
 *  - No asset URL → renders AssetUnavailable (Coming Soon), never a placeholder model.
 *  - Asset load failure → renders AssetLoadError, never a blank screen.
 *  - Loading → renders a progress indicator inside the canvas.
 *
 * Status: IMPLEMENTED
 */

import { Component, Suspense } from 'react';
import { Html, useProgress } from '@react-three/drei';

// ── Loading indicator (rendered inside Canvas) ───────────────────────────

function LoadingIndicator() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div
        style={{
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '999px',
          padding: '8px 20px',
          color: 'rgba(255,255,255,0.7)',
          fontFamily: 'monospace',
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Loading 3D model… {Math.round(progress)}%
      </div>
    </Html>
  );
}

// ── Error boundary for WebGL / asset load failures ───────────────────────

export class AssetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[AssetLoader] 3D asset failed to load:', error?.message);
  }

  render() {
    if (this.state.error) {
      return (
        <Html center>
          <div
            style={{
              textAlign: 'center',
              maxWidth: '320px',
              padding: '24px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: '#fca5a5',
                fontFamily: 'monospace',
              }}
            >
              3D asset unavailable
            </div>
            <p
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5',
              }}
            >
              The vehicle model could not be loaded. Auto AI India will not
              substitute a photograph or placeholder for a real 3D model.
            </p>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

/**
 * AssetSuspense — wraps children with Suspense + error boundary.
 * Use around any component that calls useGLTF.
 */
export function AssetSuspense({ children }) {
  return (
    <AssetErrorBoundary>
      <Suspense fallback={<LoadingIndicator />}>
        {children}
      </Suspense>
    </AssetErrorBoundary>
  );
}

// ── DOM-level unavailable states (rendered outside Canvas) ────────────────

/**
 * AssetUnavailable — shown when no verified 3D asset exists for a variant.
 * Never substitutes a fake model or image rotation.
 */
export function AssetUnavailable({ status = 'COMING_SOON', variantName }) {
  const messages = {
    COMING_SOON:   '3D Configurator Coming Soon',
    UNAVAILABLE:   '3D Model Unavailable',
    UNDER_REVIEW:  '3D Model Under Review',
    DISABLED:      '3D Configurator Disabled',
  };

  const subtitles = {
    COMING_SOON:  'A verified 3D model for this vehicle has not been published yet.',
    UNAVAILABLE:  'The 3D asset for this vehicle did not pass validation.',
    UNDER_REVIEW: 'The 3D asset is currently under provenance or licensing review.',
    DISABLED:     'The 3D configurator has been disabled for this vehicle.',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '480px',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.07), transparent 60%), #080808',
        borderRadius: '20px',
        textAlign: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: '400px' }}>
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: '#f59e0b',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        >
          {messages[status] || messages.COMING_SOON}
        </div>
        {variantName && (
          <h3
            style={{
              fontSize: '22px',
              fontWeight: '300',
              color: '#ffffff',
              margin: '0 0 12px',
            }}
          >
            {variantName}
          </h3>
        )}
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: '1.6',
          }}
        >
          {subtitles[status] || subtitles.COMING_SOON}
        </p>
        <p
          style={{
            marginTop: '16px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          Auto AI India never substitutes a rotating photograph for a real 3D model.
        </p>
      </div>
    </div>
  );
}
