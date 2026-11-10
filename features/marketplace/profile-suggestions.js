// Keep user-entered values when the recording did not supply a fact.
// Unknown model fields never become editable profile or authority fields.
export function applyProfileSuggestions(current,suggestions){
 const next={...current};
 for(const field of ['name','bio'])if(typeof suggestions?.[field]==='string'&&suggestions[field].trim())next[field]=suggestions[field];
 for(const field of ['tradeIds','serviceAreaIds'])if(Array.isArray(suggestions?.[field])&&suggestions[field].length)next[field]=suggestions[field];
 if(typeof suggestions?.localityId==='string'&&suggestions.localityId)next.localityId=suggestions.localityId;
 if(Number.isInteger(suggestions?.yearsExperience)&&suggestions.yearsExperience>=0&&suggestions.yearsExperience<=70)next.yearsExperience=suggestions.yearsExperience;
 return next;
}
