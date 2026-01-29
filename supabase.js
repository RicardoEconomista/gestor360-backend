// ============================================
// GESTOR 360° - CONFIGURAÇÃO SUPABASE
// ============================================
// Arquivo: supabase.js
// Função: Conectar backend com banco de dados Supabase

const { createClient } = require('@supabase/supabase-js');

// CONFIGURAÇÕES DO SUPABASE
const SUPABASE_URL = 'https://tdclvlukfckkibwlbgwo.supabase.co';

// Chave de autenticação (anon/public key)
const SUPABASE_ANON_KEY = 'sb_publishable_SSavf8vriHMr7WWQ9SO1Cg_cUxdQoRr';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso em outros arquivos
module.exports = supabase;
