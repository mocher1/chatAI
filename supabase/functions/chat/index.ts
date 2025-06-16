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
      console.error('Missing environment variables:', { 
        hasApiKey: !!openaiApiKey, 
        hasAssistantId: !!assistantId 
      })
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing chat request:', { threadId, assistantId })

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
      const errorText = await addMessageResponse.text()
      console.error('Failed to add message to thread:', errorText)
      throw new Error('Failed to add message to thread')
    }

    // 2. Create and run assistant with enhanced instructions
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: `Jesteś CareerGPT - ekspertem od polskiego rynku pracy i doradcą zawodowym. Twoja wiedza opiera się na aktualnych dokumentach, raportach i przepisach prawnych.

KLUCZOWE ZASADY ODPOWIEDZI:
1. **Zawsze odpowiadaj po polsku** - używaj naturalnego, przyjaznego języka
2. **Bądź konkretny i praktyczny** - dawaj wykonalne rady, nie ogólniki
3. **Strukturyzuj odpowiedzi** - używaj nagłówków, list punktowych, pogrubień
4. **Odwołuj się do źródeł** - gdy korzystasz z dokumentów, wskaż je naturalnie
5. **Nie pokazuj metadanych** - ukryj identyfikatory plików [xx:yy†nazwa.pdf]

OBSZARY TWOJEJ EKSPERTYZY:
- **CV i listy motywacyjne** - formatowanie, treść, dostosowanie do stanowiska
- **Rozmowy kwalifikacyjne** - przygotowanie, typowe pytania, negocjacje
- **Prawo pracy** - umowy, urlopy, wypowiedzenia (na podstawie Kodeksu Pracy)
- **Rynek pracy** - trendy płacowe, wymagania, perspektywy rozwoju
- **Planowanie kariery** - zmiana branży, rozwój kompetencji, awanse

SPOSÓB ODPOWIADANIA:
- Zacznij od bezpośredniej odpowiedzi na pytanie
- Podaj konkretne kroki do wykonania
- Dodaj praktyczne przykłady gdy to możliwe
- Zakończ pytaniem lub zachętą do dalszej rozmowy

JEŚLI NIE MASZ INFORMACJI:
- Przyznaj się szczerze, że nie masz danej informacji
- Zaproponuj alternatywne rozwiązanie lub temat
- Skieruj na odpowiednie źródła zewnętrzne

FORMATOWANIE:
- Używaj **pogrubień** dla kluczowych punktów
- Twórz listy punktowe dla kroków i wyliczeń
- Stosuj nagłówki ## dla głównych sekcji
- Dodawaj > cytaty dla ważnych informacji

Pamiętaj: Jesteś zaufanym doradcą, nie chatbotem. Twoje odpowiedzi mają pomagać ludziom w podejmowaniu mądrych decyzji zawodowych.`
      })
    })

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('Failed to create run:', errorText)
      throw new Error('Failed to create run')
    }

    const run = await runResponse.json()
    console.log('Created run:', run.id)

    // 3. Poll run status until completion with timeout
    let runStatus = run
    let pollCount = 0
    const maxPolls = 60 // 60 seconds timeout
    
    while (runStatus.status !== 'completed' && pollCount < maxPolls) {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        console.error('Run failed or cancelled:', runStatus)
        throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`)
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
      pollCount++

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        console.error('Failed to check run status:', errorText)
        throw new Error('Failed to check run status')
      }

      runStatus = await statusResponse.json()
      console.log(`Run status (poll ${pollCount}):`, runStatus.status)
    }

    if (runStatus.status !== 'completed') {
      console.error('Run timed out:', runStatus)
      throw new Error('Assistant response timed out')
    }

    // 4. Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1&order=desc`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error('Failed to get messages:', errorText)
      throw new Error('Failed to get messages')
    }

    const messages = await messagesResponse.json()
    console.log('Retrieved messages:', messages.data?.length || 0)

    // Validate message structure
    if (!messages.data || messages.data.length === 0) {
      console.error('No messages returned')
      throw new Error('No response from assistant')
    }

    const latestMessage = messages.data[0]
    if (!latestMessage.content || latestMessage.content.length === 0) {
      console.error('Empty message content')
      throw new Error('Empty response from assistant')
    }

    const messageContent = latestMessage.content[0]
    if (!messageContent.text || !messageContent.text.value) {
      console.error('Invalid message structure:', messageContent)
      throw new Error('Invalid response format from assistant')
    }

    const assistantMessage = messageContent.text.value.trim()
    
    if (!assistantMessage) {
      console.error('Empty assistant message after trim')
      throw new Error('Empty response from assistant')
    }

    console.log('Successfully processed assistant response, length:', assistantMessage.length)

    return new Response(
      JSON.stringify({ assistantMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in chat function:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const statusCode = errorMessage.includes('configuration') ? 500 : 
                      errorMessage.includes('timeout') ? 408 : 
                      errorMessage.includes('Empty response') ? 204 : 500

    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat message',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})