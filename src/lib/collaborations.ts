import { supabase } from './supabase'
import type { SavedCollaboration, CollaborationStatus } from '../types'

export async function getCollaborations(): Promise<SavedCollaboration[]> {
  const { data, error } = await supabase
    .from('collaborations')
    .select('*')
    .order('added_at', { ascending: false })

  if (error) {
    console.error('Error fetching collaborations:', error)
    return []
  }

  return (data || []).map(mapRowToCollaboration)
}

export async function createCollaboration(col: SavedCollaboration): Promise<SavedCollaboration | null> {
  const { data, error } = await supabase
    .from('collaborations')
    .insert({
      influencer_data: col.influencer,
      status: col.status,
      campaign_name: col.campaignName,
      personalized_dm: col.personalizedDm,
      notes: col.notes,
      budget_est: col.budgetEst,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating collaboration:', error)
    return null
  }

  return mapRowToCollaboration(data)
}

export async function updateCollaborationStatus(id: string, status: CollaborationStatus): Promise<void> {
  const { error } = await supabase
    .from('collaborations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating status:', error)
}

export async function updateCollaborationNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('collaborations')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating notes:', error)
}

export async function updateCollaborationDm(id: string, personalizedDm: string, status?: CollaborationStatus): Promise<void> {
  const updates: Record<string, any> = {
    personalized_dm: personalizedDm,
    updated_at: new Date().toISOString(),
  }
  if (status) updates.status = status

  const { error } = await supabase
    .from('collaborations')
    .update(updates)
    .eq('id', id)

  if (error) console.error('Error updating DM:', error)
}

export async function updateCollaborationBudget(id: string, budgetEst: number): Promise<void> {
  const { error } = await supabase
    .from('collaborations')
    .update({ budget_est: budgetEst, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating budget:', error)
}

export async function deleteCollaboration(id: string): Promise<void> {
  const { error } = await supabase
    .from('collaborations')
    .delete()
    .eq('id', id)

  if (error) console.error('Error deleting collaboration:', error)
}

function mapRowToCollaboration(row: any): SavedCollaboration {
  return {
    id: row.id,
    influencer: row.influencer_data,
    status: row.status,
    campaignName: row.campaign_name,
    personalizedDm: row.personalized_dm,
    notes: row.notes,
    budgetEst: row.budget_est,
    addedAt: row.added_at,
  }
}
