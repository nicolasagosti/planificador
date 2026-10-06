import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/server/session";

// Every screen except /login. Pages call requireUser() too: this layout does
// not run again when navigating between them.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
