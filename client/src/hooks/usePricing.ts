import { useQuery } from "@tanstack/react-query";

interface PricingConfig {
  subscription: {
    yearly: number;
    monthly: number;
  };
  childUpgrade: {
    perChild: number;
  };
}

export function usePricing() {
  const { data: pricing, isLoading } = useQuery<PricingConfig>({
    queryKey: ["/api/config/pricing"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    pricing,
    isLoading,
    subscriptionPrice: pricing?.subscription?.yearly || 2, // Fallback to 2
    childUpgradePrice: pricing?.childUpgrade?.perChild || 1, // Fallback to 1
  };
}