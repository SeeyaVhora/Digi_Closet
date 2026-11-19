import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, getAdditionalUserInfo } from 'firebase/auth';
import { Phone, KeyRound, User } from 'lucide-react';
import { auth, AUTH_EMULATOR_URL, USE_AUTH_EMULATOR } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Input from './Input';
import Button from './Button';

const RESEND_SECONDS = 30;
const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
];

const FRIENDLY_ERRORS = {
  'auth/invalid-phone-number': 'Enter a valid mobile number.',
  'auth/missing-phone-number': 'Enter your mobile number.',
  'auth/invalid-verification-code': 'That code is incorrect. Check the SMS and try again.',
  'auth/missing-verification-code': 'Enter the 6-digit code.',
  'auth/code-expired': 'This code has expired. Send a new one.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded': 'The SMS limit has been reached for now. Please try again later.',
  'auth/captcha-check-failed': 'Verification failed. Refresh the page and try again.',
  'auth/invalid-app-credential': 'Verification failed. Refresh the page and try again.',
  'auth/operation-not-allowed': 'Phone sign-in is not enabled for this Firebase project yet.',
  'auth/network-request-failed': 'Cannot reach the sign-in service. Make sure the Firebase Auth Emulator is running.',
};

const describeError = (err, fallback) => FRIENDLY_ERRORS[err.code] || (err.code ? fallback : getErrorMessage(err, fallback));

// "98765 43210" + "+91" → "+919876543210". A number typed with its own "+" wins.
function toE164(countryCode, number) {
  const trimmed = number.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : `${countryCode}${digits.replace(/^0+/, '')}`;
}

// The Auth Emulator doesn't send SMS; it records codes for local testing.
async function fetchEmulatorCode(phoneNumber) {
  const projectId = auth.app.options.projectId;
  const res = await fetch(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${projectId}/verificationCodes`);
  const { verificationCodes = [] } = await res.json();
  return verificationCodes.filter((c) => c.phoneNumber === phoneNumber).at(-1)?.code || null;
}

/**
 * Sign in (or sign up) with a mobile number and a one-time SMS code.
 * `askName` adds a name field for new accounts. `onSuccess(isNewUser)`
 * runs once the account is signed in and its profile is ready.
 */
export default function PhoneAuthForm({ askName = false, onSuccess }) {
  const { sendPhoneCode, confirmPhoneCode } = useAuth();
  const [countryCode, setCountryCode] = useState('+91');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recaptchaRef = useRef(null);
  const verifierRef = useRef(null);

  useEffect(() => () => verifierRef.current?.clear(), []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Invisible reCAPTCHA proves the request comes from a person (Firebase
  // requires it for SMS). Created once and reused for resends.
  const verifier = () => {
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, { size: 'invisible' });
    }
    return verifierRef.current;
  };

  const sendCode = async (e) => {
    e?.preventDefault();
    const phoneNumber = toE164(countryCode, number);
    if (askName && !name.trim()) return setError('Please enter your name.');
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) return setError('Enter a valid mobile number.');

    setBusy(true);
    setError('');
    try {
      setConfirmation(await sendPhoneCode(phoneNumber, verifier()));
      setSentTo(phoneNumber);
      setCode('');
      setResendIn(RESEND_SECONDS);
      setDevCode(USE_AUTH_EMULATOR ? await fetchEmulatorCode(phoneNumber).catch(() => null) : null);
    } catch (err) {
      // A failed attempt leaves the reCAPTCHA spent; start fresh next time.
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(describeError(err, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    setBusy(true);
    setError('');
    try {
      const credential = await confirmPhoneCode(confirmation, code, askName ? name.trim() : undefined);
      onSuccess?.(Boolean(getAdditionalUserInfo(credential)?.isNewUser));
    } catch (err) {
      setError(describeError(err, 'Could not verify the code. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <div className="phone-auth">
      {!confirmation ? (
        <form onSubmit={sendCode} className="auth-card__form" noValidate>
          {askName && <Input label="Full name" name="name" placeholder="Your name" icon={User} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} />}
          <div className="field">
            <label className="field__label" htmlFor="phone-number">Mobile number</label>
            <div className="phone-auth__number">
              <select className="select" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Country code">
                {COUNTRY_CODES.map(({ code: value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Input id="phone-number" type="tel" name="phone" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" icon={Phone} value={number} onChange={(e) => { setNumber(e.target.value); setError(''); }} />
            </div>
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <Button type="submit" fullWidth loading={busy}>Send code</Button>
          <p className="phone-auth__note">We’ll text you a 6-digit code. Standard SMS rates may apply.</p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="auth-card__form" noValidate>
          <p className="phone-auth__sent">
            Code sent to <strong>{sentTo}</strong>.{' '}
            <button type="button" className="phone-auth__link" onClick={() => { setConfirmation(null); setError(''); setDevCode(null); }}>Change number</button>
          </p>
          <Input
            label="6-digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            icon={KeyRound}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            autoFocus
          />
          {devCode && (
            <div className="alert alert--info">Local development: the Auth Emulator doesn’t send SMS. Your code is <strong>{devCode}</strong>.</div>
          )}
          {error && <div className="alert alert--error">{error}</div>}
          <Button type="submit" fullWidth loading={busy}>Verify and continue</Button>
          <button type="button" className="phone-auth__link phone-auth__resend" onClick={sendCode} disabled={busy || resendIn > 0}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
        </form>
      )}
      <div ref={recaptchaRef} />
    </div>
  );
}
