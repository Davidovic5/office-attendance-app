/**
 * Biometric & Passkey Helper for Wadi Degla Attendance
 * Implements WebAuthn Face ID / Touch ID authentication adhering to Modern Web Guidance standards.
 */
import 'webauthn-polyfills';
import { api } from '../api';

/**
 * Check if the current device/browser supports Platform Authenticator (Face ID / Touch ID / Fingerprint)
 */
export async function checkBiometricSupport() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(isAvailable);
    }
    return true;
  } catch (e) {
    console.warn("Biometric support check error:", e);
    return false;
  }
}

/**
 * Register Face ID / Touch ID for the currently signed-in employee
 */
export async function registerBiometrics(employeeId) {
  if (!employeeId) throw new Error('رقم الموظف مطلوب لتفعيل البصمة.');

  // 1. Fetch registration options from backend
  const optsRes = await api.getWebAuthnRegisterOptions(employeeId);
  if (!optsRes.success) {
    throw new Error(optsRes.error || 'تعذر بدء تفعيل البصمة من الخادم.');
  }

  // 2. Decode options using standard parseCreationOptionsFromJSON
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON
    ? PublicKeyCredential.parseCreationOptionsFromJSON(optsRes.options)
    : optsRes.options;

  // 3. Prompt native OS dialog (iOS Face ID/Touch ID or Android Biometrics)
  let credential;
  try {
    credential = await navigator.credentials.create({ publicKey });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('تم إلغاء عملية مسح البصمة من قِبل المستخدم.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('بصمة هذا الجهاز مسجلة بالفعل لحسابك.');
    }
    if (err.name === 'SecurityError') {
      throw new Error('تعذر تفعيل البصمة: تأكد من استخدام اتصال آمن (HTTPS).');
    }
    throw new Error(err.message || 'فشل التعرف على البصمة.');
  }

  if (!credential) {
    throw new Error('لم يتم إنشاء بيانات البصمة بنجاح.');
  }

  // 4. Encode credential to JSON using .toJSON()
  const encoded = typeof credential.toJSON === 'function' ? credential.toJSON() : credential;

  // 5. Verify on server
  const verifyRes = await api.verifyWebAuthnRegistration(employeeId, encoded);
  if (!verifyRes.success) {
    // Progressive Signal API synchronization
    if (PublicKeyCredential.signalUnknownCredential && publicKey.rp && publicKey.rp.id) {
      try {
        await PublicKeyCredential.signalUnknownCredential({
          rpId: publicKey.rp.id,
          credentialId: encoded.id
        });
      } catch (e) {}
    }
    throw new Error(verifyRes.error || 'فشل التحقق من البصمة.');
  }

  return verifyRes;
}

/**
 * Authenticate returning user with Face ID / Touch ID
 */
export async function authenticateWithBiometrics(phone = '') {
  // 1. Fetch challenge and authentication options from backend
  const optsRes = await api.getWebAuthnLoginOptions(phone);
  if (!optsRes.success) {
    throw new Error(optsRes.error || 'تعذر بدء تسجيل الدخول بالبصمة.');
  }

  // 2. Decode options using parseRequestOptionsFromJSON
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON
    ? PublicKeyCredential.parseRequestOptionsFromJSON(optsRes.options)
    : optsRes.options;

  // 3. Prompt native Face ID / Touch ID authentication modal
  let credential;
  try {
    credential = await navigator.credentials.get({ publicKey });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('لم يتم العثور على بصمة مسجلة في هذا الهاتف. يرجى تسجيل الدخول برقم الهاتف وكلمة المرور أولاً لتفعيل الـ Face ID.');
    }
    if (err.name === 'AbortError') {
      throw new Error('تم إيقاف عملية التحقق من البصمة.');
    }
    throw new Error(err.message || 'فشل التعرف على البصمة.');
  }

  if (!credential) {
    throw new Error('لم يتم استلام استجابة البصمة.');
  }

  // 4. Encode assertion
  const encoded = typeof credential.toJSON === 'function' ? credential.toJSON() : credential;

  // 5. Send to backend for verification and login
  const verifyRes = await api.verifyWebAuthnLogin(encoded, phone);
  if (!verifyRes.success) {
    if (PublicKeyCredential.signalUnknownCredential && publicKey.rpId) {
      try {
        await PublicKeyCredential.signalUnknownCredential({
          rpId: publicKey.rpId,
          credentialId: encoded.id
        });
      } catch (e) {}
    }
    throw new Error(verifyRes.error || 'فشل تسجيل الدخول بالبصمة.');
  }

  return verifyRes;
}
