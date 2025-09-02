import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HaircutSuggestion {
  name: string;
  description: string;
  styling_tips: string;
  maintenance: string;
  face_shape_reason: string;
}

interface AnalysisResponse {
  face_shape: string;
  hair_texture: string;
  suggestions: HaircutSuggestion[];
  general_tips: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { image_data, preferences = {} } = await req.json()
    
    if (!image_data) {
      throw new Error('No image data provided')
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('Google Gemini API key not configured')
    }

    console.log('Analyzing image with Google Gemini...')

    // Prepare the request to Google Gemini Vision API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `You are a professional hairstylist and face shape expert. Analyze this person's facial features and provide haircut recommendations.

Please analyze:
1. Face shape (oval, round, square, heart, diamond, oblong)
2. Hair texture (if visible: straight, wavy, curly, coily)
3. Facial features that influence haircut choices

${preferences.length ? `User preferences: ${preferences.length} length` : ''}
${preferences.vibe ? `Desired vibe: ${preferences.vibe}` : ''}
${preferences.maintenance ? `Maintenance level: ${preferences.maintenance}` : ''}
${preferences.look ? `Desired look: ${preferences.look}` : ''}

Provide 3-4 specific haircut suggestions that would complement their face shape and features, considering the user's preferences if provided.

Respond in this exact JSON format:
{
  "face_shape": "detected face shape",
  "hair_texture": "estimated hair texture or 'not clearly visible'",
  "suggestions": [
    {
      "name": "Haircut Name",
      "description": "Detailed description of the haircut and why it works",
      "styling_tips": "How to style this haircut",
      "maintenance": "How often to trim and maintenance tips",
      "face_shape_reason": "Why this haircut complements their face shape"
    }
  ],
  "general_tips": [
    "General styling tip 1",
    "General styling tip 2"
  ]
}`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: image_data.split(',')[1] // Remove data:image/jpeg;base64, prefix
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Received response from Gemini')

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const textResponse = data.candidates[0].content.parts[0].text
    console.log('Raw Gemini response:', textResponse)

    // Parse the JSON response
    let analysisResult: AnalysisResponse
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      // Fallback response
      analysisResult = {
        face_shape: "Unable to determine",
        hair_texture: "Not clearly visible",
        suggestions: [
          {
            name: "Consultation Recommended",
            description: "I recommend visiting a professional stylist for a personalized consultation based on your unique features.",
            styling_tips: "Bring reference photos of styles you like",
            maintenance: "Regular trims every 6-8 weeks",
            face_shape_reason: "A professional can assess your features in person"
          }
        ],
        general_tips: [
          "Consider your lifestyle when choosing a haircut",
          "Healthy hair is the foundation of any great style"
        ]
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-haircut function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to analyze image' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})