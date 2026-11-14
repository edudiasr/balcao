import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { gerarHash } from '@/lib/servicos/usuarios';
import { URL_TESTE } from './preparar-banco';

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL_TESTE }) });

/** Limpa todas as tabelas (rápido, e reinicia o número das vendas). */
export async function limpar() {
  await db.$executeRawUnsafe(`
    TRUNCATE "MovimentoCaixa", "Pagamento", "ItemVenda", "MovimentoEstoque", "Venda", "Caixa",
             "Cliente", "Produto", "Categoria", "Sessao", "Usuario" RESTART IDENTITY CASCADE
  `);
}

export async function criarUsuario(papel: 'ADMIN' | 'VENDEDOR' = 'VENDEDOR', email = `${papel.toLowerCase()}@loja.test`) {
  return db.usuario.create({ data: { nome: papel === 'ADMIN' ? 'Dona da Loja' : 'Vendedor', email, papel, senhaHash: await gerarHash('senha123') } });
}

export async function criarProduto(dados: Partial<{ codigo: string; nome: string; precoCusto: number; precoVenda: number; estoque: number; estoqueMinimo: number }> = {}) {
  return db.produto.create({
    data: {
      codigo: dados.codigo ?? `P${Math.random().toString(36).slice(2, 8)}`,
      nome: dados.nome ?? 'Produto teste',
      precoCusto: dados.precoCusto ?? 500,
      precoVenda: dados.precoVenda ?? 1000,
      estoque: dados.estoque ?? 10,
      estoqueMinimo: dados.estoqueMinimo ?? 2,
    },
  });
}
