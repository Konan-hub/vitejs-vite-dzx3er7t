import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from './lib/supabase';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 3;
const MIN_PASSWORD = 8;

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
  group: string;
  /** true = le 0 initial fait partie du numéro (ex. Côte d'Ivoire) et ne doit PAS être retiré */
  keepZero?: boolean;
};

const COUNTRIES: Country[] = [
  // Europe
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33', group: 'Europe' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgique', dial: '+32', group: 'Europe' },
  { code: 'CH', flag: '🇨🇭', name: 'Suisse', dial: '+41', group: 'Europe' },
  { code: 'LU', flag: '🇱🇺', name: 'Luxembourg', dial: '+352', group: 'Europe' },
  { code: 'DE', flag: '🇩🇪', name: 'Allemagne', dial: '+49', group: 'Europe' },
  { code: 'ES', flag: '🇪🇸', name: 'Espagne', dial: '+34', group: 'Europe' },
  { code: 'IT', flag: '🇮🇹', name: 'Italie', dial: '+39', group: 'Europe' },

  // Afrique de l'Ouest
  { code: 'TG', flag: '🇹🇬', name: 'Togo', dial: '+228', group: 'Afrique de l’Ouest' },
  { code: 'BJ', flag: '🇧🇯', name: 'Bénin', dial: '+229', group: 'Afrique de l’Ouest', keepZero: true },
  { code: 'BF', flag: '🇧🇫', name: 'Burkina Faso', dial: '+226', group: 'Afrique de l’Ouest' },
  { code: 'CV', flag: '🇨🇻', name: 'Cap-Vert', dial: '+238', group: 'Afrique de l’Ouest' },
  { code: 'CI', flag: '🇨🇮', name: 'Côte d’Ivoire', dial: '+225', group: 'Afrique de l’Ouest', keepZero: true },
  { code: 'GM', flag: '🇬🇲', name: 'Gambie', dial: '+220', group: 'Afrique de l’Ouest' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana', dial: '+233', group: 'Afrique de l’Ouest' },
  { code: 'GN', flag: '🇬🇳', name: 'Guinée', dial: '+224', group: 'Afrique de l’Ouest' },
  { code: 'GW', flag: '🇬🇼', name: 'Guinée-Bissau', dial: '+245', group: 'Afrique de l’Ouest' },
  { code: 'LR', flag: '🇱🇷', name: 'Liberia', dial: '+231', group: 'Afrique de l’Ouest' },
  { code: 'ML', flag: '🇲🇱', name: 'Mali', dial: '+223', group: 'Afrique de l’Ouest' },
  { code: 'MR', flag: '🇲🇷', name: 'Mauritanie', dial: '+222', group: 'Afrique de l’Ouest' },
  { code: 'NE', flag: '🇳🇪', name: 'Niger', dial: '+227', group: 'Afrique de l’Ouest' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '+234', group: 'Afrique de l’Ouest' },
  { code: 'SN', flag: '🇸🇳', name: 'Sénégal', dial: '+221', group: 'Afrique de l’Ouest' },
  { code: 'SL', flag: '🇸🇱', name: 'Sierra Leone', dial: '+232', group: 'Afrique de l’Ouest' },

  // Afrique centrale
  { code: 'CM', flag: '🇨🇲', name: 'Cameroun', dial: '+237', group: 'Afrique centrale' },
  { code: 'CF', flag: '🇨🇫', name: 'Centrafrique', dial: '+236', group: 'Afrique centrale' },
  { code: 'CG', flag: '🇨🇬', name: 'Congo-Brazzaville', dial: '+242', group: 'Afrique centrale', keepZero: true },
  { code: 'CD', flag: '🇨🇩', name: 'RD Congo', dial: '+243', group: 'Afrique centrale' },
  { code: 'GA', flag: '🇬🇦', name: 'Gabon', dial: '+241', group: 'Afrique centrale', keepZero: true },
  { code: 'GQ', flag: '🇬🇶', name: 'Guinée équatoriale', dial: '+240', group: 'Afrique centrale' },
  { code: 'ST', flag: '🇸🇹', name: 'São Tomé-et-Príncipe', dial: '+239', group: 'Afrique centrale' },
  { code: 'TD', flag: '🇹🇩', name: 'Tchad', dial: '+235', group: 'Afrique centrale' },

  // Maghreb
  { code: 'MA', flag: '🇲🇦', name: 'Maroc', dial: '+212', group: 'Maghreb' },
  { code: 'DZ', flag: '🇩🇿', name: 'Algérie', dial: '+213', group: 'Maghreb' },
  { code: 'TN', flag: '🇹🇳', name: 'Tunisie', dial: '+216', group: 'Maghreb' },
];

// Ordre d'affichage des régions dans la liste déroulante
const COUNTRY_GROUPS = ['Afrique de l’Ouest', 'Afrique centrale', 'Maghreb', 'Europe'];

// Pays sélectionné par défaut
const DEFAULT_COUNTRY = 'TG';

type Mode = 'signup' | 'signin';
type Phase = 'auth' | 'check-email' | 'done';

/* ------------------------------------------------------------------ */
/* Fonctions utilitaires                                               */
/* ------------------------------------------------------------------ */

/**
 * "+33" + "06 12 34 56 78" -> "+33612345678"
 * keepZero = true (ex. Côte d'Ivoire) : "+225" + "07 12 34 56 78" -> "+2250712345678"
 */
function toE164(dial: string, national: string, keepZero = false): string {
  const digits = national.replace(/\D/g, '');
  const cleaned = keepZero ? digits : digits.replace(/^0+/, '');
  return `${dial}${cleaned}`;
}

