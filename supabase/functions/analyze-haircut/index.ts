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
  mockups?: HaircutMockup[];
}

interface HaircutMockup {
  name: string;
  image_url: string;
  description: string;
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

    // First, get the face analysis and recommendations
    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
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

Provide 4-6 specific haircut suggestions that would complement their face shape and features, considering the user's preferences if provided. Focus on popular, modern styles.

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

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text()
      console.error('Gemini Analysis API error:', errorText)
      throw new Error(`Gemini Analysis API error: ${analysisResponse.status}`)
    }

    const analysisData = await analysisResponse.json()
    console.log('Received analysis response from Gemini')

    if (!analysisData.candidates || !analysisData.candidates[0] || !analysisData.candidates[0].content) {
      throw new Error('Invalid response from Gemini Analysis API')
    }

    const analysisTextResponse = analysisData.candidates[0].content.parts[0].text
    console.log('Raw Gemini analysis response:', analysisTextResponse)

    // Parse the analysis JSON response
    let analysisResult: AnalysisResponse
    try {
      const jsonMatch = analysisTextResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in analysis response')
      }
    } catch (parseError) {
      console.error('Failed to parse analysis JSON response:', parseError)
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

    // Now generate visual mockups for the top suggestions
    const mockups: HaircutMockup[] = []
    
    if (analysisResult.suggestions && analysisResult.suggestions.length > 0) {
      const topSuggestions = analysisResult.suggestions.slice(0, 4) // Get top 4 suggestions
      
      for (let i = 0; i < Math.min(topSuggestions.length, 4); i++) {
        const suggestion = topSuggestions[i]
        try {
          console.log(`Generating mockup for: ${suggestion.name}`)
          
          const mockupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `Create a visual mockup by editing this person's hairstyle to show a "${suggestion.name}" haircut. 

Instructions:
- Keep the person's face, skin tone, and facial features exactly the same
- Only modify the hair to match the "${suggestion.name}" style
- Ensure the new hairstyle looks natural and realistic on this person
- Maintain lighting and image quality
- The result should look like a professional hair salon preview

Style details: ${suggestion.description}

Generate the mockup image showing how this person would look with the "${suggestion.name}" hairstyle.`
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: image_data.split(',')[1]
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.3,
                topK: 16,
                topP: 0.8,
                maxOutputTokens: 1024,
              }
            })
          })

          if (mockupResponse.ok) {
            const mockupData = await mockupResponse.json()
            if (mockupData.candidates && mockupData.candidates[0] && mockupData.candidates[0].content) {
              // For now, we'll store the base64 image data
              // In a real implementation, you might want to upload to storage
              const mockupImage = mockupData.candidates[0].content.parts[0]?.inline_data?.data
              
              if (mockupImage) {
                mockups.push({
                  name: suggestion.name,
                  image_url: `data:image/jpeg;base64,${mockupImage}`,
                  description: suggestion.description
                })
                console.log(`Successfully generated mockup for: ${suggestion.name}`)
              }
            }
          } else {
            console.error(`Failed to generate mockup for ${suggestion.name}:`, await mockupResponse.text())
          }
        } catch (mockupError) {
          console.error(`Error generating mockup for ${suggestion.name}:`, mockupError)
        }
      }
    }

    analysisResult.mockups = mockups
    
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