"use client";

import { create } from "zustand";
import {
  ApiError,
  getAttemptHistory,
  getAvailableTests,
  getDashboardOverview,
  getExploreTestSeries,
  getPerformanceAnalytics,
  getPurchasedTests,
  getResultDetail,
  getResults,
  getScheduledTests,
  getMyStudentProfile,
  getUpcomingTests,
  purchaseTestSeries,
  updateMyStudentProfile,
  type AttemptHistoryItem,
  type DashboardOverview,
  type ExploreTestSeriesItem,
  type PerformanceAnalytics,
  type PurchasedTestSeries,
  type ResultDetail,
  type ResultListItem,
  type ScheduledTest,
  type StudentProfile,
  type StudentTest,
} from "@/lib/api";

type StudentState = {
  availableTests: StudentTest[];
  upcomingTests: StudentTest[];
  scheduledTests: ScheduledTest[];
  attemptHistory: AttemptHistoryItem[];
  results: ResultListItem[];
  selectedResult: ResultDetail | null;
  analytics: PerformanceAnalytics | null;
  dashboardOverview: DashboardOverview | null;
  exploreSeries: ExploreTestSeriesItem[];
  profile: StudentProfile | null;
  purchasedTests: PurchasedTestSeries[];
  isLoadingAvailable: boolean;
  isLoadingUpcoming: boolean;
  isLoadingScheduled: boolean;
  isLoadingHistory: boolean;
  isLoadingResults: boolean;
  isLoadingResultDetail: boolean;
  isLoadingAnalytics: boolean;
  isLoadingOverview: boolean;
  isLoadingExploreSeries: boolean;
  isLoadingProfile: boolean;
  isLoadingPurchased: boolean;
  availableError: string | null;
  upcomingError: string | null;
  scheduledError: string | null;
  historyError: string | null;
  resultsError: string | null;
  resultDetailError: string | null;
  analyticsError: string | null;
  overviewError: string | null;
  exploreSeriesError: string | null;
  profileError: string | null;
  purchasedError: string | null;
  fetchAvailableTests: () => Promise<void>;
  fetchUpcomingTests: () => Promise<void>;
  fetchScheduledTests: () => Promise<void>;
  fetchAttemptHistory: () => Promise<void>;
  fetchResults: () => Promise<void>;
  fetchResultDetail: (resultId: string) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchDashboardOverview: () => Promise<void>;
  fetchExploreSeries: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  saveProfile: (payload: Partial<{
    name: string;
    phone_number: string;
    exam_preparing_for: string;
    current_password: string;
    new_password: string;
  }>) => Promise<void>;
  buySeries: (payload: { test_series_id: string; payment_id: string }) => Promise<void>;
  fetchPurchasedTests: () => Promise<void>;
};

