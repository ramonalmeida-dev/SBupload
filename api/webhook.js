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

// Webhook para processar o JSON recebido
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // Valida o corpo da requisição
    const inputJson = req.body;
    if (!inputJson || typeof inputJson !== 'object') {
      return res.status(400).json({ error: 'Payload inválido. Envie um JSON válido.' });
    }

    // Converte o JSON em buffer
    const jsonText = JSON.stringify(inputJson, null, 2);
    const jsonBuffer = Buffer.from(jsonText);

    // Define o nome do arquivo como UUID
    const fileName = `${FOLDER_NAME}/${uuidv4()}.json`;

    // Faz o upload para o Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, jsonBuffer, {
        contentType: "application/json",
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

    // Retorna somente a URL
    return res.status(200).send(publicData.publicUrl);
  } catch (err) {
    console.error("Erro ao processar o webhook:", err.message);
    return res.status(500).json({ error: 'Erro interno ao processar o JSON.' });
  }
};
