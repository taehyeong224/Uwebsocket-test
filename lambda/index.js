console.log('Loading function');
const axios = require("axios");
const AWS = require("aws-sdk");
const sqs = new AWS.SQS();
const CHAT_SERVER_URL = `http://52.79.172.143:9001/message`;
exports.handler = async (event) => {
    for (const {body} of event.Records) {
        const {userId, message, createdAt} = JSON.parse(body);
        console.log('body: ', {userId, message, createdAt});
        await sendRequest({userId, message, createdAt})
    }
    return `Successfully processed ${event.Records.length} messages.`;
};

/**
 * SQS에서 받은 메시지를 삭제한다.
 **/
const deleteMessages = (url, messages) => {
    console.log("delete : ")
    if (messages.Messages === undefined || messages.Messages === null) {
        return;
    }

    // SQS 삭제에 필요한 형식으로 변환한다.
    const entries = messages.Messages.map((msg) => {
        return {
            Id: msg.MessageId,
            ReceiptHandle: msg.ReceiptHandle,
        };
    });

    // 메시지를 삭제한다.
    return sqs.deleteMessageBatch({
        Entries: entries,
        QueueUrl: url,
    }).promise();
}

const sendRequest = async ({userId, message, createdAt}) => {
    try {
        await axios({
            headers: { 'Content-Type': 'application/json' },
            method: 'post', // default
            baseURL: CHAT_SERVER_URL,
            data: {
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