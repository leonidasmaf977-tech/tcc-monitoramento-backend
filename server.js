const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'dados.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canal INTEGER NOT NULL,
    nivel_alto INTEGER NOT NULL,
    heap INTEGER,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

const inserirLeitura = db.prepare(
  `INSERT INTO leituras (canal, nivel_alto, heap) VALUES (?, ?, ?)`
);

app.post('/api/leituras', (req, res) => {
  const { canal, nivel_alto, heap } = req.body;

  if (canal === undefined || nivel_alto === undefined) {
    return res.status(400).json({
      erro: 'Os campos "canal" e "nivel_alto" sao obrigatorios.'
    });
  }

  inserirLeitura.run(Number(canal), nivel_alto ? 1 : 0, heap ?? null);
  res.status(201).json({ ok: true });
});

app.get('/api/leituras/atual', (req, res) => {
  const canal = Number(req.query.canal || 1);
  const linha = db
    .prepare(`SELECT * FROM leituras WHERE canal = ? ORDER BY id DESC LIMIT 1`)
    .get(canal);
  res.json(linha || null);
});

app.get('/api/leituras/historico', (req, res) => {
  const canal = Number(req.query.canal || 1);
  const limite = Math.min(Number(req.query.limite || 50), 500);

  const linhas = db
    .prepare(`SELECT * FROM leituras WHERE canal = ? ORDER BY id DESC LIMIT ?`)
    .all(canal, limite);

  res.json(linhas.reverse());
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
