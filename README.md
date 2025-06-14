slash-create is annoying, you need to make the following changes:
- in `node_modules/slash-create/lib/node/creator.js` change the `require` call to `import`
- in `node_modules/slash-create/lib/servers/express.js` add `express.json()` as middleware in the `createEndpoint` method

## todo
- allow user-accessible logging per channel-bumper pair
- better error-reporting
- turn trustytrojan/autobump into a JSR package, that is imported here
