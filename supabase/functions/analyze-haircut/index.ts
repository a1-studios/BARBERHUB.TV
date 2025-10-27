import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface HairstyleRecommendation {
  name: string;
  category: 'similar' | 'short' | 'long';
  description: string;
  image_url: string;
  styling_tips: string;
}

interface AnalysisResult {
  current_style_detected: string;
  face_shape: string;
  hair_texture: string;
  recommendations: HairstyleRecommendation[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, preferences = {} } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('At least one image is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Analyzing ${images.length} image(s) with preferences:`, preferences);

    // Step 1: Analyze the image(s)
    const analysisPrompt = images.length > 1
      ? `Analyze these ${images.length} photos of the same person from different angles.

Detect and return ONLY valid JSON (no markdown, no extra text):
{
  "face_shape": "oval|round|square|heart|diamond|oblong",
  "current_style": "detailed description of current hairstyle",
  "hair_texture": "straight|wavy|curly|coily",
  "skin_tone": "fair|medium|olive|tan|deep"
}

Be specific and accurate.`
      : `Analyze this photo and detect:

Return ONLY valid JSON (no markdown):
{
  "face_shape": "oval|round|square|heart|diamond|oblong",
  "current_style": "detailed description of current hairstyle",
  "hair_texture": "straight|wavy|curly|coily",
  "skin_tone": "fair|medium|olive|tan|deep"
}

Be accurate.`;

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

    // Parse analysis
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

    // Step 2: Generate hairstyle images based on preferences
    const selectedCategories = preferences.categories || ['similar', 'short', 'long'];
    const styleVibe = preferences.vibe || 'modern';
    const maintenance = preferences.maintenance || 'medium';
    
    const recommendations: HairstyleRecommendation[] = [];

    const categoryPrompts: Record<string, { name: string; prompt: string; tips: string }> = {
      similar: {
        name: 'Refined Version',
        prompt: `Professional high-quality barbershop photo of a ${analysis.skin_tone} skin ${analysis.face_shape}-shaped face person with a polished refined version of ${analysis.current_style}, ${analysis.hair_texture} hair texture, ${styleVibe} ${maintenance}-maintenance style, sharp clean modern barbershop setting, natural professional lighting, front-facing portrait view, ultra realistic photorealistic 4K quality, detailed hair strands`,
        tips: `Maintains your current style with professional refinement. Ask your barber to keep the overall shape while cleaning up edges and adding definition.`
      },
      short: {
        name: 'Bold Short Cut',
        prompt: `Professional high-quality barbershop photo of a ${analysis.skin_tone} skin ${analysis.face_shape}-shaped face person with modern short buzzcut or crew cut, ${analysis.hair_texture} hair, ${styleVibe} low-maintenance style, clean sharp barbershop setting, natural professional lighting, front-facing portrait view, ultra realistic photorealistic 4K quality, detailed texture`,
        tips: `Low maintenance and sharp. Perfect for active lifestyles. Requires trims every 2-3 weeks to maintain the clean look.`
      },
      long: {
        name: 'Long & Flowing',
        prompt: `Professional high-quality barbershop photo of a ${analysis.skin_tone} skin ${analysis.face_shape}-shaped face person with longer flowing hairstyle, ${analysis.hair_texture} hair cascading naturally with textured layers, ${styleVibe} style, modern clean barbershop setting, natural professional lighting, front-facing portrait view, ultra realistic photorealistic 4K quality, detailed hair movement`,
        tips: `Requires more styling time but offers versatility. Use quality hair products and consider regular conditioning treatments.`
      }
    };

    // Generate images for selected categories
    for (const category of selectedCategories) {
      if (!categoryPrompts[category]) continue;

      const { name, prompt, tips } = categoryPrompts[category];
      
      console.log(`Generating ${category} hairstyle...`);

      try {
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (generatedImage) {
            recommendations.push({
              name,
              category: category as any,
              description: `A ${category} hairstyle tailored for your ${analysis.face_shape} face shape and ${analysis.hair_texture} hair texture.`,
              image_url: generatedImage,
              styling_tips: tips
            });
            console.log(`Successfully generated ${category} hairstyle`);
          }
        } else {
          console.error(`Failed to generate ${category} image:`, imageResponse.status);
        }
      } catch (error) {
        console.error(`Error generating ${category} image:`, error);
      }
    }

    if (recommendations.length === 0) {
      throw new Error('Failed to generate any hairstyle recommendations');
    }

    const result: AnalysisResult = {
      current_style_detected: analysis.current_style,
      face_shape: analysis.face_shape,
      hair_texture: analysis.hair_texture,
      recommendations
    };

    console.log(`Successfully generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-haircut function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
