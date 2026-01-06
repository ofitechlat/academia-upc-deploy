// Server.js for cPanel Node.js deployment with Express
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const express = require('express');
const path = require('path');
const { promises: fs } = require('fs');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = 'localhost';

// Middleware to parse JSON bodies for API requests - Increased limit for images
app.use(express.json({ limit: '50mb' }));

// Middleware to handle JSON parse errors (e.g. invalid JSON)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'JSON inválido en la solicitud' });
    }
    next();
});

// Chat API Handler Logic
// Chat API Handler Logic
function getDefaultResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('tutor') || lowerMessage.includes('clase') || lowerMessage.includes('calculo') || lowerMessage.includes('fisica')) {
        return `¡Perfecto! Ofrecemos tutorías en:\n\n📚 Cálculo\n🔬 Física y Biología\n📊 Estadística\n💼 Economía\n\n💰 Precio: ₡6,500/hora\n🎓 50% descuento para UCR, TEC, UTN\n⭐ Promociones especiales para becados\n\n¿Te gustaría agendar? Contáctanos por WhatsApp: +506 6204-6410`;
    }
    if (lowerMessage.includes('asesoria') || lowerMessage.includes('asesoría') || lowerMessage.includes('trabajo') || lowerMessage.includes('apa')) {
        return `¡Claro! Brindamos asesorías para:\n\n📝 Trabajos de investigación\n✍️ Redacción académica\n📋 Formato APA\n📖 Citas y referencias\n\n💰 Consulta precios por WhatsApp\n📱 +506 6204-6410`;
    }
    if (lowerMessage.includes('windows') || lowerMessage.includes('office') || lowerMessage.includes('clave')) {
        return `💻 ¡Claves Originales Disponibles!\n\n🔑 Windows: ₡10,000\n🔑 Office: ₡10,000\n\n✅ Activación inmediata\n✅ Licencias genuinas\n\n¿Quieres comprar? Escríbenos:\n📱 WhatsApp: +506 6204-6410`;
    }
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuanto')) {
        return `💰 Nuestros Precios:\n\n📚 Tutorías: ₡6,500/hora\n   🎓 50% OFF estudiantes UCR/TEC/UTN\n   ⭐ Promociones para becados\n\n💻 Claves:\n   Windows: ₡10,000\n   Office: ₡10,000\n\n📝 Asesorías: Consultar por WhatsApp\n📱 +506 6204-6410`;
    }
    if (lowerMessage.includes('descuento') || lowerMessage.includes('promocion') || lowerMessage.includes('oferta')) {
        return `🎉 ¡Promociones Activas!\n\n🎓 50% descuento en tutorías para:\n   ✓ UCR\n   ✓ TEC\n   ✓ UTN\n\n⭐ Promociones especiales para becados\n\n¡Consulta por WhatsApp!\n📱 +506 6204-6410`;
    }
    return `¡Gracias por contactarnos! 😊\n\nPuedo ayudarte con:\n📚 Tutorías académicas\n📝 Asesorías para trabajos\n💻 Claves Windows/Office\n\nPara más información:\n📱 WhatsApp: +506 6204-6410`;
}

