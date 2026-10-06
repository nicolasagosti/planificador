import { ApprovedIcon, PaperPlaneIcon, PencilIcon } from "@/components/icons";
import type { CalendarStatus } from "@/domain/statuses";

// A calendar's state has no color: pencil for draft, paper plane for sent,
// a tick in a circle for approved.
export function CalendarStatusIcon({
  status,
  size = 16,
}: {
  status: CalendarStatus;
  size?: number;
}) {
  switch (status) {
    case "draft":
      return <PencilIcon size={size} className="shrink-0" />;
    case "sent":
      return <PaperPlaneIcon size={size} className="shrink-0" />;
    case "approved":
      return <ApprovedIcon size={size} className="shrink-0" />;
  }
}
