require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configurações do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BUCKET_NAME = process.env.BUCKET_NAME;
const FOLDER_NAME = process.env.FOLDER_NAME;

// Validação de variáveis de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !BUCKET_NAME || !FOLDER_NAME) {
  console.error('Erro: Variáveis de ambiente não configuradas corretamente.');
  process.exit(1);
}

// Webhook para processar o Base64 recebido
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // Valida o corpo da requisição
    const base64RawData = req.body;

    if (!base64RawData || typeof base64RawData !== 'string') {
      return res.status(400).json({ error: 'Payload inválido. Envie uma Base64 válida.' });
    }

    // Converte o raw Base64 em buffer
    const imageBuffer = Buffer.from(base64RawData, 'base64');

    // Define o nome do arquivo como UUID e extensão PNG
    const fileName = `${uuidv4()}.png`;

    // Faz o upload para o Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erro ao fazer upload no Supabase:", error.message);
      return res.status(500).json({ error: 'Erro ao fazer upload no Supabase.' });
    }

    // Obtém a URL pública do arquivo
    const { data: publicData, error: publicError } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    if (publicError) {
      console.error("Erro ao obter a URL pública:", publicError.message);
      return res.status(500).json({ error: 'Erro ao gerar a URL pública do arquivo.' });
    }

    // Retorna somente a URL pública
    return res.status(200).json({ publicUrl: publicData.publicUrl });
  } catch (err) {
    console.error("Erro ao processar o webhook:", err.message);
    return res.status(500).json({ error: 'Erro interno ao processar a imagem.' });
  }
};
