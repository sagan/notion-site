/**
 * Encode a pageId for using in url path
 * @param pageId
 * @returns
 */
export function escapePageId(pageId: string): string {
  // Basicly, only encode essential chars. Most (url) valid special characters are placed as is.
  // See: https://stackoverflow.com/questions/7109143/what-characters-are-valid-in-a-url .
  // It's similar to how mediawiki encodes page title in url.
  return pageId
    .split("/")
    .map((part) => encodeURI(part).replace(/[\?#]+/g, encodeURIComponent))
    .join("/");
}

/**
 * Truncates a string to a maximum of N UTF-8 bytes.
 * It ensures that the string is truncated at a valid UTF-8 character boundary.
 *
 * @param {string} str The string to truncate.
 * @param {number} maxBytes The maximum number of UTF-8 bytes allowed.
 * @returns {string} The truncated string.
 */
export function truncateToUtf8Bytes(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const bytes = encoder.encode(str);

  // If the string is already within the byte limit, return it as is.
  if (bytes.length <= maxBytes) {
    return str;
  }

  // Attempt to decode the truncated byte array.
  // We'll retry with one less byte if a decode error occurs.
  for (let i = 0; i < 4; i++) {
    const slice = bytes.slice(0, maxBytes - i);
    try {
      return decoder.decode(slice);
    } catch (e) {
      // The slice ended in the middle of a multi-byte character.
      // Continue the loop to reduce the slice size and retry decoding.
    }
  }

  // If all attempts fail (shouldn't happen with i<4), return an empty string.
  return "";
}
