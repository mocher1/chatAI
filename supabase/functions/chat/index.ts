import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { threadId, message } = await req.json()

    if (!threadId || !message) {
      return new Response(
        JSON.stringify({ error: 'Thread ID and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const assistantId = Deno.env.get('ASSISTANT_ID')

    if (!openaiApiKey || !assistantId) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 1. Add user message to thread
    const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    })

    if (!addMessageResponse.ok) {
      throw new Error('Failed to add message to thread')
    }

    // 2. Create and run assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: "Jesteś CareerGPT - przyjaznym doradcą zawodowym, który specjalizuje się w polskim rynku pracy. Pomagasz w pisaniu CV, przygotowaniu do rozmów kwalifikacyjnych i planowaniu kariery. Odpowiadasz po polsku, używasz prostego języka i unikasz żargonu HR. Twoje odpowiedzi są konkretne i praktyczne."
      })
    })

    if (!runResponse.ok) {
      throw new Error('Failed to create run')
    }

    const run = await runResponse.json()

    // 3. Poll run status until completion
    let runStatus = run
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        throw new Error(`Run ${runStatus.status}`)
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status')
      }

      runStatus = await statusResponse.json()
    }

    // 4. Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages')
    }

    const messages = await messagesResponse.json()
    const assistantMessage = messages.data[0].content[0].text.value

    return new Response(
      JSON.stringify({ assistantMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
