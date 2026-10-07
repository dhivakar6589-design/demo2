"use client";

/**
 * Heart toggle for a vendor. Always reflects "currently saved" — every caller
 * is a surface where the vendor is already in the wishlist, so a press removes
 * it and says so.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/client";

export function RemoveFromWishlist({
  vendorProfileId,
  vendorName,
  className,
}: {
  vendorProfileId: string;
  vendorName: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await apiRequest<{ saved: boolean }>("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ vendorProfileId }),
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.data?.saved) {
        toast.success(`${vendorName} is saved again.`);
      } else {
        toast.success(`${vendorName} removed from your wishlist.`);
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={`Remove ${vendorName} from wishlist`}
      aria-pressed="true"
      className={cn(
        "grid size-9 place-items-center rounded-full border border-line bg-surface/90 text-accent-muted shadow-sm backdrop-blur-sm",
        "transition-all duration-200 hover:border-accent/50 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:opacity-60",
        className,
      )}
    >
      <Heart className="size-4 fill-current" />
    </button>
  );
}
