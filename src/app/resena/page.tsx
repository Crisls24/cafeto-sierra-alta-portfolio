import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import FormularioResena from "@/componentes/FormularioResena";
import { TEXTOS_FORMULARIO_RESENA as T } from "@/data/resenas";

export const metadata: Metadata = {
  title: T.titulo,
  description: T.subtitulo,
  referrer: "origin",
  robots: { index: false, follow: false },
};

export default function PaginaResena() {
  return (
    <div className="flex min-h-dvh flex-col bg-pagina">
      <header className="border-b border-stone">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" aria-label={T.inicioAria} className="flex min-h-11 items-center gap-2 text-coffee no-underline">
            <Image src="/icon.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-full" />
            <span className="flex flex-col gap-1">
              <span className="font-titulos text-h4 leading-none">{T.marcaCafeto}</span>
              <span className="text-label uppercase tracking-widest text-tinta-suave">{T.marcaSierra}</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-small text-tinta-suave no-underline hover:text-coffee"><ArrowLeft aria-hidden="true" className="size-4" />{T.volver}</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-6 sm:px-8 sm:py-8">
        <FormularioResena />
      </main>
      <footer className="mx-auto flex w-full max-w-lg justify-center gap-6 px-5 py-3 text-label tracking-normal text-tinta-suave">
        <Link href="/privacidad" className="inline-flex min-h-11 items-center text-tinta-suave no-underline hover:text-coffee">{T.privacidad}</Link>
        <Link href="/terminos" className="inline-flex min-h-11 items-center text-tinta-suave no-underline hover:text-coffee">{T.terminos}</Link>
      </footer>
    </div>
  );
}
