import { randomBytes } from 'node:crypto'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { currentLocales } from './i18n/i18n'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: [
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@pinia/nuxt',
    'shadcn-nuxt',
  ],
  devtools: { enabled: true },
  css: ['@/assets/css/tailwind.css'],
  colorMode: {
    classSuffix: '',
  },
  runtimeConfig: {
    siteToken: process.env.NUXT_SITE_TOKEN || randomBytes(32).toString('base64url'),
    googleClientId: process.env.NUXT_GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
    stripeSecretKey: process.env.NUXT_STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.NUXT_STRIPE_WEBHOOK_SECRET || '',
    stripePriceIdStarter: process.env.NUXT_STRIPE_PRICE_ID_STARTER || '',
    stripePriceIdPro: process.env.NUXT_STRIPE_PRICE_ID_PRO || '',
    stripePriceIdEnterprise: process.env.NUXT_STRIPE_PRICE_ID_ENTERPRISE || '',
    mainDomain: process.env.NUXT_MAIN_DOMAIN || 'shaf.app',
    dashboardDomain: process.env.NUXT_DASHBOARD_DOMAIN || 'dash.shaf.app',
    defaultShortDomain: process.env.NUXT_DEFAULT_SHORT_DOMAIN || 'shaf.is',
    systemShortDomains: (process.env.NUXT_SYSTEM_SHORT_DOMAINS || 'shaf.is')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean),
    cfZoneId: process.env.NUXT_CF_ZONE_ID || '',
    cfFallbackOrigin: process.env.NUXT_CF_FALLBACK_ORIGIN || 'cname.shaf.is',
    cfAccessTeamDomain: '',
    cfAccessAud: '',
    redirectStatusCode: '301',
    linkCacheTtl: 60,
    redirectWithQuery: false,
    redirectNoStore: false,
    homeURL: '',
    cfAccountId: process.env.NUXT_CF_ACCOUNT_ID || '',
    cfApiToken: process.env.NUXT_CF_API_TOKEN || '',
    dataset: process.env.NUXT_DATASET || 'shaf',
    aiModel: '@cf/qwen/qwen3-30b-a3b-fp8',
    aiPrompt: `You are a URL shortening assistant, please shorten the URL provided by the user into a SLUG. The SLUG information should be derived from the URL and page content (if provided). Do not make any assumptions beyond the given information. A SLUG is human-readable and should not exceed three words and can be validated using regular expressions {slugRegex} . Only the best one is returned, the format must be JSON reference {"slug": "example-slug"}`,
    aiOgPrompt: `You are an OpenGraph metadata assistant. Please summarize the page content provided by the user into a perfect title and description for an OpenGraph preview. Do not make any assumptions beyond the given information. Only the best one is returned, the format must be JSON reference {"title": "Example Title", "description": "Example description that summarizes the page accurately."}`,
    caseSensitive: false,
    importRequestLimit: 100,
    listQueryLimit: 500,
    disableBotAccessLog: false,
    disableAutoBackup: false,
    notFoundRedirect: '',
    safeBrowsingDoh: '', // Set to DoH URL to enable auto-detection, e.g. https://family.cloudflare-dns.com/dns-query
    webhookUrl: '',
    webhookSecret: '',
    public: {
      mainDomain: process.env.NUXT_MAIN_DOMAIN || 'shaf.app',
      dashboardDomain: process.env.NUXT_DASHBOARD_DOMAIN || 'dash.shaf.app',
      defaultShortDomain: process.env.NUXT_DEFAULT_SHORT_DOMAIN || 'shaf.is',
      systemShortDomains: (process.env.NUXT_SYSTEM_SHORT_DOMAINS || 'shaf.is')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean),
      cfFallbackOrigin: process.env.NUXT_CF_FALLBACK_ORIGIN || 'cname.shaf.is',
      previewMode: '',
      slugDefaultLength: '6',
      kvBatchLimit: '50',
    },
  },
  routeRules: {
    '/dashboard': {
      redirect: '/dashboard/links',
    },
    '/api/**': {
      cors: process.env.NUXT_API_CORS === 'true',
    },
    '/_docs/**': {
      headers: { 'X-Robots-Tag': 'noindex, follow' },
    },
    '/sphere.bin': {
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    '/*.json': {
      headers: { 'Cache-Control': 'public, max-age=2592000, immutable' },
    },
    '/*.geojson': {
      headers: { 'Cache-Control': 'public, max-age=2592000, immutable' },
    },
  },
  experimental: {
    enforceModuleCompatibility: true,
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['vite/client'],
      },
    },
  },
  compatibilityDate: '2026-07-13',
  nitro: {
    preset: import.meta.env.CF_PAGES !== '1' ? 'cloudflare-module' : undefined,
    experimental: {
      openAPI: true,
    },
    openAPI: {
      production: 'runtime',
      meta: {
        title: 'Shaf API',
        description: 'A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.\n\n[Return to Shaf](/) · [Read the documentation](https://docs.sink.cool)',
      },
      route: '/_docs/openapi.json',
      ui: {
        scalar: {
          route: '/_docs/scalar',
        },
        swagger: {
          route: '/_docs/swagger',
        },
      },
    },
  },
  vite: {
    server: {
      allowedHosts: true,
    },
    plugins: [
      tailwindcss(),
    ],
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      include: [
        '@internationalized/date',
        '@lucide/vue',
        '@number-flow/vue',
        '@tanstack/vue-form',
        '@unovis/vue',
        '@vueuse/core',
        'class-variance-authority',
        'clsx',
        'd3-geo',
        'd3-scale',
        'nanoid',
        'qr-code-styling', // CJS
        'reka-ui',
        'reka-ui/date',
        'tailwind-merge',
        'twgl.js',
        'vaul-vue',
        'virtua/vue',
        'vue-sonner',
        'vue3-simple-icons',
        'zod',
      ],
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  i18n: {
    locales: currentLocales,
    compilation: {
      strictMessage: false,
      escapeHtml: true,
    },
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'sink_i18n_redirected',
      redirectOn: 'root',
    },
    baseUrl: '/',
    defaultLocale: 'en-US',
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './app/components/ui',
  },
})
