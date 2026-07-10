import assert from "node:assert/strict";
import test from "node:test";

import { validateFinalReportFile } from "./useFinalReports";

// File-like mínimo: o validador só lê name/type/size.
const fakeFile = (name: string, type: string, size: number) =>
  ({ name, type, size }) as File;

test("validateFinalReportFile aceita PDF por extensão (sem MIME)", () => {
  assert.equal(validateFinalReportFile(fakeFile("parecer.pdf", "", 1_000)), null);
});

test("validateFinalReportFile aceita por MIME mesmo com extensão estranha", () => {
  assert.equal(
    validateFinalReportFile(fakeFile("parecer.bin", "application/pdf", 1_000)),
    null
  );
});

test("validateFinalReportFile rejeita tipo não suportado", () => {
  assert.equal(
    validateFinalReportFile(fakeFile("imagem.png", "image/png", 1_000)),
    "Tipo de arquivo não suportado. Envie PDF, DOCX ou TXT."
  );
});

test("validateFinalReportFile rejeita acima de 25 MB", () => {
  assert.equal(
    validateFinalReportFile(
      fakeFile("grande.pdf", "application/pdf", 25 * 1024 * 1024 + 1)
    ),
    "Arquivo excede o limite de 25 MB."
  );
});

test("validateFinalReportFile aceita exatamente 25 MB", () => {
  assert.equal(
    validateFinalReportFile(
      fakeFile("limite.pdf", "application/pdf", 25 * 1024 * 1024)
    ),
    null
  );
});
