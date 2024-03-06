import aws from 'aws-sdk';
import { getAllTemplates } from '../index.mjs'; // Adjust the import path as needed

// Assume a variable for caching templates is declared somewhere in your module
let cachedTemplates = null;

// Resetting modules and cached templates to ensure a clean state
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  cachedTemplates = null; // Reset the cached templates before each test
});

// Mock the entire AWS SDK
jest.mock('aws-sdk', () => {
  // Mock the scan method
  const scanMock = jest.fn();
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        scan: scanMock
      })),
    },
    scanMock, // Make scanMock accessible for changing its implementation
  };
});

describe('getAllTemplates', () => {
  const templatesPage1 = [
    { template_id: 'template1', name: 'Template 1' },
    { template_id: 'template2', name: 'Template 2' }
  ];

  const templatesPage2 = [
    { template_id: 'template3', name: 'Template 3' }
  ];

  beforeEach(() => {
      // Reset mock implementation before each test
      aws.scanMock.mockReset();
  });

  it('should retrieve all templates from multiple pages', async () => {
      // Mock implementation to simulate pagination
      aws.scanMock
          .mockImplementationOnce(() => {
              return {
                  promise: jest.fn().mockResolvedValue({
                      Items: templatesPage1,
                      LastEvaluatedKey: 'key1'
                  }),
              };
          })
          .mockImplementationOnce(() => {
              return {
                  promise: jest.fn().mockResolvedValue({
                      Items: templatesPage2,
                      LastEvaluatedKey: null // Indicate the end of the data
                  }),
              };
          });

      const tableName = 'TemplatesTable';
      const templates = await getAllTemplates(tableName);

      expect(templates).toEqual([...templatesPage1, ...templatesPage2]);
      expect(aws.scanMock).toHaveBeenCalledTimes(2); // Called twice for pagination
  });
});
