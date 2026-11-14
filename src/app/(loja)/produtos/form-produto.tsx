'use client';

import { useActionState, useState } from 'react';
import { Save } from 'lucide-react';
import { Aviso, AreaTexto, Botao, Campo, Selecao } from '@/components/ui';
import { centavosParaInput, paraCentavos } from '@/lib/dominio/dinheiro';
import { margemProduto } from '@/lib/dominio/estoque';
import { salvarProduto } from './actions';

const UNIDADES = [
  ['un', 'Unidade'],
  ['kg', 'Quilo'],
  ['g', 'Grama'],
  ['l', 'Litro'],
  ['ml', 'Mililitro'],
  ['cx', 'Caixa'],
  ['pct', 'Pacote'],
];

type Produto = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoriaId: string | null;
  unidade: string;
  precoCusto: number;
  precoVenda: number;
  estoqueMinimo: number;
  ativo: boolean;
};

export function FormProduto({ produto, categorias, podeEditar }: { produto?: Produto; categorias: { id: string; nome: string }[]; podeEditar: boolean }) {
  const [estado, acao, salvando] = useActionState(salvarProduto.bind(null, produto?.id ?? null), undefined);
  const [custo, setCusto] = useState(produto ? centavosParaInput(produto.precoCusto) : '');
  const [venda, setVenda] = useState(produto ? centavosParaInput(produto.precoVenda) : '');
  const c = paraCentavos(custo);
  const v = paraCentavos(venda);
  const margem = c != null && v ? margemProduto(c, v) : null;
  const e = estado?.campos ?? {};

  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <fieldset disabled={!podeEditar || salvando} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Código / código de barras" name="codigo" defaultValue={produto?.codigo} erro={e.codigo} required className="sm:col-span-1" />
          <Campo rotulo="Nome" name="nome" defaultValue={produto?.nome} erro={e.nome} required className="sm:col-span-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Selecao rotulo="Categoria" name="categoriaId" defaultValue={produto?.categoriaId ?? ''}>
            <option value="">Sem categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </Selecao>
          <Selecao rotulo="Unidade" name="unidade" defaultValue={produto?.unidade ?? 'un'}>
            {UNIDADES.map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </Selecao>
          <Campo rotulo="Estoque mínimo" name="estoqueMinimo" type="number" min={0} defaultValue={produto?.estoqueMinimo ?? 0} erro={e.estoqueMinimo} ajuda="Abaixo disso aparece no alerta." />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Preço de custo (R$)" name="precoCusto" inputMode="decimal" placeholder="0,00" value={custo} onChange={(ev) => setCusto(ev.target.value)} erro={e.precoCusto} />
          <Campo rotulo="Preço de venda (R$)" name="precoVenda" inputMode="decimal" placeholder="0,00" value={venda} onChange={(ev) => setVenda(ev.target.value)} erro={e.precoVenda} />
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-700">Margem</span>
            <p className={`num rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm ${margem != null && margem < 15 ? 'text-amber-700' : 'text-zinc-700'}`}>
              {margem == null ? '—' : `${String(margem).replace('.', ',')}%`}
            </p>
          </div>
        </div>
        {!produto && (
          <Campo rotulo="Estoque inicial" name="estoqueInicial" type="number" min={0} defaultValue={0} className="sm:w-1/3" ajuda="Vira uma entrada no histórico de estoque." />
        )}
        <AreaTexto rotulo="Descrição (opcional)" name="descricao" defaultValue={produto?.descricao ?? ''} maxLength={500} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={produto?.ativo ?? true} className="size-4 rounded border-zinc-300 accent-marca-600" />
          Produto ativo (aparece na frente de caixa)
        </label>
      </fieldset>
      {podeEditar && (
        <Botao disabled={salvando}>
          <Save size={16} /> {salvando ? 'Salvando...' : produto ? 'Salvar alterações' : 'Cadastrar produto'}
        </Botao>
      )}
    </form>
  );
}
