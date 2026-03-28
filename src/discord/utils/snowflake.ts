export const DISCORD_EPOCH = 1420070400000; // Jan 1, 2015
const DISCORD_EPOCH_BIGINT = 1420070400000n;

export const snowflakeToTimestamp = (id: string): number => Number(BigInt(id) >> 22n) + DISCORD_EPOCH;

let lastTimestamp = 0n;
let sequence = 0n;

/**
 * Generate a Discord-style snowflake nonce.
 * Mirrors Discord's client nonce generation: timestamp + incrementing sequence.
 */
export function generateNonce(): string {
  const now = BigInt(Date.now());
  if (now !== lastTimestamp) {
    sequence = 0n;
    lastTimestamp = now;
  } else {
    sequence++;
  }
  return String(((now - DISCORD_EPOCH_BIGINT) << 22n) | sequence);
}
