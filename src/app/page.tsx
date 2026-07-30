import type { Metadata } from "next";
import {
  ShieldCheck,
  FileSearch,
  ScrollText,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Mail,
  ChevronDown,
  Scale,
  Briefcase,
  Building2,
  Handshake,
  KeyRound,
  Users,
  Sparkles,
  Lock,
  Clock,
  Award,
  Zap,
  Globe2,
  Search,
  Home as HomeIcon
} from "lucide-react";

import { Button } from "@/components/Button";
import { Navbar } from "@/components/landing/Navbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/landing/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/landing/ui/collapsible";
import { Input } from "@/components/landing/ui/input";
import { Label } from "@/components/landing/ui/label";
import { Textarea } from "@/components/landing/ui/textarea";
import { ContactForm } from "@/components/landing/ContactForm";

export const metadata: Metadata = {
  title: "Contrato Visto | Segurança Jurídica antes de fechar negócio",
  description:
    "Análise jurídica preventiva e contratos sob medida com Thyago Affonso. +15 anos em contratos empresariais. Segurança antes de assinar.",
  alternates: { canonical: "https://contratovisto.com.br/" }
};

const FAQS: { q: string; a: string }[] = [
  { q: "Em quanto tempo recebo a análise?", a: "A análise jurídica preventiva fica pronta em até 24 horas, contadas exclusivamente em horário comercial (segunda a sexta, das 9h às 18h). Solicitações fora desse horário iniciam a contagem no próximo dia útil." },
  { q: "Qual o prazo para o contrato?", a: "O contrato fica pronto em até 12 horas após o envio completo de todos os dados solicitados na contratação, também considerando apenas o horário comercial." },
  { q: "Esse serviço é só para empresas?", a: "Não. A análise jurídica preventiva atende empresas e pessoas físicas, sempre que houver uma transação relevante, contrato, compra, venda, sinal, parceria ou investimento." },
  { q: "Posso pedir análise antes de pagar sinal?", a: "Sim. Esse é, inclusive, um dos momentos mais recomendados. Avaliar a operação antes de qualquer adiantamento reduz significativamente o risco de prejuízo." },
  { q: "A análise substitui o contrato?", a: "Não. A análise mapeia riscos e indica cautelas. O contrato é o instrumento que formaliza a proteção. Ambos atuam de forma complementar." },
  { q: "O serviço envolve acesso a informações sigilosas ou proibidas?", a: "Não. Trabalho exclusivamente com documentos fornecidos pelo cliente, contexto negocial e, quando aplicável, fontes lícitas e publicamente acessíveis. Não realizo qualquer prática que viole sigilo, privacidade ou legislação vigente." },
  { q: "O contrato pode ser ajustado ao meu caso?", a: "Sim. Os contratos são elaborados sob medida, considerando a natureza da operação, as partes envolvidas e os pontos sensíveis identificados na análise." },
  { q: "Como funciona a contratação?", a: "Você solicita pelo botão de análise e é direcionado ao hub de pagamento. Após confirmação, inicia-se a contagem do prazo de entrega em horário comercial." }
];

const HUB_URL = "/login";
const WHATSAPP_URL =
  "https://wa.me/5548992101733?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20tenho%20interesse%20nos%20servi%C3%A7os%20de%20an%C3%A1lise%20contratual.";

