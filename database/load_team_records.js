// Script to load Hurricane SC team records into Supabase
// Run this with: node database/load_team_records.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://cwribodiexjmnialapgr.supabase.co';
const supabaseKey = 'sb_publishable_7p1-mblJiDxMfQGlrnaH7w_9-J8jIre';

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadTeamRecords() {
  try {
    console.log('📖 Reading team records data...');
    
    // Read the JSON data file
    const dataPath = join(__dirname, 'team_records_data.json');
    const rawData = readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log(`✅ Found ${data.records.length} team records to load`);
    
    // Check if records already exist
    const { data: existingRecords, error: checkError } = await supabase
      .from('team_records')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing records:', checkError);
      console.log('💡 Make sure you have created the team_records table first.');
      console.log('   Run the SQL in database/team_records_schema.sql in your Supabase SQL editor.');
      return;
    }
    
    if (existingRecords && existingRecords.length > 0) {
      console.log('⚠️  Team records table already has data.');
      console.log('   Do you want to clear it first? (You may need to delete manually in Supabase)');
    }
    
    // Insert records in batches to avoid timeouts
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < data.records.length; i += batchSize) {
      const batch = data.records.slice(i, i + batchSize);
      
      console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.records.length / batchSize)}...`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('team_records')
        .insert(batch.map(record => ({
          event: record.event,
          age_group: record.age_group,
          gender: record.gender,
          swimmer_name: record.swimmer_name,
          time_seconds: record.time_seconds,
          time_display: record.time_display,
          date: record.date,
          course: 'SCY'
        })));
      
      if (insertError) {
        console.error('❌ Error inserting batch:', insertError);
        console.error('   Failed records:', batch.slice(0, 3));
        return;
      }
      
      inserted += batch.length;
      console.log(`   ✅ Inserted ${inserted}/${data.records.length} records`);
    }
    
    console.log('\n🎉 Successfully loaded all team records!');
    console.log(`📊 Total records inserted: ${inserted}`);
    
    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('team_records')
      .select('event, age_group, gender', { count: 'exact' });
    
    if (!verifyError) {
      console.log(`✅ Verification: ${verifyData.length} records in database`);
    }
    
  } catch (error) {
    console.error('❌ Error loading team records:', error);
  }
}

// Run the script
loadTeamRecords();

