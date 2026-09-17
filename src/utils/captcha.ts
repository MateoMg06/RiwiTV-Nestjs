import crypto from 'crypto';

export interface CaptchaChallenge {
  token: string;
  question: string;
  answer: number;
}

// Almacén en memoria de captchas activos (en producción usar Redis o similar)
const captchaStore = new Map<string, { answer: number; expiresAt: number }>();

export function generateCaptcha(): CaptchaChallenge {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let answer: number;
  let question: string;

  switch (operation) {
    case '+':
      answer = num1 + num2;
      question = `¿Cuánto es ${num1} + ${num2}?`;
      break;
    case '-':
      answer = num1 - num2;
      question = `¿Cuánto es ${num1} - ${num2}?`;
      break;
    case '*':
      answer = num1 * num2;
      question = `¿Cuánto es ${num1} × ${num2}?`;
      break;
    default:
      answer = num1 + num2;
      question = `¿Cuánto es ${num1} + ${num2}?`;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

  captchaStore.set(token, { answer, expiresAt });

  return {
    token,
    question,
    answer,
  };
}

export function verifyCaptcha(token: string, userAnswer: number): boolean {
  const stored = captchaStore.get(token);

  if (!stored) {
    return false;
  }

  // Eliminar el captcha después de verificar (uso único)
  captchaStore.delete(token);

  // Verificar expiración
  if (Date.now() > stored.expiresAt) {
    return false;
  }

  return stored.answer === userAnswer;
}

// Limpiar captchas expirados periódicamente
export function cleanExpiredCaptchas(): void {
  const now = Date.now();
  for (const [token, data] of captchaStore.entries()) {
    if (now > data.expiresAt) {
      captchaStore.delete(token);
    }
  }
}

// Limpiar cada 5 minutos
setInterval(cleanExpiredCaptchas, 5 * 60 * 1000).unref();
