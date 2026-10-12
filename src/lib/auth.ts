import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyOtp } from "@/lib/otp";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error("Invalid credentials");
                }

                return user;
            }
        }),
        CredentialsProvider({
            id: "otp",
            name: "Email OTP",
            credentials: {
                email: { label: "Email", type: "email" },
                code: { label: "Verification Code", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.code) {
                    throw new Error("Missing email or verification code");
                }

                const email = credentials.email.trim().toLowerCase();
                const verified = await verifyOtp(email, credentials.code);

                if (!verified.ok) {
                    throw new Error(verified.error);
                }

                // Passwordless: auto-provision the account on first successful OTP.
                const user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: { email },
                });

                return user;
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.phone = (user as any).phone;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).phone = token.phone as string;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl + "/dashboard";
        },
    },
    pages: {
        signIn: "/login", // Custom login page (to be built)
        error: "/auth/error",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
