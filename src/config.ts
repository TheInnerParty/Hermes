import {
    from,
    type IDefaultEnv,
    type IEnv,
    type IOptionalVariable,
    type Extensions,
    type ExtenderTypeOptional,
} from "env-var";
import * as os from "node:os";

import dotenv from 'dotenv'
dotenv.config()

class Config {

    public readonly ListenPort: number;

    public readonly workDirectory: string;

    public readonly repoURL: string;

    public readonly serverHostName: string

    public readonly githubWebhookSecret: string

    constructor(private processEnv = process.env) {
        // dumb library needs NODE_ENV set
        let env = from(Object.assign({}, processEnv, { NODE_ENV: "production" }));
        this.ListenPort = env.get("PORT").default(3000).asInt();
        this.workDirectory = env.get("WORK_DIRECTORY").default(os.homedir()+"/hermes-deployments").asString()
        this.repoURL = env.get("REPO_URL").required().asString()
        this.serverHostName = env.get('SERVER_HOST_NAME').required().asString()
        this.githubWebhookSecret = env.get('GITHUB_WEBHOOK_SECRET').required().asString()

        Object.freeze(this);
    }


}

const config = new Config()

export {config}
