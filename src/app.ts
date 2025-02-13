// server.js
import {config} from "./config.ts";
import {proxyManager} from "./proxy/ProxyManager.ts";

import * as http from 'http';
import {Hono} from "hono";
import {logger} from "hono/logger";
import {webhookRoute} from "./webhookRoute.ts";


const app = new Hono();
app.use(logger())
app.get('/', (c) => {
    return c.text('Hermes Server');
});

app.route('/hooks', webhookRoute)


const server = http.createServer(async (req: any, res: any) => {

    const host = req.headers.host ? req.headers.host.split(':')[0] : '';
    console.log('got request with host: ', host)

    if (host.endsWith('.'+config.serverHostName)) {
        proxyManager.handleProxyRequest(host, req, res)

    } else if (host === config.serverHostName) {
        try {
            // Build a full URL for Hono to correctly parse the route.
            const fullUrl = `http://${req.headers.host}${req.url}`;
            // Create a proper Request object using the full URL.
            const honoRequest = new Request(fullUrl, {
                method: req.method,
                headers: req.headers,
                // Only attach a body for methods that support it.
                body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
            });

            // Wrap app.fetch() in Promise.resolve() in case it returns a synchronous response.
            const response = await Promise.resolve(app.fetch(honoRequest));

            // Write the status and headers to the Node response.
            res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

            // Handle the response body.
            if (response.body) {
                if (typeof response.body.pipe === 'function') {
                    // If it's a Node stream, pipe it directly.
                    response.body.pipe(res);
                } else {
                    // Otherwise, read it as text and end the response.
                    const bodyText = await response.text();
                    res.end(bodyText);
                }
            } else {
                res.end();
            }
        } catch (err) {
            console.error('Error in Hono handler:', err);
            res.statusCode = 500;
            res.end('Internal Server Error- api handler');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No Valid Host Header- not found');
    }
});


server.listen(config.ListenPort, () => {
    console.log('Hermes Server is listening')
});
