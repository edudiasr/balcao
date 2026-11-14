'use client';

import { Printer } from 'lucide-react';
import { Botao } from './ui';

export function BotaoImprimir() {
  return (
    <Botao variante="secundario" className="w-full" onClick={() => window.print()}>
      <Printer size={16} /> Imprimir comprovante
    </Botao>
  );
}
