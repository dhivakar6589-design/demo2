/** Shared shapes for the domain layer — kept separate to avoid import cycles. */

export interface CommissionContext {
  grossAmount: number;
  refundedAmount?: number;
  /** Fraction, e.g. 0.12 for 12%. */
  commissionRate?: number;
  connectFeeRate?: number;
  currency?: string;
}

export interface CommissionResult {
  grossAmount: number;
  settledAmount: number;
  commissionRate: number;
  commissionAmount: number;
  gatewayFee: number;
  platformFee: number;
  vendorNetAmount: number;
  currency: string;
}

export interface SettleableOrder {
  id: string;
  orderNumber: string;
  eventDate: Date;
  settledAmount: number;
  refundedAmount: number;
  commissionRate: number;
  vendorNetAmount: number;
  depositPaid: number;
  balancePaid: number;
  depositStatus: string;
  balanceStatus: string;
}

export interface PayoutBatch {
  vendorProfileId: string;
  orderIds: string[];
  amount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  scheduledFor: Date;
  status: "SCHEDULED" | "PROCESSING" | "PAID" | "FAILED" | "HELD";
  periodStart?: Date;
  periodEnd?: Date;
  eligibleCount: number;
  blockedByThreshold: boolean;
}

export interface TaxContext {
  taxPercent: number;
  intraState: boolean;
}

export interface TaxResult {
  taxPercent: number;
  taxAmount: number;
  intraState: boolean;
  breakup: { label: string; percent: number; amount: number }[];
}