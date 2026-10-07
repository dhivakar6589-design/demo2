import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONE,
  type OrderStatus,
  type QuoteStatus,
} from "@/lib/constants";

/** Status pill shared by every customer-facing quote surface. */
export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <Badge tone={QUOTE_STATUS_TONE[status]} className={className}>
      {QUOTE_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Status pill shared by every customer-facing booking surface. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} className={className}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
