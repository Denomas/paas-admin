import { IOrganization } from '../types';

export const orgName      = 'the-system_domain-org-name';
export const orgGUID      = 'a7aff246-5f5b-4cf8-87d8-f316053e4a20';
export const orgQuotaGUID = 'dcb680a9-b190-4838-a3d2-b84aa17517a6';

export const org = (): IOrganization => JSON.parse(`{
  "metadata": {
    "guid": "${orgGUID}",
    "url": "/v2/organizations/${orgGUID}",
    "created_at": "2016-06-08T16:41:33Z",
    "updated_at": "2016-06-08T16:41:26Z"
  },
  "entity": {
    "name": "${orgName}",
    "billing_enabled": false,
    "quota_definition_guid": "${orgQuotaGUID}",
    "status": "active",
    "quota_definition_url": "/v2/quota_definitions/${orgQuotaGUID}",
    "spaces_url": "/v2/organizations/${orgGUID}/spaces",
    "domains_url": "/v2/organizations/${orgGUID}/domains",
    "private_domains_url": "/v2/organizations/${orgGUID}/private_domains",
    "users_url": "/v2/organizations/${orgGUID}/users",
    "managers_url": "/v2/organizations/${orgGUID}/managers",
    "billing_managers_url": "/v2/organizations/${orgGUID}/billing_managers",
    "auditors_url": "/v2/organizations/${orgGUID}/auditors",
    "app_events_url": "/v2/organizations/${orgGUID}/app_events",
    "space_quota_definitions_url": "/v2/organizations/${orgGUID}/space_quota_definitions"
  }
}`);