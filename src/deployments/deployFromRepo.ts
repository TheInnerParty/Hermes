import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
// @ts-ignore
import tar from 'tar-fs';
import {config} from "../config.ts";
import {docker} from "../docker.ts";
import type {DeploymentConfig} from "./DeploymentConfig.ts";

// Promisify exec to use async/await.
const execPromise = promisify(exec);

interface DeployOptions {
    /** The URL of the GitHub repository. */
    repoUrl: string;
    /** The Repo Name */
    repoName: string
    /** The branch to clone. */
    branch: string;
    /** The name to tag the Docker image with. */
    imageName: string;
    /** The host port to which container port 3000 should be mapped. */
    hostPort: number;
    
    deploymentConfig: DeploymentConfig
}

/**
 * Clones a GitHub repository, builds a Docker image from a specified context,
 * and runs a container mapping port 3000 inside the container to a given host port.
 *
 * @param options - The deployment options.
 * @returns The ID of the started Docker container.
 */
export async function deployFromRepo(options: DeployOptions): Promise<string> {
    try {
        // 1. Clone the repository from the specified branch.
        const repoLocation = config.workDirectory.replace(/\/$/, '')
        const cloneCmd = `git clone --branch ${options.branch} --single-branch ${options.repoUrl} ${config.workDirectory}`;
        console.log(`Cloning repository with command: ${cloneCmd}`);
        const { stdout, stderr } = await execPromise(cloneCmd);
        console.log(stdout);
        if (stderr) {
            console.error(stderr);
        }

        // 2. Determine the build context.
        //    If options.deploymentConfig.rootDirectory is provided and not '/' or empty, then use that as the context.
        const buildContext =
            options.deploymentConfig.rootDirectory && options.deploymentConfig.rootDirectory !== '/' && options.deploymentConfig.rootDirectory.trim() !== ''
                ? `${config.workDirectory}/${options.deploymentConfig.rootDirectory}`
                : config.workDirectory;

        if (!fs.existsSync(buildContext)) {
            throw new Error(`Build context directory ${buildContext} does not exist.`);
        }
        console.log(`Using build context: ${buildContext}`);

        // 3. Create a tar stream of the build context.
        const tarStream = tar.pack(buildContext);


        // 5. Build the Docker image.
        console.log(`Building Docker image with name: ${options.imageName}`);
        const buildStream = await docker.buildImage(tarStream, {
            t: options.imageName,
            dockerfile: options.deploymentConfig.dockerfileName
        });

        // Wait for the build process to complete.
        await new Promise<void>((resolve, reject) => {
            docker.modem.followProgress(buildStream, (err: any, output: any) => {
                if (err) {
                    return reject(err);
                }
                console.log('Docker build output:', output);
                resolve();
            });
        });
        console.log(`Docker image ${options.imageName} built successfully.`);

        // 6. Create a Docker container from the image.
        console.log(`Creating container from image ${options.imageName}...`);
        const container = await docker.createContainer({
            Image: options.imageName,
            ExposedPorts: { '3000/tcp': {} },
            HostConfig: {
                PortBindings: {
                    [`${options.deploymentConfig.dockerExposedPort}:tcp`]: [{ HostPort: options.hostPort.toString() }],
                },
            },
        });

        // 7. Start the container.
        await container.start();
        console.log(
            `Container started successfully. Port 3000 inside the container is mapped to host port ${options.hostPort}.`
        );

        // Return the container ID.
        return container.id;
    } catch (error) {
        console.error('Error during deployment:', error);
        throw error;
    }
}
