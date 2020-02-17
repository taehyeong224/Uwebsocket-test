const WebSocket = require('ws');
const cluster = require("cluster");

const os = require("os");

if (cluster.isMaster) {
    //워커 스케쥴을 Round Robin 방식으로 한다.
    cluster.schedulingPolicy = cluster.SCHED_RR;
    const cpuLength = os.cpus().length;

    cluster.on('online', (worker) => {
        console.log(`worker ${worker.process.pid} ${worker.id} created`);
    });
    cluster.on('exit', (worker, code, signal) => {
        console.log(`죽은 워커 정보 => worker : ${worker.process.pid} ${worker.id}`);
        cluster.fork();
    });
    cluster.on('message', (worker, message, handle) => {
        console.log(`master receive message from ${worker.process.pid} ${worker.id}: `, message)
    });
    console.log("cpuLength: ", cpuLength)
    for (let i = 0; i < cpuLength; i++) {
        cluster.fork();
    }
} else {
    const wss = new WebSocket.Server({ port: 9001 });

    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        console.log(`[${process.pid}] received: ${message}`);
      });
    
      ws.send('something');
    });
}

