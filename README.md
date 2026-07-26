# Plataforma EVS

Área de membros inicial para o curso **EVS - Equipe que Vende Sozinha**, pronta para subir no GitHub e publicar na Vercel.

## O que já vem pronto

- Tela de login com identidade EVS.
- Página de recuperação de senha.
- Página de acesso negado.
- Área de membros com:
  - banner de boas-vindas;
  - progresso visual;
  - aulas do EVS;
  - bônus;
  - botão de suporte via WhatsApp.
- Estrutura preparada para Supabase.
- Variáveis prontas para Vercel.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Como subir na Vercel

1. Suba estes arquivos para o GitHub.
2. Na Vercel, clique em **Add New Project**.
3. Importe o repositório.
4. Configure as variáveis de ambiente.
5. Clique em **Deploy**.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` no desenvolvimento local.

Na Vercel, configure:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPPORT_WHATSAPP_URL=https://api.whatsapp.com/send?phone=558499814124&text=Suh,%20tenho%20uma%20d%C3%BAvida
NEXT_PUBLIC_CHECKOUT_URL=https://clkdmg.site/pay/novo-evs-equipe-que-vende-sozinha
```

## Onde trocar links das aulas

Edite o arquivo:

```text
lib/course.ts
```

Troque os campos `videoUrl: '#'` pelos links das aulas hospedadas na Smart Video.

## Fluxo recomendado

1. Cliente compra no Checkout Guru.
2. Guru envia webhook para Pabbly.
3. Pabbly cria/libera a aluna no Supabase.
4. Brevo envia o login por e-mail.
5. BotConversa envia o acesso por WhatsApp.
6. Aluna acessa a plataforma.

## Próximos passos técnicos

- Criar projeto no Supabase.
- Ativar autenticação por e-mail.
- Criar tabela de matrículas/alunas.
- Proteger a rota `/area` para só alunas logadas.
- Criar endpoint para o Pabbly liberar acesso automaticamente.
