'use client';
import { useState, useEffect, useRef } from 'react';
export function useRecorder(){
 const [recording,setRecording]=useState(false),[blob,setBlob]=useState(null),[url,setUrl]=useState(''),[error,setError]=useState(null);
 const rec=useRef(null),stream=useRef(null),timer=useRef(null),currentUrl=useRef(''),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;clearTimeout(timer.current);if(rec.current?.state==='recording')rec.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(currentUrl.current)URL.revokeObjectURL(currentUrl.current)}},[]);
 const stop=()=>{clearTimeout(timer.current);if(rec.current?.state==='recording')rec.current.stop()};
 const start=async()=>{setError(null);try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Recording needs HTTPS or localhost. You can use the fields below.');if(!window.MediaRecorder)throw Error('This browser cannot record audio. Use the fields below.');const s=await navigator.mediaDevices.getUserMedia({audio:true});if(!active.current){s.getTracks().forEach(t=>t.stop());return}stream.current=s;const r=new MediaRecorder(s);rec.current=r;const chunks=[];r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};r.onerror=()=>{s.getTracks().forEach(t=>t.stop());if(active.current){setRecording(false);setError({message:'Recording failed. Please try again.'})}};r.onstop=()=>{clearTimeout(timer.current);s.getTracks().forEach(t=>t.stop());if(!active.current)return;const audio=new Blob(chunks,{type:r.mimeType});if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);const next=URL.createObjectURL(audio);currentUrl.current=next;setUrl(next);setBlob(audio);setRecording(false)};r.start();setRecording(true);timer.current=setTimeout(stop,30000)}catch(e){setError({message:e.name==='NotAllowedError'?'Microphone permission was denied. You can still use the fields below.':e.message})}};
 return {recording,blob,url,error,start,stop};
}
