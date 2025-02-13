
==== ./package.json ====

{
  "name": "hermes",
  "module": "src/app.ts",
  "type": "module",
  "scripts": {
    "dev": "bun run src/app.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "@octokit/webhooks": "^13.6.0",
    "@types/dockerode": "^3.3.34",
    "@types/http-proxy": "^1.17.16",
    "@types/tar-fs": "^2.0.4",
    "dockerode": "^4.0.4",
    "dotenv": "^16.4.7",
    "env-var": "^7.5.0",
    "get-port-please": "^3.1.2",
    "hono": "^4.7.0",
    "http-proxy": "^1.18.1",
    "p-queue": "^8.1.0",
    "tar-fs": "^3.0.8"
  }
}
==== ./tsconfig.json ====

{
  "compilerOptions": {
    // Enable latest features
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  },
  "include": [
    "./src/**/*",
    "./src/globals.d.ts"
  ]
}
