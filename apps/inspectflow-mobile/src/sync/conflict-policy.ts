export type ConflictDecision = 'keep-local' | 'keep-remote' | 'manual-review';

export type VersionedEntity = {
  id: string;
  updatedAt: string;
  version?: number;
};

/** Conservative default: never silently discard local edits. */
export function resolveConflict(
  local: VersionedEntity,
  remote: VersionedEntity,
): ConflictDecision {
  if (local.version !== undefined && remote.version !== undefined) {
    if (local.version > remote.version) return 'keep-local';
    if (remote.version > local.version) return 'keep-remote';
  }
  return 'manual-review';
}
