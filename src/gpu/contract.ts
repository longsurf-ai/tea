// Purpose: Versioned, bind-independent physical contract shared by WGSL codegen and the WebGPU runtime.

import type {Parameter} from '../runtime/params';

/**
 * Version of the {@link CompiledWgslProgram} physical contract.
 *
 * The GPU runtime rejects an artifact with a different `abi` by throwing
 * {@link GpuBindingError}; its embedded module is checked separately against
 * {@link RUNTIME_ABI_VERSION}.
 */
export const GPU_ARTIFACT_ABI_VERSION = 9 as const;
/** Name of the WGSL `override` constant that sets the compute workgroup size. */
export const GPU_WORKGROUP_SIZE_OVERRIDE = 'tea_workgroup_size';

/** Bind group index that holds every external buffer. */
export const GPU_BUFFER_GROUP = 0;
/**
 * Binding numbers, within {@link GPU_BUFFER_GROUP}, of the seven storage
 * buffers: job descriptors, series values, execution state, result cells,
 * effect status, effect records and parameters.
 */
export const GPU_EXTERNAL_BUFFER_BINDINGS = Object.freeze({
  jobs: 0,
  series: 1,
  executionStates: 2,
  results: 3,
  effectStatus: 4,
  effectRecords: 5,
  params: 6,
});

/** Size in bytes of one job descriptor: ten u32 fields, one descriptor per binding. */
export const GPU_JOB_DESCRIPTOR_BYTE_STRIDE = 40;
/**
 * Byte offset of each u32 field within a job descriptor.
 *
 * The descriptor locates one binding's slice of the shared buffers:
 * `seriesOffset`, `resultOffset`, `effectOffset`, `paramsOffset` and
 * `stateOffset` are element indices (series values, result cells, effect
 * records, parameter slots and state words), not bytes. `rowCount` is the
 * binding's extent, `chunkRows` the rows one dispatch runs, and `resultCount`,
 * `effectCapacity` and `stateWords` the lengths of its result, effect and
 * state slices.
 */
export const GPU_JOB_DESCRIPTOR_OFFSETS = Object.freeze({
  seriesOffset: 0,
  rowCount: 4,
  resultOffset: 8,
  resultCount: 12,
  effectOffset: 16,
  effectCapacity: 20,
  chunkRows: 24,
  paramsOffset: 28,
  stateOffset: 32,
  stateWords: 36,
});

/** Size in bytes of one series value: an f32, with NaN marking a missing value. */
export const GPU_SERIES_SCALAR_BYTE_STRIDE = 4;
/**
 * Size in bytes of one parameter slot: a u32 word holding i32 or f32 bits, a
 * 0/1 bool, or an enum ordinal.
 */
export const GPU_PARAMETER_BYTE_STRIDE = 4;
/**
 * Smallest valid fixed execution-state size in bytes: the two header words,
 * the initialized flag and the next row to execute.
 */
export const GPU_EXECUTION_STATE_MIN_BYTE_SIZE = 8;
/**
 * Size in bytes of one result cell: value bits, a validity word and a presence
 * word.
 *
 * Presence 0 means the output was not written (null); validity 0 means na.
 */
export const GPU_RESULT_CELL_BYTE_STRIDE = 12;
/**
 * Size in bytes of one binding's effect status: record count, overflow flag,
 * and the row and output id of the first overflow.
 */
export const GPU_EFFECT_STATUS_BYTE_STRIDE = 16;

/** WGSL scalar type of one 4-byte physical field. */
export type WgslScalarType = 'i32' | 'u32' | 'f32';

/**
 * The numeric semantics an artifact's WGSL implements, recorded so callers can
 * judge parity with CPU execution.
 *
 * Every current artifact carries {@link WGSL_F32_NUMERIC_CONTRACT}.
 */
export interface WgslNumericContract {
  readonly float: 'f32';
  readonly integer: 'i32';
  readonly boolean: 'u32-zero-or-one';
  /** A nullable value travels with a separate u32 validity word. */
  readonly nullable: 'tagged-u32';
  readonly integerOverflow: 'wrap';
  readonly divideByZero: 'tea-na';
  readonly nonFiniteFloat: 'tea-na';
  /** Absolute and relative error to allow when comparing with CPU results. */
  readonly cpuTolerance: {
    readonly absolute: number;
    readonly relative: number;
  };
}

