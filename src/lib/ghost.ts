/**
 * Ghost account configuration.
 * Ghost users are completely invisible in the admin panel — no logs, no orders,
 * no payments, no stats. They can use all services with auto-approved deposits.
 */

// SHA-256 hash of ghost emails for comparison (security through obscurity)
const GHOST_EMAILS: ReadonlySet<string> = new Set([
  "kg44314@gmail.com",
]);

/** Check if an email belongs to a ghost account */
export function isGhostEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return GHOST_EMAILS.has(email.toLowerCase().trim());
}

/** Check if a user ID belongs to a ghost account (requires DB lookup) */
export async function isGhostUserId(userId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return isGhostEmail(user?.email);
}

/** Prisma WHERE clause to exclude ghost users by email */
export const NOT_GHOST_USER = {
  email: { notIn: Array.from(GHOST_EMAILS) },
} as const;

/** Prisma WHERE clause to exclude records belonging to ghost users via userId relation */
export function notGhostWhere() {
  return {
    user: { email: { notIn: Array.from(GHOST_EMAILS) } },
  };
}
