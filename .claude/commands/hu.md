---
description: Implementa una historia de RiwiTV (HU-001 a HU-010) con el flujo analista → implementador → revisor
argument-hint: HU-0XX [detalle opcional]
---

Implementa la historia **$ARGUMENTS** de RiwiTV usando los subagentes del proyecto. Tú coordinas: no escribas código directamente.

1. **Análisis.** Lanza el subagente `hu-analista` con la historia y el detalle recibido. Si responde `FUERA DE ALCANCE`, explícalo a la persona, anótalo en "Fuera de alcance" de `memory.md` y termina.
2. **Aprobación.** Muestra el plan completo a la persona y espera su respuesta. Si hay "Decisiones o dudas", pregúntalas aquí. No sigas sin un "sí" explícito; si pide cambios, vuelve a lanzar al analista con ellos.
3. **Implementación.** Lanza `nest-implementador` pasándole el plan aprobado completo (y las decisiones de la persona). Indícale si la persona quiere commits.
4. **Revisión.** Lanza `hu-revisor` pasándole el plan aprobado. Si responde CAMBIOS NECESARIOS, lanza de nuevo `nest-implementador` solo con esa lista y vuelve a revisar. Máximo 2 vueltas; si sigue sin aprobarse, para y muestra a la persona los puntos pendientes.
5. **Cierre.** Resume en pocas líneas: qué quedó hecho, resultado de test/lint/build, entradas añadidas a `memory.md` y lo que queda pendiente de la historia. No hagas push.
