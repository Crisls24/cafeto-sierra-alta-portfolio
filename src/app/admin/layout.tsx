import type { Metadata } from "next";

import ShellAdmin from "../../componentes/ShellAdmin";

export const metadata: Metadata = {
  title: "Administración | Cafeto Sierra Alta",
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <ShellAdmin>{children}</ShellAdmin>;
}
