import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata = {
  title: "Admin Panel",
  description: "Manage users, verification, support and content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
