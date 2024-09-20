var http = require("http");
const { spawn, exec } = require("node:child_process");
const process = require("node:process");

const cooldown = {
  "availableAfter": Date.now()
}

const cooldownDuration = 30000; // 30 sec

async function getPid(port) {
  return new Promise((resolve) => {
    exec(`sudo netstat -tlnp | awk -F '  ' '/:${port} */ {split($NF,a,"/"); print a[1]}'`, (err, stdout, stderr) => {
      console.log("getPid", err);
      console.log("getPid", stdout.trim());
      console.log("getPid", stderr);
      resolve(stdout.trim().split('\n')[0]);
    });
  });
}

async function reset() {
  console.log("resetting");

  const currentTime = Date.now();

  if (currentTime < cooldown.availableAfter) {
    console.log("aborting reset, too soon to reset again.");
    return new Promise((resolve) => resolve(false));
  } 

  cooldown.availableAfter = Date.now() + cooldownDuration;
  
  let p3000 = await getPid(3000);
  let p3001 = await getPid(3001);

  console.log("pids:");
  console.log([p3000, p3001]);

  try {
    process.kill(parseInt(p3000));
    console.log(`killed ${parseInt(p3000)} on 3000`);
  } catch (err) {
    console.log("failed to kill 3000");
  }
  try {
    process.kill(parseInt(p3001));
    console.log(`killed ${parseInt(p3001)} on 3001`);
  } catch (err) {
    console.log("failed to kill 3001");
  }


  console.log("reset completed");
  return new Promise((resolve) => resolve(true));
}

function startAppServer() {
  let child = spawn('sh', ['./fetchRepo.sh'], { detached: true });

  console.log("spawned " + child.pid);

  let temp = { pid: child.pid };

  child.stdout.on('data', (data) => {
    console.log(`stdout (${temp.pid}): ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`stderr (${temp.pid}): ${data}`);
  });

  child.on('close', (code) => {
    console.log(`fetchRepo (${temp.pid}) child process exited with code ${code}`);

    let backendChild = spawn('sh', ['./startBackend.sh'], { detached: true });
    let frontendChild = spawn('sh', ['./startFrontend.sh'], { detached: true });
    backendChild.stdout.on('data', (data) => {
      console.log(`stdout backend (${backendChild.pid}): ${data}`);
    });
  
    backendChild.stderr.on('data', (data) => {
      console.error(`stderr backend (${backendChild.pid}): ${data}`);
    });

    backendChild.on('close', (code) => {
      console.log(` (${backendChild.pid}) child process exited with code ${code}`);
    });

    frontendChild.stdout.on('data', (data) => {
      console.log(`stdout frontend (${frontendChild.pid}): ${data}`);
    });
  
    frontendChild.stderr.on('data', (data) => {
      console.error(`stderr frontend (${frontendChild.pid}): ${data}`);
    });

    frontendChild.on('close', (code) => {
      console.log(` (${frontendChild.pid}) child process exited with code ${code}`);
    });
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

http.createServer(async (req, res) => {

  res.writeHead(200);
  res.end();

  let success = await reset();

  if (!success) return;

  await sleep(3000);

  startAppServer();

}).listen(3002, '0.0.0.0', async () => {
  console.log("started webhook server on http://0.0.0.0:3002");
  reset()
  await sleep(3000)
  startAppServer()
})