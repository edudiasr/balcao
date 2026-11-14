import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, 'src') };

export default defineConfig({
  test: {
    projects: [
      {
        // regras puras: não precisam de banco
        resolve: { alias },
        test: { name: 'unidade', include: ['src/**/*.test.ts'], environment: 'node' },
      },
      {
        // serviços contra um Postgres de verdade (banco separado: balcao_teste)
        resolve: { alias },
        test: {
          name: 'integracao',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/preparar-banco.ts'],
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
