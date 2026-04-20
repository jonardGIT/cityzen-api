import type { LockedProductionFeatureProfile } from '../featureSelection.js';

export const productionFeatureProfile: LockedProductionFeatureProfile = {
  locked: true,
  profileName: "production-supabase-auth",
  builtAt: null,
  selection: {
  "authProvider": "supabase",
  "tokenMode": "supabase-jwt",
  "mfaMode": "supabase-totp",
  "mediaStorage": "disabled",
  "recordDeletion": "archive"
},
};
