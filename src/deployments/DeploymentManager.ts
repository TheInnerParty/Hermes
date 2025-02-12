import {Deployment} from "./Deployment.ts";
import PQueue from "p-queue";

export class DeploymentManager {
    private branchDeployments: Deployment[]
    private deployQueue: PQueue


    constructor() {
        this.branchDeployments = []
        this.deployQueue =  new PQueue({concurrency: 1});
    }

    private async processDeployment(deployment: Deployment) {
        try {
            await deployment.launch()
        } catch (e) {
            console.error('Error launching deployment for: '+ deployment.branchName+ ' ' + deployment.commitHash, e)
            //todo: process failed deployments
        }
        // we make sure deployments before deleting any old ones to minimize downtime
        const oldDeploymentIndex = this.branchDeployments.findIndex((searchEl)=>{
            return searchEl.branchName == deployment.branchName
        })
        if (oldDeploymentIndex !=-1) {
            await this.branchDeployments[oldDeploymentIndex].kill()
            this.branchDeployments.splice(oldDeploymentIndex, 1)
        }
    }

    private async processDeleteDeployment(branchName: string) {
        const branchIndex = this.branchDeployments.findIndex((el)=>el.branchName==branchName)
        if (branchIndex!=-1) {
            await this.branchDeployments[branchIndex].kill()
            this.branchDeployments.splice(branchIndex, 1)
        } else {
            console.error(`DeploymentManager: could not find branch ${branchName} to delete`)
        }
    }

    deployBranch(branchName: string, commitHash: string) {
        this.deployQueue.add(()=>{
            return this.processDeployment(new Deployment(branchName, commitHash))
        })
    }

    deleteBranch(branchName: string) {
        this.deployQueue.add(()=>{
            return this.processDeleteDeployment(branchName)
        })
    }
}

const deploymentManager = new DeploymentManager()

export {deploymentManager}