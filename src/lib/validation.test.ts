import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidEmail,
  validateCaseForm,
  validateClientForm,
  validateDocumentForm,
  validateDocumentUploadForm,
  validatePasswordChange
} from "./validation";

test("validateClientForm requires a client name", () => {
  const result = validateClientForm({ name: "   " });

  assert.equal(result.valid, false);
  assert.equal(result.errors.name, "Informe o nome do cliente.");
});

test("validateClientForm requires individual full name and contract role", () => {
  const result = validateClientForm({
    contractRole: "",
    fullName: "",
    personType: "individual"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.fullName, "Informe o nome completo.");
  assert.equal(result.errors.contractRole, "Selecione o papel no contrato.");
});

test("validateClientForm requires company legal name", () => {
  const result = validateClientForm({
    contractRole: "contractor",
    legalName: "",
    personType: "company"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.legalName, "Informe a razão social.");
});

test("validateClientForm validates CPF, CNPJ, phone and birth date lightly", () => {
  const individual = validateClientForm({
    birthDate: "31/02/1990",
    contractRole: "contractor",
    cpf: "123",
    fullName: "Cliente Teste",
    personType: "individual",
    phone: "119"
  });
  const company = validateClientForm({
    cnpj: "12",
    contractRole: "contractor",
    legalName: "Empresa Teste",
    personType: "company"
  });

  assert.equal(individual.valid, false);
  assert.equal(individual.errors.cpf, "Informe um CPF com 11 dígitos.");
  assert.equal(individual.errors.birthDate, "Informe uma data válida no formato dd/mm/aaaa.");
  assert.equal(individual.errors.phone, "Informe um telefone brasileiro com DDD.");
  assert.equal(company.valid, false);
  assert.equal(company.errors.cnpj, "Informe um CNPJ com 14 dígitos.");
});

test("validateClientForm validates optional document format lightly", () => {
  const result = validateClientForm({ document: "abc@", name: "Cliente Dev" });

  assert.equal(result.valid, false);
  assert.equal(result.errors.document, "Use apenas números, letras, pontos, barras ou hífens.");
});

test("validateClientForm rejects CPF with invalid check digit", () => {
  const result = validateClientForm({
    contractRole: "contractor",
    cpf: "123.456.789-01",
    fullName: "Cliente Teste",
    personType: "individual",
    rg: "12.345.678-9"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.cpf, "Informe um CPF válido.");
});

test("validateClientForm accepts CPF with valid check digit", () => {
  const result = validateClientForm({
    contractRole: "contractor",
    cpf: "123.456.789-09",
    fullName: "Cliente Teste",
    personType: "individual",
    rg: "12.345.678-9"
  });

  assert.equal(result.errors.cpf, undefined);
});

test("validateClientForm rejects CNPJ with invalid check digit", () => {
  const result = validateClientForm({
    cnpj: "11.222.333/0001-00",
    contractRole: "contractor",
    legalName: "Empresa Teste",
    personType: "company"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.cnpj, "Informe um CNPJ válido.");
});

test("validateClientForm accepts CNPJ with valid check digit", () => {
  const result = validateClientForm({
    cnpj: "11.222.333/0001-81",
    contractRole: "contractor",
    legalName: "Empresa Teste",
    personType: "company"
  });

  assert.equal(result.errors.cnpj, undefined);
});

test("validateCaseForm requires title and linked client", () => {
  const result = validateCaseForm({
    caseType: "contract_analysis",
    clientId: "",
    priority: "normal",
    title: ""
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.title, "Informe o título do caso.");
  assert.equal(result.errors.clientId, "Selecione um cliente vinculado.");
});

test("validateCaseForm rejects uncontrolled priority values", () => {
  const result = validateCaseForm({
    caseType: "contract_analysis",
    clientId: "client-1",
    priority: "critical",
    title: "Análise contratual"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.priority, "Selecione uma prioridade válida.");
});

test("validateDocumentForm requires case, filename and positive size", () => {
  const result = validateDocumentForm({
    caseId: "",
    contentType: "application/pdf",
    filename: "",
    sizeBytes: "0",
    status: "pending_upload"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.caseId, "Selecione um caso vinculado.");
  assert.equal(result.errors.filename, "Informe o nome do documento.");
  assert.equal(result.errors.sizeBytes, "Informe um tamanho válido em bytes.");
});

test("validateDocumentForm rejects uncontrolled status values", () => {
  const result = validateDocumentForm({
    caseId: "case-1",
    contentType: "application/pdf",
    filename: "contrato.pdf",
    sizeBytes: "1024",
    status: "unknown"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.status, "Selecione um status válido.");
});

test("validateDocumentUploadForm requires linked case and file", () => {
  const result = validateDocumentUploadForm({
    caseId: "",
    file: null
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.caseId, "Selecione um caso vinculado.");
  assert.equal(result.errors.file, "Selecione um arquivo para upload.");
});

test("validateDocumentUploadForm blocks unsupported type and oversized file", () => {
  const result = validateDocumentUploadForm({
    caseId: "case-1",
    file: {
      name: "payload.exe",
      size: 11 * 1024 * 1024,
      type: "application/octet-stream"
    }
  });

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.file,
    "Use PDF, PNG, JPG, JPEG, DOCX, TXT ou MD com no máximo 10 MB."
  );
});

test("validateDocumentUploadForm accepts local MVP image and pdf uploads", () => {
  assert.equal(
    validateDocumentUploadForm({
      caseId: "case-1",
      file: { name: "contrato.pdf", size: 1024, type: "application/pdf" }
    }).valid,
    true
  );
  assert.equal(
    validateDocumentUploadForm({
      caseId: "case-1",
      file: { name: "evidencia.png", size: 2048, type: "image/png" }
    }).valid,
    true
  );
});

test("validatePasswordChange requires a strong new password and matching confirmation", () => {
  const result = validatePasswordChange({
    confirmPassword: "Senha-fraca-2",
    currentPassword: "",
    newPassword: "abcdefghijkl"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.currentPassword, "Informe a senha atual.");
  assert.equal(result.errors.newPassword, "A senha deve atender todos os requisitos.");
  assert.equal(result.errors.confirmPassword, "A confirmação deve ser igual à nova senha.");
  assert.deepEqual(result.requirements, {
    hasLowercase: true,
    hasMaxLength: true,
    hasMinLength: true,
    hasSpecial: false,
    hasUppercase: false
  });
});

test("validatePasswordChange accepts valid local password change input", () => {
  const result = validatePasswordChange({
    confirmPassword: "Senha-Forte@12",
    currentPassword: "Atual@123",
    newPassword: "Senha-Forte@12"
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.requirements, {
    hasLowercase: true,
    hasMaxLength: true,
    hasMinLength: true,
    hasSpecial: true,
    hasUppercase: true
  });
});

test("isValidEmail accepts real addresses and rejects malformed ones", () => {
  assert.equal(isValidEmail("contato@empresa.com.br"), true);
  assert.equal(isValidEmail("  dev.local@example.test  "), true);
  // o antigo `includes(\"@\")` deixava passar estes casos:
  assert.equal(isValidEmail("@"), false);
  assert.equal(isValidEmail("nome@"), false);
  assert.equal(isValidEmail("nome@dominio"), false);
  assert.equal(isValidEmail("sem-arroba.com"), false);
  assert.equal(isValidEmail("a b@dominio.com"), false);
});
