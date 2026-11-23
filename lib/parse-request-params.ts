/**
 * Parse request params from query string or request body
 * @param req
 * @returns parsed params
 */
export async function parseRequestParams(req: Request): Promise<URLSearchParams> {
  const url = new URL(req.url);
  const params = url.searchParams;
  if (req.body) {
    const data = await req.json();
    if (typeof data != "object") {
      throw new Error("invalid request body");
    }
    for (const key of Object.keys(data)) {
      params.delete(key);
      if (Array.isArray(data[key])) {
        for (const value of data[key]) {
          params.append(key, value);
        }
      } else {
        params.set(key, data[key]);
      }
    }
  }
  return params;
}
