var httpProxy = require('http-proxy')
import {getPort} from "get-port-please";


export class ProxyManager {
    proxy: any
    proxyMap: Map<string, number>

    constructor() {
        this.proxy = httpProxy.createProxyServer();
        this.proxyMap = new Map()
    }

    private getBranchPort(host: string) {
        const branchName = host.split('.')[0];
        return this.proxyMap.get(branchName)
    }

    private getUsedPorts() {
        return [...this.proxyMap.values()];
    }

    // beware of race conditions with this todo: re-architect getFreePort for simul builds
    private async getFreePort() {
        const port = await getPort({ random: true, portRange: [3001, 3999]})
        if (!this.getUsedPorts().includes(port)) {
            return port
        } else throw new Error('Port already routed')
    }

    handleProxyRequest(host: string, req: any, res: any) {
        const port = this.getBranchPort(host)
        if (!port) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
        this.proxy.web(req, res, (err: Error) => {
            console.error('Proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy error');
        }, {
            target: 'something'
        });
    }

    async createProxyForBranch(branchName: string) {
        const port = await this.getFreePort()
        this.proxyMap.set(branchName, port)
        return port
    }

}

const proxyManager = new ProxyManager()

export {proxyManager}