const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const https = require('https');
const cron = require('node-cron');
const { count } = require('console');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(80, "0.0.0.0", () => {
    console.log('Server is running on https://localhost:80');
});

const { exec } = require("child_process");

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) { return reject(stderr); }
            resolve(stdout.trim());
        });
    });
}

let hasSyncRepo = false;

async function syncRepo() {
    try {
        console.log("Checking remote changes...");

        await run("git fetch");

        const local = await run("git rev-parse HEAD");
        const remote = await run("git rev-parse @{u}");

        if (local !== remote) {
            console.log("Remote updates found. Pulling...");
            await run("git pull");
            process.exit(0);
        } else {
            console.log("Repo already up to date.");
        }

        console.log("Checking local changes...");

        const status = await run("git status --porcelain");

        if (status) {
            console.log("Local changes detected. Committing and pushing...");

            await run("git add .");
            await run(`git commit -m "Auto commit from bot"`);
            await run("git push");

            console.log("Changes pushed to GitHub.");
        } else {
            console.log("No local changes.");
        }

        hasSyncRepo = true;

    } catch (err) {
        console.error("Git sync error:", err);
    }
}

syncRepo();

(function checkPackages() {
    if (!hasSyncRepo) { return; }
    const pkg = JSON.parse(require('fs').readFileSync('./package.json', 'utf8'));
    const allDeps = Object.assign({}, pkg.dependencies);
    const missing = [];
    for (const [name, version] of Object.entries(allDeps)) {
        try {
            require.resolve(name);
        } catch {
            missing.push(name);
        }
    }
    const filtered = missing.filter(name => name !== 'save-dev');
    if (filtered.length > 0) {
        console.log(`Missing packages: ${filtered.join(', ')}. Running npm install...`);
        execSync('npm install', { stdio: 'inherit' });
        console.log('Packages installed. Restarting...');
        const child = spawn(process.execPath, process.argv.slice(1), {
            detached: true,
            stdio: 'inherit'
        });
        child.unref();
        process.exit(0);
    }
})();

setInterval(syncRepo, 1 * 60 * 1000); // every 1 minute

app.get('/api/notice', (req, res) => {
    const notice = {
        title: 'Server Notice',
        content: 'A Flash Flood Warning in the server\'s area is in effect. The server may go down in any moment. Your data is safe.'
    };
    res.json(notice);
});

app.get('/api/pastincidents', (req, res) => {
    // This would be better implemented outside the route handler
    // Add this near the top of your file, after requires:
    const INCIDENTS_FILE = require('./incidents.json');

    res.json({ status: 200, data: INCIDENTS_FILE });
});

function checkWebsiteNow() {
    https.get('https://bonillainthemix.ngrok.app/', (response) => {
        if (response.statusCode === 200) {
            logIncident(200);
        } else {
            logIncident(response.statusCode);
        }
    }).on('error', (err) => {
        logIncident(500);
    });
}

function logIncident(status) {
    const incident = {
        timestamp: new Date().toISOString(),
        status: status
    };
    const file = require('./incidents.json');
    const counter = file.length;

    file[counter] = incident;

    fs.writeFileSync(path.join(__dirname, 'incidents.json'), JSON.stringify(INCIDENTS_FILE, null, 2));
}

checkWebsiteNow();

setInterval(checkWebsiteNow, 5 * 60 * 1000); // every 5 minutes