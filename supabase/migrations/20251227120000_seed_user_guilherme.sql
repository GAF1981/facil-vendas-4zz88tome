-- Insert the specific user requested in the User Story
INSERT INTO "public"."FUNCIONARIOS" (email, senha, nome_completo, setor, cpf, foto_url)
VALUES (
  'guilhermefantauzzi@gmail.com', 
  '0000', 
  'Guilherme Fantauzzi', 
  'Vendas', 
  '123.456.789-00',
  'https://img.usecurling.com/ppl/medium?gender=male&seed=guilherme'
)
ON CONFLICT (id) DO NOTHING;

-- Ensure the admin user also has the correct password format if not already
UPDATE "public"."FUNCIONARIOS" 
SET senha = '0000' 
WHERE email = '0000@gmail.com' AND senha != '0000';
