import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { captureException } from '@/src/lib/errorTracking';

/** The signed-in agent's profile, as returned by /agents/my-role. */
export interface AgentProfile {
  id?: string;
  agent_code?: string;
  phone?: string;
  area?: string;
  district?: string;
  region?: string;
  created_at?: string;
  agent_roles?: { role_name?: string; [key: string]: unknown };
  users?: { full_name?: string; email?: string; phone?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** A single referred registration (vendor/transporter/customer), from /agents/registrations. */
export interface AgentRegistration {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  region?: string;
  district?: string;
  created_at?: string;
  registration_type?: 'vendor' | 'customer' | 'transporter' | string;
  status?: 'active' | 'pending' | string;
  [key: string]: unknown;
}

/** A single commission entry, from /agents/commissions or embedded in wallet stats. */
export interface AgentCommission {
  id: string;
  amount?: number;
  status?: 'pending' | 'approved' | 'paid' | string;
  created_at?: string;
  commission_type?: string;
  description?: string;
  agent_registrations?: { full_name?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** A single withdrawal/payout entry, embedded in wallet stats. */
export interface AgentWithdrawal {
  id: string;
  amount?: number;
  service_fee?: number;
  payment_method?: string;
  payment_details?: { phoneNumber?: string; [key: string]: unknown };
  status?: 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | string;
  created_at?: string;
  [key: string]: unknown;
}

/** Aggregate wallet/earnings figures, from /agents/wallet (or computed as a fallback). */
export interface AgentWalletStats {
  lifetimeEarnings: number;
  pendingBalance: number;
  withdrawableBalance: number;
  paidBalance: number;
  commissions: AgentCommission[];
  withdrawals: AgentWithdrawal[];
  [key: string]: unknown;
}

/** Dashboard overview/summary figures, from /agents/dashboard. */
export interface AgentDashboardStats {
  overview?: {
    totalRegistrations?: number;
    activeUsers?: number;
    [key: string]: unknown;
  };
  commissionsSummary?: {
    total: number;
    pending: number;
    paid: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface AgentRoleResponse {
  agent?: AgentProfile;
  [key: string]: unknown;
}

interface AgentRegistrationsResponse {
  data?: AgentRegistration[];
  [key: string]: unknown;
}

interface AgentCommissionsResponse {
  data?: AgentCommission[];
  [key: string]: unknown;
}

interface AgentReferralLinkResponse {
  referral_link?: string;
  referral_code?: string;
  [key: string]: unknown;
}

interface AgentWalletResponse {
  success?: boolean;
  wallet?: AgentWalletStats;
  [key: string]: unknown;
}

interface UnreadCountResponse {
  unread_count?: number;
  [key: string]: unknown;
}

export function useAgentDashboardData(accessToken: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [walletStats, setWalletStats] = useState<AgentWalletStats>({
    lifetimeEarnings: 0,
    pendingBalance: 0,
    withdrawableBalance: 0,
    paidBalance: 0,
    commissions: [],
    withdrawals: [],
  });

  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AgentDashboardStats | null>(null);
  const [registrations, setRegistrations] = useState<AgentRegistration[]>([]);
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      try {
        const [roleRes, dashRes, regsRes, commsRes, refRes, walletRes] = await Promise.all([
          apiGet<AgentRoleResponse>('/agents/my-role', accessToken).catch(() => null),
          apiGet<AgentDashboardStats>('/agents/dashboard', accessToken).catch(() => null),
          apiGet<AgentRegistrationsResponse>('/agents/registrations', accessToken).catch(() => ({ data: [] })),
          apiGet<AgentCommissionsResponse>('/agents/commissions', accessToken).catch(() => ({ data: [] })),
          apiGet<AgentReferralLinkResponse>('/agents/referral-link', accessToken).catch(() => null),
          apiGet<AgentWalletResponse>('/agents/wallet', accessToken).catch(() => null),
        ]);

        if (roleRes?.agent) {
          setAgentProfile(roleRes.agent);
        }
        if (dashRes) {
          setDashboardStats(dashRes);
        }
        setRegistrations(regsRes?.data || []);
        setCommissions(commsRes?.data || []);
        if (refRes?.referral_link) {
          setReferralLink(refRes.referral_link);
          setReferralCode(refRes.referral_code || '');
        }
        if (walletRes?.success && walletRes?.wallet) {
          setWalletStats(walletRes.wallet);
        } else {
          // Fallback calculations for stability
          const commsList = commsRes?.data || [];
          const lifetimeEarnings = commsList.reduce((acc: number, c) => acc + Number(c.amount || 0), 0);
          const pendingBalance = commsList.filter((c) => c.status === 'pending').reduce((acc: number, c) => acc + Number(c.amount || 0), 0);
          const paidBalance = commsList.filter((c) => c.status === 'paid').reduce((acc: number, c) => acc + Number(c.amount || 0), 0);
          setWalletStats({
            lifetimeEarnings,
            pendingBalance,
            withdrawableBalance: Math.max(0, lifetimeEarnings - pendingBalance - paidBalance),
            paidBalance,
            commissions: commsList,
            withdrawals: [],
          });
        }

        // Fetch unread notification count
        try {
          const notifRes = await apiGet<UnreadCountResponse>('/notifications/unread-count', accessToken);
          setUnreadNotifs(notifRes?.unread_count || 0);
        } catch (err) {
          logger.warn('[AGENT DASHBOARD] Failed to fetch unread notification count', err);
        }
      } catch (err) {
        logger.error('[AGENT DASHBOARD] Fetch Error:', err);
        captureException(err, { hook: 'useAgentDashboardData' });
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  return {
    loading,
    refreshing,
    walletStats,
    agentProfile,
    dashboardStats,
    registrations,
    commissions,
    unreadNotifs,
    referralLink,
    referralCode,
    fetchData,
    onRefresh,
  };
}
