import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { verify as verifyTotp } from "otplib";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

// Thrown by authorize() when a staff account's role requires 2FA and either
// no code was supplied yet (UI should reveal the OTP field) or the code was
// wrong. `code` is safe to surface in a redirect query param per NextAuth's
// own CredentialsSignin contract — it names a UI state, not a secret.
class TwoFactorRequiredError extends CredentialsSignin {
  code = "two_factor_required";
}
class TwoFactorInvalidError extends CredentialsSignin {
  code = "two_factor_invalid";
}
class AccountDisabledError extends CredentialsSignin {
  code = "account_disabled";
}

async function registerDeviceSession(userId: string, rememberMe: boolean) {
  let userAgent: string | null = null;
  let ipAddress: string | null = null;
  try {
    const h = await headers();
    userAgent = h.get("user-agent");
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    // headers() is only available inside a request context; swallow outside it.
  }
  const session = await prisma.session.create({
    data: {
      userId,
      expires: new Date(Date.now() + (rememberMe ? 30 : 1) * DAY_MS),
      userAgent,
      ipAddress,
    },
  });
  return session.id;
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    // Credentials provider requires JWT sessions (database sessions only
    // auto-populate via the adapter for OAuth sign-ins). "Active sessions" /
    // "log out all devices" UI is implemented on top of this via our own
    // Session table — see the jwt() callback below and src/actions/sessions.ts.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days; per-device actual expiry is tightened in Session.expires + checked below
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Google sign-in is customer-only; staff always use credentials + 2FA.
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password" },
        totp: { label: "2FA code" },
        rememberMe: { label: "Remember me" },
      },
      async authorize(rawCredentials) {
        // signIn("credentials", {...}) serializes every field through a
        // hidden form, so an omitted/undefined field on the client arrives
        // here as the literal string "undefined", not a missing key —
        // filter that (and "") out before validating, or a fresh login
        // with no TOTP yet entered fails TOTP length validation instead of
        // cleanly triggering the two_factor_required flow.
        const rawTotp = rawCredentials.totp;
        const cleanTotp =
          typeof rawTotp === "string" && rawTotp !== "" && rawTotp !== "undefined"
            ? rawTotp
            : undefined;

        const parsed = loginSchema.safeParse({
          email: rawCredentials.email,
          password: rawCredentials.password,
          totp: cleanTotp,
          rememberMe: rawCredentials.rememberMe === "true",
        });
        if (!parsed.success) throw new CredentialsSignin("invalid_input");
        const { email, password, totp, rememberMe } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { staff: { include: { role: true } } },
        });
        if (!user || !user.passwordHash) throw new CredentialsSignin("invalid_credentials");

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) throw new CredentialsSignin("invalid_credentials");

        if (user.kind === "STAFF") {
          if (!user.staff?.isActive) throw new AccountDisabledError();

          const requires2FA = user.staff.role.requires2FA;
          if (requires2FA && user.twoFactorEnabled) {
            if (!totp) throw new TwoFactorRequiredError();
            const { valid } = await verifyTotp({
              token: totp,
              secret: user.twoFactorSecret!,
            });
            if (!valid) throw new TwoFactorInvalidError();
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          // Carried through to jwt()'s `user` param only — not persisted.
          rememberMe: String(rememberMe),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // OAuth (Google) sign-ins never carry our Session-row/2FA logic —
      // only ever used for CUSTOMER kind, enforced here defensively.
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { kind: true },
        });
        if (existing && existing.kind !== "CUSTOMER") return false;
      }
      return true;
    },
    async jwt({ token, user, trigger, session: updateData }) {
      if (user?.id) {
        const rememberMe = (user as { rememberMe?: string }).rememberMe === "true";
        const sid = await registerDeviceSession(user.id, rememberMe);

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            staff: { include: { role: { include: { permissions: true } } } },
          },
        });
        if (!dbUser) return token;

        token.uid = dbUser.id;
        token.sid = sid;
        token.kind = dbUser.kind;
        token.sessionVersion = dbUser.sessionVersion;
        token.needsTwoFactorSetup =
          dbUser.kind === "STAFF" &&
          !!dbUser.staff?.role.requires2FA &&
          !dbUser.twoFactorEnabled;
        token.role = dbUser.staff?.role.name ?? null;
        token.branchScope = dbUser.staff?.role.branchScope ?? null;
        token.permissions = dbUser.staff?.role.permissions.map((p) => p.key) ?? [];
        return token;
      }

      if (trigger === "update" && updateData?.user) {
        // Used after 2FA setup completes to flip needsTwoFactorSetup off
        // without forcing a full re-login.
        return { ...token, ...updateData.user };
      }

      // Every subsequent request: re-validate the session is still live.
      // This is what makes "log out this device" / "log out everywhere"
      // actually work with JWT sessions — deleting the Session row, or
      // bumping User.sessionVersion, invalidates the JWT on its next use.
      if (token.sid) {
        const session = await prisma.session.findUnique({
          where: { id: token.sid as string },
          select: { userId: true, expires: true },
        });
        if (!session || session.expires < new Date()) return null;

        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { sessionVersion: true },
        });
        if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) return null;

        // Cheap liveness ping for the "last seen" column on the sessions UI.
        await prisma.session.update({
          where: { id: token.sid as string },
          data: { lastSeenAt: new Date() },
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (!token) return session;
      session.sessionId = (token.sid as string | undefined) ?? null;
      session.user.id = token.uid as string;
      session.user.kind = token.kind as "CUSTOMER" | "STAFF";
      session.user.role = (token.role as string | null) ?? null;
      session.user.branchScope = (token.branchScope as "ALL" | "OWN" | null) ?? null;
      session.user.permissions = (token.permissions as string[]) ?? [];
      session.user.needsTwoFactorSetup = Boolean(token.needsTwoFactorSetup);
      return session;
    },
  },
});
