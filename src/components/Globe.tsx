"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

const SP: [number, number] = [-23.55, -46.63]; // São Paulo (origem)
const CITIES: [number, number][] = [
  [40.71, -74.01], // Nova York
  [51.51, -0.13], // Londres
  [35.68, 139.69], // Tóquio
  [-33.87, 151.21], // Sydney
  [37.77, -122.42] // São Francisco
];

/**
 * Globo WebGL decorativo (cobe v2) no teal da marca, com arcos animados de
 * conexão saindo de São Paulo (narrativa "alcance / inteligência para vendas").
 * Gira devagar via rAF + `globe.update`; pausa com `prefers-reduced-motion`
 * (fica estático num ângulo agradável) e não recebe foco (aria-hidden).
 */
export function Globe({ size = 148 }: { size?: number }) {
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
      theta: 0.32,
      dark: 1,
      diffuse: 3,
      mapSamples: 20000,
      mapBrightness: 4.8,
      mapBaseBrightness: 0.12,
      baseColor: [0.32, 0.62, 0.56],
      markerColor: [0.42, 1, 0.8],
      glowColor: [0.2, 0.75, 0.62],
      markers: [
        { location: SP, size: 0.08 },
        ...CITIES.map((location) => ({ location, size: 0.045 }))
      ],
      arcs: CITIES.map((to) => ({ from: SP, to })),
      arcColor: [0.42, 1, 0.8],
      arcWidth: 0.4,
      arcHeight: 0.35
    });

    if (reduceMotion) {
      globe.update({ phi: 0.5 });
    } else {
      const frame = () => {
        phi += 0.0035;
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
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(46,209,163,0.4), rgba(46,209,163,0.08) 55%, transparent 72%)"
        }}
      />
      <canvas
        aria-hidden="true"
        className="relative block"
        ref={canvasRef}
        style={{ width: size, height: size, aspectRatio: "1" }}
      />
    </div>
  );
}
