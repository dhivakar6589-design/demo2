"use client";

/**
 * Customer actions on a booking. Cancellation is the only destructive one, so
 * it always goes through a confirmation dialog and reports the server's
 * verdict (including the paid-deposit guard) verbatim.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/overlays";
import { apiRequest } from "@/lib/client";

export function OrderCancelAction({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await apiRequest(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setOpen(false);
      setError(null);
      setReason("");
      toast.success("Booking cancelled. The vendor has been notified.");
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); setError(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            The vendor is notified straight away and the date is released. Anything you have paid
            is handled under the vendor&rsquo;s cancellation terms.
          </AlertDialogDescription>

          <div className="mt-4">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Plans changed, found another vendor, date moved…"
              className="mt-2"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Keep booking
            </Button>
            <Button variant="secondary" loading={pending} onClick={submit}>
              Cancel booking
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
