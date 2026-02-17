-- Migration to update initial balances for all products in General and Car inventories to 10,000

-- Update General Inventory Initial Balances
UPDATE "ESTOQUE GERAL SALDO INICIAL"
SET saldo_inicial = 10000;

-- Update Car Inventory Initial Balances
UPDATE "ESTOQUE CARRO SALDO INICIAL"
SET saldo_inicial = 10000;
