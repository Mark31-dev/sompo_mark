import { useEffect, useRef } from "react";

import { usePlayer } from "../state/PlayerContext";

const IDLE_SHAPE = [0.22, 0.4, 0.28, 0.52, 0.34, 0.46, 0.24, 0.38];

/**
 * Canvas spectrum driven by the live Web Audio analyser. Painting happens
 * outside React so the UI never re-renders at frame rate.
 */
function Visualizer({
  bars = 24,
  height = 28,
  gap = 2,
  radius = 2,
  band = [0, 0.7],
  intensity = 1,
  idle = true,
  className = "",
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const levelsRef = useRef(new Float32Array(bars));

  const { getFrequencyData, playing } = usePlayer();

  useEffect(() => {
    levelsRef.current = new Float32Array(bars);
  }, [bars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const styles = getComputedStyle(canvas);
    const top = styles.getPropertyValue("--vis-top").trim() || "#c084fc";
    const bottom = styles.getPropertyValue("--vis-bottom").trim() || "#7c22ce";

    let width = 0;
    let heightPx = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      heightPx = Math.max(1, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let phase = 0;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);

      const data = getFrequencyData();
      const levels = levelsRef.current;
      const barWidth = (width - gap * (bars - 1)) / bars;

      phase += 0.045;

      for (let i = 0; i < bars; i += 1) {
        let target;

        if (data && playing) {
          const lo = Math.floor((band[0] + (band[1] - band[0]) * (i / bars)) * data.length);
          const hi = Math.max(
            lo + 1,
            Math.floor((band[0] + (band[1] - band[0]) * ((i + 1) / bars)) * data.length),
          );
          let sum = 0;
          for (let k = lo; k < hi; k += 1) sum += data[k];
          target = (sum / (hi - lo) / 255) * intensity;
          target = Math.min(1, target ** 0.82 * 1.25);
        } else if (idle) {
          target = IDLE_SHAPE[i % IDLE_SHAPE.length] * (0.55 + 0.2 * Math.sin(phase + i * 0.6));
        } else {
          target = 0.06;
        }

        const previous = levels[i];
        levels[i] = target > previous ? target : previous * 0.86 + target * 0.14;
      }

      ctx.clearRect(0, 0, width, heightPx);

      const gradient = ctx.createLinearGradient(0, 0, 0, heightPx);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      ctx.fillStyle = gradient;

      for (let i = 0; i < bars; i += 1) {
        const value = Math.max(0.06, levels[i]);
        const barHeight = Math.max(2, value * heightPx);
        const x = i * (barWidth + gap);
        const y = heightPx - barHeight;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, [bars, gap, radius, band, intensity, idle, playing, getFrequencyData]);

  return (
    <canvas
      ref={canvasRef}
      className={`sp-vis ${className}`}
      style={{ height }}
      aria-hidden="true"
    />
  );
}

export default Visualizer;
