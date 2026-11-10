// In-memory stateful domain engine for tests and zero-dependency verification
// Mirrors the exact Postgres schema, RLS constraints and RPC invariants

import {
  ERROR_CODES,
  JOB_STATES,
  PRICING_PATHS,
  QUOTE_PURPOSES,
  createError,
  createSuccess,
  computeAllowedActions,
  normalizeWorker,
  normalizeJob,
  normalizeQuote,
  normalizeMessage,
  normalizeReview,
  calculateQuoteTotal,
} from './domain.js';

export class InMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = new Map(); // userId -> user object
    this.profiles = new Map(); // userId -> profile
    this.workerProfiles = new Map(); // workerId -> workerProfile
    this.workerTrades = new Map(); // workerId -> Set of tradeId
    this.workerServiceAreas = new Map(); // workerId -> Set of localityId
    this.jobs = new Map(); // jobId -> job
    this.jobPrivateDetails = new Map(); // jobId -> details
    this.quotes = new Map(); // quoteId -> quote
    this.agreements = new Map(); // jobId -> agreement
    this.assignments = new Map(); // assignmentId -> assignment
    this.messages = new Map(); // messageId -> message
    this.jobEvents = [];
    this.reviews = new Map(); // reviewId -> review
    this.mutationKeys = new Map(); // `${userId}:${key}` -> response
    this.reports = [];
    this.audioBlobs = new Map(); // audioRef -> { blob, url, expiresAt }
    this.currentUserId = null;

    this.seedDefaults();
  }

  seedDefaults() {
    // Seed default demo workers
    const rashidUserId = '00000000-0000-0000-0000-000000000001';
    const tariqUserId = '00000000-0000-0000-0000-000000000002';
    const nadeemUserId = '00000000-0000-0000-0000-000000000003';

    const cust1UserId = '00000000-0000-0000-0000-000000000011';
    const cust2UserId = '00000000-0000-0000-0000-000000000012';
    const outsiderUserId = '00000000-0000-0000-0000-000000000099';

    this.users.set(rashidUserId, { id: rashidUserId, is_anonymous: false, email: 'demo.rashid@roshanrozgar.pk' });
    this.users.set(tariqUserId, { id: tariqUserId, is_anonymous: false, email: 'demo.tariq@roshanrozgar.pk' });
    this.users.set(nadeemUserId, { id: nadeemUserId, is_anonymous: false, email: 'demo.nadeem@roshanrozgar.pk' });
    this.users.set(cust1UserId, { id: cust1UserId, is_anonymous: false, email: 'demo.customer1@roshanrozgar.pk' });
    this.users.set(cust2UserId, { id: cust2UserId, is_anonymous: false, email: 'demo.customer2@roshanrozgar.pk' });
    this.users.set(outsiderUserId, { id: outsiderUserId, is_anonymous: false, email: 'demo.outsider@roshanrozgar.pk' });

    this.profiles.set(rashidUserId, { id: rashidUserId, display_name: 'Mohammad Rashid', locale: 'ur' });
    this.profiles.set(tariqUserId, { id: tariqUserId, display_name: 'Tariq Mehmood', locale: 'ur' });
    this.profiles.set(nadeemUserId, { id: nadeemUserId, display_name: 'Nadeem Akhtar', locale: 'ur' });
    this.profiles.set(cust1UserId, { id: cust1UserId, display_name: 'Usman Khan', locale: 'ur' });
    this.profiles.set(cust2UserId, { id: cust2UserId, display_name: 'Fatima Bibi', locale: 'ur' });
    this.profiles.set(outsiderUserId, { id: outsiderUserId, display_name: 'Third Party', locale: 'ur' });

    const rashidWorkerId = '11111111-1111-1111-1111-111111111111';
    const tariqWorkerId = '22222222-2222-2222-2222-222222222222';
    const nadeemWorkerId = '33333333-3333-3333-3333-333333333333';

    const eightHoursAhead = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

    this.workerProfiles.set(rashidWorkerId, {
      id: rashidWorkerId,
      owner_user_id: rashidUserId,
      name: 'Mohammad Rashid',
      bio: 'ماہر الیکٹریشن - وائرنگ، شارٹ سرکٹ فالٹ ٹریسنگ اور یو پی ایس کا کام۔',
      years_experience: 8,
      locality_id: 'g-10-islamabad',
      avatar_url: '/images/profile-1.jpg',
      availability_opt_in: true,
      availability_expires_at: eightHoursAhead,
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.workerTrades.set(rashidWorkerId, new Set(['electrician']));
    this.workerServiceAreas.set(rashidWorkerId, new Set(['g-10-islamabad', 'g-9-islamabad']));

    this.workerProfiles.set(tariqWorkerId, {
      id: tariqWorkerId,
      owner_user_id: tariqUserId,
      name: 'Tariq Mehmood',
      bio: 'سینیٹری اور پلمبنگ کے تمام کام، گیزر انسٹالیشن اور پائپ لیکیج کا فوری حل۔',
      years_experience: 12,
      locality_id: 'g-9-islamabad',
      avatar_url: '/images/profile-2.jpg',
      availability_opt_in: true,
      availability_expires_at: eightHoursAhead,
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.workerTrades.set(tariqWorkerId, new Set(['plumber']));
    this.workerServiceAreas.set(tariqWorkerId, new Set(['g-9-islamabad', 'g-10-islamabad']));

    this.workerProfiles.set(nadeemWorkerId, {
      id: nadeemWorkerId,
      owner_user_id: nadeemUserId,
      name: 'Nadeem Akhtar',
      bio: 'الیکٹریکل اور پلمبنگ دونوں کاموں کے ماہر۔',
      years_experience: 5,
      locality_id: 'g-11-islamabad',
      avatar_url: '/images/profile-3.jpg',
      availability_opt_in: true,
      availability_expires_at: eightHoursAhead,
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.workerTrades.set(nadeemWorkerId, new Set(['plumber', 'electrician']));
    this.workerServiceAreas.set(nadeemWorkerId, new Set(['g-11-islamabad', 'g-10-islamabad']));

    // Seed reviews
    const rev1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    this.reviews.set(rev1Id, {
      id: rev1Id,
      job_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      worker_id: rashidWorkerId,
      author_id: '00000000-0000-0000-0000-000000000011',
      rating: 5,
      punctuality: true,
      price_honoured: true,
      text: 'رشید بھائی نے وقت پر آ کر شارٹ سرکٹ ٹھیک کیا۔ بہت اچھا کام کیا۔',
      is_demo: true,
      created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    });

    const rev2Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
    this.reviews.set(rev2Id, {
      id: rev2Id,
      job_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      worker_id: rashidWorkerId,
      author_id: '00000000-0000-0000-0000-000000000012',
      rating: 5,
      punctuality: true,
      price_honoured: true,
      text: 'Excellent electrical work in G-10.',
      is_demo: true,
      created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    });

    const rev3Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac';
    this.reviews.set(rev3Id, {
      id: rev3Id,
      job_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      worker_id: tariqWorkerId,
      author_id: '00000000-0000-0000-0000-000000000011',
      rating: 5,
      punctuality: true,
      price_honoured: true,
      text: 'طارق صاحب نے پائپ لیکیج بہت اچھے طریقے سے فکس کیا۔',
      is_demo: true,
      created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    });
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
  }

  getCurrentUser() {
    if (!this.currentUserId) return null;
    return this.users.get(this.currentUserId) || null;
  }

  _requireRegisteredUser() {
    if (!this.currentUserId) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }
    const user = this.users.get(this.currentUserId);
    if (!user || user.is_anonymous) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }
    return null;
  }

  ensureSession(userId = null) {
    if (!userId && this.currentUserId) {
      userId = this.currentUserId;
    }
    if (!userId) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }
    if (!this.users.has(userId)) {
      this.users.set(userId, { id: userId, is_anonymous: false, email: `user_${userId.slice(0, 6)}@roshanrozgar.pk` });
      this.profiles.set(userId, { id: userId, display_name: 'Registered User', locale: 'ur' });
    }
    const user = this.users.get(userId);
    if (!user || user.is_anonymous) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }
    this.currentUserId = userId;
    const profile = this.profiles.get(userId);
    const hasWorker = Array.from(this.workerProfiles.values()).some((w) => w.owner_user_id === userId);

    return createSuccess({
      userId,
      isAnonymous: false,
      displayName: profile?.display_name || 'Registered User',
      hasWorkerProfile: hasWorker,
    });
  }

  register({ email, password, displayName } = {}) {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Provide a valid email address.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Password must be at least 6 characters.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (existing) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'An account with this email already exists.');
    }
    const userId = crypto.randomUUID();
    const cleanName = displayName?.trim() || cleanEmail.split('@')[0];
    this.users.set(userId, { id: userId, email: cleanEmail, password, is_anonymous: false });
    this.profiles.set(userId, { id: userId, display_name: cleanName, locale: 'ur' });
    this.currentUserId = userId;
    return createSuccess({
      user: { userId, isAnonymous: false, displayName: cleanName, hasWorkerProfile: false },
      sessionConfirmed: true,
      confirmationRequired: false,
    });
  }

  signIn({ email, password } = {}) {
    if (!email || !password) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Email and password are required.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!user || user.password !== password || user.is_anonymous) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Invalid email or password.');
    }
    this.currentUserId = user.id;
    const profile = this.profiles.get(user.id);
    const hasWorker = Array.from(this.workerProfiles.values()).some((w) => w.owner_user_id === user.id);
    return createSuccess({
      userId: user.id,
      isAnonymous: false,
      displayName: profile?.display_name || user.email.split('@')[0],
      hasWorkerProfile: hasWorker,
    });
  }

  requestPasswordReset({ email } = {}) {
    if (!email) return createError(ERROR_CODES.VALIDATION_ERROR, 'Provide a valid email address.');
    return createSuccess({ sent: true, message: 'Password reset link sent.' });
  }

  resetPassword({ newPassword } = {}) {
    if (!newPassword || newPassword.length < 6) return createError(ERROR_CODES.VALIDATION_ERROR, 'Password must be at least 6 characters.');
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;
    const user = this.users.get(this.currentUserId);
    if (user) user.password = newPassword;
    return createSuccess({ updated: true, message: 'Password updated successfully.' });
  }

  getSession() {
    if (!this.currentUserId) return createSuccess(null);
    const user = this.users.get(this.currentUserId);
    if (!user || user.is_anonymous) return createSuccess(null);
    const profile = this.profiles.get(this.currentUserId);
    const hasWorker = Array.from(this.workerProfiles.values()).some((w) => w.owner_user_id === this.currentUserId);

    return createSuccess({
      userId: this.currentUserId,
      isAnonymous: Boolean(user.is_anonymous),
      displayName: profile?.display_name || 'Registered User',
      hasWorkerProfile: hasWorker,
    });
  }

  getMyWorkerProfile() {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;
    const worker = Array.from(this.workerProfiles.values()).find((w) => w.owner_user_id === this.currentUserId);
    if (!worker) {
      return createSuccess(null);
    }
    return createSuccess(this.getWorkerNormalized(worker.id));
  }

  signOut() {
    this.currentUserId = null;
    return createSuccess({ signedOut: true });
  }

  saveWorkerProfile({ fields, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const { name, tradeIds = [], localityId, serviceAreaIds = [], yearsExperience = 0, bio = '' } = fields || {};

    if (!name || !name.trim()) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Name is required');
    }
    if (!localityId || !localityId.trim()) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Primary locality is required');
    }

    // Find or create worker profile
    let worker = Array.from(this.workerProfiles.values()).find((w) => w.owner_user_id === this.currentUserId);
    if (!worker) {
      const workerId = crypto.randomUUID();
      worker = {
        id: workerId,
        owner_user_id: this.currentUserId,
        name: name.trim(),
        bio: bio.trim(),
        years_experience: Number(yearsExperience) || 0,
        locality_id: localityId.trim(),
        avatar_url: null,
        availability_opt_in: false,
        availability_expires_at: null,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.workerProfiles.set(workerId, worker);
    } else {
      worker.name = name.trim();
      worker.bio = bio.trim();
      worker.years_experience = Number(yearsExperience) || 0;
      worker.locality_id = localityId.trim();
      worker.updated_at = new Date().toISOString();
    }

    this.workerTrades.set(worker.id, new Set(tradeIds));
    this.workerServiceAreas.set(worker.id, new Set(serviceAreaIds.length ? serviceAreaIds : [localityId]));

    const normalized = this.getWorkerNormalized(worker.id);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  getWorkerNormalized(workerId) {
    const worker = this.workerProfiles.get(workerId);
    if (!worker) return null;

    const trades = Array.from(this.workerTrades.get(workerId) || []);
    const serviceAreas = Array.from(this.workerServiceAreas.get(workerId) || []);

    const reviews = Array.from(this.reviews.values()).filter((r) => r.worker_id === workerId);
    const completedJobs = Array.from(this.jobs.values()).filter(
      (j) => j.worker_id === workerId && ['completed', 'visit_done'].includes(j.state)
    );

    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : null;

    // Check active assignment
    const hasActiveAssignment = Array.from(this.assignments.values()).some(
      (a) => a.worker_id === workerId && a.released_at === null
    );

    return normalizeWorker(
      {
        ...worker,
        has_active_assignment: hasActiveAssignment,
      },
      trades,
      serviceAreas,
      {
        completedJobCount: completedJobs.length,
        reviewCount: reviews.length,
        averageRating: avgRating,
      }
    );
  }

  getWorker({ workerId }) {
    const worker = this.getWorkerNormalized(workerId);
    if (!worker) {
      return createError(ERROR_CODES.NOT_FOUND, 'Worker not found');
    }

    const reviews = Array.from(this.reviews.values())
      .filter((r) => r.worker_id === workerId)
      .map(normalizeReview);

    return createSuccess({ worker, reviews });
  }

  listWorkers({ tradeId, localityId, query, sort = 'recommended', limit = 10 }) {
    let items = Array.from(this.workerProfiles.values()).map((w) => this.getWorkerNormalized(w.id)).filter(w=>w.isAvailableNow);

    if (tradeId) {
      items = items.filter((w) => w.tradeIds.includes(tradeId));
    }
    if (localityId) {
      items = items.filter((w) => w.localityId === localityId || w.serviceAreaIds.includes(localityId));
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter((w) => w.name.toLowerCase().includes(q) || (w.bio && w.bio.toLowerCase().includes(q)));
    }

    // Sort: available now first, then rating
    items.sort((a, b) => {
      if (a.isAvailableNow !== b.isAvailableNow) {
        return a.isAvailableNow ? -1 : 1;
      }
      const ratingA = a.averageRating || 0;
      const ratingB = b.averageRating || 0;
      return ratingB - ratingA;
    });

    const boundedLimit = Math.min(20, Math.max(3, limit));
    const sliced = items.slice(0, boundedLimit);
    return createSuccess({
      items: sliced,
      hasMore: items.length > boundedLimit,
    });
  }

  setAvailability({ available, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const worker = Array.from(this.workerProfiles.values()).find((w) => w.owner_user_id === this.currentUserId);
    if (!worker) {
      return createError(ERROR_CODES.NOT_FOUND, 'Worker profile not found for user');
    }

    worker.availability_opt_in = Boolean(available);
    worker.availability_expires_at = available
      ? new Date(Date.now() + 2 * 3600 * 1000).toISOString()
      : null;
    worker.updated_at = new Date().toISOString();

    const normalized = this.getWorkerNormalized(worker.id);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  createRequest({ workerId, tradeId, localityId, task, pricingPath, audioRef, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    if (!['fixed', 'inspection'].includes(pricingPath)) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'pricingPath must be fixed or inspection');
    }

    if (!task || !task.trim()) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Task is required');
    }

    const worker = this.workerProfiles.get(workerId);
    if (!worker) {
      return createError(ERROR_CODES.NOT_FOUND, 'Worker not found');
    }

    if (worker.owner_user_id === this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'You cannot book yourself');
    }

    // Availability and assignment checks
    const hasActiveAssignment = Array.from(this.assignments.values()).some(
      (a) => a.worker_id === workerId && a.released_at === null
    );
    if (hasActiveAssignment) {
      return createError(ERROR_CODES.WORKER_UNAVAILABLE, 'Worker is currently engaged on another job');
    }

    const now = new Date();
    const expiresAt = worker.availability_expires_at ? new Date(worker.availability_expires_at) : null;
    if (!worker.availability_opt_in || !expiresAt || expiresAt <= now) {
      return createError(ERROR_CODES.WORKER_UNAVAILABLE, 'Worker is not currently available');
    }

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      customer_id: this.currentUserId,
      worker_id: workerId,
      trade_id: tradeId,
      locality_id: localityId,
      task: task.trim(),
      pricing_path: pricingPath,
      state: JOB_STATES.REQUESTED,
      version: 1,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    // Initial message
    const msgId = crypto.randomUUID();
    this.messages.set(msgId, {
      id: msgId,
      job_id: jobId,
      sender_id: this.currentUserId,
      kind: audioRef ? 'audio' : 'text',
      text: task.trim(),
      audio_ref: audioRef || null,
      transcript: null,
      created_at: new Date().toISOString(),
    });

    const normalized = normalizeJob(job);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  listMyJobs({ workspace }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    let jobList = [];
    if (workspace === 'worker') {
      const worker = Array.from(this.workerProfiles.values()).find((w) => w.owner_user_id === this.currentUserId);
      if (!worker) {
        return createSuccess({ items: [] });
      }
      jobList = Array.from(this.jobs.values()).filter((j) => j.worker_id === worker.id);
    } else {
      jobList = Array.from(this.jobs.values()).filter((j) => j.customer_id === this.currentUserId);
    }

    const items = jobList.map((j) => this.getJobNormalized(j.id));
    return createSuccess({ items });
  }

  getJobNormalized(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const latestQuote = Array.from(this.quotes.values())
      .filter((q) => q.job_id === jobId && q.superseded_at === null)
      .sort((a, b) => b.version - a.version)[0] || null;

    const agreement = this.agreements.get(jobId) || null;

    return normalizeJob(job, latestQuote, agreement);
  }

  getJob({ jobId }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    const worker = this.workerProfiles.get(job.worker_id);
    const workerOwnerId = worker ? worker.owner_user_id : null;

    // Participant check
    if (job.customer_id !== this.currentUserId && workerOwnerId !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized to view this job');
    }

    const normalized = this.getJobNormalized(jobId);
    const allowedActions = computeAllowedActions(normalized, this.currentUserId, workerOwnerId);

    return createSuccess({
      job: normalized,
      allowedActions,
    });
  }

  listMessages({ jobId, afterCreatedAt, afterId, limit = 50 }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    const worker = this.workerProfiles.get(job.worker_id);
    const workerOwnerId = worker ? worker.owner_user_id : null;
    if (job.customer_id !== this.currentUserId && workerOwnerId !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized to view messages');
    }

    let msgs = Array.from(this.messages.values())
      .filter((m) => m.job_id === jobId)
      .sort((a, b) => {
        if (a.created_at === b.created_at) {
          return a.id.localeCompare(b.id);
        }
        return new Date(a.created_at) - new Date(b.created_at);
      });

    if (afterCreatedAt && afterId) {
      const idx = msgs.findIndex((m) => m.created_at === afterCreatedAt && m.id === afterId);
      if (idx !== -1) {
        msgs = msgs.slice(idx + 1);
      }
    }

    const sliced = msgs.slice(0, limit);
    return createSuccess({
      items: sliced.map(normalizeMessage),
      hasMore: msgs.length > limit,
    });
  }

  sendMessage({ jobId, kind, text, audioRef, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    const worker = this.workerProfiles.get(job.worker_id);
    const workerOwnerId = worker ? worker.owner_user_id : null;
    if (job.customer_id !== this.currentUserId && workerOwnerId !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized to send messages in this job');
    }

    const msgId = crypto.randomUUID();
    const msg = {
      id: msgId,
      job_id: jobId,
      sender_id: this.currentUserId,
      kind: kind || (audioRef ? 'audio' : 'text'),
      text: text || null,
      audio_ref: audioRef || null,
      transcript: null,
      created_at: new Date().toISOString(),
    };
    this.messages.set(msgId, msg);

    const normalized = normalizeMessage(msg);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  issueQuote({ jobId, expectedVersion, quoteFields, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    const worker = this.workerProfiles.get(job.worker_id);
    if (!worker || worker.owner_user_id !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Only assigned worker can issue quotes');
    }

    if (job.version !== expectedVersion) {
      return createError(
        ERROR_CODES.VERSION_CONFLICT,
        `Expected version ${expectedVersion} but found ${job.version}`
      );
    }

    const {
      purpose,
      scope,
      currency = 'PKR',
      labourMinor = 0,
      visitFeeMinor = 0,
      visitFeeCredited = false,
      materialsPolicy = 'excluded_approval_required',
      expiresAt = null,
    } = quoteFields || {};

    if (![QUOTE_PURPOSES.FIXED_JOB, QUOTE_PURPOSES.INSPECTION_VISIT, QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION].includes(purpose)) {
      return createError(ERROR_CODES.VALIDATION_ERROR, `Invalid quote purpose: ${purpose}`);
    }

    let nextJobState = job.state;
    if ([QUOTE_PURPOSES.FIXED_JOB, QUOTE_PURPOSES.INSPECTION_VISIT].includes(purpose)) {
      if (![JOB_STATES.REQUESTED, JOB_STATES.DISCUSSING, JOB_STATES.QUOTED].includes(job.state)) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `Cannot issue quote from state ${job.state}`);
      }
      nextJobState = JOB_STATES.QUOTED;
    } else if (purpose === QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION) {
      if (![JOB_STATES.VISITING, JOB_STATES.AWAITING_REPAIR_APPROVAL].includes(job.state)) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `Repair quote requires visiting state, currently ${job.state}`);
      }
      nextJobState = JOB_STATES.AWAITING_REPAIR_APPROVAL;
    }

    // Supersede active quote
    for (const q of this.quotes.values()) {
      if (q.job_id === jobId && q.superseded_at === null) {
        q.superseded_at = new Date().toISOString();
      }
    }

    const existingQuotes = Array.from(this.quotes.values()).filter((q) => q.job_id === jobId);
    const nextVersion = existingQuotes.length + 1;

    const quoteId = crypto.randomUUID();
    const quote = {
      id: quoteId,
      job_id: jobId,
      version: nextVersion,
      purpose,
      scope: scope || 'Work agreed with customer',
      currency,
      labour_minor: Number(labourMinor) || 0,
      visit_fee_minor: Number(visitFeeMinor) || 0,
      visit_fee_credited: Boolean(visitFeeCredited),
      materials_policy: materialsPolicy,
      expires_at: expiresAt,
      superseded_at: null,
      created_at: new Date().toISOString(),
    };
    this.quotes.set(quoteId, quote);

    job.state = nextJobState;
    job.version += 1;
    job.updated_at = new Date().toISOString();

    const normalized = this.getJobNormalized(jobId);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  acceptQuote({ jobId, quoteId, expectedVersion, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    if (job.customer_id !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Only customer can accept quote');
    }

    if (job.version !== expectedVersion) {
      return createError(
        ERROR_CODES.VERSION_CONFLICT,
        `Expected version ${expectedVersion} but found ${job.version}`
      );
    }

    const quote = this.quotes.get(quoteId);
    if (!quote || quote.job_id !== jobId) {
      return createError(ERROR_CODES.NOT_FOUND, 'Quote not found for this job');
    }

    if (quote.superseded_at !== null) {
      return createError(ERROR_CODES.QUOTE_STALE, 'Quote has been superseded by a newer version');
    }

    if (quote.expires_at && new Date(quote.expires_at) <= new Date()) {
      return createError(ERROR_CODES.QUOTE_STALE, 'Quote has expired');
    }

    let nextJobState = job.state;

    if (quote.purpose === QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION) {
      if (job.state !== JOB_STATES.AWAITING_REPAIR_APPROVAL) {
        return createError(
          ERROR_CODES.INVALID_TRANSITION,
          `Repair quote requires awaiting_repair_approval, currently ${job.state}`
        );
      }
      nextJobState = JOB_STATES.IN_PROGRESS;
    } else {
      if (job.state !== JOB_STATES.QUOTED) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `Job state must be quoted, currently ${job.state}`);
      }

      // Check worker concurrent active assignment
      const activeAssignment = Array.from(this.assignments.values()).find(
        (a) => a.worker_id === job.worker_id && a.released_at === null && a.job_id !== jobId
      );
      if (activeAssignment) {
        return createError(ERROR_CODES.WORKER_UNAVAILABLE, 'Worker is engaged on another booking');
      }

      // Create / re-acquire assignment
      const assignId = crypto.randomUUID();
      this.assignments.set(assignId, {
        id: assignId,
        job_id: jobId,
        worker_id: job.worker_id,
        acquired_at: new Date().toISOString(),
        released_at: null,
        release_reason: null,
      });

      nextJobState = JOB_STATES.CONFIRMED;
    }

    // Snapshot agreement
    this.agreements.set(jobId, {
      id: crypto.randomUUID(),
      job_id: jobId,
      quote_id: quoteId,
      quote_snapshot: { ...quote },
      accepted_at: new Date().toISOString(),
    });

    job.state = nextJobState;
    job.version += 1;
    job.updated_at = new Date().toISOString();

    const normalized = this.getJobNormalized(jobId);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  transitionJob({ jobId, action, expectedVersion, reason, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    if (job.version !== expectedVersion) {
      return createError(
        ERROR_CODES.VERSION_CONFLICT,
        `Expected version ${expectedVersion} but found ${job.version}`
      );
    }

    const worker = this.workerProfiles.get(job.worker_id);
    const isCustomer = job.customer_id === this.currentUserId;
    const isWorker = worker && worker.owner_user_id === this.currentUserId;

    if (!isCustomer && !isWorker) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized for this job');
    }

    let nextState = job.state;

    if (action === 'respond') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can respond');
      if (job.state !== JOB_STATES.REQUESTED) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `respond requires state requested, currently ${job.state}`);
      }
      nextState = JOB_STATES.DISCUSSING;
    } else if (action === 'decline') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can decline');
      if (![JOB_STATES.REQUESTED, JOB_STATES.DISCUSSING].includes(job.state)) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `decline requires requested/discussing, currently ${job.state}`);
      }
      nextState = JOB_STATES.DECLINED;
    } else if (action === 'start_visit') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can start visit');
      if (job.pricing_path !== PRICING_PATHS.INSPECTION || job.state !== JOB_STATES.CONFIRMED) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `start_visit requires confirmed inspection job`);
      }
      nextState = JOB_STATES.VISITING;
    } else if (action === 'start_work') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can start work');
      if (job.pricing_path !== PRICING_PATHS.FIXED || job.state !== JOB_STATES.CONFIRMED) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `start_work requires confirmed fixed job`);
      }
      nextState = JOB_STATES.IN_PROGRESS;
    } else if (action === 'mark_work_done') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can mark work done');
      if (job.state !== JOB_STATES.IN_PROGRESS) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `mark_work_done requires in_progress, currently ${job.state}`);
      }
      nextState = JOB_STATES.AWAITING_COMPLETION;

      // Release physical assignment
      for (const a of this.assignments.values()) {
        if (a.job_id === jobId && a.released_at === null) {
          a.released_at = new Date().toISOString();
          a.release_reason = 'work_done';
        }
      }
    } else if (action === 'confirm_completion') {
      if (!isCustomer) return createError(ERROR_CODES.FORBIDDEN, 'Only customer can confirm completion');
      if (job.state !== JOB_STATES.AWAITING_COMPLETION) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `confirm_completion requires awaiting_completion`);
      }
      nextState = JOB_STATES.COMPLETED;
    } else if (action === 'decline_repair') {
      if (!isCustomer) return createError(ERROR_CODES.FORBIDDEN, 'Only customer can decline repair');
      if (job.state !== JOB_STATES.AWAITING_REPAIR_APPROVAL) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `decline_repair requires awaiting_repair_approval`);
      }
      nextState = JOB_STATES.VISIT_DONE;

      // Release assignment
      for (const a of this.assignments.values()) {
        if (a.job_id === jobId && a.released_at === null) {
          a.released_at = new Date().toISOString();
          a.release_reason = 'repair_declined';
        }
      }
    } else if (action === 'cancel') {
      if (![JOB_STATES.REQUESTED, JOB_STATES.DISCUSSING, JOB_STATES.QUOTED, JOB_STATES.CONFIRMED].includes(job.state)) {
        return createError(ERROR_CODES.INVALID_TRANSITION, `Cannot cancel from state ${job.state}`);
      }
      nextState = JOB_STATES.CANCELLED;

      // Release assignment
      for (const a of this.assignments.values()) {
        if (a.job_id === jobId && a.released_at === null) {
          a.released_at = new Date().toISOString();
          a.release_reason = reason || 'cancelled';
        }
      }
    } else if (action === 'release_assignment') {
      if (!isWorker) return createError(ERROR_CODES.FORBIDDEN, 'Only worker can release assignment');
      for (const a of this.assignments.values()) {
        if (a.job_id === jobId && a.released_at === null) {
          a.released_at = new Date().toISOString();
          a.release_reason = reason || 'manual_worker_release';
        }
      }
    } else {
      return createError(ERROR_CODES.VALIDATION_ERROR, `Unknown action ${action}`);
    }

    job.state = nextState;
    job.version += 1;
    job.updated_at = new Date().toISOString();

    const normalized = this.getJobNormalized(jobId);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  submitReview({ jobId, rating, punctuality, priceHonoured, text, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    if (job.customer_id !== this.currentUserId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Only customer can submit review');
    }

    if (![JOB_STATES.COMPLETED, JOB_STATES.VISIT_DONE].includes(job.state)) {
      return createError(ERROR_CODES.INVALID_TRANSITION, `Job must be completed/visit_done to leave review`);
    }

    const existingReview = Array.from(this.reviews.values()).find((r) => r.job_id === jobId);
    if (existingReview) {
      return createError(ERROR_CODES.FORBIDDEN, 'Review already submitted for this job');
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Rating must be between 1 and 5');
    }

    const reviewId = crypto.randomUUID();
    const review = {
      id: reviewId,
      job_id: jobId,
      worker_id: job.worker_id,
      author_id: this.currentUserId,
      rating: numRating,
      punctuality: punctuality !== undefined ? Boolean(punctuality) : null,
      price_honoured: priceHonoured !== undefined ? Boolean(priceHonoured) : null,
      text: text || null,
      is_demo: false,
      created_at: new Date().toISOString(),
    };
    this.reviews.set(reviewId, review);

    const workerNormalized = this.getWorkerNormalized(job.worker_id);
    const result = {
      review: normalizeReview(review),
      worker: workerNormalized,
    };

    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, result);
    }
    return createSuccess(result);
  }

  reportIssue({ jobId, reason, expectedVersion, idempotencyKey }) {
    const authErr = this._requireRegisteredUser();
    if (authErr) return authErr;

    if (idempotencyKey) {
      const key = `${this.currentUserId}:${idempotencyKey}`;
      if (this.mutationKeys.has(key)) {
        return createSuccess(this.mutationKeys.get(key));
      }
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    if (job.version !== expectedVersion) {
      return createError(ERROR_CODES.VERSION_CONFLICT, `Expected version ${expectedVersion}`);
    }

    const worker = this.workerProfiles.get(job.worker_id);
    const isCustomer = job.customer_id === this.currentUserId;
    const isWorker = worker && worker.owner_user_id === this.currentUserId;
    if (!isCustomer && !isWorker) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized for this job');
    }

    job.state = JOB_STATES.ISSUE_OPEN;
    job.version += 1;
    job.updated_at = new Date().toISOString();

    this.reports.push({
      id: crypto.randomUUID(),
      reporter_id: this.currentUserId,
      job_id: jobId,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    const normalized = this.getJobNormalized(jobId);
    if (idempotencyKey) {
      this.mutationKeys.set(`${this.currentUserId}:${idempotencyKey}`, normalized);
    }
    return createSuccess(normalized);
  }

  uploadAudio({ blob, purpose, jobId }) {
    if (!blob) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'Audio blob is required');
    }
    const audioRef = `audio/${crypto.randomUUID()}.webm`;
    const fakeUrl = `blob:roshan-rozgar-audio/${audioRef}`;
    this.audioBlobs.set(audioRef, {
      blob,
      url: fakeUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    return createSuccess({
      audioRef,
      durationSeconds: 15,
    });
  }

  getAudioPlaybackUrl({ audioRef }) {
    if (!audioRef) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'audioRef is required');
    }
    const entry = this.audioBlobs.get(audioRef);
    if (entry) {
      return createSuccess({
        url: entry.url,
        expiresAt: entry.expiresAt,
      });
    }
    return createSuccess({
      url: `/audio/${encodeURIComponent(audioRef)}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  }
}

export const defaultStore = new InMemoryStore();
