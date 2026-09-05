import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppHeader } from "@/components/app-header";
import { RoleGate } from "@/components/role-gate";
import { TRPCProvider } from "@/trpc/provider";

import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "ClipPay",
    description: "Clipping campaign marketplace take-home",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
            >
                <TRPCProvider>
                    <AppHeader />
                    <main className="mx-auto max-w-5xl px-4 py-8">
                        <RoleGate>{children}</RoleGate>
                    </main>
                </TRPCProvider>
            </body>
        </html>
    );
}
