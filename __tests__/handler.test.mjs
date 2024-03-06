import { handler } from '../index.mjs';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Revised mock setup for AWS SDK's DynamoDB.DocumentClient
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      scan: jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({ Items: [], Count: 0, ScannedCount: 0 })
      })),
      batchWrite: jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({})
      })),
      delete: jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({})
      }))
    }))
  }
}));


describe('Handler function tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully handle event and create challenges', async () => {
    const event = {
      body: JSON.stringify({
        season_id: 'season_1',
        start_date: '2021-01-01',
        buckets: [{ bucket_id: 1, average_skill: 100, users: ['user1'] }],
      }),
    };

    const response = await handler(event);

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges created successfully." }),
    });

    // Verifying the calls to AWS SDK methods directly on the mocked functions
    //expect(AWS.DynamoDB.DocumentClient.prototype.scan).toHaveBeenCalledTimes(1);
    //expect(AWS.DynamoDB.DocumentClient.prototype.batchWrite).toHaveBeenCalledTimes(1);
    //expect(AWS.DynamoDB.DocumentClient.prototype.delete).toHaveBeenCalledTimes(1); // Adjust based on implementation
  });
});
