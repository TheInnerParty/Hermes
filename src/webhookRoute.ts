import { Hono } from 'hono';
import {deploymentManager} from "./deployments/DeploymentManager.ts";

// Empty function to handle new code updates
function newCode(branchName: string, commitHash: string) {
    deploymentManager.deployBranch(branchName, commitHash)
}

// Empty function to handle branch deletion
function deletedBranch(branchName: string) {
    deploymentManager.deleteBranch(branchName)
}

const webhookRoute = new Hono();

// This endpoint listens for GitHub webhook events
webhookRoute.post('/githubwebhook', async (c) => {
    // Retrieve the GitHub event type from the header
    const event = c.req.header('X-GitHub-Event');
    const payload = await c.req.json();

    if (event === 'push') {
        // A push event can be for new commits or branch deletion.
        // The payload includes a `deleted` flag if the branch was deleted.
        if (payload.deleted) {
            // The `ref` is typically in the form "refs/heads/branchName"
            const branchName = payload.ref.split('/').pop();
            deletedBranch(branchName);
        } else {
            // For a push event with new commits, extract the branch name and latest commit hash.
            const branchName = payload.ref.split('/').pop();
            const commitHash = payload.after;
            newCode(branchName, commitHash);
        }
    } else if (event === 'delete') {
        // A dedicated delete event occurs when a branch is deleted.
        if (payload.ref_type === 'branch') {
            // For a delete event, the payload.ref is the branch name.
            deletedBranch(payload.ref);
        }
    } else if (event === 'pull_request') {
        // When a pull request is merged, GitHub sends a pull_request event.
        // Check if the PR was closed and merged.
        if (payload.action === 'closed' && payload.pull_request?.merged) {
            // Use the target branch (base) and the merge commit SHA.
            const branchName = payload.pull_request.base.ref;
            const commitHash = payload.pull_request.merge_commit_sha;
            newCode(branchName, commitHash);
        }
    }

    // Return a simple OK response to GitHub
    return c.text('OK');
});

export {webhookRoute}

