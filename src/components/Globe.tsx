"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

/**
 * Globo WebGL decorativo (cobe v2), tingido no teal da marca. Auto-gira devagar
 * (via requestAnimationFrame + `globe.update`), pausa com `prefers-reduced-motion`
 * e não recebe foco (aria-hidden). Canvas em 2x (retina); exibição = `size`.
 */
export function Globe({ size = 130 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let phi = 0;
    let raf = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 12,
      baseColor: [0.22, 0.55, 0.5],
      markerColor: [0.3, 1, 0.75],
      glowColor: [0.16, 0.62, 0.52],
      markers: [
        { location: [-23.55, -46.63], size: 0.06 }, // São Paulo
        { location: [40.71, -74.01], size: 0.04 }, // Nova York
        { location: [51.51, -0.13], size: 0.04 }, // Londres
        { location: [35.68, 139.69], size: 0.04 } // Tóquio
      ]
    });

    if (reduceMotion) {
      // Sem animação: renderiza uma vez num ângulo agradável.
      globe.update({ phi: 0.4 });
    } else {
      const frame = () => {
        phi += 0.004;
        globe.update({ phi });
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [size]);

  return (
    <canvas
      aria-hidden="true"
      className="mx-auto block opacity-90"
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: "100%", aspectRatio: "1" }}
    />
  );
}
