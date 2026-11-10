import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../../lib/api/index.js';
import {requirePublicConfiguration} from '../../lib/supabase/configuration.js';
test('real facade exports the frontend contract including own-profile restoration',()=>{
 for(const name of ['ensureSession','getSession','getMyWorkerProfile','signOut','saveWorkerProfile','getWorker','listWorkers','setAvailability','createRequest','listMyJobs','getJob','listMessages','sendMessage','issueQuote','acceptQuote','transitionJob','submitReview','reportIssue','uploadAudio','getAudioPlaybackUrl','extractVoice'])assert.equal(typeof api[name],'function',name);
});
test('missing browser/backend setup is a normalized failure, never an in-memory success',async()=>{
 for(const result of [await api.ensureSession(),await api.getSession(),await api.getMyWorkerProfile(),await api.listWorkers({localityId:'g-10-islamabad'})]){
  assert.equal(result.data,null);assert.equal(result.error.code,'NETWORK_ERROR');
 }
});
test('public config validation requires a real URL/key and preserves publishable keys',()=>{
 assert.throws(()=>requirePublicConfiguration('https://your-project.supabase.co','your-anon-key'));
 assert.throws(()=>requirePublicConfiguration('file:///secret','test-publishable'));
 assert.equal(requirePublicConfiguration('https://example.supabase.co','test-publishable').key,'test-publishable');
});
