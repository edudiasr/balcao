'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatarReais } from '@/lib/dominio/dinheiro';

const curto = (c: number) => (c >= 100000 ? `R$ ${(c / 100000).toFixed(1).replace('.', ',')} mil` : `R$ ${Math.round(c / 100)}`);
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function GraficoVendasDia({ dados }: { dados: { dia: string; total: number; qtd: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey="dia" tickFormatter={diaMes} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={curto} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          cursor={{ fill: '#f4f4f5' }}
          formatter={(v) => [formatarReais(Number(v)), 'Vendido']}
          labelFormatter={(l) => diaMes(String(l))}
          contentStyle={{ borderRadius: 8, borderColor: '#e4e4e7', fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const CORES = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

export function GraficoPizza({ dados }: { dados: { nome: string; valor: number }[] }) {
  const comValor = dados.filter((d) => d.valor > 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={comValor} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
          {comValor.map((d, i) => (
            <Cell key={d.nome} fill={CORES[i % CORES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [formatarReais(Number(v)), String(n)]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export { CORES };
