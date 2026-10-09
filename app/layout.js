import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";

export const metadata = {
  title: "Admin Panel",
  description: "Manage users, verification, support and content",
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
