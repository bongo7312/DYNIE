// Minimal static server (no database)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from project directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Static site available at http://localhost:${PORT}`);
});