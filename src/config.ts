import {
    from,
    type IDefaultEnv,
    type IEnv,
    type IOptionalVariable,
    type Extensions,
    type ExtenderTypeOptional,
} from "env-var";

require('dotenv').config()

class Config {

    public readonly ListenPort: number;

    public readonly workDirectory: string;

    public readonly repoURL: string;

    public readonly serverHostName: string

    constructor(private processEnv = process.env) {
        // dumb library needs NODE_ENV set
        let env = from(Object.assign({}, processEnv, { NODE_ENV: "production" }));
        this.ListenPort = env.get("PORT").default(3000).asInt();
        this.workDirectory = env.get("workDirectory").default("~/hermes-deployments").asString()
        this.repoURL = env.get("repoURL").required().asString()
        this.serverHostName = env.get('serverHostName').required().asString()


        Object.freeze(this);
    }
}

const config = new Config()

export {config}
