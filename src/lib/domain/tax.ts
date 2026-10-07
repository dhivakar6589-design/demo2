/**
 * GST computation.
 *
 * Aurelia is modelled for Indian intra-state/inter-state supply because the
 * vendor network and tax defaults are Indian. The split is the part that
 * matters for a compliant invoice:
 *
 *   intra-state  → CGST (t/2) + SGST (t/2)
 *   inter-state  → IGST (t)
 *
 * Both produce an identical customer total; only the invoice lines differ.
 */

import { roundHalfUp } from "@/lib/math";
import type { TaxContext, TaxResult } from "./types";

export const TAX_LABELS = {
  CGST: "CGST",
  SGST: "SGST",
  IGST: "IGST",
} as const;

export const DEFAULT_TAX_PERCENT = 18;

export function isIntraState(
  vendorState: string | null | undefined,
  customerState: string | null | undefined,
) {
  if (!vendorState || !customerState) return true;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(vendorState) === norm(customerState);
}

export function computeTax(taxableAmount: number, ctx: TaxContext): TaxResult {
  const percent = Math.max(ctx.taxPercent || 0, 0);
  const amount = roundHalfUp((Math.max(taxableAmount, 0) * percent) / 100);
  const intraState = ctx.intraState ?? true;

  const breakup = !amount
    ? []
    : intraState
      ? (() => {
          const half = roundHalfUp(amount / 2);
          return [
            { label: TAX_LABELS.CGST, percent: percent / 2, amount: half },
            { label: TAX_LABELS.SGST, percent: percent / 2, amount: amount - half },
          ];
        })()
      : [{ label: TAX_LABELS.IGST, percent, amount }];

  return { taxPercent: percent, taxAmount: amount, intraState, breakup };
}