import { create } from 'zustand'
import { Client, ClientFormData } from '@/types/client'
import { v4 as uuidv4 } from 'uuid'

interface ClientStore {
  clients: Client[]
  addClient: (data: ClientFormData) => void
  updateClient: (id: string, data: ClientFormData) => void
  deleteClient: (id: string) => void
  getClientById: (id: string) => Client | undefined
}

const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Roberto Silva',
    email: 'roberto.silva@email.com',
    phone: '(11) 99999-1234',
    document: '123.456.789-00',
    status: 'active',
    address: {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: '10',
      city: 'São Paulo',
      state: 'SP',
    },
    createdAt: '2023-10-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Fernanda Oliveira',
    email: 'fernanda.o@email.com',
    phone: '(21) 98888-5678',
    document: '987.654.321-00',
    status: 'active',
    address: {
      cep: '20040-002',
      street: 'Rua da Assembleia',
      number: '50',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
    createdAt: '2023-11-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Empresa XYZ Ltda',
    email: 'contato@xyz.com',
    phone: '(31) 3333-4444',
    document: '12.345.678/0001-90',
    status: 'inactive',
    address: {
      cep: '30130-000',
      street: 'Av. Afonso Pena',
      number: '1000',
      city: 'Belo Horizonte',
      state: 'MG',
    },
    createdAt: '2023-12-05T09:15:00Z',
  },
  {
    id: '4',
    name: 'Juliana Costa',
    email: 'ju.costa@email.com',
    phone: '(41) 97777-1111',
    document: '456.789.123-44',
    status: 'active',
    address: {
      cep: '80020-000',
      street: 'Rua XV de Novembro',
      number: '200',
      city: 'Curitiba',
      state: 'PR',
    },
    createdAt: '2024-01-10T16:45:00Z',
  },
  {
    id: '5',
    name: 'Marcos Pereira',
    email: 'marcos.p@email.com',
    phone: '(51) 96666-2222',
    document: '789.123.456-77',
    status: 'active',
    address: {
      cep: '90010-000',
      street: 'Av. Borges de Medeiros',
      number: '500',
      city: 'Porto Alegre',
      state: 'RS',
    },
    createdAt: '2024-02-01T11:20:00Z',
  },
]

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: MOCK_CLIENTS,
  addClient: (data) => {
    const newClient: Client = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...data,
    }
    set((state) => ({ clients: [newClient, ...state.clients] }))
  },
  updateClient: (id, data) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === id ? { ...client, ...data } : client,
      ),
    }))
  },
  deleteClient: (id) => {
    set((state) => ({
      clients: state.clients.filter((client) => client.id !== id),
    }))
  },
  getClientById: (id) => {
    return get().clients.find((client) => client.id === id)
  },
}))
