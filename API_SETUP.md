# Configuración de Automatización de Resultados (API-Football)

Este documento explica cómo desplegar la función en la nube y configurar la tarea programada (cron) para actualizar los resultados automáticamente durante el Mundial 2026. La Consola Admin siempre funcionará como método manual de respaldo.

## 1. Obtener la API Key
1. Entra a [API-Football en RapidAPI](https://rapidapi.com/api-sports/api/api-football) o directamente en su sitio web.
2. Regístrate para el plan gratuito (suele dar 100 peticiones al día, suficiente para llamar a la API cada 15-30 minutos).
3. Copia tu `API_KEY` (x-rapidapi-key).

## 2. Configurar Secretos en Supabase
Desde el panel web de tu proyecto de Supabase (`https://app.supabase.com`):
1. Ve a **Settings** > **Edge Functions**.
2. Desplázate hacia abajo hasta **Secrets** y añade uno nuevo:
   - Nombre: `API_FOOTBALL_KEY`
   - Valor: (Pega aquí la llave que obtuviste en el paso anterior).

## 3. Desplegar la Edge Function
Dado que tu proyecto está alojado de forma independiente, la manera oficial de subir la función es usando el CLI de Supabase en tu computadora:

```bash
# Iniciar sesión en el CLI si no lo has hecho
npx supabase login

# Enlazar tu proyecto (el Project Reference ID es nncjrgfeoynznmmpcuni)
npx supabase link --project-ref nncjrgfeoynznmmpcuni

# Desplegar la función a la nube
npx supabase functions deploy update-match-results
```

## 4. Configurar la Tarea Programada (Cron Job)
Para que esta función se llame sola cada 15 minutos, debes activar `pg_net` y crear el cron job.

En tu panel de Supabase, ve a **SQL Editor** y ejecuta lo siguiente:

```sql
-- 1. Habilitar la extensión para hacer llamadas HTTP desde Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Habilitar pg_cron para programar tareas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Crear el Cron Job para llamar a la función cada 15 minutos
SELECT cron.schedule(
  'actualizar-resultados-mundial', -- Nombre de la tarea
  '*/15 * * * *', -- Cada 15 minutos
  $$
    SELECT net.http_post(
      url:='https://nncjrgfeoynznmmpcuni.supabase.co/functions/v1/update-match-results',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SUPABASE_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
```

*(Asegúrate de reemplazar `TU_SUPABASE_ANON_KEY` en el bloque SQL de arriba con tu llave real de Supabase Anon Key).*

## ¿Cómo funciona el respaldo manual?
La función en la nube (`index.ts`) tiene una línea clave:
```typescript
if (dbMatch.status !== "finished") {
  // Actualiza
}
```
Esto significa que si la API falla, se retrasa, o decides poner tú mismo el resultado desde la **Consola Admin**, el sistema no lo sobrescribirá ni duplicará la asignación de puntos, ya que la Consola Admin cambia el estado a `finished` manualmente. Son sistemas complementarios que coexisten sin problemas.
