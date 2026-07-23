import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  MessageCircle,
  PlayCircle,
  Target,
  Users
} from 'lucide-react';

export const supportUrl =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL ||
  'https://api.whatsapp.com/send?phone=558499814124&text=Suh,%20tenho%20uma%20d%C3%BAvida';

export const checkoutUrl =
  process.env.NEXT_PUBLIC_CHECKOUT_URL ||
  'https://clkdmg.site/pay/novo-evs-equipe-que-vende-sozinha';

export const lessons = [
  {
    id: 'comece',
    eyebrow: 'comece por aqui',
    title: 'Boas-vindas ao EVS',
    description: 'Entenda como usar a plataforma e por onde começar a implantar o método na sua loja.',
    duration: '06 min',
    icon: PlayCircle,
    accent: '#ff4b7a',
    videoUrl: '#'
  },
  {
    id: 'aula-1',
    eyebrow: 'aula 1',
    title: 'Faça qualquer vendedora atender do jeito que você atenderia',
    description: 'Crie um padrão simples para atendimento, sem precisar repetir orientação todos os dias.',
    duration: '18 min',
    icon: Users,
    accent: '#e6325a',
    videoUrl: '#'
  },
  {
    id: 'aula-2',
    eyebrow: 'aula 2',
    title: 'Corrija erros sem criar atrito',
    description: 'Aprenda a cobrar resultado sem desmotivar quem vende e sem perder respeito.',
    duration: '15 min',
    icon: MessageCircle,
    accent: '#ff7a9b',
    videoUrl: '#'
  },
  {
    id: 'aula-3',
    eyebrow: 'aula 3',
    title: 'Faça toda a equipe seguir o mesmo padrão',
    description: 'Organize a rotina para a loja vender com processo, mesmo quando você não estiver presente.',
    duration: '17 min',
    icon: CheckCircle2,
    accent: '#e6325a',
    videoUrl: '#'
  },
  {
    id: 'aula-4',
    eyebrow: 'aula 4',
    title: 'Descubra quem precisa de ajuda antes da meta ser perdida',
    description: 'Acompanhe desempenho com clareza e aja antes do fechamento do mês.',
    duration: '14 min',
    icon: Target,
    accent: '#ff4b7a',
    videoUrl: '#'
  },
  {
    id: 'aula-5',
    eyebrow: 'aula 5',
    title: 'Transforme conversas esquecidas em vendas recuperadas',
    description: 'Aproveite melhor WhatsApp, provador e cada oportunidade que já existe na loja.',
    duration: '16 min',
    icon: ClipboardCheck,
    accent: '#ff7a9b',
    videoUrl: '#'
  },
  {
    id: 'aula-6',
    eyebrow: 'aula 6',
    title: 'Faça sua equipe executar de verdade',
    description: 'Transforme orientação em prática, porque entender não significa executar.',
    duration: '19 min',
    icon: Headphones,
    accent: '#e6325a',
    videoUrl: '#'
  }
];

export const bonuses = [
  {
    title: 'Diagnóstico Comercial Personalizado',
    description: 'Descubra onde sua loja perde vendas e quais ajustes fazer primeiro.',
    icon: ClipboardCheck,
    url: '#'
  },
  {
    title: 'Checklist Equipe que Vende Sozinha',
    description: 'Use no dia a dia para manter o padrão da equipe funcionando.',
    icon: CheckCircle2,
    url: '#'
  },
  {
    title: 'E-book: Os 7 erros que impedem uma equipe de vender sozinha',
    description: 'Evite os erros que mantêm a equipe dependente da dona.',
    icon: BookOpen,
    url: '#'
  }
];
