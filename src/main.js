var http = require("http");
const { spawn, exec } = require("node:child_process");
const process = require("node:process");

async function getPid(port) {
  return new Promise((resolve) => {
    exec(`sudo netstat -tlnp | awk -F '  ' '/:${port} */ {split($NF,a,"/"); return a[1]}'`, (err, stdout, stderr) => {
      resolve(stdout.trim().split('\n'));
    });
  });
}

async function reset() {
  let p3000 = await getPid(3000);
  let p3001 = await getPid(3001);
  let p3003 = await getPid(3003);
  let p3004 = await getPid(3004);
  try {
    process.kill(parseInt(p3000));
  } catch (err) {}
  try {
    process.kill(parseInt(p3001));
  } catch (err) {}
  try {
    process.kill(parseInt(p3003));
  } catch (err) {}
  try {
    process.kill(parseInt(p3004));
  } catch (err) {}
}

function startAppServer() {
  let child = spawn('sh', ['./script.sh'], { detached: true });

  console.log("spawned " + child.pid);

  let temp = { pid: child.pid };

  child.stdout.on('data', (data) => {
    console.log(`stdout (${temp.pid} : ${process.pid}): ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`stderr (${temp.pid}): ${data}`);
  });

  child.on('close', (code) => {
    console.log(` (${temp.pid}) child process exited with code ${code}`);
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

http.createServer(async (req, res) => {

  res.writeHead(200);
  res.end();

  await reset();

  await sleep(3000);

  startAppServer();

}).listen(3002, '0.0.0.0', async () => {
  console.log("started webhook server on http://0.0.0.0:3002");
  reset()
  await sleep(3000)
  startAppServer()
})