// Browser service contract v1 implementation for Roshan Rozgar
// Machine B ownership: provides authoritative domain rules, Supabase integration, and normalized data shapes

import { getSupabaseBrowserClient } from '../supabase/client.js';
import {
  ERROR_CODES,
  JOB_STATES,
  PRICING_PATHS,
  QUOTE_PURPOSES,
  SUPPORTED_TRADES,
  SUPPORTED_LOCALITIES,
  createError,
  createSuccess,
  computeAllowedActions,
  normalizeSession,
  normalizeWorker,
  normalizeJob,
  normalizeQuote,
  normalizeMessage,
  normalizeReview,
  calculateQuoteTotal,
} from './domain.js';
import { extractVoice as runVoiceExtraction } from './voice.js';

export {
  ERROR_CODES,
  JOB_STATES,
  PRICING_PATHS,
  QUOTE_PURPOSES,
  SUPPORTED_TRADES,
  SUPPORTED_LOCALITIES,
  calculateQuoteTotal,
  computeAllowedActions,
};

async function getActiveClient() {
  return await getSupabaseBrowserClient();
}

/**
 * 1. ensureSession
 * Requires an existing registered user session.
 */
async function ensureSessionImpl() {
  const supabase = await getActiveClient();

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return createError(ERROR_CODES.NETWORK_ERROR, sessionError.message, true);
    }

    const authUser = session?.user;
    if (!authUser || authUser.is_anonymous) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }

    if (authUser.email && !authUser.email_confirmed_at && !authUser.confirmed_at) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Please confirm your email address before signing in.');
    }

    // Check if worker profile exists
    const { data: worker, error: workerError } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('owner_user_id', authUser.id)
      .maybeSingle();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if(workerError||profileError)return createError(ERROR_CODES.NETWORK_ERROR,'Your session is active, but profile data could not load. Verify database migrations.',true);
    return createSuccess(normalizeSession(authUser, Boolean(worker), profile?.display_name));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 2. getSession
 * Returns current session or null.
 */
