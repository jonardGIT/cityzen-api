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
  notes?: string;
};

type ResourceContract = {
  name: string;
  label: string;
  primaryKey?: 'id';
  routes: Record<string, ContractRoute>;
};

type AuthOptionalEndpointMap = Record<string, ContractRoute>;

export interface DashboardCrudConfig {
  apiBasePath: string;
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
}

export interface DashboardCrudFlatEndpoint extends ContractRoute {
  resource: string;
  label: string;
  operation: string;
  fullPath: string;
}

export interface DashboardCrudFlatConfig {
  apiBasePath: string;
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
  endpoints: DashboardCrudFlatEndpoint[];
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

export const dashboardCrudConfig: DashboardCrudConfig = {
  apiBasePath: DASHBOARD_API_BASE_PATH,
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

  const endpoints = config.resources.flatMap((resource) =>
    Object.entries(resource.routes).map(([operation, endpoint]) => ({
      resource: resource.name,
      label: resource.label,
      operation,
      ...endpoint,
      fullPath: `${config.apiBasePath}${endpoint.path}`,
    })),
  );

  return {
    apiBasePath: config.apiBasePath,
    auth: {
      type: config.auth.type,
      tokenHeader: config.auth.tokenHeader,
      tokenPrefix: config.auth.tokenPrefix,
      optionalEndpoints,
    },
    endpoints,
  };
}

export const dashboardCrudConfigFlat = buildDashboardCrudConfigFlat();
