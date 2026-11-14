import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, limpar, criarUsuario, criarProduto } from './ajuda';
import { finalizarVenda, cancelarVenda } from '@/lib/servicos/vendas';
import { abrirCaixa, fecharCaixa, movimentarCaixa, resumoDoCaixa } from '@/lib/servicos/caixa';
import { movimentarEstoque, criarProduto as criarProdutoServico } from '@/lib/servicos/produtos';
import { autenticar, alternarAtivo, alterarSenha } from '@/lib/servicos/usuarios';
import { dadosPainel, relatorioPeriodo, inicioDoDia, somarDias } from '@/lib/servicos/relatorios';
import { ErroNegocio, tentar } from '@/lib/servicos/base';

beforeEach(limpar);
afterAll(() => db.$disconnect());

describe('caixa', () => {
  it('só deixa um caixa aberto por vez (índice no banco)', async () => {
    const u = await criarUsuario();
    await abrirCaixa(db, u.id, 10000);
    await expect(abrirCaixa(db, u.id, 5000)).rejects.toThrow('Já existe um caixa aberto');
  });

  it('dois cliques ao mesmo tempo em "abrir caixa" não criam dois caixas', async () => {
    const u = await criarUsuario();
    const r = await Promise.allSettled([abrirCaixa(db, u.id, 100), abrirCaixa(db, u.id, 100), abrirCaixa(db, u.id, 100)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await db.caixa.count()).toBe(1);
  });

  it('fechamento confere a gaveta e exige explicação quando dá diferença', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ precoVenda: 2500 });
    await abrirCaixa(db, u.id, 10000);
    await finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 2 }], desconto: 0, pagamentos: [{ forma: 'DINHEIRO', valor: 6000 }] });
    await movimentarCaixa(db, { tipo: 'SANGRIA', valor: 3000, motivo: 'Depósito', usuarioId: u.id });
    // 100 + 60 recebido - 10 troco - 30 sangria = 120
    await expect(fecharCaixa(db, { usuarioId: u.id, valorContado: 11800 })).rejects.toThrow('diferença');
    const fechado = await fecharCaixa(db, { usuarioId: u.id, valorContado: 11800, observacao: 'Faltou R$ 2 de troco' });
    expect(fechado.valorEsperado).toBe(12000);
    expect(fechado.status).toBe('FECHADO');
  });

  it('não deixa tirar mais dinheiro do que tem na gaveta', async () => {
    const u = await criarUsuario();
    await abrirCaixa(db, u.id, 5000);
    await expect(movimentarCaixa(db, { tipo: 'SANGRIA', valor: 6000, motivo: 'Banco', usuarioId: u.id })).rejects.toThrow('Não tem esse valor');
  });
});

