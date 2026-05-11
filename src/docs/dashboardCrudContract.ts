import {
  ADMIN_ROLES,
  ASSIGNMENT_MANAGEMENT_ROLES,
  AUDIT_READ_ROLES,
  CITY_ROLES,
  DISPATCH_ROLES,
  INCIDENT_CREATE_ROLES,
  INCIDENT_DELETE_ROLES,
  INCIDENT_RESTORE_ROLES,
  INCIDENT_UPDATE_ROLES,
  MEDIA_UPLOAD_ROLES,
  MFA_REQUIRED_ROLES,
  USER_ROLES,
  type UserRole,
} from '../types/auth.js';

export const DASHBOARD_API_BASE_PATH = '/api/v1';

/**
 * Pilot scope for the contract. The CIRS pilot is Tuguegarao-first, then
 * partner-LGU expansion. National roles and surfaces are deferred until formal
 * regional governance is enabled. See `pilot` block on `dashboardCrudConfig`
 * and docs/tuguegarao-pilot-governance-baseline.md.
 */
export type PilotScope = 'tuguegarao-first' | 'partner-lgu' | 'national-deferred';

/**
 * Compatibility classification for a contract route.
 *
 * - `canonical`     : The route clients SHOULD use as the primary entry point
 *                    for the surface it serves (dashboard, mobile-citizen,
 *                    public). Backend authorization remains the source of
 *                    truth regardless of client preference.
 * - `compatibility-only`
 *                  : The route is preserved for backward compatibility but a
 *                    canonical replacement exists for new clients. The
 *                    `supersededBy` field points to the canonical operation
 *                    key (e.g. `mobileCitizenSurface.linkProfile`).
 */
export type RouteCompatibilityStatus = 'canonical' | 'compatibility-only';

export type RouteCompatibility = {
  status: RouteCompatibilityStatus;
  supersededBy?: string;
  notes?: string;
};

type FeatureGate = {
  feature: 'tokenMode' | 'mfaMode' | 'mediaStorage' | 'recordDeletion';
  requires?: string;
  requiresAnyOf?: string[];
};

type ContractRoute = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  authRequired: boolean;
  allowedRoles?: UserRole[];
  featureGate?: FeatureGate;
  pilotScope?: PilotScope;
  compatibility?: RouteCompatibility;
  notes?: string;
};

type ResourceContract = {
  name: string;
  label: string;
  primaryKey?: 'id';
  routes: Record<string, ContractRoute>;
};

type AuthOptionalEndpointMap = Record<string, ContractRoute>;

/**
 * Top-level pilot block. Declares the contract's intended deployment scope
 * for downstream client and governance tooling. This is informational metadata
 * for clients and reviewers; backend authorization, jurisdiction scoping, and
 * privacy boundaries are enforced server-side regardless.
 */
export interface PilotContract {
  scope: PilotScope;
  partnerLguExpansion: 'planned' | 'enabled' | 'not-planned';
  governanceBaselineDoc: string;
  notes: string;
}

/**
 * Mobile-citizen canonical surface. The `/mobile/*` namespace is the
 * canonical entry surface for citizen mobile clients (MyTuguegarao). The
 * `compatibilityRoutes` block exposes legacy aliases under non-mobile paths
 * (e.g. `/citizens/link-me`, `/incidents/report`) that mobile clients may
 * still reach but should NOT prefer; the `supersededBy` field on each entry
 * points to the canonical operation in `routes`.
 *
 * The `authBootstrap` block separates email-based auth (canonical for
 * dashboard) from phone-based mobile auth (canonical for mobile-citizen).
 */
export interface MobileCitizenSurfaceContract {
  label: string;
  basePath: '/mobile';
  pilotScope: PilotScope;
  notes: string;
  routes: Record<string, ContractRoute>;
  compatibilityRoutes: Record<string, ContractRoute>;
  authBootstrap: {
    canonical: {
      mobileRegisterPath: '/auth/mobile/register';
      mobileLoginPath: '/auth/mobile/login';
      mePath: '/auth/me';
      logoutPath: '/auth/logout';
      refreshPath: '/auth/refresh';
    };
    compatibility: {
      registerPath: '/auth/register';
      loginPath: '/auth/login';
      notes: string;
    };
  };
}

