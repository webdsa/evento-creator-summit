/**
 * Helper for admin API calls with Firebase ID token.
 */

export async function fetchWithAuth(
  getIdToken: () => Promise<string | null>,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}
