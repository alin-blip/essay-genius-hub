import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getTierByProductId, type TierConfig, type ManagerAddonKey } from "@/lib/subscription-tiers";

interface SubscriptionState {
  subscribed: boolean;
  planTier: TierConfig | null;
  hasManagerAddon: boolean;
  managerTier: ManagerAddonKey | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionState;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  subscription: { subscribed: false, planTier: null, hasManagerAddon: false, managerTier: null, subscriptionEnd: null, loading: true },
  refreshSubscription: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false, planTier: null, hasManagerAddon: false, managerTier: null, subscriptionEnd: null, loading: true,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      const tier = data?.product_id ? getTierByProductId(data.product_id) : null;
      setSubscription({
        subscribed: !!data?.subscribed,
        planTier: tier || null,
        hasManagerAddon: !!data?.has_manager_addon,
        managerTier: data?.manager_tier || null,
        subscriptionEnd: data?.subscription_end || null,
        loading: false,
      });
    } catch {
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && _event === "SIGNED_IN") {
        const affId = localStorage.getItem("ref_affiliate_id");
        if (affId) {
          await supabase.from("referrals").upsert(
            { affiliate_id: affId, referred_user_id: session.user.id, status: "signed_up" },
            { onConflict: "referred_user_id" }
          );
          localStorage.removeItem("ref_affiliate_id");
          localStorage.removeItem("ref_code");
          localStorage.removeItem("ref_ts");
        }
        // Check subscription after sign-in
        setTimeout(checkSubscription, 500);
      }

      if (!session?.user) {
        setSubscription({ subscribed: false, planTier: null, hasManagerAddon: false, subscriptionEnd: null, loading: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkSubscription();
      else setSubscription((prev) => ({ ...prev, loading: false }));
    });

    return () => authSub.unsubscribe();
  }, []);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (user) {
      intervalRef.current = setInterval(checkSubscription, 60000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, refreshSubscription: checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
