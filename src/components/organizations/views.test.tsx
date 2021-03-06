import cheerio from 'cheerio';
import { shallow } from 'enzyme';
import React from 'react';

import { IOrganization, IOrganizationQuota } from '../../lib/cf/types';

import { OrganizationsPage } from './views';

function linker(_route: string, params: any): string {
  return params?.organizationGUID ? `/org/${params.organizationGUID}` : '/test';
}

describe(OrganizationsPage, () => {
  const orgA = ({
    metadata: { guid: 'a' },
    entity: { name: 'A', quota_definition_guid: 'trial' },
  } as unknown) as IOrganization;
  const orgB = ({
    metadata: { guid: 'b' },
    entity: { name: 'B', quota_definition_guid: 'billable' },
  } as unknown) as IOrganization;
  const quotaBillable = ({
    entity: { name: 'not-default' },
  } as unknown) as IOrganizationQuota;
  const quotaFree = ({
    entity: { name: 'default' },
  } as unknown) as IOrganizationQuota;
  const quotas = { billable: quotaBillable, trial: quotaFree };

  it('should display list of organizations', () => {
    const markup = shallow(
      <OrganizationsPage
        organizations={[orgA, orgB]}
        linkTo={linker}
        quotas={quotas}
      />,
    );
    const $ = cheerio.load(markup.html());
    expect($('p.govuk-body:first-of-type').text()).toContain(
      'There are 2 organisations which you can access.',
    );
    expect($('table tbody tr')).toHaveLength(2);

    expect($('table tbody tr:first-of-type a.govuk-link').text()).toBe('A');
    expect($('table tbody tr:first-of-type a.govuk-link').prop('href')).toBe(
      '/org/a',
    );
    expect($('table tbody tr:first-of-type td:last-of-type').text()).toBe(
      'Trial',
    );

    expect($('table tr:last-of-type a.govuk-link').text()).toBe('B');
    expect($('table tr:last-of-type a.govuk-link').prop('href')).toBe('/org/b');
    expect($('table tr:last-of-type td:last-of-type').text()).toBe('Billable');
  });

  it('should display list of organizations with single item', () => {
    const markup = shallow(
      <OrganizationsPage
        organizations={[orgA]}
        linkTo={linker}
        quotas={quotas}
      />,
    );
    const $ = cheerio.load(markup.html());
    expect($('p.govuk-body:first-of-type').text()).toContain(
      'There is 1 organisation which you can access.',
    );
    expect($('table tbody tr')).toHaveLength(1);
  });
});
