'use client';
import {useState,useEffect,useRef} from 'react';
export function useRecorder(){
 const [recording,setRecording]=useState(false),[blob,setBlob]=useState(null),[url,setUrl]=useState(''),[error,setError]=useState(null);
 const rec=useRef(null),stream=useRef(null),timer=useRef(null),currentUrl=useRef(''),active=useRef(true),starting=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;clearTimeout(timer.current);if(rec.current?.state==='recording')rec.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(currentUrl.current)URL.revokeObjectURL(currentUrl.current)}},[]);
 const stop=()=>{clearTimeout(timer.current);if(rec.current?.state==='recording')rec.current.stop()};
 const reset=()=>{if(rec.current?.state==='recording')return;if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);currentUrl.current='';setBlob(null);setUrl('');setError(null)};
 const start=async()=>{
  if(starting.current||rec.current?.state==='recording')return;starting.current=true;setError(null);
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Recording needs HTTPS or localhost. You can still type your message.');
   if(!window.MediaRecorder)throw Error('This browser cannot record audio. You can still type your message.');
   const capture=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!active.current){capture.getTracks().forEach(t=>t.stop());return}stream.current=capture;
   const recorder=new window.MediaRecorder(capture);rec.current=recorder;const chunks=[];
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
   recorder.onerror=()=>{clearTimeout(timer.current);recorder.onstop=null;if(recorder.state==='recording')recorder.stop();rec.current=null;capture.getTracks().forEach(t=>t.stop());if(active.current){setRecording(false);setError({message:'Recording failed. Please try again.'})}};
   recorder.onstop=()=>{clearTimeout(timer.current);capture.getTracks().forEach(t=>t.stop());if(!active.current)return;const audio=new Blob(chunks,{type:recorder.mimeType});setRecording(false);if(!audio.size){setError({message:'No audio was captured. Please record again.'});return}if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);const next=URL.createObjectURL(audio);currentUrl.current=next;setUrl(next);setBlob(audio)};
   recorder.start();setRecording(true);timer.current=setTimeout(stop,30000);
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());if(active.current)setError({message:e.name==='NotAllowedError'?'Microphone permission was denied. You can still type your message.':e.message})}finally{starting.current=false}
 };
 return {recording,blob,url,error,start,stop,reset};
}
