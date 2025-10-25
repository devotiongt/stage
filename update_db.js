import { supabase } from './src/lib/supabase.js'

async function updateDatabase() {
  try {
    console.log('🔄 Updating database schema...')
    
    // 1. Add poll_id column to presentation_display table
    console.log('Adding poll_id column...')
    const { error: columnError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE presentation_display 
        ADD COLUMN IF NOT EXISTS poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;
      `
    })
    
    if (columnError) {
      console.error('Error adding column:', columnError)
    } else {
      console.log('✅ poll_id column added successfully')
    }
    
    // 2. Update constraint to include 'poll_results'
    console.log('Updating display_type constraint...')
    const { error: constraintError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE presentation_display 
        DROP CONSTRAINT IF EXISTS presentation_display_display_type_check;
        
        ALTER TABLE presentation_display 
        ADD CONSTRAINT presentation_display_display_type_check 
        CHECK (display_type IN ('welcome', 'qr_code', 'question', 'custom_message', 'active_poll', 'poll_results'));
      `
    })
    
    if (constraintError) {
      console.error('Error updating constraint:', constraintError)
    } else {
      console.log('✅ display_type constraint updated successfully')
    }
    
    console.log('🎉 Database schema updated!')
    
  } catch (error) {
    console.error('❌ Error updating database:', error)
  }
}

updateDatabase()