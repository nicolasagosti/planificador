/**
 * Content Security Policy for one response. Scripts and styles run only from
 * this site or with the per-request nonce that Next.js adds to its own tags;
 * nothing can frame the app.
 */
export function contentSecurityPolicy(
  nonce: string,
  options: { development: boolean },
): string {
  const directives = [
    "default-src 'self'",
    // React needs eval in development only, for its debugging stacks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.development ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}
