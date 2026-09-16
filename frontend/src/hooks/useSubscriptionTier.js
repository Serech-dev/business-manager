import { useSubscription } from "../context/SubscriptionContext";

/**
 * Custom hook to easily check subscription tier, premium feature availability,
 * and remaining days across basic and premium allocations.
 */
export function useSubscriptionTier() {
    const {
        subscription,
        tier,
        isPremium,
        features,
        hasFeature,
        isLoading,
        isExpired,
        isSuspended,
        isValid,
        isTrial,
        daysRemaining,
        premiumDaysRemaining,
        basicDaysRemaining,
        isSuperuser,
        openSubscriptionModal,
    } = useSubscription();

    return {
        subscription,
        tier,
        isPremium,
        isBasic: tier === "basic" || isPremium,
        isTrial,
        isValid,
        isExpired,
        isSuspended,
        isSuperuser,
        daysRemaining,
        premiumDaysRemaining,
        basicDaysRemaining,
        features,
        hasFeature,
        openSubscriptionModal,
    };
}

export default useSubscriptionTier;