describe('venda', () => {
  it('grava venda, baixa estoque e registra o histórico, com o preço do banco', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ precoVenda: 1990, estoque: 5 });
    await abrirCaixa(db, u.id, 0);
    const v = await finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 3 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 5970 }] });
    expect(v.total).toBe(5970);
    expect((await db.produto.findUniqueOrThrow({ where: { id: p.id } })).estoque).toBe(2);
    const mov = await db.movimentoEstoque.findFirstOrThrow({ where: { vendaId: v.id } });
    expect(mov).toMatchObject({ tipo: 'VENDA', quantidade: -3, saldoApos: 2 });
    expect(v.numero).toBe(1);
  });

  it('sem caixa aberto não vende', async () => {
    const u = await criarUsuario();
    const p = await criarProduto();
    await expect(finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 1000 }] })).rejects.toThrow(
      'caixa está fechado',
    );
  });

  it('pagamento a menos não fecha a venda e não mexe no estoque', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ precoVenda: 1000, estoque: 3 });
    await abrirCaixa(db, u.id, 0);
    await expect(finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 2 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 1000 }] })).rejects.toThrow(
      'não cobre',
    );
    expect((await db.produto.findUniqueOrThrow({ where: { id: p.id } })).estoque).toBe(3);
    expect(await db.venda.count()).toBe(0);
  });

  it('duas vendas disputando o último item: só uma passa', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ precoVenda: 1000, estoque: 1 });
    await abrirCaixa(db, u.id, 0);
    const pedido = { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'PIX' as const, valor: 1000 }] };
    const r = await Promise.allSettled([finalizarVenda(db, u, pedido), finalizarVenda(db, u, pedido), finalizarVenda(db, u, pedido)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await db.produto.findUniqueOrThrow({ where: { id: p.id } })).estoque).toBe(0);
    expect(await db.venda.count()).toBe(1);
  });

  it('vendedor não passa de 10% de desconto; admin passa', async () => {
    const vendedor = await criarUsuario('VENDEDOR');
    const admin = await criarUsuario('ADMIN');
    const p = await criarProduto({ precoVenda: 10000, estoque: 5 });
    await abrirCaixa(db, admin.id, 0);
    const pedido = { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 2000, pagamentos: [{ forma: 'PIX' as const, valor: 8000 }] };
    await expect(finalizarVenda(db, vendedor, pedido)).rejects.toThrow('10%');
    await expect(finalizarVenda(db, admin, pedido)).resolves.toMatchObject({ total: 8000, desconto: 2000 });
  });

  it('cancelar devolve o estoque uma vez só, mesmo com dois cancelamentos juntos', async () => {
    const admin = await criarUsuario('ADMIN');
    const p = await criarProduto({ estoque: 4 });
    await abrirCaixa(db, admin.id, 0);
    const v = await finalizarVenda(db, admin, { itens: [{ produtoId: p.id, quantidade: 3 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 3000 }] });
    const r = await Promise.allSettled([
      cancelarVenda(db, { vendaId: v.id, usuarioId: admin.id, motivo: 'Cliente desistiu' }),
      cancelarVenda(db, { vendaId: v.id, usuarioId: admin.id, motivo: 'Cliente desistiu' }),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await db.produto.findUniqueOrThrow({ where: { id: p.id } })).estoque).toBe(4);
    expect((await db.venda.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('CANCELADA');
  });

  it('não cancela venda de caixa já fechado', async () => {
    const admin = await criarUsuario('ADMIN');
    const p = await criarProduto();
    await abrirCaixa(db, admin.id, 0);
    const v = await finalizarVenda(db, admin, { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 1000 }] });
    await fecharCaixa(db, { usuarioId: admin.id, valorContado: 0 });
    await expect(cancelarVenda(db, { vendaId: v.id, usuarioId: admin.id, motivo: 'Errei o produto' })).rejects.toThrow('já foi fechado');
  });
});

describe('estoque', () => {
  it('entrada, saída e ajuste deixam histórico com o saldo', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ estoque: 10 });
    await movimentarEstoque(db, { produtoId: p.id, tipo: 'ENTRADA', quantidade: 5, usuarioId: u.id, motivo: 'Nota 123' });
    await movimentarEstoque(db, { produtoId: p.id, tipo: 'SAIDA', quantidade: 2, usuarioId: u.id, motivo: 'Avaria' });
    await movimentarEstoque(db, { produtoId: p.id, tipo: 'AJUSTE', quantidade: 12, usuarioId: u.id, motivo: 'Inventário' });
    const movs = await db.movimentoEstoque.findMany({ where: { produtoId: p.id }, orderBy: { criadoEm: 'asc' } });
    expect(movs.map((m) => [m.quantidade, m.saldoApos])).toEqual([[5, 15], [-2, 13], [-1, 12]]);
  });

  it('saída maior que o saldo é recusada', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ estoque: 1 });
    const r = await tentar(() => movimentarEstoque(db, { produtoId: p.id, tipo: 'SAIDA', quantidade: 2, usuarioId: u.id }));
    expect(r).toEqual({ ok: false, erro: 'Estoque insuficiente: tem 1.' });
  });

  it('o banco recusa estoque negativo mesmo se alguém tentar direto', async () => {
    const p = await criarProduto({ estoque: 1 });
    await expect(db.produto.update({ where: { id: p.id }, data: { estoque: -1 } })).rejects.toThrow();
  });

  it('produto novo com estoque inicial já nasce com a entrada no histórico', async () => {
    const u = await criarUsuario();
    const p = await db.$transaction((tx) =>
      criarProdutoServico(tx, { codigo: '789100', nome: 'Feijão 1kg', unidade: 'un', precoCusto: 600, precoVenda: 899, estoqueMinimo: 5, ativo: true }, 20, u.id),
    );
    const mov = await db.movimentoEstoque.findFirstOrThrow({ where: { produtoId: p!.id } });
    expect(mov).toMatchObject({ tipo: 'ENTRADA', quantidade: 20, saldoApos: 20 });
  });
});

