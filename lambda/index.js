console.log('Loading function');
const axios = require("axios");
const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const CHAT_SERVER_URL = `http://52.79.172.143:9001/message`;
exports.handler = async (event) => {
    for (const {messageId, body} of event.Records) {
        const {userId, message, createdAt} = JSON.parse(body);
        console.log('body: ', {messageId, userId, message, createdAt});
        await sendRequest({messageId, userId, message, createdAt})
    }
    return `Successfully processed ${event.Records.length} messages.`;
};

const sendRequest = async ({messageId, userId, message, createdAt}) => {
    try {
        await axios({
            headers: { 'Content-Type': 'application/json' },
            method: 'post', // default
            baseURL: CHAT_SERVER_URL,
            data: {
                messageId,
                userId,
                message,
                createdAt
            }
    
        })
        console.log("sucess request")
    } catch (e) {
        console.log("fail request : ", e)
    }
}