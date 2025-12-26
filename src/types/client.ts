export type ClientStatus = 'active' | 'inactive'

export interface ClientAddress {
  cep: string
  street: string
  number: string
  complement?: string
  city: string
  state: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  phoneSecondary?: string
  document: string // CPF or CNPJ
  birthDate?: string
  status: ClientStatus
  address: ClientAddress
  createdAt: string
}

export interface ClientFormData {
  name: string
  email: string
  phone: string
  phoneSecondary?: string
  document: string
  birthDate?: string
  status: ClientStatus
  address: {
    cep: string
    street: string
    number: string
    complement?: string
    city: string
    state: string
  }
}
