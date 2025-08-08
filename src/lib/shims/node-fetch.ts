// Minimal shim for client builds to avoid bundling node-fetch and whatwg-url
export default function fetchShim(..._args: any[]) {
  throw new Error('node-fetch is not available in the browser environment');
}
export const Headers = globalThis.Headers as any;
export const Request = globalThis.Request as any;
export const Response = globalThis.Response as any;

