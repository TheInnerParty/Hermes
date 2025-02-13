// server.js
import {config} from "./config.ts";
import {proxyManager} from "./proxy/ProxyManager.ts";

import * as http from 'http';
import {Hono} from "hono";
import {webhookRoute} from "./webhookRoute.ts";


const app = new Hono();

app.get('/', (c) => {
    return c.text('Hermes Server');
});

app.route('/hooks', webhookRoute)


const server = http.createServer((req: any, res: any) => {

    const host = req.headers.host ? req.headers.host.split(':')[0] : '';
    console.log('got request with host: ', host)

    if (host.endsWith('.'+config.serverHostName)) {
        proxyManager.handleProxyRequest(host, req, res)

    } else if (host === config.serverHostName) {

        app.fetch(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No Valid Host Header- not found');
    }
});


server.listen(config.ListenPort, () => {
    console.log('Hermes Server is listening')
});
