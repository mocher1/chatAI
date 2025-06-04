import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI();

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Jeste\u015b CareerGPT - przyjaznym doradc\u0105 zawodowym, kt\u00f3ry specjalizuje si\u0119 w polskim rynku pracy. Pomagasz w pisaniu CV, przygotowaniu do rozm\u00f3w kwalifikacyjnych i planowaniu kariery. Odpowiadasz po polsku, u\u017cywasz prostego j\u0119zyka i unikasz \u017cargonu HR. Twoje odpowiedzi s\u0105 konkretne i praktyczne.',
        },
        { role: 'user', content: message },
      ],
    });

    res.json({ content: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
