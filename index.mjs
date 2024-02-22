import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const documentClient = new aws.DynamoDB.DocumentClient();

// Assuming templates do not change frequently, cache them in memory
let cachedTemplates = null;

async function getAllTemplates(tableName) {
    if (cachedTemplates) {
        return cachedTemplates;
    }

    let templates = [];
    let params = { TableName: tableName };
    let items;

    do {
        items = await documentClient.scan(params).promise();
        templates.push(...items.Items);
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (items.LastEvaluatedKey);

    cachedTemplates = templates; // Cache the templates
    return templates;
}

async function createChallengeEntries(challengeDataArray, tableName) {
    let requestItems = challengeDataArray.map(challengeData => ({
        PutRequest: { Item: challengeData }
    }));

    // Split array into chunks of 25 items for batchWrite
    while (requestItems.length > 0) {
        const batch = requestItems.splice(0, 25);
        const params = { RequestItems: { [tableName]: batch } };
        await documentClient.batchWrite(params).promise();
    }
}

export async function handler(event) {
    let data;
    if (event.body) {
        data = JSON.parse(event.body);
    } else {
        console.error("Event details are undefined or not valid JSON.");
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request. No data found." }) };
    }

    const { start_date, buckets } = data;

    try {
        const templates = await getAllTemplates("challenges_template");
        let challengeDataArray = [];

        for (const bucket of buckets) {
            const { average_skill, users } = bucket;

            for (const user_id of users) {
                for (const template_data of templates) {
                    
                    let target_meters = average_skill * template_data.distance_factor * 1000; 
                    target_meters = Math.round(target_meters / 10) * 10;
                    const points = Math.round(target_meters * template_data.reward_factor) / 1000;

                    let challenge_start_date = new Date(start_date);
                    challenge_start_date.setDate(challenge_start_date.getDate() + template_data.days_from_start);

                    let challenge_end_date = new Date(challenge_start_date);
                    challenge_end_date.setDate(challenge_end_date.getDate() + template_data.duration - 1);

                    const formatted_start_date = challenge_start_date.toISOString().split('T')[0] + 'T00:00:00';
                    const formatted_end_date = challenge_end_date.toISOString().split('T')[0] + 'T23:59:59';

                    challengeDataArray.push({
                        user_id: user_id,
                        challenge_id: uuidv4(),
                        completed_meters: 0,
                        start_date: formatted_start_date,
                        end_date: formatted_end_date,
                        status: "current",
                        target_meters: target_meters,
                        template_id: template_data.template_id,
                        points: points,
                    });
                }
            }
        }

        await createChallengeEntries(challengeDataArray, "challenges");

        return { statusCode: 200, body: JSON.stringify({ message: "Challenges created successfully." }) };
    } catch (error) {
        console.error("Error processing data:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to process data due to an internal error." }) };
    }
}
