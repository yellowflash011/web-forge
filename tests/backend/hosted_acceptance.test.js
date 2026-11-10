import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

// This suite creates accounts and job data. Run only against an explicitly selected test project.
const SUPABASE_URL=process.env.ACCEPTANCE_SUPABASE_URL;
const ANON_KEY=process.env.ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY||process.env.ACCEPTANCE_SUPABASE_ANON_KEY;
if(process.env.RUN_HOSTED_ACCEPTANCE!=='1'||!SUPABASE_URL||!ANON_KEY)throw Error('BLOCKED: set RUN_HOSTED_ACCEPTANCE=1, ACCEPTANCE_SUPABASE_URL and ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY for a disposable test project.');

function makeClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

test('Hosted Acceptance: Multi-Session Registered User Verification', async () => {
  const runId = Date.now();
  const emailDomain=process.env.ACCEPTANCE_EMAIL_DOMAIN||'example.com';
  const workerClient = makeClient();
  const customerAClient = makeClient();
  const customerBClient = makeClient();
  const outsiderClient = makeClient();

  const workerEmail = `worker_${runId}@${emailDomain}`;
  const customerAEmail = `cust_a_${runId}@${emailDomain}`;
  const customerBEmail = `cust_b_${runId}@${emailDomain}`;
  const outsiderEmail = `outsider_${runId}@${emailDomain}`;
  const password = crypto.randomUUID()+'Aa1!';

  // 1. Registration & Session Verification
  const { data: regWorker, error: errWorkerReg } = await workerClient.auth.signUp({
    email: workerEmail,
    password,
    options: { data: { display_name: 'Hosted Worker' } },
  });
  assert.equal(errWorkerReg, null);
  assert.ok(regWorker.user?.id);
  const workerUserId = regWorker.user.id;

  const { data: regCustA, error: errCustAReg } = await customerAClient.auth.signUp({
    email: customerAEmail,
    password,
    options: { data: { display_name: 'Customer Usman' } },
  });
  assert.equal(errCustAReg, null);
  assert.ok(regCustA.user?.id);
  const customerAUserId = regCustA.user.id;

  const { data: regCustB, error: errCustBReg } = await customerBClient.auth.signUp({
    email: customerBEmail,
    password,
    options: { data: { display_name: 'Customer Fatima' } },
  });
  assert.equal(errCustBReg, null);
  assert.ok(regCustB.user?.id);
  const customerBUserId = regCustB.user.id;

  const { data: regOutsider, error: errOutsiderReg } = await outsiderClient.auth.signUp({
    email: outsiderEmail,
    password,
    options: { data: { display_name: 'Outsider Tariq' } },
  });
  assert.equal(errOutsiderReg, null);
  assert.ok(regOutsider.user?.id);

  // 2. Anonymous Access Rejection
  const unauthClient = makeClient();
  const { data: anonRpcData, error: anonRpcErr } = await unauthClient.rpc('rpc_my_worker_profile');
  assert.equal(anonRpcData, null);
  assert.match(anonRpcErr.message, /UNAUTHENTICATED|permission denied/i);

  // 3. Worker Onboarding & Availability
  const { data: savedProfile, error: saveErr } = await workerClient.rpc('rpc_save_worker_profile', {
    p_name: 'Hosted Master Electrician',
    p_trade_ids: ['electrician'],
    p_locality_id: 'g-10-islamabad',
    p_service_area_ids: ['g-10-islamabad', 'g-9-islamabad'],
    p_years_experience: 7,
    p_bio: 'Expert electrical troubleshooting and repairs in G-10.',
    p_idempotency_key: `idemp-prof-${runId}`,
  });
  assert.equal(saveErr, null);
  assert.equal(savedProfile.name, 'Hosted Master Electrician');
  const workerId = savedProfile.id;

  // Toggle availability
  const { data: availData, error: availErr } = await workerClient.rpc('rpc_set_availability', {
    p_available: true,
    p_idempotency_key: `idemp-avail-${runId}`,
  });
  assert.equal(availErr, null);
  assert.equal(availData.isAvailableNow, true);

  // 4. Discovery
  const { data: discoveryData, error: discErr } = await customerAClient.rpc('rpc_discover_workers', {
    p_trade_id: 'electrician',
    p_locality_id: 'g-10-islamabad',
  });
  assert.equal(discErr, null);
  const foundWorker = discoveryData.items.find((w) => w.id === workerId);
  assert.ok(foundWorker, 'Newly available worker must be discoverable in G-10');

  // 5. Booking Race: Customer A and Customer B race to book the same worker
  const { data: jobA, error: jobAErr } = await customerAClient.rpc('rpc_create_job_request', {
    p_worker_id: workerId,
    p_trade_id: 'electrician',
    p_locality_id: 'g-10-islamabad',
    p_task: 'Customer A electrical short circuit repair',
    p_pricing_path: 'fixed',
    p_audio_ref: null,
    p_idempotency_key: `idemp-jobA-${runId}`,
  });
  assert.equal(jobAErr, null);
  assert.ok(jobA.id);

  const { data: jobB, error: jobBErr } = await customerBClient.rpc('rpc_create_job_request', {
    p_worker_id: workerId,
    p_trade_id: 'electrician',
    p_locality_id: 'g-10-islamabad',
    p_task: 'Customer B electrical rewiring',
    p_pricing_path: 'fixed',
    p_audio_ref: null,
    p_idempotency_key: `idemp-jobB-${runId}`,
  });
  assert.equal(jobBErr, null);
  assert.ok(jobB.id);

  // Worker issues quotes on both jobs
  const quoteExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
  const { data: quoteAData, error: quoteAErr } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobA.id,
    p_expected_version: jobA.version,
    p_purpose: 'fixed_job',
    p_scope: 'Fix short circuit',
    p_labour_minor: 250000, // 2500 PKR
    p_visit_fee_minor: 0,
    p_visit_fee_credited: false,
    p_materials_policy: 'customer_procures',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-quoteA-${runId}`,
  });
  assert.equal(quoteAErr, null);
  const quoteA = quoteAData.latestQuote;

  const { data: quoteBData, error: quoteBErr } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobB.id,
    p_expected_version: jobB.version,
    p_purpose: 'fixed_job',
    p_scope: 'Rewire room',
    p_labour_minor: 300000,
    p_visit_fee_minor: 0,
    p_visit_fee_credited: false,
    p_materials_policy: 'customer_procures',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-quoteB-${runId}`,
  });
  assert.equal(quoteBErr, null);
  const quoteB = quoteBData.latestQuote;

  // Dispatch independent client requests together. Either customer may win.
  const attempts=await Promise.all([
    customerAClient.rpc('rpc_accept_quote',{p_job_id:jobA.id,p_quote_id:quoteA.id,p_expected_version:quoteAData.version,p_idempotency_key:`race-a-${runId}`}),
    customerBClient.rpc('rpc_accept_quote',{p_job_id:jobB.id,p_quote_id:quoteB.id,p_expected_version:quoteBData.version,p_idempotency_key:`race-b-${runId}`}),
  ]);
  assert.equal(attempts.filter(result=>!result.error&&result.data?.state==='confirmed').length,1,'Exactly one simultaneous acceptance must succeed');
  const losing=attempts.find(result=>result.error);assert.ok(losing);assert.match(losing.error.message,/busy|engaged|unavailable|assignment/i);
  let acceptAData=attempts[0].data;
  if(attempts[1].data?.state==='confirmed'){
    // Release B's winning test booking so the remaining A journey is deterministic.
    const released=await customerBClient.rpc('rpc_transition_job',{p_job_id:jobB.id,p_action:'cancel',p_expected_version:attempts[1].data.version,p_reason:'Acceptance test cleanup before A journey',p_idempotency_key:`release-b-${runId}`});
    assert.equal(released.error,null);
    const retried=await customerAClient.rpc('rpc_accept_quote',{p_job_id:jobA.id,p_quote_id:quoteA.id,p_expected_version:quoteAData.version,p_idempotency_key:`retry-a-${runId}`});
    assert.equal(retried.error,null);acceptAData=retried.data;
  }
  assert.equal(acceptAData.state,'confirmed');

  // 6. Messaging & Private Access Authorization
  // Customer A sends message
  const { data: msgA, error: msgAErr } = await customerAClient.rpc('rpc_send_message', {
    p_job_id: jobA.id,
    p_kind: 'text',
    p_text: 'Please come at 3pm',
    p_audio_ref: null,
    p_idempotency_key: `idemp-msgA-${runId}`,
  });
  assert.equal(msgAErr, null);
  assert.equal(msgA.text, 'Please come at 3pm');

  // Outsider attempts to send message on Job A -> MUST be denied with FORBIDDEN
  const { data: outsiderMsg, error: outsiderMsgErr } = await outsiderClient.rpc('rpc_send_message', {
    p_job_id: jobA.id,
    p_kind: 'text',
    p_text: 'Spy message',
    p_audio_ref: null,
    p_idempotency_key: `idemp-spy-${runId}`,
  });
  assert.equal(outsiderMsg, null);
  assert.match(outsiderMsgErr.message, /FORBIDDEN/i);

  // Outsider queries messages directly via RLS -> gets 0 rows
  const { data: outsiderRows, error: rlsErr } = await outsiderClient
    .from('messages')
    .select('*')
    .eq('job_id', jobA.id);
  assert.equal(rlsErr, null);
  assert.equal(outsiderRows.length, 0, 'RLS must not reveal messages to unrelated users');

  // 7. Complete Fixed-Price Job & Persist Review
  // Worker starts work
  const { data: startedJob, error: startErr } = await workerClient.rpc('rpc_transition_job', {
    p_job_id: jobA.id,
    p_action: 'start_work',
    p_expected_version: acceptAData.version,
    p_reason: null,
    p_idempotency_key: `idemp-start-${runId}`,
  });
  assert.equal(startErr, null);
  assert.equal(startedJob.state, 'in_progress');

  // Worker marks work done
  const { data: doneJob, error: doneErr } = await workerClient.rpc('rpc_transition_job', {
    p_job_id: jobA.id,
    p_action: 'mark_work_done',
    p_expected_version: startedJob.version,
    p_reason: null,
    p_idempotency_key: `idemp-done-${runId}`,
  });
  assert.equal(doneErr, null);
  assert.equal(doneJob.state, 'awaiting_completion');

  // Customer confirms completion
  const { data: completedJob, error: compErr } = await customerAClient.rpc('rpc_transition_job', {
    p_job_id: jobA.id,
    p_action: 'confirm_completion',
    p_expected_version: doneJob.version,
    p_reason: null,
    p_idempotency_key: `idemp-comp-${runId}`,
  });
  assert.equal(compErr, null);
  assert.equal(completedJob.state, 'completed');

  // Customer submits review
  const { data: revData, error: revErr } = await customerAClient.rpc('rpc_submit_review', {
    p_job_id: jobA.id,
    p_rating: 5,
    p_punctuality: true,
    p_price_honoured: true,
    p_text: 'Excellent and honest electrical work.',
    p_idempotency_key: `idemp-rev-${runId}`,
  });
  assert.equal(revErr, null);
  assert.equal(revData.review.rating, 5);

  // Outsider attempt to submit review -> denied
  const { data: outRev, error: outRevErr } = await outsiderClient.rpc('rpc_submit_review', {
    p_job_id: jobA.id,
    p_rating: 1,
    p_punctuality: false,
    p_price_honoured: false,
    p_text: 'Fake negative review',
    p_idempotency_key: `idemp-fakerev-${runId}`,
  });
  assert.equal(outRev, null);
  assert.match(outRevErr.message, /FORBIDDEN/i);

  // 8. Stale Quote Rejection Verification
  // Customer A creates another request
  const { data: jobC, error: jobCErr } = await customerAClient.rpc('rpc_create_job_request', {
    p_worker_id: workerId,
    p_trade_id: 'electrician',
    p_locality_id: 'g-10-islamabad',
    p_task: 'Stale quote test request',
    p_pricing_path: 'fixed',
    p_audio_ref: null,
    p_idempotency_key: `idemp-jobC-${runId}`,
  });
  assert.equal(jobCErr, null);

  // Worker issues quote v1
  const { data: qv1Data, error: qv1Err } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobC.id,
    p_expected_version: jobC.version,
    p_purpose: 'fixed_job',
    p_scope: 'Initial quote scope',
    p_labour_minor: 150000,
    p_visit_fee_minor: 0,
    p_visit_fee_credited: false,
    p_materials_policy: 'customer_procures',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-qv1-${runId}`,
  });
  assert.equal(qv1Err, null);
  const quoteV1 = qv1Data.latestQuote;

  // Worker revises quote to v2
  const { data: qv2Data, error: qv2Err } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobC.id,
    p_expected_version: qv1Data.version,
    p_purpose: 'fixed_job',
    p_scope: 'Revised scope with additional wiring',
    p_labour_minor: 200000,
    p_visit_fee_minor: 0,
    p_visit_fee_credited: false,
    p_materials_policy: 'customer_procures',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-qv2-${runId}`,
  });
  assert.equal(qv2Err, null);

  // Customer A tries to accept superseded quote v1 -> must fail with STALE_REVISION
  const { data: acceptV1, error: acceptV1Err } = await customerAClient.rpc('rpc_accept_quote', {
    p_job_id: jobC.id,
    p_quote_id: quoteV1.id,
    p_expected_version: qv2Data.version,
    p_idempotency_key: `idemp-accv1-${runId}`,
  });
  assert.equal(acceptV1, null);
  assert.match(acceptV1Err.message, /STALE|superseded/i);

  // 9. Issue Reporting Persistence
  const { data: issueReport, error: issueErr } = await customerAClient.rpc('rpc_report_issue', {
    p_job_id: jobC.id,
    p_reason: 'Worker did not show up on time',
    p_expected_version: qv2Data.version,
    p_idempotency_key: `idemp-iss-${runId}`,
  });
  assert.equal(issueErr, null);
  assert.equal(issueReport.state, 'issue_open');

  // 10. Inspection Journey: Visit agreement -> Repair quote -> Separate approval
  const { data: jobD, error: jobDErr } = await customerAClient.rpc('rpc_create_job_request', {
    p_worker_id: workerId,
    p_trade_id: 'electrician',
    p_locality_id: 'g-10-islamabad',
    p_task: 'Inspection journey for complex circuit breakdown',
    p_pricing_path: 'inspection',
    p_audio_ref: null,
    p_idempotency_key: `idemp-jobD-${runId}`,
  });
  assert.equal(jobDErr, null);

  // Worker issues inspection visit quote
  const { data: visitQuoteData, error: vqErr } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobD.id,
    p_expected_version: jobD.version,
    p_purpose: 'inspection_visit',
    p_scope: 'Diagnose electrical breaker failure',
    p_labour_minor: 0,
    p_visit_fee_minor: 100000, // 1000 PKR
    p_visit_fee_credited: false,
    p_materials_policy: 'not_applicable',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-vq-${runId}`,
  });
  assert.equal(vqErr, null);

  // Customer A accepts visit quote
  const { data: accVisit, error: accVErr } = await customerAClient.rpc('rpc_accept_quote', {
    p_job_id: jobD.id,
    p_quote_id: visitQuoteData.latestQuote.id,
    p_expected_version: visitQuoteData.version,
    p_idempotency_key: `idemp-accvq-${runId}`,
  });
  assert.equal(accVErr, null);
  assert.equal(accVisit.state, 'confirmed');

  // Worker starts visit
  const { data: visitStarted, error: vsErr } = await workerClient.rpc('rpc_transition_job', {
    p_job_id: jobD.id,
    p_action: 'start_visit',
    p_expected_version: accVisit.version,
    p_reason: null,
    p_idempotency_key: `idemp-vs-${runId}`,
  });
  assert.equal(vsErr, null);
  assert.equal(visitStarted.state, 'visiting');

  // Worker issues repair quote after inspection
  const { data: repairQuoteData, error: rqErr } = await workerClient.rpc('rpc_issue_quote', {
    p_job_id: jobD.id,
    p_expected_version: visitStarted.version,
    p_purpose: 'repair_after_inspection',
    p_scope: 'Replace burnt distribution block and rewire circuit',
    p_labour_minor: 400000, // 4000 PKR
    p_visit_fee_minor: 100000,
    p_visit_fee_credited: true,
    p_materials_policy: 'customer_procures',
    p_expires_at: quoteExpiry,
    p_idempotency_key: `idemp-rq-${runId}`,
  });
  assert.equal(rqErr, null);
  assert.equal(repairQuoteData.state, 'awaiting_repair_approval');

  // Customer A accepts repair quote (separate decision)
  const { data: accRepair, error: accRErr } = await customerAClient.rpc('rpc_accept_quote', {
    p_job_id: jobD.id,
    p_quote_id: repairQuoteData.latestQuote.id,
    p_expected_version: repairQuoteData.version,
    p_idempotency_key: `idemp-accrq-${runId}`,
  });
  assert.equal(accRErr, null);
  assert.equal(accRepair.state, 'in_progress');

  // Worker marks work done
  const { data: repairDone, error: rdErr } = await workerClient.rpc('rpc_transition_job', {
    p_job_id: jobD.id,
    p_action: 'mark_work_done',
    p_expected_version: accRepair.version,
    p_reason: null,
    p_idempotency_key: `idemp-rd-${runId}`,
  });
  assert.equal(rdErr, null);
  assert.equal(repairDone.state, 'awaiting_completion');

  // 11. Private Audio Storage RLS & Signed Playback URLs
  const audioBlob = new Blob(['sample-private-audio-content'], { type: 'audio/webm' });
  const audioPath = `${customerAUserId}/onboarding/private_${runId}.webm`;
  const { error: uploadErr } = await customerAClient.storage
    .from('job-audio')
    .upload(audioPath, audioBlob, { contentType: 'audio/webm' });
  assert.equal(uploadErr, null);

  // Customer A can create signed URL
  const { data: signedData, error: signedErr } = await customerAClient.storage
    .from('job-audio')
    .createSignedUrl(audioPath, 300);
  assert.equal(signedErr, null);
  assert.ok(signedData.signedUrl);

  // Outsider cannot download Customer A's audio directly -> RLS denial
  const { data: outsiderBlob, error: downloadErr } = await outsiderClient.storage
    .from('job-audio')
    .download(audioPath);
  assert.equal(outsiderBlob, null);
  assert.ok(downloadErr, 'Storage RLS must deny unauthorized downloads');

  // 12. Authenticated password change (email recovery link must be verified separately)
  const { error: updatePassErr } = await customerBClient.auth.updateUser({
    password: 'NewChangedPassword789!',
  });
  assert.equal(updatePassErr, null);

  // Sign out Customer B
  await customerBClient.auth.signOut();

  // Old password must fail
  const freshClient = makeClient();
  const { data: oldLogin, error: oldErr } = await freshClient.auth.signInWithPassword({
    email: customerBEmail,
    password,
  });
  assert.equal(oldLogin.user, null);
  assert.ok(oldErr);

  // New password must succeed
  const { data: newLogin, error: newErr } = await freshClient.auth.signInWithPassword({
    email: customerBEmail,
    password: 'NewChangedPassword789!',
  });
  assert.equal(newErr, null);
  assert.equal(newLogin.user?.id, customerBUserId);
});
