/** Paths for React Router under basename `/AIPO` (no leading slash). */
export function toAppPath(path: string): string {
  if (!path || path === "/") return ".";
  return path.startsWith("/") ? path.slice(1) : path;
}