function isPlausiblePhone(e164: string): boolean {
  return /^\+\d{8,15}$/.test(e164);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cet e-mail. Connecte-toi à la place.';
  if (m.includes('email not confirmed'))
    return 'Ton e-mail n’est pas encore confirmé. Clique sur le lien reçu par e-mail.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Attends un instant puis réessaie.';
  if (m.includes('password') && m.includes('characters'))
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`;
  if (m.includes('network') || m.includes('fetch'))
    return 'Pas de connexion. Vérifie ton Internet et réessaie.';
  if (m.includes('row-level security') || m.includes('permission denied'))
    return 'Enregistrement du profil refusé. Vérifie les règles RLS de la table livreurs.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/* ------------------------------------------------------------------ */
/* Petits composants                                                   */
/* ------------------------------------------------------------------ */

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ProgressHeader({ step }: { step: number }) {
  const percent = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <header className="px-5 pt-5">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-900">
          Étape {step} sur {TOTAL_STEPS}
        </span>
        <span className="tabular-nums text-slate-500">{percent} %</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression de la candidature"
      >
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </header>
  );
}

const fieldWrap =
  'mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-amber-400';
const fieldInput =
  'h-14 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-slate-400 disabled:opacity-60';
const labelCls = 'text-sm font-medium text-slate-700';
const primaryBtn =
  'flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500';

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [phase, setPhase] = useState<Phase>('auth');
  const [mode, setMode] = useState<Mode>('signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const phone = toE164(country.dial, national, country.keepZero);

  /* Session existante au chargement (l'utilisateur reste connecté) */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionEmail(data.session.user.email ?? null);
        setPhase('done');
      }
    });
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const canSubmit =
    isValidEmail(email.trim()) &&
    password.length >= (mode === 'signup' ? MIN_PASSWORD : 1) &&
    (mode === 'signin' || national.replace(/\D/g, '').length >= 8);

  /** Crée ou met à jour la ligne du livreur. Le téléphone n'est envoyé que s'il est fourni. */
  async function saveProfile(userId: string, userEmail: string, userPhone?: string) {
    const row: Record<string, string> = {
      id: userId,
      email: userEmail,
      updated_at: new Date().toISOString(),
    };
    if (userPhone) row.phone = userPhone;

    const { error: upsertError } = await supabase
      .from('livreurs')
      .upsert(row, { onConflict: 'id' });
    if (upsertError) throw upsertError;
  }

  /* ------------------------- Envoi du formulaire ------------------- */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError('Saisis une adresse e-mail valide.');
      return;
    }
    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD) {
        setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`);
        return;
      }
      if (!isPlausiblePhone(phone)) {
        setError('Saisis un numéro de téléphone valide.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        // Le téléphone est transmis dans les métadonnées : un trigger SQL
        // le copie dans la table `livreurs` (voir script SQL).
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { phone } },
        });
        if (signUpError) throw signUpError;

        // E-mail déjà utilisé (Supabase renvoie alors une liste d'identités vide)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('User already registered');
        }

        // Pas de session = confirmation d'e-mail activée dans Supabase
        if (!data.session) {
          setPhase('check-email');
          return;
        }

        await saveProfile(data.user!.id, cleanEmail, phone);
        setSessionEmail(cleanEmail);
        setPhase('done');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;

        // Garantit l'existence de la ligne (sans écraser le téléphone existant)
        await saveProfile(data.user.id, cleanEmail);
        setSessionEmail(cleanEmail);
        setPhase('done');
      }
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setPassword('');
    setPhase('auth');
    setMode('signin');
  };

  /* ----------------------------- Rendu ----------------------------- */

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-stone-50 text-slate-900">
      <ProgressHeader step={1} />

      <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
        {/* ---------------- Inscription / Connexion ---------------- */}
        {phase === 'auth' && (
          <form className="flex flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {mode === 'signup' ? 'Crée ton compte livreur' : 'Content de te revoir'}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {mode === 'signup'
                ? 'Quelques informations pour commencer ta candidature.'
                : 'Connecte-toi pour reprendre ta candidature.'}
            </p>

            {/* Bascule inscription / connexion */}
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-200 p-1 text-sm font-semibold" role="tablist">
              {(['signup', 'signin'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  disabled={loading}
                  className={`h-10 rounded-lg transition ${
                    mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {m === 'signup' ? 'Créer un compte' : 'Se connecter'}
                </button>
              ))}
            </div>

            {/* E-mail */}
            <label htmlFor="email" className={`mt-6 ${labelCls}`}>
              Adresse e-mail
            </label>
            <div className={fieldWrap}>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="prenom.nom@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={fieldInput}
              />
            </div>

            {/* Mot de passe */}
            <label htmlFor="password" className={`mt-5 ${labelCls}`}>
              Mot de passe
            </label>
            <div className={fieldWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? `${MIN_PASSWORD} caractères minimum` : 'Ton mot de passe'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={fieldInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="px-4 text-sm font-semibold text-slate-600"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {/* Téléphone (inscription uniquement) */}
            {mode === 'signup' && (
              <>
                <label htmlFor="phone" className={`mt-5 ${labelCls}`}>
                  Téléphone (appel ou WhatsApp)
                </label>
                <div className={fieldWrap}>
                  <div className="relative flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-50 pl-3 pr-2 focus-within:bg-amber-50">
                    {/* Affichage compact : drapeau + indicatif */}
                    <span