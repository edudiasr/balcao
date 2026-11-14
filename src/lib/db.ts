import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// Em desenvolvimento o Next recarrega os módulos a cada mudança; guardar o cliente no globalThis
// evita abrir uma conexão nova com o banco a cada salvamento de arquivo.
const global = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = global.prisma ?? criarCliente();

if (process.env.NODE_ENV !== 'production') global.prisma = db;
