# Rodaleve Honda — Plataforma de Revisões

Plataforma web com catálogo público e gestor administrativo integrado, preparada para React, TypeScript, Vite e Supabase.

## Stack
- React + TypeScript + Vite
- Supabase Auth, PostgreSQL e Storage
- Tailwind CSS (a configurar no projeto)
- RLS no banco para separar consulta pública e administração

## Configuração
1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/202611180001_initial_schema.sql` no SQL Editor.
3. Configure as variáveis de ambiente copiando `.env.example` para `.env.local`.
4. Instale as dependências com `npm install` e execute `npm run dev`.
5. Crie o primeiro usuário pelo Supabase Auth e atribua o papel de administrador:
   `insert into public.user_roles (user_id, role) values ('UUID_DO_USUARIO', 'admin');`

## Regras de dados
- Os 22 modelos de referência são criados como rascunho, sem preços, especificações ou revisões inventadas.
- O site público consulta somente conteúdo publicado.
- O gestor exige autenticação e as políticas RLS protegem as operações administrativas.
- Preços e peças vinculadas às revisões são armazenados em registros próprios; alterações de catálogo não devem reescrever valores históricos automaticamente.

## Referências visuais
Os HTMLs fornecidos pelo responsável servem como referência de identidade visual, catálogo, navegação e estrutura do gestor. Não são usados como backend nem como fonte confiável para importar valores históricos sem validação.
