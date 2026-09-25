/**
 * Scraper module — DISABLED
 * Auto-blog / auto-detect latest post feature has been removed.
 * All functions return null. No network calls are made.
 */

export async function fetchLatestInstagramPost(
  _username: string
): Promise<{ id: string; url: string } | null> {
  return null;
}

export async function fetchLatestTiktokPost(
  _username: string
): Promise<{ id: string; url: string } | null> {
  return null;
}

export async function fetchLatestFacebookPost(
  _username: string
): Promise<{ id: string; url: string } | null> {
  return null;
}
