import type { LockedProductionFeatureProfile } from '../featureSelection.js';

export const productionFeatureProfile: LockedProductionFeatureProfile = {
  locked: true,
  profileName: "production-supabase-auth",
  builtAt: "2026-04-20T13:18:07.210Z",
  selection: {
  "authProvider": "supabase",
  "tokenMode": "supabase-jwt",
  "mfaMode": "supabase-totp",
  "mediaStorage": "disabled",
  "recordDeletion": "archive"
},
};