function Section({
  id,
  className = "",
  children
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl px-5">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-gold font-medium">
      <span className="h-px w-8 bg-gold/60" />
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="cv-public-shell min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a }
            }))
          })
        }}
      />
      <Navbar />
      <main>
        {/* HERO */}
        <section
          id="top"
          className="relative overflow-hidden bg-gradient-hero text-primary-foreground pt-32 pb-20 md:pt-40 md:pb-28"
        >
          <div className="mx-auto max-w-6xl px-5 relative">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
              <div className="lg:col-span-7 animate-fade-in-up">
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] leading-[1.05] mt-5 text-balance">
                  Antes de assinar, pagar ou fechar negócio,
                  <span className="block text-gold italic font-medium">
                    tenha segurança jurídica.
                  </span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-primary-foreground max-w-2xl leading-relaxed">
                  Você está prestes a comprar um imóvel, fechar um negócio ou
                  assinar um contrato? Antes de dar qualquer passo, um advogado
                  especialista analisa tudo por você, e entrega o resultado em
                  até <strong className="text-primary-foreground">24h</strong>.
                </p>

                <div className="mt-7 flex flex-wrap gap-4">
                  <Button
                    href="#servicos"
                    variant="gold"
                    size="xl"
                    icon={<ShieldCheck className="h-6 w-6" />}
                  >
                    Análise em até 24h — Garanta agora
                  </Button>
                  <Button
                    href="https://wa.me/5548992101733"
                    variant="outlineGold"
                    size="xl"
                    icon={<MessageCircle className="h-6 w-6" />}
                  >
                    Falar no WhatsApp
                  </Button>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
                  {[
                    { n: "+15", l: "anos de atuação" },
                    { n: "Brasil", l: "atendido" },
                    { n: "24h", l: "para entregar análise" }
                  ].map((s) => (
                    <div key={s.l} className="border-l border-gold/40 pl-4">
                      <p className="font-serif text-2xl md:text-3xl text-gold">{s.n}</p>
                      <p className="text-xs md:text-sm text-primary-foreground mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md">
                  <div className="absolute -inset-4 bg-gradient-gold opacity-20 blur-2xl rounded-full" />
                  <div className="relative rounded-[2rem] overflow-hidden ring-1 ring-gold/30 shadow-elegant bg-primary-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/thyago-affonso.jpeg"
                      alt="Advogado especialista em contratos e análise preventiva"
                      className="w-full h-auto object-cover"
                      loading="eager"
                    />
                  </div>
                  <div className="absolute -bottom-6 -left-4 md:-left-8 bg-background text-foreground rounded-xl shadow-card-premium px-5 py-4 max-w-[280px]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center">
                        <Scale className="h-5 w-5 text-primary-deep" />
                      </div>
                      <div>
                        <p className="font-serif text-base leading-tight">Dr. Thyago</p>
                        <p className="text-xs text-muted-foreground">Direito Contratual</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GANCHO DE AUTORIDADE */}
        <section className="bg-primary-deep text-primary-foreground border-y border-gold/20">
          <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {[
                { icon: Globe2, t: "Expertise em multinacionais", d: "Contratos que protegem operações de empresas globais" },
                { icon: Zap, t: "Agilidade real", d: "Análise em até 24h e contrato em até 12h úteis" },
                { icon: ShieldCheck, t: "Confiabilidade", d: "+15 anos protegendo decisões de alto valor" }
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-serif text-lg">{t}</p>
                    <p className="text-sm text-primary-foreground">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DOR / CONSCIENTIZAÇÃO */}
        <Section id="riscos" className="bg-bg-light">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <Eyebrow>Por que isso importa</Eyebrow>
            <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">
              Os maiores prejuízos nascem de decisões tomadas{" "}
              <span className="text-primary">sem análise prévia.</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg">
              Fraudes, inadimplência, contratos mal estruturados e parceiros
              problemáticos: a maior parte poderia ser evitada com uma avaliação
              jurídica antes de fechar negócio.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: AlertTriangle, t: "Medo de fraude", d: "Negociar com quem aparenta solidez, mas esconde problemas relevantes." },
              { icon: ScrollText, t: "Contrato ruim", d: "Cláusulas frágeis ou desfavoráveis que só aparecem quando há conflito." },
              { icon: Lock, t: "Sinal sem garantia", d: "Pagar entrada ou adiantamento sem proteção jurídica adequada." },
              { icon: Building2, t: "Empresa problemática", d: "Histórico, estrutura ou idoneidade que merecem cautela." },
              { icon: Clock, t: "Riscos descobertos tarde", d: "Sinais de alerta percebidos somente após o prejuízo se concretizar." },
              { icon: Handshake, t: "Parceria mal formalizada", d: "Sociedades e acordos sem proteção e sem regras claras de saída." }
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="group bg-card rounded-xl border border-border p-6 shadow-card-premium hover:-translate-y-1 hover:shadow-elegant transition-all duration-500">
                <div className="h-11 w-11 rounded-lg bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl mt-4">{t}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* COMO FUNCIONA */}
        <Section id="como-funciona" className="bg-background">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4">
              <Eyebrow>Como funciona</Eyebrow>
              <h2 className="font-serif text-primary text-3xl md:text-4xl mt-4">
                Um processo objetivo, técnico e direto ao ponto.
              </h2>
              <div className="gold-divider mt-6" />
              <p className="mt-6 text-muted-foreground leading-relaxed">
                Em até <strong className="text-foreground">24 horas úteis</strong>,
                você recebe um parecer jurídico preventivo com alertas relevantes
                sobre a transação, considerando documentos, contexto negocial e
                fontes lícitas e publicamente acessíveis, quando aplicável.
              </p>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-5">
              {[
                { n: "01", t: "Você envia os dados", d: "Conte os contornos da negociação: partes envolvidas, valores, objeto e o que mais é relevante." },
                { n: "02", t: "Análise jurídica preventiva", d: "Avalio documentos, contexto e elementos juridicamente relevantes obtidos de forma lícita." },
                { n: "03", t: "Parecer com alertas", d: "Você recebe um relatório objetivo com riscos, sinais de alerta e cautelas recomendadas." },
                { n: "04", t: "Formalização segura", d: "Se necessário, seguimos para o contrato adequado para proteger a operação." }
              ].map((s) => (
                <div key={s.n} className="relative rounded-xl border border-border bg-card p-6 shadow-card-premium hover:border-gold/60 transition-colors">
                  <span className="absolute -top-4 left-6 font-serif text-sm tracking-widest bg-gradient-navy text-primary-foreground px-3 py-1 rounded">
                    PASSO {s.n}
                  </span>
                  <h3 className="font-serif text-xl mt-3">{s.t}</h3>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* SERVIÇOS E PREÇOS */}
        <Section id="servicos" className="bg-bg-light">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <Eyebrow>Serviços e preços</Eyebrow>
            <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">
              Escolha o nível de proteção que você precisa
            </h2>
            <p className="mt-5 text-muted-foreground text-lg">
              Serviços independentes. Contrate um ou os três em sequência, cada
              etapa aprofunda sua segurança.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            <div className="flex flex-col bg-card rounded-2xl border border-gold/40 p-7 shadow-card-premium hover:shadow-elegant transition-all">
              <span className="self-start text-[10px] uppercase tracking-[0.22em] text-primary font-semibold bg-primary/5 px-3 py-1 rounded-full">
                Etapa 1
              </span>
              <div className="h-12 w-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mt-5">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl mt-4">Verificação das Partes</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Antes de fechar qualquer negócio, saiba com quem você está
                negociando. Verificamos CPF, CNPJ, ações judiciais, protestos,
                dívidas e restrições financeiras de todos os envolvidos no
                contrato.
              </p>
              <p className="text-xs text-muted-foreground mt-5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gold" /> Entrega em até 24h
              </p>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="font-serif text-4xl text-primary">R$ 97</p>
                <p className="text-xs text-muted-foreground mt-1">Pagamento via cartão, Pix ou boleto</p>
              </div>
              <Button href="/checkout?priceId=verificacao_partes_onetime" variant="gold" size="lg" fullWidth className="mt-6">
                Contratar agora
              </Button>
            </div>

            <div className="flex flex-col bg-card rounded-2xl border border-gold/40 p-7 shadow-card-premium hover:shadow-elegant transition-all">
              <span className="self-start text-[10px] uppercase tracking-[0.22em] text-primary font-semibold bg-primary/5 px-3 py-1 rounded-full">
                Etapa 2
              </span>
              <div className="h-12 w-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mt-5">
                <HomeIcon className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl mt-4">Análise do Bem</h3>
              <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                Investigamos a situação jurídica do bem que está sendo negociado,
                imóvel, veículo, empresa ou equipamento. Identificamos gravames,
                penhoras, dívidas ocultas e irregularidades que podem passar para
                o comprador.
              </p>
              <p className="text-xs text-muted-foreground mt-5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gold" /> Entrega em até 24h
              </p>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="font-serif text-4xl text-primary">R$ 197</p>
                <p className="text-xs text-muted-foreground mt-1">Pagamento via cartão, Pix ou boleto</p>
              </div>
              <Button href="/checkout?priceId=analise_bem_onetime" variant="gold" size="lg" fullWidth className="mt-6">
                Contratar agora
              </Button>
            </div>

            <div className="relative flex flex-col bg-gradient-navy text-primary-foreground rounded-2xl border-2 border-gold p-7 shadow-elegant">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] font-semibold bg-gradient-gold text-primary-deep px-4 py-1.5 rounded-full whitespace-nowrap">
                Mais completo
              </span>
              <span className="self-start text-[10px] uppercase tracking-[0.22em] text-gold font-semibold bg-gold/15 px-3 py-1 rounded-full mt-3">
                Etapa 3
              </span>
              <div className="h-12 w-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mt-5">
                <Scale className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl mt-4">Análise Completa do Contrato</h3>
              <p className="text-primary-foreground text-sm mt-3 leading-relaxed">
                Revisamos cada cláusula do contrato, identificamos riscos,
                desequilíbrios e pontos de negociação. Ao final apresentamos
                nossa análise em reunião dedicada, e se necessário, redigimos ou
                ajustamos o contrato para você.
              </p>
              <p className="text-xs text-primary-foreground mt-5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gold" /> apenas online
              </p>
              <div className="mt-5 pt-5 border-t border-primary-foreground/15 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary-foreground">Com equipe especializada</p>
                  <p className="font-serif text-3xl text-gold mt-1">R$ 400</p>
                  <p className="text-xs text-primary-foreground mt-0.5">ou 10x de R$ 40 sem juros</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary-foreground">Com Dr. Thyago</p>
                  <p className="font-serif text-3xl text-gold mt-1">R$ 750</p>
                  <p className="text-xs text-primary-foreground mt-0.5">ou 10x de R$ 75 sem juros</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Button href="/checkout?priceId=analise_contrato_equipe_onetime" variant="outlineLight" size="lg" fullWidth>
                  Reunião com a equipe
                </Button>
                <Button href="/checkout?priceId=analise_contrato_thyago_onetime" variant="gold" size="lg" fullWidth>
                  Reunião com o Dr. Thyago
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
            Os serviços podem ser contratados separadamente ou em conjunto.
            Parcelamento em até 10x sem juros no cartão de crédito.
          </p>
        </Section>

        {/* O QUE O CLIENTE RECEBE */}
        <Section id="entrega" className="bg-gradient-navy text-primary-foreground">
          <div className="max-w-3xl">
            <Eyebrow>O que você recebe</Eyebrow>
            <h2 className="font-serif text-primary-foreground text-3xl md:text-5xl mt-4 text-balance">
              Um parecer claro para decidir com <span className="text-gold italic">segurança</span>.
            </h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {[
              { icon: FileSearch, t: "Parecer jurídico preventivo", d: "Documento técnico, objetivo, com linguagem acessível e direta." },
              { icon: AlertTriangle, t: "Apontamento de riscos", d: "Sinais de alerta e pontos sensíveis identificados na operação." },
              { icon: Sparkles, t: "Visão prática do negócio", d: "Leitura jurídica conectada à realidade comercial da transação." },
              { icon: ShieldCheck, t: "Cautelas recomendadas", d: "Orientação sobre o que verificar antes de assinar, pagar ou concluir." },
              { icon: ScrollText, t: "Direcionamento contratual", d: "Análise da necessidade, e do tipo, de contrato adequado." },
              { icon: CheckCircle2, t: "Apoio para decisão", d: "Você decide com mais clareza, com base técnica, sem achismo." }
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-6 backdrop-blur-sm hover:bg-primary-foreground/[0.07] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl">{t}</h3>
                    <p className="text-primary-foreground text-sm mt-1.5 leading-relaxed">{d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* BENEFÍCIOS */}
        <Section id="beneficios" className="bg-background">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Eyebrow>Benefícios</Eyebrow>
            <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">
              Decisão inteligente é decisão <span className="text-primary">protegida</span>.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Zap, t: "Agilidade sem perder profundidade", d: "Análise em até 24h úteis. Contrato em até 12h úteis após envio dos dados." },
              { icon: ShieldCheck, t: "Confiabilidade técnica", d: "Mais de 15 anos aplicados a operações relevantes, inclusive multinacionais." },
              { icon: AlertTriangle, t: "Redução de risco", d: "Identifique pontos críticos antes que se transformem em prejuízo." },
              { icon: Lock, t: "Prevenção de prejuízo", d: "Evite litígios, perdas financeiras e desgastes desnecessários." },
              { icon: Sparkles, t: "Mais clareza para decidir", d: "Veja a transação com a leitura de quem entende contratos a fundo." },
              { icon: Briefcase, t: "Proteção patrimonial", d: "Resguarde patrimônio, operação e reputação." }
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="group relative bg-card rounded-xl p-6 border border-border shadow-card-premium overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-elegant">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                <Icon className="h-7 w-7 text-gold" />
                <h3 className="font-serif text-xl mt-4">{t}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* OFERTA SECUNDÁRIA, CONTRATOS */}
        <Section id="contratos" className="bg-bg-light">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Eyebrow>Precisa também de um contrato? A gente redige.</Eyebrow>
              <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">
                Depois da análise, <span className="text-primary italic">formalize do jeito certo.</span>
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                Além da análise, elaboramos contratos personalizados para
                formalizar sua transação com segurança. Compra e venda, locação,
                societário, parceria e muito mais, entregue em até 12h após o
                envio das informações.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Contratos de compra e venda, prestação de serviços e parcerias",
                  "Contratos empresariais, societários e operacionais",
                  "Contratos de locação, intermediação e investimento",
                  "Cláusulas de garantia, rescisão, penalidade e proteção"
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{i}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>
                      Contrato pronto em até <strong className="text-primary">12 horas</strong> após o envio dos dados
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="text-xs text-muted-foreground mt-2 pl-6 leading-relaxed">
                    Prazo válido apenas em horário comercial (segunda a sexta, das
                    9h às 18h), contado a partir do envio completo de todos os
                    dados solicitados na contratação.
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <Button href={HUB_URL} variant="primary" size="lg" className="mt-8" icon={<ScrollText className="h-5 w-5" />}>
                Quero formalizar com segurança
              </Button>
            </div>

            <div className="relative">
              <div className="rounded-2xl bg-gradient-navy p-10 shadow-elegant text-primary-foreground relative overflow-hidden">
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
                <Scale className="h-10 w-10 text-gold" />
                <h3 className="font-serif text-3xl mt-5">Análise + Contrato = Proteção completa</h3>
                <p className="mt-4 text-primary-foreground leading-relaxed">
                  A análise revela o que precisa ser cuidado. O contrato traduz
                  isso em proteção real, escrita e exigível.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="border-l-2 border-gold/60 pl-4">
                    <p className="font-serif text-2xl text-gold">24h</p>
                    <p className="text-sm text-primary-foreground mt-1">Análise preventiva</p>
                  </div>
                  <div className="border-l-2 border-gold/60 pl-4">
                    <p className="font-serif text-2xl text-gold">12h</p>
                    <p className="text-sm text-primary-foreground mt-1">Contrato adequado</p>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-primary-foreground">Prazos em horário comercial.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* AUTORIDADE */}
        <Section id="autoridade" className="bg-background">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl bg-gradient-gold opacity-30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/thyago-affonso.jpeg"
                  alt="Advogado especialista"
                  className="relative rounded-2xl shadow-elegant ring-1 ring-border w-full"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2">
              <Eyebrow>Quem assina o serviço</Eyebrow>
              <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">Dr. Thyago</h2>
              <p className="text-gold uppercase tracking-[0.22em] text-xs mt-2">Advogado especialista</p>

              <p className="mt-6 text-foreground text-lg leading-relaxed">
                Mais de <strong>15 anos de atuação</strong> em contratos de
                pequenas, médias e grandes empresas, incluindo a estruturação
                contratual para <strong>multinacionais</strong> em operações de
                alto valor e complexidade.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                O mesmo rigor técnico aplicado em negociações corporativas globais
                agora chega de forma{" "}
                <strong className="text-foreground">acessível, ágil e objetiva</strong>{" "}
                para proteger empresários, investidores e contratantes em decisões
                que não admitem improviso.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Globe2, t: "Contratos para multinacionais" },
                  { icon: Award, t: "+15 anos de experiência prática" },
                  { icon: Briefcase, t: "Contratos empresariais e societários" },
                  { icon: ShieldCheck, t: "Foco em prevenção de riscos" },
                  { icon: Zap, t: "Entrega ágil em horário comercial" },
                  { icon: Sparkles, t: "Linguagem objetiva e estratégica" }
                ].map(({ icon: Icon, t }) => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/5 text-gold flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* PARA QUEM É */}
        <Section id="para-quem" className="bg-bg-light">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Eyebrow>Para quem é</Eyebrow>
            <h2 className="font-serif text-primary text-3xl md:text-5xl mt-4 text-balance">
              Pensado para quem está prestes a <span className="text-primary">decidir</span>.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Building2, t: "Empresários", d: "Que negociam contratos, parcerias ou novas operações." },
              { icon: Briefcase, t: "Investidores", d: "Antes de aportar capital ou entrar em sociedade." },
              { icon: Handshake, t: "Compradores e vendedores", d: "Em transações de bens, ativos ou participações." },
              { icon: KeyRound, t: "Locadores e locatários", d: "Antes de assinar locações de impacto financeiro relevante." },
              { icon: ScrollText, t: "Quem vai assinar contrato", d: "E quer entender o que está, de fato, sendo aceito." },
              { icon: ShieldCheck, t: "Quem vai pagar sinal", d: "E precisa proteger o adiantamento ou reserva." },
              { icon: Users, t: "Sócios e parceiros", d: "Que pretendem formalizar acordos com clareza e proteção." },
              { icon: Scale, t: "Profissionais autônomos", d: "Que firmam contratos e desejam validar a contraparte." }
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="bg-card rounded-xl p-5 border border-border shadow-card-premium hover:border-primary/30 transition-colors">
                <Icon className="h-6 w-6 text-gold" />
                <h3 className="font-serif text-lg mt-3">{t}</h3>
                <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" className="bg-background">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <Eyebrow>Dúvidas frequentes</Eyebrow>
              <h2 className="font-serif text-primary text-3xl md:text-4xl mt-4">
                O que perguntam antes de contratar.
              </h2>
              <div className="gold-divider mt-6" />
              <p className="text-muted-foreground mt-6 leading-relaxed">
                Não encontrou sua dúvida? Solicite a análise, respondo de forma
                objetiva, sem rodeios.
              </p>
              <Button href={HUB_URL} variant="primary" className="mt-6" icon={<ShieldCheck className="h-4 w-4" />}>
                Solicitar análise
              </Button>
            </div>

            <div className="lg:col-span-8">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-serif text-lg hover:text-primary hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </Section>

        {/* CTA FINAL + FORM */}
        <Section id="contato" className="bg-gradient-hero text-primary-foreground">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <Eyebrow>Próximo passo</Eyebrow>
              <h2 className="font-serif text-primary-foreground text-3xl md:text-5xl mt-4 text-balance">
                Antes de assinar, pagar ou fechar negócio,
                <span className="block text-gold italic">tenha segurança jurídica.</span>
              </h2>
              <p className="mt-6 text-primary-foreground text-lg leading-relaxed">
                Solicite agora sua análise jurídica preventiva. Em até 24 horas
                úteis, sua transação pode estar amparada por uma leitura técnica
                de quem vive contratos há mais de 15 anos.
              </p>

              <div className="mt-8 space-y-4">
                <Button href={HUB_URL} variant="gold" size="xl" icon={<ShieldCheck className="h-5 w-5" />}>
                  Solicitar análise agora
                </Button>

                <div className="flex items-center gap-4 pt-4">
                  <div className="h-12 w-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary-foreground">E-mail</p>
                    <p className="font-serif text-lg">contato@thyagoaffonso.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gold/15 text-gold flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary-foreground">WhatsApp</p>
                    <p className="font-serif text-lg">(48) 9210-1733</p>
                  </div>
                </div>
              </div>
            </div>

            <ContactForm />
          </div>
        </Section>

        {/* DISCLAIMER */}
        <section className="bg-secondary py-12 border-t border-border">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Observações importantes
            </p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              A análise possui natureza estritamente jurídica e preventiva e{" "}
              <strong>não envolve</strong> obtenção ilícita de informações. A
              avaliação considera documentos, contexto negocial, informações
              fornecidas pelo cliente e fontes lícitas e publicamente acessíveis,
              quando aplicável. Cada caso depende do seu contexto concreto. A
              contratação está sujeita à análise inicial de viabilidade. Prazos
              de entrega contam apenas em horário comercial.
            </p>
          </div>
        </section>
      </main>

      <footer className="text-bg-light py-12" style={{ backgroundColor: "#000056" }}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:items-end gap-3 text-sm">
              <a href="#servicos" className="hover:text-gold transition-colors">Serviços</a>
              <a href="#como-funciona" className="hover:text-gold transition-colors">Como funciona</a>
              <a href="#faq" className="hover:text-gold transition-colors">Dúvidas frequentes</a>
              <a href="#contato" className="hover:text-gold transition-colors">Contato</a>
              <p className="text-xs text-bg-light/60 text-center md:text-right mt-2">
                © 2026 Contrato Visto. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>

      
        <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com um agente agora"
        className="md:hidden fixed bottom-5 inset-x-5 z-40 flex items-center justify-center gap-2 bg-gradient-gold text-primary-deep font-medium py-4 rounded-full shadow-gold active:scale-[0.98] transition-transform"
      >
        <MessageCircle className="h-5 w-5" />
        Falar com um agente agora
      </a>
      
        <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com um agente agora"
        className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-3 bg-gradient-gold text-primary-deep font-medium px-5 py-4 rounded-full shadow-gold hover:scale-105 transition-transform"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-serif">Falar com um agente agora</span>
      </a>
    </div>
  );
}
