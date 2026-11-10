export const paths={home:'/',jobs:'/jobs/',worker:'/worker/',workerProfile:'/worker/profile/',onboarding:'/onboarding/worker/',account:'/account/',saved:'/saved/',design:'/design/'};
export const profilePath=id=>`/profile/${encodeURIComponent(id)}/`;
export const jobPath=id=>`/jobs/${encodeURIComponent(id)}/`;
export const isRecordId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
