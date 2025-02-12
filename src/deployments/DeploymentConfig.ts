import {config} from "../config.ts";
import fs from "node:fs";

export class DeploymentConfig {
    dockerfileName: string
    rootDirectory: string
    dockerExposedPort: number

    constructor(configString: string= '{}') {
        const raw = JSON.parse(configString)

        this.dockerfileName = raw.dockerfileName || 'Dockerfile';
        this.rootDirectory = raw.rootDirectory || '/'
        this.dockerExposedPort = raw.dockerExposedPort || 3000
    }

    static async getDeploymentConfig(buildUUID: string, repoPath: string) {
        let configString: string | undefined = undefined
        try {
            configString = await fs.promises.readFile(repoPath + '/hermes-config.json', 'utf-8')
        } catch (e) {
            console.warn(`could not get config file for ${buildUUID}`)
        }
        return new DeploymentConfig(configString)
    }
}