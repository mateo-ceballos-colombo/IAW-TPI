const express = require('express');
const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('api-reservas listening on 3001'));
