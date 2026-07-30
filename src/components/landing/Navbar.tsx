"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/Button";

const HUB_URL = "/login";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 shadow-elegant"
      style={{ backgroundColor: "#000056" }}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3 md:py-4">
        <Link href="/" aria-label="Contrato Visto" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-thyago-affonso.png"
            alt="Contrato Visto"
            className="h-10 md:h-12 w-auto"
            loading="eager"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-primary-foreground">
          <a href="#como-funciona" className="hover:text-gold transition-colors">
            Como funciona
          </a>
          <a href="#beneficios" className="hover:text-gold transition-colors">
            Benefícios
          </a>
          <a href="#autoridade" className="hover:text-gold transition-colors">
            Autoridade
          </a>
          <a href="#faq" className="hover:text-gold transition-colors">
            Dúvidas
          </a>
        </nav>

        <Button href={HUB_URL} variant="gold" size="sm" className="hidden sm:inline-flex">
          Solicitar análise
        </Button>

        <button
          className="md:hidden p-2 text-primary-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-primary-deep border-t border-gold/20 py-4">
          <div className="mx-auto max-w-6xl px-5 space-y-3">
            
              <a href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-primary-foreground hover:text-gold"
            >
              Como funciona
            </a>
            
              <a href="#beneficios"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-primary-foreground hover:text-gold"
            >
              Benefícios
            </a>
            
              <a href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-primary-foreground hover:text-gold"
            >
              Dúvidas
            </a>
            <Link
              href={HUB_URL}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-gold font-medium"
            >
              Solicitar análise
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
