"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

const SP: [number, number] = [-23.55, -46.63]; // São Paulo (origem)
// Destinos cobrindo todos os continentes — as linhas saem do Brasil.
const DESTS: [number, number][] = [
  [40.71, -74.01], // Nova York — América do Norte
  [51.51, -0.13], // Londres — Europa
  [6.52, 3.37], // Lagos — África
  [25.2, 55.27], // Dubai — Ásia (Oriente Médio)
  [35.68, 139.69], // Tóquio — Ásia
  [-33.87, 151.21] // Sydney — Oceania
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
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const fullArcs = DESTS.map((to) => ({ from: SP, to }));

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
        { location: SP, size: 0.09 },
        ...DESTS.map((location) => ({ location, size: 0.05 }))
      ],
      arcs: fullArcs,
      arcColor: [0.42, 1, 0.8],
      arcWidth: 0.4,
      arcHeight: 0.4
    });

    // Reduced-motion: globo estático com todas as linhas já desenhadas.
    if (reduceMotion) {
      globe.update({ phi: 0.5, arcs: fullArcs });
      return () => {
        globe.destroy();
      };
    }

    // Pulso por destino: a linha cresce do Brasil até o continente, segura
    // e recolhe; destinos defasados para fluxo contínuo (transform/opacity
    // do WebGL, sem reflow). O cobe não anima arcos, então interpolamos o
    // ponto final de cada arco a cada frame.
    const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
    const easeIn = (x: number) => x * x;
    const GROW = 1.1;
    const HOLD = 1.0;
    const RETRACT = 0.8;
    const GAP = 1.5;
    const CYCLE = GROW + HOLD + RETRACT + GAP;
    const stagger = CYCLE / DESTS.length;

    const progress = (t: number) => {
      const tl = ((t % CYCLE) + CYCLE) % CYCLE;
      if (tl < GROW) return easeOut(tl / GROW);
      if (tl < GROW + HOLD) return 1;
      if (tl < GROW + HOLD + RETRACT) {
        return 1 - easeIn((tl - GROW - HOLD) / RETRACT);
      }
      return 0;
    };

    const frame = () => {
      phi += 0.0035;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = (now - start) / 1000;
      const arcs: { from: [number, number]; to: [number, number] }[] = [];
      for (let i = 0; i < DESTS.length; i++) {
        const p = progress(elapsed - i * stagger);
        if (p < 0.02) continue;
        const dest = DESTS[i];
        arcs.push({
          from: SP,
          to: [SP[0] + (dest[0] - SP[0]) * p, SP[1] + (dest[1] - SP[1]) * p]
        });
      }
      globe.update({ phi, arcs });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [size]);

  // Espaço extra em volta do canvas para os orbs orbitarem fora do globo.
  const pad = Math.round(size * 0.32);
  const box = size + pad * 2;
  // 3 orbs em raios, ângulos iniciais, velocidades e sentidos distintos.
  const orbits: {
    r: number;
    start: number;
    dur: string;
    dir: "normal" | "reverse";
  }[] = [
    { r: size * 0.58, start: -40, dur: "9s", dir: "normal" },
    { r: size * 0.64, start: 95, dur: "13s", dir: "reverse" },
    { r: size * 0.61, start: 205, dur: "16s", dir: "normal" }
  ];

  return (
    <div className="relative mx-auto" style={{ width: box, height: box }}>
      {/* Glow atrás do globo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-2xl"
        style={{
          width: size + 24,
          height: size + 24,
          background:
            "radial-gradient(circle, rgba(46,209,163,0.4), rgba(46,209,163,0.08) 55%, transparent 72%)"
        }}
      />

      {/* Globo (canvas WebGL), centrado na caixa */}
      <canvas
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
        ref={canvasRef}
        style={{ width: size, height: size, aspectRatio: "1" }}
      />

      {/* Orbs orbitando (transform/opacity only; para com reduce-motion,
          ficando estáticos em ângulos distintos) */}
      {orbits.map((orbit, index) => (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2"
          key={index}
          style={{
            width: orbit.r * 2,
            height: orbit.r * 2,
            marginLeft: -orbit.r,
            marginTop: -orbit.r,
            transform: `rotate(${orbit.start}deg)`
          }}
        >
          <div
            className="absolute inset-0 animate-spin motion-reduce:animate-none"
            style={{
              animationDuration: orbit.dur,
              animationDirection: orbit.dir,
              animationTimingFunction: "linear"
            }}
          >
            <span className="absolute left-1/2 top-0 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2">
              <span
                className="absolute -inset-1.5 rounded-full blur-[1px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(46,209,163,0.6), transparent 70%)"
                }}
              />
              <span className="absolute inset-0 rounded-full border border-[rgba(120,240,205,0.9)]" />
              <span className="absolute inset-[3px] rounded-full bg-[rgb(190,255,228)] shadow-[0_0_6px_2px_rgba(46,209,163,0.75)]" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
