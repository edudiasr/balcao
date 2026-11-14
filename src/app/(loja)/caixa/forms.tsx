'use client';

import { useActionState, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { AreaTexto, Aviso, Botao, Campo, Selecao } from '@/components/ui';
import { formatarReais, paraCentavos } from '@/lib/dominio/dinheiro';
import { abrir, fechar, movimentar } from './actions';

export function FormAbrir() {
  const [estado, acao, enviando] = useActionState(abrir, undefined);
  return (
    <form action={acao} className="space-y-3">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Troco na gaveta (R$)" name="valor" inputMode="decimal" placeholder="200,00" autoFocus ajuda="Quanto em dinheiro você está colocando no caixa para começar." />
      <Botao className="w-full" disabled={enviando}><Unlock size={16} /> {enviando ? 'Abrindo...' : 'Abrir caixa'}</Botao>
    </form>
  );
}

export function FormMovimento() {
  const [estado, acao, enviando] = useActionState(movimentar, undefined);
  return (
    <form action={acao} className="space-y-3" key={estado?.mensagem ?? 'mov'}>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <Selecao rotulo="Tipo" name="tipo" defaultValue="SANGRIA">
        <option value="SANGRIA">Sangria (tirar dinheiro)</option>
        <option value="SUPRIMENTO">Suprimento (colocar dinheiro)</option>
      </Selecao>
      <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" required />
      <Campo rotulo="Motivo" name="motivo" required placeholder="Ex.: depósito no banco" />
      <Botao variante="secundario" className="w-full" disabled={enviando}>Registrar</Botao>
    </form>
  );
}

export function FormFechar({ esperado }: { esperado: number }) {
  const [estado, acao, enviando] = useActionState(fechar, undefined);
  const [contado, setContado] = useState('');
  const c = paraCentavos(contado);
  const dif = c == null ? null : c - esperado;
  return (
    <form action={acao} className="space-y-3">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Dinheiro contado na gaveta (R$)" name="contado" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} required />
      {dif != null && (
        <p className={`rounded-lg px-3 py-2 text-sm ${dif === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          {dif === 0 ? 'Bateu certinho com o esperado.' : `${dif > 0 ? 'Sobrando' : 'Faltando'} ${formatarReais(Math.abs(dif))}. Explique na observação.`}
        </p>
      )}
      <AreaTexto rotulo="Observação" name="observacao" maxLength={300} />
      <Botao variante="perigo" className="w-full" disabled={enviando}>
        <Lock size={16} /> {enviando ? 'Fechando...' : 'Fechar caixa'}
      </Botao>
    </form>
  );
}