/**
 * One 4-byte scalar inside a {@link WgslPhysicalLayout}, such as the validity
 * word or the value of a Tea float.
 */
export interface WgslPhysicalField {
  /** Dotted path within the layout, such as `valid`, `f0.value` or `payload.0`. */
  readonly path: string;
  readonly scalar: WgslScalarType;
  /** Offset in bytes from the start of the layout. */
  readonly byteOffset: number;
}

/**
 * Byte layout of one WGSL struct the artifact reads or writes.
 *
 * Examples are `TeaFloat` (validity word, then f32 value) and
 * `TeaJobDescriptor`. Other artifact fields refer to a layout by its `id`.
 */
export interface WgslPhysicalLayout {
  /** Index of this layout in `CompiledWgslProgram.layouts`. */
  readonly id: number;
  /** WGSL struct name. */
  readonly name: string;
  /** Size in bytes, a multiple of 4. */
  readonly byteSize: number;
  /** Alignment in bytes; currently always 4. */
  readonly byteAlignment: number;
  readonly fields: readonly WgslPhysicalField[];
}

/**
 * The generated WGSL shader.
 *
 * `entryPoint` is the compute entry that reads execution state directly from
 * storage; {@link WgslCacheContract} names the alternative entry that stages
 * state in workgroup memory.
 */
export interface WgslModule {
  readonly language: 'wgsl';
  readonly source: string;
  readonly entryPoint: string;
}

/**
 * Where one set output's value lives in each row of result cells.
 *
 * Result cells are dense rows with one cell per channel; the runtime decodes a
 * cell with the Arrow field at `outputId`.
 */
export interface WgslResultChannel {
  /** Index among the embedded module's Arrow output fields. */
  readonly outputId: number;
  /** Physical encoding: f32 bits, i32 bits, 0/1, or an enum ordinal. */
  readonly scalar: 'float' | 'int' | 'bool' | 'enum';
  /** Cell index within one row; channel `i` always has `rowCell` `i`. */
  readonly rowCell: number;
}

/**
 * Physical scalar decoding instructions. Logical types and enum identities live
 * only in the Arrow schema; this codec says where WGSL wrote the value and its
 * validity flag. Reference structs remain unsupported by this backend.
 *
 * @example A float codec reads validity at byte 0 and f32 payload bits at byte 4;
 * the corresponding Arrow field is Float64 because Tea publishes JS numbers.
 */
export type WgslCodec =
  | {
      readonly kind: 'bool';
      readonly physicalLayout: number;
      readonly valueByteOffset: number;
    }
  | {
      readonly kind: 'int' | 'float' | 'string' | 'color';
      readonly physicalLayout: number;
      readonly validByteOffset: number;
      readonly valueByteOffset: number;
    }
  | {
      readonly kind: 'enum';
      readonly physicalLayout: number;
      readonly validByteOffset: number;
      readonly ordinalByteOffset: number;
    };

/**
 * Physical encoding of one append output. Its logical payload field belongs to
 * the embedded TypeScript module's Arrow schema, alongside every set output.
 * @example `event.outputId` addresses the same slot passed to runtime.append().
 */
export interface WgslEvent {
  readonly outputId: number;
  readonly payloadLayout: number;
  readonly payloadWordCount: number;
  readonly payload: WgslCodec;
}

/**
 * Placement of one retained local inside its frame.
 *
 * Word offsets count u32 words from the start of the frame.
 */
export interface WgslStateLocalLayout {
  readonly name: string;
  /**
   * Slot in the generated JS frame table. WGSL may elide history-free
   * formals, so this is not necessarily the local's index below.
   */
  readonly slot: number;
  /** `perBar` values start fresh each row; `var` values persist across rows. */
  readonly storage: 'perBar' | 'var';
  /** First word of the local's current value. */
  readonly scratchWordOffset: number;
  /** Words in one value of this local. */
  readonly valueWordCount: number;
  /** Committed initialization flag of a `var` local; null for `perBar`. */
  readonly committedInitWordOffset: number | null;
  /** Initialization flag for the row in progress; null for `perBar`. */
  readonly tentativeInitWordOffset: number | null;
  /**
   * Two fixed words containing the binding-specific history payload offset
   * (relative to the execution state) and capacity. Null means no retained
   * history exists for this local.
   */
  readonly historyDescriptorWordOffset: number | null;
}

