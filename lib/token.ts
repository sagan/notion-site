import { createHash, timingSafeEqual } from "crypto";

const SHA256_FLAG = "__sha256__";

/**
 * Compre providedToken with storedToken. If storedToken starts with `__sha256__`,
 * treat it as the sha256 digest of actual token.
 * @param providedToken
 * @param storedToken
 * @returns
 */
export function compareToken(providedToken: string, storedToken: string): boolean {
  try {
    // "__sha256__aabbcc...dd" hex format
    if (storedToken.startsWith(SHA256_FLAG)) {
      storedToken = storedToken.slice(SHA256_FLAG.length);
      providedToken = createHash("sha256").update(providedToken).digest("hex");
    }
    return timingSafeEqual(Buffer.from(providedToken), Buffer.from(storedToken));
  } catch {
    return false;
  }
}
