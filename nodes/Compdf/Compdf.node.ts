
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';

const FIXED_EXECUTE_TYPE_URLS: Record<string, string> = {
  pdfToWord: 'pdf/docx',
  pdfToJson: 'pdf/json',
  pdfToEditablePdf: 'pdf/editable',
  intelligentDocumentExtraction: 'idp/documentExtract',
  intelligentDocumentParsing: 'idp/documentParsing',
  pdfGeneration: 'pdf/generate',
  pdfMerger: 'pdf/merge',
  pdfSplit: 'pdf/split',
  pdfExtract: 'pdf/extract',
  compress: 'pdf/compress',
  compareDocuments: 'pdf/contentCompare',
};

const FILE_PROCESSING_OPERATIONS = [
  'pdfToWord',
  'pdfToJson',
  'pdfToOthers',
  'pdfToEditablePdf',
  'othersToPdf',
  'imageToOthers',
  'intelligentDocumentExtraction',
  'intelligentDocumentParsing',
  'pdfGeneration',
  'pdfMerger',
  'pdfSplit',
  'pdfExtract',
  'pdfPageTools',
  'security',
  'compress',
  'compareDocuments',
];

const CUSTOM_URL_OPERATIONS = [
  'pdfToOthers',
  'othersToPdf',
  'imageToOthers',
  'pdfPageTools',
  'security',
];

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
          { name: 'PDF to Word', value: 'pdfToWord', description: 'Convert PDF files into Word' },
          { name: 'PDF to Json', value: 'pdfToJson', description: 'Convert PDF files into Json' },
          { name: 'PDF to Others', value: 'pdfToOthers', description: 'Convert PDF files into other formats such as Excel, PPT, HTML, RTF, PNG, JPG, TXT, CSV, Markdown' },
          { name: 'PDF to Editable PDF (OCR)', value: 'pdfToEditablePdf', description: 'Convert scanned or image-based PDFs into fully editable and searchable PDFs using OCR' },
          { name: 'Others to PDF', value: 'othersToPdf', description: 'Convert files such as Word, Excel, PPT, HTML, RTF, images, TXT, or CSV into PDF format' },
          { name: 'Image to Others', value: 'imageToOthers', description: 'Convert image files into other formats, including documents or editable files' },
          { name: 'Intelligent Document Extraction', value: 'intelligentDocumentExtraction', description: 'AI-powered extraction to automatically capture key information and map intelligent fields' },
          { name: 'Intelligent Document Parsing', value: 'intelligentDocumentParsing', description: 'AI-powered parsing to transform unstructured documents into structured data' },
          { name: 'PDF Generation', value: 'pdfGeneration', description: 'Generate PDFs in batch from HTML templates or via a PDF generation API' },
          { name: 'PDF Merger', value: 'pdfMerger', description: 'Merge multiple PDF files or selected pages from different documents into a single PDF' },
          { name: 'PDF Split', value: 'pdfSplit', description: 'Split a PDF into separate files based on pages or page ranges' },
          { name: 'PDF Extract', value: 'pdfExtract', description: 'Extract images from documents and save them as image files or PDFs' },
          { name: 'PDF Page Tools', value: 'pdfPageTools', description: 'Organize PDF pages by splitting, merging, rotating, inserting, or deleting pages' },
          { name: 'Security', value: 'security', description: 'Add or remove watermarks from PDF documents in bulk' },
          { name: 'Compress', value: 'compress', description: 'Compress PDF files with customizable settings without losing visual quality' },
          { name: 'Compare Documents', value: 'compareDocuments', description: 'Compare documents using Content Compare by analyzing text and images' },
          { name: 'Get Task Information', value: 'getTaskInfo', description: 'Query task status and results after processing' },
        ],
        default: 'pdfToWord',
      },
      {
        displayName: 'Execute Type URL',
        name: 'executeTypeUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'The execute type URL path for the API endpoint',
        displayOptions: { show: { operation: CUSTOM_URL_OPERATIONS } },
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'The name of the binary property containing the file to process',
        displayOptions: { show: { operation: FILE_PROCESSING_OPERATIONS } },
      },
      {
        displayName: 'Parameter',
        name: 'parameter',
        type: 'string',
        default: '',
        required: true,
        description: 'Processing parameter for the API request',
        displayOptions: { show: { operation: FILE_PROCESSING_OPERATIONS } },
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        default: '2',
        description: 'Language setting for OCR and text recognition',
        displayOptions: { show: { operation: FILE_PROCESSING_OPERATIONS } },
      },
      {
        displayName: 'Task ID',
        name: 'taskId',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the task to query',
        displayOptions: { show: { operation: ['getTaskInfo'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const creds = await this.getCredentials('compdfApi');
        const apiKey = creds.apiKey as string;

        if (operation !== 'getTaskInfo') {
          const binaryName = this.getNodeParameter('binaryPropertyName', i) as string;
          const binaryData = this.helpers.assertBinaryData(i, binaryName);
          const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryName);

          const executeTypeUrl = FIXED_EXECUTE_TYPE_URLS[operation]
            ?? this.getNodeParameter('executeTypeUrl', i) as string;

          const formData = new FormData();
          formData.append('file', new Blob([new Uint8Array(fileBuffer)]), binaryData.fileName ?? 'file');
          formData.append('parameter', this.getNodeParameter('parameter', i) as string);
          formData.append('language', this.getNodeParameter('language', i) as string);

          const response = await this.helpers.httpRequest({
            method: 'POST',
            url: `https://api-server.compdf.com/server/v2/processAsync/${executeTypeUrl}`,
            headers: { 'x-api-key': apiKey },
            body: formData,
          });

          const items_out = Array.isArray(response) ? response : [response];
          for (const item of items_out) {
            returnData.push({ json: item, pairedItem: { item: i } });
          }
        } else {
          const taskId = this.getNodeParameter('taskId', i) as string;
          if (!taskId) {
            throw new NodeOperationError(this.getNode(), 'Task ID is required', { itemIndex: i });
          }

          const res = await this.helpers.httpRequest({
            method: 'GET',
            url: 'https://api-server.compdf.com/server/v2/task/taskInfo',
            headers: { 'x-api-key': apiKey },
            qs: { taskId },
          });

          const data = res.data ?? res;
          const items_out = Array.isArray(data) ? data : [data];
          for (const item of items_out) {
            returnData.push({ json: item, pairedItem: { item: i } });
          }
        }
      } catch (error) {
        if (error instanceof NodeOperationError || error instanceof NodeApiError) {
          throw error;
        }
        const err = error as { message?: string; statusCode?: number; [key: string]: unknown };
        throw new NodeApiError(this.getNode(), { message: err.message ?? String(error) }, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
