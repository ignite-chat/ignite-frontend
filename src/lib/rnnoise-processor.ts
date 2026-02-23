import type { TrackProcessor, AudioProcessorOptions } from 'livekit-client';
import { Track } from 'livekit-client';

// Resolve static asset URLs at import time so Vite emits them during build.
// The ?url suffix tells Vite to return the URL string rather than the module contents.
// @ts-ignore — Vite-specific import syntax
import rnnoiseWorkletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
// @ts-ignore
import rnnoiseWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
// @ts-ignore
import rnnoiseSimdWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';

let wasmBinaryCache: ArrayBuffer | null = null;
let workletRegistered = false;

/**
 * LiveKit TrackProcessor that applies RNNoise-based noise suppression.
 * Runs entirely client-side via WASM + AudioWorklet — no cloud dependency.
 */
export class RnnoiseProcessor
  implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>
{
  name = 'rnnoise-noise-suppressor';
  processedTrack?: MediaStreamTrack;

  private sourceNode?: MediaStreamAudioSourceNode;
  private destinationNode?: MediaStreamAudioDestinationNode;
  private rnnoiseNode?: AudioWorkletNode;
  private _enabled = true;

  async init(opts: AudioProcessorOptions): Promise<void> {
    const { audioContext, track } = opts;

    const { RnnoiseWorkletNode, loadRnnoise } = await import(
      '@sapphi-red/web-noise-suppressor'
    );

    // Register the AudioWorklet module once
    if (!workletRegistered) {
      await audioContext.audioWorklet.addModule(rnnoiseWorkletUrl);
      workletRegistered = true;
    }

    // Load and cache the WASM binary
    if (!wasmBinaryCache) {
      wasmBinaryCache = await loadRnnoise({
        url: rnnoiseWasmUrl,
        simdUrl: rnnoiseSimdWasmUrl,
      });
    }

    // Build audio graph: source → rnnoise → destination
    this.sourceNode = audioContext.createMediaStreamSource(
      new MediaStream([track])
    );
    this.destinationNode = audioContext.createMediaStreamDestination();

    this.rnnoiseNode = new RnnoiseWorkletNode(audioContext, {
      maxChannels: 1,
      wasmBinary: wasmBinaryCache,
    });

    if (this._enabled) {
      this.sourceNode.connect(this.rnnoiseNode);
      this.rnnoiseNode.connect(this.destinationNode);
    } else {
      this.sourceNode.connect(this.destinationNode);
    }

    this.processedTrack = this.destinationNode.stream.getAudioTracks()[0];
  }

  async restart(opts: AudioProcessorOptions): Promise<void> {
    await this.destroy();
    await this.init(opts);
  }

  async destroy(): Promise<void> {
    this.sourceNode?.disconnect();
    this.rnnoiseNode?.disconnect();
    (this.rnnoiseNode as any)?.destroy?.();
    this.destinationNode?.disconnect();
    this.sourceNode = undefined;
    this.rnnoiseNode = undefined;
    this.destinationNode = undefined;
    this.processedTrack = undefined;
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;

    if (!this.sourceNode || !this.destinationNode) return;

    this.sourceNode.disconnect();
    this.rnnoiseNode?.disconnect();

    if (enabled && this.rnnoiseNode) {
      this.sourceNode.connect(this.rnnoiseNode);
      this.rnnoiseNode.connect(this.destinationNode);
    } else {
      this.sourceNode.connect(this.destinationNode);
    }
  }
}
