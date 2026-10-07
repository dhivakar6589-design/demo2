"use client";

/**
 * Customer side of a quote: accept, decline or withdraw.
 *
 * Every action goes through PATCH /api/quotes/[id], which owns the transition
 * matrix — this component only confirms intent, reports the result and refreshes
 * the server-rendered view.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/overlays";
import { Label, Textarea } from "@/components/ui/input";
import { apiRequest } from "@/lib/client";

type Action = "ACCEPTED" | "REJECTED" | "WITHDRAWN";

const COPY: Record<Action, { title: string; description: string; confirm: string; withNote?: boolean }> = {
  ACCEPTED: {
    title: "Accept this quote?",
    description:
      "The vendor is notified straight away and will come back with availability and the next steps for your date.",
    confirm: "Accept quote",
  },
  REJECTED: {
    title: "Decline this quote?",
    description: "The vendor is notified that you won't be proceeding. You can add a note — or not.",
    confirm: "Decline quote",
    withNote: true,
  },
  WITHDRAWN: {
    title: "Withdraw this enquiry?",
    description:
      "The vendor stops working on this quote. You can always send a fresh enquiry later.",
    confirm: "Withdraw enquiry",
    withNote: true,
  },
};

export function QuoteActions({
  quoteId,
  vendorName,
}: {
  quoteId: string;
  vendorName: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = (next: Action) => {
    setNote("");
    setError(null);
    setAction(next);
  };

  const submit = () => {
    if (!action) return;
    const chosen = action;
    startTransition(async () => {
      const result = await apiRequest(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: chosen, reason: note }),
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const messages: Record<Action, string> = {
        ACCEPTED: `${vendorName} has been notified — they'll confirm your date.`,
        REJECTED: "Quote declined.",
        WITHDRAWN: "Enquiry withdrawn.",
      };

      setAction(null);
      setError(null);
      toast.success(messages[chosen]);
      router.refresh();
    });
  };

  const copy = action ? COPY[action] : null;

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <Button size="lg" className="w-full" onClick={() => open("ACCEPTED")}>
          <Check className="size-4" />
          Accept quote
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={() => open("REJECTED")}>
          <X className="size-4" />
          Decline
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="w-full"
          onClick={() => open("WITHDRAWN")}
        >
          Withdraw enquiry
        </Button>
      </div>

      <AlertDialog open={action !== null} onOpenChange={(openState) => !openState && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>

          {copy?.withNote && (
            <div className="mt-4">
              <Label htmlFor="quote-note">Note for the vendor (optional)</Label>
              <Textarea
                id="quote-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Dates don't work, budget, or anything else they should know."
                className="mt-2"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" disabled={pending} onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={submit}
              variant={action === "REJECTED" || action === "WITHDRAWN" ? "secondary" : "primary"}
            >
              {copy?.confirm}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
