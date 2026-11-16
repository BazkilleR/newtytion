import { AuthProvider } from "@/lib/auth.jsx";
import "./globals.css";

export const metadata = { title: "Fitness Log" };

export const viewport = { themeColor: "#0a0a0a", viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
