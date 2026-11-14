-- Só pode existir um caixa aberto por vez.
-- O Prisma não tem índice parcial no schema, então fica aqui no SQL.
CREATE UNIQUE INDEX "Caixa_um_aberto" ON "Caixa" ("status") WHERE "status" = 'ABERTO';

-- Estoque e valores nunca negativos, garantido pelo próprio banco.
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_estoque_nao_negativo" CHECK ("estoque" >= 0);
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_precos_nao_negativos" CHECK ("precoCusto" >= 0 AND "precoVenda" >= 0);
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_valores_validos" CHECK ("total" >= 0 AND "desconto" >= 0 AND "troco" >= 0);
