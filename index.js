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

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

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
        if (response.statusCode !== 200) {
            logIncident(200);
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