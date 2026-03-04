
import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CompdfApi implements ICredentialType {
  name = 'compdfApi';
  displayName = 'ComPDF API';
  properties: INodeProperties[] = [
    {
      displayName: 'Public API Key',
      name: 'apiKey',
      type: 'string',
      default: '',
      required: true,
    },
  ];
}
