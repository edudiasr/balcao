'use client';

import { useActionState, useState } from 'react';
import { Ban } from 'lucide-react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { cancelar } from '../actions';

export function FormCancelar({ vendaId }: { vendaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState(cancelar.bind(null, vendaId), undefined);
  if (estado?.ok) return <Aviso tipo="ok">{estado.mensagem}</Aviso>;
  if (!aberto) {
    return (
      <Botao variante="secundario" className="w-full text-red-700" onClick={() => setAberto(true)}>
        <Ban size={16} /> Cancelar venda
      </Botao>
    );
  }
  return (
    <form action={acao} className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
      <p className="text-sm text-red-900">Os itens voltam para o estoque e a venda sai do caixa.</p>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Motivo" name="motivo" required minLength={5} placeholder="Ex.: cliente desistiu, produto errado" autoFocus />
      <div className="flex gap-2">
        <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Voltar</Botao>
        <Botao variante="perigo" className="flex-1" disabled={enviando}>{enviando ? 'Cancelando...' : 'Confirmar cancelamento'}</Botao>
      </div>
    </form>
  );
}
