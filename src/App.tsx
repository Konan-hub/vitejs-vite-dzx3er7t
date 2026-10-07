import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from './lib/supabase';

/* ------------------------------------------------------------------ */
/* Constantes                                                         */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 3;
const MIN_PASSWORD = 8;

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
  group: string;
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

const COUNTRY_GROUPS = ['Afrique de l’Ouest', 'Afrique centrale', 'Maghreb', 'Europe'];
const DEFAULT_COUNTRY = 'TG';

type Mode = 'signup' | 'signin';
type Phase = 'auth' | 'check-email' | 'done';

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

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
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cet e-mail. Connecte-toi à la place.';
  if (m.includes('email not confirmed')) return 'Ton e-mail n’est pas encore confirmé.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Attends un instant puis réessaie.';
  if (m.includes('password') && m.includes('characters'))
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`;
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

/* ------------------------------------------------------------------ */
/* Composants UI                                                      */
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
        <span className="font-semibold text-slate-900">Étape {step} sur {TOTAL_STEPS}</span>
        <span className="tabular-nums text-slate-500">{percent} %</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
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
/* Application                                                        */
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { phone } },
        });
        if (signUpError) throw signUpError;

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('User already registered');
        }

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

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-stone-50 text-slate-900">
      <ProgressHeader step={1} />

      <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
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

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-200 p-1 text-sm font-semibold">
              {(['signup', 'signin'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
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

            <label htmlFor="email" className={`mt-6 ${labelCls}`}>
              Adresse e-mail
            </label>
            <div className={fieldWrap}>
              <input
                id="email"
                type="email"
                inputMode="email"
                placeholder="prenom.nom@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={fieldInput}
              />
            </div>

            <label htmlFor="password" className={`mt-5 ${labelCls}`}>
              Mot de passe
            </label>
            <div className={fieldWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
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
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {mode === 'signup' && (
              <>
                <label htmlFor="phone" className={`mt-5 ${labelCls}`}>
                  Téléphone (appel ou WhatsApp)
                </label>
                <div className={fieldWrap}>
                  <div className="relative flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-50 pl-3 pr-2">
                    <span className="text-sm font-medium text-slate-700">
                      {country.flag} {country.dial}
                    </span>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={loading}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      {COUNTRY_GROUPS.map((grp) => (
                        <optgroup key={grp} label={grp}>
                          {COUNTRIES.filter((c) => c.group === grp).map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.dial})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="07 12 34 56 78"
                    value={national}
                    onChange={(e) => setNational(e.target.value)}
                    disabled={loading}
                    className={fieldInput}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="mt-auto pt-6">
              <button type="submit" disabled={!canSubmit || loading} className={primaryBtn}>
                {loading ? (
                  <Spinner />
                ) : mode === 'signup' ? (
                  'Continuer vers l’étape 2'
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>
          </form>
        )}

        {phase === 'check-email' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ✉️
            </div>
            <h2 className="mt-4 text-xl font-bold">Vérifie ta boîte mail</h2>
            <p className="mt-2 text-sm text-slate-600">
              Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => setPhase('auth')}
              className="mt-6 text-sm font-semibold text-slate-900 underline"
            >
              Retour à l'accueil
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-1 flex-col justify-between">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800">
              <p className="font-semibold">✅ Étape 1 terminée !</p>
              <p className="mt-1 text-sm">
                Connecté en tant que <strong>{sessionEmail}</strong>.
              </p>
            </div>

            <button type="button" onClick={handleSignOut} className={primaryBtn}>
              Se déconnecter
            </button>
          </div>
        )}
      </main>
    </div>
  );
}