import {randomBytes} from 'crypto';
import {config} from "../config.ts";
import {promisify} from "util";
import {exec} from "child_process";
import * as fs from "node:fs";
import {DeploymentConfig} from "./DeploymentConfig.ts";
import {docker} from "../docker.ts";
import {proxyManager} from "../proxy/ProxyManager.ts";

import tar from 'tar-fs'
const execPromise = promisify(exec);

function generate5ByteString() {
    return randomBytes(5).toString('hex'); // Hex encoding (10 characters)
}

type Container = unknown & {readonly __brand: "Container"}

export class Deployment {

    private containerName: string
    private buildUUID: string
    private containerID: string | undefined

    public isKilled: boolean

    private async downloadRepo(branch: string, repoURL: string, buildUUID: string) {
        const baseLocation = config.workDirectory.replace(/\/$/, '')
        await fs.promises.mkdir(baseLocation+ '/' + buildUUID)
        const cloneCmd = `git clone --branch ${branch} --single-branch --depth 1 ${repoURL} ${buildUUID}`;
        console.log(`Cloning repo with command: ${cloneCmd}`);
        const { stdout, stderr } = await execPromise(cloneCmd, {cwd: baseLocation});
        console.log(stdout);
        if (stderr) {
            console.error('standard error output detected: ')
            console.error(stderr);
            // throw new Error('Could not download repo')
        }
        return baseLocation + '/' + buildUUID
    }


    private async createRepoTarStream(deploymentConfig: DeploymentConfig, repoPath: string) {
        const buildContext =
            deploymentConfig.rootDirectory && deploymentConfig.rootDirectory !== '/' && deploymentConfig.rootDirectory.trim() !== ''
                ? `${repoPath}/${deploymentConfig.rootDirectory}`
                : repoPath

        await fs.promises.access(buildContext)
        return tar.pack(buildContext)
    }

    private async buildDockerImage(imageName: string, repoTarStream: any, deploymentConfig: DeploymentConfig) {
        console.log(`Building Docker image with name: ${imageName}`)
        const buildStream = await docker.buildImage(repoTarStream, {
            t: imageName,
            dockerfile: deploymentConfig.dockerfileName
        })
        await new Promise<void>((resolve, reject) => {
            docker.modem.followProgress(buildStream, (err: any, output: any) => {
                if (err) {
                    return reject(err);
                }
                console.log('Docker build output:', output);
                resolve();
            });
        });
        console.log(`Docker image ${imageName} built successfully.`);
    }

    private async startDockerContainer(imageName: string, port: number, deploymentConfig: DeploymentConfig) :Promise<string> {
        console.log('starting docker container ', imageName)
        const container = await docker.createContainer({
            Image: imageName,
            ExposedPorts: { [`${deploymentConfig.dockerExposedPort}/tcp`]: {} },

            HostConfig: {
                PortBindings: {
                    [`${deploymentConfig.dockerExposedPort}/tcp`]: [{ HostPort: port.toString() }],
                },
            },
        })
        console.log('created container: ', container.id)
        await container.start()
        return container.id
    }


    private async deleteWorkingDirectory(repoPath: string) {
        await fs.promises.rm(repoPath, {recursive: true, force: true})
    }

    constructor(public branchName:string, public commitHash: string) {
        this.buildUUID = generate5ByteString()
        this.containerName = branchName + '-' + commitHash + '-' + this.buildUUID
        this.isKilled = false
    }

    async launch() {
        const repoPath = await this.downloadRepo(this.branchName, config.repoURL, this.buildUUID)
        const deploymentConfig = await DeploymentConfig.getDeploymentConfig(this.buildUUID, repoPath)
        const tarStream = await this.createRepoTarStream(deploymentConfig, repoPath)
        await this.buildDockerImage(this.containerName, tarStream, deploymentConfig)
        const port = await proxyManager.createProxyForBranch(this.branchName)
        this.containerID = await this.startDockerContainer(this.containerName, port, deploymentConfig)
        await this.deleteWorkingDirectory(repoPath)
    }

    async getStatus() {
        //todo: implement getStatus
    }

    async kill() {
        if (this.containerID) {
            const container = docker.getContainer(this.containerID)
            await container.stop()
            await container.remove()
            const image = docker.getImage(this.containerName)
            await image.remove()
        }
        this.isKilled = true
    }




}