export interface DashboardCrudConfig {
  apiBasePath: string;
  pilot: PilotContract;
  auth: {
    type: 'bearer';
    tokenHeader: 'Authorization';
    tokenPrefix: 'Bearer';
    bootstrap: {
      loginPath: '/auth/login';
      refreshPath: '/auth/refresh';
      registerPath: '/auth/register';
      mePath: '/auth/me';
      logoutPath: '/auth/logout';
      capabilitiesPath: '/users/capabilities';
      citizenLinkPath: '/citizens/link-me';
      incidentReportPath: '/incidents/report';
    };
    optionalEndpoints: AuthOptionalEndpointMap;
  };
  resources: ResourceContract[];
  mobileCitizenSurface: MobileCitizenSurfaceContract;
}

export interface DashboardCrudFlatEndpoint extends ContractRoute {
  resource: string;
  label: string;
  operation: string;
  fullPath: string;
}

export type DashboardCrudFlatSurface =
  | 'dashboard'
  | 'mobile-citizen'
  | 'mobile-citizen-compatibility';

export interface DashboardCrudFlatEndpointWithSurface extends DashboardCrudFlatEndpoint {
  surface: DashboardCrudFlatSurface;
}

export interface DashboardCrudFlatConfig {
  apiBasePath: string;
  pilot: PilotContract;
  auth: {
    type: 'bearer';
    tokenHeader: 'Authorization';
    tokenPrefix: 'Bearer';
    optionalEndpoints: Array<
      ContractRoute & {
        operation: string;
        fullPath: string;
      }
    >;
  };
  endpoints: DashboardCrudFlatEndpointWithSurface[];
}

const allAuthenticatedRoles = [...USER_ROLES];
const adminRoles = [...ADMIN_ROLES];
const dispatchRoles = [...DISPATCH_ROLES];
const assignmentRoles = [...ASSIGNMENT_MANAGEMENT_ROLES];
const mfaRoles = [...MFA_REQUIRED_ROLES];
const incidentReadRoles: UserRole[] = [
  'CITIZEN_REPORTER',
  ...CITY_ROLES,
  'DISPATCHER',
  'RESPONDER',
];
const incidentCreateRoles = [...INCIDENT_CREATE_ROLES];
const incidentUpdateRoles = [...INCIDENT_UPDATE_ROLES];
const incidentDeleteRoles = [...INCIDENT_DELETE_ROLES];
const incidentRestoreRoles = [...INCIDENT_RESTORE_ROLES];
const mediaUploadRoles = [...MEDIA_UPLOAD_ROLES];
const auditReadRoles = [...AUDIT_READ_ROLES];
const nationalAdminOnly: UserRole[] = ['NATIONAL_ADMIN'];
const adminAndAuditorRoles: UserRole[] = [...ADMIN_ROLES, 'AUDITOR'];

function route(
  method: ContractRoute['method'],
  path: string,
  options: Omit<ContractRoute, 'method' | 'path'>,
): ContractRoute {
  return {
    method,
    path,
    ...options,
  };
}

function buildCrudRoutes(
  basePath: string,
  readRoles: UserRole[],
  writeRoles: UserRole[],
): Record<string, ContractRoute> {
  return {
    list: route('GET', basePath, { authRequired: true, allowedRoles: readRoles }),
    get: route('GET', `${basePath}/{id}`, { authRequired: true, allowedRoles: readRoles }),
    create: route('POST', basePath, { authRequired: true, allowedRoles: writeRoles }),
    update: route('PATCH', `${basePath}/{id}`, { authRequired: true, allowedRoles: writeRoles }),
    delete: route('DELETE', `${basePath}/{id}`, { authRequired: true, allowedRoles: writeRoles }),
    restore: route('POST', `${basePath}/{id}/restore`, {
      authRequired: true,
      allowedRoles: writeRoles,
      featureGate: {
        feature: 'recordDeletion',
        requires: 'archive',
      },
    }),
  };
}

