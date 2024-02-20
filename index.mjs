import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const document_client = new aws.DynamoDB.DocumentClient();

export async function handler(event) {
    let data;
    if (event.details) {
        data = JSON.parse(event.details);
    } else {
        console.error("Event details are undefined or not valid JSON.");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Bad request. No data found." }),
        };
    }

    console.log("Event details:", data);
    const { start_date, buckets } = data;

    try {
        const templates = await getAllTemplates("challenges_template");

        for (const bucket of buckets) {
            const { average_skill, users } = bucket;

            for (const user_id of users) {
                const filtered_templates = templates.filter(template => 
                    template_ids.includes(template.template_id));

                for (const template_data of filtered_templates) {
                    let target_meters = average_skill * template_data.distance_factor * 1000; 
                    target_meters = Math.round(target_meters / 10) * 10;
                    const points = Math.round(target_meters * template_data.reward_factor);

                    let challenge_start_date = new Date(start_date);
                    challenge_start_date.setDate(challenge_start_date.getDate() + template_data.offset);

                    let challenge_end_date = new Date(challenge_start_date);
                    challenge_end_date.setDate(challenge_end_date.getDate() + template_data.duration - 1);

                    const formatted_start_date = challenge_start_date.toISOString().split('T')[0] + 'T00:00:00';
                    const formatted_end_date = challenge_end_date.toISOString().split('T')[0] + 'T23:59:59';
                    
                    await createChallengeEntry({
                        user_id: user_id,
                        challenge_id: uuidv4(),
                        completed_meters: 0,
                        start_date: formatted_start_date,
                        end_date: formatted_end_date,
                        status: "current",
                        target_meters: target_meters,
                        template_id: template_data.template_id,
                        points: points,
                    }, "challenges");
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Challenges created successfully." }),
        };

    } catch (error) {
        console.error("Error processing data:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to process data due to an internal error." }),
        };
    }
}

async function getAllTemplates(tableName) {
    const params = {
        TableName: tableName,
    };

    let templates = [];
    let items;
    do {
        items = await documentClient.scan(params).promise();
        templates.push(...items.Items); // Add the retrieved items to the templates array
        params.ExclusiveStartKey = items.LastEvaluatedKey; // Set the start key for the next scan (if there are more items to retrieve)
    } while (items.LastEvaluatedKey); // Continue scanning if there are more items to be retrieved

    return templates; // Return the array of templates
}



async function createChallengeEntry(challengeData, tableName) {
    const params = {
        TableName: tableName,
        Item: challengeData,
    };
    try {
        await documentClient.put(params).promise();
    } catch (error) {
        console.error("Error creating challenge entry:", error);
        throw error;
    }
}
