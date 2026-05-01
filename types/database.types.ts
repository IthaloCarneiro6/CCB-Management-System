export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      campeonatos: {
        Row: {
          id: string
          nome: string
          formato_chaves: boolean
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          formato_chaves: boolean
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          formato_chaves?: boolean
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      equipes: {
        Row: {
          id: string
          campeonato_id: string
          nome: string
          chave: string
          eh_interior: boolean
          created_at: string
        }
        Insert: {
          id?: string
          campeonato_id: string
          nome: string
          chave: string
          eh_interior?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          campeonato_id?: string
          nome?: string
          chave?: string
          eh_interior?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'equipes_campeonato_id_fkey'
            columns: ['campeonato_id']
            isOneToOne: false
            referencedRelation: 'campeonatos'
            referencedColumns: ['id']
          }
        ]
      }
      partidas: {
        Row: {
          id: string
          campeonato_id: string
          equipe_a_id: string
          equipe_b_id: string
          status: 'pendente' | 'aguardando' | 'realizado'
          data_agendada: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campeonato_id: string
          equipe_a_id: string
          equipe_b_id: string
          status?: 'pendente' | 'aguardando' | 'realizado'
          data_agendada?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campeonato_id?: string
          equipe_a_id?: string
          equipe_b_id?: string
          status?: 'pendente' | 'aguardando' | 'realizado'
          data_agendada?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'partidas_campeonato_id_fkey'
            columns: ['campeonato_id']
            isOneToOne: false
            referencedRelation: 'campeonatos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'partidas_equipe_a_id_fkey'
            columns: ['equipe_a_id']
            isOneToOne: false
            referencedRelation: 'equipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'partidas_equipe_b_id_fkey'
            columns: ['equipe_b_id']
            isOneToOne: false
            referencedRelation: 'equipes'
            referencedColumns: ['id']
          }
        ]
      }
      disponibilidades: {
        Row: {
          id: string
          equipe_id: string
          data: string
          created_at: string
        }
        Insert: {
          id?: string
          equipe_id: string
          data: string
          created_at?: string
        }
        Update: {
          id?: string
          equipe_id?: string
          data?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'disponibilidades_equipe_id_fkey'
            columns: ['equipe_id']
            isOneToOne: false
            referencedRelation: 'equipes'
            referencedColumns: ['id']
          }
        ]
      }
      logs_transacoes: {
        Row: {
          id: string
          partida_id: string
          acao: string
          status_anterior: string
          status_novo: string
          batch_id: string
          created_at: string
        }
        Insert: {
          id?: string
          partida_id: string
          acao: string
          status_anterior: string
          status_novo: string
          batch_id: string
          created_at?: string
        }
        Update: {
          id?: string
          partida_id?: string
          acao?: string
          status_anterior?: string
          status_novo?: string
          batch_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'logs_transacoes_partida_id_fkey'
            columns: ['partida_id']
            isOneToOne: false
            referencedRelation: 'partidas'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
