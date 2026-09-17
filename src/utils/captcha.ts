import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

export interface CaptchaChallenge {
  token: string;
  question: string;
  answer: number;
}

@Injectable()
export class Captcha{
  captchaStore = new Map<string, { answer: number; expiresAt: number }>();

  generateCaptcha(): CaptchaChallenge {
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

    this.captchaStore.set(token, { answer, expiresAt });

    return {
      token,
      question,
      answer,
    };
  }

  verifyCaptcha(token: string, userAnswer: number): boolean {
    const stored = this.captchaStore.get(token);

    if (!stored) {
      return false;
    }

    // Eliminar el captcha después de verificar (uso único)
    this.captchaStore.delete(token);

    // Verificar expiración
    if (Date.now() > stored.expiresAt) {
      return false;
    }

    return stored.answer === userAnswer;
  }

  // Limpiar captchas expirados periódicamente
  cleanExpiredCaptchas(): void {
    const now = Date.now();
    for (const [token, data] of this.captchaStore.entries()) {
      if (now > data.expiresAt) {
        this.captchaStore.delete(token);
      }
    }
  }
}