const authOptionalEndpoints: AuthOptionalEndpointMap = {
  sessions: route('GET', '/auth/sessions', {
    authRequired: true,
    featureGate: {
      feature: 'tokenMode',
      requires: 'app-jwt',
    },
    notes:
      'Available only when tokenMode is app-jwt. Feature-aware OpenAPI output omits session inventory endpoints for other token modes.',
  }),
  revokeSession: route('DELETE', '/auth/sessions/{id}', {
    authRequired: true,
    featureGate: {
      feature: 'tokenMode',
      requires: 'app-jwt',
    },
    notes: 'Available only when tokenMode is app-jwt.',
  }),
  mfaSetup: route('POST', '/auth/mfa/setup', {
    authRequired: true,
    allowedRoles: mfaRoles,
    featureGate: {
      feature: 'mfaMode',
      requiresAnyOf: ['local-totp', 'supabase-totp'],
    },
    notes: 'Available only when MFA is enabled in the selected feature profile.',
  }),
  mfaEnable: route('POST', '/auth/mfa/enable', {
    authRequired: true,
    allowedRoles: mfaRoles,
    featureGate: {
      feature: 'mfaMode',
      requiresAnyOf: ['local-totp', 'supabase-totp'],
    },
    notes: 'Available only when MFA is enabled in the selected feature profile.',
  }),
  mfaDisable: route('POST', '/auth/mfa/disable', {
    authRequired: true,
    allowedRoles: mfaRoles,
    featureGate: {
      feature: 'mfaMode',
      requiresAnyOf: ['local-totp', 'supabase-totp'],
    },
    notes: 'Available only when MFA is enabled in the selected feature profile.',
  }),
};

const pilotContract: PilotContract = {
  scope: 'tuguegarao-first',
  partnerLguExpansion: 'planned',
  governanceBaselineDoc: 'docs/tuguegarao-pilot-governance-baseline.md',
  notes:
    'CIRS pilot is Tuguegarao-first. City and barangay operations are the canonical scope; partner-LGU expansion is planned. National roles and surfaces are deferred until formal regional governance is enabled. Dashboard and mobile clients should treat this contract as the source of truth for canonical vs compatibility-only routes.',
};

