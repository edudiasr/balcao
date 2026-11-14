'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Banknote, CheckCircle2, CreditCard, Minus, Plus, QrCode, ScanBarcode, Trash2, X } from 'lucide-react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { formatarReais, paraCentavos, centavosParaInput } from '@/lib/dominio/dinheiro';
import { calcularVenda, descontoMaximo, NOME_FORMA, vendaFechada, type FormaPagamento, type Papel } from '@/lib/dominio/venda';
import { fecharVenda, type RespostaVenda } from './actions';

type Produto = { id: string; codigo: string; nome: string; precoVenda: number; estoque: number; unidade: string };
type Linha = { produto: Produto; quantidade: number };
type Pagamento = { forma: FormaPagamento; valor: number };

const ICONE_FORMA: Record<FormaPagamento, typeof Banknote> = {
  DINHEIRO: Banknote,
  PIX: QrCode,
  CARTAO_DEBITO: CreditCard,
  CARTAO_CREDITO: CreditCard,
};

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Pdv({ produtos, clientes, papel }: { produtos: Produto[]; clientes: { id: string; nome: string }[]; papel: Papel }) {
  const [busca, setBusca] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [descontoTxt, setDescontoTxt] = useState('');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [valorTxt, setValorTxt] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<Extract<RespostaVenda, { ok: true }> | null>(null);
  const [enviando, iniciar] = useTransition();
  const campoBusca = useRef<HTMLInputElement>(null);

  const sugestoes = useMemo(() => {
    const t = normalizar(busca.trim());
    if (!t) return [];
    return produtos.filter((p) => p.codigo.startsWith(t) || normalizar(p.nome).includes(t)).slice(0, 8);
  }, [busca, produtos]);

  const desconto = paraCentavos(descontoTxt) ?? 0;
  const resumo = calcularVenda({
    itens: linhas.map((l) => ({ produtoId: l.produto.id, nome: l.produto.nome, precoUnitario: l.produto.precoVenda, quantidade: l.quantidade, estoque: l.produto.estoque })),
    desconto,
    pagamentos,
    papel,
  });
  const maxDesconto = descontoMaximo(papel, resumo.subtotal);

  function adicionar(p: Produto) {
    setErro(null);
    setLinhas((atual) => {
      const existe = atual.find((l) => l.produto.id === p.id);
      if (existe) return atual.map((l) => (l.produto.id === p.id ? { ...l, quantidade: l.quantidade + 1 } : l));
      return [...atual, { produto: p, quantidade: 1 }];
    });
    setBusca('');
    campoBusca.current?.focus();
  }

  function aoDigitar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // leitor de código de barras "digita" o código e dá Enter
    const exato = produtos.find((p) => p.codigo === busca.trim());
    const alvo = exato ?? (sugestoes.length === 1 ? sugestoes[0] : null);
    if (alvo) adicionar(alvo);
    else if (busca.trim()) setErro(sugestoes.length ? 'Mais de um produto encontrado: escolha na lista.' : 'Produto não encontrado.');
  }

  function mudarQtd(id: string, delta: number) {
    setLinhas((atual) => atual.map((l) => (l.produto.id === id ? { ...l, quantidade: Math.max(1, l.quantidade + delta) } : l)));
  }

  function adicionarPagamento() {
    const valor = valorTxt.trim() ? paraCentavos(valorTxt) : resumo.falta;
    if (!valor || valor <= 0) return setErro('Informe o valor do pagamento.');
    setErro(null);
    setPagamentos((p) => [...p, { forma, valor }]);
    setValorTxt('');
  }

  function limpar() {
    setLinhas([]);
    setPagamentos([]);
    setDescontoTxt('');
    setClienteId('');
    setErro(null);
    setConcluida(null);
    setTimeout(() => campoBusca.current?.focus(), 0);
  }

  function finalizar() {
    setErro(null);
    iniciar(async () => {
      const r = await fecharVenda({
        itens: linhas.map((l) => ({ produtoId: l.produto.id, quantidade: l.quantidade })),
        desconto,
        pagamentos,
        clienteId: clienteId || null,
      });
      if (r.ok) setConcluida(r);
      else setErro(r.erro);
    });
  }

  if (concluida) {
    return (
      <Cartao className="mx-auto mt-6 max-w-md p-8 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
        <h2 className="mt-3 text-xl font-semibold">Venda #{concluida.numero} concluída</h2>
        {concluida.troco > 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 py-3 text-lg">
            Troco: <strong className="num">{formatarReais(concluida.troco)}</strong>
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Sem troco.</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/vendas/${concluida.id}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            Ver comprovante
          </Link>
          <Botao onClick={limpar} autoFocus>Nova venda</Botao>
        </div>
      </Cartao>
    );
  }

  const pronta = vendaFechada(resumo);

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-3">
        <Cartao className="relative p-4">
          <label className="relative block">
            <ScanBarcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={campoBusca}
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={aoDigitar}
              placeholder="Código de barras ou nome do produto"
              aria-label="Buscar produto"
              className="w-full rounded-lg border border-zinc-300 py-3 pl-10 pr-3 text-base focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20"
            />
          </label>
          {sugestoes.length > 0 && (
            <ul className="absolute inset-x-4 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              {sugestoes.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => adicionar(p)}
                    disabled={p.estoque <= 0}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <span>
                      <span className="font-medium">{p.nome}</span>
                      <span className="num ml-2 text-xs text-zinc-400">{p.codigo}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      {formatarReais(p.precoVenda)}
                      <span className={`block text-xs ${p.estoque <= 0 ? 'text-red-600' : 'text-zinc-400'}`}>{p.estoque <= 0 ? 'sem estoque' : `${p.estoque} ${p.unidade}`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao>
          {linhas.length ? (
            <ul className="divide-y divide-zinc-100">
              {linhas.map((l) => (
                <li key={l.produto.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.produto.nome}</p>
                    <p className="num text-xs text-zinc-500">
                      {formatarReais(l.produto.precoVenda)} / {l.produto.unidade}
                      {l.quantidade > l.produto.estoque && <span className="ml-2 text-red-600">só tem {l.produto.estoque}</span>}
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border border-zinc-300">
                    <button onClick={() => mudarQtd(l.produto.id, -1)} className="p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Diminuir"><Minus size={14} /></button>
                    <input
                      value={l.quantidade}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1);
                        setLinhas((a) => a.map((x) => (x.produto.id === l.produto.id ? { ...x, quantidade: n } : x)));
                      }}
                      inputMode="numeric"
                      aria-label={`Quantidade de ${l.produto.nome}`}
                      className="num w-10 border-x border-zinc-300 py-1.5 text-center text-sm focus:outline-none"
                    />
                    <button onClick={() => mudarQtd(l.produto.id, 1)} className="p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Aumentar"><Plus size={14} /></button>
                  </div>
                  <span className="num w-24 text-right font-medium">{formatarReais(l.produto.precoVenda * l.quantidade)}</span>
                  <button onClick={() => setLinhas((a) => a.filter((x) => x.produto.id !== l.produto.id))} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remover ${l.produto.nome}`}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-zinc-500">
              <ScanBarcode className="mx-auto mb-2 text-zinc-300" size={40} />
              Passe o código de barras ou digite o nome do produto.
            </div>
          )}
        </Cartao>
      </div>

      <div className="xl:col-span-2">
        <Cartao className="sticky top-6 space-y-5 p-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600"><span>Subtotal ({linhas.reduce((s, l) => s + l.quantidade, 0)} itens)</span><span className="num">{formatarReais(resumo.subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3 text-zinc-600">
              <label htmlFor="desconto">Desconto (R$)</label>
              <input
                id="desconto"
                value={descontoTxt}
                onChange={(e) => setDescontoTxt(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="num w-28 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm focus:border-marca-500 focus:outline-none"
              />
            </div>
            {resumo.subtotal > 0 && papel !== 'ADMIN' && <p className="text-right text-xs text-zinc-400">até {formatarReais(maxDesconto)} (10%)</p>}
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-3">
              <span className="font-medium">Total</span>
              <span className="num text-3xl font-semibold tracking-tight">{formatarReais(resumo.total)}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Pagamento</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(NOME_FORMA) as FormaPagamento[]).map((f) => {
                const Icone = ICONE_FORMA[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForma(f)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition ${forma === f ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Icone size={16} /> {NOME_FORMA[f]}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={valorTxt}
                onChange={(e) => setValorTxt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarPagamento())}
                inputMode="decimal"
                placeholder={resumo.falta ? centavosParaInput(resumo.falta) : '0,00'}
                aria-label="Valor recebido"
                className="num min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20"
              />
              <Botao variante="secundario" onClick={adicionarPagamento} disabled={!linhas.length || (resumo.falta === 0 && !valorTxt)}>
                Adicionar
              </Botao>
            </div>
            {pagamentos.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {pagamentos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                    <span>{NOME_FORMA[p.forma]}</span>
                    <span className="flex items-center gap-2">
                      <span className="num">{formatarReais(p.valor)}</span>
                      <button onClick={() => setPagamentos((a) => a.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600" aria-label="Remover pagamento"><X size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 space-y-1 text-sm">
              {resumo.falta > 0 && linhas.length > 0 && <div className="flex justify-between text-zinc-600"><span>Falta</span><span className="num font-medium">{formatarReais(resumo.falta)}</span></div>}
              {resumo.troco > 0 && <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-amber-900"><span>Troco</span><span className="num text-lg font-semibold">{formatarReais(resumo.troco)}</span></div>}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Cliente (opcional)</span>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              <option value="">Consumidor final</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>

          {erro && <Aviso>{erro}</Aviso>}
          {linhas.length > 0 && resumo.erros.length > 0 && !erro && <Aviso>{resumo.erros[0]}</Aviso>}

          <div className="flex gap-2">
            <Botao variante="secundario" onClick={limpar} disabled={enviando || !linhas.length}>Cancelar</Botao>
            <Botao className="flex-1 py-3 text-base" onClick={finalizar} disabled={!pronta || enviando}>
              {enviando ? 'Finalizando...' : `Finalizar ${resumo.total ? formatarReais(resumo.total) : ''}`}
            </Botao>
          </div>
        </Cartao>
      </div>
    </div>
  );
}
