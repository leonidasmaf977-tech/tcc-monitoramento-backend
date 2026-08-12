const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ----------- BANCO DE DADOS -----------

const db = new Database('dados.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canal INTEGER NOT NULL,
    nivel TEXT NOT NULL,
    heap INTEGER,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

const inserirLeitura = db.prepare(
  `INSERT INTO leituras (canal, nivel, heap) VALUES (?, ?, ?)`
);

const NIVEIS_VALIDOS = ['baixo', 'medio', 'alto', 'critico'];

// ----------- ROTAS -----------

app.post('/api/leituras', (req, res) => {
  const { canal, nivel, heap } = req.body;

  if (canal === undefined || nivel === undefined) {
    return res.status(400).json({ erro: 'Campos "canal" e "nivel" sao obrigatorios.' });
  }

  if (!NIVEIS_VALIDOS.includes(nivel)) {
    return res.status(400).json({
      erro: `Campo "nivel" deve ser um destes: ${NIVEIS_VALIDOS.join(', ')}.`
    });
  }

  inserirLeitura.run(Number(canal), nivel, heap ?? null);
  res.status(201).json({ ok: true });
});

app.get('/api/leituras/atual', (req, res) => {
  const canal = Number(req.query.canal || 1);

  const linha = db
    .prepare('SELECT * FROM leituras WHERE canal = ? ORDER BY id DESC LIMIT 1')
    .get(canal);

  res.json(linha || null);
});

app.get('/api/leituras/historico', (req, res) => {
  const canal = Number(req.query.canal || 1);
  const limite = Math.min(Number(req.query.limite || 50), 500);

  const linhas = db
    .prepare('SELECT * FROM leituras WHERE canal = ? ORDER BY id DESC LIMIT ?')
    .all(canal, limite);

  res.json(linhas.reverse());
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