const mobileCitizenSurface: MobileCitizenSurfaceContract = {
  label: 'Mobile Citizen (Canonical Pilot Surface)',
  basePath: '/mobile',
  pilotScope: 'tuguegarao-first',
  notes:
    'Canonical mobile-citizen surface for the Tuguegarao-first pilot (consumed by MyTuguegarao). Mobile clients SHOULD use these routes in preference to dashboard-shared aliases. Public Cagayan geography reference routes remain province-wide reference data for locality selection while backend authorization, jurisdiction scoping, and trust-layer rules continue to enforce the Tuguegarao-first pilot rollout server-side.',
  routes: {
    publishedContent: route('GET', '/mobile/content', {
      authRequired: false,
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Publicly available mobile app content. Backend filters audience to published, generic content only; draft and citizen-only entries are not exposed unauthenticated.',
    }),
    geographyReferenceMeta: route('GET', '/mobile/reference-data/geography/meta', {
      authRequired: false,
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Public Cagayan-wide mobile geography metadata for offline-first cache validation. Returns the overall Tuguegarao-first pilot scope alongside the active Cagayan province code and an opaque geographyVersion derived from the latest active province, locality, and barangay update timestamp.',
    }),
    cagayanLocalitiesReference: route('GET', '/mobile/cagayan/localities', {
      authRequired: false,
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Public Cagayan-wide mobile reference data for locality selection flows. Returns active Cagayan province metadata plus active child cities and municipalities with minimal fields (id, code, name, type). This reference dataset is broader than the current Tuguegarao-first rollout scope.',
    }),
    cagayanLocalityBarangaysReference: route(
      'GET',
      '/mobile/cagayan/localities/{localityId}/barangays',
      {
        authRequired: false,
        pilotScope: 'tuguegarao-first',
        compatibility: { status: 'canonical' },
        notes:
          'Public Cagayan-wide mobile reference data for barangay selection flows. Returns only active barangays for the selected active Cagayan locality with minimal fields (id, code, name). This reference dataset is broader than the current Tuguegarao-first rollout scope.',
      },
    ),
    getProfile: route('GET', '/mobile/profile', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        "Returns the authenticated citizen reporter's linked citizen profile. citizenId is inferred from the JWT subject; never accept it from the client.",
    }),
    linkProfile: route('PATCH', '/mobile/profile', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Creates or links the authenticated citizen reporter to their citizen profile. Supersedes POST /citizens/link-me for mobile clients.',
    }),
    listMyIncidents: route('GET', '/mobile/incidents', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes: 'Backend scopes results to the authenticated reporter only.',
    }),
    getMyIncident: route('GET', '/mobile/incidents/{id}', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Backend enforces per-reporter visibility. Other reporters receive 404 for incidents they do not own.',
    }),
    getMyIncidentTimeline: route('GET', '/mobile/incidents/{id}/timeline', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Status timeline scoped to the authenticated reporter. Internal-only fields are not exposed.',
    }),
    reportIncident: route('POST', '/mobile/incidents/report', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: { status: 'canonical' },
      notes:
        'Citizen self-report endpoint for mobile clients. citizenId is inferred from the JWT subject. Supersedes POST /incidents/report for mobile clients.',
    }),
  },
  compatibilityRoutes: {
    linkMeAlias: route('POST', '/citizens/link-me', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: {
        status: 'compatibility-only',
        supersededBy: 'mobileCitizenSurface.linkProfile',
        notes:
          'Preserved for dashboard-bootstrap and pre-mobile clients. New mobile clients should use PATCH /mobile/profile.',
      },
      notes:
        'Same controller as PATCH /mobile/profile. Authoritative for dashboard self-link and legacy clients.',
    }),
    incidentReportAlias: route('POST', '/incidents/report', {
      authRequired: true,
      allowedRoles: ['CITIZEN_REPORTER'],
      pilotScope: 'tuguegarao-first',
      compatibility: {
        status: 'compatibility-only',
        supersededBy: 'mobileCitizenSurface.reportIncident',
        notes:
          'Preserved for dashboard-bootstrap and pre-mobile clients. New mobile clients should use POST /mobile/incidents/report.',
      },
      notes:
        'Same controller as POST /mobile/incidents/report. Authoritative for dashboard-side citizen self-report and legacy clients.',
    }),
  },
  authBootstrap: {
    canonical: {
      mobileRegisterPath: '/auth/mobile/register',
      mobileLoginPath: '/auth/mobile/login',
      mePath: '/auth/me',
      logoutPath: '/auth/logout',
      refreshPath: '/auth/refresh',
    },
    compatibility: {
      registerPath: '/auth/register',
      loginPath: '/auth/login',
      notes:
        'Email-based register and login remain canonical for dashboard clients and remain accessible to mobile clients for compatibility. New mobile clients should prefer /auth/mobile/register and /auth/mobile/login with canonical split-name fields (firstName + lastName, optional middleName and suffix) so that a citizen profile is auto-linked.',
    },
  },
};

