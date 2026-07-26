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

// Interpolação por great-circle (slerp) para as linhas crescerem sobre a
// própria trajetória, e não numa reta em lat/long que "torce".
function toVec([lat, lon]: [number, number]): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}
function toLatLon([x, y, z]: [number, number, number]): [number, number] {
  return [(Math.asin(z) * 180) / Math.PI, (Math.atan2(y, x) * 180) / Math.PI];
}
function slerp(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const s1 = Math.sin((1 - t) * omega) / s;
  const s2 = Math.sin(t * omega) / s;
  return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2];
}
const SP_VEC = toVec(SP);
const DEST_VECS = DESTS.map(toVec);

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

    // "Estrela cadente" refinada: cabeça branco-quente + núcleo brilhante
    // curto + rastro que ESMAECE (partículas menores/escuras) atrás. Dispara
    // do Brasil, viaja pelo great-circle e dissipa ao chegar no continente.
    // Intermitente e defasado (oeste→leste). O cobe não faz gradiente por
    // arco, então o rastro é montado com markers por frame.
    const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const TAIL = 0.4; // extensão total do meteoro (fração do caminho)
    const CORE = 0.12; // núcleo brilhante contínuo logo atrás da cabeça
    const TRAIL_N = 7; // partículas do rastro que esmaece
    const TRAVEL = 1.7; // duração do voo
    const GAP = 2.1; // intervalo entre disparos
    const CYCLE = TRAVEL + GAP;
    const stagger = CYCLE / DESTS.length;

    // avanço da cabeça (0 → 1+TAIL); < 0 = inativo (intervalo)
    const headAt = (t: number) => {
      const tl = ((t % CYCLE) + CYCLE) % CYCLE;
      if (tl >= TRAVEL) return -1;
      return easeOut(tl / TRAVEL) * (1 + TAIL);
    };

    type Mk = {
      location: [number, number];
      size: number;
      color?: [number, number, number];
    };
    const baseMarkers: Mk[] = [
      { location: SP, size: 0.09 },
      ...DESTS.map((location) => ({ location, size: 0.05 }))
    ];
    const at = (i: number, f: number): [number, number] =>
      toLatLon(slerp(SP_VEC, DEST_VECS[i], f));

    const frame = () => {
      phi += 0.0035;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = (now - start) / 1000;
      const arcs: { from: [number, number]; to: [number, number] }[] = [];
      const markers: Mk[] = baseMarkers.slice();
      for (let i = 0; i < DESTS.length; i++) {
        const q = headAt(elapsed - i * stagger);
        if (q < 0) continue;
        const head = Math.min(q, 1);
        const end = Math.max(q - TAIL, 0);
        if (head - end < 0.02) continue;
        const coreStart = Math.max(head - CORE, end);
        // núcleo brilhante (linha curta e nítida na frente)
        arcs.push({ from: at(i, coreStart), to: at(i, head) });
        // rastro que esmaece atrás do núcleo
        const trailSpan = coreStart - end;
        if (trailSpan > 0.004) {
          for (let k = 1; k <= TRAIL_N; k++) {
            const u = k / TRAIL_N; // 0→1 ao longo do rastro
            const a = 1 - u; // brilho: 1 perto do núcleo, 0 na cauda
            const a2 = a * a;
            markers.push({
              location: at(i, coreStart - u * trailSpan),
              size: lerp(0.008, 0.03, a),
              color: [lerp(0.12, 0.5, a2), lerp(0.26, 1, a2), lerp(0.2, 0.85, a2)]
            });
          }
        }
        // cabeça branco-quente
        if (head < 0.999) {
          markers.push({
            location: at(i, head),
            size: 0.055,
            color: [0.85, 1, 0.95]
          });
        }
      }
      globe.update({ phi, arcs, markers });
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
