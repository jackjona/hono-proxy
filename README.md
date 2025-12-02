# Hono Proxy

A Hono app that proxies requests to a specified origin server using Netlify Edge Functions.

## Usage Example

To proxy a file located at: `https://origin.example.com/api/file.zip` (https://origin.example.com being the origin) this app will allow you to proxy the file using
`http://localhost:8888/download?origin=https://origin.example.com/api/file.zip`(http://localhost:8787 being this app)

## To Develop Locally

Install the Netlify CLI

```
npm install -g netlify-cli
```

Then run :

```
netlify dev
```

To deploy:

```
netlify login --auth $NETLIFY_AUTH_TOKEN
netlify deploy --prod
```

To use PAT for deploying:

1. Generate Personal Access Token (PAT)
2. `netlify login --auth $NETLIFY_AUTH_TOKEN`
3. netlify deploy --prod
