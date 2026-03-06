
import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class CompdfApi implements ICredentialType {
  name = 'compdfApi';
  displayName = 'ComPDF API';
  properties: INodeProperties[] = [
    {
      displayName: 'Public API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api-server.compdf.com',
      url: '/server/v2/tool/support',
      method: 'GET',
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };
}
