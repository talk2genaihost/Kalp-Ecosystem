export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      kmrl_experiments: {
        Row: { created_at: string; experiment_id: string; revision: number; snapshot: Json; updated_at: string };
        Insert: { created_at?: string; experiment_id: string; revision?: number; snapshot: Json; updated_at?: string };
        Update: { created_at?: string; experiment_id?: string; revision?: number; snapshot?: Json; updated_at?: string };
        Relationships: [];
      };
      kmrl_mutations: {
        Row: { applied_revision: number | null; base_revision: number; command: Json; created_at: string; experiment_id: string; mutation_id: string };
        Insert: { applied_revision?: number | null; base_revision: number; command: Json; created_at?: string; experiment_id: string; mutation_id: string };
        Update: { applied_revision?: number | null; base_revision?: number; command?: Json; created_at?: string; experiment_id?: string; mutation_id?: string };
        Relationships: [{ foreignKeyName: "kmrl_mutations_experiment_id_fkey"; columns: ["experiment_id"]; isOneToOne: false; referencedRelation: "kmrl_experiments"; referencedColumns: ["experiment_id"] }];
      };
    };
    Views: Record<string, never>;
    Functions: {
      kmrl_upsert_experiment: { Args: { p_expected_revision: number; p_experiment_id: string; p_snapshot: Json }; Returns: { created_at: string; experiment_id: string; revision: number; snapshot: Json; updated_at: string } };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