/**
 * Static layout of one frame template: the program root (`id` 0, owner
 * `<program>`) or a function.
 *
 * Each written call site embeds its own copy of the callee's template, so
 * separate calls keep separate state. Word offsets count u32 words from the
 * start of the frame.
 */
export interface WgslStateFrameLayout {
  /**
   * Index in `CompiledWgslProgram.state.frames`, matching the embedded
   * module's `state.frames`.
   */
  readonly id: number;
  /** Function name, or `<program>` for the root. */
  readonly owner: string;
  /**
   * Activation words, each holding the absolute activation row plus one, or
   * zero while inactive. The tentative word is reset from the committed word
   * when a row starts and becomes durable when the row commits.
   */
  readonly committedActivationWordOffset: number;
  readonly tentativeActivationWordOffset: number;
  readonly activationEncoding: 'absolute-row-plus-one';
  /** Total words of the frame, including the frames of its call sites. */
  readonly wordCount: number;
  readonly locals: readonly WgslStateLocalLayout[];
  /**
   * One entry per written call site: its call `slot`, the callee's frame
   * `templateId`, and the `wordOffset` of the embedded child frame.
   */
  readonly children: readonly {
    readonly slot: number;
    readonly templateId: number;
    readonly wordOffset: number;
  }[];
}

/**
 * One WGSL pipeline-overridable constant.
 *
 * The runtime sets it through the compute pipeline's `constants`, keyed by
 * `numericId`.
 */
export interface WgslOverride {
  /** The constant's WGSL `@id`. */
  readonly numericId: number;
  /** The constant's name in the WGSL source. */
  readonly id: string;
  /** Value the shader uses when the pipeline does not override it. */
  readonly defaultValue: number;
}

/**
 * One contiguous run of fixed execution-state words that the cached entry
 * point can copy into workgroup memory.
 *
 * Segments partition the fixed state. They are ranked by estimated reads plus
 * writes per row, highest first, then smallest first.
 */
export interface WgslCacheSegment {
  /** Stable name of the segment, such as `execution.header` or `root.local.0`. */
  readonly id: string;
  /** Position in cache order. */
  readonly rank: number;
  /** The frame or local that owns these words. */
  readonly owner: string;
  readonly kind: 'header' | 'activation' | 'local';
  /** First word within one execution's fixed state. */
  readonly storageWordOffset: number;
  /** First word within one execution's cache region. */
  readonly cacheWordOffset: number;
  readonly wordCount: number;
  /**
   * `cacheWordOffset + wordCount`. The segment is staged when the
   * `cacheWordsPerExecution` override is at least this value.
   */
  readonly cacheEnd: number;
  /** Static estimate used only for ranking. */
  readonly estimatedReadsPerRow: number;
  /** Static estimate used only for ranking. */
  readonly estimatedWritesPerRow: number;
}

/**
 * How an execution may stage its fixed state in workgroup memory.
 *
 * The runtime picks the longest prefix of ranked `segments` whose words, for
 * every execution in a workgroup, fit the device's
 * `maxComputeWorkgroupStorageSize`. It then runs `cachedEntryPoint` with
 * `cacheWordsPerExecution` set to that prefix's length, or `storageEntryPoint`
 * when no segment fits.
 */
export interface WgslCacheContract {
  /** Entry point that keeps state in storage; equals `module.entryPoint`. */
  readonly storageEntryPoint: string;
  /** Entry point that copies the staged segments in, runs, and copies them back. */
  readonly cachedEntryPoint: string;
  /**
   * Pipeline constants: the workgroup size, the staged words per execution,
   * and the workgroup array length (staged words times workgroup size, or 1).
   */
  readonly overrides: {
    readonly workgroupSize: WgslOverride;
    readonly cacheWordsPerExecution: WgslOverride;
    readonly cacheAllocationWords: WgslOverride;
  };
  /** Fixed-state segments in rank order. */
  readonly segments: readonly WgslCacheSegment[];
}

