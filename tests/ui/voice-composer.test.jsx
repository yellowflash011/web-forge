import React from 'react';
import test,{afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle}))Object.defineProperty(globalThis,name,{configurable:true,value});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {render,within,waitFor,cleanup}=await import('@testing-library/react');
const userEvent=(await import('@testing-library/user-event')).default;
const {default:VoiceComposer}=await import('../../components/marketplace/voice-composer.jsx');
let stops=0,denied=false;
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{if(denied)throw Object.assign(Error('Denied'),{name:'NotAllowedError'});return {getTracks:()=>[{stop:()=>stops++}]}}}});
class Recorder{state='inactive';mimeType='audio/webm';start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['actual test audio'],{type:this.mimeType})});this.onstop()}}
window.MediaRecorder=Recorder;
URL.createObjectURL=()=> 'blob:recording-preview';URL.revokeObjectURL=()=>{};
afterEach(()=>{cleanup();denied=false;stops=0});after(()=>dom.window.close());
test('failed voice sends retain the upload and retry the same audio reference',async()=>{
 const uploads=[],sent=[];let attempts=0;
 const services={uploadAudio:async input=>{uploads.push(input);return {data:{audioRef:'owner/message/clip.webm'},error:null}}};
 const view=render(<VoiceComposer services={services} jobId="job-1" onSend={async input=>{sent.push(input);return ++attempts===1?{ok:false,error:{message:'Connection lost'}}:{ok:true}}}/>),screen=within(view.container),user=userEvent.setup({document:dom.window.document});
 await user.click(screen.getByRole('button',{name:'Record voice note'}));await screen.findByRole('button',{name:'Stop recording'});await user.click(screen.getByRole('button',{name:'Stop recording'}));
 await user.click(screen.getByRole('button',{name:'Send recording'}));await screen.findByText('Connection lost');
 assert.equal(uploads.length,1);assert.equal(uploads[0].purpose,'message');assert.equal(uploads[0].jobId,'job-1');assert.ok(uploads[0].blob.size>0);
 await user.click(screen.getByRole('button',{name:'Send recording'}));await waitFor(()=>assert.equal(screen.queryByRole('button',{name:'Send recording'}),null));
 assert.equal(uploads.length,1);assert.equal(sent.length,2);assert.equal(sent[0].audioRef,sent[1].audioRef);assert.ok(stops>0);
});
test('denied microphone access sends nothing and leaves a useful error',async()=>{
 denied=true;let uploads=0;const view=render(<VoiceComposer services={{uploadAudio:()=>uploads++}} onSend={()=>assert.fail('must not send')}/>),screen=within(view.container),user=userEvent.setup({document:dom.window.document});
 await user.click(screen.getByRole('button',{name:'Record voice note'}));await screen.findByText(/Microphone permission was denied/);assert.equal(uploads,0);assert.equal(screen.queryByRole('button',{name:'Send recording'}),null);
});
test('leaving a recording stops its microphone',async()=>{
 const view=render(<VoiceComposer services={{}} onSend={()=>{}}/>),screen=within(view.container),user=userEvent.setup({document:dom.window.document});await user.click(screen.getByRole('button',{name:'Record voice note'}));await screen.findByRole('button',{name:'Stop recording'});view.unmount();assert.ok(stops>0);
});
