// Minimal shim that re-exports global fetch/Headers/Request/Response
// Works in Node >=18 and in browsers without pulling whatwg-url
const boundFetch = (globalThis as any).fetch?.bind(globalThis) || ((): any => {
  throw new Error('Global fetch is not available in this environment');
});

export default boundFetch as typeof fetch;
export const Headers = (globalThis as any).Headers as typeof globalThis.Headers;
export const Request = (globalThis as any).Request as typeof globalThis.Request;
export const Response = (globalThis as any).Response as typeof globalThis.Response;

