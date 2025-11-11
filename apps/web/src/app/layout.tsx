import "@/styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "RematesOnlines.mx",
  description: "Electrónicos verificados a precio de remate"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold">RematesOnlines.mx</a>
            <nav className="flex gap-4 text-sm">
              <a href="/productos">Productos</a>
              <a href="/soporte">Soporte</a>
              <a href="/admin">Admin</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t py-8 text-sm">
          <div className="mx-auto max-w-6xl px-4">
            © {new Date().getFullYear()} RematesOnlines.mx
          </div>
        </footer>
      </body>
    </html>
  );
}
