// Popula o banco com uma mercearia de bairro e 30 dias de movimento, para o painel e os
// relatórios terem o que mostrar. Rode com: npm run db:seed (apaga o que tinha antes).

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// sorteio com semente: o seed gera sempre os mesmos dados
let semente = 20261114;
const rnd = () => {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
};
const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const sortear = <T>(l: T[]) => l[Math.floor(rnd() * l.length)];

// [código, nome, categoria, custo, venda, estoque inicial, mínimo, unidade, popularidade]
const PRODUTOS: [string, string, string, number, number, number, number, string, number][] = [
  ['7891000100103', 'Arroz Tipo 1 5kg', 'Mercearia', 2290, 2990, 80, 15, 'un', 8],
  ['7891000100110', 'Feijão Carioca 1kg', 'Mercearia', 650, 899, 90, 20, 'un', 8],
  ['7891000100127', 'Açúcar Refinado 1kg', 'Mercearia', 390, 549, 70, 15, 'un', 6],
  ['7891000100134', 'Café Torrado 500g', 'Mercearia', 1290, 1790, 60, 12, 'un', 9],
  ['7891000100141', 'Óleo de Soja 900ml', 'Mercearia', 590, 799, 60, 12, 'un', 6],
  ['7891000100158', 'Macarrão Espaguete 500g', 'Mercearia', 320, 469, 80, 15, 'un', 6],
  ['7891000100165', 'Farinha de Trigo 1kg', 'Mercearia', 420, 599, 40, 10, 'un', 3],
  ['7891000100172', 'Sal Refinado 1kg', 'Mercearia', 180, 299, 40, 8, 'un', 2],
  ['7891000100189', 'Molho de Tomate 340g', 'Mercearia', 210, 349, 70, 15, 'un', 5],
  ['7891000100196', 'Leite Integral 1L', 'Laticínios', 420, 579, 120, 30, 'un', 10],
  ['7891000100202', 'Manteiga com Sal 200g', 'Laticínios', 890, 1290, 30, 8, 'un', 4],
  ['7891000100219', 'Iogurte Morango 170g', 'Laticínios', 190, 329, 50, 12, 'un', 5],
  ['7891000100226', 'Queijo Mussarela kg', 'Laticínios', 3200, 4590, 25, 5, 'kg', 3],
  ['7891000100233', 'Requeijão Cremoso 200g', 'Laticínios', 620, 899, 30, 8, 'un', 3],
  ['7891000100240', 'Pão de Forma 500g', 'Padaria', 590, 849, 40, 10, 'un', 7],
  ['7891000100257', 'Bisnaguinha 300g', 'Padaria', 520, 749, 30, 8, 'un', 4],
  ['7891000100264', 'Bolo de Chocolate', 'Padaria', 900, 1490, 12, 4, 'un', 2],
  ['7891000100271', 'Refrigerante Cola 2L', 'Bebidas', 690, 999, 90, 20, 'un', 9],
  ['7891000100288', 'Refrigerante Guaraná 2L', 'Bebidas', 590, 849, 80, 20, 'un', 7],
  ['7891000100295', 'Água Mineral 500ml', 'Bebidas', 90, 250, 150, 30, 'un', 8],
  ['7891000100301', 'Suco de Uva 1L', 'Bebidas', 790, 1190, 30, 8, 'un', 3],
  ['7891000100318', 'Cerveja Lata 350ml', 'Bebidas', 290, 449, 200, 48, 'un', 10],
  ['7891000100325', 'Energético 250ml', 'Bebidas', 490, 899, 40, 10, 'un', 4],
  ['7891000100332', 'Biscoito Recheado 130g', 'Mercearia', 190, 349, 80, 15, 'un', 7],
  ['7891000100349', 'Chocolate ao Leite 90g', 'Mercearia', 420, 699, 60, 12, 'un', 6],
  ['7891000100356', 'Salgadinho 96g', 'Mercearia', 450, 749, 50, 10, 'un', 6],
  ['7891000100363', 'Detergente 500ml', 'Limpeza', 170, 299, 60, 12, 'un', 5],
  ['7891000100370', 'Sabão em Pó 1kg', 'Limpeza', 990, 1490, 30, 8, 'un', 3],
  ['7891000100387', 'Água Sanitária 2L', 'Limpeza', 390, 649, 35, 8, 'un', 3],
  ['7891000100394', 'Esponja Multiuso c/3', 'Limpeza', 280, 499, 40, 8, 'un', 2],
  ['7891000100400', 'Papel Higiênico 12 rolos', 'Higiene', 1490, 2190, 40, 10, 'un', 5],
  ['7891000100417', 'Sabonete 85g', 'Higiene', 150, 279, 80, 15, 'un', 4],
  ['7891000100424', 'Creme Dental 90g', 'Higiene', 320, 549, 50, 10, 'un', 4],
  ['7891000100431', 'Shampoo 350ml', 'Higiene', 990, 1590, 20, 5, 'un', 2],
  ['7891000100448', 'Desodorante Aerosol', 'Higiene', 890, 1490, 25, 6, 'un', 2],
  ['7891000100455', 'Banana Prata kg', 'Hortifruti', 350, 649, 60, 15, 'kg', 7],
  ['7891000100462', 'Tomate kg', 'Hortifruti', 480, 799, 40, 10, 'kg', 5],
  ['7891000100479', 'Batata kg', 'Hortifruti', 390, 649, 50, 12, 'kg', 5],
  ['7891000100486', 'Cebola kg', 'Hortifruti', 350, 599, 40, 10, 'kg', 4],
  ['7891000100493', 'Ovos Brancos dúzia', 'Hortifruti', 790, 1190, 40, 10, 'un', 7],
  ['7891000100509', 'Linguiça Toscana kg', 'Açougue', 1890, 2790, 20, 5, 'kg', 3],
  ['7891000100516', 'Frango Inteiro kg', 'Açougue', 990, 1490, 25, 6, 'kg', 3],
  ['7891000100523', 'Carvão 3kg', 'Diversos', 1100, 1790, 15, 5, 'un', 2],
  ['7891000100530', 'Pilha AA c/2', 'Diversos', 690, 1290, 20, 5, 'un', 1],
  ['7891000100547', 'Ração Cães 1kg', 'Diversos', 1190, 1790, 18, 5, 'un', 1],
];

