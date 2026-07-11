import assert from "node:assert/strict";
import test from "node:test";

import {
  computeProductBasePrice,
  MODULOS,
  PRODUTOS,
  type Modulo,
  type Produto,
} from "./produtoConfig";

/**
 * Guarda ANTI-DRIFT do catálogo local (fallback do wizard).
 *
 * `produtoConfig.ts` é um espelho do catálogo canônico do backend
 * (`src/services/pricing/config.py` — `MODULES.price_cents` e
 * `compute_product_base_price`). Ele é usado só como fallback "~" quando o
 * catálogo do servidor está indisponível. Se um lado mudar sem o outro, o
 * fallback passa a divergir do preço real; este teste (FE) + `test_pricing.py`
 * (BE) travam essa divergência: mexer num lado sem o outro quebra um dos dois.
 */
const CANONICAL_MODULE_CENTS: Record<Modulo, number> = {
  escavador: 6000,
  targetdata: 3900,
  ia_deepseek: 2900,
  serasa_procon: 5900,
  analise_contratual_ia: 7900,
  revisao_humana: 12900,
  reuniao_equipe: 49000,
};

const CANONICAL_PRODUCT_BASE_CENTS: Record<Produto, number> = {
  dados_partes: 12800, // escavador + targetdata + ia_deepseek (obrigatórios)
  consulta_objeto: 2900, // ia_deepseek
  analise_contratual: 10800, // ia_deepseek + analise_contratual_ia
  reuniao_equipe: 0, // base 0 — módulos "fixos no roteiro" são opt-in
};

test("MODULOS espelha os preços canônicos do backend (anti-drift)", () => {
  for (const [code, cents] of Object.entries(CANONICAL_MODULE_CENTS)) {
    assert.equal(
      MODULOS[code as Modulo].precoCents,
      cents,
      `preço do módulo ${code} divergiu do canônico do backend`
    );
  }
  // Nenhum módulo a mais nem a menos que o catálogo canônico.
  assert.deepEqual(
    Object.keys(MODULOS).sort(),
    Object.keys(CANONICAL_MODULE_CENTS).sort()
  );
});

test("computeProductBasePrice = soma dos módulos obrigatórios (bate com o backend)", () => {
  for (const [produto, cents] of Object.entries(CANONICAL_PRODUCT_BASE_CENTS)) {
    assert.equal(
      computeProductBasePrice(produto as Produto),
      cents,
      `base do produto ${produto} divergiu do canônico do backend`
    );
  }
});

test("PRODUTOS cobre exatamente os 4 códigos canônicos", () => {
  assert.deepEqual(
    Object.keys(PRODUTOS).sort(),
    ["analise_contratual", "consulta_objeto", "dados_partes", "reuniao_equipe"]
  );
});
