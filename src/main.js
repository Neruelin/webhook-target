var http = require("http");
const { spawn } = require("node:child_process");
const process = require("node:process");

function startAppServer() {
    let child = spawn('sh', ['./script.sh'], {detached: true});

    let temp = {pid: child.pid};

    child.stdout.on('data', (data) => {
        console.log(`stdout (${temp.pid}): ${data}`);
      });
      
      child.stderr.on('data', (data) => {
        console.error(`stderr (${temp.pid}): ${data}`);
      });
      
      child.on('close', (code) => {
        console.log(` (${temp.pid}) child process exited with code ${code}`);
      });
      return child;
}

const runAppServer = {process: startAppServer()}

http.createServer((req, res) => {

    res.writeHead(200);
    res.end();

    if (runAppServer.process && runAppServer.process.killed != true) {
        runAppServer.process.kill();
        process.kill(-runAppServer.process.pid)
    }

    runAppServer.process = startAppServer();
    
}).listen(3002)