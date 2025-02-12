// server.js
import {config} from "./config.ts";
import {proxyManager} from "./proxy/ProxyManager.ts";

const http = require('http');
import {Hono} from "hono";


const app = new Hono();

app.get('/', (c) => {
    return c.text('Hello from server.example.com (handled by Hono)');
});


const server = http.createServer((req: any, res: any) => {

    const host = req.headers.host ? req.headers.host.split(':')[0] : '';

    if (host.endsWith('.'+config.serverHostName)) {
        proxyManager.handleProxyRequest(host, req, res)

    } else if (host === config.serverHostName) {

        app.fetch(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});


server.listen(3000, () => {
    console.log('Hermes Server is listening')
});
