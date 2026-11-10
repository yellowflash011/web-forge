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
import { defaultStore } from './in_memory.js';
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
 * Reuses existing or creates configured anonymous auth session.
 */
export async function ensureSession() {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.ensureSession();
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return createError(ERROR_CODES.NETWORK_ERROR, sessionError.message, true);
    }

    let authUser = session?.user;
    if (!authUser) {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        return createError(ERROR_CODES.UNAUTHENTICATED, anonError.message, false);
      }
      authUser = anonData?.user;
    }

    if (!authUser) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Failed to establish session');
    }

    // Check if worker profile exists
    const { data: worker } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('owner_user_id', authUser.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', authUser.id)
      .maybeSingle();

    return createSuccess(normalizeSession(authUser, Boolean(worker), profile?.display_name));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 2. getSession
 * Returns current session or null.
 */
export async function getSession() {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.getSession();
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createSuccess(null);
    }

    const authUser = session.user;
    const { data: worker } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('owner_user_id', authUser.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', authUser.id)
      .maybeSingle();

    return createSuccess(normalizeSession(authUser, Boolean(worker), profile?.display_name));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 2b. getMyWorkerProfile
 * Input: none; authenticated caller only.
 * Returns Worker or null if no worker profile exists.
 */
export async function getMyWorkerProfile() {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.getMyWorkerProfile();
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Must be logged in');
    }

    const { data: workerRow, error: workerError } = await supabase
      .from('worker_profiles')
      .select(`
        *,
        worker_trades(trade_id),
        worker_service_areas(locality_id)
      `)
      .eq('owner_user_id', session.user.id)
      .maybeSingle();

    if (workerError) {
      return createError(ERROR_CODES.NETWORK_ERROR, workerError.message, true);
    }

    if (!workerRow) {
      return createSuccess(null);
    }

    const trades = workerRow.worker_trades?.map((t) => t.trade_id) || [];
    const areas = workerRow.worker_service_areas?.map((a) => a.locality_id) || [];
    const normalized = normalizeWorker(workerRow, trades, areas);

    return createSuccess(normalized);
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 3. signOut
 */
export async function signOut() {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.signOut();
  }

  try {
    await supabase.auth.signOut();
    return createSuccess({ signedOut: true });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 4. saveWorkerProfile
 * Input: { fields: { name, tradeIds, localityId, serviceAreaIds, yearsExperience, bio }, idempotencyKey }
 */
export async function saveWorkerProfile({ fields, idempotencyKey } = {}) {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.saveWorkerProfile({ fields, idempotencyKey });
  }

  try {
    const { data, error } = await supabase.rpc('rpc_save_worker_profile', {
      p_name: fields?.name,
      p_trade_ids: fields?.tradeIds || [],
      p_locality_id: fields?.localityId,
      p_service_area_ids: fields?.serviceAreaIds || [],
      p_years_experience: fields?.yearsExperience !== undefined ? Number(fields.yearsExperience) : null,
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
export async function getWorker({ workerId } = {}) {
  if (!workerId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'workerId is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.getWorker({ workerId });
  }

  try {
    const { data: workerRow, error: workerError } = await supabase
      .from('worker_profiles')
      .select(`
        *,
        worker_trades(trade_id),
        worker_service_areas(locality_id)
      `)
      .eq('id', workerId)
      .maybeSingle();

    if (workerError || !workerRow) {
      return createError(ERROR_CODES.NOT_FOUND, 'Worker not found');
    }

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    const trades = workerRow.worker_trades?.map((t) => t.trade_id) || [];
    const areas = workerRow.worker_service_areas?.map((a) => a.locality_id) || [];

    const reviews = (reviewsData || []).map(normalizeReview);
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
        : null;

    const worker = normalizeWorker(workerRow, trades, areas, {
      completedJobCount: reviews.length,
      reviewCount: reviews.length,
      averageRating: avgRating,
    });

    return createSuccess({ worker, reviews });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 6. listWorkers
 * Input: { tradeId?, localityId, query?, sort: 'recommended' | 'nearest', limit: 3..20 }
 */
export async function listWorkers({ tradeId, localityId, query, sort = 'recommended', limit = 10 } = {}) {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.listWorkers({ tradeId, localityId, query, sort, limit });
  }

  try {
    let queryBuilder = supabase
      .from('worker_profiles')
      .select(`
        *,
        worker_trades(trade_id),
        worker_service_areas(locality_id)
      `);

    if (localityId) {
      queryBuilder = queryBuilder.eq('locality_id', localityId);
    }

    const { data: rows, error } = await queryBuilder;
    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, error.message, true);
    }

    let items = (rows || []).map((row) => {
      const trades = row.worker_trades?.map((t) => t.trade_id) || [];
      const areas = row.worker_service_areas?.map((a) => a.locality_id) || [];
      return normalizeWorker(row, trades, areas);
    });

    if (tradeId) {
      items = items.filter((w) => w.tradeIds.includes(tradeId));
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
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    const boundedLimit = Math.min(20, Math.max(3, Number(limit) || 10));
    return createSuccess({
      items: items.slice(0, boundedLimit),
      hasMore: items.length > boundedLimit,
    });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 7. setAvailability
 * Input: { available, idempotencyKey }
 */
export async function setAvailability({ available, idempotencyKey } = {}) {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.setAvailability({ available, idempotencyKey });
  }

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
export async function createRequest({
  workerId,
  tradeId,
  localityId,
  task,
  pricingPath,
  audioRef,
  idempotencyKey,
} = {}) {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.createRequest({
      workerId,
      tradeId,
      localityId,
      task,
      pricingPath,
      audioRef,
      idempotencyKey,
    });
  }

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
export async function listMyJobs({ workspace = 'customer' } = {}) {
  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.listMyJobs({ workspace });
  }

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
      const agreement = (row.agreements || [])[0] || null;
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
export async function getJob({ jobId } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.getJob({ jobId });
  }

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
    const agreement = (jobRow.agreements || [])[0] || null;

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
export async function listMessages({ jobId, afterCreatedAt, afterId, limit = 50 } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.listMessages({ jobId, afterCreatedAt, afterId, limit });
  }

  try {
    let queryBuilder = supabase
      .from('messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (afterCreatedAt) {
      queryBuilder = queryBuilder.gt('created_at', afterCreatedAt);
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
export async function sendMessage({ jobId, kind, text, audioRef, idempotencyKey } = {}) {
  if (!jobId) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.sendMessage({ jobId, kind, text, audioRef, idempotencyKey });
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return createError(ERROR_CODES.UNAUTHENTICATED, 'Must be logged in');
    }

    const { data: row, error } = await supabase
      .from('messages')
      .insert({
        job_id: jobId,
        sender_id: session.user.id,
        kind: kind || (audioRef ? 'audio' : 'text'),
        text: text || null,
        audio_ref: audioRef || null,
      })
      .select()
      .single();

    if (error) {
      return createError(ERROR_CODES.FORBIDDEN, error.message);
    }

    return createSuccess(normalizeMessage(row));
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 13. issueQuote
 * Input: { jobId, expectedVersion, quoteFields, idempotencyKey }
 */
export async function issueQuote({ jobId, expectedVersion, quoteFields, idempotencyKey } = {}) {
  if (!jobId || expectedVersion === undefined || !quoteFields) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing required fields for quote issuance');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.issueQuote({ jobId, expectedVersion, quoteFields, idempotencyKey });
  }

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
export async function acceptQuote({ jobId, quoteId, expectedVersion, idempotencyKey } = {}) {
  if (!jobId || !quoteId || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing required fields for quote acceptance');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.acceptQuote({ jobId, quoteId, expectedVersion, idempotencyKey });
  }

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
export async function transitionJob({ jobId, action, expectedVersion, reason, idempotencyKey } = {}) {
  if (!jobId || !action || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Missing parameters for job transition');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.transitionJob({ jobId, action, expectedVersion, reason, idempotencyKey });
  }

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
export async function submitReview({ jobId, rating, punctuality, priceHonoured, text, idempotencyKey } = {}) {
  if (!jobId || !rating) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId and rating are required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.submitReview({ jobId, rating, punctuality, priceHonoured, text, idempotencyKey });
  }

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
export async function reportIssue({ jobId, reason, expectedVersion, idempotencyKey } = {}) {
  if (!jobId || !reason || expectedVersion === undefined) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'jobId, reason and expectedVersion are required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.reportIssue({ jobId, reason, expectedVersion, idempotencyKey });
  }

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
export async function uploadAudio({ blob, purpose = 'onboarding', jobId, idempotencyKey } = {}) {
  if (!blob) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'Audio blob is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.uploadAudio({ blob, purpose, jobId });
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'anonymous';
    const filename = `${userId}/${purpose}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webm`;

    const { data, error } = await supabase.storage.from('job-audio').upload(filename, blob, {
      contentType: blob.type || 'audio/webm',
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
export async function getAudioPlaybackUrl({ audioRef } = {}) {
  if (!audioRef) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'audioRef is required');
  }

  const supabase = await getActiveClient();
  if (!supabase) {
    return defaultStore.getAudioPlaybackUrl({ audioRef });
  }

  try {
    const { data, error } = await supabase.storage.from('job-audio').createSignedUrl(audioRef, 3600);
    if (error) {
      return createError(ERROR_CODES.NETWORK_ERROR, error.message, true);
    }

    return createSuccess({
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (err) {
    return createError(ERROR_CODES.NETWORK_ERROR, err.message, true);
  }
}

/**
 * 20. extractVoice
 * Input: { audioRef, purpose: 'worker_profile' | 'job_request', locale: 'ur' | 'en' }
 */
export async function extractVoice({ audioRef, purpose, locale = 'ur' } = {}) {
  return runVoiceExtraction({ audioRef, purpose, locale });
}