app.post('/api/ai-tutor', async (req, res) => {
    try {
        const { message, image, questionContext } = req.body;

        // Allow empty message if there's an image
        if ((!message && !image) || (message && typeof message !== 'string')) {
            return res.status(400).json({ error: 'Mensaje inválido. Debes enviar texto o una imagen.' });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        // OpenAI fallback omitted for brevity in explanation, but generally Gemini is preferred for images.

        if (geminiKey && geminiKey !== 'TU_API_KEY_AQUI') {
            try {
                const { GoogleGenAI } = require('@google/genai');
                const client = new GoogleGenAI({ apiKey: geminiKey });

                // Build input array for Interactions API
                let inputParts = [];

                // System instruction
                const systemPrompt = `Eres un tutor experto de UPC Academy.
Tu objetivo es ayudar a los estudiantes a entender problemas de matemáticas, cálculo, física o programación.
- NO des la respuesta directa si es un problema numérico, guía al estudiante.
- Si te envían una IMAGEN, analízala detalladamente para ayudar.
- Sé paciente y didáctico.
- Usa formato Markdown para fórmulas matemáticas (usa $...$ para inline y $$...$$ para bloques).`;
                inputParts.push({ type: 'text', text: systemPrompt });

                // Add question context if provided
                if (questionContext) {
                    inputParts.push({
                        type: 'text',
                        text: `\n[CONTEXTO DEL PROBLEMA]\nPregunta: ${questionContext.question}\nTema: ${questionContext.topic}\nDificultad: ${questionContext.difficulty}${questionContext.explanation ? `\nExplicación: ${questionContext.explanation}` : ''}`
                    });
                }

                // Add user message
                if (message) {
                    inputParts.push({ type: 'text', text: message });
                }

                // Add image if provided
                if (image) {
                    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        inputParts.push({
                            type: 'image',
                            data: matches[2],
                            mime_type: matches[1]
                        });
                    }
                }

                // Call Interactions API
                const interaction = await client.interactions.create({
                    model: 'gemini-3-flash-preview',
                    input: inputParts,
                    store: false // Don't store interactions for privacy
                });

                const response = interaction.outputs[interaction.outputs.length - 1].text;
                return res.json({ response });

            } catch (geminiError) {
                console.error('Gemini API Error:', geminiError);
                return res.status(500).json({ error: 'Error procesando con IA (Gemini). Intenta de nuevo.' });
            }
        }

        // Fallback or No Key
        const response = getDefaultResponse(message || "Hola");
        return res.json({ response });

    } catch (error) {
        console.error('Chat API Handler Error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Mensaje inválido' });
        }

        const geminiKey = process.env.GEMINI_API_KEY;

        if (geminiKey && geminiKey !== 'TU_API_KEY_AQUI') {
            try {
                const { GoogleGenAI } = require('@google/genai');
                const client = new GoogleGenAI({ apiKey: geminiKey });

                const systemPrompt = `Eres un asistente de UPC Academy. Ofreces:
- Tutorías: Cálculo, Física, Biología, Economía, Estadística (₡6,500/hora, 50% descuento UCR/TEC/UTN, promociones para becados)
- Asesorías: Trabajos académicos, formato APA, redacción
- Claves: Windows y Office (₡10,000 c/u)
WhatsApp: +506 6204-6410
Sé amigable, breve y promociona los servicios.`;

                const interaction = await client.interactions.create({
                    model: 'gemini-3-flash-preview',
                    input: [
                        { type: 'text', text: systemPrompt },
                        { type: 'text', text: message }
                    ],
                    store: false
                });

                const response = interaction.outputs[interaction.outputs.length - 1].text;
                return res.json({ response });

            } catch (geminiError) {
                console.error('Gemini API Error (Chatbot):', geminiError);
                return res.status(500).json({ error: 'Error procesando con IA' });
            }
        }

        // Fallback
        const response = getDefaultResponse(message);
        return res.json({ response });

    } catch (error) {
        console.error('Chat API Handler Error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Serve static files from the 'out' directory (generated by next export)
// We serve 'out' as the root
app.use(express.static(path.join(__dirname, 'out')));

// Handle 404s by serving 404.html if it exists, or index.html for client-side routing fallback (though with export it's usually unnecessary if structure is perfect)
app.use((req, res, next) => {
    // If referencing a file that doesn't exist, try adding .html (for clean URLs if configured)
    if (req.method === 'GET' && !req.path.includes('.')) {
        const htmlPath = path.join(__dirname, 'out', req.path + '.html');
        // Check if html file exists
        // For now, simpler approach: serve 404.html
        res.status(404).sendFile(path.join(__dirname, 'out', '404.html'));
    } else {
        next();
    }
});

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
});
