"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/Button";
import { Input } from "@/components/landing/ui/input";
import { Label } from "@/components/landing/ui/label";
import { Textarea } from "@/components/landing/ui/textarea";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background text-foreground rounded-2xl p-8 md:p-10 shadow-elegant"
    >
      <h3 className="font-serif text-2xl">
        Prefere descrever sua situação antes? Fale conosco.
      </h3>
      <p className="text-muted-foreground text-sm mt-2">
        Preencha o formulário e retornamos em até 2h úteis para orientar qual
        serviço faz mais sentido para o seu caso.
      </p>
      <div className="mt-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required placeholder="Seu nome completo" />
          </div>
          <div>
            <Label htmlFor="contato">WhatsApp ou e-mail</Label>
            <Input id="contato" name="contato" required placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div>
          <Label htmlFor="tipo">Tipo de transação</Label>
          <Input id="tipo" name="tipo" placeholder="Ex.: compra de imóvel, sociedade, contrato de prestação..." />
        </div>
        <div>
          <Label htmlFor="mensagem">Sobre a negociação</Label>
          <Textarea
            id="mensagem"
            name="mensagem"
            rows={4}
            required
            placeholder="Descreva brevemente o contexto, partes envolvidas e o que está em jogo."
          />
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth icon={<ShieldCheck className="h-5 w-5" />}>
          Enviar solicitação
        </Button>
        {sent && (
          <p className="text-sm text-primary text-center" role="status">
            Solicitação recebida — entraremos em contato em breve.
          </p>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Ao enviar, você concorda em ser contatado para análise inicial de
          viabilidade.
        </p>
      </div>
    </form>
  );
}