export const useStudentStore = create<StudentState>((set) => ({
  availableTests: [],
  upcomingTests: [],
  scheduledTests: [],
  attemptHistory: [],
  results: [],
  selectedResult: null,
  analytics: null,
  dashboardOverview: null,
  exploreSeries: [],
  profile: null,
  purchasedTests: [],
  isLoadingAvailable: false,
  isLoadingUpcoming: false,
  isLoadingScheduled: false,
  isLoadingHistory: false,
  isLoadingResults: false,
  isLoadingResultDetail: false,
  isLoadingAnalytics: false,
  isLoadingOverview: false,
  isLoadingExploreSeries: false,
  isLoadingProfile: false,
  isLoadingPurchased: false,
  availableError: null,
  upcomingError: null,
  scheduledError: null,
  historyError: null,
  resultsError: null,
  resultDetailError: null,
  analyticsError: null,
  overviewError: null,
  exploreSeriesError: null,
  profileError: null,
  purchasedError: null,

  fetchAvailableTests: async () => {
    set({ isLoadingAvailable: true, availableError: null });

    try {
      const data = await getAvailableTests();
      set({ availableTests: data, isLoadingAvailable: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch available tests right now.";

      set({
        isLoadingAvailable: false,
        availableError: message,
        availableTests: [],
      });
    }
  },

  fetchUpcomingTests: async () => {
    set({ isLoadingUpcoming: true, upcomingError: null });

    try {
      const data = await getUpcomingTests();
      set({ upcomingTests: data, isLoadingUpcoming: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch upcoming tests right now.";

      set({
        isLoadingUpcoming: false,
        upcomingError: message,
        upcomingTests: [],
      });
    }
  },

  fetchScheduledTests: async () => {
    set({ isLoadingScheduled: true, scheduledError: null });

    try {
      const data = await getScheduledTests();
      set({ scheduledTests: data, isLoadingScheduled: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch scheduled tests right now.";

      set({
        isLoadingScheduled: false,
        scheduledError: message,
        scheduledTests: [],
      });
    }
  },

  fetchAttemptHistory: async () => {
    set({ isLoadingHistory: true, historyError: null });

    try {
      const data = await getAttemptHistory();
      set({ attemptHistory: data, isLoadingHistory: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch attempt history right now.";

      set({
        isLoadingHistory: false,
        historyError: message,
        attemptHistory: [],
      });
    }
  },

  fetchResults: async () => {
    set({ isLoadingResults: true, resultsError: null });

    try {
      const data = await getResults();
      set({ results: data, isLoadingResults: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch results right now.";

      set({
        isLoadingResults: false,
        resultsError: message,
        results: [],
      });
    }
  },

  fetchResultDetail: async (resultId: string) => {
    set({ isLoadingResultDetail: true, resultDetailError: null, selectedResult: null });

    try {
      const data = await getResultDetail(resultId);
      set({ selectedResult: data, isLoadingResultDetail: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch result details right now.";

      set({
        isLoadingResultDetail: false,
        resultDetailError: message,
        selectedResult: null,
      });
    }
  },

  fetchAnalytics: async () => {
    set({ isLoadingAnalytics: true, analyticsError: null });

    try {
      const data = await getPerformanceAnalytics();
      set({ analytics: data, isLoadingAnalytics: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch performance analytics right now.";

      set({
        isLoadingAnalytics: false,
        analyticsError: message,
        analytics: null,
      });
    }
  },

  fetchDashboardOverview: async () => {
    set({ isLoadingOverview: true, overviewError: null });

    try {
      const data = await getDashboardOverview();
      set({ dashboardOverview: data, isLoadingOverview: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch dashboard overview right now.";

      set({
        isLoadingOverview: false,
        overviewError: message,
        dashboardOverview: null,
      });
    }
  },

  fetchExploreSeries: async () => {
    set({ isLoadingExploreSeries: true, exploreSeriesError: null });

    try {
      const data = await getExploreTestSeries();
      set({ exploreSeries: data, isLoadingExploreSeries: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch test series right now.";

      set({
        isLoadingExploreSeries: false,
        exploreSeriesError: message,
        exploreSeries: [],
      });
    }
  },

  fetchProfile: async () => {
    set({ isLoadingProfile: true, profileError: null });

    try {
      const data = await getMyStudentProfile();
      set({ profile: data, isLoadingProfile: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch profile right now.";

      set({
        isLoadingProfile: false,
        profileError: message,
        profile: null,
      });
    }
  },

  saveProfile: async (payload) => {
    set({ isLoadingProfile: true, profileError: null });

    try {
      const data = await updateMyStudentProfile(payload);
      set({ profile: data, isLoadingProfile: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update profile right now.";

      set({
        isLoadingProfile: false,
        profileError: message,
      });
      throw error;
    }
  },

  buySeries: async (payload) => {
    await purchaseTestSeries(payload);
    const purchasedData = await getPurchasedTests();
    set({ purchasedTests: purchasedData });
  },

  fetchPurchasedTests: async () => {
    set({ isLoadingPurchased: true, purchasedError: null });

    try {
      const data = await getPurchasedTests();
      set({ purchasedTests: data, isLoadingPurchased: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        set({ purchasedTests: [], isLoadingPurchased: false, purchasedError: null });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch purchased test series right now.";

      set({
        isLoadingPurchased: false,
        purchasedError: message,
        purchasedTests: [],
      });
    }
  },
}));
