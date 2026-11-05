// Note: This is the only interface representing serialization in common. I kinda hate it.
// It's because in this case serialization is not just about its io but its general operation.
// So, it's OK. Renaming this wouldn't make me sad.
export type SerializedTimer = {
  sumElapsed: number;
  startedAt: number;
  running: boolean;
  // Optional for games saved before the timer was enabled by default.
  enabled?: boolean;
  // TODO(kberg): Remove by 2027-01-01
  afterFirstAction?: boolean;
  // Optional for older saves.
  lastStoppedAt?: number;
}
