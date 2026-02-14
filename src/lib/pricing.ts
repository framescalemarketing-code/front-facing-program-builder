import type { EUPackage, EUPackageAddOnKey, PaymentDiscount, PaymentTerms, ServiceTier } from "@/lib/programDraft";

export const PRICING = {
  onboardingFeeSingleSiteStandard: 1200,
  onboardingFeeAdditionalSite: 500,

  extraSiteVisitFee: 60,

  euAllowancePerEmployee: {
    Compliance: 235,
    Comfort: 290,
    Complete: 435,
    Covered: 435,
  } satisfies Record<EUPackage, number>,

  serviceFeePerEmployee: {
    Essential: 65,
    Access: 85,
    Premier: 105,
    Enterprise: 155,
  } satisfies Record<ServiceTier, number>,

  standardVisitsByTier: {
    Essential: 2,
    Access: 6,
    Premier: 12,
    Enterprise: 24,
  } satisfies Record<ServiceTier, number>,

  euPackageAddOnsPerEmployee: {
    polarized: 135,
    antiFog: 50,
    antiReflectiveStd: 55,
    blueLightAntiReflective: 100,
    tint: 40,
    transitions: 135,
    transitionsPolarized: 165,
    extraScratchCoating: 50,
  } satisfies Record<EUPackageAddOnKey, number>,

  travel: {
    includedOneWayMiles: 50,
    dollarsPerMileOver: 1,
    roundTripMultiplier: 2,
  },

  financeFeesPerInvoice: {
    NET30: 0,
    NET45: 15,
    NET60: 30,
    NET75: 45,
    NET90: 60,
  } satisfies Record<PaymentTerms, number>,

  paymentDiscounts: {
    none: 0,
    "2_15_NET30": 0.02,
    "3_10_NET30": 0.03,
  } satisfies Record<PaymentDiscount, number>,
};

