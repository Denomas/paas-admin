import nock from 'nock';
import pino from 'pino';

import * as data from './cf.test.data';

import CloudFoundryClient from '.';

const config = {
  apiEndpoint: 'https://example.com/api',
  accessToken: 'qwerty123456',
  logger: pino({level: 'silent'}),
};

// tslint:disable:max-line-length
nock('https://example.com/api').persist()
  .get('/v2/info').reply(200, data.info)
  .post('/v2/organizations').reply(201, data.organization)
  .get('/v2/organizations').reply(200, data.organizations)
  .get(`/v2/organizations/${data.organizationGuid}`).reply(200, data.organization)
  .delete(`/v2/organizations/${data.organizationGuid}?recursive=true&async=false`).reply(204)
  .get('/v2/quota_definitions').reply(200, data.organizations)
  .get('/v2/quota_definitions?q=name:the-system_domain-org-name').reply(200, data.organizations)
  .get('/v2/quota_definitions/80f3e539-a8c0-4c43-9c72-649df53da8cb').reply(200, data.organizationQuota)
  .get(`/v2/organizations/${data.organizationGuid}/spaces`).reply(200, data.spaces)
  .get(`/v2/spaces/${data.spaceGuid}/apps`).reply(200, data.apps)
  .get('/v2/apps/15b3885d-0351-4b9b-8697-86641668c123').times(1).reply(200, data.app)
  .get('/v2/apps/cd897c8c-3171-456d-b5d7-3c87feeabbd1/summary').times(1).reply(200, data.appSummary)
  .get(`/v2/spaces/${data.spaceGuid}`).reply(200, data.space)
  .get(`/v2/spaces/${data.spaceGuid}/summary`).reply(200, data.spaceSummary)
  .get('/v2/space_quota_definitions/a9097bc8-c6cf-4a8f-bc47-623fa22e8019').reply(200, data.spaceQuota)
  .get(`/v2/spaces/${data.spaceGuid}/service_instances`).reply(200, data.services)
  .get('/v2/service_instances/0d632575-bb06-4ea5-bb19-a451a9644d92').times(1).reply(200, data.serviceInstance)
  .get('/v2/service_plans/775d0046-7505-40a4-bfad-ca472485e332').times(1).reply(200, data.servicePlan)
  .get('/v2/services/53f52780-e93c-4af7-a96c-6958311c40e5').times(1).reply(200, data.service)
  .get('/v2/user_provided_service_instances?q=space_guid:594c1fa9-caed-454b-9ed8-643a093ff91d').times(1).reply(200, data.userServices)
  .get('/v2/user_provided_service_instances/e9358711-0ad9-4f2a-b3dc-289d47c17c87').times(1).reply(200, data.userServiceInstance)
  .post('/v2/users').reply(201, data.user)
  .delete('/v2/users/guid-cb24b36d-4656-468e-a50d-b53113ac6177?async=false').reply(204)
  .get(`/v2/users/uaa-id-253/spaces?q=organization_guid:${data.organizationGuid}`).reply(200, data.spaces)
  .get('/v2/users/uaa-id-253/summary').reply(200, data.userSummary)
  .get(`/v2/organizations/${data.organizationGuid}/user_roles`).reply(200, data.userRolesForOrg)
  .get(`/v2/spaces/${data.organizationGuid}/user_roles`).reply(200, data.userRolesForSpace)
  .post('/v2/users').reply(200, data.user)
  .put(`/v2/organizations/${data.organizationGuid}/users/uaa-id-236?recursive=true`).reply(201, data.userRoles)
  .delete(`/v2/organizations/${data.organizationGuid}/users/uaa-id-236?recursive=true`).reply(204, {})
  .put(`/v2/spaces/${data.spaceGuid}/developer/uaa-id-381`).reply(201, data.userRoles)
  .delete(`/v2/spaces/${data.spaceGuid}/developer/uaa-id-381`).reply(204, {})
  .get('/v2/stacks').reply(200, data.stacks)
  .get('/v2/stacks/bb9ca94f-b456-4ebd-ab09-eb7987cce728').reply(200, data.stack)
  .get('/v2/failure/404').reply(404, `{"error": "FAKE_404"}`)
  .get('/v2/failure/500').reply(500, `FAKE_500`)
  .get('/v2/test').reply(200, `{"next_url":"/v2/test?page=2","resources":["a"]}`)
  .get('/v2/test?page=2').reply(200, `{"next_url":null,"resources":["b"]}`)
  .put('/v2/organizations/guid-cb24b36d-4656-468e-a50d-b53113ac6177/users/uaa-id-236').reply(201, {
    metadata: {guid: 'guid-cb24b36d-4656-468e-a50d-b53113ac6177'},
  })
