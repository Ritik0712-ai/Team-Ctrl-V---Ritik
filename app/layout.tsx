import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReserveX — Venue Booking System",
  description: "VIT's official venue booking and event management platform managed by DSW",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231e3a5f'/><text x='16' y='22' font-size='16' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>RX</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e3a5f",
                color: "#fff",
                fontSize: "14px",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
              success: {
                style: {
                  background: "#16a34a",
                },
              },
              error: {
                style: {
                  background: "#dc2626",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
