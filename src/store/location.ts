import { create } from "zustand";
import { persist } from "zustand/middleware";

// The branch the customer is currently "shopping as" — drives the
// location-aware inventory/distance logic built in Milestone 5. Persisted
// so a repeat visitor doesn't have to reselect it every session.
export type SelectedBranch = {
  id: string;
  slug: string;
  name: string;
};

const BRANCH_COOKIE = "robakeye-branch";
const BRANCH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, matches localStorage's "don't ask again"

// Mirrored into a plain cookie (branch id only) alongside the Zustand/
// localStorage copy, since every per-branch product catalogue filter
// (lib/catalogue.ts) runs server-side in an RSC, which can't read
// localStorage/Zustand at all — cookies are the only thing both sides can
// see.
function syncBranchCookie(branchId: string | null) {
  try {
    if (branchId) {
      document.cookie = `${BRANCH_COOKIE}=${branchId}; path=/; max-age=${BRANCH_COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      document.cookie = `${BRANCH_COOKIE}=; path=/; max-age=0`;
    }
  } catch {
    // document unavailable (SSR) — the persist middleware only calls this
    // client-side anyway, but stay defensive.
  }
}

type LocationState = {
  branch: SelectedBranch | null;
  setBranch: (branch: SelectedBranch) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      branch: null,
      setBranch: (branch) => {
        syncBranchCookie(branch.id);
        set({ branch });
      },
    }),
    {
      name: "robakeye-location",
      // Covers a visitor who already had a branch in localStorage from
      // before the cookie existed — the very next hydration backfills it,
      // no manual reselection needed.
      onRehydrateStorage: () => (state) => {
        if (state?.branch) syncBranchCookie(state.branch.id);
      },
    },
  ),
);
