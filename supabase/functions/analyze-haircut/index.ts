import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, voice_transcript, preferences = {} } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('At least one image is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Analyzing ${images.length} image(s), voice_transcript: ${!!voice_transcript}`);

    // Build analysis prompt — incorporate voice transcript if present
    let analysisPrompt = `Analyze this photo and detect the person's current hairstyle, face shape, hair texture, and skin tone.`;

    if (voice_transcript) {
      analysisPrompt += `\n\nThe client described what they want: "${voice_transcript}". Incorporate this into your analysis.`;
    }

    analysisPrompt += `\n\nReturn ONLY valid JSON (no markdown):\n{\n  "face_shape": "oval|round|square|heart|diamond|oblong",\n  "current_style": "detailed description of current hairstyle",\n  "hair_texture": "straight|wavy|curly|coily",\n  "skin_tone": "fair|medium|olive|tan|deep"`;

    if (voice_transcript) {
      analysisPrompt += `,\n  "client_brief": "A concise 1-2 sentence summary combining what you see in the photo with what the client described they want. Be specific about the style."`;
    }

    analysisPrompt += `\n}\n\nBe accurate and specific.`;

    const analysisMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          ...images.map((img: string) => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      }
    ];

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: analysisMessages,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis API error:', analysisResponse.status, errorText);

      if (analysisResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (analysisResponse.status === 402) {
        throw new Error('Service temporarily unavailable. Please contact support.');
      }
      throw new Error('Failed to analyze image');
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices?.[0]?.message?.content || '';
    console.log('Analysis result:', analysisText);

    let analysis: any;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisText);
    } catch {
      analysis = {
        face_shape: 'oval',
        current_style: 'classic cut',
        hair_texture: 'straight',
        skin_tone: 'medium'
      };
    }

    // Build client_brief if not already provided by the model
    let clientBrief = analysis.client_brief || '';
    if (!clientBrief) {
      const parts = [analysis.current_style, `${analysis.face_shape} face`, analysis.hair_texture];
      if (voice_transcript) parts.push(voice_transcript);
      clientBrief = parts.filter(Boolean).join(' · ');
    }

    const result = {
      current_style_detected: analysis.current_style,
      face_shape: analysis.face_shape,
      hair_texture: analysis.hair_texture,
      client_brief: clientBrief,
      recommendations: [],
    };

    console.log('Returning analysis with client_brief');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-haircut function:', error);

    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
