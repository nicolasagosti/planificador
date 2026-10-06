"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth";
import { requireUser } from "@/server/session";

export async function signOut() {
  await requireUser();
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
