import type {Deployment} from "./Deployment.ts";

export class DeploymentManager {
    private branchDeployments: Deployment[]

    constructor() {
        this.branchDeployments = []
    }

    deployBranch(branchName: string) {
        //todo
    }
}

const deploymentManager = new DeploymentManager()

export {deploymentManager}