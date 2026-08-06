const SERVICES = [
    {
        id: 'bonilla',
        name: "Bonilla in the Mix",
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
    },
    {
        id: 'recbanana',
        name: 'RecBanana',
        url: 'https://recbanana.julergt.org'
    }
];

async function checkService(service) {
    try {
        const response = await fetch(service.url, {
            signal: AbortSignal.timeout(8000)
        });

        return {
            ...service,
            status: response.status,
            operational: response.status >= 200 && response.status < 400
        };
    } catch {
        return {
            ...service,
            status: null,
            operational: false
        };
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api/isUp') {
            const services = await Promise.all(SERVICES.map(checkService));

            return Response.json({
                status: services.every(service => service.operational) ? 200 : 503,
                checkedAt: new Date().toISOString(),
                services
            }, {
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        if (url.pathname === '/api/notice') {
            return Response.json({
                title: null,
                content: null
            }, {
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        return env.ASSETS.fetch(request);
    }
};
