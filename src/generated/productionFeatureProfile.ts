import type { LockedProductionFeatureProfile } from '../featureSelection.js';

export const productionFeatureProfile: LockedProductionFeatureProfile = {
  locked: true,
  profileName: "deploy-gate",
  builtAt: "2026-04-04T19:36:22.437Z",
  selection: {
  "authProvider": "local",
  "tokenMode": "app-jwt",
  "mfaMode": "local-totp",
  "mediaStorage": "supabase-storage",
  "recordDeletion": "archive"
},
};
