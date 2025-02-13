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

// app.route('/hooks', webhookRoute)


const server = http.createServer(async (req: any, res: any) => {

    const host = req.headers.host ? req.headers.host.split(':')[0] : '';
    console.log('got request with host: ', host)

    if (host.endsWith('.'+config.serverHostName)) {
        proxyManager.handleProxyRequest(host, req, res)

    } else if (host === config.serverHostName) {
        {
            try {
                // Wrap in Promise.resolve to handle both promise and non-promise responses.
                let response = await Promise.resolve(app.fetch(req));

                // Write status and headers to the Node response
                res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

                // Handle the response body
                if (response.body) {
                    // If it's a Node stream, pipe it directly
                    if (typeof response.body.pipe === 'function') {
                        response.body.pipe(res);
                    } else {
                        // Otherwise, assume it's a web stream or already fully buffered
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
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No Valid Host Header- not found');
    }
});


server.listen(config.ListenPort, () => {
    console.log('Hermes Server is listening')
});
