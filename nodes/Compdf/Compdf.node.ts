
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import FormData from 'form-data';

export class Compdf implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComPDF',
    name: 'compdf',
    icon: 'file:compdf.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter.operation}}',
    description: 'ComPDF async processing API',
    defaults: { name: 'ComPDF' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'compdfApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'File Processing (Async)', value: 'fileProcessing' },
          { name: 'Get Task Information', value: 'getTaskInfo' }
        ],
        default: 'fileProcessing',
      },
      {
        displayName: 'Execute Type URL',
        name: 'executeTypeUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['fileProcessing'] } }
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        displayOptions: { show: { operation: ['fileProcessing'] } }
      },
      {
        displayName: 'Parameter',
        name: 'parameter',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['fileProcessing'] } }
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        default: '2',
        displayOptions: { show: { operation: ['fileProcessing'] } }
      },
      {
        displayName: 'Task ID',
        name: 'taskId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['getTaskInfo'] } }
      }
    ]
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const operation = this.getNodeParameter('operation', 0);
    const creds = await this.getCredentials('compdfApi');
    const apiKey = creds.apiKey as string;

    if (operation === 'fileProcessing') {
      const binaryName = this.getNodeParameter('binaryPropertyName', 0) as string;
      const binaryData = this.helpers.assertBinaryData(0, binaryName);

      const form = new FormData();
      form.append('file', Buffer.from(binaryData.data, 'base64'), binaryData.fileName);
      form.append('parameter', this.getNodeParameter('parameter', 0));
      form.append('language', this.getNodeParameter('language', 0));

      const executeTypeUrl = this.getNodeParameter('executeTypeUrl', 0);

      const response = await this.helpers.httpRequest({
        method: 'POST',
        url: `https://api-server.compdf.com/server/v2/processAsync/${executeTypeUrl}`,
        headers: { 'x-api-key': apiKey, ...form.getHeaders() },
        body: form,
      });

      return [this.helpers.returnJsonArray(response)];
    }

    const taskId = this.getNodeParameter('taskId', 0);
    for (let i = 0; i < 10; i++) {
      const res = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://api-server.compdf.com/server/v2/task/taskInfo',
        headers: { 'x-api-key': apiKey },
        qs: { taskId },
      });

      if (['TaskFinish', 'TaskError', 'TaskCancel'].includes(res?.data?.taskStatus)) {
        return [this.helpers.returnJsonArray(res.data)];
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    return [this.helpers.returnJsonArray({ taskId, finalStatus: 'Timeout' })];
  }
}
