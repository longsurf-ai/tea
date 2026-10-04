// Purpose: Public concrete-binding, resumable GPU execution surface.

/**
 * Runs an artifact compiled by `compileProgramToWgsl` on a caller-supplied
 * `GPUDevice`, over concrete input arrays the host has already materialized.
 *
 * Start with {@link createGpuExecution}: it validates and packs each
 * {@link GpuBinding}, sizes buffers from the device's hard limits, and returns
 * a resumable {@link GpuExecution} that publishes {@link Datum} rows shaped by
 * the artifact's output schema. Not a package entry yet.
 */

export {
  createGpuExecution,
  GpuBindingError,
  GpuExecutionError,
  type GpuBinding,
  type GpuBindingProgress,
  type GpuBindingSummary,
  type GpuChunkResult,
  type GpuExecution,
  type GpuRunSummary,
  type GpuRunTiming,
} from './session';
