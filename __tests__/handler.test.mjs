import { handler } from '../index.mjs';
import * as utils from '../utils.mjs';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-challenge-id'),
}));

jest.mock('../utils.mjs', () => ({
  deleteAllChallenges: jest.fn().mockResolvedValue(),
  getAllTemplates: jest.fn().mockResolvedValue([
    {
      template_id: 'template1',
      distance_factor: 1.2,
      reward_factor: 1,
      days_from_start: 1,
      duration: 5,
    },
  ]),
  createChallengeEntries: jest.fn().mockResolvedValue(),
}));

describe("Challenge Handler Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully processes valid challenge creation request', async () => {
    const mockEvent = {
      body: JSON.stringify({
        season_id: 'season_1',
        start_date: '2021-01-01',
        buckets: [{
          bucket_id: 1,
          average_skill: 100,
          users: ['user1'],
        }],
      }),
    };

    const expectedResponse = {
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges created successfully." }),
    };

    // Using the actual handler function directly.
    const response = await handler(mockEvent);

    expect(response).toEqual(expectedResponse);
    // Ensure the mocked functions are called correctly.
    expect(utils.deleteAllChallenges).toHaveBeenCalledWith("challenges");
    expect(utils.getAllTemplates).toHaveBeenCalledWith("challenges_template");
    expect(utils.createChallengeEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'user1',
          challenge_id: 'test-challenge-id',
          target_meters: expect.any(Number),
          template_id: 'template1',
          points: expect.any(Number),
          season_id: 'season_1',
          bucket_id: 1,
        }),
      ]),
      "challenges"
    );
  });
});
