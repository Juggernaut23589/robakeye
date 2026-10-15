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

type LocationState = {
  branch: SelectedBranch | null;
  setBranch: (branch: SelectedBranch) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      branch: null,
      setBranch: (branch) => set({ branch }),
    }),
    { name: "robakeye-location" },
  ),
);
