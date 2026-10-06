import { getAuth } from "@/server/auth";

// Better Auth endpoints: sign-in, sign-out and session. Sign-up is disabled.
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
