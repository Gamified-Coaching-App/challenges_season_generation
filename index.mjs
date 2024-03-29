import { v4 as uuidv4 } from 'uuid';
import { getAllTemplates, deleteAllChallenges, createChallengeEntries } from './utils.mjs';

export async function handler(event) {
    let data;
    if (event.body) {
        data = JSON.parse(event.body);
    } else {
        console.error("Event details are undefined or not valid JSON.");
        return { statusCode: 400, body: JSON.stringify({ error: "Bad request. No data found." }) };
    }

    const { season_id, start_date, buckets } = data;

    try {
        // Delete all challenges before creating new ones
        await deleteAllChallenges("challenges");
        const templates = await getAllTemplates("challenges_template");
        let challengeDataArray = [];

        for (const bucket of buckets) {
            const { bucket_id, average_skill, users } = bucket;
            if (Number(bucket_id) === -1) {
                continue; // Skip the new user bucket
            }
            for (const user_id of users) {
                for (const template_data of templates) {
                    // convert from km to meters
                    let target_meters = average_skill * template_data.distance_factor * 1000; 
                    target_meters = Math.round(target_meters / 10) * 10;
                    // 10 points for 1 km
                    const points = Math.round(target_meters * template_data.reward_factor * 10) / 1000;

                    let challenge_start_date = new Date(start_date);
                    challenge_start_date.setDate(challenge_start_date.getDate() + template_data.days_from_start);

                    let challenge_end_date = new Date(challenge_start_date.getTime()); 

                    if (template_data.duration === -1) {
                        // Get the last day of the month for the end date
                        challenge_end_date = new Date(challenge_start_date.getFullYear(), challenge_start_date.getMonth() + 1, 0);
                    } else {
                        // Correctly add duration days to the start date otherwise
                        challenge_end_date.setDate(challenge_start_date.getDate() + template_data.duration - 1);
                    }

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
                        season_id: season_id,
                        bucket_id: bucket_id,
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