;

nock('https://example.com/uaa').persist()
  .post('/oauth/token?grant_type=client_credentials').reply(200, `{"access_token": "TOKEN_FROM_ENDPOINT"}`)
;
// tslint:enable:max-line-length

describe('lib/cf test suite', () => {
  test('should fail to get token client without accessToken or clientCredentials', async () => {
    const client = new CloudFoundryClient({
      apiEndpoint: 'https://example.com/api',
      logger: pino({level: 'silent'}),
    });
    await expect(client.getAccessToken()).rejects.toThrow(/accessToken or clientCredentials are required/);
  });

  test('should get token from tokenEndpoint in info', async () => {
    const client = new CloudFoundryClient({
      apiEndpoint: 'https://example.com/api',
      clientCredentials: {clientID: 'my-id', clientSecret: 'my-secret'},
      logger: pino({level: 'silent'}),
    });

    expect(await client.getAccessToken()).toEqual('TOKEN_FROM_ENDPOINT');
    // Should be cached from now on. Nock should throw error if asked twice.
    expect(await client.getAccessToken()).toEqual('TOKEN_FROM_ENDPOINT');
  });

  test('should create a client correctly', async () => {
    const client = new CloudFoundryClient(config);
    const info = await client.info();
    expect(info.version).toEqual(2);
  });

  test('should iterate over all pages to gather resources', async () => {
    const client = new CloudFoundryClient(config);
    const response = await client.request('get', '/v2/test');
    const collection = await client.allResources(response);

    expect([...collection].length).toEqual(2);
    expect(collection[1]).toEqual('b');
  });

  test('should throw an error when receiving 404', async () => {
    const client = new CloudFoundryClient(config);
    await expect(client.request('get', '/v2/failure/404')).rejects.toThrow(/FAKE_404/);
  });

  test('should throw an error when encountering unrecognised error', async () => {
    const client = new CloudFoundryClient(config);
    await expect(client.request('get', '/v2/failure/500')).rejects.toThrow(/status 500/);
  });

  test('should create an organisation', async () => {
    const client = new CloudFoundryClient(config);
    const organization = await client.createOrganization({
      name: 'some-org-name', quota_definition_guid: 'some-quota-definition-guid',
    });

    expect(organization.entity.name).toEqual('the-system_domain-org-name');
  });

  test('should obtain list of organisations', async () => {
    const client = new CloudFoundryClient(config);
    const organizations = await client.organizations();

    expect(organizations.length > 0).toBeTruthy();
    expect(organizations[0].entity.name).toEqual('the-system_domain-org-name');
  });

  test('should obtain single organisation', async () => {
    const client = new CloudFoundryClient(config);
    const organization = await client.organization(data.organizationGuid);

    expect(organization.entity.name).toEqual('the-system_domain-org-name');
  });

  test('should delete an organisation', async () => {
    const client = new CloudFoundryClient(config);
    await client.deleteOrganization({
      guid: data.organizationGuid,
      recursive: true,
      async: false,
    });
  });

  test('should list all quota definitions', async () => {
    const client = new CloudFoundryClient(config);
    const quotas = await client.quotaDefinitions();

    expect(quotas.length).toBe(1);
    expect(quotas[0].entity.name).toEqual('the-system_domain-org-name');
  });

  test('should filter quota definitions', async () => {
    const client = new CloudFoundryClient(config);
    const quotas = await client.quotaDefinitions({name: 'the-system_domain-org-name'});

    expect(quotas.length).toBe(1);
    expect(quotas[0].entity.name).toEqual('the-system_domain-org-name');
  });

  test('should obtain organisation quota', async () => {
    const client = new CloudFoundryClient(config);
    const quota = await client.organizationQuota('80f3e539-a8c0-4c43-9c72-649df53da8cb');

    expect(quota.entity.name).toEqual('name-1996');
  });

  test('should obtain list of spaces', async () => {
    const client = new CloudFoundryClient(config);
    const spaces = await client.spaces(data.organizationGuid);

    expect(spaces.length > 0).toBeTruthy();
    expect(spaces[0].entity.name).toEqual('name-1774');
  });

  test('should obtain single space', async () => {
    const client = new CloudFoundryClient(config);
    const space = await client.space(data.spaceGuid);

    expect(space.entity.name).toEqual('name-2064');
  });

  test('should obtain single space', async () => {
    const client = new CloudFoundryClient(config);
    const space = await client.spaceSummary(data.spaceGuid);

    expect(space.name).toEqual('name-1382');
  });

  test('should obtain space quota', async () => {
    const client = new CloudFoundryClient(config);
    const quota = await client.spaceQuota('a9097bc8-c6cf-4a8f-bc47-623fa22e8019');

    expect(quota.entity.name).toEqual('name-1491');
  });

  test('should obtain list of spaces for specific user in given org', async () => {
    const client = new CloudFoundryClient(config);
    const spaces = await client.spacesForUserInOrganization('uaa-id-253', data.organizationGuid);

    expect(spaces.length > 0).toBeTruthy();
    expect(spaces[0].entity.name).toEqual('name-1774');
  });

  test('should obtain list of apps', async () => {
    const client = new CloudFoundryClient(config);
    const apps = await client.applications(data.spaceGuid);

    expect(apps.length > 0).toBeTruthy();
    expect(apps[0].entity.name).toEqual('name-2131');
  });

  test('should obtain particular app', async () => {
    const client = new CloudFoundryClient(config);
    const app = await client.application('15b3885d-0351-4b9b-8697-86641668c123');

    expect(app.entity.name).toEqual('name-2401');
  });

  test('should obtain app summary', async () => {
    const client = new CloudFoundryClient(config);
    const app = await client.applicationSummary('cd897c8c-3171-456d-b5d7-3c87feeabbd1');

    expect(app.name).toEqual('name-79');
  });

  test('should obtain app summary', async () => {
    const client = new CloudFoundryClient(config);
    const app = await client.applicationSummary('cd897c8c-3171-456d-b5d7-3c87feeabbd1');

    expect(app.name).toEqual('name-79');
  });

  test('should obtain list of services', async () => {
    const client = new CloudFoundryClient(config);
    const services = await client.services(data.spaceGuid);

    expect(services.length > 0).toBeTruthy();
    expect(services[0].entity.name).toEqual('name-2104');
  });

  test('should obtain particular service instance', async () => {
    const client = new CloudFoundryClient(config);
    const serviceInstance = await client.serviceInstance('0d632575-bb06-4ea5-bb19-a451a9644d92');

    expect(serviceInstance.entity.name).toEqual('name-1508');
  });

  test('should obtain particular service plan', async () => {
    const client = new CloudFoundryClient(config);
    const servicePlan = await client.servicePlan('775d0046-7505-40a4-bfad-ca472485e332');

    expect(servicePlan.entity.name).toEqual('name-1573');
  });

  test('should obtain particular service', async () => {
    const client = new CloudFoundryClient(config);
    const service = await client.service('53f52780-e93c-4af7-a96c-6958311c40e5');

    expect(service.entity.label).toEqual('label-58');
  });

  test('should create a user', async () => {
    const client = new CloudFoundryClient(config);
    const user = await client.createUser('guid-cb24b36d-4656-468e-a50d-b53113ac6177');
    expect(user.metadata.guid).toEqual('guid-cb24b36d-4656-468e-a50d-b53113ac6177');
  });

  test('should delete a user', async () => {
    const client = new CloudFoundryClient(config);
    expect(async () => client.deleteUser('guid-cb24b36d-4656-468e-a50d-b53113ac6177')).not.toThrowError();
  });

  test('should obtain a user summary', async () => {
    const client = new CloudFoundryClient(config);
    const summary = await client.userSummary('uaa-id-253');

    expect(summary.entity.organizations.length === 1).toBeTruthy();
    expect(summary.entity.managed_organizations.length === 1).toBeTruthy();
    expect(summary.entity.billing_managed_organizations.length === 1).toBeTruthy();
    expect(summary.entity.audited_organizations.length === 1).toBeTruthy();
  });

  test('should obtain list of user roles for organisation', async () => {
    const client = new CloudFoundryClient(config);
    const users = await client.usersForOrganization(data.organizationGuid);

    expect(users.length > 0).toBeTruthy();
    expect(users[0].entity.username).toEqual('user@uaa.example.com');
    expect(users[0].entity.organization_roles.length).toEqual(4);
  });

  test('should obtain list of user roles for space', async () => {
    const client = new CloudFoundryClient(config);
    const users = await client.usersForSpace(data.organizationGuid);

    expect(users.length > 0).toBeTruthy();
    expect(users[0].entity.username).toEqual('everything@example.com');
    expect(users[0].entity.space_roles.length).toEqual(3);
  });

  test('should be able to assign a user to an organisation by username', async () => {
    const client = new CloudFoundryClient(config);
    const organization = await client.assignUserToOrganization(
      'guid-cb24b36d-4656-468e-a50d-b53113ac6177',
      'uaa-id-236',
    );

    expect(organization.metadata.guid).toEqual('guid-cb24b36d-4656-468e-a50d-b53113ac6177');
  });

  test('should be able to set user org roles', async () => {
    const client = new CloudFoundryClient(config);
    const users = await client.setOrganizationRole(data.organizationGuid, `uaa-id-236`, 'users', true);

    expect(users.entity.name).toEqual('name-1753');
  });

  test('should be able to remove user org roles', async () => {
    const client = new CloudFoundryClient(config);
    const roles = await client
      .setOrganizationRole(data.organizationGuid, `uaa-id-236`, 'users', false);

    expect(Object.keys(roles).length).toEqual(0);
  });

  test('should be able to set user space roles', async () => {
    const client = new CloudFoundryClient(config);
    const users = await client.setSpaceRole(data.spaceGuid, 'uaa-id-381', 'developer', true);

    expect(users.entity.name).toEqual('name-1753');
  });

  test('should be able to remove user space roles', async () => {
    const client = new CloudFoundryClient(config);
    const users = await client.setSpaceRole(data.spaceGuid, 'uaa-id-381', 'developer', false);

    expect(Object.keys(users).length).toEqual(0);
  });

  test('should obtain list of user roles for organisation and not find logged in user', async () => {
    const client = new CloudFoundryClient(config);
    const hasRole = await client.hasOrganizationRole(
      data.organizationGuid,
      'not-existing-user',
      'org_manager',
    );

    expect(hasRole).toBeFalsy();
  });

  test('should obtain list of user provided services', async () => {
    const client = new CloudFoundryClient(config);
    const services = await client.userServices('594c1fa9-caed-454b-9ed8-643a093ff91d');

    expect(services.length > 0).toBeTruthy();
    expect(services[0].entity.name).toEqual('name-1696');
  });

  test('should obtain user provided service', async () => {
    const client = new CloudFoundryClient(config);
    const service = await client.userServiceInstance('e9358711-0ad9-4f2a-b3dc-289d47c17c87');

    expect(service.entity.name).toEqual('name-1700');
  });

  test('should obtain list of stacks', async () => {
    const client = new CloudFoundryClient(config);
    const stacks = await client.stacks();

    expect(stacks.length > 0).toBeTruthy();
    expect(stacks[0].entity.name).toEqual('cflinuxfs2');
    expect(stacks[1].entity.name).toEqual('cflinuxfs3');
  });

  test('should obtain a stack', async () => {
    const client = new CloudFoundryClient(config);
    const stack = await client.stack('bb9ca94f-b456-4ebd-ab09-eb7987cce728');

    expect(stack.entity.name).toEqual('cflinuxfs3');
  });

  test('should get the GUID of cflinuxfs2', async () => {
    const client = new CloudFoundryClient(config);
    const cflinuxfs2StackGUID = await client.cflinuxfs2StackGUID();

    expect(cflinuxfs2StackGUID).toEqual('dd63d39a-85f8-48ef-bb73-89097192cfcb');
  });

  test('should return undefined when cflinuxfs2 is not present', async () => {
    nock.cleanAll();
    nock('https://example.com/api').get('/v2/stacks').reply(200, data.stacksWithoutCflinuxfs2);

    const client = new CloudFoundryClient(config);
    const cflinuxfs2StackGUID = await client.cflinuxfs2StackGUID();

    expect(cflinuxfs2StackGUID).toEqual(undefined);
  });
});