async function getSessionImpl() {
  const supabase = await getActiveClient();

  try {
    const { data: { session }, error:sessionError } = await supabase.auth.getSession();
    if(sessionError)return createError(ERROR_CODES.NETWORK_ERROR,'Your session could not be restored.',true);
    if (!session?.user || session.user.is_anonymous) {
      return createSuccess(null);
    }

    const authUser = session.user;
    if (authUser.email && !authUser.email_confirmed_at && !authUser.confirmed_at) {
      return createSuccess(null);
    }

    const { data: worker, error: workerError } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('owner_user_id', authUser.id)
      .maybeSingle();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if(workerError||profileError)return createError(ERROR_CODES.NETWORK_ERROR,'Profile data could not load. Verify database migrations.',true);
    return createSuccess(normalizeSession(authUser, Boolean(worker), profile?.display_name));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 3. signOut
 */
async function signOutImpl() {
  const supabase = await getActiveClient();

  try {
    const {error}=await supabase.auth.signOut();
    if(error)return createError(ERROR_CODES.NETWORK_ERROR,'Sign out did not finish. Please retry.',true);
    return createSuccess({ signedOut: true });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * register ({ email, password, displayName, redirectTo })
 * Register new user with email/password and display name.
 */
async function registerImpl({ email, password, displayName, redirectTo } = {}) {
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Provide a valid email address.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Password must be at least 6 characters.');
  }
  const cleanName = typeof displayName === 'string' ? displayName.trim().slice(0, 80) : '';

  const supabase = await getActiveClient();
  try {
    const redirectUrl = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: cleanName ? { display_name: cleanName } : {},
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        return createError(ERROR_CODES.VALIDATION_ERROR, 'An account with this email already exists.');
      }
      return createError(ERROR_CODES.VALIDATION_ERROR, error.message);
    }

    if (!data?.user) {
      return createError(ERROR_CODES.NETWORK_ERROR, 'Registration could not be completed. Please retry.');
    }

    if (data.user.identities && data.user.identities.length === 0) {
      return createError(ERROR_CODES.VALIDATION_ERROR, 'An account with this email already exists.');
    }

    if (cleanName && data.session) {
      await supabase.from('profiles').upsert({ id: data.user.id, display_name: cleanName }).catch(() => {});
    }

    const sessionConfirmed = Boolean(data.session && (data.user.email_confirmed_at || data.user.confirmed_at));
    const confirmationRequired = !data.session || (!data.user.email_confirmed_at && !data.user.confirmed_at);

    return createSuccess({
      user: normalizeSession(data.user, false, cleanName),
      sessionConfirmed,
      confirmationRequired,
      message: confirmationRequired ? 'Check your email to confirm your account.' : 'Account registered successfully.',
    });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * signIn ({ email, password })
 * Sign in with email/password.
 */
async function signInImpl({ email, password } = {}) {
  if (!email || !password) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Email and password are required.');
  }

  const supabase = await getActiveClient();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return createError(ERROR_CODES.UNAUTHENTICATED, 'Please confirm your email address before signing in.');
      }
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Invalid email or password.');
    }

    if (!data?.user || data.user.is_anonymous) {
      await supabase.auth.signOut().catch(() => {});
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Sign in with a registered account.');
    }

    const { data: worker } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('owner_user_id', data.user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    return createSuccess(normalizeSession(data.user, Boolean(worker), profile?.display_name));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * requestPasswordReset ({ email, redirectTo })
 */
async function requestPasswordResetImpl({ email, redirectTo } = {}) {
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Provide a valid email address.');
  }

  const supabase = await getActiveClient();
  try {
    const redirectUrl = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, 'Password reset request could not be sent. Please retry.', true);
    }

    return createSuccess({ sent: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * resetPassword ({ newPassword })
 */
async function resetPasswordImpl({ newPassword } = {}) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Password must be at least 6 characters.');
  }

  const supabase = await getActiveClient();
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return createError(ERROR_CODES.VALIDATION_ERROR, error.message);
    }

    return createSuccess({ updated: true, message: 'Password updated successfully.' });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 4. saveWorkerProfile
 * Input: { fields: { name, tradeIds, localityId, serviceAreaIds, yearsExperience, bio }, idempotencyKey }
 */
async function saveWorkerProfileImpl({ fields, idempotencyKey } = {}) {
  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_save_worker_profile', {
      p_name: fields?.name,
      p_trade_ids: fields?.tradeIds || [],
      p_locality_id: fields?.localityId,
      p_service_area_ids: fields?.serviceAreaIds || [],
    p_years_experience: fields?.yearsExperience != null ? Number(fields.yearsExperience) : null,
      p_bio: fields?.bio || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const code = error.message.includes('UNAUTHENTICATED')
        ? ERROR_CODES.UNAUTHENTICATED
        : error.message.includes('VALIDATION_ERROR')
        ? ERROR_CODES.VALIDATION_ERROR
        : ERROR_CODES.NETWORK_ERROR;
      return createError(code, error.message);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 5. getWorker
 * Input: { workerId }
 */
async function getWorkerImpl({workerId}={}){
 if(!workerId)return createError(ERROR_CODES.VALIDATION_ERROR,'workerId is required');
 const supabase=await getActiveClient();
 const {data:worker,error}=await supabase.rpc('rpc_worker_summary',{p_worker_id:workerId});
 if(error)return createError(ERROR_CODES.NETWORK_ERROR,'Could not load this professional. Verify integration migrations are installed.',true);
 if(!worker)return createError(ERROR_CODES.NOT_FOUND,'Professional not found');
 const {data:reviews,error:reviewError}=await supabase.from('reviews').select('*').eq('worker_id',workerId).order('created_at',{ascending:false}).limit(50);
 if(reviewError)return createError(ERROR_CODES.NETWORK_ERROR,'Could not load reviews.',true);
 return createSuccess({worker,reviews:(reviews||[]).map(normalizeReview)});
}

/**
 * 6. listWorkers
 * Input: { tradeId?, localityId, query?, sort: 'recommended' | 'nearest', limit: 3..20 }
 */
async function listWorkersImpl({tradeId,localityId,query='',sort='recommended',limit=10}={}){
 if(!SUPPORTED_LOCALITIES.includes(localityId)||tradeId&&!SUPPORTED_TRADES.includes(tradeId))return createError(ERROR_CODES.VALIDATION_ERROR,'Choose a supported area and skill.');
 const supabase=await getActiveClient();
 const {data,error}=await supabase.rpc('rpc_discover_workers',{p_trade_id:tradeId||null,p_locality_id:localityId,p_query:query,p_sort:sort,p_limit:Math.min(20,Math.max(3,Number(limit)||10))});
 if(error)return createError(ERROR_CODES.NETWORK_ERROR,'Discovery could not load. Verify integration migrations are installed.',true);
 return createSuccess(data);
}

/**
 * 7. setAvailability
 * Input: { available, idempotencyKey }
 */
async function setAvailabilityImpl({ available, idempotencyKey } = {}) {
  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_set_availability', {
      p_available: Boolean(available),
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const code = error.message.includes('UNAUTHENTICATED')
        ? ERROR_CODES.UNAUTHENTICATED
        : error.message.includes('NOT_FOUND')
        ? ERROR_CODES.NOT_FOUND
        : ERROR_CODES.NETWORK_ERROR;
      return createError(code, error.message);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 8. createRequest
 * Input: { workerId, tradeId, localityId, task, pricingPath, audioRef?, idempotencyKey }
 */
async function createRequestImpl({
  workerId,
  tradeId,
  localityId,
  task,
  pricingPath,
  audioRef,
  idempotencyKey,
} = {}) {
  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_create_job_request', {
      p_worker_id: workerId,
      p_trade_id: tradeId,
      p_locality_id: localityId,
      p_task: task,
      p_pricing_path: pricingPath,
      p_audio_ref: audioRef || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('VALIDATION_ERROR')) code = ERROR_CODES.VALIDATION_ERROR;
      else if (msg.includes('WORKER_UNAVAILABLE')) code = ERROR_CODES.WORKER_UNAVAILABLE;
      else if (msg.includes('NOT_FOUND')) code = ERROR_CODES.NOT_FOUND;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 9. listMyJobs
 * Input: { workspace: 'customer' | 'worker' }
 */
async function listMyJobsImpl({ workspace = 'customer' } = {}) {
  const supabase = await getActiveClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Must be logged in');
    }
    const userId = session.user.id;

    let queryBuilder = supabase.from('jobs').select(`
      *,
      quotes(*),
      agreements(*)
    `);

    if (workspace === 'worker') {
      const { data: worker } = await supabase
        .from('worker_profiles')
        .select('id')
        .eq('owner_user_id', userId)
        .maybeSingle();

      if (!worker) {
        return createSuccess({ items: [] });
      }
      queryBuilder = queryBuilder.eq('worker_id', worker.id);
    } else {
      queryBuilder = queryBuilder.eq('customer_id', userId);
    }

    const { data: rows, error } = await queryBuilder.order('created_at', { ascending: false });
    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, error.message, true);
    }

    const items = (rows || []).map((row) => {
      const activeQuote = (row.quotes || [])
        .filter((q) => !q.superseded_at)
        .sort((a, b) => b.version - a.version)[0] || null;
      const agreement = Array.isArray(row.agreements) ? row.agreements[0] : row.agreements;
      return normalizeJob(row, activeQuote, agreement);
    });

    return createSuccess({ items });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 10. getJob
 * Input: { jobId }
 */
async function getJobImpl({ jobId } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Must be logged in');
    }
    const userId = session.user.id;

    const { data: jobRow, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        worker_profiles(owner_user_id),
        quotes(*),
        agreements(*)
      `)
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !jobRow) {
      return createError(ERROR_CODES.NOT_FOUND, 'Job not found');
    }

    const workerOwnerId = jobRow.worker_profiles?.owner_user_id;
    if (jobRow.customer_id !== userId && workerOwnerId !== userId) {
      return createError(ERROR_CODES.FORBIDDEN, 'Not authorized to view this job');
    }

    const activeQuote = (jobRow.quotes || [])
      .filter((q) => !q.superseded_at)
      .sort((a, b) => b.version - a.version)[0] || null;
    const agreement = Array.isArray(jobRow.agreements) ? jobRow.agreements[0] : jobRow.agreements;

    const normalized = normalizeJob(jobRow, activeQuote, agreement);
    const allowedActions = computeAllowedActions(normalized, userId, workerOwnerId);

    return createSuccess({ job: normalized, allowedActions });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 11. listMessages
 * Input: { jobId, afterCreatedAt?, afterId?, limit? }
 */
async function listMessagesImpl({ jobId, afterCreatedAt, afterId, limit = 50 } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();

  try {
    let queryBuilder = supabase
      .from('messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (afterCreatedAt) {
      if (!Number.isFinite(Date.parse(afterCreatedAt)) || afterId && !/^[0-9a-f-]{36}$/i.test(afterId)) return createError(ERROR_CODES.VALIDATION_ERROR,'Invalid message cursor');
      const timestamp=new Date(afterCreatedAt).toISOString();
      queryBuilder = afterId ? queryBuilder.or(`created_at.gt.${timestamp},and(created_at.eq.${timestamp},id.gt.${afterId})`) : queryBuilder.gt('created_at',timestamp);
    }

    const { data: rows, error } = await queryBuilder.limit(limit);
    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, error.message, true);
    }

    const items = (rows || []).map(normalizeMessage);
    return createSuccess({
      items,
      hasMore: items.length >= limit,
    });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 12. sendMessage
 * Input: { jobId, kind, text?, audioRef?, idempotencyKey }
 */
async function sendMessageImpl({ jobId, kind, text, audioRef, idempotencyKey } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Must be logged in');
    }

    const { data, error } = await supabase.rpc('rpc_send_message',{
      p_job_id:jobId,p_kind:kind||(audioRef?'audio':'text'),p_text:text||null,p_audio_ref:audioRef||null,p_idempotency_key:idempotencyKey||null,
    });

    if (error) {
      return createError(ERROR_CODES.FORBIDDEN, error.message);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 13. issueQuote
 * Input: { jobId, expectedVersion, quoteFields, idempotencyKey }
 */
async function issueQuoteImpl({ jobId, expectedVersion, quoteFields, idempotencyKey } = {}) {
  if (!jobId || expectedVersion === undefined || !quoteFields) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing required fields for quote issuance');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_issue_quote', {
      p_job_id: jobId,
      p_expected_version: Number(expectedVersion),
      p_purpose: quoteFields.purpose,
      p_scope: quoteFields.scope || 'Work agreed with customer',
      p_labour_minor: Number(quoteFields.labourMinor) || 0,
      p_visit_fee_minor: Number(quoteFields.visitFeeMinor) || 0,
      p_visit_fee_credited: Boolean(quoteFields.visitFeeCredited),
      p_materials_policy: quoteFields.materialsPolicy || 'excluded_approval_required',
      p_expires_at: quoteFields.expiresAt || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('VERSION_CONFLICT')) code = ERROR_CODES.VERSION_CONFLICT;
      else if (msg.includes('INVALID_TRANSITION')) code = ERROR_CODES.INVALID_TRANSITION;
      else if (msg.includes('VALIDATION_ERROR')) code = ERROR_CODES.VALIDATION_ERROR;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 14. acceptQuote
 * Input: { jobId, quoteId, expectedVersion, idempotencyKey }
 */
async function acceptQuoteImpl({ jobId, quoteId, expectedVersion, idempotencyKey } = {}) {
  if (!jobId || !quoteId || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing required fields for quote acceptance');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_accept_quote', {
      p_job_id: jobId,
      p_quote_id: quoteId,
      p_expected_version: Number(expectedVersion),
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('VERSION_CONFLICT')) code = ERROR_CODES.VERSION_CONFLICT;
      else if (msg.includes('QUOTE_STALE')) code = ERROR_CODES.QUOTE_STALE;
      else if (msg.includes('WORKER_UNAVAILABLE')) code = ERROR_CODES.WORKER_UNAVAILABLE;
      else if (msg.includes('INVALID_TRANSITION')) code = ERROR_CODES.INVALID_TRANSITION;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 15. transitionJob
 * Input: { jobId, action, expectedVersion, reason?, idempotencyKey }
 */
async function transitionJobImpl({ jobId, action, expectedVersion, reason, idempotencyKey } = {}) {
  if (!jobId || !action || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing parameters for job transition');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_transition_job', {
      p_job_id: jobId,
      p_action: action,
      p_expected_version: Number(expectedVersion),
      p_reason: reason || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('VERSION_CONFLICT')) code = ERROR_CODES.VERSION_CONFLICT;
      else if (msg.includes('INVALID_TRANSITION')) code = ERROR_CODES.INVALID_TRANSITION;
      else if (msg.includes('VALIDATION_ERROR')) code = ERROR_CODES.VALIDATION_ERROR;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 16. submitReview
 * Input: { jobId, rating, punctuality?, priceHonoured?, text?, idempotencyKey }
 */
async function submitReviewImpl({ jobId, rating, punctuality, priceHonoured, text, idempotencyKey } = {}) {
  if (!jobId || !rating) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId and rating are required');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_submit_review', {
      p_job_id: jobId,
      p_rating: Number(rating),
      p_punctuality: punctuality !== undefined ? Boolean(punctuality) : null,
      p_price_honoured: priceHonoured !== undefined ? Boolean(priceHonoured) : null,
      p_text: text || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('INVALID_TRANSITION')) code = ERROR_CODES.INVALID_TRANSITION;
      else if (msg.includes('VALIDATION_ERROR')) code = ERROR_CODES.VALIDATION_ERROR;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 17. reportIssue
 * Input: { jobId, reason, expectedVersion, idempotencyKey }
 */
async function reportIssueImpl({ jobId, reason, expectedVersion, idempotencyKey } = {}) {
  if (!jobId || !reason || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId, reason and expectedVersion are required');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.rpc('rpc_report_issue', {
      p_job_id: jobId,
      p_reason: reason,
      p_expected_version: Number(expectedVersion),
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      const msg = error.message;
      let code = ERROR_CODES.NETWORK_ERROR;
      if (msg.includes('UNAUTHENTICATED')) code = ERROR_CODES.UNAUTHENTICATED;
      else if (msg.includes('FORBIDDEN')) code = ERROR_CODES.FORBIDDEN;
      else if (msg.includes('VERSION_CONFLICT')) code = ERROR_CODES.VERSION_CONFLICT;
      return createError(code, msg);
    }

    return createSuccess(data);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 18. uploadAudio
 * Input: { blob, purpose: 'onboarding' | 'request' | 'message', jobId?, idempotencyKey }
 */
async function uploadAudioImpl({ blob, purpose = 'onboarding', jobId, idempotencyKey } = {}) {
  if (!blob) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Audio blob is required');
  }

  const supabase = await getActiveClient();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if(!session?.user)return createError(ERROR_CODES.UNAUTHENTICATED,'Start a session before uploading audio.');
    if(!['onboarding','request','message'].includes(purpose))return createError(ERROR_CODES.VALIDATION_ERROR,'Invalid recording purpose.');
    const mimeType=blob.type.split(';')[0].toLowerCase();
    const extensions={'audio/webm':'webm','audio/ogg':'ogg','audio/wav':'wav','audio/mpeg':'mp3','audio/mp4':'mp4','audio/aac':'aac'};
    if(!blob.size||blob.size>5*1024*1024||!extensions[mimeType])return createError(ERROR_CODES.VALIDATION_ERROR,'Choose a supported recording under 5 MB.');
    if(purpose==='message'){
      if(!jobId)return createError(ERROR_CODES.VALIDATION_ERROR,'A conversation is required.');
      const access=await getJobImpl({jobId});if(access.error)return access;
    }
    const userId = session.user.id;
    const filename = `${userId}/${purpose}/${crypto.randomUUID()}.${extensions[mimeType]}`;

    const { data, error } = await supabase.storage.from('job-audio').upload(filename, blob, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      return createError(ERROR_CODES.UPLOAD_FAILED, error.message, true);
    }

    return createSuccess({
      audioRef: data.path,
      durationSeconds: null,
    });
  } catch (err) {
    return createError(ERROR_CODES.UPLOAD_FAILED, err.message, true);
  }
}

/**
 * 19. getAudioPlaybackUrl
 * Input: { audioRef }
 */
async function getAudioPlaybackUrlImpl({ audioRef } = {}) {
  if (!audioRef) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'audioRef is required');
  }

  const supabase = await getActiveClient();

  try {
    const { data, error } = await supabase.storage.from('job-audio').createSignedUrl(audioRef, 300);
    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, error.message, true);
    }

    return createSuccess({
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
    });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 20. extractVoice
 * Input: { audioRef, purpose: 'worker_profile' | 'job_request', locale: 'ur' | 'en' }
 */
async function extractVoiceImpl({ audioRef, purpose, locale = 'ur' } = {}) {
  return runVoiceExtraction({ audioRef, purpose, locale });
}

// Normalize setup/network exceptions, including client initialization failures.
const exposed = fn => async (...args) => { try { return await fn(...args); } catch (err) { return createError(err.code || ERROR_CODES.NETWORK_ERROR, err.message || "Operation failed", true); } };
export const ensureSession = exposed(ensureSessionImpl);
export const getSession = exposed(getSessionImpl);
export const signOut = exposed(signOutImpl);
export const saveWorkerProfile = exposed(saveWorkerProfileImpl);
export const getWorker = exposed(getWorkerImpl);
export const listWorkers = exposed(listWorkersImpl);
export const setAvailability = exposed(setAvailabilityImpl);
export const createRequest = exposed(createRequestImpl);
export const listMyJobs = exposed(listMyJobsImpl);
export const getJob = exposed(getJobImpl);
export const listMessages = exposed(listMessagesImpl);
export const sendMessage = exposed(sendMessageImpl);
export const issueQuote = exposed(issueQuoteImpl);
export const acceptQuote = exposed(acceptQuoteImpl);
export const transitionJob = exposed(transitionJobImpl);
export const submitReview = exposed(submitReviewImpl);
export const reportIssue = exposed(reportIssueImpl);
export const uploadAudio = exposed(uploadAudioImpl);
export const getAudioPlaybackUrl = exposed(getAudioPlaybackUrlImpl);
export const extractVoice = exposed(extractVoiceImpl);
export const register = exposed(registerImpl);
export const signUp = exposed(registerImpl);
export const signIn = exposed(signInImpl);
export const signInWithPassword = exposed(signInImpl);
export const requestPasswordReset = exposed(requestPasswordResetImpl);
export const resetPasswordForEmail = exposed(requestPasswordResetImpl);
export const resetPassword = exposed(resetPasswordImpl);
export const updatePassword = exposed(resetPasswordImpl);

export const getMyWorkerProfile = exposed(async()=>{
 const supabase=await getActiveClient();
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError||!session?.user||session.user.is_anonymous)return createError(ERROR_CODES.UNAUTHENTICATED,'Start a session first.');
 const {data,error}=await supabase.rpc('rpc_my_worker_profile');
 return error?createError(ERROR_CODES.NETWORK_ERROR,'Could not restore your worker profile. Verify integration migrations are installed.',true):createSuccess(data);
});

