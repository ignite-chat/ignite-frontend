const DISCORD_EPOCH = 1420070400000n;

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
  return String(((now - DISCORD_EPOCH) << 22n) | sequence);
}
