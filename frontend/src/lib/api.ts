/**
 * Klient API: w przeglądarce zawsze `/api/v1/*` (BFF → Django).
 * Na serwerze (RSC): `apiUrl` wskazuje na Next lub Django wg ścieżki.
 */
export { apiUrl } from "./api/url";
export { api, APIClient, refreshSession } from "./api/client";