const CLIENTES = [
  ['Maria Aparecida Souza', '47999110001'],
  ['João Carlos Pereira', '47999110002'],
  ['Ana Paula Ribeiro', '47999110003'],
  ['Carlos Eduardo Lima', '47999110004'],
  ['Fernanda Oliveira', '47999110005'],
  ['Roberto Machado', '47999110006'],
];

async function main() {
  console.log('Limpando o banco...');
  await db.$executeRawUnsafe(`TRUNCATE "MovimentoCaixa","Pagamento","ItemVenda","MovimentoEstoque","Venda","Caixa","Cliente","Produto","Categoria","Sessao","Usuario" RESTART IDENTITY CASCADE`);

  const senhaHash = await bcrypt.hash('demo1234', 10);
  const admin = await db.usuario.create({ data: { nome: 'Rosana Dias', email: 'admin@balcao.dev', papel: 'ADMIN', senhaHash } });
  const vendedor = await db.usuario.create({ data: { nome: 'Lucas Martins', email: 'vendedor@balcao.dev', papel: 'VENDEDOR', senhaHash } });
  const vendedores = [admin, vendedor, vendedor];

  const categorias = new Map<string, string>();
  for (const nome of [...new Set(PRODUTOS.map((p) => p[2]))]) {
    const c = await db.categoria.create({ data: { nome } });
    categorias.set(nome, c.id);
  }
  const clientes = await Promise.all(CLIENTES.map(([nome, telefone]) => db.cliente.create({ data: { nome, telefone } })));

  // começa há 31 dias com o estoque inicial
  const agora = new Date();
  const hoje0 = new Date(`${agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}T00:00:00-03:00`);
  const inicio = new Date(hoje0.getTime() - 31 * 86400000);

  const produtos = PRODUTOS.map(([codigo, nome, cat, custo, venda, estoque, minimo, unidade, pop]) => ({
    id: randomUUID(), codigo, nome, categoriaId: categorias.get(cat)!, precoCusto: custo, precoVenda: venda,
    estoque, estoqueMinimo: minimo, unidade, pop,
  }));

  const movimentos: object[] = [];
  for (const p of produtos) {
    movimentos.push({ id: randomUUID(), produtoId: p.id, tipo: 'ENTRADA', quantidade: p.estoque, saldoApos: p.estoque, motivo: 'Estoque inicial', usuarioId: admin.id, criadoEm: inicio });
  }

  const caixas: object[] = [];
  const vendas: object[] = [];
  const itens: object[] = [];
  const pagamentos: object[] = [];
  const movCaixa: object[] = [];
  const peso = produtos.flatMap((p) => Array(p.pop).fill(p));

  for (let d = 30; d >= 0; d--) {
    const dia = new Date(hoje0.getTime() - d * 86400000);
    if (new Date(dia).getUTCDay() === 0 && d !== 0) continue; // domingo fechado (menos se hoje for domingo)
    const abre = new Date(dia.getTime() + 8 * 3600000);
    const fecha = new Date(dia.getTime() + 20 * 3600000);
    const ehHoje = d === 0;
    const caixaId = randomUUID();
    let dinheiroGaveta = 20000;

    // reposição duas vezes por semana
    if (d % 4 === 0 && !ehHoje) {
      for (const p of produtos) {
        if (p.estoque < p.estoqueMinimo * 3 && rnd() < 0.85) {
          const q = entre(p.estoqueMinimo * 2, p.estoqueMinimo * 4);
          p.estoque += q;
          movimentos.push({ id: randomUUID(), produtoId: p.id, tipo: 'ENTRADA', quantidade: q, saldoApos: p.estoque, motivo: `NF ${entre(10000, 99999)}`, usuarioId: admin.id, criadoEm: new Date(abre.getTime() - 3600000) });
        }
      }
    }

    const fimDoDia = ehHoje ? agora : fecha;
    const sabado = dia.getUTCDay() === 6;
    const qtdVendas = Math.round(entre(14, 30) * (sabado ? 1.4 : 1) * (ehHoje ? Math.min(1, (agora.getTime() - abre.getTime()) / (12 * 3600000)) : 1));
    const horarios = Array.from({ length: Math.max(0, qtdVendas) }, () => new Date(abre.getTime() + 600000 + rnd() * (fimDoDia.getTime() - abre.getTime() - 900000)))
      .filter((h) => h > abre && h < fimDoDia)
      .sort((a, b) => a.getTime() - b.getTime());

    for (const quando of horarios) {
      const linhas = new Map<string, { p: (typeof produtos)[number]; q: number }>();
      for (let k = 0, n = entre(1, 5); k < n; k++) {
        const p = sortear(peso);
        const q = p.unidade === 'kg' ? entre(1, 2) : entre(1, p.nome.includes('Cerveja') ? 12 : 3);
        const atual = linhas.get(p.id);
        linhas.set(p.id, { p, q: (atual?.q ?? 0) + q });
      }
      const validas = [...linhas.values()].filter(({ p, q }) => p.estoque >= q);
      if (!validas.length) continue;

      const vendaId = randomUUID();
      const subtotal = validas.reduce((s, { p, q }) => s + p.precoVenda * q, 0);
      const desconto = rnd() < 0.08 ? Math.floor(subtotal * 0.05) : 0;
      const total = subtotal - desconto;
      const forma = sortear(['PIX', 'PIX', 'PIX', 'DINHEIRO', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);
      let troco = 0;
      if (forma === 'DINHEIRO') {
        const notas = [2000, 5000, 10000, 20000].find((n) => n >= total) ?? Math.ceil(total / 5000) * 5000;
        const pago = rnd() < 0.3 ? total : notas;
        troco = pago - total;
        pagamentos.push({ id: randomUUID(), vendaId, forma, valor: pago });
        dinheiroGaveta += total;
      } else {
        pagamentos.push({ id: randomUUID(), vendaId, forma, valor: total });
      }
      const cancelada = rnd() < 0.015 && !ehHoje;
      const vendedorDaVez = sortear(vendedores);
      vendas.push({
        id: vendaId, caixaId, vendedorId: vendedorDaVez.id, clienteId: rnd() < 0.15 ? sortear(clientes).id : null,
        subtotal, desconto, total, troco, criadoEm: quando,
        status: cancelada ? 'CANCELADA' : 'CONCLUIDA',
        ...(cancelada ? { canceladaEm: new Date(quando.getTime() + 300000), canceladaPorId: admin.id, motivoCancelamento: 'Cliente desistiu da compra' } : {}),
      });
      if (cancelada && forma === 'DINHEIRO') dinheiroGaveta -= total;
      for (const { p, q } of validas) {
        itens.push({ id: randomUUID(), vendaId, produtoId: p.id, nomeProduto: p.nome, quantidade: q, precoUnitario: p.precoVenda, custoUnitario: p.precoCusto, total: p.precoVenda * q });
        if (cancelada) continue;
        p.estoque -= q;
        movimentos.push({ id: randomUUID(), produtoId: p.id, tipo: 'VENDA', quantidade: -q, saldoApos: p.estoque, usuarioId: vendedorDaVez.id, vendaId, criadoEm: quando });
      }
    }

    if (!ehHoje && dinheiroGaveta > 40000) {
      const valor = Math.floor((dinheiroGaveta - 20000) / 1000) * 1000;
      dinheiroGaveta -= valor;
      movCaixa.push({ id: randomUUID(), caixaId, tipo: 'SANGRIA', valor, motivo: 'Depósito no banco', usuarioId: admin.id, criadoEm: new Date(fecha.getTime() - 1800000) });
    }
    const diferenca = !ehHoje && rnd() < 0.2 ? sortear([-500, -200, 100, 300]) : 0;
    caixas.push({
      id: caixaId, abertoPorId: admin.id, abertoEm: abre, valorAbertura: 20000,
      ...(ehHoje
        ? { status: 'ABERTO' }
        : {
            status: 'FECHADO', fechadoPorId: admin.id, fechadoEm: fecha, valorEsperado: dinheiroGaveta, valorContado: dinheiroGaveta + diferenca,
            observacao: diferenca ? (diferenca < 0 ? 'Faltou troco, conferido duas vezes' : 'Sobra de troco') : null,
          }),
    });
  }

  console.log(`Gravando ${produtos.length} produtos, ${vendas.length} vendas e ${movimentos.length} movimentos...`);
  await db.produto.createMany({
    data: produtos.map((p) => ({
      id: p.id, codigo: p.codigo, nome: p.nome, categoriaId: p.categoriaId, precoCusto: p.precoCusto,
      precoVenda: p.precoVenda, estoque: p.estoque, estoqueMinimo: p.estoqueMinimo, unidade: p.unidade,
    })),
  });
  await db.caixa.createMany({ data: caixas as never });
  await db.venda.createMany({ data: vendas as never });
  await db.itemVenda.createMany({ data: itens as never });
  await db.pagamento.createMany({ data: pagamentos as never });
  await db.movimentoEstoque.createMany({ data: movimentos as never });
  await db.movimentoCaixa.createMany({ data: movCaixa as never });
  console.log('Pronto. Entre com admin@balcao.dev ou vendedor@balcao.dev, senha demo1234.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
