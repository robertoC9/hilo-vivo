export function notFound(request, response) {
  response.status(404).json({ error: 'Ruta no encontrada.' });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProduction ? 'Error interno del servidor.' : error.message;

  if (statusCode >= 500) {
    console.error(`[api] ${request.method} ${request.originalUrl}:`, error);
  }

  response.status(statusCode).json({ error: message });
}