export const dashboardCrudConfig: DashboardCrudConfig = {
  apiBasePath: DASHBOARD_API_BASE_PATH,
  pilot: pilotContract,
  auth: {
    type: 'bearer',
    tokenHeader: 'Authorization',
    tokenPrefix: 'Bearer',
    bootstrap: {
      loginPath: '/auth/login',
      refreshPath: '/auth/refresh',
      registerPath: '/auth/register',
      mePath: '/auth/me',
      logoutPath: '/auth/logout',
      capabilitiesPath: '/users/capabilities',
      citizenLinkPath: '/citizens/link-me',
      incidentReportPath: '/incidents/report',
    },
    optionalEndpoints: authOptionalEndpoints,
  },
  resources: [
    {
      name: 'citizens',
      label: 'Citizens',
      primaryKey: 'id',
      routes: {
        ...buildCrudRoutes('/citizens', adminRoles, adminRoles),
        linkMe: route('POST', '/citizens/link-me', {
          authRequired: true,
          allowedRoles: ['CITIZEN_REPORTER'],
          notes:
            "Creates or updates the authenticated citizen reporter's linked citizen profile. contactInfo is inferred from the authenticated email.",
        }),
      },
    },
    {
      name: 'agencies',
      label: 'Agencies',
      primaryKey: 'id',
      routes: buildCrudRoutes('/agencies', dispatchRoles, adminRoles),
    },
    {
      name: 'responders',
      label: 'Responders',
      primaryKey: 'id',
      routes: buildCrudRoutes('/responders', dispatchRoles, adminRoles),
    },
    {
      name: 'statuses',
      label: 'Statuses',
      primaryKey: 'id',
      routes: buildCrudRoutes('/statuses', allAuthenticatedRoles, adminRoles),
    },
    {
      name: 'categories',
      label: 'Categories',
      primaryKey: 'id',
      routes: buildCrudRoutes('/categories', allAuthenticatedRoles, adminRoles),
    },
    {
      name: 'severities',
      label: 'Severities',
      primaryKey: 'id',
      routes: buildCrudRoutes('/severities', allAuthenticatedRoles, adminRoles),
    },
    {
      name: 'incidents',
      label: 'Incidents',
      primaryKey: 'id',
      routes: {
        list: route('GET', '/incidents', {
          authRequired: true,
          allowedRoles: incidentReadRoles,
          notes:
            'The backend applies role-aware scoping. Citizen reporters only receive their own incidents.',
        }),
        get: route('GET', '/incidents/{id}', {
          authRequired: true,
          allowedRoles: incidentReadRoles,
          notes:
            'The backend enforces per-role incident visibility. Citizen reporters can only access their own incident IDs.',
        }),
        create: route('POST', '/incidents', {
          authRequired: true,
          allowedRoles: incidentCreateRoles,
        }),
        report: route('POST', '/incidents/report', {
          authRequired: true,
          allowedRoles: ['CITIZEN_REPORTER'],
          notes:
            'Citizen self-report endpoint. citizenId is inferred from the authenticated user context.',
        }),
        update: route('PATCH', '/incidents/{id}', {
          authRequired: true,
          allowedRoles: incidentUpdateRoles,
        }),
        delete: route('DELETE', '/incidents/{id}', {
          authRequired: true,
          allowedRoles: incidentDeleteRoles,
        }),
        restore: route('POST', '/incidents/{id}/restore', {
          authRequired: true,
          allowedRoles: incidentRestoreRoles,
          featureGate: {
            feature: 'recordDeletion',
            requires: 'archive',
          },
        }),
        mediaAccess: route('GET', '/incidents/{id}/media/{mediaId}', {
          authRequired: true,
          allowedRoles: incidentReadRoles,
          notes:
            'Authenticated media access endpoint. The backend enforces incident-level authorization before resolving an access URL.',
        }),
        mediaUpload: route('POST', '/incidents/media/upload', {
          authRequired: true,
          allowedRoles: mediaUploadRoles,
          featureGate: {
            feature: 'mediaStorage',
            requires: 'supabase-storage',
          },
          notes:
            'Available only when the selected feature profile enables incident media uploads. Feature-aware OpenAPI output omits this operation when mediaStorage is disabled.',
        }),
      },
    },
    {
      name: 'assignments',
      label: 'Assignments',
      primaryKey: 'id',
      routes: buildCrudRoutes('/assignments', assignmentRoles, assignmentRoles),
    },
    {
      name: 'users',
      label: 'Users',
      primaryKey: 'id',
      routes: {
        capabilities: route('GET', '/users/capabilities', {
          authRequired: true,
          allowedRoles: allAuthenticatedRoles,
        }),
        ...buildCrudRoutes('/users', adminRoles, adminRoles),
      },
    },
    {
      name: 'adminUsers',
      label: 'Admin Users',
      primaryKey: 'id',
      routes: {
        list: route('GET', '/admin/users', {
          authRequired: true,
          allowedRoles: nationalAdminOnly,
          notes:
            'National-admin-only administrative user inventory endpoint exposed under the admin route surface.',
        }),
      },
    },
    {
      name: 'adminUserMfaCompliance',
      label: 'Privileged MFA Compliance',
      routes: {
        list: route('GET', '/admin/users/mfa-compliance', {
          authRequired: true,
          allowedRoles: nationalAdminOnly,
          notes:
            'Privileged MFA compliance report for national administrators. Use for security review dashboards rather than generic CRUD.',
        }),
      },
    },
    {
      name: 'adminUserAccessReview',
      label: 'Privileged Access Review',
      routes: {
        list: route('GET', '/admin/users/access-review', {
          authRequired: true,
          allowedRoles: nationalAdminOnly,
          notes:
            'Privileged access-review report for national administrators. Use for governance and stale-access review dashboards.',
        }),
      },
    },
    {
      name: 'adminSecurityDataGovernance',
      label: 'Security Data Governance',
      routes: {
        get: route('GET', '/admin/security/data-governance', {
          authRequired: true,
          allowedRoles: adminAndAuditorRoles,
          notes: 'Security and data-governance summary surface for admin and auditor dashboards.',
        }),
      },
    },
    {
      name: 'auditLogs',
      label: 'Audit Logs',
      primaryKey: 'id',
      routes: {
        list: route('GET', '/audit-logs', {
          authRequired: true,
          allowedRoles: auditReadRoles,
          notes:
            'Sensitive server-side audit log list surface. Requests remain read-only and should be handled as a dedicated review experience.',
        }),
        get: route('GET', '/audit-logs/{id}', {
          authRequired: true,
          allowedRoles: auditReadRoles,
          notes:
            'Sensitive server-side audit log detail surface. Requests remain read-only and should be handled as a dedicated review experience.',
        }),
      },
    },
  ],
  mobileCitizenSurface,
};

