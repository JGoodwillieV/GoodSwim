// supabase/functions/parse-time-standards/index.ts
// AI-powered parsing of time standards text extracted from PDFs/documents
// Uses Google Gemini to extract structured time standard data

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      throw new Error('Missing or invalid "text" field')
    }

    // Gemini Flash supports ~1M tokens input, so we can handle large documents
    const truncated = text.slice(0, 200000)

    const prompt = `You are a swim time standards parser. Extract ALL time standard entries from this document.

The document contains qualifying times / time standards for competitive swimming. Extract every single time entry you can find.

For each entry, provide:
- event: The swim event (e.g., "50 Free", "100 Back", "200 IM"). Use short stroke names: Free, Back, Breast, Fly, IM.
- gender: "M" for male/boys, "F" for female/girls
- age_min: Minimum age for the age group (use 0 for "X & Under")
- age_max: Maximum age for the age group (use 99 for "X & Over" or Open)
- course: "SCY" for Short Course Yards, "LCM" for Long Course Meters, "SCM" for Short Course Meters. You MUST determine the correct course for each entry. Look for section headers like "SHORT COURSE YARDS", "LONG COURSE METERS", "SHORT COURSE METERS", "SCY", "LCM", "SCM", or mentions of "yards" vs "meters". A single document often has MULTIPLE course sections — make sure you parse ALL of them and tag each entry with the correct course.
- time_string: The qualifying time as shown (e.g., "24.59", "1:05.49", "2:15.39")
- time_seconds: The time converted to total seconds (e.g., 24.59, 65.49, 135.39)
- standard_name: The name of the cut/standard if specified (e.g., "QT", "A", "AA", "AAA", "AAAA", "Finals", "Bonus"). If not specified, use "QT".

Also extract metadata:
- name: The official title/name of these time standards as it appears in the document (e.g., "2025-2028 Virginia Swimming Age Group Championship"). Look for the championship/meet name, NOT headers like "Hosted by" or page titles. The name should describe what these qualifying times are for.
- season: The season/year range (e.g., "2025-2028", "2024-2025")
- courses_found: Array of ALL courses found in the document (e.g., ["SCY"], ["SCY", "LCM", "SCM"])

CRITICAL INSTRUCTIONS:
- Extract ALL entries from ALL sections of the document, including SCY, LCM, and SCM sections
- Many documents have separate pages/sections for each course — you MUST parse every section
- Do NOT stop after the first course section — keep going through the entire document
- VERY IMPORTANT: Many time standard tables have SIDE-BY-SIDE columns for different courses in the SAME row. For example, a common layout is:
    GIRLS LCM | GIRLS SCY | Event Name | BOYS SCY | BOYS LCM
    35.49     | 31.29     | 50 Free    | 30.99    | 35.19
  In this case, a SINGLE row produces FOUR separate entries:
    1) Girls LCM 50 Free = 35.49 (course: "LCM")
    2) Girls SCY 50 Free = 31.29 (course: "SCY")
    3) Boys SCY 50 Free = 30.99 (course: "SCY")
    4) Boys LCM 50 Free = 35.19 (course: "LCM")
  You MUST read the column headers carefully to determine which times are SCY and which are LCM/SCM. Do NOT tag all entries as the same course.
- Age groups are typically: 10 & Under, 11-12, 13-14, 15 & Over (or 8 & Under, 9-10, 11-12, 13-14, 15-16, 17-18)
- If the document has separate columns for different age groups, extract each age group separately
- Convert times to seconds accurately: "1:05.49" = 65.49 seconds, "2:15.39" = 135.39 seconds
- For relay events (e.g., "200 Medley Relay", "400 Free Relay"), include them with the event name containing "Relay"
- Some events may only have times for one course (e.g., 100 IM may only have SCY times). Only create entries for times that actually exist — do not fabricate missing times.

Return valid JSON in exactly this format:
{
  "metadata": {
    "name": "string",
    "season": "string or null",
    "courses_found": ["SCY", "LCM", "SCM"]
  },
  "entries": [
    {
      "event": "50 Free",
      "gender": "M",
      "age_min": 9,
      "age_max": 10,
      "course": "SCY",
      "time_string": "32.59",
      "time_seconds": 32.59,
      "standard_name": "QT"
    }
  ]
}

Document text:
${truncated}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('parse-time-standards error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
