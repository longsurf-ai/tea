// Purpose: Public generic Tea Program to WGSL compiler surface.

/**
 * Compiles a checked Tea Program into one bind-independent WebGPU artifact and
 * defines the physical layout that artifact shares with `tea/runtime/gpu`.
 *
 * Start with {@link compileProgramToWgsl}: it returns a complete
 * {@link CompiledWgslProgram} for {@link createGpuExecution}, or an eligibility
 * report naming the construct the GPU backend does not support, never a
 * partial shader. The `GPU_*` constants and `Wgsl*` types document the buffer
 * bindings, offsets and strides inside the artifact.
 *
 * @packageDocumentation
 */

export * from './lower';
export * from './prepare';
export * from './types';
