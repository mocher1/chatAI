# CareerGPT PL - Cyfrowy doradca zawodowy

Aplikacja React + Vite wykorzystująca OpenAI API przez bezpieczny backend proxy.

## Bezpieczeństwo

Aplikacja używa Supabase Edge Functions jako backend proxy, co zapewnia:
- Bezpieczne przechowywanie kluczy API po stronie serwera
- Brak dostępu do kluczy API z poziomu przeglądarki
- Kontrolę dostępu i rate limiting
- Logowanie i monitoring użycia

## Konfiguracja

### 1. Supabase Setup

1. Utwórz projekt w [Supabase](https://supabase.com)
2. Kliknij przycisk "Connect to Supabase" w prawym górnym rogu aplikacji
3. Skonfiguruj zmienne środowiskowe w panelu Supabase:
   - `OPENAI_API_KEY` - Twój klucz API OpenAI
   - `ASSISTANT_ID` - ID Twojego asystenta OpenAI

### 2. Lokalne uruchomienie

1. Zainstaluj zależności:
   ```bash
   npm install
   ```

2. Skopiuj `.env.example` do `.env` i uzupełnij:
   ```bash
   cp .env.example .env
   ```

3. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```

## Architektura bezpieczeństwa

### Frontend (React)
- Wysyła zapytania do Edge Functions zamiast bezpośrednio do OpenAI
- Nie przechowuje żadnych kluczy API
- Komunikuje się tylko z autoryzowanymi endpointami

### Backend (Supabase Edge Functions)
- `create-thread` - Tworzy nowy wątek rozmowy
- `chat` - Przetwarza wiadomości i zwraca odpowiedzi asystenta
- Bezpiecznie przechowuje klucze API w zmiennych środowiskowych
- Obsługuje CORS i walidację zapytań

### Przepływ danych
1. Frontend → Edge Function → OpenAI API
2. OpenAI API → Edge Function → Frontend
3. Klucze API nigdy nie opuszczają serwera

## Wdrożenie

Aplikacja jest automatycznie wdrażana z Edge Functions. Upewnij się, że:
- Zmienne środowiskowe są skonfigurowane w panelu Supabase
- Edge Functions są wdrożone i działają
- Frontend ma poprawny URL do Supabase

## Funkcjonalności

- ✅ Bezpieczna komunikacja z OpenAI API
- ✅ Zarządzanie wątkami rozmów
- ✅ Formatowanie odpowiedzi Markdown
- ✅ Kopiowanie odpowiedzi
- ✅ Responsywny design
- ✅ Animacje i mikrointerakcje
- ✅ Lokalne przechowywanie historii czatu