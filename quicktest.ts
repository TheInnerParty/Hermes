const http = require('http');
const { Hono } = require('hono');

const app = new Hono();

// Example asynchronous route handlers
app.get('/', async (c) => {
    // Simulate an async operation, e.g., a database call
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return c.text('Hello from Hono!');
});

app.get('/api', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return c.json({ message: 'This API route is handled by Hono' });
});

const server = http.createServer(async (req, res) => {
    const host = req.headers.host || '';
    const hostname = host.split(':')[0];

    if (hostname === 'hono.example.com') {
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
    } else {
        // Handle other hosts directly with Node's native HTTP server
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello from the Node native HTTP server!');
    }
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
