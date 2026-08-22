import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

export function useAgentDashboardData(accessToken: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [walletStats, setWalletStats] = useState<any>({
    lifetimeEarnings: 0,
    pendingBalance: 0,
    withdrawableBalance: 0,
    paidBalance: 0,
    commissions: [],
    withdrawals: [],
  });

  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      try {
        const [roleRes, dashRes, regsRes, commsRes, refRes, walletRes] = await Promise.all([
          apiGet<any>('/agents/my-role', accessToken).catch(() => null),
          apiGet<any>('/agents/dashboard', accessToken).catch(() => null),
          apiGet<any>('/agents/registrations', accessToken).catch(() => ({ data: [] })),
          apiGet<any>('/agents/commissions', accessToken).catch(() => ({ data: [] })),
          apiGet<any>('/agents/referral-link', accessToken).catch(() => null),
          apiGet<any>('/agents/wallet', accessToken).catch(() => null),
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
          const lifetimeEarnings = commsList.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          const pendingBalance = commsList.filter((c: any) => c.status === 'pending').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          const paidBalance = commsList.filter((c: any) => c.status === 'paid').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
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
          const notifRes = await apiGet<any>('/notifications/unread-count', accessToken);
          setUnreadNotifs(notifRes?.unread_count || 0);
        } catch {
          /* silent */
        }
      } catch (err) {
        logger.error('[AGENT DASHBOARD] Fetch Error:', err);
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
