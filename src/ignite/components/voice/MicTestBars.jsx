import { useState, useEffect } from 'react';

export const BAR_COUNT = 32;

export const getBarColor = (level) => {
  if (level > 0.85) return '#ef4444'; // red — clipping
  if (level > 0.6) return '#eab308'; // yellow — loud
  return '#23a55a'; // green — normal (Discord green)
};

/**
 * Animated frequency-bar visualizer for mic test.
 * Creates its own getUserMedia stream (independent from any LiveKit room track)
 * and plays audio back through speakers so the user can hear themselves.
 *
 * @param {{ deviceId?: string | null, outputDeviceId?: string | null, onCleanupReady?: (fn: () => void) => void }} props
 */
const MicTestBars = ({ deviceId, outputDeviceId, onCleanupReady }) => {
  const [levels, setLevels] = useState(() => new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const res = { stream: null, ctx: null, cancelled: false };

    const cleanup = () => {
      res.cancelled = true;
      if (res.stream) {
        res.stream.getTracks().forEach((t) => t.stop());
        res.stream = null;
      }
      if (res.ctx) {
        res.ctx.close().catch(() => {});
        res.ctx = null;
      }
    };

    onCleanupReady?.(cleanup);

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId
            ? { deviceId: { ideal: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            : { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });

        // If cancelled while waiting for getUserMedia, stop immediately
        if (res.cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        res.stream = stream;

        const ctx = new AudioContext();
        if (res.cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
          return;
        }
        res.ctx = ctx;

        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);

        // Analyser for visualization
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);

        // Real-time playback — route mic audio to speakers so user hears themselves
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);

        // Route to specific output device if supported, otherwise default
        if (outputDeviceId && ctx.setSinkId) {
          try { await ctx.setSinkId(outputDeviceId); } catch {}
        }
        gainNode.connect(ctx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (res.cancelled) return;
          analyser.getByteFrequencyData(dataArray);

          const bars = [];
          for (let i = 0; i < BAR_COUNT; i++) {
            const idx = Math.floor((i / BAR_COUNT) * dataArray.length * 0.7);
            bars.push(dataArray[idx] / 255);
          }
          setLevels(bars);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (err) {
        console.warn('Mic test failed:', err);
      }
    };

    start();

    return cleanup;
  }, [deviceId, outputDeviceId]);

  return (
    <div className="flex w-full items-end justify-between h-8">
      {levels.map((level, i) => (
        <div
          key={i}
          className="flex-1 mx-[1px] rounded-sm transition-[height] duration-75"
          style={{
            height: `${Math.max(4, level * 32)}px`,
            backgroundColor: level > 0.05 ? getBarColor(level) : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
};

/** Static placeholder bars (shown when mic test is not running). */
export const MicTestBarsIdle = () => (
  <div className="flex w-full items-end justify-between h-8">
    {new Array(BAR_COUNT).fill(0).map((_, i) => (
      <div
        key={i}
        className="flex-1 mx-[1px] rounded-sm"
        style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
    ))}
  </div>
);

export default MicTestBars;
