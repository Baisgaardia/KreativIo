// Filnavn: netlify/functions/oecd-proxy.js

export default async (req) => {
  // Hent den OECD-URL, vi vil tilgå, fra forespørgslens parametre
  const targetUrl = new URL(req.url).searchParams.get('url');

  if (!targetUrl) {
    return new Response('Mangler "url" parameter', { status: 400 });
  }

  try {
    // Foretag det faktiske kald til OECD's API
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/vnd.sdmx.data+json;version=1.0'
      }
    });

    // Hent data fra OECD's svar
    const data = await response.text();

    // Returner OECD's svar, men tilføj de nødvendige CORS-headere,
    // så din browser må læse svaret.
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Tillader alle at kalde din proxy
      },
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
};