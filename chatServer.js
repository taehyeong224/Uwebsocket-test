const http = require('http');

const AWS = require('aws-sdk');
AWS.config.loadFromPath('./awsconfig.json');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
console.log("config : ", AWS.config.credentials)
const QUEUE_URL = "https://sqs.ap-northeast-2.amazonaws.com/658082685114/test";
const cluster = require("cluster");

if (cluster.isMaster) {
    cluster.schedulingPolicy = cluster.SCHED_RR;
    const os = require("os");
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork()
    }
} else {
    console.log("hello")
    http.createServer(async (req, res) => {
        //debugHeaders(req);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.url == '/chat') {
            console.log("req method : ", req.method)
            if (req.method === Method.GET) {
                res.writeHead(200, { 'Content-Type': `application/json` })
                res.write(JSON.stringify({ msg: "success" }))
                res.end()
            }

            if (req.method === Method.POST) {
                try {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk;
                    });
                    req.on('end', async () => {
                        try {
                            console.log(process.pid)
                            const result = JSON.parse(body);
                            result["createdAt"] = Number(new Date())
                            console.log(result);

                            const sendResult = await sqs.sendMessage({
                                QueueUrl: QUEUE_URL,
                                MessageBody: JSON.stringify(result),
                                DelaySeconds: 0,
                            }).promise();
                            console.log("sendResult : ", sendResult)
                            console.log("MessageId : ", sendResult.MessageId)
                            res.writeHead(200, { 'Content-Type': `application/json` })
                            res.write(JSON.stringify({ msg: "success" }))
                            res.end()
                        } catch (e) {
                            ErrorHandle(res, e)
                        }
                    });

                } catch (e) {
                    ErrorHandle(res, e)
                }
            } else {
                res.writeHead(200, { 'Content-Type': `application/json` })
                res.write(JSON.stringify({ msg: "fail no method" }))
                res.end()
            }

        }
    }).listen(3000);

    const Method = {
        GET: "GET",
        PUT: "PUT",
        POST: "POST",
        DELETE: "DELETE",
    }

    const ErrorHandle = (res, e) => {
        console.error("error : ", e.message);
        res.writeHead(500, { 'Content-Type': `application/json` })
        res.write(JSON.stringify({ msg: "fail" }))
        res.end()
    }
}