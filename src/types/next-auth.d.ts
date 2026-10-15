import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    sessionId: string | null;
    user: DefaultSession["user"] & {
      id: string;
      kind: "CUSTOMER" | "STAFF";
      role: string | null;
      branchScope: "ALL" | "OWN" | null;
      permissions: string[];
      needsTwoFactorSetup: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    sid?: string;
    kind?: "CUSTOMER" | "STAFF";
    sessionVersion?: number;
    needsTwoFactorSetup?: boolean;
    role?: string | null;
    branchScope?: "ALL" | "OWN" | null;
    permissions?: string[];
  }
}
