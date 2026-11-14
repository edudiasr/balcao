import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ErroNegocio, duplicado, type Banco } from './base';

export const senhaValida = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .regex(/[a-zA-Z]/, 'Use pelo menos uma letra.')
  .regex(/\d/, 'Use pelo menos um número.');

export const esquemaUsuario = z.object({
  nome: z.string().trim().min(3, 'Digite o nome completo.').max(80),
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  papel: z.enum(['ADMIN', 'VENDEDOR']),
  senha: senhaValida,
});

const RODADAS = 10;
// hash qualquer, só para o login demorar o mesmo tempo quando o e-mail não existe
const HASH_FALSO = bcrypt.hashSync('usuario-que-nao-existe', RODADAS);

export const gerarHash = (senha: string) => bcrypt.hash(senha, RODADAS);

export async function autenticar(db: Banco, email: string, senha: string) {
  const u = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  const confere = await bcrypt.compare(senha, u?.senhaHash ?? HASH_FALSO);
  if (!u || !confere || !u.ativo) return null;
  return u;
}

export async function criarUsuario(db: Banco, dados: z.infer<typeof esquemaUsuario>) {
  try {
    return await db.usuario.create({
      data: { nome: dados.nome, email: dados.email, papel: dados.papel, senhaHash: await gerarHash(dados.senha) },
    });
  } catch (e) {
    if (duplicado(e)) throw new ErroNegocio('Já existe um usuário com esse e-mail.');
    throw e;
  }
}

export async function alterarSenha(db: Banco, usuarioId: string, atual: string, nova: string) {
  const u = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  if (!(await bcrypt.compare(atual, u.senhaHash))) throw new ErroNegocio('A senha atual não confere.');
  await db.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await gerarHash(nova) } });
  // derruba as outras sessões: quem tinha a senha antiga não continua logado
  await db.sessao.deleteMany({ where: { usuarioId } });
}

/** Ativa/desativa. Não deixa o admin se trancar para fora nem sumir com o último admin. */
export async function alternarAtivo(db: Banco, alvoId: string, quemPede: string) {
  if (alvoId === quemPede) throw new ErroNegocio('Você não pode desativar a própria conta.');
  const alvo = await db.usuario.findUniqueOrThrow({ where: { id: alvoId } });
  if (alvo.ativo && alvo.papel === 'ADMIN') {
    const admins = await db.usuario.count({ where: { papel: 'ADMIN', ativo: true } });
    if (admins <= 1) throw new ErroNegocio('Precisa sobrar pelo menos um administrador ativo.');
  }
  await db.usuario.update({ where: { id: alvoId }, data: { ativo: !alvo.ativo } });
  if (alvo.ativo) await db.sessao.deleteMany({ where: { usuarioId: alvoId } });
}

export async function redefinirSenha(db: Banco, alvoId: string, nova: string) {
  await db.usuario.update({ where: { id: alvoId }, data: { senhaHash: await gerarHash(nova) } });
  await db.sessao.deleteMany({ where: { usuarioId: alvoId } });
}
