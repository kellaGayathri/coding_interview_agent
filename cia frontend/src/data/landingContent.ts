export interface LandingNavItem {
  label: string
  sectionId: 'home' | 'about' | 'features'
}

export interface LandingFeature {
  title: string
  description: string
}

export interface LandingCta {
  label: string
  href: string
  variant: 'primary' | 'secondary'
}

export const LANDING_BRAND_NAME = 'Coding Interview Agent'

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { label: 'Home', sectionId: 'home' },
  { label: 'About', sectionId: 'about' },
  { label: 'Features', sectionId: 'features' },
]

export const LANDING_HERO = {
  badge: 'AI-Powered Engineering Interview Simulator',
  heading: 'Train Like You Are Already In The Interview',
  description:
    'Solve realistic coding prompts, run iterative attempts, unlock contextual hints, and track score growth in one premium interview workspace.',
  ctas: [
    { label: 'Start Interview', href: '/login', variant: 'primary' },
    { label: 'View Dashboard', href: '/dashboard', variant: 'secondary' },
  ] satisfies LandingCta[],
}

export const LANDING_ABOUT = {
  title: 'About',
  description:
    'Coding Interview Agent is a structured simulation environment built for serious interview preparation. Practice with a 5-question interview arc, question-level scoring, attempt intelligence, and guided hints when you are stuck.',
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: '5-Question Interview Flow',
    description:
      'Each round includes 2 Easy, 2 Medium, and 1 Hard challenge to mirror a realistic technical interview sequence.',
  },
  {
    title: 'Attempt-Aware Guidance',
    description:
      'After two failed submissions, a contextual hint unlocks so you can recover without losing interview momentum.',
  },
  {
    title: 'Premium Coding Workspace',
    description:
      'Monaco editor, live run console, language switching, and smooth interaction design tuned for deep focus.',
  },
  {
    title: 'Performance Intelligence',
    description:
      'Track total score, completion rate, solved questions, and progress summaries across interview sessions.',
  },
]

export const LANDING_FEATURES_HEADER = {
  title: 'Features',
  description: 'A clean SaaS interface optimized for serious interview preparation.',
}

