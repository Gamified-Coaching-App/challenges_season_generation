import aws from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new aws.S3();
const documentClient = new aws.DynamoDB.DocumentClient();

// const bucket_name = 'mariia-shapovalova-test-bucket';
// const object_key = 'bucket_averages_season_1.json';

export async function handler(event) {

    if (event['detail-type'] !== 'buckets_processed') {
        console.log('Event is not a buckets_processed event.');
        return;
    }

    // Extract required details from the event details
    const { bucket_name: bucket_name, object_key: object_key} = event.detail;

    try {

        let data; 
        
        try {
            // Step 1: Fetch the data from S3
            const s3Params = {
                Bucket: bucket_name,
                Key: object_key,
            };
            const s3Data = await s3.getObject(s3Params).promise();
            data = JSON.parse(s3Data.Body.toString('utf-8')); // Parse the JSON data from S3
        
        } catch (error) {
            console.error("Error fetching or parsing data from S3:", error);
            throw error; 
        }

        const { season_id, start_date, end_date, buckets } = data;

        // Retrieve all templates once since they are the same for every user
        const templates = await getAllTemplates("challenges_template");

        // Process each bucket...
        for (const bucket of buckets) {
            const { bucket_id, averageSkill, users } = bucket;

            // Process each user in the bucket
            for (const user_id of users) {
                // Process each filtered template for the user
                for (const templateData of templates) {
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
    } catch (error) {
        console.error("Error processing data from S3:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to process data due to an internal error." }),
        };
    }
}

// Include the definitions of getAllTemplates and createChallengeEntry functions here
