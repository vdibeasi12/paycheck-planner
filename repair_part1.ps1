# Repair part 1
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
if ($c1) { Write-Host "OK   app/features/page.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/features/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

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

if ($global:anyFail) {
    Write-Host ""
    Write-Host "One or more files failed. Fix before running part 2." -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "Part 1 done. Now run repair_part2.ps1" -ForegroundColor Cyan
}