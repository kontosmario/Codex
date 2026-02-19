const { createApp } = require('./app');

const PORT = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
