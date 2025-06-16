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
3. **KRYTYCZNE**: Skonfiguruj zmienne środowiskowe dla Edge Functions:
   
   **Sposób 1 - Przez Dashboard Supabase:**
   - Przejdź do swojego projektu Supabase
   - Kliknij "Edge Functions" w menu bocznym
   - Kliknij "Settings" lub "Environment Variables"
   - Dodaj następujące zmienne:
     - `OPENAI_API_KEY` - Twój klucz API OpenAI (zaczyna się od sk-)
     - `ASSISTANT_ID` - ID Twojego asystenta OpenAI (zaczyna się od asst_)

   **Sposób 2 - Przez CLI Supabase (jeśli używasz lokalnie):**
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
   supabase secrets set ASSISTANT_ID=your_assistant_id_here
   ```

4. **Jak uzyskać klucze:**
   - **OPENAI_API_KEY**: Przejdź do [OpenAI API Keys](https://platform.openai.com/api-keys), zaloguj się i utwórz nowy klucz API
   - **ASSISTANT_ID**: Przejdź do [OpenAI Assistants](https://platform.openai.com/assistants), utwórz nowego asystenta lub skopiuj ID istniejącego

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

## Rozwiązywanie problemów

### Błąd "Server configuration error"

Jeśli widzisz błąd `Server configuration error`, oznacza to, że zmienne środowiskowe nie są skonfigurowane w Supabase:

1. **Sprawdź konfigurację w Supabase Dashboard:**
   - Przejdź do swojego projektu Supabase
   - Kliknij "Edge Functions" → "Settings"
   - Upewnij się, że `OPENAI_API_KEY` i `ASSISTANT_ID` są ustawione

2. **Sprawdź poprawność kluczy:**
   - `OPENAI_API_KEY` powinien zaczynać się od `sk-`
   - `ASSISTANT_ID` powinien zaczynać się od `asst_`

3. **Po dodaniu zmiennych:**
   - Poczekaj 1-2 minuty na propagację zmian
   - Odśwież stronę aplikacji
   - Spróbuj ponownie rozpocząć rozmowę

### Inne częste problemy

- **404 Error**: Edge Functions nie są wdrożone - sprawdź czy funkcje są aktywne w panelu Supabase
- **401 Error**: Nieprawidłowy klucz Supabase - sprawdź `.env` i upewnij się, że `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` są poprawne

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
- ✅ System analityki i monitoringu
- ✅ A/B testing promptów