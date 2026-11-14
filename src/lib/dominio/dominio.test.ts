import { describe, expect, it } from 'vitest';
import { formatarReais, paraCentavos, centavosParaInput } from './dinheiro';
import { calcularVenda, descontoMaximo, vendaFechada, type ItemVenda } from './venda';
import { calcularMovimento, situacaoEstoque, margemProduto } from './estoque';
import { resumirCaixa, diferencaFechamento } from './caixa';
import { diaLocal, diasEntre, vendasPorDia, maisVendidos, ticketMedio, paraCsv } from './relatorios';
import { cpfValido, cnpjValido, formatarDocumento, formatarTelefone } from './documento';

describe('documentos', () => {
  it('confere os dígitos do CPF e do CNPJ', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
  });

  it('formata documento e telefone', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarTelefone('47999110001')).toBe('(47) 99911-0001');
  });
});

describe('dinheiro', () => {
  it('lê o que a pessoa digita em vários formatos', () => {
    expect(paraCentavos('12,50')).toBe(1250);
    expect(paraCentavos('1.234,56')).toBe(123456);
    expect(paraCentavos('R$ 10')).toBe(1000);
    expect(paraCentavos('12.5')).toBe(1250);
    expect(paraCentavos('0,1')).toBe(10);
    expect(paraCentavos('abc')).toBeNull();
    expect(paraCentavos('1,234')).toBeNull();
    expect(paraCentavos('')).toBeNull();
  });

  it('formata em reais', () => {
    expect(formatarReais(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(centavosParaInput(990)).toBe('9,90');
  });
});

const arroz: ItemVenda = { produtoId: 'a', nome: 'Arroz 5kg', precoUnitario: 2890, quantidade: 2, estoque: 10 };
const cafe: ItemVenda = { produtoId: 'c', nome: 'Café 500g', precoUnitario: 1690, quantidade: 1, estoque: 3 };

describe('venda', () => {
  it('soma os itens e calcula o troco só sobre dinheiro', () => {
    const r = calcularVenda({ itens: [arroz, cafe], pagamentos: [{ forma: 'DINHEIRO', valor: 10000 }] });
    expect(r.subtotal).toBe(7470);
    expect(r.total).toBe(7470);
    expect(r.troco).toBe(2530);
    expect(r.falta).toBe(0);
    expect(vendaFechada(r)).toBe(true);
  });

  it('pagamento dividido entre pix e dinheiro', () => {
    const r = calcularVenda({
      itens: [arroz],
      pagamentos: [{ forma: 'PIX', valor: 3000 }, { forma: 'DINHEIRO', valor: 5000 }],
    });
    expect(r.total).toBe(5780);
    expect(r.troco).toBe(2220);
  });

  it('não deixa pix/cartão passar do total (não existe troco de cartão)', () => {
    const r = calcularVenda({ itens: [cafe], pagamentos: [{ forma: 'CARTAO_CREDITO', valor: 5000 }] });
    expect(r.erros.join()).toMatch(/troco só em dinheiro/);
  });

  it('mostra quanto falta pagar', () => {
    const r = calcularVenda({ itens: [arroz], pagamentos: [{ forma: 'PIX', valor: 1000 }] });
    expect(r.falta).toBe(4780);
    expect(vendaFechada(r)).toBe(false);
  });

  it('vendedor só pode dar até 10% de desconto; o dono pode mais', () => {
    expect(descontoMaximo('VENDEDOR', 10000)).toBe(1000);
    const vendedor = calcularVenda({ itens: [arroz], desconto: 1000 });
    expect(vendedor.erros.join()).toMatch(/10%/);
    const dono = calcularVenda({ itens: [arroz], desconto: 1000, papel: 'ADMIN', pagamentos: [{ forma: 'PIX', valor: 4780 }] });
    expect(dono.erros).toEqual([]);
    expect(dono.total).toBe(4780);
  });

  it('não vende mais do que tem no estoque nem quantidade quebrada', () => {
    expect(calcularVenda({ itens: [{ ...cafe, quantidade: 4 }] }).erros.join()).toMatch(/Só tem 3/);
    expect(calcularVenda({ itens: [{ ...cafe, quantidade: 1.5 }] }).erros.join()).toMatch(/inválida/);
    expect(calcularVenda({ itens: [] }).erros.join()).toMatch(/pelo menos um/);
  });
});

describe('estoque', () => {
  it('entrada soma, saída e venda subtraem', () => {
    expect(calcularMovimento('ENTRADA', 10, 5)).toEqual({ delta: 10, saldoApos: 15 });
    expect(calcularMovimento('SAIDA', 2, 5)).toEqual({ delta: -2, saldoApos: 3 });
    expect(calcularMovimento('VENDA', 5, 5)).toEqual({ delta: -5, saldoApos: 0 });
    expect(calcularMovimento('CANCELAMENTO', 1, 0)).toEqual({ delta: 1, saldoApos: 1 });
  });

  it('ajuste de inventário recebe o saldo contado', () => {
    expect(calcularMovimento('AJUSTE', 7, 10)).toEqual({ delta: -3, saldoApos: 7 });
    expect(calcularMovimento('AJUSTE', 0, 4)).toEqual({ delta: -4, saldoApos: 0 });
  });

  it('não deixa ficar negativo nem aceita quantidade zero', () => {
    expect(calcularMovimento('SAIDA', 6, 5)).toHaveProperty('erro');
    expect(calcularMovimento('ENTRADA', 0, 5)).toHaveProperty('erro');
    expect(calcularMovimento('AJUSTE', -1, 5)).toHaveProperty('erro');
  });

  it('situação e margem', () => {
    expect(situacaoEstoque(0, 5)).toBe('ZERADO');
    expect(situacaoEstoque(5, 5)).toBe('BAIXO');
    expect(situacaoEstoque(6, 5)).toBe('OK');
    expect(margemProduto(700, 1000)).toBe(30);
  });
});

describe('caixa', () => {
  it('fecha o caixa descontando troco e sangria e ignorando venda cancelada', () => {
    const r = resumirCaixa(
      10000,
      [
        { status: 'CONCLUIDA', total: 7470, troco: 2530, pagamentos: [{ forma: 'DINHEIRO', valor: 10000 }] },
        { status: 'CONCLUIDA', total: 5000, troco: 0, pagamentos: [{ forma: 'PIX', valor: 5000 }] },
        { status: 'CANCELADA', total: 9999, troco: 0, pagamentos: [{ forma: 'DINHEIRO', valor: 9999 }] },
      ],
      [{ tipo: 'SANGRIA', valor: 5000 }, { tipo: 'SUPRIMENTO', valor: 2000 }],
    );
    expect(r.qtdVendas).toBe(2);
    expect(r.totalVendido).toBe(12470);
    expect(r.porForma.PIX).toBe(5000);
    // 100 + 100 - 25,30 + 20 - 50
    expect(r.dinheiroEsperado).toBe(14470);
    expect(diferencaFechamento(r.dinheiroEsperado, 14400)).toBe(-70);
  });
});

describe('relatórios', () => {
  it('usa o dia de Brasília, não o de UTC', () => {
    // 23h30 de Brasília = 02h30 do dia seguinte em UTC
    expect(diaLocal(new Date('2026-11-14T02:30:00Z'))).toBe('2026-11-13');
  });

  it('preenche os dias sem venda com zero', () => {
    const inicio = new Date('2026-11-10T12:00:00-03:00');
    const fim = new Date('2026-11-13T12:00:00-03:00');
    expect(diasEntre(inicio, fim)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    const linhas = vendasPorDia(
      [
        { criadoEm: new Date('2026-11-11T10:00:00-03:00'), total: 1000 },
        { criadoEm: new Date('2026-11-11T18:00:00-03:00'), total: 500 },
      ],
      inicio,
      fim,
    );
    expect(linhas.map((l) => l.total)).toEqual([0, 1500, 0, 0]);
    expect(linhas[1].qtd).toBe(2);
  });

  it('mais vendidos por faturamento', () => {
    const top = maisVendidos([
      { produtoId: 'a', nome: 'A', quantidade: 1, total: 100, custo: 50 },
      { produtoId: 'b', nome: 'B', quantidade: 3, total: 300, custo: 200 },
      { produtoId: 'a', nome: 'A', quantidade: 4, total: 400, custo: 200 },
    ]);
    expect(top.map((t) => t.produtoId)).toEqual(['a', 'b']);
    expect(top[0]).toMatchObject({ quantidade: 5, total: 500, custo: 250 });
    expect(ticketMedio(1000, 3)).toBe(333);
    expect(ticketMedio(0, 0)).toBe(0);
  });

  it('gera CSV que o Excel abre (com ; e aspas)', () => {
    const csv = paraCsv([
      { produto: 'Café; torrado', qtd: 2 },
      { produto: 'Leite "integral"', qtd: 1 },
    ]);
    expect(csv).toBe('produto;qtd\r\n"Café; torrado";2\r\n"Leite ""integral""";1');
  });
});
