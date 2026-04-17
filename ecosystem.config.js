module.exports = {
    apps: [{
        name: "horror-rebot",
        script: "index.js",
        watch: ["index.js"],
        ignore_watch: ["node_modules"],
        watch_delay: 1000,
        kill_signal: "SIGINT",
        kill_timeout: 10000
    }]
};