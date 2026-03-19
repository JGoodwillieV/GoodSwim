import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const DEMO_EMAIL = 'demo@goodswim.io'
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    const demoUser = users?.users?.find(u => u.email === DEMO_EMAIL)
    
    if (!demoUser) {
      throw new Error('Demo user not found')
    }

    const demoUserId = demoUser.id

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', demoUserId)
      .single()

    if (!teamMember) {
      throw new Error('Demo team not found')
    }

    const demoTeamId = teamMember.team_id

    // --- WIPE DEMO DATA ---
    await supabase.from('practices').delete().eq('coach_id', demoUserId)
    await supabase.from('test_set_results')
      .delete()
      .filter('test_set_id', 'in',
        `(SELECT id FROM test_sets WHERE coach_id = '${demoUserId}')`
      )
    await supabase.from('test_sets').delete().eq('coach_id', demoUserId)
    await supabase.from('team_records').delete().eq('team_id', demoTeamId)
    await supabase.from('swimmers').delete().eq('coach_id', demoUserId)

    // --- RE-SEED DEMO DATA ---
    const swimmers = [
      { name: 'Ethan Parker', group_name: 'Senior', age: 17, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 88 },
      { name: 'Maya Chen', group_name: 'Senior', age: 16, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 92 },
      { name: 'Jackson Rivera', group_name: 'Senior', age: 17, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 85 },
      { name: 'Sophia Williams', group_name: 'Senior', age: 16, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 90 },
      { name: 'Noah Kim', group_name: 'Senior', age: 15, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 82 },
      { name: 'Ava Thompson', group_name: 'Senior', age: 17, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 87 },
      { name: 'Liam Patel', group_name: 'Senior', age: 16, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 79 },
      { name: 'Emma Davis', group_name: 'Senior', age: 15, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 91 },
      { name: 'Oliver Martinez', group_name: 'Age Group Gold', age: 13, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 78 },
      { name: 'Isabella Nguyen', group_name: 'Age Group Gold', age: 14, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 81 },
      { name: 'Lucas Brown', group_name: 'Age Group Gold', age: 13, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 75 },
      { name: 'Mia Johnson', group_name: 'Age Group Gold', age: 14, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 83 },
      { name: 'Benjamin Lee', group_name: 'Age Group Gold', age: 12, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 72 },
      { name: 'Charlotte Anderson', group_name: 'Age Group Gold', age: 13, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 77 },
      { name: 'Henry Garcia', group_name: 'Age Group Gold', age: 14, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 80 },
      { name: 'Amelia Taylor', group_name: 'Age Group Gold', age: 12, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 74 },
      { name: 'Alexander White', group_name: 'Age Group Gold', age: 13, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 76 },
      { name: 'Harper Robinson', group_name: 'Age Group Gold', age: 14, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 82 },
      { name: 'Daniel Clark', group_name: 'Age Group Silver', age: 11, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 68 },
      { name: 'Ella Lewis', group_name: 'Age Group Silver', age: 10, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 71 },
      { name: 'Sebastian Hall', group_name: 'Age Group Silver', age: 11, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 65 },
      { name: 'Scarlett Young', group_name: 'Age Group Silver', age: 10, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 69 },
      { name: 'Jack Allen', group_name: 'Age Group Silver', age: 9, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 62 },
      { name: 'Grace King', group_name: 'Age Group Silver', age: 11, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 70 },
      { name: 'Owen Wright', group_name: 'Age Group Silver', age: 10, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 64 },
      { name: 'Zoey Scott', group_name: 'Age Group Silver', age: 9, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 67 },
      { name: 'Caleb Torres', group_name: 'Age Group Silver', age: 11, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 66 },
      { name: 'Lily Hill', group_name: 'Age Group Silver', age: 10, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 72 },
      { name: 'Ryan Green', group_name: 'Novice', age: 8, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 55 },
      { name: 'Chloe Adams', group_name: 'Novice', age: 7, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 58 },
      { name: 'Nathan Baker', group_name: 'Novice', age: 8, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 52 },
      { name: 'Aria Gonzalez', group_name: 'Novice', age: 7, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 56 },
      { name: 'Dylan Mitchell', group_name: 'Novice', age: 6, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 48 },
      { name: 'Penelope Campbell', group_name: 'Novice', age: 8, gender: 'F', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 54 },
      { name: 'Leo Morgan', group_name: 'Novice', age: 7, gender: 'M', coach_id: demoUserId, team_id: demoTeamId, status: 'Active', efficiency_score: 50 },
    ]
    
    await supabase.from('swimmers').insert(swimmers)

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0]

    const practices = [
      { coach_id: demoUserId, team_id: demoTeamId, title: 'Senior AM — Threshold', description: 'Focus on aerobic threshold development', total_yards: 5200, status: 'completed', scheduled_date: twoDaysAgo, scheduled_time: '05:30', training_group_id: 'Senior', focus_tags: ['aerobic', 'endurance'] },
      { coach_id: demoUserId, team_id: demoTeamId, title: 'Age Group Gold — Sprint Day', description: 'Short rest, high intensity', total_yards: 3800, status: 'completed', scheduled_date: yesterday, scheduled_time: '16:00', training_group_id: 'Age Group Gold', focus_tags: ['sprint', 'speed'] },
      { coach_id: demoUserId, team_id: demoTeamId, title: 'Senior PM — IM Work', description: 'All four strokes with transitions', total_yards: 4500, status: 'scheduled', scheduled_date: today, scheduled_time: '15:30', training_group_id: 'Senior', focus_tags: ['IM', 'technique'] },
      { coach_id: demoUserId, team_id: demoTeamId, title: 'Age Group Silver — Technique', description: 'Drill-heavy practice with video review', total_yards: 2800, status: 'scheduled', scheduled_date: tomorrow, scheduled_time: '16:00', training_group_id: 'Age Group Silver', focus_tags: ['technique', 'drill'] },
      { coach_id: demoUserId, team_id: demoTeamId, title: 'Full Team — Friday Fun', description: 'Relays and games to end the week', total_yards: 2000, status: 'scheduled', scheduled_date: dayAfter, scheduled_time: '16:00', training_group_id: null, focus_tags: ['fun', 'relays'] },
    ]
    
    await supabase.from('practices').insert(practices)

    const records = [
      { team_id: demoTeamId, event: '50 Free', age_group: '15 & Over', gender: 'Male', swimmer_name: 'Ethan Parker', time_seconds: 21.45, time_display: '21.45', date: '2025-12-14', course: 'SCY' },
      { team_id: demoTeamId, event: '100 Free', age_group: '15 & Over', gender: 'Female', swimmer_name: 'Maya Chen', time_seconds: 52.18, time_display: '52.18', date: '2025-11-22', course: 'SCY' },
      { team_id: demoTeamId, event: '100 Fly', age_group: '15 & Over', gender: 'Male', swimmer_name: 'Jackson Rivera', time_seconds: 53.67, time_display: '53.67', date: '2026-01-18', course: 'SCY' },
      { team_id: demoTeamId, event: '200 IM', age_group: '15 & Over', gender: 'Female', swimmer_name: 'Sophia Williams', time_seconds: 128.44, time_display: '2:08.44', date: '2026-02-08', course: 'SCY' },
      { team_id: demoTeamId, event: '50 Free', age_group: '13/14', gender: 'Male', swimmer_name: 'Henry Garcia', time_seconds: 24.12, time_display: '24.12', date: '2026-01-18', course: 'SCY' },
      { team_id: demoTeamId, event: '100 Back', age_group: '13/14', gender: 'Female', swimmer_name: 'Harper Robinson', time_seconds: 62.89, time_display: '1:02.89', date: '2025-12-14', course: 'SCY' },
      { team_id: demoTeamId, event: '50 Free', age_group: '11/12', gender: 'Male', swimmer_name: 'Daniel Clark', time_seconds: 28.33, time_display: '28.33', date: '2026-02-08', course: 'SCY' },
      { team_id: demoTeamId, event: '50 Free', age_group: '11/12', gender: 'Female', swimmer_name: 'Grace King', time_seconds: 29.01, time_display: '29.01', date: '2026-01-18', course: 'SCY' },
      { team_id: demoTeamId, event: '25 Free', age_group: '10 & Under', gender: 'Male', swimmer_name: 'Ryan Green', time_seconds: 15.44, time_display: '15.44', date: '2025-12-14', course: 'SCY' },
      { team_id: demoTeamId, event: '25 Free', age_group: '10 & Under', gender: 'Female', swimmer_name: 'Chloe Adams', time_seconds: 15.89, time_display: '15.89', date: '2026-02-08', course: 'SCY' },
    ]

    await supabase.from('team_records').insert(records)

    // Reset the demo password in case someone changed it
    await supabase.auth.admin.updateUserById(demoUserId, {
      password: 'GoodSwimDemo2025!',
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Demo data reset complete' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Demo reset error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reset demo data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
