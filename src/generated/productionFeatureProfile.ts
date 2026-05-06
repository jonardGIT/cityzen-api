import type { LockedProductionFeatureProfile } from '../featureSelection.js';

export const productionFeatureProfile: LockedProductionFeatureProfile = {
  locked: true,
  profileName: "production-supabase-full",
  builtAt: null,
  selection: {
  "authProvider": "supabase",
  "tokenMode": "supabase-jwt",
  "mfaMode": "supabase-totp",
  "mediaStorage": "supabase-storage",
  "recordDeletion": "archive"
},
};
