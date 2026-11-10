import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createVoiceHandler} from './handler.js';
Deno.serve(createVoiceHandler({createClient,env:(name:string)=>Deno.env.get(name)}));
