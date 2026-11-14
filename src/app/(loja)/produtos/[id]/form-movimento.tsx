'use client';

import { useActionState, useState } from 'react';
import { Aviso, Botao, Campo, Selecao } from '@/components/ui';
import { registrarMovimento } from '../actions';

export function FormMovimento({ produtoId, saldo, unidade, admin }: { produtoId: string; saldo: number; unidade: string; admin: boolean }) {
  const [estado, acao, salvando] = useActionState(registrarMovimento.bind(null, produtoId), undefined);
  const [tipo, setTipo] = useState('ENTRADA');
  return (
    <form action={acao} className="space-y-3" key={estado?.ok ? `ok-${saldo}` : 'form'}>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <Selecao rotulo="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="ENTRADA">Entrada (chegou mercadoria)</option>
        {admin && <option value="SAIDA">Saída (avaria, vencido, uso interno)</option>}
        {admin && <option value="AJUSTE">Ajuste de inventário (contagem)</option>}
      </Selecao>
      <Campo
        rotulo={tipo === 'AJUSTE' ? `Quantidade contada (${unidade})` : `Quantidade (${unidade})`}
        name="quantidade"
        type="number"
        min={tipo === 'AJUSTE' ? 0 : 1}
        required
        ajuda={tipo === 'AJUSTE' ? `Hoje o sistema mostra ${saldo}. Informe o que tem na prateleira.` : undefined}
      />
      <Campo rotulo={tipo === 'ENTRADA' ? 'Nota fiscal / observação' : 'Motivo'} name="motivo" maxLength={120} erro={estado?.campos?.motivo} />
      <Botao variante="secundario" className="w-full" disabled={salvando}>
        {salvando ? 'Registrando...' : 'Registrar movimento'}
      </Botao>
    </form>
  );
}
