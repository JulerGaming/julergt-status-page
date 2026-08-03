const express = require('express');
const app = express();
const path = require('path');
const https = require('https');
const PORT = Number(process.env.PORT) || 3000;

const SERVICES = [
    {
        id: 'julers-server',
        name: "Juler's Server",
        url: 'https://www.bonillainthemix.org'
    },
    {
        id: 'julers-mod',
        name: "Juler's Mod",
        url: 'https://sbox-api.julergt.org'
    },
    {
        id: 'bismuth',
        name: 'Bismuth',
        url: 'https://bismuthrr.net'
    }
];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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

if (process.env.DISABLE_REPO_SYNC !== '1') {
    syncRepo();
    setInterval(syncRepo, 1 * 60 * 1000);
}

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
        process.exit(0);
    }
})();

app.get('/api/notice', (req, res) => {
    const notice = {
        title: null,
        content: null
    };
    res.json(notice);
});

function checkService(service) {
    return new Promise((resolve) => {
        const request = https.get(service.url, { timeout: 8000 }, (response) => {
            const status = response.statusCode || 500;
            response.resume();

            resolve({
                ...service,
                status,
                operational: status >= 200 && status < 400
            });
        });

        request.on('timeout', () => {
            request.destroy(new Error('Request timed out'));
        });

        request.on('error', () => {
            resolve({
                ...service,
                status: null,
                operational: false
            });
        });
    });
}

app.get('/api/isUp', async (req, res) => {
    const services = await Promise.all(SERVICES.map(checkService));
    const allOperational = services.every(service => service.operational);

    res.json({
        status: allOperational ? 200 : 503,
        checkedAt: new Date().toISOString(),
        services
    });
});
