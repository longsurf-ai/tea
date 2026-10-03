// Purpose: Typed not-implemented failure for skeleton pipeline stages; carries the stage's inputs for debugging.

import {InternalError} from './print';

// A stage Tea has not built yet: an internal failure, not the user's, so
// `instanceof InternalError` holds as for {@link fatal}.
export class UnimplementedError extends InternalError {
  constructor(
    readonly stage: string,
    readonly stageInputs: readonly unknown[],
  ) {
    super(`${stage} is not implemented yet`);
    this.name = 'UnimplementedError';
  }
}

export function unimplemented(
  stage: string,
  ...stageInputs: readonly unknown[]
): never {
  throw new UnimplementedError(stage, stageInputs);
}