describe('usuários', () => {
  it('login confere senha e bloqueia usuário desativado', async () => {
    const admin = await criarUsuario('ADMIN');
    const v = await criarUsuario('VENDEDOR');
    expect(await autenticar(db, 'VENDEDOR@loja.test', 'senha123')).not.toBeNull();
    expect(await autenticar(db, 'vendedor@loja.test', 'errada')).toBeNull();
    expect(await autenticar(db, 'ninguem@loja.test', 'senha123')).toBeNull();
    await alternarAtivo(db, v.id, admin.id);
    expect(await autenticar(db, 'vendedor@loja.test', 'senha123')).toBeNull();
  });

  it('não deixa desativar o último admin nem a si mesmo', async () => {
    const a = await criarUsuario('ADMIN', 'a@loja.test');
    const b = await criarUsuario('ADMIN', 'b@loja.test');
    await expect(alternarAtivo(db, a.id, a.id)).rejects.toThrow('própria conta');
    await alternarAtivo(db, b.id, a.id);
    // agora "a" é o único admin; outro admin não existe para desativá-lo, mas a regra vale
    await expect(alternarAtivo(db, a.id, b.id)).rejects.toThrow(ErroNegocio);
  });

  it('trocar a senha derruba as outras sessões', async () => {
    const u = await criarUsuario();
    await db.sessao.create({ data: { id: 'x', usuarioId: u.id, expiraEm: new Date(Date.now() + 1e6) } });
    await alterarSenha(db, u.id, 'senha123', 'novaSenha9');
    expect(await db.sessao.count()).toBe(0);
    expect(await autenticar(db, u.email, 'novaSenha9')).not.toBeNull();
  });
});

describe('relatórios', () => {
  it('painel soma só as vendas de hoje e ignora as canceladas', async () => {
    const admin = await criarUsuario('ADMIN');
    const p = await criarProduto({ precoCusto: 600, precoVenda: 1000, estoque: 20, estoqueMinimo: 18 });
    await abrirCaixa(db, admin.id, 0);
    await finalizarVenda(db, admin, { itens: [{ produtoId: p.id, quantidade: 2 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 2000 }] });
    const cancelar = await finalizarVenda(db, admin, { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'PIX', valor: 1000 }] });
    await cancelarVenda(db, { vendaId: cancelar.id, usuarioId: admin.id, motivo: 'Teste de cancelamento' });
    const painel = await dadosPainel(db);
    expect(painel.hoje).toMatchObject({ faturamento: 2000, vendas: 1, ticket: 2000, lucroBruto: 800 });
    expect(painel.grafico).toHaveLength(14);
    // vendeu 2 (o cancelado voltou): sobram 18, igual ao mínimo → aparece como estoque baixo
    expect(painel.alertas.map((a) => a.id)).toContain(p.id);
  });

  it('relatório separa formas de pagamento descontando o troco', async () => {
    const u = await criarUsuario('ADMIN');
    const p = await criarProduto({ precoVenda: 1500, estoque: 10 });
    await abrirCaixa(db, u.id, 0);
    await finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'DINHEIRO', valor: 2000 }] });
    await finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 2 }], desconto: 0, pagamentos: [{ forma: 'CARTAO_CREDITO', valor: 3000 }] });
    const hoje = inicioDoDia(new Date());
    const r = await relatorioPeriodo(db, hoje, somarDias(hoje, 1));
    expect(r.faturamento).toBe(4500);
    expect(r.porForma.DINHEIRO).toBe(1500);
    expect(r.porForma.CARTAO_CREDITO).toBe(3000);
    expect(r.produtos[0]).toMatchObject({ quantidade: 3, total: 4500 });
  });

  it('o resumo do caixa bate com as vendas', async () => {
    const u = await criarUsuario();
    const p = await criarProduto({ precoVenda: 700, estoque: 10 });
    const caixa = await abrirCaixa(db, u.id, 2000);
    await finalizarVenda(db, u, { itens: [{ produtoId: p.id, quantidade: 1 }], desconto: 0, pagamentos: [{ forma: 'DINHEIRO', valor: 1000 }] });
    const { resumo } = await resumoDoCaixa(db, caixa.id);
    expect(resumo).toMatchObject({ qtdVendas: 1, totalVendido: 700, dinheiroEsperado: 2700 });
  });
});
