import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Admin Panel",
  description: "Manage users, verification, support and content",
  icons: {
    icon: "/assets/fevicon.svg",
    shortcut: "/assets/fevicon.svg",
  },
  openGraph: {
    title: "Admin Panel",
    description: "Manage users, verification, support and content",
    siteName: "Admin Panel",
    type: "website",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1800,
        height: 945,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin Panel",
    description: "Manage users, verification, support and content",
    images: ["/assets/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <StoreProvider>{children}</StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
