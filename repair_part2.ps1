# Repair part 2 (final)
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = "Stop"
$global:anyFail = $false

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
    Write-Host "One or more files in this part failed. Stopping before commit." -ForegroundColor Red
    exit 1
}

# Also re-verify the files written by part 1 are still good
$allGood = $true
foreach ($f in @("lib/i18n/messages/en.json","lib/i18n/messages/es.json","lib/i18n/messages/fr.json","lib/i18n/messages/de.json")) {
    try {
        $p = Get-Content -Path $f -Raw -Encoding UTF8 | ConvertFrom-Json
        if (-not ($p.login.welcomeBack -and $p.features.title)) { Write-Host "FAIL $f (part 1 file missing keys - did you run repair_part1.ps1 first?)" -ForegroundColor Red; $allGood = $false }
    } catch { Write-Host "FAIL $f (part 1 file invalid or missing - did you run repair_part1.ps1 first?)" -ForegroundColor Red; $allGood = $false }
}
if (-not $allGood) {
    Write-Host ""
    Write-Host "Run repair_part1.ps1 first, then repair_part2.ps1." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All files verified clean. Committing repair..." -ForegroundColor Cyan

git add app/features/page.tsx lib/i18n/messages/en.json lib/i18n/messages/es.json lib/i18n/messages/fr.json lib/i18n/messages/de.json lib/i18n/messages/it.json lib/i18n/messages/pl.json lib/i18n/messages/is.json
git commit -m "Fix dropped anchor tag and JSON encoding corruption from previous batch"
git push origin main

Write-Host ""
Write-Host "Done. Vercel will auto-deploy in a minute or two." -ForegroundColor Green