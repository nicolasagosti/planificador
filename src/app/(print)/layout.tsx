import { requireUser } from "@/server/session";

// Pages for paper, without the app's top bar. Pages call requireUser() too.
export default async function PrintLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return children;
}
