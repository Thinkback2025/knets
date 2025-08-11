// Centralized configuration for pricing and subscription settings
// This file is shared between frontend and backend to ensure consistency

export const PRICING_CONFIG = {
  // Subscription pricing (including 18% GST)
  subscription: {
    yearly: 2,        // ₹2 per year
    monthly: 1,       // ₹1 per month (if needed in future)
  },
  
  // Child upgrade pricing
  childUpgrade: {
    perChild: 1,      // ₹1 per additional child
  },
  
  // Trial and limits
  trial: {
    durationDays: 7,  // 7-day trial period
  },
  
  limits: {
    defaultMaxChildren: 3,  // Default child limit
  }
} as const;

// Helper functions for pricing calculations
export const getPricingConfig = () => PRICING_CONFIG;

export const getSubscriptionPrice = (type: 'yearly' | 'monthly' = 'yearly') => {
  return PRICING_CONFIG.subscription[type];
};

export const getChildUpgradePrice = (additionalChildren: number = 1) => {
  return PRICING_CONFIG.childUpgrade.perChild * additionalChildren;
};

// Format currency for display
export const formatCurrency = (amount: number, currency: string = '₹') => {
  return `${currency}${amount}`;
};