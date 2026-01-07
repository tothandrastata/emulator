const Fastify = require('fastify');

const app = Fastify({ logger: true });

app.get('/test', async () => {
  return { hello: 'world' };
});

app.listen({ port: 9999, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Test server running on port 9999');
});
