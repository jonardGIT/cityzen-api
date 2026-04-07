import type { LockedProductionFeatureProfile } from '../featureSelection.js';

export const productionFeatureProfile: LockedProductionFeatureProfile = {
  locked: true,
  profileName: "production-supabase-auth",
  builtAt: "2026-04-07T12:45:04.931Z",
  selection: {
  "authProvider": "supabase",
  "tokenMode": "supabase-jwt",
  "mfaMode": "supabase-totp",
  "mediaStorage": "disabled",
  "recordDeletion": "archive"
},
};