export function buildDashboardCrudConfigFlat(
  config: DashboardCrudConfig = dashboardCrudConfig,
): DashboardCrudFlatConfig {
  const optionalEndpoints = Object.entries(config.auth.optionalEndpoints).map(
    ([operation, endpoint]) => ({
      operation,
      ...endpoint,
      fullPath: `${config.apiBasePath}${endpoint.path}`,
    }),
  );

  const dashboardEndpoints: DashboardCrudFlatEndpointWithSurface[] = config.resources.flatMap(
    (resource) =>
      Object.entries(resource.routes).map(([operation, endpoint]) => ({
        resource: resource.name,
        label: resource.label,
        operation,
        ...endpoint,
        fullPath: `${config.apiBasePath}${endpoint.path}`,
        surface: 'dashboard' as const,
      })),
  );

  const mobileCanonicalEndpoints: DashboardCrudFlatEndpointWithSurface[] = Object.entries(
    config.mobileCitizenSurface.routes,
  ).map(([operation, endpoint]) => ({
    resource: 'mobileCitizen',
    label: config.mobileCitizenSurface.label,
    operation,
    ...endpoint,
    fullPath: `${config.apiBasePath}${endpoint.path}`,
    surface: 'mobile-citizen' as const,
  }));

  const mobileCompatibilityEndpoints: DashboardCrudFlatEndpointWithSurface[] = Object.entries(
    config.mobileCitizenSurface.compatibilityRoutes,
  ).map(([operation, endpoint]) => ({
    resource: 'mobileCitizen',
    label: config.mobileCitizenSurface.label,
    operation,
    ...endpoint,
    fullPath: `${config.apiBasePath}${endpoint.path}`,
    surface: 'mobile-citizen-compatibility' as const,
  }));

  return {
    apiBasePath: config.apiBasePath,
    pilot: config.pilot,
    auth: {
      type: config.auth.type,
      tokenHeader: config.auth.tokenHeader,
      tokenPrefix: config.auth.tokenPrefix,
      optionalEndpoints,
    },
    endpoints: [
      ...dashboardEndpoints,
      ...mobileCanonicalEndpoints,
      ...mobileCompatibilityEndpoints,
    ],
  };
}

export const dashboardCrudConfigFlat = buildDashboardCrudConfigFlat();
