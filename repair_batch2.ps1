# Repair: fixes app/features/page.tsx (dropped <a tag) and all 7 JSON files
# (corrupted accented characters + BOM from the previous script's encoding bug).
# Every file below is written with [System.IO.File]::WriteAllText using explicit
# no-BOM UTF-8 -- the same method that has worked correctly every time so far.
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = "Stop"
$global:anyFail = $false

$fix_features = @'
"use client"

import { useLocale } from "@/lib/i18n/LocaleProvider"

export default function FeaturesPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">{t("features.title")}</h1>
        <p className="text-gray-300 text-lg mb-12">
          {t("features.subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Feature 1 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f1Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f1Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f1B1")}</li>
              <li>✓ {t("features.f1B2")}</li>
              <li>✓ {t("features.f1B3")}</li>
              <li>✓ {t("features.f1B4")}</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📸</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f2Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f2Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f2B1")}</li>
              <li>✓ {t("features.f2B2")}</li>
              <li>✓ {t("features.f2B3")}</li>
              <li>✓ {t("features.f2B4")}</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📈</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f3Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f3Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f3B1")}</li>
              <li>✓ {t("features.f3B2")}</li>
              <li>✓ {t("features.f3B3")}</li>
              <li>✓ {t("features.f3B4")}</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f4Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f4Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f4B1")}</li>
              <li>✓ {t("features.f4B2")}</li>
              <li>✓ {t("features.f4B3")}</li>
              <li>✓ {t("features.f4B4")}</li>
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8">{t("features.whyChoose")}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-3">{t("features.fastSetupTitle")}</h3>
              <p className="text-gray-300">
                {t("features.fastSetupDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-3">{t("features.secureTitle")}</h3>
              <p className="text-gray-300">
                {t("features.secureDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">{t("features.availableTitle")}</h3>
              <p className="text-gray-300">
                {t("features.availableDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0f172a] border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">{t("features.ctaTitle")}</h2>
          <p className="text-gray-300 mb-6">
            {t("features.ctaSubtitle")}
          </p>
          <a href="/pricing" className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition">
            {t("features.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  )
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/features/page.tsx"), $fix_features, (New-Object System.Text.UTF8Encoding($false)))
$c1 = Select-String -Path "app/features/page.tsx" -Pattern '<a href="/pricing"' -SimpleMatch
if ($c1) { Write-Host "OK   app/features/page.tsx (anchor tag restored)" -ForegroundColor Green } else { Write-Host "FAIL app/features/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

$json_en = @'
{
  "nav": {
    "dashboard": "Dashboard",
    "calendar": "Calendar",
    "debts": "Debts",
    "payoffPlan": "Payoff Plan",
    "bills": "Bills",
    "income": "Income",
    "goals": "Goals",
    "achievements": "Achievements",
    "insights": "Insights",
    "aiChat": "AI Chat",
    "account": "Account",
    "admin": "Admin",
    "gettingStarted": "Getting Started",
    "feedback": "Feedback",
    "signOut": "Sign out"
  },
  "selector": {
    "language": "Language",
    "currency": "Currency"
  },
  "home": {
    "heroPrefix": "Plan Every Paycheck. ",
    "heroHighlight": "Eliminate Debt",
    "heroSuffix": " Faster.",
    "heroSubtitle": "Take control of your financial future with AI-powered debt elimination strategies, real-time paycheck planning, and personalized financial insights.",
    "ctaStartFree": "Start Free",
    "ctaViewPlans": "View Plans",
    "statPayoffTitle": "Average Debt Payoff Time",
    "statPayoffDesc": "Users see results in as little as 24-36 months",
    "statAiTitle": "AI-Powered Strategy",
    "statAiDesc": "Machine learning analyzes your finances for optimal payoff",
    "statInsightsTitle": "Instant Insights",
    "statInsightsDesc": "Real-time dashboards and predictive analytics",
    "featuresHeading": "Powerful Features",
    "feature1Title": "Debt Payoff Calculator",
    "feature1Desc": "Multiple strategy comparison & timeline projection",
    "feature2Title": "Bill Tracking",
    "feature2Desc": "Never miss a payment with smart reminders",
    "feature3Title": "Financial Milestones",
    "feature3Desc": "Track your progress toward debt freedom",
    "feature4Title": "AI Insights",
    "feature4Desc": "Get personalized recommendations (Premium)",
    "feature5Title": "Advanced Analytics",
    "feature5Desc": "Deep financial forecasting & scenario planning",
    "feature6Title": "Snowball & Avalanche",
    "feature6Desc": "Compare multiple payoff strategies",
    "ctaHeading": "Ready to Take Control?",
    "ctaSubtitle": "Start free, upgrade anytime. Cancel whenever you want.",
    "ctaButton": "Get Started Free"
  },
  "login": {
    "welcomeBack": "Welcome Back",
    "welcomeBackSubtitle": "Take control of every paycheck, debt, and financial goal.",
    "continueWithGoogle": "Continue with Google",
    "or": "or",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password",
    "forgotPassword": "Forgot Password?",
    "logIn": "Log In",
    "loggingIn": "Logging in...",
    "noAccount": "Don't have an account?",
    "signUpFree": "Sign Up Free",
    "twoFactorTitle": "Two-factor verification",
    "twoFactorSubtitle": "Enter the 6-digit code from your authenticator app.",
    "verify": "Verify",
    "verifying": "Verifying...",
    "genericError": "An error occurred. Please try again.",
    "googleError": "An error occurred with Google sign-in. Please try again."
  },
  "signup": {
    "createAccount": "Create Account",
    "createAccountSubtitle": "Join thousands taking control of their finances",
    "agreeToTerms": "I agree to the",
    "termsOfService": "Terms of Service",
    "and": "and",
    "privacyPolicy": "Privacy Policy",
    "continueWithGoogle": "Continue with Google",
    "or": "or",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password (min 8 characters)",
    "confirmPasswordPlaceholder": "Confirm password",
    "signUpFree": "Sign Up Free",
    "creatingAccount": "Creating Account...",
    "alreadyHaveAccount": "Already have an account?",
    "logIn": "Log In",
    "errorAgreeTerms": "Please agree to the Terms of Service and Privacy Policy to continue.",
    "errorPasswordMismatch": "Passwords do not match",
    "errorPasswordLength": "Password must be at least 8 characters",
    "errorGeneric": "An error occurred. Please try again.",
    "errorGoogle": "An error occurred with Google sign-in. Please try again."
  },
  "features": {
    "title": "Powerful Features to Master Your Money",
    "subtitle": "Everything you need to eliminate debt, plan your finances, and achieve financial freedom.",
    "f1Title": "Debt Payoff Calculator",
    "f1Desc": "Compare Snowball and Avalanche debt payoff strategies side-by-side. See exactly how long it will take to become debt-free and how much interest you'll pay.",
    "f1B1": "Add unlimited debts",
    "f1B2": "Track interest rates",
    "f1B3": "Set extra payment amounts",
    "f1B4": "Export comparison reports",
    "f2Title": "Bill OCR & Upload",
    "f2Desc": "Take a photo of your bills and our AI automatically extracts vendor name, amount, and due date. Never manually enter bill information again.",
    "f2B1": "Snap photos of bills",
    "f2B2": "Automatic data extraction",
    "f2B3": "Confidence scoring",
    "f2B4": "Manual corrections available",
    "f3Title": "Financial Dashboard",
    "f3Desc": "See all your finances at a glance. Track debts, bills, assets, and net worth with beautiful charts and real-time calculations.",
    "f3B1": "Real-time metrics",
    "f3B2": "Multiple visualizations",
    "f3B3": "Debt-to-income ratio",
    "f3B4": "Net worth tracking",
    "f4Title": "AI Recommendations (Premium)",
    "f4Desc": "Get personalized financial advice powered by AI. Discover strategies to save money, optimize your debt payoff, and reach your goals faster.",
    "f4B1": "Smart suggestions",
    "f4B2": "Impact scoring",
    "f4B3": "Savings estimates",
    "f4B4": "Personalized strategies",
    "whyChoose": "Why Choose Paycheck Planner?",
    "fastSetupTitle": "⚡ Fast Setup",
    "fastSetupDesc": "Get started in minutes. No complicated forms or lengthy onboarding. Just enter your debts and get instant insights.",
    "secureTitle": "🔒 Secure & Private",
    "secureDesc": "Your financial data is encrypted and protected. We never share your information with third parties.",
    "availableTitle": "📱 Always Available",
    "availableDesc": "Access your finances anytime, anywhere. Fully responsive design works on mobile, tablet, and desktop.",
    "ctaTitle": "Ready to Take Control?",
    "ctaSubtitle": "Start with our Free plan and upgrade anytime to unlock premium features.",
    "ctaButton": "View Plans & Pricing"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/en.json"), $json_en, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_en = Get-Content -Path "lib/i18n/messages/en.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_en.login.welcomeBack -and $parsed_en.features.title -and $parsed_en.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/en.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/en.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/en.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_es = @'
{
  "nav": {
    "dashboard": "Panel",
    "calendar": "Calendario",
    "debts": "Deudas",
    "payoffPlan": "Plan de pago",
    "bills": "Facturas",
    "income": "Ingresos",
    "goals": "Metas",
    "achievements": "Logros",
    "insights": "Estadísticas",
    "aiChat": "Chat IA",
    "account": "Cuenta",
    "admin": "Administrador",
    "gettingStarted": "Primeros pasos",
    "feedback": "Comentarios",
    "signOut": "Cerrar sesión"
  },
  "selector": {
    "language": "Idioma",
    "currency": "Moneda"
  },
  "home": {
    "heroPrefix": "Planifica cada cheque. ",
    "heroHighlight": "Elimina tus deudas",
    "heroSuffix": " más rápido.",
    "heroSubtitle": "Toma el control de tu futuro financiero con estrategias de eliminación de deudas impulsadas por IA, planificación de cheques en tiempo real y estadísticas financieras personalizadas.",
    "ctaStartFree": "Comenzar gratis",
    "ctaViewPlans": "Ver planes",
    "statPayoffTitle": "Tiempo promedio para liquidar deudas",
    "statPayoffDesc": "Los usuarios ven resultados en tan solo 24-36 meses",
    "statAiTitle": "Estrategia con IA",
    "statAiDesc": "El aprendizaje automático analiza tus finanzas para el pago óptimo",
    "statInsightsTitle": "Estadísticas al instante",
    "statInsightsDesc": "Paneles en tiempo real y análisis predictivo",
    "featuresHeading": "Funciones potentes",
    "feature1Title": "Calculadora de pago de deudas",
    "feature1Desc": "Comparación de múltiples estrategias y proyección de plazos",
    "feature2Title": "Seguimiento de facturas",
    "feature2Desc": "Nunca te pierdas un pago con recordatorios inteligentes",
    "feature3Title": "Hitos financieros",
    "feature3Desc": "Sigue tu progreso hacia la libertad financiera",
    "feature4Title": "Estadísticas con IA",
    "feature4Desc": "Obtén recomendaciones personalizadas (Premium)",
    "feature5Title": "Análisis avanzado",
    "feature5Desc": "Proyecciones financieras profundas y planificación de escenarios",
    "feature6Title": "Bola de nieve y avalancha",
    "feature6Desc": "Compara múltiples estrategias de pago",
    "ctaHeading": "¿Listo para tomar el control?",
    "ctaSubtitle": "Comienza gratis, mejora cuando quieras. Cancela cuando quieras.",
    "ctaButton": "Empezar gratis"
  },
  "login": {
    "welcomeBack": "Bienvenido de nuevo",
    "welcomeBackSubtitle": "Toma el control de cada cheque, deuda y meta financiera.",
    "continueWithGoogle": "Continuar con Google",
    "or": "o",
    "emailPlaceholder": "Correo electrónico",
    "passwordPlaceholder": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "logIn": "Iniciar sesión",
    "loggingIn": "Iniciando sesión...",
    "noAccount": "¿No tienes una cuenta?",
    "signUpFree": "Regístrate gratis",
    "twoFactorTitle": "Verificación en dos pasos",
    "twoFactorSubtitle": "Ingresa el código de 6 dígitos de tu app de autenticación.",
    "verify": "Verificar",
    "verifying": "Verificando...",
    "genericError": "Ocurrió un error. Inténtalo de nuevo.",
    "googleError": "Ocurrió un error al iniciar sesión con Google. Inténtalo de nuevo."
  },
  "signup": {
    "createAccount": "Crear cuenta",
    "createAccountSubtitle": "Únete a miles de personas que ya controlan sus finanzas",
    "agreeToTerms": "Acepto los",
    "termsOfService": "Términos de servicio",
    "and": "y",
    "privacyPolicy": "Política de privacidad",
    "continueWithGoogle": "Continuar con Google",
    "or": "o",
    "emailPlaceholder": "Correo electrónico",
    "passwordPlaceholder": "Contraseña (mín. 8 caracteres)",
    "confirmPasswordPlaceholder": "Confirmar contraseña",
    "signUpFree": "Regístrate gratis",
    "creatingAccount": "Creando cuenta...",
    "alreadyHaveAccount": "¿Ya tienes una cuenta?",
    "logIn": "Iniciar sesión",
    "errorAgreeTerms": "Acepta los Términos de servicio y la Política de privacidad para continuar.",
    "errorPasswordMismatch": "Las contraseñas no coinciden",
    "errorPasswordLength": "La contraseña debe tener al menos 8 caracteres",
    "errorGeneric": "Ocurrió un error. Inténtalo de nuevo.",
    "errorGoogle": "Ocurrió un error al registrarte con Google. Inténtalo de nuevo."
  },
  "features": {
    "title": "Funciones potentes para dominar tu dinero",
    "subtitle": "Todo lo que necesitas para eliminar deudas, planificar tus finanzas y alcanzar la libertad financiera.",
    "f1Title": "Calculadora de pago de deudas",
    "f1Desc": "Compara las estrategias de pago Bola de Nieve y Avalancha una junto a la otra. Descubre exactamente cuánto tardarás en liberarte de deudas y cuánto interés pagarás.",
    "f1B1": "Agrega deudas ilimitadas",
    "f1B2": "Rastrea tasas de interés",
    "f1B3": "Define pagos adicionales",
    "f1B4": "Exporta informes comparativos",
    "f2Title": "OCR y carga de facturas",
    "f2Desc": "Toma una foto de tus facturas y nuestra IA extrae automáticamente el proveedor, el monto y la fecha de vencimiento. Nunca más ingreses datos manualmente.",
    "f2B1": "Toma fotos de facturas",
    "f2B2": "Extracción automática de datos",
    "f2B3": "Puntuación de confianza",
    "f2B4": "Correcciones manuales disponibles",
    "f3Title": "Panel financiero",
    "f3Desc": "Ve todas tus finanzas de un vistazo. Rastrea deudas, facturas, activos y patrimonio neto con gráficos atractivos y cálculos en tiempo real.",
    "f3B1": "Métricas en tiempo real",
    "f3B2": "Múltiples visualizaciones",
    "f3B3": "Relación deuda-ingresos",
    "f3B4": "Seguimiento del patrimonio neto",
    "f4Title": "Recomendaciones con IA (Premium)",
    "f4Desc": "Recibe consejos financieros personalizados impulsados por IA. Descubre estrategias para ahorrar dinero, optimizar el pago de deudas y alcanzar tus metas más rápido.",
    "f4B1": "Sugerencias inteligentes",
    "f4B2": "Puntuación de impacto",
    "f4B3": "Estimaciones de ahorro",
    "f4B4": "Estrategias personalizadas",
    "whyChoose": "¿Por qué elegir Paycheck Planner?",
    "fastSetupTitle": "⚡ Configuración rápida",
    "fastSetupDesc": "Comienza en minutos. Sin formularios complicados ni procesos largos. Solo ingresa tus deudas y obtén información al instante.",
    "secureTitle": "🔒 Seguro y privado",
    "secureDesc": "Tus datos financieros están cifrados y protegidos. Nunca compartimos tu información con terceros.",
    "availableTitle": "📱 Siempre disponible",
    "availableDesc": "Accede a tus finanzas en cualquier momento y lugar. Diseño totalmente adaptable en móvil, tablet y escritorio.",
    "ctaTitle": "¿Listo para tomar el control?",
    "ctaSubtitle": "Comienza con nuestro plan gratuito y mejora cuando quieras para desbloquear funciones premium.",
    "ctaButton": "Ver planes y precios"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/es.json"), $json_es, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_es = Get-Content -Path "lib/i18n/messages/es.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_es.login.welcomeBack -and $parsed_es.features.title -and $parsed_es.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/es.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/es.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/es.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_fr = @'
{
  "nav": {
    "dashboard": "Tableau de bord",
    "calendar": "Calendrier",
    "debts": "Dettes",
    "payoffPlan": "Plan de remboursement",
    "bills": "Factures",
    "income": "Revenus",
    "goals": "Objectifs",
    "achievements": "Récompenses",
    "insights": "Aperçus",
    "aiChat": "Chat IA",
    "account": "Compte",
    "admin": "Administrateur",
    "gettingStarted": "Premiers pas",
    "feedback": "Commentaires",
    "signOut": "Déconnexion"
  },
  "selector": {
    "language": "Langue",
    "currency": "Devise"
  },
  "home": {
    "heroPrefix": "Planifiez chaque paie. ",
    "heroHighlight": "Éliminez vos dettes",
    "heroSuffix": " plus vite.",
    "heroSubtitle": "Prenez le contrôle de votre avenir financier grâce à des stratégies d'élimination des dettes basées sur l'IA, une planification de paie en temps réel et des analyses financières personnalisées.",
    "ctaStartFree": "Commencer gratuitement",
    "ctaViewPlans": "Voir les offres",
    "statPayoffTitle": "Délai moyen de remboursement",
    "statPayoffDesc": "Les utilisateurs voient des résultats en seulement 24 à 36 mois",
    "statAiTitle": "Stratégie basée sur l'IA",
    "statAiDesc": "L'apprentissage automatique analyse vos finances pour un remboursement optimal",
    "statInsightsTitle": "Analyses instantanées",
    "statInsightsDesc": "Tableaux de bord en temps réel et analyses prédictives",
    "featuresHeading": "Fonctionnalités puissantes",
    "feature1Title": "Calculateur de remboursement",
    "feature1Desc": "Comparaison de plusieurs stratégies et projection du calendrier",
    "feature2Title": "Suivi des factures",
    "feature2Desc": "Ne manquez jamais un paiement grâce aux rappels intelligents",
    "feature3Title": "Étapes financières",
    "feature3Desc": "Suivez votre progression vers la liberté financière",
    "feature4Title": "Analyses IA",
    "feature4Desc": "Obtenez des recommandations personnalisées (Premium)",
    "feature5Title": "Analyses avancées",
    "feature5Desc": "Prévisions financières approfondies et planification de scénarios",
    "feature6Title": "Boule de neige et avalanche",
    "feature6Desc": "Comparez plusieurs stratégies de remboursement",
    "ctaHeading": "Prêt à prendre le contrôle ?",
    "ctaSubtitle": "Commencez gratuitement, mettez à niveau à tout moment. Annulez quand vous voulez.",
    "ctaButton": "Commencer gratuitement"
  },
  "login": {
    "welcomeBack": "Bon retour",
    "welcomeBackSubtitle": "Prenez le contrôle de chaque paie, dette et objectif financier.",
    "continueWithGoogle": "Continuer avec Google",
    "or": "ou",
    "emailPlaceholder": "Adresse e-mail",
    "passwordPlaceholder": "Mot de passe",
    "forgotPassword": "Mot de passe oublié ?",
    "logIn": "Se connecter",
    "loggingIn": "Connexion en cours...",
    "noAccount": "Vous n'avez pas de compte ?",
    "signUpFree": "S'inscrire gratuitement",
    "twoFactorTitle": "Vérification en deux étapes",
    "twoFactorSubtitle": "Entrez le code à 6 chiffres de votre application d'authentification.",
    "verify": "Vérifier",
    "verifying": "Vérification...",
    "genericError": "Une erreur s'est produite. Veuillez réessayer.",
    "googleError": "Une erreur s'est produite avec la connexion Google. Veuillez réessayer."
  },
  "signup": {
    "createAccount": "Créer un compte",
    "createAccountSubtitle": "Rejoignez des milliers de personnes qui contrôlent leurs finances",
    "agreeToTerms": "J'accepte les",
    "termsOfService": "Conditions d'utilisation",
    "and": "et",
    "privacyPolicy": "Politique de confidentialité",
    "continueWithGoogle": "Continuer avec Google",
    "or": "ou",
    "emailPlaceholder": "Adresse e-mail",
    "passwordPlaceholder": "Mot de passe (min. 8 caractères)",
    "confirmPasswordPlaceholder": "Confirmer le mot de passe",
    "signUpFree": "S'inscrire gratuitement",
    "creatingAccount": "Création du compte...",
    "alreadyHaveAccount": "Vous avez déjà un compte ?",
    "logIn": "Se connecter",
    "errorAgreeTerms": "Veuillez accepter les Conditions d'utilisation et la Politique de confidentialité pour continuer.",
    "errorPasswordMismatch": "Les mots de passe ne correspondent pas",
    "errorPasswordLength": "Le mot de passe doit contenir au moins 8 caractères",
    "errorGeneric": "Une erreur s'est produite. Veuillez réessayer.",
    "errorGoogle": "Une erreur s'est produite avec l'inscription Google. Veuillez réessayer."
  },
  "features": {
    "title": "Des fonctionnalités puissantes pour maîtriser votre argent",
    "subtitle": "Tout ce dont vous avez besoin pour éliminer vos dettes, planifier vos finances et atteindre la liberté financière.",
    "f1Title": "Calculateur de remboursement de dettes",
    "f1Desc": "Comparez les stratégies Boule de neige et Avalanche côte à côte. Découvrez exactement combien de temps il vous faudra pour être libéré de vos dettes et combien d'intérêts vous paierez.",
    "f1B1": "Ajoutez un nombre illimité de dettes",
    "f1B2": "Suivez les taux d'intérêt",
    "f1B3": "Définissez des paiements supplémentaires",
    "f1B4": "Exportez des rapports comparatifs",
    "f2Title": "OCR et téléversement de factures",
    "f2Desc": "Prenez une photo de vos factures et notre IA extrait automatiquement le fournisseur, le montant et la date d'échéance. Ne saisissez plus jamais les informations manuellement.",
    "f2B1": "Photographiez vos factures",
    "f2B2": "Extraction automatique des données",
    "f2B3": "Score de confiance",
    "f2B4": "Corrections manuelles disponibles",
    "f3Title": "Tableau de bord financier",
    "f3Desc": "Visualisez toutes vos finances en un coup d'œil. Suivez vos dettes, factures, actifs et valeur nette avec de beaux graphiques et des calculs en temps réel.",
    "f3B1": "Indicateurs en temps réel",
    "f3B2": "Visualisations multiples",
    "f3B3": "Ratio dette/revenu",
    "f3B4": "Suivi de la valeur nette",
    "f4Title": "Recommandations IA (Premium)",
    "f4Desc": "Recevez des conseils financiers personnalisés grâce à l'IA. Découvrez des stratégies pour économiser, optimiser le remboursement de vos dettes et atteindre vos objectifs plus vite.",
    "f4B1": "Suggestions intelligentes",
    "f4B2": "Score d'impact",
    "f4B3": "Estimations d'économies",
    "f4B4": "Stratégies personnalisées",
    "whyChoose": "Pourquoi choisir Paycheck Planner ?",
    "fastSetupTitle": "⚡ Configuration rapide",
    "fastSetupDesc": "Démarrez en quelques minutes. Pas de formulaires compliqués ni d'intégration longue. Entrez simplement vos dettes et obtenez des informations instantanées.",
    "secureTitle": "🔒 Sécurisé et privé",
    "secureDesc": "Vos données financières sont chiffrées et protégées. Nous ne partageons jamais vos informations avec des tiers.",
    "availableTitle": "📱 Toujours disponible",
    "availableDesc": "Accédez à vos finances à tout moment, où que vous soyez. Design entièrement responsive sur mobile, tablette et ordinateur.",
    "ctaTitle": "Prêt à prendre le contrôle ?",
    "ctaSubtitle": "Commencez avec notre offre gratuite et mettez à niveau à tout moment pour débloquer les fonctionnalités premium.",
    "ctaButton": "Voir les offres et tarifs"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/fr.json"), $json_fr, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_fr = Get-Content -Path "lib/i18n/messages/fr.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_fr.login.welcomeBack -and $parsed_fr.features.title -and $parsed_fr.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/fr.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/fr.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/fr.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_de = @'
{
  "nav": {
    "dashboard": "Übersicht",
    "calendar": "Kalender",
    "debts": "Schulden",
    "payoffPlan": "Tilgungsplan",
    "bills": "Rechnungen",
    "income": "Einkommen",
    "goals": "Ziele",
    "achievements": "Erfolge",
    "insights": "Einblicke",
    "aiChat": "KI-Chat",
    "account": "Konto",
    "admin": "Administrator",
    "gettingStarted": "Erste Schritte",
    "feedback": "Feedback",
    "signOut": "Abmelden"
  },
  "selector": {
    "language": "Sprache",
    "currency": "Währung"
  },
  "home": {
    "heroPrefix": "Planen Sie jeden Gehaltsscheck. ",
    "heroHighlight": "Schulden schneller",
    "heroSuffix": " abbauen.",
    "heroSubtitle": "Übernehmen Sie die Kontrolle über Ihre finanzielle Zukunft mit KI-gestützten Strategien zum Schuldenabbau, Echtzeit-Gehaltsplanung und personalisierten finanziellen Einblicken.",
    "ctaStartFree": "Kostenlos starten",
    "ctaViewPlans": "Pläne ansehen",
    "statPayoffTitle": "Durchschnittliche Tilgungsdauer",
    "statPayoffDesc": "Nutzer sehen Ergebnisse bereits nach 24-36 Monaten",
    "statAiTitle": "KI-gestützte Strategie",
    "statAiDesc": "Maschinelles Lernen analysiert Ihre Finanzen für die optimale Tilgung",
    "statInsightsTitle": "Sofortige Einblicke",
    "statInsightsDesc": "Echtzeit-Dashboards und vorausschauende Analysen",
    "featuresHeading": "Leistungsstarke Funktionen",
    "feature1Title": "Tilgungsrechner",
    "feature1Desc": "Vergleich mehrerer Strategien und Zeitplanprognose",
    "feature2Title": "Rechnungsverfolgung",
    "feature2Desc": "Verpassen Sie nie eine Zahlung dank intelligenter Erinnerungen",
    "feature3Title": "Finanzielle Meilensteine",
    "feature3Desc": "Verfolgen Sie Ihren Fortschritt zur Schuldenfreiheit",
    "feature4Title": "KI-Einblicke",
    "feature4Desc": "Erhalten Sie personalisierte Empfehlungen (Premium)",
    "feature5Title": "Erweiterte Analysen",
    "feature5Desc": "Detaillierte Finanzprognosen und Szenarioplanung",
    "feature6Title": "Schneeball & Lawine",
    "feature6Desc": "Vergleichen Sie mehrere Tilgungsstrategien",
    "ctaHeading": "Bereit, die Kontrolle zu übernehmen?",
    "ctaSubtitle": "Kostenlos starten, jederzeit upgraden. Jederzeit kündbar.",
    "ctaButton": "Kostenlos loslegen"
  },
  "login": {
    "welcomeBack": "Willkommen zurück",
    "welcomeBackSubtitle": "Übernehmen Sie die Kontrolle über jeden Gehaltsscheck, jede Schuld und jedes finanzielle Ziel.",
    "continueWithGoogle": "Mit Google fortfahren",
    "or": "oder",
    "emailPlaceholder": "E-Mail-Adresse",
    "passwordPlaceholder": "Passwort",
    "forgotPassword": "Passwort vergessen?",
    "logIn": "Anmelden",
    "loggingIn": "Anmeldung läuft...",
    "noAccount": "Noch kein Konto?",
    "signUpFree": "Kostenlos registrieren",
    "twoFactorTitle": "Zwei-Faktor-Verifizierung",
    "twoFactorSubtitle": "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.",
    "verify": "Verifizieren",
    "verifying": "Wird überprüft...",
    "genericError": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    "googleError": "Bei der Google-Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
  },
  "signup": {
    "createAccount": "Konto erstellen",
    "createAccountSubtitle": "Schließen Sie sich Tausenden an, die ihre Finanzen im Griff haben",
    "agreeToTerms": "Ich stimme den",
    "termsOfService": "Nutzungsbedingungen",
    "and": "und der",
    "privacyPolicy": "Datenschutzrichtlinie",
    "continueWithGoogle": "Mit Google fortfahren",
    "or": "oder",
    "emailPlaceholder": "E-Mail-Adresse",
    "passwordPlaceholder": "Passwort (mind. 8 Zeichen)",
    "confirmPasswordPlaceholder": "Passwort bestätigen",
    "signUpFree": "Kostenlos registrieren",
    "creatingAccount": "Konto wird erstellt...",
    "alreadyHaveAccount": "Bereits ein Konto?",
    "logIn": "Anmelden",
    "errorAgreeTerms": "Bitte stimmen Sie den Nutzungsbedingungen und der Datenschutzrichtlinie zu, um fortzufahren.",
    "errorPasswordMismatch": "Die Passwörter stimmen nicht überein",
    "errorPasswordLength": "Das Passwort muss mindestens 8 Zeichen lang sein",
    "errorGeneric": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    "errorGoogle": "Bei der Google-Registrierung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
  },
  "features": {
    "title": "Leistungsstarke Funktionen für Ihre Finanzen",
    "subtitle": "Alles, was Sie brauchen, um Schulden abzubauen, Ihre Finanzen zu planen und finanzielle Freiheit zu erreichen.",
    "f1Title": "Tilgungsrechner",
    "f1Desc": "Vergleichen Sie die Schneeball- und Lawinen-Tilgungsstrategien direkt nebeneinander. Sehen Sie genau, wie lange es dauert, schuldenfrei zu werden und wie viel Zinsen Sie zahlen.",
    "f1B1": "Unbegrenzt Schulden hinzufügen",
    "f1B2": "Zinssätze verfolgen",
    "f1B3": "Zusatzzahlungen festlegen",
    "f1B4": "Vergleichsberichte exportieren",
    "f2Title": "Rechnungs-OCR & Upload",
    "f2Desc": "Fotografieren Sie Ihre Rechnungen, und unsere KI extrahiert automatisch Anbieter, Betrag und Fälligkeitsdatum. Nie wieder manuelle Eingabe.",
    "f2B1": "Rechnungen fotografieren",
    "f2B2": "Automatische Datenextraktion",
    "f2B3": "Konfidenzbewertung",
    "f2B4": "Manuelle Korrekturen möglich",
    "f3Title": "Finanz-Dashboard",
    "f3Desc": "Sehen Sie Ihre gesamten Finanzen auf einen Blick. Verfolgen Sie Schulden, Rechnungen, Vermögenswerte und Nettovermögen mit übersichtlichen Diagrammen und Echtzeitberechnungen.",
    "f3B1": "Echtzeit-Kennzahlen",
    "f3B2": "Mehrere Visualisierungen",
    "f3B3": "Schulden-Einkommens-Verhältnis",
    "f3B4": "Nettovermögensverfolgung",
    "f4Title": "KI-Empfehlungen (Premium)",
    "f4Desc": "Erhalten Sie personalisierte Finanzberatung durch KI. Entdecken Sie Strategien, um Geld zu sparen, Ihre Tilgung zu optimieren und Ihre Ziele schneller zu erreichen.",
    "f4B1": "Intelligente Vorschläge",
    "f4B2": "Wirkungsbewertung",
    "f4B3": "Ersparnisschätzungen",
    "f4B4": "Personalisierte Strategien",
    "whyChoose": "Warum Paycheck Planner wählen?",
    "fastSetupTitle": "⚡ Schnelle Einrichtung",
    "fastSetupDesc": "Starten Sie in wenigen Minuten. Keine komplizierten Formulare oder langwierige Einführung. Geben Sie einfach Ihre Schulden ein und erhalten Sie sofort Einblicke.",
    "secureTitle": "🔒 Sicher & privat",
    "secureDesc": "Ihre Finanzdaten sind verschlüsselt und geschützt. Wir geben Ihre Informationen niemals an Dritte weiter.",
    "availableTitle": "📱 Immer verfügbar",
    "availableDesc": "Greifen Sie jederzeit und überall auf Ihre Finanzen zu. Vollständig responsives Design für Mobilgerät, Tablet und Desktop.",
    "ctaTitle": "Bereit, die Kontrolle zu übernehmen?",
    "ctaSubtitle": "Starten Sie mit unserem kostenlosen Plan und upgraden Sie jederzeit, um Premium-Funktionen freizuschalten.",
    "ctaButton": "Pläne & Preise ansehen"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/de.json"), $json_de, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_de = Get-Content -Path "lib/i18n/messages/de.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_de.login.welcomeBack -and $parsed_de.features.title -and $parsed_de.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/de.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/de.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/de.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_it = @'
{
  "nav": {
    "dashboard": "Pannello",
    "calendar": "Calendario",
    "debts": "Debiti",
    "payoffPlan": "Piano di rimborso",
    "bills": "Bollette",
    "income": "Entrate",
    "goals": "Obiettivi",
    "achievements": "Traguardi",
    "insights": "Approfondimenti",
    "aiChat": "Chat IA",
    "account": "Account",
    "admin": "Amministratore",
    "gettingStarted": "Per iniziare",
    "feedback": "Feedback",
    "signOut": "Esci"
  },
  "selector": {
    "language": "Lingua",
    "currency": "Valuta"
  },
  "home": {
    "heroPrefix": "Pianifica ogni stipendio. ",
    "heroHighlight": "Elimina i debiti",
    "heroSuffix": " più velocemente.",
    "heroSubtitle": "Prendi il controllo del tuo futuro finanziario con strategie di eliminazione del debito basate sull'IA, pianificazione dello stipendio in tempo reale e approfondimenti finanziari personalizzati.",
    "ctaStartFree": "Inizia gratis",
    "ctaViewPlans": "Vedi i piani",
    "statPayoffTitle": "Tempo medio di estinzione del debito",
    "statPayoffDesc": "Gli utenti vedono risultati in appena 24-36 mesi",
    "statAiTitle": "Strategia basata sull'IA",
    "statAiDesc": "Il machine learning analizza le tue finanze per il rimborso ottimale",
    "statInsightsTitle": "Approfondimenti istantanei",
    "statInsightsDesc": "Dashboard in tempo reale e analisi predittiva",
    "featuresHeading": "Funzionalità potenti",
    "feature1Title": "Calcolatore di estinzione debiti",
    "feature1Desc": "Confronto tra più strategie e proiezione dei tempi",
    "feature2Title": "Monitoraggio bollette",
    "feature2Desc": "Non perdere mai un pagamento grazie ai promemoria intelligenti",
    "feature3Title": "Traguardi finanziari",
    "feature3Desc": "Monitora i tuoi progressi verso la libertà finanziaria",
    "feature4Title": "Approfondimenti IA",
    "feature4Desc": "Ricevi consigli personalizzati (Premium)",
    "feature5Title": "Analisi avanzate",
    "feature5Desc": "Previsioni finanziarie approfondite e pianificazione di scenari",
    "feature6Title": "Valanga e palla di neve",
    "feature6Desc": "Confronta più strategie di rimborso",
    "ctaHeading": "Pronto a prendere il controllo?",
    "ctaSubtitle": "Inizia gratis, aggiorna quando vuoi. Annulla quando vuoi.",
    "ctaButton": "Inizia gratis"
  },
  "login": {
    "welcomeBack": "Bentornato",
    "welcomeBackSubtitle": "Prendi il controllo di ogni stipendio, debito e obiettivo finanziario.",
    "continueWithGoogle": "Continua con Google",
    "or": "oppure",
    "emailPlaceholder": "Indirizzo email",
    "passwordPlaceholder": "Password",
    "forgotPassword": "Password dimenticata?",
    "logIn": "Accedi",
    "loggingIn": "Accesso in corso...",
    "noAccount": "Non hai un account?",
    "signUpFree": "Iscriviti gratis",
    "twoFactorTitle": "Verifica in due passaggi",
    "twoFactorSubtitle": "Inserisci il codice a 6 cifre dalla tua app di autenticazione.",
    "verify": "Verifica",
    "verifying": "Verifica in corso...",
    "genericError": "Si è verificato un errore. Riprova.",
    "googleError": "Si è verificato un errore con l'accesso Google. Riprova."
  },
  "signup": {
    "createAccount": "Crea account",
    "createAccountSubtitle": "Unisciti a migliaia di persone che gestiscono le proprie finanze",
    "agreeToTerms": "Accetto i",
    "termsOfService": "Termini di servizio",
    "and": "e la",
    "privacyPolicy": "Informativa sulla privacy",
    "continueWithGoogle": "Continua con Google",
    "or": "oppure",
    "emailPlaceholder": "Indirizzo email",
    "passwordPlaceholder": "Password (min. 8 caratteri)",
    "confirmPasswordPlaceholder": "Conferma password",
    "signUpFree": "Iscriviti gratis",
    "creatingAccount": "Creazione account...",
    "alreadyHaveAccount": "Hai già un account?",
    "logIn": "Accedi",
    "errorAgreeTerms": "Accetta i Termini di servizio e l'Informativa sulla privacy per continuare.",
    "errorPasswordMismatch": "Le password non corrispondono",
    "errorPasswordLength": "La password deve contenere almeno 8 caratteri",
    "errorGeneric": "Si è verificato un errore. Riprova.",
    "errorGoogle": "Si è verificato un errore con la registrazione Google. Riprova."
  },
  "features": {
    "title": "Funzionalità potenti per gestire il tuo denaro",
    "subtitle": "Tutto ciò di cui hai bisogno per eliminare i debiti, pianificare le tue finanze e raggiungere la libertà finanziaria.",
    "f1Title": "Calcolatore di estinzione debiti",
    "f1Desc": "Confronta le strategie Palla di neve e Valanga fianco a fianco. Scopri esattamente quanto tempo ci vorrà per essere libero dai debiti e quanti interessi pagherai.",
    "f1B1": "Aggiungi debiti illimitati",
    "f1B2": "Monitora i tassi di interesse",
    "f1B3": "Imposta pagamenti extra",
    "f1B4": "Esporta report di confronto",
    "f2Title": "OCR e caricamento bollette",
    "f2Desc": "Scatta una foto delle tue bollette e la nostra IA estrae automaticamente fornitore, importo e scadenza. Non inserire mai più i dati manualmente.",
    "f2B1": "Fotografa le bollette",
    "f2B2": "Estrazione automatica dei dati",
    "f2B3": "Punteggio di affidabilità",
    "f2B4": "Correzioni manuali disponibili",
    "f3Title": "Dashboard finanziaria",
    "f3Desc": "Visualizza tutte le tue finanze in un colpo d'occhio. Monitora debiti, bollette, patrimonio e valore netto con grafici chiari e calcoli in tempo reale.",
    "f3B1": "Metriche in tempo reale",
    "f3B2": "Visualizzazioni multiple",
    "f3B3": "Rapporto debito/reddito",
    "f3B4": "Monitoraggio del valore netto",
    "f4Title": "Raccomandazioni IA (Premium)",
    "f4Desc": "Ricevi consigli finanziari personalizzati basati sull'IA. Scopri strategie per risparmiare, ottimizzare l'estinzione dei debiti e raggiungere i tuoi obiettivi più velocemente.",
    "f4B1": "Suggerimenti intelligenti",
    "f4B2": "Punteggio d'impatto",
    "f4B3": "Stime di risparmio",
    "f4B4": "Strategie personalizzate",
    "whyChoose": "Perché scegliere Paycheck Planner?",
    "fastSetupTitle": "⚡ Configurazione rapida",
    "fastSetupDesc": "Inizia in pochi minuti. Nessun modulo complicato né onboarding lungo. Inserisci semplicemente i tuoi debiti e ottieni informazioni immediate.",
    "secureTitle": "🔒 Sicuro e privato",
    "secureDesc": "I tuoi dati finanziari sono crittografati e protetti. Non condividiamo mai le tue informazioni con terze parti.",
    "availableTitle": "📱 Sempre disponibile",
    "availableDesc": "Accedi alle tue finanze in qualsiasi momento e ovunque. Design completamente responsive su mobile, tablet e desktop.",
    "ctaTitle": "Pronto a prendere il controllo?",
    "ctaSubtitle": "Inizia con il nostro piano gratuito e aggiorna quando vuoi per sbloccare le funzionalità premium.",
    "ctaButton": "Vedi piani e prezzi"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/it.json"), $json_it, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_it = Get-Content -Path "lib/i18n/messages/it.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_it.login.welcomeBack -and $parsed_it.features.title -and $parsed_it.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/it.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/it.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/it.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_pl = @'
{
  "nav": {
    "dashboard": "Panel",
    "calendar": "Kalendarz",
    "debts": "Długi",
    "payoffPlan": "Plan spłaty",
    "bills": "Rachunki",
    "income": "Dochody",
    "goals": "Cele",
    "achievements": "Osiągnięcia",
    "insights": "Analizy",
    "aiChat": "Czat AI",
    "account": "Konto",
    "admin": "Administrator",
    "gettingStarted": "Pierwsze kroki",
    "feedback": "Opinie",
    "signOut": "Wyloguj się"
  },
  "selector": {
    "language": "Język",
    "currency": "Waluta"
  },
  "home": {
    "heroPrefix": "Planuj każdą wypłatę. ",
    "heroHighlight": "Szybciej spłacaj długi",
    "heroSuffix": ".",
    "heroSubtitle": "Przejmij kontrolę nad swoją finansową przyszłością dzięki strategiom spłaty długów wspieranym przez AI, planowaniu wypłat w czasie rzeczywistym i spersonalizowanym analizom finansowym.",
    "ctaStartFree": "Zacznij za darmo",
    "ctaViewPlans": "Zobacz plany",
    "statPayoffTitle": "Średni czas spłaty długu",
    "statPayoffDesc": "Użytkownicy widzą efekty już po 24-36 miesiącach",
    "statAiTitle": "Strategia oparta na AI",
    "statAiDesc": "Uczenie maszynowe analizuje Twoje finanse pod kątem optymalnej spłaty",
    "statInsightsTitle": "Natychmiastowe analizy",
    "statInsightsDesc": "Panele w czasie rzeczywistym i analiza predykcyjna",
    "featuresHeading": "Zaawansowane funkcje",
    "feature1Title": "Kalkulator spłaty długu",
    "feature1Desc": "Porównanie wielu strategii i prognoza harmonogramu",
    "feature2Title": "Śledzenie rachunków",
    "feature2Desc": "Nigdy nie przegap płatności dzięki inteligentnym przypomnieniom",
    "feature3Title": "Kamienie milowe finansów",
    "feature3Desc": "Śledź swoje postępy w drodze do wolności finansowej",
    "feature4Title": "Analizy AI",
    "feature4Desc": "Otrzymuj spersonalizowane rekomendacje (Premium)",
    "feature5Title": "Zaawansowana analityka",
    "feature5Desc": "Dogłębne prognozy finansowe i planowanie scenariuszy",
    "feature6Title": "Metoda kuli śnieżnej i lawiny",
    "feature6Desc": "Porównaj wiele strategii spłaty",
    "ctaHeading": "Gotowy przejąć kontrolę?",
    "ctaSubtitle": "Zacznij za darmo, ulepszaj w dowolnym momencie. Anuluj, kiedy chcesz.",
    "ctaButton": "Zacznij za darmo"
  },
  "login": {
    "welcomeBack": "Witaj ponownie",
    "welcomeBackSubtitle": "Przejmij kontrolę nad każdą wypłatą, długiem i celem finansowym.",
    "continueWithGoogle": "Kontynuuj z Google",
    "or": "lub",
    "emailPlaceholder": "Adres e-mail",
    "passwordPlaceholder": "Hasło",
    "forgotPassword": "Nie pamiętasz hasła?",
    "logIn": "Zaloguj się",
    "loggingIn": "Logowanie...",
    "noAccount": "Nie masz konta?",
    "signUpFree": "Zarejestruj się za darmo",
    "twoFactorTitle": "Weryfikacja dwuetapowa",
    "twoFactorSubtitle": "Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej.",
    "verify": "Zweryfikuj",
    "verifying": "Weryfikowanie...",
    "genericError": "Wystąpił błąd. Spróbuj ponownie.",
    "googleError": "Wystąpił błąd podczas logowania przez Google. Spróbuj ponownie."
  },
  "signup": {
    "createAccount": "Utwórz konto",
    "createAccountSubtitle": "Dołącz do tysięcy osób panujących nad swoimi finansami",
    "agreeToTerms": "Akceptuję",
    "termsOfService": "Warunki korzystania z usługi",
    "and": "oraz",
    "privacyPolicy": "Politykę prywatności",
    "continueWithGoogle": "Kontynuuj z Google",
    "or": "lub",
    "emailPlaceholder": "Adres e-mail",
    "passwordPlaceholder": "Hasło (min. 8 znaków)",
    "confirmPasswordPlaceholder": "Potwierdź hasło",
    "signUpFree": "Zarejestruj się za darmo",
    "creatingAccount": "Tworzenie konta...",
    "alreadyHaveAccount": "Masz już konto?",
    "logIn": "Zaloguj się",
    "errorAgreeTerms": "Zaakceptuj Warunki korzystania z usługi i Politykę prywatności, aby kontynuować.",
    "errorPasswordMismatch": "Hasła nie są zgodne",
    "errorPasswordLength": "Hasło musi mieć co najmniej 8 znaków",
    "errorGeneric": "Wystąpił błąd. Spróbuj ponownie.",
    "errorGoogle": "Wystąpił błąd podczas rejestracji przez Google. Spróbuj ponownie."
  },
  "features": {
    "title": "Zaawansowane funkcje, by zapanować nad pieniędzmi",
    "subtitle": "Wszystko, czego potrzebujesz, aby spłacić długi, zaplanować finanse i osiągnąć wolność finansową.",
    "f1Title": "Kalkulator spłaty długu",
    "f1Desc": "Porównaj strategie Kuli śnieżnej i Lawiny obok siebie. Zobacz dokładnie, ile czasu zajmie uwolnienie się od długów i ile zapłacisz odsetek.",
    "f1B1": "Dodawaj nieograniczoną liczbę długów",
    "f1B2": "Śledź oprocentowanie",
    "f1B3": "Ustaw dodatkowe wpłaty",
    "f1B4": "Eksportuj raporty porównawcze",
    "f2Title": "OCR i wgrywanie rachunków",
    "f2Desc": "Zrób zdjęcie rachunku, a nasza AI automatycznie wyciągnie dostawcę, kwotę i termin płatności. Nigdy więcej ręcznego wpisywania danych.",
    "f2B1": "Fotografuj rachunki",
    "f2B2": "Automatyczne wyciąganie danych",
    "f2B3": "Ocena pewności",
    "f2B4": "Dostępne ręczne poprawki",
    "f3Title": "Panel finansowy",
    "f3Desc": "Zobacz wszystkie swoje finanse na jednym ekranie. Śledź długi, rachunki, aktywa i wartość netto dzięki czytelnym wykresom i obliczeniom w czasie rzeczywistym.",
    "f3B1": "Wskaźniki w czasie rzeczywistym",
    "f3B2": "Wiele wizualizacji",
    "f3B3": "Stosunek długu do dochodu",
    "f3B4": "Śledzenie wartości netto",
    "f4Title": "Rekomendacje AI (Premium)",
    "f4Desc": "Otrzymuj spersonalizowane porady finansowe oparte na AI. Odkryj strategie oszczędzania, optymalizacji spłaty długów i szybszego osiągania celów.",
    "f4B1": "Inteligentne sugestie",
    "f4B2": "Ocena wpływu",
    "f4B3": "Szacunki oszczędności",
    "f4B4": "Spersonalizowane strategie",
    "whyChoose": "Dlaczego warto wybrać Paycheck Planner?",
    "fastSetupTitle": "⚡ Szybka konfiguracja",
    "fastSetupDesc": "Zacznij w kilka minut. Bez skomplikowanych formularzy i długiego wdrażania. Po prostu wpisz swoje długi i uzyskaj natychmiastowe informacje.",
    "secureTitle": "🔒 Bezpiecznie i prywatnie",
    "secureDesc": "Twoje dane finansowe są szyfrowane i chronione. Nigdy nie udostępniamy Twoich informacji stronom trzecim.",
    "availableTitle": "📱 Zawsze dostępne",
    "availableDesc": "Uzyskaj dostęp do swoich finansów w dowolnym miejscu i czasie. W pełni responsywny design na telefonie, tablecie i komputerze.",
    "ctaTitle": "Gotowy przejąć kontrolę?",
    "ctaSubtitle": "Zacznij od naszego darmowego planu i ulepszaj w dowolnym momencie, aby odblokować funkcje premium.",
    "ctaButton": "Zobacz plany i cennik"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/pl.json"), $json_pl, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_pl = Get-Content -Path "lib/i18n/messages/pl.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_pl.login.welcomeBack -and $parsed_pl.features.title -and $parsed_pl.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/pl.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/pl.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/pl.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

$json_is = @'
{
  "nav": {
    "dashboard": "Yfirlit",
    "calendar": "Dagatal",
    "debts": "Skuldir",
    "payoffPlan": "Greiðsluáætlun",
    "bills": "Reikningar",
    "income": "Tekjur",
    "goals": "Markmið",
    "achievements": "Afrek",
    "insights": "Innsýn",
    "aiChat": "Spjall við gervigreind",
    "account": "Aðgangur",
    "admin": "Stjórnandi",
    "gettingStarted": "Fyrstu skref",
    "feedback": "Ábendingar",
    "signOut": "Skrá út"
  },
  "selector": {
    "language": "Tungumál",
    "currency": "Gjaldmiðill"
  },
  "home": {
    "heroPrefix": "Skipuleggðu hverja útborgun. ",
    "heroHighlight": "Losaðu þig við skuldir",
    "heroSuffix": " hraðar.",
    "heroSubtitle": "Taktu stjórn á fjárhagslegri framtíð þinni með gervigreindarknúnum aðferðum til að losna við skuldir, útborgunaráætlun í rauntíma og persónulegri fjármálainnsýn.",
    "ctaStartFree": "Byrja frítt",
    "ctaViewPlans": "Skoða áskriftir",
    "statPayoffTitle": "Meðaltími til að losna við skuldir",
    "statPayoffDesc": "Notendur sjá árangur á allt niður í 24-36 mánuðum",
    "statAiTitle": "Gervigreindarknúin stefna",
    "statAiDesc": "Vélnám greinir fjármálin þín fyrir bestu niðurgreiðslu",
    "statInsightsTitle": "Samstundis innsýn",
    "statInsightsDesc": "Rauntímamælaborð og forspárgreining",
    "featuresHeading": "Öflugir eiginleikar",
    "feature1Title": "Skuldaútreikningsvél",
    "feature1Desc": "Samanburður á mörgum aðferðum og tímalínuspá",
    "feature2Title": "Reikningaeftirlit",
    "feature2Desc": "Misstu aldrei af greiðslu með snjöllum áminningum",
    "feature3Title": "Fjárhagsleg áfangamörk",
    "feature3Desc": "Fylgstu með framförum þínum í átt að skuldleysi",
    "feature4Title": "Gervigreindarinnsýn",
    "feature4Desc": "Fáðu persónulegar ráðleggingar (Premium)",
    "feature5Title": "Ítarleg greining",
    "feature5Desc": "Ítarlegar fjárhagsspár og sviðsmyndaáætlanir",
    "feature6Title": "Snjóbolti og snjóflóð",
    "feature6Desc": "Berðu saman margar niðurgreiðsluaðferðir",
    "ctaHeading": "Tilbúin(n) að taka stjórnina?",
    "ctaSubtitle": "Byrjaðu frítt, uppfærðu hvenær sem er. Segðu upp hvenær sem er.",
    "ctaButton": "Byrja frítt"
  },
  "login": {
    "welcomeBack": "Velkomin/n aftur",
    "welcomeBackSubtitle": "Taktu stjórn á hverri útborgun, skuld og fjárhagslegu markmiði.",
    "continueWithGoogle": "Halda áfram með Google",
    "or": "eða",
    "emailPlaceholder": "Netfang",
    "passwordPlaceholder": "Lykilorð",
    "forgotPassword": "Gleymt lykilorð?",
    "logIn": "Skrá inn",
    "loggingIn": "Skrái inn...",
    "noAccount": "Ertu ekki með aðgang?",
    "signUpFree": "Nýskrá frítt",
    "twoFactorTitle": "Tveggja þátta staðfesting",
    "twoFactorSubtitle": "Sláðu inn 6 stafa kóðann úr auðkenningarappinu þínu.",
    "verify": "Staðfesta",
    "verifying": "Staðfesti...",
    "genericError": "Villa kom upp. Reyndu aftur.",
    "googleError": "Villa kom upp við innskráningu með Google. Reyndu aftur."
  },
  "signup": {
    "createAccount": "Stofna aðgang",
    "createAccountSubtitle": "Slástu í hóp þúsunda sem stjórna fjármálum sínum",
    "agreeToTerms": "Ég samþykki",
    "termsOfService": "þjónustuskilmála",
    "and": "og",
    "privacyPolicy": "persónuverndarstefnu",
    "continueWithGoogle": "Halda áfram með Google",
    "or": "eða",
    "emailPlaceholder": "Netfang",
    "passwordPlaceholder": "Lykilorð (minnst 8 stafir)",
    "confirmPasswordPlaceholder": "Staðfestu lykilorð",
    "signUpFree": "Nýskrá frítt",
    "creatingAccount": "Stofna aðgang...",
    "alreadyHaveAccount": "Ertu nú þegar með aðgang?",
    "logIn": "Skrá inn",
    "errorAgreeTerms": "Samþykktu þjónustuskilmála og persónuverndarstefnu til að halda áfram.",
    "errorPasswordMismatch": "Lykilorðin passa ekki saman",
    "errorPasswordLength": "Lykilorðið verður að vera minnst 8 stafir",
    "errorGeneric": "Villa kom upp. Reyndu aftur.",
    "errorGoogle": "Villa kom upp við nýskráningu með Google. Reyndu aftur."
  },
  "features": {
    "title": "Öflugir eiginleikar til að ná tökum á fjármálum þínum",
    "subtitle": "Allt sem þú þarft til að losna við skuldir, skipuleggja fjármálin þín og ná fjárhagslegu frelsi.",
    "f1Title": "Skuldaútreikningsvél",
    "f1Desc": "Berðu saman Snjóbolta- og Snjóflóðsaðferðirnar hlið við hlið. Sjáðu nákvæmlega hversu langan tíma það tekur að losna við skuldir og hversu miklum vöxtum þú munt greiða.",
    "f1B1": "Bættu við ótakmörkuðum fjölda skulda",
    "f1B2": "Fylgstu með vöxtum",
    "f1B3": "Stilltu aukagreiðslur",
    "f1B4": "Flyttu út samanburðarskýrslur",
    "f2Title": "OCR og reikningaupphal",
    "f2Desc": "Taktu mynd af reikningunum þínum og gervigreindin okkar dregur sjálfkrafa út söluaðila, upphæð og gjalddaga. Aldrei aftur handvirk innsláttur.",
    "f2B1": "Taktu myndir af reikningum",
    "f2B2": "Sjálfvirk gagnaútdráttur",
    "f2B3": "Áreiðanleikaeinkunn",
    "f2B4": "Handvirkar leiðréttingar í boði",
    "f3Title": "Fjármálamælaborð",
    "f3Desc": "Sjáðu öll fjármál þín í einu. Fylgstu með skuldum, reikningum, eignum og hreinni eign með fallegum gröfum og útreikningum í rauntíma.",
    "f3B1": "Rauntímamælikvarðar",
    "f3B2": "Margvíslegar sjónrænar birtingar",
    "f3B3": "Skuldir á móti tekjum",
    "f3B4": "Eftirfylgni hreinnar eignar",
    "f4Title": "Gervigreindartilmæli (Premium)",
    "f4Desc": "Fáðu persónulega fjármálaráðgjöf knúna gervigreind. Uppgötvaðu aðferðir til að spara peninga, hámarka skuldaniðurgreiðslu og ná markmiðum þínum hraðar.",
    "f4B1": "Snjallar tillögur",
    "f4B2": "Áhrifaeinkunn",
    "f4B3": "Sparnaðaráætlanir",
    "f4B4": "Persónulegar aðferðir",
    "whyChoose": "Af hverju að velja Paycheck Planner?",
    "fastSetupTitle": "⚡ Fljótleg uppsetning",
    "fastSetupDesc": "Byrjaðu á nokkrum mínútum. Engin flókin eyðublöð eða löng innleiðing. Sláðu bara inn skuldirnar þínar og fáðu samstundis innsýn.",
    "secureTitle": "🔒 Öruggt og einkarekið",
    "secureDesc": "Fjármálagögnin þín eru dulkóðuð og vernduð. Við deilum aldrei upplýsingum þínum með þriðja aðila.",
    "availableTitle": "📱 Alltaf aðgengilegt",
    "availableDesc": "Fáðu aðgang að fjármálum þínum hvenær og hvar sem er. Fullkomlega sniðið hönnun fyrir síma, spjaldtölvu og borðtölvu.",
    "ctaTitle": "Tilbúin(n) að taka stjórnina?",
    "ctaSubtitle": "Byrjaðu með frítt áskrift okkar og uppfærðu hvenær sem er til að opna hágæða eiginleika.",
    "ctaButton": "Skoða áskriftir og verð"
  }
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "lib/i18n/messages/is.json"), $json_is, (New-Object System.Text.UTF8Encoding($false)))
try {
    $parsed_is = Get-Content -Path "lib/i18n/messages/is.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($parsed_is.login.welcomeBack -and $parsed_is.features.title -and $parsed_is.nav.dashboard) {
        Write-Host "OK   lib/i18n/messages/is.json" -ForegroundColor Green
    } else { Write-Host "FAIL lib/i18n/messages/is.json (missing keys)" -ForegroundColor Red; $global:anyFail = $true }
} catch { Write-Host "FAIL lib/i18n/messages/is.json (invalid JSON): $_" -ForegroundColor Red; $global:anyFail = $true }

if ($global:anyFail) {
    Write-Host ""
    Write-Host "One or more files failed verification. Stopping before commit." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All files verified clean. Committing repair..." -ForegroundColor Cyan

git add app/features/page.tsx lib/i18n/messages/en.json lib/i18n/messages/es.json lib/i18n/messages/fr.json lib/i18n/messages/de.json lib/i18n/messages/it.json lib/i18n/messages/pl.json lib/i18n/messages/is.json
git commit -m "Fix dropped anchor tag and JSON encoding corruption from previous batch"
git push origin main

Write-Host ""
Write-Host "Done. Vercel will auto-deploy in a minute or two." -ForegroundColor Green