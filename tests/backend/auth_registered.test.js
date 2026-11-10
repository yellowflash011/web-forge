import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStore } from '../../lib/api/in_memory.js';
import { ERROR_CODES } from '../../lib/api/domain.js';

test('auth_registered: registration flow with validation and duplicate email check', async () => {
  const store = new InMemoryStore();

  // Invalid email
  const invalidEmail = store.register({ email: 'notanemail', password: 'password123', displayName: 'Bad Email' });
  assert.equal(invalidEmail.data, null);
  assert.equal(invalidEmail.error.code, ERROR_CODES.VALIDATION_ERROR);

  // Short password
  const shortPass = store.register({ email: 'valid@example.com', password: '123', displayName: 'Short' });
  assert.equal(shortPass.data, null);
  assert.equal(shortPass.error.code, ERROR_CODES.VALIDATION_ERROR);

  // Successful registration
  const reg = store.register({ email: 'ahmed@roshanrozgar.pk', password: 'ValidPassword123!', displayName: 'Ahmed Khan' });
  assert.equal(reg.error, null);
  assert.ok(reg.data.user.userId);
  assert.equal(reg.data.user.displayName, 'Ahmed Khan');
  assert.equal(reg.data.user.isAnonymous, false);
  assert.equal(reg.data.sessionConfirmed, true);

  // Duplicate registration fails with VALIDATION_ERROR
  const dup = store.register({ email: 'AHMED@roshanrozgar.pk', password: 'AnotherPassword456!', displayName: 'Ahmed Duplicate' });
  assert.equal(dup.data, null);
  assert.equal(dup.error.code, ERROR_CODES.VALIDATION_ERROR);
  assert.match(dup.error.message, /already exists/i);
});

test('auth_registered: sign in, restore session, and sign out', async () => {
  const store = new InMemoryStore();

  // Register user
  const reg = store.register({ email: 'tahir@roshanrozgar.pk', password: 'SecurePassword123!', displayName: 'Tahir Abbas' });
  assert.equal(reg.error, null);
  const userId = reg.data.user.userId;

  // Sign out
  const signout = store.signOut();
  assert.equal(signout.error, null);
  assert.equal(signout.data.signedOut, true);

  // When signed out, getSession returns null
  const noSession = store.getSession();
  assert.equal(noSession.error, null);
  assert.equal(noSession.data, null);

  // When signed out, ensureSession returns UNAUTHENTICATED
  const unauthSession = store.ensureSession();
  assert.equal(unauthSession.data, null);
  assert.equal(unauthSession.error.code, ERROR_CODES.UNAUTHENTICATED);

  // Incorrect password
  const wrongPass = store.signIn({ email: 'tahir@roshanrozgar.pk', password: 'WrongPassword' });
  assert.equal(wrongPass.data, null);
  assert.equal(wrongPass.error.code, ERROR_CODES.UNAUTHENTICATED);

  // Correct credentials
  const signin = store.signIn({ email: 'tahir@roshanrozgar.pk', password: 'SecurePassword123!' });
  assert.equal(signin.error, null);
  assert.equal(signin.data.userId, userId);
  assert.equal(signin.data.isAnonymous, false);
  assert.equal(signin.data.displayName, 'Tahir Abbas');

  // getSession now returns active session
  const activeSession = store.getSession();
  assert.equal(activeSession.error, null);
  assert.equal(activeSession.data.userId, userId);

  // ensureSession now returns active session
  const ensured = store.ensureSession();
  assert.equal(ensured.error, null);
  assert.equal(ensured.data.userId, userId);
});

test('auth_registered: password reset flow', async () => {
  const store = new InMemoryStore();

  // Register user
  store.register({ email: 'reset.test@roshanrozgar.pk', password: 'OldPassword123!', displayName: 'Reset Tester' });

  // Request password reset
  const reqReset = store.requestPasswordReset({ email: 'reset.test@roshanrozgar.pk' });
  assert.equal(reqReset.error, null);
  assert.equal(reqReset.data.sent, true);

  // Update password with too short password
  const shortNewPass = store.resetPassword({ newPassword: '123' });
  assert.equal(shortNewPass.data, null);
  assert.equal(shortNewPass.error.code, ERROR_CODES.VALIDATION_ERROR);

  // Update password with valid password
  const updated = store.resetPassword({ newPassword: 'BrandNewPassword456!' });
  assert.equal(updated.error, null);
  assert.equal(updated.data.updated, true);

  // Sign out and verify new password works
  store.signOut();
  const oldLogin = store.signIn({ email: 'reset.test@roshanrozgar.pk', password: 'OldPassword123!' });
  assert.equal(oldLogin.data, null);
  assert.equal(oldLogin.error.code, ERROR_CODES.UNAUTHENTICATED);

  const newLogin = store.signIn({ email: 'reset.test@roshanrozgar.pk', password: 'BrandNewPassword456!' });
  assert.equal(newLogin.error, null);
  assert.equal(newLogin.data.displayName, 'Reset Tester');
});

test('auth_registered: anonymous identities rejected in all protected operations', async () => {
  const store = new InMemoryStore();

  // Create an anonymous user directly in the store to simulate legacy/forbidden anonymous session
  const anonId = '00000000-0000-0000-0000-000000000099';
  store.users.set(anonId, { id: anonId, is_anonymous: true, email: 'anon@example.com' });
  store.setCurrentUser(anonId);

  // ensureSession must reject anonymous user
  const ensureRes = store.ensureSession();
  assert.equal(ensureRes.data, null);
  assert.equal(ensureRes.error.code, ERROR_CODES.UNAUTHENTICATED);

  // getSession must return null for anonymous user
  const getRes = store.getSession();
  assert.equal(getRes.error, null);
  assert.equal(getRes.data, null);

  // Protected operations must reject anonymous callers
  const saveProf = store.saveWorkerProfile({ fields: { name: 'Anon Worker', tradeIds: ['plumber'], localityId: 'g-10-islamabad', serviceAreaIds: ['g-10-islamabad'] } });
  assert.equal(saveProf.data, null);
  assert.equal(saveProf.error.code, ERROR_CODES.UNAUTHENTICATED);

  const setAvail = store.setAvailability({ available: true });
  assert.equal(setAvail.data, null);
  assert.equal(setAvail.error.code, ERROR_CODES.UNAUTHENTICATED);

  const createReq = store.createRequest({ workerId: '11111111-1111-1111-1111-111111111111', tradeId: 'electrician', localityId: 'g-10-islamabad', task: 'Fix short circuit', pricingPath: 'fixed' });
  assert.equal(createReq.data, null);
  assert.equal(createReq.error.code, ERROR_CODES.UNAUTHENTICATED);
});
