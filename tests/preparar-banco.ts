import { execSync } from 'node:child_process';

export const URL_TESTE =
  process.env.DATABASE_URL_TESTE ?? 'postgresql://balcao:balcao@localhost:5433/balcao_teste?schema=public';

/** Antes de rodar os testes de integração, aplica as migrações no banco de teste. */
export default function preparar() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: URL_TESTE },
    stdio: 'pipe',
  });
}
