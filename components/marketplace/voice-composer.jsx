'use client';
import React,{useState,useRef,useEffect} from 'react';
import {Mic,Square,Trash2,Send} from 'lucide-react';
import {useRecorder} from '../../features/marketplace/use-recorder';
import {Button,ErrorNotice} from './shared';
export default function VoiceComposer({services,jobId,purpose='message',onSend,disabled=false,urdu=false,label,onBusyChange}){
 const recorder=useRecorder(),[busy,setBusy]=useState(false),[error,setError]=useState(null),uploaded=useRef(null),locked=useRef(false);
 const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
 useEffect(()=>{onBusyChange?.(busy||recorder.recording);return()=>onBusyChange?.(false)},[busy,recorder.recording,onBusyChange]);
 const text=(en,ur)=>urdu?ur:en;
 const start=()=>{setError(null);recorder.start()};
 const send=async()=>{if(locked.current||!recorder.blob||disabled)return;locked.current=true;setBusy(true);setError(null);try{
  if(uploaded.current?.blob!==recorder.blob){const result=await services.uploadAudio({blob:recorder.blob,purpose,jobId,idempotencyKey:crypto.randomUUID()});if(result.error)throw result.error;if(!result.data?.audioRef)throw Error('The upload was not confirmed. Please retry.');uploaded.current={audioRef:result.data.audioRef,blob:recorder.blob}}
  if(!active.current)return;
  const result=await onSend({audioRef:uploaded.current.audioRef,blob:recorder.blob});if(result?.ok===false)throw result.error||Error('Your recording was not sent. Retry to keep the same recording.');uploaded.current=null;if(active.current)recorder.reset();
 }catch(e){setError({message:e.message||'Your recording could not be sent. Please retry.'})}finally{locked.current=false;setBusy(false)}};
 return <section className="voice-composer" aria-label={label||'Voice recording'}><p>{text('Speak instead of typing. Preview your recording before sending.','لکھنے کے بجائے بولیں۔ بھیجنے سے پہلے اپنی آواز سن لیں۔')}</p><ErrorNotice error={error||recorder.error}/><div className="voice-actions"><Button kind="outline" type="button" disabled={busy||disabled} onClick={recorder.recording?recorder.stop:start}>{recorder.recording?<Square size={17}/>:<Mic size={17}/>} {recorder.recording?text('Stop recording','ریکارڈنگ روکیں'):recorder.blob?text('Record again','دوبارہ ریکارڈ کریں'):text('Record voice note','آواز ریکارڈ کریں')}</Button></div>{recorder.url&&!recorder.recording&&<><audio aria-label="Recording preview" src={recorder.url} controls/><div className="voice-actions"><Button type="button" busy={busy} disabled={disabled} onClick={send}><Send size={16}/>{text('Send recording','آواز بھیجیں')}</Button><Button type="button" kind="outline" disabled={busy||disabled} onClick={()=>{uploaded.current=null;recorder.reset();setError(null)}}><Trash2 size={16}/>{text('Discard','حذف کریں')}</Button></div></>}<small>{text('Up to 30 seconds. Your microphone stops automatically.','زیادہ سے زیادہ ۳۰ سیکنڈ۔ مائیک خود بند ہو جائے گا۔')}</small></section>;
}
