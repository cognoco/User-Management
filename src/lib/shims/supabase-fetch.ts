// Force supabase-js to use global fetch in browser builds
export default function getFetch() {
  return globalThis.fetch.bind(globalThis);
}
