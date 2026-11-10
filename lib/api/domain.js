// Domain rules, state machine validation, calculations and entity normalization
// Authoritative definitions for Roshan Rozgar

export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  QUOTE_STALE: 'QUOTE_STALE',
  WORKER_UNAVAILABLE: 'WORKER_UNAVAILABLE',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

export const JOB_STATES = {
  REQUESTED: 'requested',
  DISCUSSING: 'discussing',
  QUOTED: 'quoted',
  CONFIRMED: 'confirmed',
  VISITING: 'visiting',
  AWAITING_REPAIR_APPROVAL: 'awaiting_repair_approval',
  IN_PROGRESS: 'in_progress',
  AWAITING_COMPLETION: 'awaiting_completion',
  COMPLETED: 'completed',
  VISIT_DONE: 'visit_done',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  ISSUE_OPEN: 'issue_open',
};

export const PRICING_PATHS = {
  FIXED: 'fixed',
  INSPECTION: 'inspection',
};

export const QUOTE_PURPOSES = {
  FIXED_JOB: 'fixed_job',
  INSPECTION_VISIT: 'inspection_visit',
  REPAIR_AFTER_INSPECTION: 'repair_after_inspection',
};

export const SUPPORTED_TRADES = ['plumber', 'electrician'];

export const SUPPORTED_LOCALITIES = [
  'g-10-islamabad',
  'g-9-islamabad',
  'g-11-islamabad',
];

export function createError(code, message, retryable = false) {
  return {
    data: null,
    error: {
      code,
      message,
      retryable,
    },
  };
}

export function createSuccess(data) {
  return {
    data,
    error: null,
  };
}

// Deterministic Quote Total Calculation in minor units (paisa)
export function calculateQuoteTotal({
  purpose,
  labourMinor = 0,
  visitFeeMinor = 0,
  visitFeeCredited = false,
  previousVisitFeeMinor = 0,
}) {
  const labour = Math.max(0, Number(labourMinor) || 0);
  const visitFee = Math.max(0, Number(visitFeeMinor) || 0);

  if (purpose === QUOTE_PURPOSES.INSPECTION_VISIT) {
    return visitFee;
  }

  if (purpose === QUOTE_PURPOSES.FIXED_JOB) {
    return labour;
  }

  if (purpose === QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION) {
    if (visitFeeCredited) {
      const credit = Math.max(0, Number(previousVisitFeeMinor) || 0);
      return Math.max(0, labour - credit);
    }
    return labour;
  }

  return labour + visitFee;
}

// Compute allowed actions based on job state and participant role
export function computeAllowedActions(job, callerUserId, workerOwnerUserId) {
  if (!job || !callerUserId) return [];

  const isCustomer = job.customerId === callerUserId;
  const isWorker = workerOwnerUserId === callerUserId;

  if (!isCustomer && !isWorker) return [];

  const actions = [];
  const state = job.state;
  const pricingPath = job.pricingPath;

  if (isWorker) {
    if (state === JOB_STATES.REQUESTED) {
      actions.push('respond', 'decline');
    } else if (state === JOB_STATES.DISCUSSING) {
      actions.push('decline');
    } else if (state === JOB_STATES.CONFIRMED) {
      if (pricingPath === PRICING_PATHS.INSPECTION) {
        actions.push('start_visit');
      } else {
        actions.push('start_work');
      }
    } else if (state === JOB_STATES.IN_PROGRESS) {
      actions.push('mark_work_done');
    } else if (state === JOB_STATES.ISSUE_OPEN) {
      actions.push('release_assignment');
    }
  }

  if (isCustomer) {
    if (
      [
        JOB_STATES.REQUESTED,
        JOB_STATES.DISCUSSING,
        JOB_STATES.QUOTED,
        JOB_STATES.CONFIRMED,
      ].includes(state)
    ) {
      actions.push('cancel');
    } else if (state === JOB_STATES.AWAITING_REPAIR_APPROVAL) {
      actions.push('decline_repair');
    } else if (state === JOB_STATES.AWAITING_COMPLETION) {
      actions.push('confirm_completion');
    }
  }

  return actions;
}