/**
 * One bind-independent GPU artifact: WGSL source, the generated TypeScript
 * module that binds parameters and owns the output schema, and the physical
 * layout both sides share.
 *
 * It holds no device, data or parameter values, so one artifact serves any
 * number of {@link GpuBinding}s, and it survives a JSON round trip for
 * storage. Arrow output structure lives only in the embedded module;
 * `resultChannels` and `events` only say where each output's bytes are.
 * Produce it with {@link compileProgramToWgsl}; run it with
 * {@link createGpuExecution}.
 */
export interface CompiledWgslProgram {
  /** Always {@link GPU_ARTIFACT_ABI_VERSION}. */
  readonly abi: typeof GPU_ARTIFACT_ABI_VERSION;
  readonly target: 'webgpu-wgsl';
  /** Numeric semantics of the shader; see {@link WGSL_F32_NUMERIC_CONTRACT}. */
  readonly numeric: WgslNumericContract;
  /** WGSL source and its storage entry point. */
  readonly module: WgslModule;
  /** The program's ordinary generated TypeScript module, as from the CPU target. */
  readonly bindingModule: {
    readonly language: 'typescript-esm';
    /** Ordinary generated module, loaded and bound through the CPU binder. */
    readonly source: string;
  };
  /** Every physical layout, indexed by `id`. */
  readonly layouts: readonly WgslPhysicalLayout[];
  /**
   * Largest compute workgroup size. The runtime uses the largest power of two
   * within this, the device limits and the number of bindings.
   */
  readonly workgroupSize: readonly [number, number, number];
  /** Equal to {@link GPU_BUFFER_GROUP} and {@link GPU_EXTERNAL_BUFFER_BINDINGS}. */
  readonly externalBuffers: {
    readonly group: number;
    readonly jobsBinding: number;
    readonly seriesBinding: number;
    readonly executionStatesBinding: number;
    readonly resultsBinding: number;
    readonly effectStatusBinding: number;
    readonly effectRecordsBinding: number;
    readonly paramsBinding: number;
  };
  readonly jobDescriptorLayout: number;
  readonly jobDescriptorByteStride: number;
  readonly jobDescriptorOffsets: typeof GPU_JOB_DESCRIPTOR_OFFSETS;
  readonly parameterLayout: number;
  readonly parameterByteStride: number;
  readonly seriesScalarLayout: number;
  readonly seriesScalarByteStride: number;
  readonly executionStateLayout: number;
  /**
   * Header, frame activations, scratch, init flags, and history descriptors.
   * History payloads follow this fixed region and are sized per binding.
   */
  readonly executionStateFixedByteSize: number;
  /**
   * Fixed execution-state words: word 0 is the initialized flag, word 1 the
   * next row to execute, and the root frame starts at word 2. `fixedWordCount`
   * covers the header and the root frame tree; `frames` lists every frame
   * template by id.
   */
  readonly state: {
    readonly initializedWordOffset: 0;
    readonly nextRowWordOffset: 1;
    readonly rootFrameWordOffset: 2;
    readonly fixedWordCount: number;
    readonly frames: readonly WgslStateFrameLayout[];
  };
  /** Optional staging of the fixed state in workgroup memory. */
  readonly cache: WgslCacheContract;
  readonly resultCellLayout: number;
  readonly resultCellByteStride: number;
  readonly effectStatusLayout: number;
  readonly effectStatusByteStride: number;
  readonly effectRecordLayout: number;
  readonly effectRecordByteStride: number;
  /** Payload words in each effect record: the largest append payload, at least 1. */
  readonly effectPayloadWordCapacity: number;
  /**
   * Compiler-proved upper bound on append records one row can produce; effect
   * capacity per chunk is this times the chunk's rows.
   */
  readonly maxEffectsPerRow: number;
  /** String literals; a string value on the GPU is an index into this list. */
  readonly literalStrings: readonly string[];
  /** Parameter declarations; the GPU accepts int, float, bool and enum parameters. */
  readonly params: readonly Parameter[];
  /** Whether each parameter is active; GPU parameters need a constant answer. */
  readonly paramActive: readonly boolean[];
  /** Numeric series every {@link GpuBinding} must supply, in packing order. */
  readonly requiredSeries: readonly {readonly id: string}[];
  /** One channel per set output, in `rowCell` order. */
  readonly resultChannels: readonly WgslResultChannel[];
  /** One codec per append output, in increasing `outputId` order. */
  readonly events: readonly WgslEvent[];
}
