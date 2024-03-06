import aws from 'aws-sdk';

const documentClient = new aws.DynamoDB.DocumentClient();

// Assuming templates do not change frequently, cache them in memory
let cachedTemplates = null;

export async function getAllTemplates(tableName) {
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

export async function deleteAllChallenges(tableName) {
    let params = { TableName: tableName };
    let items;

    do {
        items = await documentClient.scan(params).promise();
        for (const item of items.Items) {
            await documentClient.delete({
                TableName: tableName,
                Key: { 'user_id': item.user_id, 'challenge_id': item.challenge_id }
            }).promise();
        }
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (items.LastEvaluatedKey);
}

export async function createChallengeEntries(challengeDataArray, tableName) {
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