// Normalizers from raw database rows (snake_case) to API_CONTRACT shapes (camelCase)
export function normalizeSession(authUser, hasWorkerProfile = false, displayName = null) {
  if (!authUser) return null;
  return {
    userId: authUser.id,
    isAnonymous: Boolean(authUser.is_anonymous),
    displayName: displayName || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
    hasWorkerProfile: Boolean(hasWorkerProfile),
  };
}

export function normalizeWorker(row, trades = [], serviceAreas = [], reviewStats = {}) {
  if (!row) return null;

  const now = new Date();
  const expiresAt = row.availability_expires_at ? new Date(row.availability_expires_at) : null;
  const isExpired = expiresAt ? expiresAt <= now : true;
  const optIn = Boolean(row.availability_opt_in);
  const hasActiveAssignment = Boolean(row.has_active_assignment);
  const isAvailableNow = optIn && !isExpired && !hasActiveAssignment;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    tradeIds: row.tradeIds || trades || [],
    localityId: row.locality_id,
    serviceAreaIds: row.serviceAreaIds || serviceAreas || [],
    bio: row.bio || null,
    yearsExperience: row.years_experience !== undefined ? row.years_experience : null,
    avatarUrl: row.avatar_url || null,
    availabilityOptIn: optIn,
    availabilityExpiresAt: row.availability_expires_at || null,
    isAvailableNow: row.isAvailableNow !== undefined ? row.isAvailableNow : isAvailableNow,
    approximateDistanceKm: row.approximate_distance_km !== undefined ? row.approximate_distance_km : null,
    completedJobCount: row.completedJobCount !== undefined ? row.completedJobCount : (reviewStats.completedJobCount || 0),
    reviewCount: row.reviewCount !== undefined ? row.reviewCount : (reviewStats.reviewCount || 0),
    averageRating: row.averageRating !== undefined ? row.averageRating : (reviewStats.averageRating || null),
    isDemo: Boolean(row.is_demo),
  };
}

export function normalizeQuote(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    version: row.version,
    purpose: row.purpose,
    scope: row.scope,
    currency: row.currency || 'PKR',
    labourMinor: Number(row.labour_minor) || 0,
    visitFeeMinor: Number(row.visit_fee_minor) || 0,
    visitFeeCredited: Boolean(row.visit_fee_credited),
    materialsPolicy: row.materials_policy || 'excluded_approval_required',
    expiresAt: row.expires_at || null,
    supersededAt: row.superseded_at || null,
  };
}

export function normalizeJob(row, latestQuote = null, acceptedAgreement = null) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    workerId: row.worker_id,
    tradeId: row.trade_id,
    localityId: row.locality_id,
    task: row.task,
    pricingPath: row.pricing_path,
    state: row.state,
    version: row.version,
    latestQuote: row.latestQuote || (latestQuote ? normalizeQuote(latestQuote) : null),
    acceptedAgreement: row.acceptedAgreement || (acceptedAgreement ? {
      quoteSnapshot:acceptedAgreement.quoteSnapshot || acceptedAgreement.quote_snapshot,
      acceptedAt:acceptedAgreement.acceptedAt || acceptedAgreement.accepted_at,
    } : null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDemo: Boolean(row.is_demo),
  };
}

export function normalizeMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    senderId: row.sender_id,
    kind: row.kind,
    text: row.text || null,
    audioRef: row.audio_ref || null,
    transcript: row.transcript || null,
    createdAt: row.created_at,
  };
}

export function normalizeReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    workerId: row.worker_id,
    authorId: row.author_id,
    rating: row.rating,
    punctuality: row.punctuality !== undefined ? row.punctuality : null,
    priceHonoured: row.price_honoured !== undefined ? row.price_honoured : null,
    text: row.text || null,
    createdAt: row.created_at,
    isDemo: Boolean(row.is_demo),
  };
}
