import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const documentClient = new aws.DynamoDB.DocumentClient();

export async function handler(event) {
    // Parse the incoming JSON data from the API Gateway event body
    // const data = JSON.parse(event.details);

    // Extract required details from the parsed data
    let data;
    if (event.details) {
        data = JSON.parse(event.details);
    } else {
        // Handle cases where event.body is undefined or not as expected
        console.error("Event body is undefined or not valid JSON.");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Bad request. No data found." }),
        };
    }

    const { season_id, start_date, end_date, buckets } = data;

    try {
        // Retrieve all templates once since they are the same for every user
        const templates = await getAllTemplates("challenges_template");

        // Process each bucket...
        for (const bucket of buckets) {
            const { bucket_id, averageSkill, users, templateIds } = bucket;

            // Process each user in the bucket
            for (const user_id of users) {
                // Filter templates based on templateIds in the bucket
                const filteredTemplates = templates.filter(template => 
                    templateIds.includes(template.template_id));

                // Process each filtered template for the user
                for (const templateData of filteredTemplates) {
                    let targetMeters = averageSkill * templateData.distance_factor * 1000; 
                    targetMeters = Math.round(targetMeters / 10) * 10;
                    const points = Math.round(targetMeters * templateData.reward_factor);

                    // Calculate the actual start date based on the template's offset
                    let challengeStartDate = new Date(start_date);
                    challengeStartDate.setDate(challengeStartDate.getDate() + templateData.offset);

                    // Calculate the end date based on the start date and the template's duration
                    let challengeEndDate = new Date(challengeStartDate);
                    challengeEndDate.setDate(challengeEndDate.getDate() + templateData.duration - 1);

                    // Format the dates to ISO string with time component adjusted
                    const formattedStartDate = challengeStartDate.toISOString().split('T')[0] + 'T00:00:00';
                    const formattedEndDate = challengeEndDate.toISOString().split('T')[0] + 'T23:59:59';
                    
                    // Create a new challenge entry for the user based on the current template
                    await createChallengeEntry({
                        user_id: user_id,
                        challenge_id: uuidv4(),
                        completed_meters: 0,
                        start_date: formattedStartDate,
                        end_date: formattedEndDate,
                        status: "current",
                        target_meters: targetMeters,
                        template_id: templateData.template_id,
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

// Include the definitions of getAllTemplates and createChallengeEntry functions here
