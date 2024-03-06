import { handler } from '../index.mjs'; 
import AWS from 'aws-sdk'; // Ensure this matches how you import AWS SDK in your main file
import { v4 as uuidv4 } from 'uuid';

// Mock aws-sdk's DynamoDB.DocumentClient
jest.mock('aws-sdk', () => ({
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        // Mock the scan method
        scan: jest.fn().mockImplementation(() => ({
          promise: () => Promise.resolve({
            Items: [], // Ensure this is an array to mimic actual DynamoDB response
            LastEvaluatedKey: undefined
          })
        })),
        // Mock the delete method
        delete: jest.fn().mockImplementation(() => ({
          promise: () => Promise.resolve({})
        })),
        // Mock the batchWrite method
        batchWrite: jest.fn().mockImplementation(() => ({
          promise: () => Promise.resolve({})
        }))
      }))
    }
  }));
  

describe('Handler function', () => {
    beforeEach(() => {
        // Access the promise implementation directly
        const { promise } = new AWS.DynamoDB.DocumentClient().scan();
      
        // Reset the promise mock to default behavior
        promise.mockReset();
      
        // Then set up specific mock behaviors for each test case as needed
        promise
          .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined }) // First call mock, e.g., for scan
          .mockResolvedValueOnce({}) // Second call mock, e.g., for delete
          .mockResolvedValueOnce({}); // Third call mock, e.g., for batchWrite
      });

  it('should successfully handle event and create challenges', async () => {
    const event = {
      body: JSON.stringify({
        season_id: 'season_1',
        start_date: '2021-01-01',
        buckets: [
          {
            bucket_id: 1,
            average_skill: 100,
            users: ['user1'],
          },
        ],
      }),
    };

    const response = await handler(event);

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges created successfully." }),
    });

    const documentClientMock = new aws.DynamoDB.DocumentClient();

    // Verify DynamoDB methods were called
    expect(documentClientMock.scan).toHaveBeenCalledTimes(1);
    expect(documentClientMock.delete).toHaveBeenCalledTimes(0); // Adjust based on the mock data
    expect(documentClientMock.batchWrite).toHaveBeenCalledTimes(1);

    // Verify UUID generation was called
    expect(uuid.v4).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
