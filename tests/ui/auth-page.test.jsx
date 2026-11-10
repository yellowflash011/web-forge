import React from 'react';
import test,{afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/auth/login/'});
for(const [name,value]of Object.entries({window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle}))Object.defineProperty(globalThis,name,{configurable:true,value});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {render,within,waitFor,cleanup}=await import('@testing-library/react');
const userEvent=(await import('@testing-library/user-event')).default;
const {MarketplaceProvider}=await import('../../features/marketplace/provider.jsx');
const {default:AuthPage}=await import('../../features/marketplace/auth-page.jsx');
afterEach(()=>cleanup());after(()=>dom.window.close());
function mount(mode,authOperation,options={}){
 const navigations=[];let session=null;
 const services={getSession:async()=>({data:session,error:null}),getMyWorkerProfile:async()=>({data:null,error:null})};
 const operation=async(...args)=>{const result=await authOperation(...args);if(result.data?.session)session={userId:'registered-user',displayName:'Neighbour',isAnonymous:false};return result};
 const router={replace:path=>navigations.push(path),push:path=>navigations.push(path),prefetch:()=>{},refresh:()=>{},back:()=>{},forward:()=>{}};
 const view=render(<AppRouterContext.Provider value={router}><MarketplaceProvider services={services}><AuthPage mode={mode} next="/jobs/" authOperation={operation} {...options}/></MarketplaceProvider></AppRouterContext.Provider>);
 return {...within(view.container),navigations,user:userEvent.setup({document:dom.window.document})};
}
async function credentials(view){await view.user.type(view.getByRole('textbox',{name:'Email address'}),'test@example.com');await view.user.type(view.getByLabelText('Password',{exact:true}),'a-strong-password')}
test('successful registered login restores identity before returning to the intended page',async()=>{
 const calls=[],view=mount('login',async(...args)=>{calls.push(args);return {data:{session:{user:{id:'registered-user'}}},error:null}});await credentials(view);await view.user.click(view.getByRole('button',{name:'Sign in',exact:true}));await waitFor(()=>assert.ok(view.navigations.includes('/jobs/')));assert.equal(calls[0][0],'login');assert.equal(calls[0][1].email,'test@example.com');assert.equal(view.queryByText(/Continue as guest/),null);
});
test('registration requiring confirmation shows inbox instructions without claiming a session',async()=>{
 const view=mount('register',async()=>({data:{user:{id:'pending-user'},session:null},error:null}));await view.user.type(view.getByRole('textbox',{name:'Your name'}),'Test Neighbour');await credentials(view);await view.user.type(view.getByLabelText('Confirm password',{exact:true}),'a-strong-password');await view.user.click(view.getByRole('button',{name:'Create account',exact:true}));await view.findByText('Check your inbox to confirm your email, then return to sign in.');assert.equal(view.navigations.length,0);
});
test('mismatched registration passwords never call authentication',async()=>{
 let calls=0;const view=mount('register',async()=>{calls++;return {data:{}}});await view.user.type(view.getByRole('textbox',{name:'Your name'}),'Test Neighbour');await credentials(view);await view.user.type(view.getByLabelText('Confirm password',{exact:true}),'different-password');await view.user.click(view.getByRole('button',{name:'Create account',exact:true}));await view.findByText('The passwords do not match.');assert.equal(calls,0);
});
test('invalid reset links leave password submission disabled',async()=>{
 const view=mount('reset',async()=>assert.fail('must not update password'),{completeRedirect:async()=>{throw Error('This link expired')}});await view.findByText('This link expired');assert.equal(view.getByRole('button',{name:'Save new password',exact:true}).disabled,true);
});
