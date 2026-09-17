const isProd: boolean = process.env.NODE_ENV === "production";

// Duración del access token: 15 minutos (debe coincidir con JWT_ACCESS_EXPIRES_IN)
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutos en milisegundos

export const cookieOptions: object = {
    httpOnly: true, // Cookie solo accesible por medio de peticiones HTTP, no JS
    secure: isProd, // Si está en producción, solo es accesible por HTTPS
    sameSite: "lax", // Previene envío en cross-site requests, manteniendo compatibilidad con navegación normal
    maxAge: ACCESS_TOKEN_MAX_AGE, // 15 minutos en milisegundos (coincide con la expiración del JWT)
};
