# 🌿 QuitPetas — Tu Coach IA para dejar de fumar

QuitPetas es una Progressive Web App (PWA) diseñada para ayudar a las personas a dejar el hábito de fumar (especialmente cannabis) a través de un enfoque clínico, seguimiento de progreso y el apoyo constante de una IA personalizada.

![Dashboard Preview](public/icons/icon-192.png)

## ✨ Características Principales

- **Coach IA Personalizado**: Chat integrado con un modelo que conoce tu progreso, estado de ánimo y plan de reducción.
- **Planes Clínicos**: Soporte para "Cold Turkey" (desactivación total) o reducción gradual por cantidad o gramaje.
- **Notificaciones Push**: Recordatorios diarios de check-in y mensajes motivacionales del coach.
- **Logros en Tiempo Real**: Desbloquea hitos (3 días, 1 semana, ahorros, etc.) con avisos instantáos.
- **Comunidad SOS**: Crea grupos privados con amigos para compartir estadísticas anónimas y apoyarse mutuamente.
- **Diario y Diario de Consumo**: Reflexiona sobre tus sentimientos y rastrea tus recaídas para identificar patrones.
- **Seguridad**: Hardening de producción con Rate Limiting, Helmet y borrado total de cuenta (GDPR).

## 🚀 Instalación en Local

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/tu-usuario/quitpetas.git
    cd quitpetas
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**:
    Copia el archivo `.env.example` a `.env` y rellena las claves (DATABASE_URL, OPENAI_API_KEY, VAPID_KEYS, etc.).

4.  **Base de Datos (Prisma)**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Arrancar el servidor**:
    ```bash
    npm run dev
    ```

## 🛠️ Stack Tecnológico

- **Backend**: Node.js, Express.
- **Data**: Prisma ORM, PostgreSQL/Supabase.
- **AI**: OpenAI API (GPT-4o).
- **Push**: Web-Push (VAPID).
- **Frontend**: Vanilla JavaScript (SPA), DOMPurify, Chart.js.

## 📱 PWA

La aplicación está optimizada para ser instalada en dispositivos móviles (iPhone y Android) mediante la opción "Añadir a la pantalla de inicio". Incluye Service Workers y Manifest configurados para funcionamiento Offline y notificaciones.

## 🐳 Despliegue con Docker

Si tienes Docker y Docker-compose instalado, puedes levantar todo el sistema (App + Base de Datos) con un solo comando:

1.  Copia el archivo `.env.example` a `.env` y rellena tus claves de **OpenAI** y **VAPID**.
2.  Ejecuta:
    ```bash
    docker-compose up -d --build
    ```

Esto levantará un contenedor con PostgreSQL y otro con la aplicación de Node.js ya configurada y vinculada.

---
Desarrollado con ❤️ para ayudar a mejorar vidas.
